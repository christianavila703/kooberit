import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchHomeownerJobPosts } from '@/store/slices/jobPostSlice';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notificationService from '@/services/notification';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabIndex() {
  const { user } = useAppSelector((state) => state.auth);
  const role = user?.role || 'homeowner';

  // For contractors, they should use contractor-dashboard tab
  // This index tab is for homeowners only
  if (role === 'contractor') {
    return null; // Contractor will use contractor-dashboard tab
  }

  // Homeowner dashboard
  return <HomeownerDashboard />;
}

function HomeownerDashboard() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { jobPosts, isLoading } = useAppSelector((state) => state.jobPost);
  const { user } = useAppSelector((state) => state.auth);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadJobPosts();
  }, []);

  const loadJobPosts = async () => {
    try {
      await dispatch(fetchHomeownerJobPosts()).unwrap();
    } catch (error: any) {
      notificationService.error('Error', error || 'Failed to load job posts');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobPosts();
    setRefreshing(false);
  };

  const handleCreateJobPost = () => {
    router.push('/create-job-post' as any);
  };

  const handleJobPostPress = (jobPostId: string) => {
    router.push(`/job-post/${jobPostId}` as any);
  };

  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.icon }]}>Welcome back,</Text>
          <Text style={[styles.name, { color: colors.text }]}>
            {user?.firstName} {user?.lastName}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
          <Text style={[styles.statNumber, { color: colors.tint }]}>
            {jobPosts.filter((jp) => jp.status === 'active').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Active Jobs</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
          <Text style={[styles.statNumber, { color: colors.tint }]}>
            {jobPosts.reduce((sum, jp) => sum + jp.contractorContactsCount, 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Total Contacts</Text>
        </View>
      </View>

      {/* Job Posts List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }>
        {isLoading && jobPosts.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : jobPosts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="doc.text" size={64} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No job posts yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.icon }]}>
              Create your first job post to get started
            </Text>
          </View>
        ) : (
          jobPosts.map((jobPost) => (
            <TouchableOpacity
              key={jobPost.id}
              style={[styles.jobCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}
              onPress={() => handleJobPostPress(jobPost.id)}
              activeOpacity={0.7}>
              <View style={styles.jobCardHeader}>
                <View style={styles.jobCardTitleRow}>
                  <Text
                    style={[styles.jobCardTitle, { color: colors.text }]}
                    numberOfLines={2}>
                    {jobPost.description.substring(0, 60)}
                    {jobPost.description.length > 60 ? '...' : ''}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          jobPost.status === 'active' ? '#4CAF50' : '#9E9E9E',
                      },
                    ]}>
                    <Text style={styles.statusText}>
                      {jobPost.status === 'active' ? 'Active' : 'Closed'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.jobCardBody}>
                <View style={styles.categoriesContainer}>
                  {jobPost.categories.slice(0, 3).map((category, index) => (
                    <View
                      key={index}
                      style={[
                        styles.categoryTag,
                        { backgroundColor: isDark ? '#2E2E2E' : '#E0E0E0' },
                      ]}>
                      <Text style={[styles.categoryText, { color: colors.text }]}>
                        {category}
                      </Text>
                    </View>
                  ))}
                  {jobPost.categories.length > 3 && (
                    <Text style={[styles.moreCategories, { color: colors.icon }]}>
                      +{jobPost.categories.length - 3}
                    </Text>
                  )}
                </View>

                <View style={styles.jobCardFooter}>
                  <View style={styles.contactInfo}>
                    <IconSymbol name="person.2.fill" size={16} color={colors.icon} />
                    <Text style={[styles.contactText, { color: colors.icon }]}>
                      {jobPost.contractorContactsCount} / {jobPost.contractorLimit} contractors
                    </Text>
                  </View>
                  <Text style={[styles.dateText, { color: colors.icon }]}>
                    {jobPost.createdAt
                      ? new Date(jobPost.createdAt).toLocaleDateString()
                      : ''}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={handleCreateJobPost}
        activeOpacity={0.8}>
        <IconSymbol name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  jobCard: {
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
  jobCardHeader: {
    marginBottom: 12,
  },
  jobCardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  jobCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  jobCardBody: {
    gap: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  moreCategories: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
