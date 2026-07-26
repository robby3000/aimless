// Seeded randomness. Every walk is reproducible from its seed.
// Never use Math.random() in generation code - see docs/roadmap.md A7.

/** FNV-1a. Turns a seed string into a uint32. */
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32. Small, fast, good enough, and identical across engines. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seeded generator with the helpers the app actually needs. */
export function makeRng(seed) {
  const next = mulberry32(typeof seed === 'number' ? seed : hashSeed(String(seed)));
  return {
    next,
    /** Float in [min, max). */
    range: (min, max) => min + next() * (max - min),
    /** Integer in [min, max]. */
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    /** Random element. */
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    /** -1 or 1. */
    sign: () => (next() < 0.5 ? -1 : 1),
    /** True with probability p. */
    chance: (p) => next() < p,
    /** Fisher-Yates, returns a new array. */
    shuffle: (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

const WORDS = [
  'crow', 'gate', 'rust', 'lamp', 'moss', 'kerb', 'vent', 'brick', 'wire', 'slate',
  'drain', 'arch', 'chain', 'bolt', 'ash', 'tile', 'grate', 'post', 'sill', 'hinge',
];

/** A short, sayable, shareable seed like "rust-gate-417". */
export function randomSeed() {
  const r = Math.floor(Math.random() * 1e9);
  const a = WORDS[r % WORDS.length];
  const b = WORDS[Math.floor(r / WORDS.length) % WORDS.length];
  return `${a}-${b}-${(r % 900) + 100}`;
}
