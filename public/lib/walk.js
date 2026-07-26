// Walk generation. A chain, not a scatter - see docs/blueprint.md section 5.
// Pure: no DOM, no storage, no clock.

import { destination, bearing, haversine } from './geo.js';
import { makeRng } from './rng.js';

export const PACE_M_PER_MIN = 75;   // 4.5 km/h
export const DWELL_MIN = 1.5;       // 90s standing at each stop
export const DETOUR = 1.35;         // streets are not straight lines
export const MIN_LEG = 150;
export const MAX_LEG = 1200;
export const MIN_TURN = 40;         // straighter than this is boring
export const MAX_TURN = 150;        // sharper than this is a backtrack

/**
 * Straight-line leg length for a time budget, corrected for real streets.
 * Returns { legStraight, minLeg, maxLeg, clamped }.
 */
export function legLength(stops, budgetMin) {
  const walkingMin = Math.max(1, budgetMin - stops * DWELL_MIN);
  const totalWalked = PACE_M_PER_MIN * walkingMin;
  let legStraight = totalWalked / stops / DETOUR;
  let clamped = null;
  if (legStraight < MIN_LEG) {
    legStraight = MIN_LEG;
    clamped = 'short';
  } else if (legStraight > MAX_LEG) {
    legStraight = MAX_LEG;
    clamped = 'long';
  }
  return {
    legStraight,
    minLeg: legStraight * 0.6,
    maxLeg: legStraight * 1.4,
    clamped,
  };
}

/**
 * Plan a walk: a chain of stops, each a random bearing and distance from the
 * previous one, with the final leg biased back toward the origin.
 */
export function planWalk({ origin, stops = 5, budgetMin = 45, seed }) {
  if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') {
    throw new Error('planWalk needs an origin {lat, lng}');
  }
  if (stops < 1) throw new Error('planWalk needs at least one stop');

  const rng = makeRng(seed);
  const { legStraight, minLeg, maxLeg, clamped } = legLength(stops, budgetMin);

  let cur = origin;
  let heading = rng.range(0, 360);
  const out = [];

  for (let i = 0; i < stops; i++) {
    let dist;
    if (i === stops - 1 && stops > 1) {
      // Last leg heads roughly home so you finish near where you started.
      heading = (bearing(cur, origin) + rng.range(-40, 40) + 360) % 360;
      dist = Math.min(maxLeg, Math.max(minLeg, haversine(cur, origin)));
    } else {
      const turn = rng.sign() * rng.range(MIN_TURN, MAX_TURN);
      heading = (heading + turn + 360) % 360;
      dist = rng.range(minLeg, maxLeg);
    }
    cur = destination(cur, heading, dist);
    out.push({ seq: i, lat: cur.lat, lng: cur.lng, reachedAt: null, approached: false });
  }

  return {
    origin: { lat: origin.lat, lng: origin.lng },
    stops: out,
    seed: String(seed),
    budgetMin,
    legStraight,
    clamped,
  };
}

/** Rough estimate of how far you will actually walk, and for how long. */
export function estimate(plan) {
  const pts = [plan.origin, ...plan.stops];
  let straight = 0;
  for (let i = 1; i < pts.length; i++) straight += haversine(pts[i - 1], pts[i]);
  straight += haversine(pts[pts.length - 1], plan.origin) * 0; // last leg already heads home
  const walked = straight * DETOUR;
  return {
    straightM: straight,
    walkedM: walked,
    minutes: Math.round(walked / PACE_M_PER_MIN + plan.stops.length * DWELL_MIN),
  };
}

/** Index of the nearest stop not yet reached, or -1 when the walk is done. */
export function nextStopIndex(stops) {
  return stops.findIndex((s) => !s.reachedAt);
}
