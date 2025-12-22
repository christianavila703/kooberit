import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchJobById,
  closeJob,
  deleteJob,
} from '@/store/slices/jobSlice';
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
        {!isContractor && currentJob.status === 'open' && (
          <View style={styles.actionsContainer}>
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
          </View>
        )}
      </ScrollView>
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
});

