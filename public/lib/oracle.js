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
 * @returns {object} { text, voice, oracle: { title } } — the deck card
 *   contract, plus the drawn title for the card header.
 */
export function oracleCard(stop, voice) {
  const seed = `${decimalsOf(stop.lat)}|${decimalsOf(stop.lng)}|${voice.slug}`;
  const rng = makeRng(seed);
  const title = voice.titles[rng.int(0, 63)];
  const l1 = voice.l1[rng.int(0, 63)];
  const l2 = voice.l2[rng.int(0, 63)];
  const l3 = voice.l3[rng.int(0, 63)];
  return {
    text: `${l1}\n${l2}\n${l3}`,
    voice: voice.slug,
    oracle: { title },
  };
}

/**
 * The Echo's opener: the one line that reflects what the walker did rather
 * than where they are. Chosen at arrival time (the previous stop's outcome
 * isn't known at plan time), seeded so the same seed and the same behaviour
 * always give the same line.
 *
 * @param {object} voice      pool data carrying the `echo` opener banks.
 * @param {string} seed       the walk seed.
 * @param {number} stopIndex  index of the stop being arrived at.
 * @param {object|null} previous  previous stop outcome { approached, photo },
 *   or null for the first stop.
 * @returns {string|null} the opener line, or null if the bank is missing.
 */
export function echoOpener(voice, seed, stopIndex, previous) {
  const key = !previous
    ? 'first'
    : `${previous.approached ? 'approached' : 'reached'}-${previous.photo ? 'photo' : 'skipped'}`;
  const bank = voice.echo?.[key];
  if (!bank?.length) return null;
  return makeRng(`${seed}|echo|${stopIndex}`).pick(bank);
}
