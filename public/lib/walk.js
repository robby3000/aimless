// Walk generation. A chain, not a scatter - see docs/blueprint.md section 5.
// Pure: no DOM, no storage, no clock.

import { destination, bearing, haversine, angleDelta } from './geo.js';
import { makeRng } from './rng.js';

export const PACE_M_PER_MIN = 75;   // 4.5 km/h
export const DWELL_MIN = 1.5;       // 90s standing at each stop
export const DETOUR = 1.35;         // streets are not straight lines
export const MIN_LEG = 150;
export const MAX_LEG = 1200;
export const MIN_TURN = 40;         // straighter than this is boring
export const MAX_TURN = 150;        // sharper than this is a backtrack
export const FIRST_LEG_ARC = 45;    // first stop within ±45° of startHeading
export const STOP_ARC = 75;         // later stops within ±75° of startHeading (from origin)
export const MAX_REDRAWS = 20;      // give up constraining after this many redraws

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
 *
 * When startHeading (compass degrees at Go time) is given, the walk unfolds
 * in front of the user: the first stop lands within ±FIRST_LEG_ARC of it and
 * every later stop within ±STOP_ARC of it (bearing measured from the origin).
 * Stops that fall outside are redrawn from the seeded RNG, so a seed plus a
 * heading still reproduces the same walk. Without a heading the route is
 * unconstrained, exactly as before.
 */
export function planWalk({ origin, stops = 5, budgetMin = 45, seed, startHeading = null }) {
  if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') {
    throw new Error('planWalk needs an origin {lat, lng}');
  }
  if (stops < 1) throw new Error('planWalk needs at least one stop');

  const oriented = typeof startHeading === 'number' && Number.isFinite(startHeading);
  const facing = oriented ? ((startHeading % 360) + 360) % 360 : null;

  const rng = makeRng(seed);
  const { legStraight, minLeg, maxLeg, clamped } = legLength(stops, budgetMin);

  let cur = origin;
  let heading = oriented ? facing : rng.range(0, 360);
  const out = [];

  for (let i = 0; i < stops; i++) {
    let next = null;
    for (let attempt = 0; ; attempt++) {
      let dist;
      if (i === stops - 1 && stops > 1) {
        // Last leg heads roughly home so you finish near where you started.
        heading = (bearing(cur, origin) + rng.range(-40, 40) + 360) % 360;
        dist = Math.min(maxLeg, Math.max(minLeg, haversine(cur, origin)));
      } else if (oriented && i === 0) {
        // First leg points roughly where the user is already facing.
        heading = (facing + rng.range(-FIRST_LEG_ARC, FIRST_LEG_ARC) + 360) % 360;
        dist = rng.range(minLeg, maxLeg);
      } else {
        const turn = rng.sign() * rng.range(MIN_TURN, MAX_TURN);
        heading = (heading + turn + 360) % 360;
        dist = rng.range(minLeg, maxLeg);
      }
      next = destination(cur, heading, dist);
      if (!oriented || i === 0 || attempt >= MAX_REDRAWS) break;
      if (Math.abs(angleDelta(facing, bearing(origin, next))) <= STOP_ARC) break;
    }
    cur = next;
    out.push({ seq: i, lat: cur.lat, lng: cur.lng, reachedAt: null, approached: false });
  }

  return {
    origin: { lat: origin.lat, lng: origin.lng },
    stops: out,
    seed: String(seed),
    budgetMin,
    legStraight,
    clamped,
    startHeading: facing,
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
