import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser, setUser } from '@/store/slices/authSlice';
import {
  fetchProfileSettings,
  updateProfileSettings,
} from '@/store/slices/profileSlice';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import notification from '@/services/notification';
import LocationPicker from '@/components/LocationPicker';
import { CONSTRUCTION_CATEGORIES } from '@/constants/config';
import { IRootState } from '@/store';

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state: IRootState) => state.auth);
  const { settings: profileSettings, isSaving } = useAppSelector((state: IRootState) => state.profile);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isContractor = user?.role === 'contractor';

  // Local form state for editing (synced with Redux on load)
  const [phone, setPhone] = useState('');
  const [contractorAddress, setContractorAddress] = useState('');
  const [contractorLatitude, setContractorLatitude] = useState<number | null>(null);
  const [contractorLongitude, setContractorLongitude] = useState<number | null>(null);
  const [constructionCategories, setConstructionCategories] = useState<string[]>([]);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notificationRadius, setNotificationRadius] = useState(50);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Load settings from Redux on mount and sync local form state
  useEffect(() => {
    dispatch(fetchProfileSettings());
  }, [dispatch]);

  // Sync local form state with Redux state when settings are loaded/updated
  useEffect(() => {
    if (profileSettings) {
      // Set phone number directly
      if (profileSettings.phone) {
        setPhone(profileSettings.phone);
      } else {
        setPhone('');
      }
      setNotificationEnabled(profileSettings.notificationEnabled);
      if (isContractor) {
        setNotificationRadius(profileSettings.notificationRadius ?? 50);
        setConstructionCategories(profileSettings.constructionCategories || []);
        if (profileSettings.contractorAddress) {
          setContractorAddress(profileSettings.contractorAddress.address);
          setContractorLatitude(profileSettings.contractorAddress.coordinates.latitude);
          setContractorLongitude(profileSettings.contractorAddress.coordinates.longitude);
        } else {
          // Reset if no address in settings
          setContractorAddress('');
          setContractorLatitude(null);
          setContractorLongitude(null);
        }
      }
    }
  }, [profileSettings, isContractor]);

  const toggleCategory = (category: string) => {
    setConstructionCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const saveProfile = async () => {
    if (isContractor && (!contractorLatitude || !contractorLongitude)) {
      notification.error('Error', 'Please set your contractor address');
      return;
    }

    try {
      const updateData: any = {
        notificationEnabled,
      };
      
      // Only update phone if we're editing the profile (phone input is visible)
      // This prevents breaking the phone when saving from "Save Settings" button
      if (isEditingProfile) {
        // Use phone value directly from text input
        // Trim whitespace and set to null if empty
        const phoneValue = phone.trim() || null;
        updateData.phone = phoneValue;
      }
      // If not editing profile, don't include phone in update - backend will preserve existing value
      
      if (isContractor) {
        updateData.contractorAddress = {
          address: contractorAddress,
          coordinates: {
            latitude: contractorLatitude,
            longitude: contractorLongitude,
          },
        };
        updateData.constructionCategories = constructionCategories;
        updateData.notificationRadius = notificationRadius;
      }
      
      const updatedSettings = await dispatch(updateProfileSettings(updateData)).unwrap();
      
      // Update user object in auth state with new phone number if it was updated
      if (updateData.phone !== undefined && user) {
        dispatch(setUser({
          ...user,
          phone: updateData.phone,
        }));
      }
      
      notification.success('Success', 'Profile updated successfully');
      setIsEditingProfile(false);
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to update profile');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await dispatch(logoutUser()).unwrap();
            router.replace('/(auth)/sign-in' as any);
          } catch (error: any) {
            // Handle error
          }
        },
      },
    ]);
  };

  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Info */}
        <View style={[styles.profileCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
          <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0] || 'U'}
              {user?.lastName?.[0] || ''}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={[styles.email, { color: colors.icon }]}>{user?.email}</Text>
          {(profileSettings?.phone || user?.phone) && (
            <Text style={[styles.phone, { color: colors.icon }]}>
              {profileSettings?.phone || user?.phone}
            </Text>
          )}
          <View style={[styles.roleBadge, { backgroundColor: colors.tint + '20' }]}>
            <Text style={[styles.roleText, { color: colors.tint }]}>
              {user?.role?.toUpperCase() || 'USER'}
            </Text>
          </View>
        </View>

        {/* Edit Profile Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile Information</Text>

          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}
            onPress={() => setIsEditingProfile(!isEditingProfile)}>
            <View style={styles.settingLeft}>
              <IconSymbol name="person.fill" size={20} color={colors.icon} />
              <Text style={[styles.settingText, { color: colors.text }]}>
                {isEditingProfile ? 'Cancel Editing' : 'Edit Profile'}
              </Text>
            </View>
            <IconSymbol 
              name={isEditingProfile ? "chevron.up" : "chevron.down"} 
              size={20} 
              color={colors.icon} 
            />
          </TouchableOpacity>

          {isEditingProfile && (
            <View style={[styles.editProfileCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
              <View style={styles.editField}>
                <Text style={[styles.editLabel, { color: colors.text }]}>Phone Number</Text>
                <TextInput
                  style={[
                    styles.editInput,
                    {
                      backgroundColor: isDark ? '#2E2E2E' : '#F5F5F5',
                      color: colors.text,
                    },
                  ]}
                  placeholder="Enter phone number (e.g., +1234567890)"
                  placeholderTextColor={colors.icon}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!isSaving}
                />
              </View>

              {isContractor && (
                <>
                  <View style={styles.editField}>
                    <Text style={[styles.editLabel, { color: colors.text }]}>
                      Construction Categories
                    </Text>
                    <Text style={[styles.editDescription, { color: colors.icon }]}>
                      Select all categories you work in
                    </Text>
                    <View style={styles.categoriesGrid}>
                      {CONSTRUCTION_CATEGORIES.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.categoryChip,
                            {
                              backgroundColor: constructionCategories.includes(category)
                                ? colors.tint
                                : isDark
                                ? '#2E2E2E'
                                : '#F5F5F5',
                            },
                          ]}
                          onPress={() => toggleCategory(category)}
                          disabled={isSaving}>
                          <Text
                            style={[
                              styles.categoryText,
                              {
                                color: constructionCategories.includes(category)
                                  ? '#FFFFFF'
                                  : colors.text,
                              },
                            ]}>
                            {category}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.saveProfileButton, { backgroundColor: colors.tint }]}
                onPress={saveProfile}
                disabled={isSaving}>
                <Text style={styles.saveProfileButtonText}>
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Contractor Settings */}
        {isContractor && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Contractor Settings</Text>

            <View style={[styles.settingCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Contractor Address</Text>
              <Text style={[styles.settingDescription, { color: colors.icon }]}>
                Used for radius filtering of job posts
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#2E2E2E' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder="Enter your business address"
                placeholderTextColor={colors.icon}
                value={contractorAddress}
                onChangeText={setContractorAddress}
                editable={!isSaving}
              />
              <LocationPicker
                address={contractorAddress}
                latitude={contractorLatitude}
                longitude={contractorLongitude}
                onLocationChange={(addr, lat, lng) => {
                  setContractorAddress(addr);
                  setContractorLatitude(lat);
                  setContractorLongitude(lng);
                }}
              />
            </View>

            <View style={[styles.settingCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Job Notifications
                  </Text>
                  <Text style={[styles.settingDescription, { color: colors.icon }]}>
                    Receive notifications for new job posts
                  </Text>
                </View>
                <Switch
                  value={notificationEnabled}
                  onValueChange={setNotificationEnabled}
                  trackColor={{ false: '#767577', true: colors.tint }}
                  thumbColor="#FFFFFF"
                  disabled={isSaving}
                />
              </View>
            </View>

            <View style={[styles.settingCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Notification Radius</Text>
              <Text style={[styles.settingDescription, { color: colors.icon }]}>
                Distance in kilometers for job notifications
              </Text>
              <View style={styles.radiusButtons}>
                {[25, 50, 100].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.radiusButton,
                      notificationRadius === r && { backgroundColor: colors.tint },
                      { borderColor: colors.tint },
                    ]}
                    onPress={() => setNotificationRadius(r)}
                    disabled={isSaving}>
                    <Text
                      style={[
                        styles.radiusButtonText,
                        { color: notificationRadius === r ? '#FFFFFF' : colors.text },
                      ]}>
                      {r} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.tint }]}
              onPress={saveProfile}
              disabled={isSaving}>
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>


          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}
            onPress={() => {
              Alert.alert('Coming Soon', 'Change password feature will be available soon');
            }}>
            <View style={styles.settingLeft}>
              <IconSymbol name="lock.fill" size={20} color={colors.icon} />
              <Text style={[styles.settingText, { color: colors.text }]}>Change Password</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.icon} />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>

          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}
            onPress={() => {
              Alert.alert('Terms & Conditions', 'Terms and conditions will be available soon');
            }}>
            <View style={styles.settingLeft}>
              <IconSymbol name="doc.text.fill" size={20} color={colors.icon} />
              <Text style={[styles.settingText, { color: colors.text }]}>Terms & Conditions</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.icon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}
            onPress={() => {
              Alert.alert('Privacy Policy', 'Privacy policy will be available soon');
            }}>
            <View style={styles.settingLeft}>
              <IconSymbol name="hand.raised.fill" size={20} color={colors.icon} />
              <Text style={[styles.settingText, { color: colors.text }]}>Privacy Policy</Text>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.icon} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: '#FF3B30' }]}
          onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
  },
  logoutButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  settingCard: {
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginTop: 8,
  },
  radiusButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  radiusButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  radiusButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editProfileCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editField: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  editDescription: {
    fontSize: 13,
    marginBottom: 12,
  },
  editInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  saveProfileButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

