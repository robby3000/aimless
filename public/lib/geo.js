// Spherical geometry. Pure, no DOM. See docs/roadmap.md W2.

export const EARTH_R = 6371000;

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

/** Great-circle distance in metres. */
export function haversine(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const la1 = rad(a.lat);
  const la2 = rad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, degrees clockwise from north, 0-360. */
export function bearing(a, b) {
  const la1 = rad(a.lat);
  const la2 = rad(b.lat);
  const dLng = rad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** Point reached by travelling distM metres along bearingDeg from origin. */
export function destination(origin, bearingDeg, distM) {
  const d = distM / EARTH_R;
  const br = rad(bearingDeg);
  const la1 = rad(origin.lat);
  const lo1 = rad(origin.lng);
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(br));
  const lo2 =
    lo1 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  return { lat: deg(la2), lng: ((deg(lo2) + 540) % 360) - 180 };
}

/** Smallest signed angle from a to b, in [-180, 180]. */
export function angleDelta(a, b) {
  return ((((b - a) % 360) + 540) % 360) - 180;
}

/**
 * Advance a cumulative rotation toward a target angle by the shortest path.
 * A CSS rotation fed raw 0-360 bearings spins a full turn backwards whenever
 * the target crosses straight-up (359 -> 0); accumulating the delta instead
 * keeps the arrow sweeping smoothly through the wrap.
 */
export function nextRotation(current, target) {
  const c = (((current % 360) + 360) % 360);
  return current + angleDelta(c, target);
}

/** Perpendicular distance from p to segment ab, in metres (planar approx - fine at these scales). */
function perpDistance(p, a, b) {
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(rad(p.lat));
  const px = (p.lng - a.lng) * mPerDegLng;
  const py = (p.lat - a.lat) * mPerDegLat;
  const bx = (b.lng - a.lng) * mPerDegLng;
  const by = (b.lat - a.lat) * mPerDegLat;
  const len2 = bx * bx + by * by;
  if (len2 === 0) return Math.hypot(px, py);
  let t = (px * bx + py * by) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - t * bx, py - t * by);
}

/** Ramer-Douglas-Peucker. Always preserves the first and last point. */
export function simplify(points, toleranceM = 8) {
  if (points.length <= 2) return points.slice();
  let maxD = 0;
  let idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD <= toleranceM) return [points[0], points[points.length - 1]];
  const left = simplify(points.slice(0, idx + 1), toleranceM);
  const right = simplify(points.slice(idx), toleranceM);
  return left.slice(0, -1).concat(right);
}

/** Total length of a polyline in metres. */
export function pathLength(points) {
  let t = 0;
  for (let i = 1; i < points.length; i++) t += haversine(points[i - 1], points[i]);
  return t;
}

/** Bounding box of a set of points. */
export function bounds(points) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

/** Human-readable distance. */
export function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km`;
}

/** Compass point for a bearing. */
export function compassPoint(deg) {
  const pts = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return pts[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

/**
 * Compass heading (degrees clockwise from north) from a DeviceOrientationEvent
 * alpha. Spec alpha is rotation about Z measured counter-clockwise from north,
 * relative to the device's native orientation - so it must be negated, and
 * corrected by the screen rotation angle when the phone is not held upright.
 * Not for iOS webkitCompassHeading, which is already clockwise and
 * screen-relative.
 */
export function headingFromAlpha(alpha, screenAngle = 0) {
  return (((360 - alpha + screenAngle) % 360) + 360) % 360;
}
