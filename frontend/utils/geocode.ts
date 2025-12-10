import * as Location from 'expo-location';

export interface AddressFields {
  streetNumber?: string;
  streetName?: string;
  unitNumber?: string;
  cityName: string;
  areaCode?: string;
  province: string;
}

/**
 * Build a full address string from individual address fields
 */
export function buildAddressString(fields: AddressFields): string {
  const parts: string[] = [];
  
  if (fields.streetNumber) parts.push(fields.streetNumber);
  if (fields.streetName) parts.push(fields.streetName);
  if (fields.unitNumber) parts.push(`Unit ${fields.unitNumber}`);
  if (fields.cityName) parts.push(fields.cityName);
  if (fields.province) parts.push(fields.province);
  if (fields.areaCode) parts.push(fields.areaCode);
  
  return parts.join(', ');
}

/**
 * Geocode an address from individual fields to get coordinates
 */
export async function geocodeAddress(fields: AddressFields): Promise<{
  latitude: number;
  longitude: number;
  address: string;
} | null> {
  try {
    // Build address string for geocoding
    const addressString = buildAddressString(fields);
    
    if (!addressString || addressString.trim().length === 0) {
      return null;
    }

    // Request location permissions (required for geocoding on some platforms)
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Location permission is required to geocode addresses. Please enable location permissions in your device settings.');
    }

    // Geocode the address
    const results = await Location.geocodeAsync(addressString);
    
    if (!results || results.length === 0) {
      return null;
    }

    const firstResult = results[0];
    const latitude = firstResult.latitude;
    const longitude = firstResult.longitude;

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude)) {
      return null;
    }

    // Build formatted address from geocoded result
    // Note: geocodeAsync result structure may vary by platform
    const addressParts: string[] = [];
    
    // Try to build address from available properties
    if ((firstResult as any).streetNumber) addressParts.push((firstResult as any).streetNumber);
    if ((firstResult as any).street) addressParts.push((firstResult as any).street);
    if ((firstResult as any).city) addressParts.push((firstResult as any).city);
    if ((firstResult as any).region) addressParts.push((firstResult as any).region);
    if ((firstResult as any).postalCode) addressParts.push((firstResult as any).postalCode);
    
    const geocodedAddress = addressParts.length > 0 
      ? addressParts.join(', ')
      : addressString;

    return {
      latitude,
      longitude,
      address: geocodedAddress,
    };
  } catch (error: any) {
    console.error('Geocoding error:', error);
    // Re-throw with a more user-friendly message
    if (error.message) {
      throw new Error(error.message);
    }
    throw new Error('Failed to geocode address. Please check your address fields and try again.');
  }
}

