import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchJobById,
  closeJob,
  deleteJob,
  postJobToMarket,
} from '@/store/slices/jobSlice';
import invitationService from '@/services/invitation';
import { Modal } from '@/components/ui/modal';
import contactService from '@/services/contact';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notification from '@/services/notification';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { IRootState } from '@/store';

export default function JobDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentJob, isLoading } = useAppSelector((state) => state.job.homeowner);
  const { user, mode } = useAppSelector((state: IRootState) => state.auth);
  const [contractorContacts, setContractorContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [hasContacted, setHasContacted] = useState(false);
  const [contactData, setContactData] = useState<any>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [invitationCount, setInvitationCount] = useState(0);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isContractor = user?.role === 'contractor' && mode === 'contractor';

  

  useEffect(() => {
    if (id) {
      loadJob();
      if (!isContractor) {
        loadContractorContacts();
      } else {
        checkIfContacted();
      }
    }
  }, [id, isContractor]);

  const loadJob = async () => {
    try {
      await dispatch(fetchJobById(id!)).unwrap();
      await loadInvitationCount();
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to load job');
      router.back();
    }
  };

  const loadContractorContacts = async () => {
    if (!id) return;
    setLoadingContacts(true);
    try {
      const contacts = await contactService.getContactsByJob(id);
      setContractorContacts(contacts);
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to load contractor contacts');
    } finally {
      setLoadingContacts(false);
    }
  };

  const loadInvitationCount = async () => {
    if (!id) return;
    try {
      const count = await invitationService.getInvitationCountByJob(id);
      setInvitationCount(count);
    } catch (error: any) {
      // Silently fail - invitation count is not critical
      console.error('Failed to load invitation count:', error);
    }
  };

  const checkIfContacted = async () => {
    if (!id || !user) return;
    setLoadingContacts(true);
    try {
      const result = await contactService.checkContact(id);
      setHasContacted(result.hasContacted);
      setContactData(result.contact);
    } catch (error: any) {
      // Silently fail - if error, assume not contacted
      setHasContacted(false);
      setContactData(null);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleContactHomeowner = () => {
    router.push(`/payment/${id}` as any);
  };

  const handlePostJobToMarket = async () => {
    if (!id) return;
    Alert.alert(
      'Post Job to Market',
      'Are you sure you want to post this job to the marketplace? Once posted, you cannot invite specific contractors anymore.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Post',
          style: 'default',
          onPress: async () => {
            setIsPosting(true);
            try {
              await dispatch(postJobToMarket(id)).unwrap();
              notification.success('Success', 'Job posted to market successfully');
              await loadJob();
            } catch (error: any) {
              notification.error('Error', error.message || 'Failed to post job to market');
            } finally {
              setIsPosting(false);
            }
          },
        },
      ]
    );
  };

  const handleInviteContractors = () => {
    setShowInviteModal(true);
  };

  const handleSendInvitations = async () => {
    if (!id || !inviteEmails.trim()) {
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

    setIsInviting(true);
    try {
      // Send invitations to all emails
      const promises = emails.map((email) =>
        invitationService.createInternalInvitation({
          inviteeEmail: email,
          jobId: id!,
        })
      );

      await Promise.all(promises);
      notification.success('Success', `Invitations sent to ${emails.length} contractor(s)`);
      
      // Reload invitation count
      await loadInvitationCount();
      
      // Automatically post job to market after sending invitations
      if (currentJob?.status === 'pending') {
        try {
          await dispatch(postJobToMarket(id!)).unwrap();
          notification.success('Success', 'Job automatically posted to market');
          await loadJob();
        } catch (error: any) {
          notification.error('Error', error.message || 'Failed to post job to market');
        }
      }
      
      setShowInviteModal(false);
      setInviteEmails('');
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to send invitations');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCloseJob = async () => {
    if (!id) return;
    Alert.alert(
      'Close Job',
      'Are you sure you want to close this job? Contractors will no longer be able to contact you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(closeJob(id)).unwrap();
              notification.success('Success', 'Job closed successfully');
            } catch (error: any) {
              notification.error('Error', error.message || 'Failed to close job');
            }
          },
        },
      ]
    );
  };

  const handleDeleteJob = async () => {
    if (!id) return;
    Alert.alert(
      'Delete Job',
      'Are you sure you want to delete this job? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteJob(id)).unwrap();
              notification.success('Success', 'Job deleted successfully');
              router.back();
            } catch (error: any) {
              notification.error('Error', error.message || 'Failed to delete job');
            }
          },
        },
      ]
    );
  };

  const handleChatPress = (chatRoomId: string) => {
    router.push(`/chat/${chatRoomId}` as any);
  };

  const isDark = colorScheme === 'dark';

  if (isLoading || !currentJob) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: currentJob.status === 'closed' ? '#9E9E9E' : '#4CAF50',
              },
            ]}>
            <Text style={styles.statusText}>
              {currentJob.status.charAt(0).toUpperCase() + currentJob.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Job Title */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Job Title</Text>
          <Text style={[styles.jobTitle, { color: colors.text }]}>
            {currentJob.jobTitle || 'No title'}
          </Text>
        </View>

        {/* Job Number & Job Size */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <View style={styles.infoRow}>
            {currentJob.jobNumber && (
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: colors.icon }]}>Job Number</Text>
                <Text style={[styles.infoValue, { color: colors.tint }]}>
                  #{currentJob.jobNumber}
                </Text>
              </View>
            )}
            {currentJob.jobSize && (
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: colors.icon }]}>Job Size</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {currentJob.jobSize === 'micro' && 'Micro Job ($0 - $2,500)'}
                  {currentJob.jobSize === 'small' && 'Small Job ($2,500 - $10,000)'}
                  {currentJob.jobSize === 'big' && 'Big Job ($10,000 - $50,000)'}
                  {currentJob.jobSize === 'very_big' && 'Very Big Job ($50,000+)'}
                </Text>
              </View>
            )}
          </View>
          {currentJob.structureType && (
            <View style={[styles.infoItem, { marginTop: 16 }]}>
              <Text style={[styles.infoLabel, { color: colors.icon }]}>Type of Structure</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {currentJob.structureType === 'single_detached_house' && 'Single Detached House'}
                {currentJob.structureType === 'semi_detached_house' && 'Semi Detached House'}
                {currentJob.structureType === 'townhouse' && 'Townhouse'}
                {currentJob.structureType === 'low_rise_building' && 'Low Rise Building'}
                {currentJob.structureType === 'high_rise_building' && 'High Rise Building'}
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
          <Text style={[styles.description, { color: colors.text }]}>
            {currentJob.description}
          </Text>
        </View>

        {/* Categories */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories</Text>
          <View style={styles.categoriesContainer}>
            {currentJob.categories.map((category) => (
              <View
                key={`${currentJob.id}-${category}`}
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
                    {/* City and Province - Always visible */}
                    {(currentJob.location.cityName || currentJob.location.province) && (
                      <Text style={[styles.cityProvinceText, { color: colors.text }]}>
                        {currentJob.location.cityName}
                        {currentJob.location.cityName && currentJob.location.province && ', '}
                        {currentJob.location.province}
                      </Text>
                    )}
                  </>
                )
                : currentJob.location.address}
            </Text>
          </View>
          
        </View>

        {/* Contractor Limit Info */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contractor Contacts</Text>
          <Text style={[styles.infoText, { color: colors.icon }]}>
            {currentJob.contractorContactsCount} / {currentJob.contractorLimit} contractors
            have contacted you
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
                    onPress={() => handleChatPress(contactData.chatRoomId)}>
                    <IconSymbol name="message.fill" size={20} color="#FFFFFF" />
                    <Text style={styles.chatButtonText}>Open Chat</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              currentJob.status !== 'closed' && currentJob.contractorContactsCount < currentJob.contractorLimit
              ? (
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: colors.tint }]}
                onPress={handleContactHomeowner}>
                <IconSymbol name="creditcard.fill" size={20} color="#FFFFFF" />
                <Text style={styles.contactButtonText}>Contact Homeowner ($19.99)</Text>
              </TouchableOpacity>
              ) : (
                <View style={styles.contactButtonDisabled}>
                  <IconSymbol name="lock.fill" size={20} color="#FFFFFF" />
                  <Text style={styles.contactButtonTextDisabled}>Contact Limit Reached</Text>
                </View>
              )
            )}
          </View>
        )}

        {/* Homeowner View - Contractor Contacts */}
        {!isContractor && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
              Contractor Contacts
            </Text>
          {loadingContacts ? (
            <ActivityIndicator color={colors.tint} />
          ) : contractorContacts.length === 0 ? (
            <View style={[styles.emptyContacts, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
              <IconSymbol name="person.2" size={32} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                No contractors have contacted you yet
              </Text>
            </View>
          ) : (
            contractorContacts.map((contact) => {
              // Use contractor virtual field (backend now uses virtuals)
              const contractor = contact.contractor;
              const contractorName = contractor?.firstName && contractor?.lastName
                ? `${contractor.firstName} ${contractor.lastName}`
                : contractor?.firstName || contractor?.lastName || 'Contractor';
              const contractorEmail = contractor?.email || '';
              const contractorInitials = (contractor?.firstName?.[0] || 'C') + (contractor?.lastName?.[0] || '');

              return (
              <TouchableOpacity
                key={contact.id}
                style={[styles.contactCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}
                onPress={() => contact.chatRoomId && handleChatPress(contact.chatRoomId)}
                activeOpacity={0.7}>
                <View style={styles.contactHeader}>
                  <View style={styles.contactInfo}>
                    <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
                      <Text style={styles.avatarText}>
                        {contractorInitials}
                      </Text>
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
                      onPress={() => handleChatPress(contact.chatRoomId)}>
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

        {/* Actions - Homeowner Only */}
        {!isContractor && (
          <View style={styles.actionsContainer}>
            {currentJob.status === 'pending' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.tint }]}
                  onPress={handleInviteContractors}
                  disabled={isInviting}>
                  <IconSymbol name="person.2.fill" size={18} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Invite Contractors</Text>
                </TouchableOpacity>
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
              </>
            )}
            {currentJob.status === 'open' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FF9500' }]}
                  onPress={handleCloseJob}>
                  <Text style={styles.actionButtonText}>Close Job</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                  onPress={handleDeleteJob}>
                  <Text style={styles.actionButtonText}>Delete Job</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Invite Contractors Modal */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingTop: 20
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statusContainer: {
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
  cityProvinceRow: {
    marginTop: 8,
  },
  cityProvinceText: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
  },
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
  contactName: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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

