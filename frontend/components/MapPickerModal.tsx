import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import notification from '@/services/notification';

interface MapPickerModalProps {
  visible: boolean;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  onClose: () => void;
  onLocationSelect: (address: string, latitude: number, longitude: number) => void;
}

export default function MapPickerModal({
  visible,
  initialLatitude,
  initialLongitude,
  onClose,
  onLocationSelect,
}: MapPickerModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLatitude, setSelectedLatitude] = useState<number | null>(initialLatitude || null);
  const [selectedLongitude, setSelectedLongitude] = useState<number | null>(initialLongitude || null);
  const [address, setAddress] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      if (initialLatitude && initialLongitude) {
        setSelectedLatitude(initialLatitude);
        setSelectedLongitude(initialLongitude);
        reverseGeocode(initialLatitude, initialLongitude);
      } else {
        setSearchQuery('');
        setAddress('');
      }
    }
  }, [visible, initialLatitude, initialLongitude]);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        notification.error('Location Services Disabled', 'Please enable location services in your device settings.');
        setLoading(false);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        notification.error('Permission Required', 'Location permission is required.');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setSelectedLatitude(latitude);
      setSelectedLongitude(longitude);

      await reverseGeocode(latitude, longitude);
    } catch (error: any) {
      console.error('Get current location error:', error);
      notification.error('Location Error', 'Failed to get current location');
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      // Check permissions before reverse geocoding
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        // If no permission, just use coordinates
        setAddress(`Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        setSearchQuery('');
        return;
      }

      const addresses = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });

      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        const addressParts = [
          addr.streetNumber,
          addr.street,
          addr.city,
          addr.region,
          addr.postalCode,
        ]
          .filter(Boolean)
          .join(', ');

        setAddress(addressParts || 'Selected Location');
        setSearchQuery(addressParts || '');
      } else {
        setAddress('Selected Location');
        setSearchQuery('');
      }
    } catch (error: any) {
      console.warn('Reverse geocoding failed:', error);
      // Fallback to coordinates if geocoding fails
      setAddress(`Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      setSearchQuery('');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);

      // Check and request location permissions for geocoding
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        notification.error(
          'Permission Required',
          'Location permission is required to search for addresses. Please enable it in your device settings.'
        );
        setLoading(false);
        return;
      }

      const results = await Location.geocodeAsync(searchQuery);
      
      if (results && results.length > 0) {
        const { latitude, longitude } = results[0];
        setSelectedLatitude(latitude);
        setSelectedLongitude(longitude);

        // Add to recent searches
        if (!recentSearches.includes(searchQuery)) {
          setRecentSearches((prev) => [searchQuery, ...prev.slice(0, 4)]);
        }

        await reverseGeocode(latitude, longitude);
        notification.success('Location Found', 'Location has been set');
      } else {
        notification.error('Not Found', 'Could not find the location. Please try a different search.');
      }
    } catch (error: any) {
      console.error('Geocoding error:', error);
      if (error.message?.includes('Not authorized') || error.message?.includes('permission')) {
        notification.error(
          'Permission Required',
          'Location permission is required. Please enable it in your device settings.'
        );
      } else {
        notification.error('Search Error', error.message || 'Failed to search location');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecentSearch = (search: string) => {
    setSearchQuery(search);
    handleSearch();
  };

  const handleConfirm = () => {
    if (selectedLatitude && selectedLongitude) {
      onLocationSelect(address || 'Selected Location', selectedLatitude, selectedLongitude);
      onClose();
    } else {
      notification.error('No Location', 'Please search for a location or use current location');
    }
  };

  const isDark = colorScheme === 'dark';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
            <Text style={[styles.closeText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Pick Location</Text>
          <TouchableOpacity
            onPress={handleConfirm}
            style={[styles.confirmButton, { backgroundColor: colors.tint }]}
            disabled={!selectedLatitude || !selectedLongitude}>
            <Text style={styles.confirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.searchInputContainer, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
              <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search for an address..."
                placeholderTextColor={colors.icon}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <IconSymbol name="xmark.circle.fill" size={20} color={colors.icon} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={handleSearch}
              style={[styles.searchButton, { backgroundColor: colors.tint }]}
              disabled={loading || !searchQuery.trim()}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Current Location Button */}
          <TouchableOpacity
            onPress={getCurrentLocation}
            style={[styles.currentLocationButton, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: colors.tint }]}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <>
                <IconSymbol name="location.fill" size={20} color={colors.tint} />
                <Text style={[styles.currentLocationText, { color: colors.tint }]}>Use Current Location</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSearchesContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Searches</Text>
              {recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleRecentSearch(search)}
                  style={[styles.recentSearchItem, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
                  <IconSymbol name="clock.fill" size={16} color={colors.icon} />
                  <Text style={[styles.recentSearchText, { color: colors.text }]}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Selected Location Info */}
          {selectedLatitude && selectedLongitude && (
            <View style={[styles.locationInfoContainer, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
              <View style={styles.locationInfoHeader}>
                <IconSymbol name="checkmark.circle.fill" size={24} color={colors.tint} />
                <Text style={[styles.locationInfoTitle, { color: colors.text }]}>Selected Location</Text>
              </View>
              {address && (
                <View style={styles.locationInfoRow}>
                  <IconSymbol name="location.fill" size={16} color={colors.icon} />
                  <Text style={[styles.locationInfoText, { color: colors.text }]}>{address}</Text>
                </View>
              )}
              <View style={styles.locationInfoRow}>
                <IconSymbol name="mappin" size={16} color={colors.icon} />
                <Text style={[styles.locationInfoText, { color: colors.icon }]}>
                  {selectedLatitude.toFixed(6)}, {selectedLongitude.toFixed(6)}
                </Text>
              </View>
            </View>
          )}

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={[styles.instructionsText, { color: colors.icon }]}>
              Search for an address or use your current location to set the job location.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  closeText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  currentLocationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  recentSearchesContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  recentSearchText: {
    flex: 1,
    fontSize: 14,
  },
  locationInfoContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  locationInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationInfoText: {
    flex: 1,
    fontSize: 14,
  },
  instructionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  instructionsText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
