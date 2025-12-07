export function arraysEqual(a: any[], b: any[]): boolean {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
  
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
  
    for (let i = 0; i < sortedA.length; i++) {
      if (sortedA[i] !== sortedB[i]) return false;
    }
  
    return true;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance as "Within X km" rounded to nearest 25km increment
 * Examples: 12 km -> "Within 25 km", 27 km -> "Within 50 km", 120 km -> "Within 125 km"
 */
export function formatDistance(distanceKm: number): string {
  // Round to nearest 25km increment, but minimum 25km
  const rounded = Math.max(25, Math.round(distanceKm / 25) * 25);
  return `Within ${rounded} km`;
}