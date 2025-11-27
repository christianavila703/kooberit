import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Switch,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setRadius,
  toggleCategory,
  resetFilters,
  resetToApplied,
  setAppliedFilters,
} from '@/store/slices/contractorFilterSlice';
import {
  fetchProfileSettings,
  updateProfileSettings,
} from '@/store/slices/profileSlice';
import contractorService from '@/services/contractor';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notification from '@/services/notification';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Modal } from '@/components/ui/modal';
import { CONSTRUCTION_CATEGORIES } from '@/constants/config';
import { IRootState } from '@/store';

let isJobPostsLoading = false;

export default function ContractorDashboard() {
  const router = useRouter();
  const { user } = useAppSelector((state: IRootState) => state.auth);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const dispatch = useAppDispatch();
  const { radius, selectedCategories, appliedRadius, appliedCategories } = useAppSelector(
    (state: IRootState) => state.contractorFilter
  );
  const { settings: profileSettings, isSaving, lastFetched } = useAppSelector((state: IRootState) => state.profile);

  const [jobPosts, setJobPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
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

  const [categoriesInitialized, setCategoriesInitialized] = useState(false);
  const prevProfileCategoriesRef = useRef<string[] | undefined>(undefined);
  const filtersManuallyAppliedRef = useRef(false);

  useEffect(() => {
    // Load profile settings from Redux
    dispatch(fetchProfileSettings());
  }, [dispatch]);

  // Sync filters with contractor's profile categories whenever they change
  useEffect(() => {
    // Don't sync if filters were manually applied by user
    if (filtersManuallyAppliedRef.current) {
      return;
    }

    const contractorCategories = profileSettings.constructionCategories || [];
    const prevCategories = prevProfileCategoriesRef.current;
    
    // Normalize categories for comparison (sort and create new array)
    const normalizedContractorCategories = [...contractorCategories].sort();
    const normalizedPrevCategories = prevCategories ? [...prevCategories].sort() : [];
    
    // Check if profile categories have changed
    const categoriesChanged = prevCategories !== undefined && 
      JSON.stringify(normalizedContractorCategories) !== JSON.stringify(normalizedPrevCategories);
    
    if (!categoriesInitialized) {
      // Initial load - set categories if available
      if (contractorCategories.length > 0 && appliedCategories.length === 0) {
        dispatch(setAppliedFilters({ 
          radius: null, 
          categories: contractorCategories 
        }));
      }
      prevProfileCategoriesRef.current = contractorCategories.length > 0 ? [...contractorCategories] : [];
      setCategoriesInitialized(true);
    } else if (categoriesChanged) {
      // Profile categories changed - sync filters with new profile categories
      // Reset the manual flag since we're syncing with profile changes
      filtersManuallyAppliedRef.current = false;
      // Use current applied radius to preserve it
      const currentAppliedRadius = appliedRadius;
      dispatch(setAppliedFilters({ 
        radius: currentAppliedRadius, 
        categories: contractorCategories 
      }));
      prevProfileCategoriesRef.current = contractorCategories.length > 0 ? [...contractorCategories] : [];
    }
  }, [profileSettings.constructionCategories, lastFetched, categoriesInitialized, dispatch]);

  // Load job posts when applied filters change (after initialization)
  useEffect(() => {
    console.log("categoriesInitialized")
    if (categoriesInitialized) {
      loadJobPosts(true);
    }
  }, [appliedRadius, appliedCategories, categoriesInitialized]);

  useEffect(() => {
    console.log("searchQuery");
    const timer = setTimeout(() => {
      // Reset filters when search is performed
      if (searchQuery) {
        dispatch(resetFilters());
      }
      loadJobPosts(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, dispatch]);

  const loadJobPosts = async (reset: boolean = false) => {
    console.log("loadJobPosts")

    console.log(isJobPostsLoading, '--------')

    if (isJobPostsLoading) return;

    if (reset) {
      setPage(1);
      setHasMore(true);
      setIsLoading(true);
    } else {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    }

    isJobPostsLoading = true;

    try {
      const currentPage = reset ? 1 : page;
      
      // Always use contractor's profile categories as base, merge with manual filter selections
      const contractorCategories = profileSettings.constructionCategories || [];
      const categoriesToUse = appliedCategories.length > 0 
        ? appliedCategories 
        : (contractorCategories.length > 0 ? contractorCategories : undefined);

      const result = await contractorService.getJobBoard({
        radius: appliedRadius ?? undefined,
        categories: categoriesToUse,
        search: searchQuery || undefined,
        page: currentPage,
        limit: 20,
      });
      if (reset) {
        setJobPosts(result.data);
      } else {
        // Deduplicate items by ID to prevent duplicate keys
        setJobPosts((prev) => {
          const existingIds = new Set(prev.map((post) => post.id));
          const newItems = result.data.filter((post) => post.id && !existingIds.has(post.id));
          return [...prev, ...newItems];
        });
      }

      setPagination(result.pagination);
      setHasMore(result.pagination.hasNextPage);
      setPage(result.pagination.currentPage + 1);
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to load job posts');
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }

    isJobPostsLoading = false;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobPosts(true);
    setRefreshing(false);
  };

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !isLoading) {
      loadJobPosts(false);
    }
  }, [loadingMore, hasMore, isLoading]);

  const handleToggleCategory = (category: string) => {
    dispatch(toggleCategory(category));
  };

  const handleApplyFilters = () => {
    // Mark that filters were manually applied to prevent auto-sync from overriding
    filtersManuallyAppliedRef.current = true;
    // Apply filters immediately using current values
    dispatch(setAppliedFilters({ radius, categories: selectedCategories }));
    // Update ref to prevent auto-sync until profile changes again
    prevProfileCategoriesRef.current = selectedCategories.length > 0 ? [...selectedCategories] : [];
    setShowFilters(false);

  };

  const handleResetFilters = () => {
    // Reset to contractor's profile categories (or empty if none set)
    const defaultRadius: number | null = null; // "All"
    const contractorCategories = profileSettings.constructionCategories || [];
    // Reset the manual flag since we're resetting to profile defaults
    filtersManuallyAppliedRef.current = false;
    dispatch(setAppliedFilters({ radius: defaultRadius, categories: contractorCategories }));
    // Update ref to match current state
    prevProfileCategoriesRef.current = contractorCategories.length > 0 ? [...contractorCategories] : [];
  };

  const handleCloseModal = () => {
    dispatch(resetToApplied());
    setShowFilters(false);
  };

  const handleNotificationToggle = async (value: boolean) => {
    // Prevent multiple simultaneous toggles
    if (isSaving) return;

    try {
      await dispatch(updateProfileSettings({ notificationEnabled: value })).unwrap();
      notification.success('Success', `Notifications ${value ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      notification.error('Error', error || 'Failed to update notification settings');
      // Refetch settings to revert to correct state on error
      dispatch(fetchProfileSettings());
    }
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
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}
          onPress={() => setShowFilters(!showFilters)}>
          <IconSymbol name="slider.horizontal.3" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Notification Toggle */}
      <View style={[styles.notificationCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
        <View style={styles.notificationRow}>
          <View style={styles.notificationInfo}>
            <IconSymbol name="bell.fill" size={20} color={colors.tint} />
            <Text style={[styles.notificationText, { color: colors.text }]}>
              Job Notifications
            </Text>
          </View>
          <Switch
            value={profileSettings.notificationEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: '#767577', true: colors.tint }}
            thumbColor="#FFFFFF"
            disabled={isSaving}
          />
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
        <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search jobs..."
          placeholderTextColor={colors.icon}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <IconSymbol name="xmark.circle.fill" size={20} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilters} onClose={handleCloseModal}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#2E2E2E' : '#E0E0E0' }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
            <TouchableOpacity onPress={handleCloseModal}>
              <IconSymbol name="xmark" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Radius (km)</Text>
            <View style={styles.radiusContainer}>
              <TouchableOpacity
                style={[
                  styles.radiusButton,
                  radius === null && { backgroundColor: colors.tint },
                  { borderColor: colors.tint },
                ]}
                onPress={() => dispatch(setRadius(null))}>
                <Text
                  style={[
                    styles.radiusButtonText,
                    { color: radius === null ? '#FFFFFF' : colors.text },
                  ]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radiusButton,
                  radius === 25 && { backgroundColor: colors.tint },
                  { borderColor: colors.tint },
                ]}
                onPress={() => dispatch(setRadius(25))}>
                <Text
                  style={[
                    styles.radiusButtonText,
                    { color: radius === 25 ? '#FFFFFF' : colors.text },
                  ]}>
                  25 km
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radiusButton,
                  radius === 50 && { backgroundColor: colors.tint },
                  { borderColor: colors.tint },
                ]}
                onPress={() => dispatch(setRadius(50))}>
                <Text
                  style={[
                    styles.radiusButtonText,
                    { color: radius === 50 ? '#FFFFFF' : colors.text },
                  ]}>
                  50 km
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radiusButton,
                  radius === 100 && { backgroundColor: colors.tint },
                  { borderColor: colors.tint },
                ]}
                onPress={() => dispatch(setRadius(100))}>
                <Text
                  style={[
                    styles.radiusButtonText,
                    { color: radius === 100 ? '#FFFFFF' : colors.text },
                  ]}>
                  100 km
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.filterTitle, { color: colors.text, marginTop: 24 }]}>
              Categories
            </Text>
            <View style={styles.categoriesContainer}>
              {CONSTRUCTION_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: selectedCategories.includes(category)
                        ? colors.tint
                        : isDark
                        ? '#2E2E2E'
                        : '#F5F5F5',
                    },
                  ]}
                  onPress={() => handleToggleCategory(category)}>
                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color: selectedCategories.includes(category) ? '#FFFFFF' : colors.text,
                      },
                    ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: isDark ? '#2E2E2E' : '#E0E0E0' }]}>
            <TouchableOpacity
              style={[styles.resetButton, { borderColor: colors.tint }]}
              onPress={handleResetFilters}>
              <Text style={[styles.resetButtonText, { color: colors.tint }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.tint }]}
              onPress={handleApplyFilters}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Job Posts List */}
      <FlatList
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        data={jobPosts}
        keyExtractor={(item, index) => item.id || `job-post-${index}`}
        renderItem={({ item: jobPost }) => (
          <TouchableOpacity
            style={[styles.jobCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}
            onPress={() => jobPost.id && handleJobPostPress(jobPost.id)}
            activeOpacity={0.7}>
            <View style={styles.jobCardHeader}>
              <View style={styles.jobCardTitleContainer}>
                <View style={styles.jobCardTitleRow}>
                  <Text style={[styles.jobCardTitle, { color: colors.text }]} numberOfLines={2}>
                    {jobPost.jobTitle || jobPost.description
                      ? (jobPost.jobTitle || jobPost.description).length > 60
                        ? (jobPost.jobTitle || jobPost.description).substring(0, 60) + '...'
                        : (jobPost.jobTitle || jobPost.description)
                      : 'No title'}
                  </Text>
                  {jobPost.hasContacted && (
                    <View
                      style={[
                        styles.contactedBadge,
                        { backgroundColor: isDark ? '#2E7D32' : '#4CAF50' },
                      ]}>
                      <IconSymbol name="checkmark.circle.fill" size={14} color="#FFFFFF" />
                      <Text style={styles.contactedBadgeText}>Contacted</Text>
                    </View>
                  )}
                </View>
                {jobPost.jobNumber && (
                  <Text style={[styles.jobNumber, { color: colors.icon }]}>
                    Job #{jobPost.jobNumber}
                  </Text>
                )}
                {jobPost.jobSize && (
                  <View style={styles.jobSizeContainer}>
                    <Text style={[styles.jobSizeLabel, { color: colors.icon }]}>Job Size: </Text>
                    <Text style={[styles.jobSizeValue, { color: colors.tint }]}>
                      {jobPost.jobSize === 'micro' && 'Micro Job ($0 - $2,500)'}
                      {jobPost.jobSize === 'small' && 'Small Job ($2,500 - $10,000)'}
                      {jobPost.jobSize === 'big' && 'Big Job ($10,000 - $50,000)'}
                      {jobPost.jobSize === 'very_big' && 'Very Big Job ($50,000+)'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.jobCardBody}>
              <View style={styles.categoriesContainer}>
                {jobPost.categories && jobPost.categories.length > 0
                  ? jobPost.categories.slice(0, 3).map((category: string) => (
                      <View
                        key={`${jobPost.id}-${category}`}
                        style={[
                          styles.categoryTag,
                          { backgroundColor: isDark ? '#2E2E2E' : '#E0E0E0' },
                        ]}>
                        <Text style={[styles.categoryText, { color: colors.text }]}>
                          {category}
                        </Text>
                      </View>
                    ))
                  : null}
                {jobPost.categories && jobPost.categories.length > 3 && (
                  <Text style={[styles.moreCategories, { color: colors.icon }]}>
                    +{jobPost.categories.length - 3}
                  </Text>
                )}
              </View>

              <View style={styles.jobCardFooter}>
                <View style={styles.locationInfo}>
                  <IconSymbol name="location.fill" size={14} color={colors.icon} />
                  <Text style={[styles.locationText, { color: colors.icon }]}>
                    {jobPost.location?.address || 'Location not specified'}
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
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <IconSymbol name="doc.text" size={64} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>No job posts found</Text>
              <Text style={[styles.emptySubtext, { color: colors.icon }]}>
                Try adjusting your filters or radius
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  radiusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  radiusButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  jobCardTitleContainer: {
    gap: 8,
  },
  jobCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  jobCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    flex: 1,
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
  contactedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  contactedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  jobCardBody: {
    gap: 12,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    flex: 1,
  },
  dateText: {
    fontSize: 12,
  },
});

