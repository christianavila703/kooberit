import React, { useEffect, useState, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchJobById,
  closeJob,
  deleteJob,
  postJobToMarket,
} from '@/store/slices/jobSlice';
import invitationService from '@/services/invitation';
import contactService from '@/services/contact';
import bidService from '@/services/bid';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notification from '@/services/notification';
import { IRootState } from '@/store';
import JobDetails from '@/components/job/JobDetails';
import ContractorsTab from '@/components/job/ContractorsTab';
import BidTab from '@/components/job/BidTab';

export default function JobDetailsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { user, mode } = useAppSelector((state: IRootState) => state.auth);
  const isContractor = user?.role === 'contractor' && mode === 'contractor';
  
  // Get jobs from appropriate array based on user type
  const contractorJobs = useAppSelector((state) => state.job.contractor.jobs);
  const homeownerJobs = useAppSelector((state) => state.job.homeowner.jobs);
  const contractorIsLoading = useAppSelector((state) => state.job.contractor.isLoading);
  const homeownerIsLoading = useAppSelector((state) => state.job.homeowner.isLoading);
  
  // Filter job by ID from appropriate array
  const currentJob = useMemo(() => {
    if (!id) return undefined;
    return isContractor
      ? contractorJobs.find((job) => job.id === id)
      : homeownerJobs.find((job) => job.id === id);
  }, [isContractor, contractorJobs, homeownerJobs, id]);
  const isLoading = isContractor ? contractorIsLoading : homeownerIsLoading;
  const [contractorContacts, setContractorContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [hasContacted, setHasContacted] = useState(false);
  const [contactData, setContactData] = useState<any>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [invitationCount, setInvitationCount] = useState(0);
  const [bids, setBids] = useState<any[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [awardingBid, setAwardingBid] = useState<string | null>(null);
  const [rejectingBid, setRejectingBid] = useState<string | null>(null);
  const [myBid, setMyBid] = useState<any>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [activeTab, setActiveTab] = useState<'details' | 'contractors' | 'bid'>('details');

  const { isAuthenticated } = useAppSelector((state: IRootState) => state.auth);
  const initialLoadKeyRef = useRef<string | null>(null);

  // Update header title with job number
  useLayoutEffect(() => {
    if (currentJob?.jobNumber) {
      navigation.setOptions({
        title: `Job #${currentJob.jobNumber}`,
      });
    } else {
      navigation.setOptions({
        title: 'Job Details',
      });
    }
  }, [currentJob?.jobNumber, navigation]);

  const loadBids = useCallback(async () => {
    if (!id || isContractor) return;
    setLoadingBids(true);
    try {
      const bidsData = await bidService.getBidsByJob(id);
      setBids(bidsData);
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to load bids');
    } finally {
      setLoadingBids(false);
    }
  }, [id]);

  const handleAwardBid = async (bid: any) => {
    const bidId = bid.id;
    let message = 'Are you sure you want to award this bid? All other bids will be automatically rejected.';
    
    if (bid.passFeeToHomeowner) {
      message += `\n\nThe award fee of $${bid.awardFee.toFixed(2)} (2.5% of the bid value) is included in the bid amount and must be paid by you before the project can proceed. The contract amount already excludes this fee.`;
    } else {
      message += `\n\nThe contractor must pay the award fee of $${bid.awardFee.toFixed(2)} (2.5% of the bid value) before they can send messages. Once payment is made, messaging will be enabled.`;
    }

    Alert.alert(
      'Award Bid',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Award',
          style: 'default',
          onPress: async () => {
            setAwardingBid(bidId);
            try {
              await bidService.awardBid(bidId);
              notification.success('Success', 'Bid awarded successfully');
              await loadBids();
              
              // If homeowner needs to pay, show payment option
              if (bid.passFeeToHomeowner) {
                Alert.alert(
                  'Pay Award Fee',
                  `The award fee of $${bid.awardFee.toFixed(2)} must be paid before the project can proceed. Would you like to pay now?`,
                  [
                    { text: 'Later', style: 'cancel' },
                    {
                      text: 'Pay Now',
                      onPress: () => {
                        router.push(`/payment/award-fee/${bidId}` as any);
                      },
                    },
                  ]
                );
              }
            } catch (error: any) {
              notification.error('Error', error.message || 'Failed to award bid');
            } finally {
              setAwardingBid(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectBid = async (bid: any) => {
    const bidId = bid.id;
    Alert.alert(
      'Reject Bid',
      'Are you sure you want to reject this bid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setRejectingBid(bidId);
            try {
              await bidService.rejectBid(bidId);
              notification.success('Success', 'Bid rejected successfully');
              await loadBids();
            } catch (error: any) {
              notification.error('Error', error.message || 'Failed to reject bid');
            } finally {
              setRejectingBid(null);
            }
          },
        },
      ]
    );
  };

  const loadJob = useCallback(async () => {
    try {
      const result = await dispatch(fetchJobById(id!)).unwrap();
      // Invitation count is non-critical; fetch best-effort without blocking the UI
      try {
        if (id) {
          const count = await invitationService.getInvitationCountByJob(id);
          setInvitationCount(count);
        }
      } catch (error: any) {
        // Silently fail - invitation count is not critical
        console.error('Failed to load invitation count:', error);
      }
      return result;
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to load job');
      router.back();
      return null;
    }
  }, [dispatch, id, router]);

  const loadContractorContacts = useCallback(async () => {
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
  }, [id]);

  const checkIfContacted = useCallback(async () => {
    if (!id || !user) return;
    setLoadingContacts(true);
    try {
      const result = await contactService.checkContact(id);
      setHasContacted(result.hasContacted);
      setContactData(result.contact);
    } catch {
      // Silently fail - if error, assume not contacted
      setHasContacted(false);
      setContactData(null);
    } finally {
      setLoadingContacts(false);
    }
  }, [id, user]);

  const loadMyBid = useCallback(async () => {
    if (!id || !user || !isContractor) return;
    try {
      const bidsData = await bidService.getBidsByJob(id);
      const myBidData = bidsData.find((bid) => bid.contractorId === user.id);
      setMyBid(myBidData || null);
    } catch {
      // Silently fail - bid might not exist
      setMyBid(null);
    } finally {
    }
  }, [id, user]);

  const handleBidSubmitted = useCallback(async () => {
    await loadMyBid();
  }, [loadMyBid]);

  const handleContactHomeowner = useCallback(() => {
    router.push(`/payment/${id}` as any);
  }, [router, id]);

  const handlePostJobToMarket = useCallback(async () => {
    if (!id) return;
    setIsPosting(true);
    try {
      await dispatch(postJobToMarket(id)).unwrap();
      await loadJob();
    } catch (error: any) {
      throw error;
    } finally {
      setIsPosting(false);
    }
  }, [dispatch, id, loadJob]);

  const handleInviteContractors = useCallback(async (emails: string[]) => {
    if (!id) return;
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
      
      // Automatically post job to market after sending invitations
      // Reload job to get latest status
      const result = await loadJob();
      if (result?.job?.status === 'pending') {
        try {
          await dispatch(postJobToMarket(id!)).unwrap();
          notification.success('Success', 'Job automatically posted to market');
          await loadJob();
        } catch (error: any) {
          notification.error('Error', error.message || 'Failed to post job to market');
        }
      }
    } catch (error: any) {
      throw error;
    } finally {
      setIsInviting(false);
    }
  }, [dispatch, id, loadJob]);

  const handleCloseJob = useCallback(async () => {
    if (!id) return;
    try {
      await dispatch(closeJob(id)).unwrap();
    } catch (error: any) {
      throw error;
    }
  }, [dispatch, id]);

  const handleDeleteJob = useCallback(async () => {
    if (!id) return;
    try {
      await dispatch(deleteJob(id)).unwrap();
      router.back();
    } catch (error: any) {
      throw error;
    }
  }, [dispatch, id, router]);

  const handleChatPress = useCallback((chatRoomId: string) => {
    router.push(`/chat/${chatRoomId}` as any);
  }, [router]);

  useEffect(() => {
    if (!id || !isAuthenticated) return;
    const key = `${id}:${isContractor ? 'contractor' : 'homeowner'}`;
    if (initialLoadKeyRef.current === key) return;
    initialLoadKeyRef.current = key;

    loadJob();
    if (!isContractor) {
      // parallelize non-dependent fetches
      Promise.all([loadContractorContacts(), loadBids()]).catch(() => {});
    } else {
      checkIfContacted();
    }
  }, [id, loadJob, loadContractorContacts, loadBids, checkIfContacted]);

  useEffect(() => {
    // Load bid when contractor has contacted
    if (isContractor && hasContacted && id) {
      loadMyBid();
    }
  }, [hasContacted, id, loadMyBid]);

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
      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'details' && [styles.activeTab, { backgroundColor: colors.tint }],
          ]}
          onPress={() => setActiveTab('details')}>
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'details' ? '#FFFFFF' : colors.text },
            ]}>
            Details
          </Text>
        </TouchableOpacity>
        {isContractor && hasContacted ? (
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'bid' && [styles.activeTab, { backgroundColor: colors.tint }],
            ]}
            onPress={() => setActiveTab('bid')}>
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'bid' ? '#FFFFFF' : colors.text },
              ]}>
              Bid
            </Text>
          </TouchableOpacity>
        ) : !isContractor ? (
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'contractors' && [styles.activeTab, { backgroundColor: colors.tint }],
            ]}
            onPress={() => setActiveTab('contractors')}>
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'contractors' ? '#FFFFFF' : colors.text },
              ]}>
              Contractors
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Job Details Tab Content */}
        {activeTab === 'details' && (
          <JobDetails
            job={currentJob}
            isContractor={isContractor}
            hasContacted={hasContacted}
            contactData={contactData}
            loadingContacts={loadingContacts}
            onContactPress={handleContactHomeowner}
            onChatPress={handleChatPress}
            invitationCount={invitationCount}
            onInviteContractors={!isContractor ? handleInviteContractors : undefined}
            onPostJobToMarket={!isContractor ? handlePostJobToMarket : undefined}
            onCloseJob={!isContractor ? handleCloseJob : undefined}
            onDeleteJob={!isContractor ? handleDeleteJob : undefined}
            isInviting={isInviting}
            isPosting={isPosting}
            isInvited={currentJob.hasInvitation || false}
          />
        )}

        {/* Bid Tab Content (Contractors) */}
        {isContractor && hasContacted && activeTab === 'bid' && (
          <BidTab
            jobId={id!}
            existingBid={myBid}
            onBidSubmitted={handleBidSubmitted}
            jobStatus={currentJob?.status}
            onBidShouldRefresh={loadMyBid}
            onJobShouldRefresh={async () => {
              await loadJob();
            }}
          />
        )}

        {/* Contractors Tab Content */}
        {!isContractor && activeTab === 'contractors' && (
          <ContractorsTab
            bids={bids}
            contractorContacts={contractorContacts}
            loadingBids={loadingBids}
            loadingContacts={loadingContacts}
            awardingBid={awardingBid}
            rejectingBid={rejectingBid}
            onAwardBid={handleAwardBid}
            onRejectBid={handleRejectBid}
            onChatPress={handleChatPress}
            onPayAwardFee={(bidId) => router.push(`/payment/award-fee/${bidId}` as any)}
            router={router}
            onBidsShouldRefresh={loadBids}
            onJobShouldRefresh={async () => {
              await loadJob();
            }}
          />
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
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8
  },
  tab: {
    width: 120,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    paddingTop: 20
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});

