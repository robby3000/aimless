import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSpec } from '../public/lib/engine/spec.js';
import {
  FILTERS,
  allFilters,
  filterSpecJson,
  getFilter,
  importFilterSpec,
  importFilterPayload,
  setImportedFilters,
  translateWobbletoneArchive,
  translateWobbletonePreset,
  validateFilter,
  effectiveFilterId,
  effectiveSpec,
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
  { defId: 'solarize', params: { amount: 60, threshold: 50 } },
  { defId: 'hueband', params: { bands: 6, spread: 0 } },
  { defId: 'psychedelic', params: { saturate: 280, contrast: 130, bands: 6, solarize: 50 } },
  { defId: 'infrared', params: { intensity: 70 } },
  { defId: 'vintage', params: { sepia: 45, contrast: 95, saturate: 80, brightness: 105 } },
  { defId: 'dropshadow', params: { x: 0, y: 8, blur: 16, color: '#7c5cff' } },
];

test('FILTERS lists the 31 rail presets with unique ids and valid specs', () => {
  assert.equal(FILTERS.length, 31);
  assert.equal(new Set(FILTERS.map((filter) => filter.id)).size, 31);
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
  assert.deepEqual(types('original'), []);
  assert.deepEqual(types('pop'), ['saturate', 'contrast', 'brightness']);
  assert.deepEqual(types('old-film'), ['sepia', 'contrast', 'saturate', 'brightness', 'colorwash', 'grain']);
  assert.deepEqual(types('soft'), ['shadowshighlights', 'contrast', 'saturate', 'bloom', 'blur']);
  assert.deepEqual(types('cold'), ['saturate', 'mixer']);
  assert.deepEqual(types('warm'), ['mixer']);
  assert.deepEqual(types('muted'), ['saturate', 'contrast']);
  assert.deepEqual(types('darker-sky'), ['shadowshighlights', 'contrast', 'gradient', 'saturate']);
  assert.deepEqual(types('black-and-white'), ['grayscale']);
  assert.deepEqual(types('grainy-bw'), ['grayscale', 'grain']);
  assert.deepEqual(types('hitch'), ['tritone', 'grain']);
  assert.deepEqual(types('sepia'), ['duotone', 'contrast', 'grain', 'vignette']);
  assert.deepEqual(types('noire'), ['grayscale', 'vignette', 'grain']);
  assert.deepEqual(types('bw-infrared'), ['infrared', 'hue', 'invert', 'contrast', 'brightness', 'gradient', 'grayscale', 'grain']);
  assert.deepEqual(types('ortho'), ['grayscale', 'grain']);
  assert.deepEqual(types('daido'), ['grayscale', 'blur', 'grain']);
  assert.deepEqual(types('mappage'), ['blur', 'posterize', 'saturate', 'hue']);
  assert.deepEqual(types('electronica'), ['glitch', 'chromatic', 'grayscale']);
  assert.deepEqual(types('cadsabest'), ['chromatic', 'scanlines', 'colorwash', 'heatmap', 'glitch']);
  assert.deepEqual(types('jellyfish'), ['tritone', 'outline', 'chromatic', 'glitch']);
  assert.deepEqual(types('philly-cheese'), ['posterize', 'psychedelic', 'dropshadow', 'glitch']);
  assert.deepEqual(types('aubrey'), ['grain', 'tritone', 'psychedelic', 'invert', 'chromatic']);
  assert.deepEqual(types('hiro'), ['outline', 'vignette', 'echo', 'gradient', 'psychedelic', 'posterize']);
  assert.deepEqual(types('gizme'), ['blur', 'posterize', 'vintage', 'glitch']);
  assert.deepEqual(types('earlswood'), ['colorwash', 'vignette', 'drama', 'chromatic', 'contrast', 'hue']);
  assert.deepEqual(types('gdansk-65'), ['contrast', 'vignette', 'blur', 'glitch', 'hue', 'gradient', 'chromatic', 'scanlines']);
  assert.deepEqual(types('daguerre'), ['specular', 'psychedelic', 'shadowshighlights', 'gradient', 'vintage', 'grain']);
  assert.deepEqual(types('schrader'), ['psychedelic', 'brightness', 'bloom', 'contrast', 'shadowshighlights', 'liquid']);
  assert.deepEqual(types('radar-station'), ['shadowshighlights', 'hue', 'saturate', 'posterize', 'bloom']);
  assert.deepEqual(types('bender'), ['glitch', 'brightness', 'shadowshighlights', 'chromatic']);
  assert.deepEqual(types('impaired'), ['morphology', 'colorwash', 'liquid', 'brightness', 'glitch']);
});

test('FILTERS rail order is the shipped set', () => {
  assert.deepEqual(FILTERS.map((filter) => filter.id), [
    'original', 'pop', 'old-film', 'soft', 'cold', 'warm', 'muted', 'darker-sky',
    'black-and-white', 'grainy-bw', 'hitch', 'sepia', 'noire', 'bw-infrared',
    'ortho', 'daido', 'mappage', 'electronica', 'cadsabest', 'jellyfish',
    'philly-cheese', 'aubrey', 'hiro', 'gizme', 'earlswood', 'gdansk-65',
    'daguerre', 'schrader', 'radar-station', 'bender', 'impaired',
  ]);
});

test('Warm and Cold run through the channel mixer in Gain mode', () => {
  const warm = getFilter('warm').spec.effects[0];
  const cold = getFilter('cold').spec.effects[1];
  assert.equal(warm.type, 'mixer');
  assert.equal(cold.type, 'mixer');
  assert.equal(warm.params.mode, 'Gain');
  assert.ok(warm.params.b < 100 && warm.params.b < warm.params.r);
  assert.ok(cold.params.b > 100 && cold.params.r < 100);
});

test('Darker sky keeps its multiply gradient settings', () => {
  const gradient = getFilter('darker-sky').spec.effects[2].params;
  assert.equal(gradient.c1, '#2a1d3a');
  assert.equal(gradient.c2, '#feffd1');
  assert.equal(gradient.angle, 180);
  assert.equal(gradient.blend, 'multiply');
  assert.equal(gradient.opacity, 80);
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

test('filterSpecJson exports a bare spec that round-trips through importFilterSpec', () => {
  const filter = getFilter('noire');
  const json = filterSpecJson(filter, 'My Noire');
  const parsed = JSON.parse(json);
  assert.equal(parsed.format, 'wobbletone-filter');
  assert.equal(parsed.name, 'My Noire');
  const record = importFilterSpec(json, []);
  assert.equal(record.id, 'my-noire');
  assert.equal(record.name, 'My Noire');
  assert.deepEqual(record.spec.effects, filter.spec.effects);
});

const SPEC = (effects, name) => ({ format: 'wobbletone-filter', version: 1, name, effects });
const ARCHIVE = (presets) => ({ schema: 'wobbletone-presets', version: 2, presets });

test('importFilterPayload imports a whole Wobbletone archive at once', () => {
  const archive = ARCHIVE([
    { id: 'x-one', name: 'One', spec: SPEC([{ type: 'contrast', params: { v: 130 } }]) },
    { id: 'x-two', name: 'Two', spec: SPEC([]) },
  ]);
  const { records, errors } = importFilterPayload(archive, [], []);
  assert.deepEqual(records.map((f) => f.id), ['x-one', 'x-two']);
  assert.deepEqual(errors, []);
  assert.equal(records[0].spec.effects[0].params.v, 130);
});

test('importFilterPayload slug-dedups archive ids against built-ins and the batch', () => {
  const archive = ARCHIVE([
    { id: 'pop', name: 'Pop', spec: SPEC([]) },
    { id: 'pop', name: 'Pop Two', spec: SPEC([]) },
  ]);
  const { records } = importFilterPayload(archive, [], []);
  assert.deepEqual(records.map((f) => f.id), ['pop-2', 'pop-3']);
});

test('importFilterPayload refreshes imported filters matched by id or name', () => {
  // First import: 'pop' collides with the built-in and lands as pop-2.
  const first = importFilterPayload(ARCHIVE([{ id: 'pop', name: 'Pop', spec: SPEC([{ type: 'invert', params: { v: 50 } }]) }]), [], []);
  assert.equal(first.records[0].id, 'pop-2');
  const imported = [{ ...first.records[0], createdAt: 42 }];
  // Re-import after tweaking in Wobbletone: same preset name updates pop-2
  // in place rather than stacking up pop-3.
  const second = importFilterPayload(
    ARCHIVE([{ id: 'pop', name: 'Pop', spec: SPEC([{ type: 'invert', params: { v: 100 } }]) }]),
    ['pop-2'], imported);
  assert.equal(second.records[0].id, 'pop-2');
  assert.equal(second.records[0].createdAt, 42);
  assert.equal(second.records[0].spec.effects[0].params.v, 100);
});

test('importFilterPayload skips bad presets inside an archive but keeps the rest', () => {
  const archive = ARCHIVE([
    { id: 'bad-one', name: 'Bad', spec: SPEC([{ type: 'nope', params: {} }]) },
    { id: 'good-one', name: 'Good', spec: SPEC([]) },
  ]);
  const { records, errors } = importFilterPayload(archive, [], []);
  assert.deepEqual(records.map((f) => f.id), ['good-one']);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /nope/);
});

test('importFilterPayload throws when every archive preset fails', () => {
  const archive = ARCHIVE([{ id: 'bad', name: 'Bad', spec: SPEC([{ type: 'nope', params: {} }]) }]);
  assert.throws(() => importFilterPayload(archive, [], []), /nope/);
});

test('importFilterPayload still imports single specs through the dedup path', () => {
  const { records, errors } = importFilterPayload(
    JSON.stringify(SPEC([{ type: 'contrast', params: { v: 150 } }], 'My Look')), []);
  assert.deepEqual(records.map((f) => f.id), ['my-look']);
  assert.deepEqual(errors, []);
});

test('imported filters ride the rail oldest to newest (createdAt order)', () => {
  const older = importFilterSpec({ format: 'wobbletone-filter', version: 1, name: 'Zed Older', effects: [] }, []);
  const newer = importFilterSpec({ format: 'wobbletone-filter', version: 1, name: 'Aaa Newer', effects: [] }, []);
  setImportedFilters([{ ...newer, createdAt: 200 }, { ...older, createdAt: 100 }]);
  try {
    // Dated records sort ascending regardless of id or store order.
    assert.deepEqual(allFilters().slice(FILTERS.length).map((f) => f.id), ['zed-older', 'aaa-newer']);
  } finally {
    setImportedFilters([]);
  }
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

test('effectiveFilterId: per-photo override wins, absent falls back', () => {
  assert.equal(effectiveFilterId({ filterId: 'vivid' }, 'original'), 'vivid');
  assert.equal(effectiveFilterId({}, 'original'), 'original');
  assert.equal(effectiveFilterId({ filterId: null }, 'sepia'), 'sepia');
  assert.equal(effectiveFilterId({ filterId: 'original' }, 'vivid'), 'original');
  // A photo's pinned filter survives a different walk-wide choice.
  assert.equal(effectiveFilterId({ filterId: 'ghost' }, 'vivid'), 'ghost');
});

test('effectiveSpec: a stored Surprise spec wins over filterId and fallback', () => {
  const roll = { format: 'wobbletone-filter', version: 1, name: 'Surprise', effects: [{ type: 'invert', params: { v: 100 } }] };
  assert.equal(effectiveSpec({ filterSpec: roll }, 'original'), roll);
  assert.equal(effectiveSpec({ filterSpec: roll, filterId: 'sepia' }, 'original'), roll);
  // No stored spec: resolves through the named filter exactly as before.
  assert.equal(effectiveSpec({ filterId: 'sepia' }, 'vivid'), getFilter('sepia').spec);
  assert.equal(effectiveSpec({}, 'vivid'), getFilter('vivid').spec);
});
