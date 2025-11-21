import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import contractorService from '@/services/contractor';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notificationService from '@/services/notification';
import { IconSymbol } from '@/components/ui/icon-symbol';

const CONSTRUCTION_CATEGORIES = [
  'roof',
  'eavestrough',
  'sofit',
  'siding',
  'brickwork',
  'windows',
  'doors',
  'foundation',
  'exterior stairs',
  'attic',
  'ceiling',
  'interior stairs',
  'interior walls',
  'bedroom',
  'living room',
  'kitchen',
  'washroom',
  'basement',
  'plumbing',
  'heating',
  'cooling',
  'electrical',
];

export default function ContractorDashboard() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [jobPosts, setJobPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(50);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadSettings();
    loadJobPosts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== '') {
        loadJobPosts();
      } else {
        loadJobPosts();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadSettings = async () => {
    try {
      const settings = await contractorService.getSettings();
      setNotificationEnabled(settings.notificationEnabled ?? true);
      if (settings.notificationRadius) {
        setRadius(settings.notificationRadius);
      }
    } catch (error: any) {
      // Silently fail
    }
  };

  const loadJobPosts = async () => {
    setIsLoading(true);
    try {
      const posts = await contractorService.getJobBoard({
        radius,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        search: searchQuery || undefined,
      });
      setJobPosts(posts);
    } catch (error: any) {
      notificationService.error('Error', error || 'Failed to load job posts');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobPosts();
    setRefreshing(false);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationEnabled(value);
    try {
      await contractorService.updateSettings({ notificationEnabled: value });
      notificationService.success('Success', `Notifications ${value ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      notificationService.error('Error', 'Failed to update notification settings');
      setNotificationEnabled(!value); // Revert on error
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
            value={notificationEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: '#767577', true: colors.tint }}
            thumbColor="#FFFFFF"
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

      {/* Filters */}
      {showFilters && (
        <View style={[styles.filtersCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <Text style={[styles.filterTitle, { color: colors.text }]}>Radius (km)</Text>
          <View style={styles.radiusContainer}>
            <TouchableOpacity
              style={[
                styles.radiusButton,
                radius === 25 && { backgroundColor: colors.tint },
                { borderColor: colors.tint },
              ]}
              onPress={() => {
                setRadius(25);
                loadJobPosts();
              }}>
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
              onPress={() => {
                setRadius(50);
                loadJobPosts();
              }}>
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
              onPress={() => {
                setRadius(100);
                loadJobPosts();
              }}>
              <Text
                style={[
                  styles.radiusButtonText,
                  { color: radius === 100 ? '#FFFFFF' : colors.text },
                ]}>
                100 km
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.filterTitle, { color: colors.text, marginTop: 16 }]}>
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
                onPress={() => {
                  toggleCategory(category);
                  setTimeout(() => loadJobPosts(), 100);
                }}>
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
        </View>
      )}

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
            <Text style={[styles.emptyText, { color: colors.icon }]}>No job posts found</Text>
            <Text style={[styles.emptySubtext, { color: colors.icon }]}>
              Try adjusting your filters or radius
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
                <Text style={[styles.jobCardTitle, { color: colors.text }]} numberOfLines={2}>
                  {jobPost.description.substring(0, 80)}
                  {jobPost.description.length > 80 ? '...' : ''}
                </Text>
              </View>

              <View style={styles.jobCardBody}>
                <View style={styles.categoriesContainer}>
                  {jobPost.categories.slice(0, 3).map((category: string, index: number) => (
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
          ))
        )}
      </ScrollView>
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
  filtersCard: {
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
  jobCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
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

