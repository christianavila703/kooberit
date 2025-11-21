import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import notification from '@/services/notification';
import MapPickerModal from './MapPickerModal';

interface LocationPickerProps {
  address: string;
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (address: string, latitude: number, longitude: number) => void;
}

export default function LocationPicker({
  address,
  latitude,
  longitude,
  onLocationChange,
}: LocationPickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionGranted(status === 'granted');
    } catch (error: any) {
      console.error('Error checking location permission:', error);
      setPermissionGranted(false);
    }
  };

  const requestPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionGranted(status === 'granted');
      return status === 'granted';
    } catch (error: any) {
      console.error('Error requesting location permission:', error);
      notification.error('Permission Error', 'Failed to request location permission');
      return false;
    }
  };

  const getCurrentLocation = async () => {
    try {
      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        notification.error(
          'Location Services Disabled',
          'Please enable location services in your device settings.'
        );
        return;
      }

      // Request permission
      const hasPermission = permissionGranted || (await requestPermission());
      if (!hasPermission) {
        notification.error(
          'Permission Required',
          'Location permission is required to use this feature. Please enable it in your device settings.'
        );
        return;
      }

      setLoading(true);

      // Get current position with timeout
      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Location request timed out')), 35000)
        ),
      ]);

      const { latitude: lat, longitude: lng } = location.coords;

      // Validate coordinates
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
        throw new Error('Invalid location coordinates received');
      }

      // Reverse geocode to get address
      let fullAddress = 'Current Location';
      try {
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

          fullAddress = addressParts || 'Current Location';
        }
      } catch (geocodeError: any) {
        console.warn('Reverse geocoding failed:', geocodeError);
        // Continue with default address if geocoding fails
      }

      onLocationChange(fullAddress, lat, lng);
      notification.success('Location Updated', 'Your location has been set successfully');
    } catch (error: any) {
      console.error('Get current location error:', error);
      const errorMessage =
        error.message || 'Failed to get location. Please try again or select a location on the map.';
      notification.error('Location Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openMapPicker = () => {
    setMapPickerVisible(true);
  };

  const handleMapLocationSelect = (selectedAddress: string, selectedLat: number, selectedLng: number) => {
    onLocationChange(selectedAddress, selectedLat, selectedLng);
    notification.success('Location Updated', 'Your location has been set successfully');
  };

  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      <View style={[styles.mapPlaceholder, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
        {latitude && longitude ? (
          <View style={styles.locationInfo}>
            <IconSymbol name="checkmark.circle.fill" size={32} color={colors.tint} />
            <Text style={[styles.locationText, { color: colors.text }]}>
              Location Set
            </Text>
            <Text style={[styles.addressText, { color: colors.icon }]} numberOfLines={2}>
              {address}
            </Text>
            <Text style={[styles.coordsText, { color: colors.icon }]}>
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </Text>
          </View>
        ) : (
          <View style={styles.placeholderContent}>
            <IconSymbol name="map" size={32} color={colors.icon} />
            <Text style={[styles.placeholderText, { color: colors.icon }]}>
              No location selected
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={getCurrentLocation}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <IconSymbol name="location.fill" size={16} color="#FFFFFF" />
              <Text style={styles.buttonText}>Use Current Location</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonSecondary,
            { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5', borderColor: colors.tint },
          ]}
          onPress={openMapPicker}
          disabled={loading}>
          <IconSymbol name="map.fill" size={16} color={colors.tint} />
          <Text style={[styles.buttonTextSecondary, { color: colors.tint }]}>
            Pick on Map
          </Text>
        </TouchableOpacity>
      </View>

      {/* Map Picker Modal */}
      <MapPickerModal
        visible={mapPickerVisible}
        initialLatitude={latitude}
        initialLongitude={longitude}
        onClose={() => setMapPickerVisible(false)}
        onLocationSelect={handleMapLocationSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  mapPlaceholder: {
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeholderContent: {
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    textAlign: 'center',
  },
  locationInfo: {
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  coordsText: {
    fontSize: 11,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonSecondary: {
    borderWidth: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
  },
});

