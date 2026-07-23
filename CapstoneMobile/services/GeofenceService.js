/**
 * GeofenceService.js
 * Provides GPS-based smart check-in for attendance.
 * Uses the hardcoded community coordinates to find the nearest branch
 * and checks if the user is within range.
 */
import * as Location from "expo-location";
import COMMUNITY_COORDINATES from "../data/communityCoordinates";

const CHECK_IN_RADIUS_METERS = 200; // 200m radius for auto check-in

/**
 * Haversine formula — returns distance in meters between two coordinates.
 */
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Get the user's current location.
 * Requests permission if not already granted.
 */
export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission not granted");
  }
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

/**
 * Find the nearest branch to a given location.
 * Returns { name, distance (meters), coords } or null if no branches found.
 */
export function getNearestBranch(userLat, userLon) {
  let nearest = null;
  let minDist = Infinity;

  for (const [name, coords] of Object.entries(COMMUNITY_COORDINATES)) {
    const dist = haversineMeters(userLat, userLon, coords.latitude, coords.longitude);
    if (dist < minDist) {
      minDist = dist;
      nearest = { name, distance: dist, coords };
    }
  }

  return nearest;
}

/**
 * Check if a distance is within the auto check-in radius.
 */
export function isWithinRange(distanceMeters) {
  return distanceMeters <= CHECK_IN_RADIUS_METERS;
}

/**
 * Format distance for display.
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m away`;
  }
  return `${(meters / 1000).toFixed(1)}km away`;
}

export const GEOFENCE_RADIUS = CHECK_IN_RADIUS_METERS;
