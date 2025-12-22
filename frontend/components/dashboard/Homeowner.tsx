import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
 import { fetchHomeownerJobs } from '@/store/slices/jobSlice';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notification from '@/services/notification';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function HomeownerDashboard() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { jobs, isLoading } = useAppSelector((state) => state.job.homeowner);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [pagination, setPagination] = useState<{
    currentPage: number;
    totalPages: number;
    totalCount: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } | null>(null);

  useEffect(() => {
    loadjobs(true);
  }, []);

  const loadjobs = async (reset: boolean = false) => {
    if (reset) {
      setPage(1);
      setHasMore(true);
    } else {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    }

    try {
      const currentPage = reset ? 1 : page;
      const result = await dispatch(
        fetchHomeownerJobs({ status: 'all', page: currentPage, limit: 20, append: !reset })
      ).unwrap();
      
      setPagination(result.pagination);
      setHasMore(result.pagination.hasNextPage);
      setPage(result.pagination.currentPage + 1);
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to load job posts');
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadjobs(true);
    setRefreshing(false);
  };

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !isLoading) {
      loadjobs(false);
    }
  }, [loadingMore, hasMore, isLoading]);

  const handleCreateJob = () => {
    router.push('/create-job' as any);
  };

  const handleJobPress = (jobId: string) => {
    router.push(`/job/${jobId}` as any);
  };

  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
          <Text style={[styles.statNumber, { color: colors.tint }]}>
            {jobs.filter((j) => j.status === 'open').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Active Jobs</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
          <Text style={[styles.statNumber, { color: colors.tint }]}>
            {jobs.reduce((sum, j) => sum + j.contractorContactsCount, 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Total Contacts</Text>
        </View>
      </View>

      {/* Jobs List */}
      <FlatList
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item: job }) => (
          <TouchableOpacity
            style={[styles.jobCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}
            onPress={() => handleJobPress(job.id)}
            activeOpacity={0.7}>
            <View style={styles.jobCardHeader}>
              <View style={styles.jobCardTitleRow}>
                <View style={styles.jobCardTitleContainer}>
                  <Text
                    style={[styles.jobCardTitle, { color: colors.text }]}
                    numberOfLines={2}>
                    {job.jobTitle || job.description
                      ? (job.jobTitle || job.description).substring(0, 60)
                      : 'No title'}
                    {(job.jobTitle || job.description || '').length > 60 ? '...' : ''}
                  </Text>
                  {job.jobNumber && (
                    <Text style={[styles.jobNumber, { color: colors.icon }]}>
                      Job #{job.jobNumber}
                    </Text>
                  )}
                  {job.jobSize && (
                    <View style={styles.jobSizeContainer}>
                      <Text style={[styles.jobSizeLabel, { color: colors.icon }]}>Job Size: </Text>
                      <Text style={[styles.jobSizeValue, { color: colors.tint }]}>
                        {job.jobSize === 'micro' && 'Micro Job ($0 - $2,500)'}
                        {job.jobSize === 'small' && 'Small Job ($2,500 - $10,000)'}
                        {job.jobSize === 'big' && 'Big Job ($10,000 - $50,000)'}
                        {job.jobSize === 'very_big' && 'Very Big Job ($50,000+)'}
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        job.status === 'closed' ? '#9E9E9E' : '#4CAF50',
                    },
                  ]}>
                  <Text style={styles.statusText}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.jobCardBody}>
              <View style={styles.categoriesContainer}>
                {job.categories.slice(0, 3).map((category) => (
                  <View
                    key={`${job.id}-${category}`}
                    style={[
                      styles.categoryTag,
                      { backgroundColor: isDark ? '#2E2E2E' : '#E0E0E0' },
                    ]}>
                    <Text style={[styles.categoryText, { color: colors.text }]}>
                      {category}
                    </Text>
                  </View>
                ))}
                {job.categories.length > 3 && (
                  <Text style={[styles.moreCategories, { color: colors.icon }]}>
                    +{job.categories.length - 3}
                  </Text>
                )}
              </View>

              <View style={styles.jobCardFooter}>
                <View style={styles.contactInfo}>
                  <IconSymbol name="person.2.fill" size={16} color={colors.icon} />
                  <Text style={[styles.contactText, { color: colors.icon }]}>
                    {job.contractorContactsCount} / {job.contractorLimit} contractors
                  </Text>
                </View>
                <Text style={[styles.dateText, { color: colors.icon }]}>
                  {job.createdAt
                    ? new Date(job.createdAt).toLocaleDateString()
                    : ''}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <IconSymbol name="doc.text" size={64} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                No jobs yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.icon }]}>
                Create your first job to get started
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={handleCreateJob}
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
    flexGrow: 1,
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
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
  jobCardTitleContainer: {
    flex: 1,
    gap: 4,
  },
  jobCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  jobNumber: {
    fontSize: 12,
    fontWeight: '500',
  },
  jobSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobSizeLabel: {
    fontSize: 12,
  },
  jobSizeValue: {
    fontSize: 12,
    fontWeight: '600',
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
