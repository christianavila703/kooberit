import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Modal } from '@/components/ui/modal';
import bidService from '@/services/bid';
import notification from '@/services/notification';
import ProjectMilestoneActions from '@/components/project/ProjectMilestoneActions';

interface BidTabProps {
  jobId: string;
  existingBid?: any;
  onBidSubmitted?: () => void;
  jobStatus?: string;
  onBidShouldRefresh?: () => Promise<void> | void;
  onJobShouldRefresh?: () => Promise<void> | void;
}

export default function BidTab({ jobId, existingBid, onBidSubmitted, jobStatus, onBidShouldRefresh, onJobShouldRefresh }: BidTabProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [showBidModal, setShowBidModal] = useState(false);
  const [bidValue, setBidValue] = useState('');
  const [projectDueDate, setProjectDueDate] = useState('');
  const [passFeeToHomeowner, setPassFeeToHomeowner] = useState(false);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [loadingBid, setLoadingBid] = useState(false);

  const handleSubmitBid = async () => {
    if (jobStatus !== 'open') {
      notification.error('Error', 'This job is no longer accepting bids');
      return;
    }

    if (!jobId || !bidValue) {
      notification.error('Error', 'Please fill in all required fields');
      return;
    }

    const bidValueNum = parseFloat(bidValue);
    if (isNaN(bidValueNum) || bidValueNum <= 0) {
      notification.error('Error', 'Please enter a valid bid value');
      return;
    }

    const selectedDate = new Date(projectDueDate);
    if (isNaN(selectedDate.getTime())) {
      notification.error('Error', 'Please enter a valid date');
      return;
    }

    // Normalize dates to midnight for date-only comparison
    const dueDate = new Date(selectedDate);
    dueDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Project due date cannot be later than current date (must be today or in the past)
    if (dueDate.getTime() > today.getTime()) {
      notification.error('Error', 'Project due date cannot be later than the current date');
      return;
    }

    setSubmittingBid(true);
    try {
      await bidService.createBid({
        jobId,
        bidValue: bidValueNum,
        projectDueDate: selectedDate.toISOString(),
        passFeeToHomeowner,
      });

      notification.success('Success', 'Bid submitted successfully');
      setShowBidModal(false);
      setBidValue('');
      setProjectDueDate('');
      setPassFeeToHomeowner(false);
      if (onBidSubmitted) {
        onBidSubmitted();
      }
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to submit bid');
    } finally {
      setSubmittingBid(false);
    }
  };

  return (
    <>
      {existingBid ? (
        <View style={[styles.bidStatusCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <View style={styles.bidStatusHeader}>
            <IconSymbol
              name={
                existingBid.bidStatus === 'awarded'
                  ? 'checkmark.circle.fill'
                  : existingBid.bidStatus === 'rejected'
                  ? 'xmark.circle.fill'
                  : 'clock.fill'
              }
              size={24}
              color={
                existingBid.bidStatus === 'awarded'
                  ? '#4CAF50'
                  : existingBid.bidStatus === 'rejected'
                  ? '#F44336'
                  : '#FF9800'
              }
            />
            <Text style={[styles.bidStatusTitle, { color: colors.text }]}>
              {existingBid.bidStatus === 'awarded'
                ? '🎉 Bid Awarded!'
                : existingBid.bidStatus === 'rejected'
                ? 'Bid Not Selected'
                : 'Bid Pending'}
            </Text>
          </View>
          <View style={styles.bidStatusDetails}>
            <View style={styles.bidStatusRow}>
              <Text style={[styles.bidStatusLabel, { color: colors.icon }]}>Bid Value:</Text>
              <Text style={[styles.bidStatusValue, { color: colors.text }]}>
                ${existingBid.bidValue.toFixed(2)}
              </Text>
            </View>
            <View style={styles.bidStatusRow}>
              <Text style={[styles.bidStatusLabel, { color: colors.icon }]}>Due Date:</Text>
              <Text style={[styles.bidStatusValue, { color: colors.text }]}>
                {new Date(existingBid.projectDueDate).toLocaleDateString()}
              </Text>
            </View>
            {existingBid.bidStatus === 'awarded' && (
              <>
                <View style={[styles.awardedMessage, { backgroundColor: '#4CAF50' + '15' }]}>
                  <Text style={[styles.awardedMessageText, { color: '#4CAF50' }]}>
                    Congratulations! Your bid has been awarded.{' '}
                    {
                        existingBid.awardFeeStatus === 'completed'
                        ? 'The award fee has been paid. You can now continue messaging.'
                        : (existingBid.passFeeToHomeowner
                            ? 'The homeowner will pay the award fee.'
                            : 'Please pay the award fee to continue messaging.')
                    }
                  </Text>
                </View>
                {!existingBid.passFeeToHomeowner &&
                  existingBid.awardFeeStatus !== 'completed' &&
                  existingBid.id && (
                    <TouchableOpacity
                      style={[styles.payAwardFeeButton, { backgroundColor: colors.tint }]}
                      onPress={() => router.push(`/payment/award-fee/${existingBid.id}` as any)}>
                      <IconSymbol name="creditcard.fill" size={20} color="#FFFFFF" />
                      <Text style={styles.payAwardFeeButtonText}>
                        Pay Award Fee (${existingBid.awardFee?.toFixed(2) || '0.00'})
                      </Text>
                    </TouchableOpacity>
                  )}
              </>
            )}
            {existingBid.bidStatus === 'rejected' && (
              <View style={[styles.rejectedMessage, { backgroundColor: '#F44336' + '15' }]}>
                <Text style={[styles.rejectedMessageText, { color: '#F44336' }]}>
                  The homeowner has chosen to move forward with another bid.
                </Text>
              </View>
            )}
          </View>

          {/* Change requests + completion actions (embedded in Bid tab) */}
          {existingBid?.bidStatus === 'awarded' && (
            <ProjectMilestoneActions
              bid={existingBid}
              role="contractor"
              renderMode="embedded"
              onBidShouldRefresh={onBidShouldRefresh}
              onJobShouldRefresh={onJobShouldRefresh}
            />
          )}
        </View>
      ) : (
        <View style={[styles.noBidContainer, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <Text style={[styles.noBidText, { color: colors.text }]}>
            You haven't submitted a bid yet
          </Text>
          {jobStatus === 'open' ? (
            <>
              <Text style={[styles.noBidSubtext, { color: colors.icon }]}>
                Submit a bid to compete for this project
              </Text>
              <TouchableOpacity
                style={[styles.submitBidButton, { backgroundColor: colors.tint }]}
                onPress={() => setShowBidModal(true)}>
                <IconSymbol name="dollarsign.circle.fill" size={20} color="#FFFFFF" />
                <Text style={styles.submitBidButtonText}>Submit Bid</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={[styles.noBidSubtext, { color: colors.icon }]}>
              This job is no longer accepting bids
            </Text>
          )}
        </View>
      )}

      {/* Bid Submission Modal */}
      <Modal visible={showBidModal} onClose={() => setShowBidModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Submit Bid</Text>
            <TouchableOpacity onPress={() => setShowBidModal(false)} disabled={submittingBid}>
              <IconSymbol name="xmark.circle.fill" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Award Fee Warning */}
            <View
              style={[
                styles.warningBox,
                { backgroundColor: isDark ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.1)' },
              ]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#FF9800" />
              <Text style={[styles.warningText, { color: colors.text }]}>
                In submitting your bid, please be aware that kooberit.com charges an Award Fee of
                2.5% of the submitted value of bid, payable by Contractor before the project is
                awarded. If you would like to pass the cost onto the Homeowner, please check the
                box below and increase your value of bid by 2.5%.
              </Text>
            </View>

            {/* Pass Fee to Homeowner Checkbox */}
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setPassFeeToHomeowner(!passFeeToHomeowner)}
                disabled={submittingBid}>
                <View
                  style={[
                    styles.checkboxBox,
                    {
                      backgroundColor: passFeeToHomeowner ? colors.tint : 'transparent',
                      borderColor: passFeeToHomeowner ? colors.tint : colors.icon,
                    },
                  ]}>
                  {passFeeToHomeowner && (
                    <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                  Pass award fee to homeowner (increase bid value by 2.5%)
                </Text>
              </TouchableOpacity>
              {passFeeToHomeowner && (
                <Text style={[styles.checkboxHint, { color: colors.icon }]}>
                  If checked, the homeowner will pay the award fee when they award the bid. The bid
                  value you enter should include the 2.5% fee.
                </Text>
              )}
              {!passFeeToHomeowner && (
                <View
                  style={[
                    styles.warningBox,
                    {
                      backgroundColor: isDark ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 0, 0, 0.05)',
                    },
                  ]}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#FF3B30" />
                  <Text style={[styles.warningTextSmall, { color: colors.text }]}>
                    If the homeowner accepts your bid, you will not be able to send messages until
                    you pay the award fee.
                  </Text>
                </View>
              )}
            </View>

            {/* Bid Value Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Bid Value (without taxes)
              </Text>
              <View
                style={[
                  styles.currencyInputContainer,
                  { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' },
                ]}>
                <Text style={[styles.currencySymbol, { color: colors.text }]}>$</Text>
                <TextInput
                  style={[styles.currencyInput, { color: colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.icon}
                  value={bidValue}
                  onChangeText={setBidValue}
                  keyboardType="decimal-pad"
                  editable={!submittingBid}
                />
              </View>
              {bidValue && !isNaN(parseFloat(bidValue)) && parseFloat(bidValue) > 0 && (
                <View>
                  {passFeeToHomeowner ? (
                    <>
                      <Text style={[styles.awardFeePreview, { color: colors.icon }]}>
                        Bid value (includes 2.5% fee): ${parseFloat(bidValue).toFixed(2)}
                      </Text>
                      <Text style={[styles.awardFeePreview, { color: colors.icon, fontSize: 11 }]}>
                        Base value: ${(parseFloat(bidValue) / 1.025).toFixed(2)} | Award Fee: $
                        {((parseFloat(bidValue) / 1.025) * 0.025).toFixed(2)}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.awardFeePreview, { color: colors.icon }]}>
                      Award Fee (2.5%): ${(parseFloat(bidValue) * 0.025).toFixed(2)}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Project Due Date Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Project Due Date</Text>
              <TextInput
                style={[
                  styles.dateInput,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.icon}
                value={projectDueDate}
                onChangeText={setProjectDueDate}
                editable={!submittingBid}
              />
              <Text style={[styles.dateHint, { color: colors.icon }]}>
                Format: YYYY-MM-DD (e.g., 2026-1-31)
              </Text>
            </View>
          </ScrollView>

          {/* Modal Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setShowBidModal(false)}
              disabled={submittingBid}>
              <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalButtonPrimary,
                { backgroundColor: colors.tint },
                submittingBid && styles.modalButtonDisabled,
              ]}
              onPress={handleSubmitBid}
              disabled={submittingBid || !bidValue || !projectDueDate}>
              {submittingBid ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalButtonTextPrimary}>Submit Bid</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bidStatusCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bidStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  bidStatusTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  bidStatusDetails: {
    gap: 8,
  },
  bidStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bidStatusLabel: {
    fontSize: 14,
  },
  bidStatusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  awardedMessage: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  awardedMessageText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  rejectedMessage: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  rejectedMessageText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  noBidContainer: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  noBidText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  noBidSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  submitBidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  submitBidButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    padding: 24,
    marginBottom: 100,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalContent: {},
  warningBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  currencyInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  awardFeePreview: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  dateInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
  },
  dateHint: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonPrimary: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  checkboxContainer: {
    marginBottom: 20,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  checkboxHint: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 36,
    fontStyle: 'italic',
  },
  warningTextSmall: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 8,
  },
  payAwardFeeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  payAwardFeeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

