import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IJob } from '@/types';
import { Modal } from '@/components/ui/modal';
import notification from '@/services/notification';

interface JobDetailsProps {
  job: IJob;
  isContractor: boolean;
  hasContacted: boolean;
  contactData: any;
  loadingContacts: boolean;
  onContactPress: () => void;
  onChatPress: (chatRoomId: string) => void;
  invitationCount: number;
  onInviteContractors?: (emails: string[]) => Promise<void>;
  onPostJobToMarket?: () => Promise<void>;
  onCloseJob?: () => Promise<void>;
  onDeleteJob?: () => Promise<void>;
  isInviting?: boolean;
  isPosting?: boolean;
  isInvited?: boolean;
}

export default function JobDetails({
  job,
  isContractor,
  hasContacted,
  contactData,
  loadingContacts,
  onContactPress,
  onChatPress,
  invitationCount,
  onInviteContractors,
  onPostJobToMarket,
  onCloseJob,
  onDeleteJob,
  isInviting = false,
  isPosting = false,
  isInvited = false,
}: JobDetailsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');

  const handleInviteContractors = () => {
    setShowInviteModal(true);
  };

  const handleSendInvitations = async () => {
    if (!inviteEmails.trim()) {
      notification.error('Error', 'Please enter at least one email address');
      return;
    }

    // Parse emails (split by comma, newline, or semicolon)
    const emails = inviteEmails
      .split(/[,\n;]/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emails.length === 0) {
      notification.error('Error', 'Please enter at least one valid email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      notification.error('Error', `Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    if (onInviteContractors) {
      try {
        await onInviteContractors(emails);
        setShowInviteModal(false);
        setInviteEmails('');
      } catch (error: any) {
        notification.error('Error', error.message || 'Failed to send invitations');
      }
    }
  };

  const handlePostJobToMarket = async () => {
    Alert.alert(
      'Post Job to Market',
      'Are you sure you want to post this job to the marketplace? Once posted, you cannot invite specific contractors anymore.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Post',
          style: 'default',
          onPress: async () => {
            if (onPostJobToMarket) {
              try {
                await onPostJobToMarket();
                notification.success('Success', 'Job posted to market successfully');
              } catch (error: any) {
                notification.error('Error', error.message || 'Failed to post job to market');
              }
            }
          },
        },
      ]
    );
  };

  const handleCloseJob = async () => {
    Alert.alert(
      'Close Job',
      'Are you sure you want to close this job? Contractors will no longer be able to contact you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            if (onCloseJob) {
              try {
                await onCloseJob();
                notification.success('Success', 'Job closed successfully');
              } catch (error: any) {
                notification.error('Error', error.message || 'Failed to close job');
              }
            }
          },
        },
      ]
    );
  };

  const handleDeleteJob = async () => {
    Alert.alert(
      'Delete Job',
      'Are you sure you want to delete this job? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (onDeleteJob) {
              try {
                await onDeleteJob();
                notification.success('Success', 'Job deleted successfully');
              } catch (error: any) {
                notification.error('Error', error.message || 'Failed to delete job');
              }
            }
          },
        },
      ]
    );
  };

  return (
    <>
      {/* Status Badge */}
      <View style={styles.statusContainer}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: job.status === 'closed' ? '#9E9E9E' : '#4CAF50',
              },
            ]}>
            <Text style={styles.statusText}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </Text>
          </View>
          {isContractor && isInvited && (
            <View style={[styles.statusBadge, styles.invitedBadge]}>
              <Text style={styles.statusText}>Invited</Text>
            </View>
          )}
        </View>
      </View>

      {/* Job Title */}
      <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Job Title</Text>
        <Text style={[styles.jobTitle, { color: colors.text }]}>
          {job.jobTitle || 'No title'}
        </Text>
      </View>

      {/* Job Number & Job Size */}
      <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
        <View style={styles.infoRow}>
          {job.jobSize && (
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: colors.icon }]}>Job Size</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {job.jobSize === 'micro' && 'Micro Job ($0 - $2,500)'}
                {job.jobSize === 'small' && 'Small Job ($2,500 - $10,000)'}
                {job.jobSize === 'big' && 'Big Job ($10,000 - $50,000)'}
                {job.jobSize === 'very_big' && 'Very Big Job ($50,000+)'}
              </Text>
            </View>
          )}
        </View>
        {job.structureType && (
          <View style={[styles.infoItem, { marginTop: 16 }]}>
            <Text style={[styles.infoLabel, { color: colors.icon }]}>Type of Structure</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {job.structureType === 'single_detached_house' && 'Single Detached House'}
              {job.structureType === 'semi_detached_house' && 'Semi Detached House'}
              {job.structureType === 'townhouse' && 'Townhouse'}
              {job.structureType === 'low_rise_building' && 'Low Rise Building'}
              {job.structureType === 'high_rise_building' && 'High Rise Building'}
            </Text>
          </View>
        )}
      </View>

      {/* Description */}
      <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
        <Text style={[styles.description, { color: colors.text }]}>
          {job.description}
        </Text>
      </View>

      {/* Categories */}
      <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories</Text>
        <View style={styles.categoriesContainer}>
          {job.categories.map((category) => (
            <View
              key={`${job.id}-${category}`}
              style={[
                styles.categoryTag,
                { backgroundColor: isDark ? '#2E2E2E' : '#E0E0E0' },
              ]}>
              <Text style={[styles.categoryText, { color: colors.text }]}>{category}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Location */}
      <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
        <View style={styles.locationRow}>
          <IconSymbol name="location.fill" size={20} color={colors.icon} />
          <Text style={[styles.locationText, { color: colors.text }]}>
            {isContractor && !hasContacted
              ? (
                <>
                  {(job.location.cityName || job.location.province) && (
                    <Text style={[styles.cityProvinceText, { color: colors.text }]}>
                      {job.location.cityName}
                      {job.location.cityName && job.location.province && ', '}
                      {job.location.province}
                    </Text>
                  )}
                </>
              )
              : job.location.address}
          </Text>
        </View>
      </View>

      {/* Contractor Limit Info */}
      <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contractor Contacts</Text>
        <Text style={[styles.infoText, { color: colors.icon }]}>
          {job.contractorContactsCount} / {job.contractorLimit} contractors have contacted with this job
        </Text>
        {invitationCount > 0 && (
          <Text style={[styles.infoText, { color: colors.tint, marginTop: 8 }]}>
            {invitationCount} contractor{invitationCount !== 1 ? 's' : ''} invited
          </Text>
        )}
      </View>

      {/* Contractor View - Contact Button */}
      {isContractor && (
        <View style={styles.section}>
          {loadingContacts ? (
            <ActivityIndicator color={colors.tint} />
          ) : hasContacted ? (
            <View>
              <View style={[styles.contactedCard, { backgroundColor: '#4CAF50' + '20' }]}>
                <IconSymbol name="checkmark.circle.fill" size={24} color="#4CAF50" />
                <Text style={[styles.contactedText, { color: '#4CAF50' }]}>
                  You have already contacted this homeowner
                </Text>
              </View>
              {contactData?.chatRoomId && (
                <TouchableOpacity
                  style={[styles.chatButtonFull, { backgroundColor: colors.tint }]}
                  onPress={() => onChatPress(contactData.chatRoomId)}>
                  <IconSymbol name="message.fill" size={20} color="#FFFFFF" />
                  <Text style={styles.chatButtonText}>Open Chat</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            job.status === 'open' && job.contractorContactsCount < job.contractorLimit
            ? (
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: colors.tint }]}
              onPress={onContactPress}>
              <IconSymbol name="creditcard.fill" size={20} color="#FFFFFF" />
              <Text style={styles.contactButtonText}>Contact Homeowner ($19.99)</Text>
            </TouchableOpacity>
            ) : (
              <View style={styles.contactButtonDisabled}>
                <IconSymbol name="lock.fill" size={20} color={colors.icon} />
                {job.contractorContactsCount >= job.contractorLimit ? (
                  <Text style={styles.contactButtonTextDisabled}>Contact Limit Reached</Text>
                ) : (
                  <Text style={styles.contactButtonTextDisabled}>Job Closed</Text>
                )}
              </View>
            )
          )}
        </View>
      )}

      {/* Actions - Homeowner Only */}
      {!isContractor && (
        <View style={styles.actionsContainer}>
          {job.status === 'pending' && (
            <>
              {onInviteContractors && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.tint }]}
                  onPress={handleInviteContractors}
                  disabled={isInviting}>
                  <IconSymbol name="person.2.fill" size={18} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Invite Contractors</Text>
                </TouchableOpacity>
              )}
              {onPostJobToMarket && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                  onPress={handlePostJobToMarket}
                  disabled={isPosting}>
                  {isPosting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <IconSymbol name="arrow.up.circle.fill" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Post to Market</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
          {job.status === 'open' && (
            <>
              {onCloseJob && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FF9500' }]}
                  onPress={handleCloseJob}>
                  <Text style={styles.actionButtonText}>Close Job</Text>
                </TouchableOpacity>
              )}
              {onDeleteJob && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                  onPress={handleDeleteJob}>
                  <Text style={styles.actionButtonText}>Delete Job</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}

      {/* Invite Contractors Modal */}
      {onInviteContractors && (
        <Modal visible={showInviteModal} onClose={() => setShowInviteModal(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Invite Contractors to Bid
              </Text>
              <TouchableOpacity
                onPress={() => setShowInviteModal(false)}
                disabled={isInviting}>
                <IconSymbol name="xmark.circle.fill" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={[styles.modalLabel, { color: colors.text }]}>
                Enter contractor email addresses (one per line or separated by commas)
              </Text>
              <TextInput
                style={[
                  styles.modalTextInput,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder="contractor1@example.com, contractor2@example.com"
                placeholderTextColor={colors.icon}
                value={inviteEmails}
                onChangeText={setInviteEmails}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!isInviting}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={[styles.modalHint, { color: colors.icon }]}>
                You can enter multiple emails separated by commas, semicolons, or new lines
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowInviteModal(false)}
                disabled={isInviting}>
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  { backgroundColor: colors.tint },
                  isInviting && styles.modalButtonDisabled,
                ]}
                onPress={handleSendInvitations}
                disabled={isInviting || !inviteEmails.trim()}>
                {isInviting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Send Invitations</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  statusContainer: {
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  invitedBadge: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
  },
  infoRow: {
    gap: 16,
  },
  infoItem: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 15,
    flex: 1,
  },
  cityProvinceText: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  contactedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  contactedText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  chatButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  contactButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  contactButtonTextDisabled: {
    fontSize: 18,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  modalContent: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalTextInput: {
    minHeight: 120,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
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
});

