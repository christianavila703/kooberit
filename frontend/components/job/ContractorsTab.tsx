import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IBid } from '@/types';
import ProjectMilestoneActions from '@/components/project/ProjectMilestoneActions';

interface ContractorsTabProps {
  bids: IBid[];
  contractorContacts: any[];
  loadingBids: boolean;
  loadingContacts: boolean;
  awardingBid: string | null;
  rejectingBid: string | null;
  onAwardBid: (bid: IBid) => void;
  onRejectBid: (bid: IBid) => void;
  onChatPress: (chatRoomId: string) => void;
  onPayAwardFee: (bidId: string) => void;
  router: any;
  onBidsShouldRefresh?: () => Promise<void> | void;
  onJobShouldRefresh?: () => Promise<void> | void;
}

export default function ContractorsTab({
  bids,
  contractorContacts,
  loadingBids,
  loadingContacts,
  awardingBid,
  rejectingBid,
  onAwardBid,
  onRejectBid,
  onChatPress,
  onPayAwardFee,
  router,
  onBidsShouldRefresh,
  onJobShouldRefresh,
}: ContractorsTabProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  // Sort bids: awarded first, then pending, then rejected
  const sortedBids = useMemo(() => {
    return [...bids].sort((a, b) => {
      if (a.bidStatus === 'awarded' && b.bidStatus !== 'awarded') return -1;
      if (a.bidStatus !== 'awarded' && b.bidStatus === 'awarded') return 1;
      if (a.bidStatus === 'pending' && b.bidStatus === 'rejected') return -1;
      if (a.bidStatus === 'rejected' && b.bidStatus === 'pending') return 1;
      return 0;
    });
  }, [bids]);

  // Get contractor IDs from bids to filter out contractors who have bid
  const bidContractorIds = useMemo(() => {
    return new Set(bids.map((bid) => bid.contractorId));
  }, [bids]);

  // Separate contractors: those who bid and those who didn't
  const contractorsWithBids = useMemo(() => {
    return contractorContacts.filter((contact) => {
      const contractorId = contact.contractor?.id || contact.contractorId;
      return bidContractorIds.has(contractorId);
    });
  }, [contractorContacts, bidContractorIds]);

  const contractorsWithoutBids = useMemo(() => {
    return contractorContacts.filter((contact) => {
      const contractorId = contact.contractor?.id || contact.contractorId;
      return !bidContractorIds.has(contractorId);
    });
  }, [contractorContacts, bidContractorIds]);

  const getContractorFromBid = (bid: IBid) => {
    return bid.contractor;
  };

  const getContractorName = (contractor: any) => {
    if (contractor?.firstName && contractor?.lastName) {
      return `${contractor.firstName} ${contractor.lastName}`;
    }
    return contractor?.firstName || contractor?.lastName || 'Contractor';
  };

  const getContractorInitials = (contractor: any) => {
    return (contractor?.firstName?.[0] || 'C') + (contractor?.lastName?.[0] || '');
  };

  return (
    <>
      {
        sortedBids.length === 0 && contractorsWithoutBids.length === 0 ? (
          <View style={[styles.emptyContacts, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No contractors have contacted you yet for this job
            </Text>
          </View>
        ) : null
      }
      {/* Bids Section */}
      {loadingBids ? (
        <ActivityIndicator color={colors.tint} />
      ) : sortedBids.length > 0 ? (
        <View>
          {sortedBids.map((bid) => {
            const contractor = getContractorFromBid(bid);
            const contractorName = getContractorName(contractor);
            const contractorInitials = getContractorInitials(contractor);

            return (
              <View
                key={bid.id}
                style={[
                  styles.bidCard,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                    borderColor: bid.bidStatus === 'awarded' ? '#4CAF50' : 'transparent',
                    borderWidth: bid.bidStatus === 'awarded' ? 2 : 0,
                    marginBottom: 12,
                  },
                ]}>
                <View style={styles.bidHeader}>
                  <View style={styles.bidContractorInfo}>
                    <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
                      <Text style={styles.avatarText}>{contractorInitials}</Text>
                    </View>
                    <View>
                      <Text style={[styles.bidContractorName, { color: colors.text }]}>
                        {contractorName}
                      </Text>
                      {contractor?.companyName && (
                        <Text style={[styles.bidCompanyName, { color: colors.icon }]}>
                          {contractor.companyName}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.bidHeaderActions}>
                    {bid.bidStatus === 'awarded' && (
                      <View style={[styles.awardedBadge, { backgroundColor: '#4CAF50' }]}>
                        <IconSymbol name="checkmark.circle.fill" size={16} color="#FFFFFF" />
                        <Text style={styles.awardedBadgeText}>Awarded</Text>
                      </View>
                    )}
                    {(() => {
                      const contact = contractorsWithBids.find((c) => {
                        const contractorId = c.contractor?.id || c.contractorId;
                        return contractorId === bid.contractorId;
                      });
                      if (contact?.chatRoomId) {
                        return (
                          <TouchableOpacity
                            style={[styles.chatButton, { backgroundColor: colors.tint }]}
                            onPress={() => onChatPress(contact.chatRoomId)}>
                            <IconSymbol name="message.fill" size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        );
                      }
                      return null;
                    })()}
                  </View>
                </View>
                <View style={styles.bidDetails}>
                  <View style={styles.bidDetailRow}>
                    <Text style={[styles.bidDetailLabel, { color: colors.icon }]}>Bid Value:</Text>
                    <Text style={[styles.bidDetailValue, { color: colors.text }]}>
                      ${bid.bidValue.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.bidDetailRow}>
                    <Text style={[styles.bidDetailLabel, { color: colors.icon }]}>Due Date:</Text>
                    <Text style={[styles.bidDetailValue, { color: colors.text }]}>
                      {new Date(bid.projectDueDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.bidDetailRow}>
                    <Text style={[styles.bidDetailLabel, { color: colors.icon }]}>Award Fee:</Text>
                    <Text style={[styles.bidDetailValue, { color: colors.text }]}>
                      ${bid.awardFee.toFixed(2)} (2.5%) - {bid.passFeeToHomeowner ? 'Homeowner' : 'Contractor'}
                    </Text>
                  </View>
                </View>

                {/* Homeowner actions for awarded bid: approve/reject requests + completion */}
                {bid.bidStatus === 'awarded' && (
                  <ProjectMilestoneActions
                    bid={bid as any}
                    role="homeowner"
                    renderMode="embedded"
                    onBidShouldRefresh={onBidsShouldRefresh}
                    onJobShouldRefresh={onJobShouldRefresh}
                  />
                )}

                <View style={styles.bidActions}>
                  {bid.bidStatus === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={[styles.awardButton, { backgroundColor: colors.tint, flex: 1 }]}
                        onPress={() => onAwardBid(bid)}
                        disabled={awardingBid === bid.id || rejectingBid === bid.id}>
                        {awardingBid === bid.id ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <IconSymbol name="checkmark.circle.fill" size={18} color="#FFFFFF" />
                            <Text style={styles.awardButtonText}>Award Bid</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.rejectButton, { backgroundColor: '#FF3B30', flex: 1, marginLeft: 8 }]}
                        onPress={() => onRejectBid(bid)}
                        disabled={awardingBid === bid.id || rejectingBid === bid.id}>
                        {rejectingBid === bid.id ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <IconSymbol name="xmark.circle.fill" size={18} color="#FFFFFF" />
                            <Text style={styles.rejectButtonText}>Reject</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                  {bid.bidStatus === 'awarded' && bid.passFeeToHomeowner && bid.awardFeeStatus !== 'completed' && (
                    <TouchableOpacity
                      style={[styles.payAwardFeeButton, { backgroundColor: colors.tint }]}
                      onPress={() => onPayAwardFee(bid.id)}>
                      <IconSymbol name="creditcard.fill" size={18} color="#FFFFFF" />
                      <Text style={styles.payAwardFeeButtonText}>Pay Award Fee (${bid.awardFee.toFixed(2)})</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Contractors Without Bids Section */}
      {contractorsWithoutBids.length > 0 && (
        <View>
          {loadingContacts ? (
            <ActivityIndicator color={colors.tint} />
          ) : (
            contractorsWithoutBids.map((contact) => {
              const contractor = contact.contractor;
              const contractorName = getContractorName(contractor);
              const contractorInitials = getContractorInitials(contractor);

              return (
                <TouchableOpacity
                  key={contact.id}
                  style={[styles.contactCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}
                  onPress={() => contact.chatRoomId && onChatPress(contact.chatRoomId)}
                  activeOpacity={0.7}>
                  <View style={styles.contactHeader}>
                    <View style={styles.contactInfo}>
                      <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
                        <Text style={styles.avatarText}>{contractorInitials}</Text>
                      </View>
                      <View>
                        <Text style={[styles.contactName, { color: colors.text }]}>
                          {contractorName}
                        </Text>
                      </View>
                    </View>
                    {contact.chatRoomId && (
                      <TouchableOpacity
                        style={[styles.chatButton, { backgroundColor: colors.tint }]}
                        onPress={() => onChatPress(contact.chatRoomId)}>
                        <IconSymbol name="message.fill" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  emptyContacts: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  bidCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bidHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bidContractorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  bidContractorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  bidCompanyName: {
    fontSize: 13,
    marginTop: 2,
  },
  awardedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  awardedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bidDetails: {
    marginBottom: 12,
  },
  bidDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bidDetailLabel: {
    fontSize: 14,
  },
  bidDetailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  bidActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  awardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  awardButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  payAwardFeeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#4CAF50',
  },
  payAwardFeeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  contactCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

