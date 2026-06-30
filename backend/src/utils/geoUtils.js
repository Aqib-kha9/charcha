/**
 * Geo Utilities
 * ─────────────────────────────────────────────────────────
 * Powers hyperlocal intelligence (doc §5.1.4) and duplicate detection
 * (doc §5.1.10 — 50m radius check).
 */

/**
 * Haversine distance between two coordinates in meters.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in meters
 */
export const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Build a MongoDB $geoWithin query for a radius around a point.
 * Used for duplicate detection and nearby-issue queries.
 *
 * @param {number} longitude
 * @param {number} latitude
 * @param {number} radiusMeters
 * @returns {object} MongoDB geo query fragment
 */
export const buildGeoQuery = (longitude, latitude, radiusMeters) => ({
  location: {
    $near: {
      $geometry: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      $maxDistance: radiusMeters,
    },
  },
});

/**
 * Reverse-geocode-ish area name resolver (mock).
 * In production this would call a geocoding API (Google / OSM).
 * For the hackathon we infer the area from coordinates near Lucknow.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {string} area name
 */
export const resolveAreaName = (latitude, longitude) => {
  // Lucknow reference points (lat, lon) → area name.
  const lucknowAreas = [
    { name: 'Hazratganj', lat: 26.8567, lon: 80.9465 },
    { name: 'Gomti Nagar', lat: 26.8512, lon: 81.0014 },
    { name: 'Indira Nagar', lat: 26.8756, lon: 81.0143 },
    { name: 'Alambagh', lat: 26.8300, lon: 80.9000 },
    { name: 'Chowk', lat: 26.8550, lon: 80.9300 },
    { name: 'Aminabad', lat: 26.8540, lon: 80.9350 },
  ];

  let nearest = lucknowAreas[0];
  let minDist = Infinity;

  for (const area of lucknowAreas) {
    const dist = haversineDistance(latitude, longitude, area.lat, area.lon);
    if (dist < minDist) {
      minDist = dist;
      nearest = area;
    }
  }

  // If within ~3km of a known area, use its name; else generic.
  if (minDist <= 3000) return nearest.name;
  return 'Lucknow';
};

/**
 * GPS Spoofing Detection (doc edge case: "Malicious Mass Reporting &
 * GPS Spoofing").
 * ─────────────────────────────────────────────────────────
 * Detects suspicious location data that may indicate GPS spoofing:
 *  1. "Null Island" — coordinates exactly (0, 0) or suspiciously null.
 *  2. Out-of-bounds — coordinates outside a sane geographic range
 *     (default: India bounding box, but configurable).
 *  3. Impossible travel — the user's new report is too far from their
 *     last report to have been reached in the elapsed time (assumes a
 *     max realistic ground speed, e.g. 120 km/h).
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {object} [lastReport] - { latitude, longitude, createdAt }
 * @returns {{ isSpoofed: boolean, reason: string|null }}
 */
export const detectGpsSpoofing = (latitude, longitude, lastReport = null) => {
  // 1. Null Island / null coordinates.
  if (
    latitude == null ||
    longitude == null ||
    (latitude === 0 && longitude === 0)
  ) {
    return { isSpoofed: true, reason: 'Invalid or null GPS coordinates' };
  }

  // 2. Geographic sanity bounds (default: India bounding box).
  const INDIA_BOUNDS = {
    minLat: 6.0,
    maxLat: 37.0,
    minLng: 68.0,
    maxLng: 97.0,
  };
  if (
    latitude < INDIA_BOUNDS.minLat ||
    latitude > INDIA_BOUNDS.maxLat ||
    longitude < INDIA_BOUNDS.minLng ||
    longitude > INDIA_BOUNDS.maxLng
  ) {
    return {
      isSpoofed: true,
      reason: 'GPS coordinates outside the service region',
    };
  }

  // 3. Impossible-travel check against the user's last report.
  if (lastReport && lastReport.latitude != null && lastReport.longitude != null) {
    const distanceMeters = haversineDistance(
      latitude,
      longitude,
      lastReport.latitude,
      lastReport.longitude
    );

    const elapsedMs =
      Date.now() - new Date(lastReport.createdAt).getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    // Only flag if enough time has passed to make travel meaningful
    // (skip the check for same-session rapid reports under 1 minute).
    if (elapsedHours >= 1 / 60) {
      const distanceKm = distanceMeters / 1000;
      // Realistic max ground speed: 120 km/h (road/rail, not flight).
      const MAX_SPEED_KMH = 120;
      const maxPossibleKm = MAX_SPEED_KMH * elapsedHours;

      if (distanceKm > maxPossibleKm) {
        return {
          isSpoofed: true,
          reason: `Impossible travel: ${distanceKm.toFixed(
            1
          )}km in ${elapsedHours.toFixed(2)}h exceeds realistic speed`,
        };
      }
    }
  }

  return { isSpoofed: false, reason: null };
};

export default {
  haversineDistance,
  buildGeoQuery,
  resolveAreaName,
  detectGpsSpoofing,
};
