// Oracle voices: the waypoint's coordinates, not a seeded deck, determine the
// card — the same idea as The Inner's coordinate-derived hexagram,
// generalised. Each voice ships four pools of 64 lines (titles, l1, l2, l3)
// in public/data/{slug}.json; a seeded RNG draws one index per pool.
// Spec: docs/ignore/haiku-recombination.md. Pure: no DOM, no fetch, no
// storage.

import { decimalsOf } from './inner.js';
import { makeRng } from './rng.js';

/**
 * A card for one stop, drawn from a voice's line pools by the stop's
 * coordinates. Draw order is part of the spec — title, then l1, l2, l3 —
 * because changing it reshuffles every card.
 *
 * @param {object} stop   { lat, lng } waypoint.
 * @param {object} voice  pool data: { slug, titles[64], l1[64], l2[64], l3[64] }.
 * @param {Set} [used]    strings already drawn in this walk. Pass one shared
 *   set across all stops and no line or title repeats within the walk: a
 *   collision steps to the next pool entry, so a stop's card still depends
 *   only on its coordinates plus the stops before it.
 * @returns {object} { text, voice, oracle: { title } } — the deck card
 *   contract, plus the drawn title for the card header.
 */
export function oracleCard(stop, voice, used) {
  const seed = `${decimalsOf(stop.lat)}|${decimalsOf(stop.lng)}|${voice.slug}`;
  const rng = makeRng(seed);
  const title = draw(voice.titles, rng, used);
  const l1 = draw(voice.l1, rng, used);
  const l2 = draw(voice.l2, rng, used);
  const l3 = draw(voice.l3, rng, used);
  return {
    text: `${l1}\n${l2}\n${l3}`,
    voice: voice.slug,
    oracle: { title },
  };
}

/**
 * One pool entry, stepping forward while it lands on a string the walk has
 * used. Always finds a fresh entry when one exists; if every entry is spent
 * the original draw stands, which cannot happen with 64-entry pools and a
 * five-stop walk.
 */
function draw(pool, rng, used) {
  let i = rng.int(0, pool.length - 1);
  if (!used) return pool[i];
  for (let tries = 0; used.has(pool[i]) && tries < pool.length; tries++) {
    i = (i + 1) % pool.length;
  }
  used.add(pool[i]);
  return pool[i];
}
