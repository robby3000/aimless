import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFECTS } from '../public/lib/engine/registry.js';
import { validateSpec } from '../public/lib/engine/spec.js';
import { makeRng } from '../public/lib/rng.js';
import { surpriseSpec } from '../public/lib/surprise.js';

test('surpriseSpec produces a valid spec the engine accepts', () => {
  for (const seed of [1, 42, 'walk-abc', 0xffffffff]) {
    const spec = surpriseSpec(makeRng(seed));
    assert.equal(spec.format, 'wobbletone-filter');
    assert.equal(spec.version, 1);
    assert.equal(spec.name, 'Surprise');
    // validateSpec already ran inside surpriseSpec; a second pass is a no-op.
    assert.deepEqual(validateSpec(spec), spec);
  }
});

test('the same seed reproduces the same spec', () => {
  assert.deepEqual(surpriseSpec(makeRng('fixed')), surpriseSpec(makeRng('fixed')));
});

test('different seeds diverge (a roll is not a replay)', () => {
  assert.notDeepEqual(surpriseSpec(makeRng('a')), surpriseSpec(makeRng('b')));
});

test('stacks hold 3-6 effects, never opacity', () => {
  for (let s = 0; s < 200; s++) {
    const spec = surpriseSpec(makeRng(s));
    assert.ok(spec.effects.length >= 3 && spec.effects.length <= 6, `${spec.effects.length} effects`);
    assert.ok(spec.effects.every((e) => e.type !== 'opacity'), 'opacity must never roll');
    assert.ok(spec.effects.every((e) => EFFECTS[e.type]), `unknown type: ${spec.effects.map((e) => e.type)}`);
  }
});

test('rolled params land inside their declared ranges', () => {
  for (let s = 0; s < 200; s++) {
    const spec = surpriseSpec(makeRng(s));
    for (const e of spec.effects) {
      for (const [key, decl] of Object.entries(EFFECTS[e.type].params)) {
        const v = e.params[key];
        if (decl.kind === 'number') {
          assert.ok(v >= decl.min && v <= decl.max, `${e.type}.${key} = ${v} outside ${decl.min}-${decl.max}`);
        } else if (decl.kind === 'select') {
          assert.ok(decl.options.includes(v), `${e.type}.${key} = ${v} not in options`);
        } else if (decl.kind === 'color') {
          assert.match(v, /^#[0-9a-f]{6}$/i, `${e.type}.${key} = ${v} not a hex color`);
        }
      }
    }
  }
});
