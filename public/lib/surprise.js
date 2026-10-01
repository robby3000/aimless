// Surprise: a seeded-random effect stack, generated off the engine's own
// registry param tables so the generator can never drift from what the
// renderer supports. The produced spec is stored on the photo record —
// rolled once, reproducible forever. Same idea as Wobbletone's Surprise
// button, driven by makeRng (no Math.random — roadmap A7).

import { EFFECTS } from './engine/registry.js';
import { SPEC_FORMAT, SPEC_VERSION, validateSpec } from './engine/spec.js';
import { makeRng } from './rng.js';

// opacity alone in a stack can erase the photo entirely — excluded, same
// as Wobbletone's pool.
const EXCLUDE = new Set(['opacity']);

function randomParam(rng, decl) {
  switch (decl.kind) {
    case 'number': {
      const v = rng.range(decl.min, decl.max);
      // The registry has no step; an integer default is the integrality cue.
      return Number.isInteger(decl.default) ? Math.round(v) : v;
    }
    case 'select':
      return rng.pick(decl.options);
    case 'color': {
      const hex = rng.int(0, 0xffffff).toString(16).padStart(6, '0');
      return `#${hex}`;
    }
    default:
      return decl.default;   // 'stops' etc. have no randomisable range
  }
}

/** Roll a new Surprise stack. rng: a makeRng() instance — the caller seeds. */
export function surpriseSpec(rng) {
  const pool = Object.keys(EFFECTS).filter((type) => !EXCLUDE.has(type));
  const types = rng.shuffle(pool).slice(0, rng.int(3, 6));
  const spec = {
    format: SPEC_FORMAT,
    version: SPEC_VERSION,
    name: 'Surprise',
    effects: types.map((type) => ({
      type,
      params: Object.fromEntries(
        Object.entries(EFFECTS[type].params || {})
          .map(([key, decl]) => [key, randomParam(rng, decl)]),
      ),
    })),
  };
  // validateSpec normalises (clamps into legal ranges) and would throw loudly
  // if the registry table produced something the engine cannot run.
  return validateSpec(spec);
}
