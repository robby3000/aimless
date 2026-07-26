// Arrival logic. Pure, so it can be tested against synthetic GPS tracks
// including the spikes that cause phantom arrivals in real cities.

import { haversine, bearing } from './geo.js';

export const ARRIVE_M = 30;
export const NEAR_M = 150;
export const MAX_ACCURACY_M = 50;   // worse than this cannot resolve a 30m radius
export const MAX_FIX_AGE_MS = 30000;
export const HYSTERESIS = 2;        // consecutive in-radius fixes before arrival fires

/**
 * Create a proximity tracker for one walk.
 * Feed it fixes; it tells you where to point and when you have arrived.
 */
export function createTracker(stops, opts = {}) {
  const arriveM = opts.arriveM ?? ARRIVE_M;
  const nearM = opts.nearM ?? NEAR_M;
  const hysteresis = opts.hysteresis ?? HYSTERESIS;
  let streak = 0;
  let streakSeq = -1;

  return {
    /**
     * @param fix {{lat, lng, accuracy?, timestamp?}}
     * @param now epoch ms, injected so tests do not depend on the clock
     * @returns {{usable, target, distance, bearing, band, arrived}}
     */
    update(fix, now = Date.now()) {
      const target = stops.find((s) => !s.reachedAt) ?? null;
      const base = { usable: false, target, distance: null, bearing: null, band: 'far', arrived: null };
      if (!target) return { ...base, band: 'done' };

      const distance = haversine(fix, target);
      const brg = bearing(fix, target);

      // A fix we do not trust can still be shown, but must never trigger arrival.
      const tooVague = typeof fix.accuracy === 'number' && fix.accuracy > MAX_ACCURACY_M;
      const tooOld = typeof fix.timestamp === 'number' && now - fix.timestamp > MAX_FIX_AGE_MS;
      const usable = !tooVague && !tooOld;

      let band = 'far';
      if (distance <= arriveM) band = 'arrived';
      else if (distance <= nearM) band = 'near';

      if (!usable) {
        streak = 0;
        return { usable: false, target, distance, bearing: brg, band: band === 'arrived' ? 'near' : band, arrived: null };
      }

      if (band === 'arrived') {
        if (streakSeq !== target.seq) {
          streakSeq = target.seq;
          streak = 0;
        }
        streak++;
        if (streak >= hysteresis) {
          streak = 0;
          streakSeq = -1;
          return { usable, target, distance, bearing: brg, band, arrived: target };
        }
      } else {
        streak = 0;
        streakSeq = -1;
      }

      return { usable, target, distance, bearing: brg, band, arrived: null };
    },
  };
}

/** Mark a stop reached. `approached` means "close as I can get", not a real arrival. */
export function reachStop(stop, { approached = false, at = Date.now() } = {}) {
  stop.reachedAt = at;
  stop.approached = approached;
  return stop;
}

/** How many stops were fudged rather than actually reached. See docs/blueprint.md section 6. */
export function unreachableRate(stops) {
  const done = stops.filter((s) => s.reachedAt);
  if (!done.length) return { reached: 0, approached: 0, rate: 0 };
  const approached = done.filter((s) => s.approached).length;
  return {
    reached: done.length - approached,
    approached,
    rate: approached / done.length,
  };
}
