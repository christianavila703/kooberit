import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchJobPosts,
  setRadius,
  setCategories,
  setSearchQuery,
  resetFilters,
  setRefreshing,
} from '@/store/slices/contractorSlice';
import {
  fetchProfileSettings,
} from '@/store/slices/profileSlice';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Modal } from '@/components/ui/modal';
import { CONSTRUCTION_CATEGORIES } from '@/constants/config';
import { IRootState } from '@/store';

export default function ContractorDashboard() {
  const router = useRouter();
  const { user } = useAppSelector((state: IRootState) => state.auth);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const dispatch = useAppDispatch();
  const {
    jobPosts,
    radius,
    categories,
    searchQuery,
    isLoading,
    isLoadingMore,
    isRefreshing,
    pagination,
  } = useAppSelector((state: IRootState) => state.contractor);
  const { settings: profileSettings, isSaving } = useAppSelector(
    (state: IRootState) => state.profile
  );

  const [showFilters, setShowFilters] = useState(false);
  const [tempRadius, setTempRadius] = useState<number | null>(null);
  const [tempCategories, setTempCategories] = useState<string[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // fetch profile on mount
  useEffect(() => {
    dispatch(fetchProfileSettings());
  }, [dispatch]);

  // When profile is loaded, set categories and fetch job posts
  useEffect(() => {
    if (profileSettings.constructionCategories === undefined) return;

    const profileCategories = profileSettings.constructionCategories || [];
    dispatch(setCategories(profileCategories));
  }, [profileSettings.constructionCategories, dispatch]);

  // Handle search changes with debounce
  useEffect(() => {

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const profileCategories = profileSettings.constructionCategories || [];
      const categoriesToUse = categories.length > 0 ? categories : profileCategories;
      dispatch(
        fetchJobPosts({
          reset: true,
          page: 1,
          search: searchQuery || undefined,
          radius: radius,
          categories: categoriesToUse,
        })
      );
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, radius, categories, dispatch]);

  // Sync temp filters when modal opens
  useEffect(() => {
    if (showFilters) {
      setTempRadius(radius);
      setTempCategories([...categories]);
    }
  }, [showFilters, radius, categories]);

  const onRefresh = async () => {
    dispatch(setRefreshing(true));
    const profileCategories = profileSettings.constructionCategories || [];
    await dispatch(
      fetchJobPosts({
        reset: true,
        page: 1,
        search: searchQuery || undefined,
        radius: radius,
        categories: categories.length > 0 ? categories : profileCategories,
      })
    );
  };

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && pagination?.hasNextPage && !isLoading) {
      const profileCategories = profileSettings.constructionCategories || [];
      dispatch(
        fetchJobPosts({
          reset: false,
          page: (pagination.currentPage || 0) + 1,
          search: searchQuery || undefined,
          radius: radius,
          categories: categories.length > 0 ? categories : profileCategories,
        })
      );
    }
  }, [isLoadingMore, pagination, isLoading, searchQuery, radius, categories, dispatch]);

  const handleToggleCategory = (category: string) => {
    if (tempCategories.includes(category)) {
      setTempCategories(tempCategories.filter((c) => c !== category));
    } else {
      setTempCategories([...tempCategories, category]);
    }
  };

  const handleApplyFilters = () => {
    dispatch(setRadius(tempRadius));
    dispatch(setCategories(tempCategories));
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    const profileCategories = profileSettings.constructionCategories || [];
    setTempRadius(null);
    setTempCategories([...profileCategories]);
    dispatch(resetFilters({ profileCategories }));
  };

  const handleCloseModal = () => {
    setShowFilters(false);
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

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
        <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search jobs..."
          placeholderTextColor={colors.icon}
          value={searchQuery}
          onChangeText={(text) => dispatch(setSearchQuery(text))}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => dispatch(setSearchQuery(''))}>
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
                  tempRadius === null && { backgroundColor: colors.tint },
                  { borderColor: colors.tint },
                ]}
                onPress={() => setTempRadius(null)}>
                <Text
                  style={[
                    styles.radiusButtonText,
                    { color: tempRadius === null ? '#FFFFFF' : colors.text },
                  ]}>
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radiusButton,
                  tempRadius === 25 && { backgroundColor: colors.tint },
                  { borderColor: colors.tint },
                ]}
                onPress={() => setTempRadius(25)}>
                <Text
                  style={[
                    styles.radiusButtonText,
                    { color: tempRadius === 25 ? '#FFFFFF' : colors.text },
                  ]}>
                  25 km
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radiusButton,
                  tempRadius === 50 && { backgroundColor: colors.tint },
                  { borderColor: colors.tint },
                ]}
                onPress={() => setTempRadius(50)}>
                <Text
                  style={[
                    styles.radiusButtonText,
                    { color: tempRadius === 50 ? '#FFFFFF' : colors.text },
                  ]}>
                  50 km
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radiusButton,
                  tempRadius === 100 && { backgroundColor: colors.tint },
                  { borderColor: colors.tint },
                ]}
                onPress={() => setTempRadius(100)}>
                <Text
                  style={[
                    styles.radiusButtonText,
                    { color: tempRadius === 100 ? '#FFFFFF' : colors.text },
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
                      backgroundColor: tempCategories.includes(category)
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
                        color: tempCategories.includes(category) ? '#FFFFFF' : colors.text,
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
                    {jobPost.hasContacted
                      ? jobPost.location?.address || 'Location not specified'
                      :( radius
                      ? `Within ${radius} km radius`
                      : 'Location hidden - contact to view')}
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
          isLoadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.tint} />
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
