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
  fetchContractorJobs,
  setRadius,
  setCategories,
  setCities,
  setProvince,
  setSearchQuery,
  resetFilters,
  setRefreshing,
} from '@/store/slices/jobSlice';
import {
  fetchProfileSettings,
} from '@/store/slices/profileSlice';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Modal } from '@/components/ui/modal';
import { CONSTRUCTION_CATEGORIES } from '@/constants/config';
import { IRootState } from '@/store';
import { arraysEqual, calculateDistance, formatDistance } from '@/utils/helper';
import { IProvince } from '@/types';
import invitationService from '@/services/invitation';
import notification from '@/services/notification';

export default function ContractorDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const dispatch = useAppDispatch();

  const {
    jobs,
    filters,
    isLoading,
    isLoadingMore,
    isRefreshing,
    pagination,
  } = useAppSelector((state: IRootState) => state.job.contractor);
  
  const { radius, categories, cities, province, searchQuery } = filters;
  const { settings: profileSettings, isSaving } = useAppSelector(
    (state: IRootState) => state.profile
  );
  const { isAuthenticated } = useAppSelector((state: IRootState) => state.auth);

  const [showFilters, setShowFilters] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteType, setInviteType] = useState<'homeowner' | 'contractor'>('homeowner');
  const [isInviting, setIsInviting] = useState(false);
  const [tempRadius, setTempRadius] = useState<number | null>(null);
  const [tempCategories, setTempCategories] = useState<string[]>([]);
  const [tempCities, setTempCities] = useState<string[]>([]);
  const [tempProvince, setTempProvince] = useState<IProvince>('ON');
  const [cityInput, setCityInput] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // fetch profile on mount
  useEffect(() => {
    // Only fetch profile if user is authenticated
    if (isAuthenticated) {
      dispatch(fetchProfileSettings());
    }
  }, [dispatch]);

  // When profile is loaded, set categories and fetch job posts
  useEffect(() => {
    if (profileSettings.constructionCategories === undefined) return;

    const profileCategories = profileSettings.constructionCategories || [];
    if (!arraysEqual(profileCategories, categories)) {
      dispatch(setCategories(profileCategories));
    }
  }, [profileSettings.constructionCategories, dispatch]);

  // Handle search changes with debounce
  useEffect(() => {
    // Don't fetch jobs if user is not authenticated
    if (!isAuthenticated) {
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const profileCategories = profileSettings.constructionCategories || [];
      const categoriesToUse = categories.length > 0 ? categories : profileCategories;
      dispatch(
        fetchContractorJobs({
          reset: true,
          page: 1,
          search: searchQuery || undefined,
          radius: radius,
          categories: categoriesToUse,
          cities: cities.length > 0 ? cities : undefined,
          province: province,
        })
      );
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, radius, categories, cities, province, dispatch]);

  // Sync temp filters when modal opens
  useEffect(() => {
    if (showFilters) {
      setTempRadius(radius);
      setTempCategories([...categories]);
      setTempCities([...cities]);
      setTempProvince(province);
    }
  }, [showFilters, radius, categories, cities, province]);

  const onRefresh = async () => {
    dispatch(setRefreshing(true));
    const profileCategories = profileSettings.constructionCategories || [];
    await dispatch(
      fetchContractorJobs({
        reset: true,
        page: 1,
        search: searchQuery || undefined,
        radius: radius,
        categories: categories.length > 0 ? categories : profileCategories,
        cities: cities.length > 0 ? cities : undefined,
        province: province,
      })
    );
  };

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && pagination?.hasNextPage && !isLoading) {
      const profileCategories = profileSettings.constructionCategories || [];
      dispatch(
        fetchContractorJobs({
          reset: false,
          page: (pagination.currentPage || 0) + 1,
          search: searchQuery || undefined,
          radius: radius,
          categories: categories.length > 0 ? categories : profileCategories,
          cities: cities.length > 0 ? cities : undefined,
          province: province,
        })
      );
    }
  }, [isLoadingMore, pagination, isLoading, searchQuery, radius, categories, cities, province, dispatch]);

  const handleToggleCategory = (category: string) => {
    if (tempCategories.includes(category)) {
      setTempCategories(tempCategories.filter((c) => c !== category));
    } else {
      setTempCategories([...tempCategories, category]);
    }
  };

  const handleAddCity = () => {
    const trimmedCity = cityInput.trim();
    if (trimmedCity && !tempCities.includes(trimmedCity)) {
      setTempCities([...tempCities, trimmedCity]);
      setCityInput('');
    }
  };

  const handleRemoveCity = (cityToRemove: string) => {
    setTempCities(tempCities.filter((c) => c !== cityToRemove));
  };

  const handleApplyFilters = () => {
    dispatch(setRadius(tempRadius));
    dispatch(setCategories(tempCategories));
    dispatch(setCities(tempCities));
    dispatch(setProvince(tempProvince));
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    const profileCategories = profileSettings.constructionCategories || [];
    setTempRadius(null);
    setTempCategories([...profileCategories]);
    setTempCities([]);
    setTempProvince('ON' as IProvince);
    dispatch(resetFilters({ profileCategories }));
  };

  const handleCloseModal = () => {
    setShowFilters(false);
  };

  const handleJobPress = (jobId: string) => {
    router.push(`/job/${jobId}` as any);
  };

  const handleInviteHomeowner = () => {
    setInviteType('homeowner');
    setShowInviteModal(true);
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) {
      notification.error('Error', 'Please enter an email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      notification.error('Error', 'Please enter a valid email address');
      return;
    }

    setIsInviting(true);
    try {
      await invitationService.createExternalInvitation({
        inviteeEmail: inviteEmail.trim(),
        inviteType: inviteType,
      });
      notification.success('Success', `Invitation sent to ${inviteEmail.trim()}`);
      setShowInviteModal(false);
      setInviteEmail('');
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const getLocationText = (job: any): string => {
    // If contractor has contacted, show full address
    if (job.hasContacted) {
      return job.location?.address || 'Location not specified';
    }

    // Calculate distance if we have both profile address and job location coordinates
    if (
      profileSettings.contractorAddress?.coordinates?.latitude &&
      profileSettings.contractorAddress?.coordinates?.longitude &&
      job.location?.coordinates?.latitude &&
      job.location?.coordinates?.longitude
    ) {
      const distance = calculateDistance(
        profileSettings.contractorAddress.coordinates.latitude,
        profileSettings.contractorAddress.coordinates.longitude,
        job.location.coordinates.latitude,
        job.location.coordinates.longitude
      );
      return formatDistance(distance);
    }

    // Fallback to radius display if available
    if (radius) {
      return `Within ${radius} km radius`;
    }

    return 'Location hidden - contact to view';
  };

  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.filterContainer}>
        <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search jobs market..."
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
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}
          onPress={() => setShowFilters(!showFilters)}>
          <IconSymbol name="slider.horizontal.3" size={20} color={colors.text} />
        </TouchableOpacity>
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

            <Text style={[styles.filterTitle, { color: colors.text, marginTop: 24 }]}>
              City Name
            </Text>
            <View style={styles.cityInputContainer}>
              <TextInput
                style={[
                  styles.cityInput,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder="Enter city name"
                placeholderTextColor={colors.icon}
                value={cityInput}
                onChangeText={setCityInput}
                onSubmitEditing={handleAddCity}
              />
              <TouchableOpacity
                style={[styles.addCityButton, { backgroundColor: colors.tint }]}
                onPress={handleAddCity}>
                <Text style={styles.addCityButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            {tempCities.length > 0 && (
              <View style={styles.selectedCitiesContainer}>
                {tempCities.map((city) => (
                  <View
                    key={city}
                    style={[
                      styles.cityChip,
                      { backgroundColor: isDark ? '#2E2E2E' : '#E0E0E0' },
                    ]}>
                    <Text style={[styles.cityChipText, { color: colors.text }]}>{city}</Text>
                    <TouchableOpacity onPress={() => handleRemoveCity(city)}>
                      <IconSymbol name="xmark.circle.fill" size={16} color={colors.icon} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.filterTitle, { color: colors.text, marginTop: 24 }]}>
              Province
            </Text>
            <View style={styles.provinceContainer}>
              {['ON', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'PE', 'QC', 'SK', 'NT', 'NU', 'YT'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.provinceButton,
                    {
                      backgroundColor: tempProvince === p ? colors.tint : isDark ? '#2E2E2E' : '#F5F5F5',
                      borderColor: colors.tint,
                    },
                  ]}
                  onPress={() => setTempProvince(p as any)}>
                  <Text
                    style={[
                      styles.provinceButtonText,
                      { color: tempProvince === p ? '#FFFFFF' : colors.text },
                    ]}>
                    {p}
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

      {/* Invite Homeowner Modal */}
      <Modal visible={showInviteModal} onClose={() => setShowInviteModal(false)}>
        <View style={styles.inviteModalContainer}>
          <View style={styles.inviteModalHeader}>
            <Text style={[styles.inviteModalTitle, { color: colors.text }]}>
              Invite Homeowner
            </Text>
            <TouchableOpacity
              onPress={() => setShowInviteModal(false)}
              disabled={isInviting}>
              <IconSymbol name="xmark.circle.fill" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>
          <View style={styles.inviteModalContent}>
            <Text style={[styles.inviteModalLabel, { color: colors.text }]}>
              Enter homeowner email address
            </Text>
            <TextInput
              style={[
                styles.inviteModalInput,
                {
                  backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                  color: colors.text,
                },
              ]}
              placeholder="homeowner@example.com"
              placeholderTextColor={colors.icon}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              editable={!isInviting}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Text style={[styles.inviteModalHint, { color: colors.icon }]}>
              An invitation email will be sent with a signup link
            </Text>
          </View>
          <View style={styles.inviteModalActions}>
            <TouchableOpacity
              style={[styles.inviteModalButton, styles.inviteModalButtonCancel]}
              onPress={() => setShowInviteModal(false)}
              disabled={isInviting}>
              <Text style={[styles.inviteModalButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.inviteModalButton,
                styles.inviteModalButtonPrimary,
                { backgroundColor: colors.tint },
                isInviting && styles.inviteModalButtonDisabled,
              ]}
              onPress={handleSendInvitation}
              disabled={isInviting || !inviteEmail.trim()}>
              {isInviting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.inviteModalButtonTextPrimary}>Send Invitation</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Jobs List */}
      <FlatList
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        data={jobs}
        keyExtractor={(item, index) => item.id || `job-${index}`}
        renderItem={({ item: job }) => (
          <TouchableOpacity
            style={[styles.jobCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}
            onPress={() => job.id && handleJobPress(job.id)}
            activeOpacity={0.7}>
            <View style={styles.jobCardHeader}>
              <View style={styles.jobCardTitleContainer}>
                <View style={styles.jobCardTitleRow}>
                  <Text style={[styles.jobCardTitle, { color: colors.text }]} numberOfLines={2}>
                    {job.jobTitle || job.description
                      ? (job.jobTitle || job.description).length > 60
                        ? (job.jobTitle || job.description).substring(0, 60) + '...'
                        : (job.jobTitle || job.description)
                      : 'No title'}
                  </Text>
                  <View style={styles.badgesContainer}>
                    {job.hasInvitation && (
                      <View
                        style={[
                          styles.invitedBadge,
                          { backgroundColor: isDark ? '#1976D2' : '#2196F3' },
                        ]}>
                        <IconSymbol name="envelope.fill" size={12} color="#FFFFFF" />
                        <Text style={styles.invitedBadgeText}>Invited</Text>
                      </View>
                    )}
                    {job.hasContacted && (
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
                </View>
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
            </View>

            <View style={styles.jobCardBody}>
              <View style={styles.categoriesContainer}>
                {job.categories && job.categories.length > 0
                  ? job.categories.slice(0, 3).map((category: string) => (
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
                    ))
                  : null}
                {job.categories && job.categories.length > 3 && (
                  <Text style={[styles.moreCategories, { color: colors.icon }]}>
                    +{job.categories.length - 3}
                  </Text>
                )}
              </View>

              <View style={styles.jobCardFooter}>
                <View style={styles.locationInfo}>
                  <IconSymbol name="location.fill" size={14} color={colors.icon} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.locationText, { color: colors.icon }]}>
                      {getLocationText(job)} {'  '}

                      {job.location?.cityName && job.location?.province && (
                      <Text style={[styles.cityProvinceText, { color: colors.icon }]}>
                        {job.location.cityName}, {job.location.province}
                      </Text>
                    )}
                    </Text>
                    
                  </View>
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
              <Text style={[styles.emptyText, { color: colors.icon }]}>No jobs found</Text>
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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={handleInviteHomeowner}
        activeOpacity={0.8}>
        <IconSymbol name="person.badge.plus.fill" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    
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
    paddingVertical: 16,
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
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  invitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  invitedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  contactedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
  cityProvinceText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
  },
  cityInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  cityInput: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  addCityButton: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCityButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedCitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  provinceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 30,
  },
  provinceButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  provinceButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  inviteModalContainer: {
    padding: 24,
  },
  inviteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  inviteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  inviteModalContent: {
    marginBottom: 24,
  },
  inviteModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  inviteModalInput: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  inviteModalHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  inviteModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  inviteModalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteModalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  inviteModalButtonPrimary: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteModalButtonDisabled: {
    opacity: 0.6,
  },
  inviteModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inviteModalButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
