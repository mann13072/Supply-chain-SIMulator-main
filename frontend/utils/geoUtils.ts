const R_EARTH_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance between two lat/lng points in km */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R_EARTH_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Minimum distance (km) from a point P to the great-circle arc A→B.
 * Uses cross-track distance formula.
 * If the closest point on the great circle is outside the arc, returns
 * the minimum of dist(P,A) and dist(P,B).
 */
export function pointToArcDistanceKm(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number
): number {
  const dAP = haversineKm(aLat, aLng, pLat, pLng) / R_EARTH_KM; // angular distance A→P
  const dAB = haversineKm(aLat, aLng, bLat, bLng) / R_EARTH_KM; // angular distance A→B

  if (dAB < 1e-10) {
    // A and B are the same point
    return haversineKm(aLat, aLng, pLat, pLng);
  }

  const bearingAP = bearing(aLat, aLng, pLat, pLng);
  const bearingAB = bearing(aLat, aLng, bLat, bLng);

  // Cross-track distance (signed)
  const dXt = Math.asin(Math.sin(dAP) * Math.sin(bearingAP - bearingAB));

  // Along-track distance from A to the closest point on the great circle
  const dAt = Math.acos(Math.cos(dAP) / Math.cos(dXt));

  // Check if the closest point falls within the arc A→B
  if (dAt >= 0 && dAt <= dAB) {
    return Math.abs(dXt) * R_EARTH_KM;
  }

  // Otherwise, return the min distance to either endpoint
  return Math.min(
    haversineKm(aLat, aLng, pLat, pLng),
    haversineKm(bLat, bLng, pLat, pLng)
  );
}

/** Initial bearing from point A to point B in radians */
function bearing(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLambda = toRad(lng2 - lng1);
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return Math.atan2(y, x);
}

/** Check if a point is within the blast radius of an event location */
export function isWithinBlastRadius(
  eventLat: number, eventLng: number, blastRadiusKm: number,
  pointLat: number, pointLng: number
): boolean {
  return haversineKm(eventLat, eventLng, pointLat, pointLng) <= blastRadiusKm;
}
