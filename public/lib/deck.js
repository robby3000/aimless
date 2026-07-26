// The deck. A slot grammar that turns a seeded RNG and a voice into a card.
// See docs/deck.md - this is the app's entire personality.
// Pure: no DOM, no fetch, no storage. Voice data is passed in.

import { makeRng } from './rng.js';

// Shared slots - identical across all voices. See deck.md section 4.
export const OPENERS = [
  'There is one within twenty paces',
  'You have already walked past it',
  'Do not look for long',
  'Somebody chose this',
  'This will take two minutes',
  'Nobody else has done this here',
  'Start from where you are standing',
  'Assume it is deliberate',
];

export const CONSTRAINTS = [
  'without crossing the road',
  'without moving your feet',
  'before you have counted to thirty',
  'from below',
  'from as far away as you can while still seeing it',
  'with one eye closed',
  'only if it is worth less than a pound',
  'without taking a photograph',
  'twice, from opposite sides',
  'while standing perfectly still',
];

export const CODAS = [
  'It was left, not lost',
  'Someone else already decided against it',
  'This is not the first time',
  'It will not be here next year',
  'That was the point',
  'Do not explain it to anyone',
  'Now forget it',
  'It has been there longer than you have',
];

// Suggested in deck.md section 3. Tune by reading output.
export const PROBABILITIES = { opener: 0.25, constraint: 0.45, coda: 0.35 };

// How many recent walks to remember for cross-walk dedup. deck.md section 3:
// "keep a small ring buffer of recent pairs in prefs".
export const RECENT_WALKS = 3;

/** A pair key is "directive\ttarget" - tab is safe because no slot contains one. */
export function pairKey(directive, target) {
  return `${directive}\t${target}`;
}

/**
 * Draw one card for a single stop.
 *
 * @param {object} opts
 * @param {string} opts.seed        Walk seed.
 * @param {object} opts.voice       A voice object from public/data/*.json.
 * @param {number} opts.stopIndex   0-based stop index.
 * @param {string[]} [opts.used]    Pair keys already used in this walk.
 * @param {string[]} [opts.recent]  Pair keys from the last few walks.
 * @returns {object} { text, voice, directive, target, opener, constraint, coda, pairKey }
 */
export function drawCard({ seed, voice, stopIndex, used = [], recent = [] }) {
  if (!voice || !Array.isArray(voice.directives) || !Array.isArray(voice.targets)) {
    throw new Error('drawCard needs a voice with directives and targets');
  }
  const avoid = new Set([...used, ...recent]);

  // Each stop gets its own RNG keyed by (seed, voice, stopIndex) per deck.md
  // section 3. A retry counter advances the key on rejection so the draw is
  // still deterministic for a given (seed, voice, stopIndex, used, recent).
  let retry = 0;
  let directive;
  let target;
  let key;
  do {
    const rng = makeRng(`${seed}|${voice.slug}|${stopIndex}|${retry}`);
    directive = rng.pick(voice.directives);
    target = rng.pick(voice.targets);
    key = pairKey(directive, target);
    retry++;
  } while (avoid.has(key) && retry < 200);

  // A fresh RNG for the shared slots, keyed separately so that changing the
  // directive/target rejection count does not shift the opener/constraint/coda.
  const slotRng = makeRng(`${seed}|${voice.slug}|${stopIndex}|slots`);

  const opener = slotRng.chance(PROBABILITIES.opener) ? slotRng.pick(OPENERS) : null;
  const constraint = slotRng.chance(PROBABILITIES.constraint) ? slotRng.pick(CONSTRAINTS) : null;
  const coda = slotRng.chance(PROBABILITIES.coda) ? slotRng.pick(CODAS) : null;

  const text = assemble({ directive, target, opener, constraint, coda });

  return { text, voice: voice.slug, directive, target, opener, constraint, coda, pairKey: key };
}

/**
 * Assemble the slot fills into the card text. Grammar from deck.md section 3:
 *   [OPENER?] DIRECTIVE TARGET [, CONSTRAINT]? [CODA?]
 * Punctuation follows the worked examples in deck.md section 6.
 */
export function assemble({ directive, target, opener, constraint, coda }) {
  let out = '';
  if (opener) out += `${opener}. `;
  out += `${directive} ${target}`;
  if (constraint) out += `, ${constraint}`;
  out += '.';
  if (coda) out += ` ${coda}.`;
  return out;
}

/**
 * Draw cards for every stop in a walk.
 *
 * @param {object} opts
 * @param {string} opts.seed
 * @param {object} opts.voice
 * @param {number} opts.stops     Number of stops.
 * @param {string[]} [opts.recent] Pair keys from the last few walks.
 * @returns {object} { cards, used } - cards is an array; used is the pair keys
 *   used in this walk, to be merged into the recent-pairs ring buffer.
 */
export function drawWalk({ seed, voice, stops, recent = [] }) {
  const used = [];
  const cards = [];
  for (let i = 0; i < stops; i++) {
    const card = drawCard({ seed, voice, stopIndex: i, used, recent });
    used.push(card.pairKey);
    cards.push(card);
  }
  return { cards, used };
}

/**
 * Update the recent-pairs ring buffer. Keeps one array of pair keys per walk,
 * capped at RECENT_WALKS entries (oldest dropped).
 *
 * @param {string[][]} buffer  Array of used-pair-key arrays, one per past walk.
 * @param {string[]} used      Pair keys used in the walk just completed.
 * @returns {string[][]}       The updated buffer (new array).
 */
export function pushRecent(buffer, used) {
  const next = [...buffer, used];
  while (next.length > RECENT_WALKS) next.shift();
  return next;
}

/** Flatten a recent-pairs buffer into a single deduped set of pair keys. */
export function recentKeys(buffer) {
  return buffer.flat();
}
