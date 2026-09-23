import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSpec } from '../public/lib/engine/spec.js';
import {
  FILTERS,
  allFilters,
  getFilter,
  importFilterSpec,
  setImportedFilters,
  translateWobbletoneArchive,
  translateWobbletonePreset,
  validateFilter,
} from '../public/lib/filters.js';

const EFFECTS = [
  { defId: 'brightness', params: { v: 110 } },
  { defId: 'contrast', params: { v: 120 } },
  { defId: 'saturate', params: { v: 130 } },
  { defId: 'hue', params: { v: 45 } },
  { defId: 'sepia', params: { v: 40 } },
  { defId: 'grayscale', params: { v: 80 } },
  { defId: 'invert', params: { v: 20 } },
  { defId: 'blur', params: { v: 2 } },
  { defId: 'opacity', params: { v: 90 } },
  { defId: 'duotone', params: { shadow: '#102030', highlight: '#f0d0b0', contrast: 20 } },
  { defId: 'tritone', params: { shadow: '#102030', mid: '#807060', highlight: '#fff0d0' } },
  { defId: 'posterize', params: { steps: 4 } },
  { defId: 'heatmap', params: { intensity: 90 } },
  { defId: 'drama', params: { style: 'Storm', strength: 70, shadows: -10, highlights: 5, saturation: 90 } },
  { defId: 'bloom', params: { blur: 12, threshold: 140, contrast: 180, saturate: 100, opacity: 50, color: '#ffffff', tint: 0, blend: 'screen' } },
  { defId: 'chromatic', params: { offset: 4, strength: 70 } },
  { defId: 'colorwash', params: { color: '#7c5cff', blend: 'overlay', opacity: 40 } },
  { defId: 'gradient', params: { c1: '#ff5c8a', c2: '#7c5cff', angle: 135, blend: 'soft-light', opacity: 50 } },
  { defId: 'grain', params: { size: 0.9, opacity: 25, blend: 'overlay' } },
  { defId: 'vignette', params: { color: '#000000', size: 60, opacity: 50 } },
  { defId: 'scanlines', params: { size: 3, color: '#000000', opacity: 30, blend: 'multiply' } },
  { defId: 'prism', params: { c1: '#ff2e88', c2: '#2effd5', angle: 45, width: 20, opacity: 35 } },
  { defId: 'glitch', params: { style: 'CCD Failure', amount: 42, bandSize: 28, split: 6, seed: 317 } },
  { defId: 'psychedelic', params: { saturate: 280, contrast: 130, speed: 8, animate: 'yes' } },
  { defId: 'infrared', params: { intensity: 70 } },
  { defId: 'vintage', params: { sepia: 45, contrast: 95, saturate: 80, brightness: 105 } },
  { defId: 'dropshadow', params: { x: 0, y: 8, blur: 16, color: '#7c5cff' } },
];

test('FILTERS lists the 12 rail presets with unique ids and valid specs', () => {
  assert.equal(FILTERS.length, 12);
  assert.equal(new Set(FILTERS.map((filter) => filter.id)).size, 12);
  FILTERS.forEach((filter) => {
    assert.match(filter.id, /^[a-z0-9-]+$/);
    assert.ok(filter.name.length > 0);
    assert.equal(filter.spec.format, 'wobbletone-filter');
    assert.equal(filter.spec.version, 1);
    assert.ok(Array.isArray(filter.spec.effects));
    assert.equal(validateFilter(filter), filter);
    assert.deepEqual(validateSpec(filter.spec), filter.spec);
  });
});

test('Original is the only preset with an empty effect list', () => {
  const empty = FILTERS.filter((filter) => filter.spec.effects.length === 0);
  assert.deepEqual(empty.map((filter) => filter.id), ['original']);
});

test('built-in presets carry their spec effects in order', () => {
  const types = (id) => getFilter(id).spec.effects.map((effect) => effect.type);
  assert.deepEqual(types('pop'), ['contrast', 'saturate', 'brightness']);
  assert.deepEqual(types('old-film'), ['sepia', 'contrast', 'brightness', 'saturate', 'overlay']);
  assert.deepEqual(types('black-and-white'), ['grayscale', 'contrast', 'brightness']);
  assert.deepEqual(types('noire'), ['grayscale', 'contrast', 'brightness', 'overlay']);
  assert.deepEqual(types('sepia'), ['sepia', 'contrast', 'brightness', 'saturate']);
  assert.deepEqual(types('muted'), ['saturate', 'contrast', 'brightness']);
  assert.deepEqual(types('cold'), ['hue', 'sepia', 'hue', 'saturate', 'contrast', 'brightness']);
  assert.deepEqual(types('trippy-1'), ['invert', 'hue', 'saturate', 'contrast']);
  assert.deepEqual(types('trippy-2'), ['hue', 'saturate', 'contrast', 'brightness']);
  assert.deepEqual(types('trippy-3'), ['invert', 'hue', 'saturate', 'contrast', 'overlay']);
  assert.deepEqual(types('psych-post-2'), ['saturate', 'vignette', 'blur', 'posterize', 'grain', 'psychedelic']);
});

test('Cold writes its negative hue as the equivalent 0-360 rotation', () => {
  const cold = getFilter('cold').spec.effects;
  assert.equal(cold[0].params.v, 180);
  assert.equal(cold[2].params.v, 200); // hue-rotate(-160deg) ≡ +200deg
});

test('overlay presets retain their gradient settings', () => {
  const oldFilm = getFilter('old-film').spec.effects[4].params;
  const noire = getFilter('noire').spec.effects[3].params;
  const trippy = getFilter('trippy-3').spec.effects[4].params;
  assert.equal(oldFilm.kind, 'radial');
  assert.deepEqual(oldFilm.stops, [[0.6, 'transparent'], [1, 'rgba(40,20,0,0.4)']]);
  assert.equal(oldFilm.blend, 'multiply');
  assert.deepEqual(noire.stops, [[0.4, 'transparent'], [1, 'rgba(0,0,0,0.85)']]);
  assert.equal(noire.blend, 'normal');
  assert.equal(trippy.kind, 'linear');
  assert.equal(trippy.angle, 45);
  assert.deepEqual(trippy.stops, [[0, 'rgba(255,0,128,0.5)'], [1, 'rgba(0,255,200,0.5)']]);
  assert.equal(trippy.blend, 'color-dodge');
});

test('Psych post 2 preserves its source order, values, and display name', () => {
  const filter = getFilter('psych-post-2');
  assert.equal(filter.name, 'Psych post 2');
  const effects = filter.spec.effects;
  assert.equal(effects[0].type, 'saturate');
  assert.equal(effects[0].params.v, 120);
  assert.deepEqual(effects[1].params, { color: '#000000', size: 60, opacity: 56 });
  assert.equal(effects[2].type, 'blur');
  assert.equal(effects[2].params.v, 8.7);
  assert.equal(effects[3].type, 'posterize');
  assert.equal(effects[3].params.steps, 10);
  assert.equal(effects[4].type, 'grain');
  assert.equal(effects[4].params.seed, 1);
  assert.equal(effects[5].type, 'psychedelic');
  assert.equal(effects[5].params.saturate, 280);
  assert.equal(effects[5].params.animate, 'yes');
});

test('getFilter falls back to original for unknown ids', () => {
  assert.equal(getFilter('pop').name, 'Pop');
  assert.equal(getFilter('nope').id, 'original');
});

test('all current Wobbletone effects translate into spec effects in order', () => {
  const filter = translateWobbletonePreset({ id: 'everything', name: 'Everything', effects: EFFECTS });
  assert.equal(filter.spec.effects.length, EFFECTS.length);
  assert.deepEqual(filter.spec.effects.map((effect) => effect.type), EFFECTS.map((effect) => effect.defId));
});

test('versioned Wobbletone archives translate and incompatible archives fail', () => {
  const archive = { schema: 'wobbletone-presets', version: 1, presets: [{ id: 'one', name: 'One', effects: [EFFECTS[1]] }] };
  assert.deepEqual(translateWobbletoneArchive(archive).map((filter) => filter.id), ['one']);
  const v2 = { schema: 'wobbletone-presets', version: 2, presets: [{ id: 'two', name: 'Two', spec: { format: 'wobbletone-filter', version: 1, effects: [] } }] };
  assert.deepEqual(translateWobbletoneArchive(v2).map((filter) => filter.id), ['two']);
  assert.throws(() => translateWobbletoneArchive({ ...archive, version: 3 }), /Unsupported Wobbletone preset archive/);
});

test('bare Filter Spec JSON translates and clamps out-of-range params', () => {
  const spec = { format: 'wobbletone-filter', version: 1, name: 'From Wobbletone', effects: [{ type: 'contrast', params: { v: 999 } }] };
  const filter = translateWobbletonePreset(spec, { id: 'imported' });
  assert.equal(filter.id, 'imported');
  assert.equal(filter.name, 'From Wobbletone');
  assert.equal(filter.spec.effects[0].params.v, 200);
  assert.throws(() => translateWobbletonePreset(spec), /Invalid Aimless filter preset/);
});

test('partial preset effects receive the engine defaults', () => {
  const filter = translateWobbletonePreset({
    id: 'defaults', name: 'Defaults',
    effects: [{ defId: 'brightness', params: {} }, { defId: 'gradient', params: {} }, { defId: 'bloom', params: {} }],
  });
  assert.equal(filter.spec.effects[0].params.v, 110);
  assert.deepEqual(filter.spec.effects[1].params, { c1: '#ff5c8a', c2: '#7c5cff', angle: 135, blend: 'soft-light', opacity: 50 });
  assert.equal(filter.spec.effects[2].params.threshold, 140);
});

test('disabled effects are omitted and unknown effects identify their position', () => {
  const filter = translateWobbletonePreset({
    id: 'mixed', name: 'Mixed',
    effects: [{ defId: 'contrast', enabled: false, params: { v: 120 } }, { defId: 'grain', enabled: true, params: { size: 1, opacity: 20, blend: 'overlay' } }],
  });
  assert.deepEqual(filter.spec.effects.map((effect) => effect.type), ['grain']);
  assert.throws(
    () => translateWobbletonePreset({ id: 'broken', name: 'Broken', effects: [{ defId: 'contrast', params: { v: 120 } }, { defId: 'future-effect', params: {} }] }),
    /Preset "Broken" effect 2 \(future-effect\)/
  );
});

test('validateFilter requires a valid id, name, and spec', () => {
  assert.throws(() => validateFilter({ id: 'bad', name: 'Bad' }), /missing spec/);
  assert.throws(() => validateFilter({ id: 'Bad ID', name: 'Bad', spec: { format: 'wobbletone-filter', version: 1, effects: [] } }), /Invalid Aimless filter/);
  assert.throws(
    () => validateFilter({ id: 'bad', name: 'Bad', spec: { format: 'wobbletone-filter', version: 1, effects: [{ type: 'future-effect', params: {} }] } }),
    /future-effect/
  );
});

test('importFilterSpec validates spec JSON and derives a slug id', () => {
  const record = importFilterSpec(
    JSON.stringify({ format: 'wobbletone-filter', version: 1, name: 'My Look', effects: [{ type: 'contrast', params: { v: 150 } }] }),
    []
  );
  assert.equal(record.id, 'my-look');
  assert.equal(record.name, 'My Look');
  assert.equal(record.spec.effects[0].params.v, 150);
});

test('importFilterSpec accepts legacy v1 presets and de-duplicates ids', () => {
  const record = importFilterSpec({ name: 'Pop', effects: [{ defId: 'contrast', params: { v: 130 } }] }, []);
  assert.equal(record.id, 'pop-2'); // 'pop' is a built-in
  assert.equal(record.spec.effects[0].type, 'contrast');
  const again = importFilterSpec({ name: 'Pop', effects: [] }, ['pop-2']);
  assert.equal(again.id, 'pop-3');
});

test('importFilterSpec rejects invalid input loudly', () => {
  assert.throws(() => importFilterSpec('{nope'), /JSON/);
  assert.throws(() => importFilterSpec('[]'), /filter specification/);
  assert.throws(
    () => importFilterSpec('{"format":"wobbletone-filter","version":1,"effects":[{"type":"nope","params":{}}]}'),
    /unknown effect type.*nope/
  );
});

test('imported filters resolve through getFilter and allFilters', () => {
  const record = importFilterSpec({ format: 'wobbletone-filter', version: 1, name: 'ZZ Custom', effects: [] }, []);
  setImportedFilters([record]);
  try {
    assert.equal(getFilter('zz-custom').name, 'ZZ Custom');
    assert.equal(getFilter('pop').name, 'Pop');
    assert.equal(allFilters().length, FILTERS.length + 1);
    assert.equal(getFilter('nope').id, 'original');
  } finally {
    setImportedFilters([]);
  }
});
