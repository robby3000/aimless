import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FILTERS,
  buildFilterCSS,
  buildFilterDefs,
  buildFilteredPhotoHTML,
  getFilter,
  gradientCSS,
  grainDataUri,
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

test('FILTERS lists the 12 rail presets with unique ids and ordered operations', () => {
  assert.equal(FILTERS.length, 12);
  assert.equal(new Set(FILTERS.map((filter) => filter.id)).size, 12);
  FILTERS.forEach((filter) => {
    assert.match(filter.id, /^[a-z0-9-]+$/);
    assert.ok(filter.name.length > 0);
    assert.ok(Array.isArray(filter.operations));
    assert.equal(validateFilter(filter), filter);
  });
});

test('Original is the only preset with an empty operation list', () => {
  const empty = FILTERS.filter((filter) => filter.operations.length === 0);
  assert.deepEqual(empty.map((filter) => filter.id), ['original']);
});

test('existing overlay presets retain their operation order and values', () => {
  const oldFilm = getFilter('old-film');
  assert.deepEqual(oldFilm.operations.map((operation) => operation.kind), ['css-filter', 'overlay']);
  assert.equal(oldFilm.operations[0].value, 'sepia(35%) contrast(90%) brightness(105%) saturate(85%)');
  assert.equal(oldFilm.operations[1].params.blend, 'multiply');
  assert.deepEqual(oldFilm.operations[1].params.stops, [[0.6, 'transparent'], [1, 'rgba(40,20,0,0.4)']]);
});

test('Psych post 2 preserves its source order, values, display name, and animation', () => {
  const filter = getFilter('psych-post-2');
  assert.equal(filter.name, 'Psych post 2');
  assert.deepEqual(filter.operations.map((operation) => operation.kind), ['css-filter', 'overlay', 'css-filter', 'pixel', 'grain', 'css-filter']);
  assert.equal(filter.operations[0].value, 'saturate(120%)');
  assert.deepEqual(filter.operations[1], { kind: 'overlay', effect: 'vignette', params: { color: '#000000', size: 60, opacity: 56 } });
  assert.equal(filter.operations[2].value, 'blur(8.7px)');
  assert.deepEqual(filter.operations[3], { kind: 'pixel', effect: 'posterize', params: { steps: 10 } });
  assert.deepEqual(filter.operations[4], { kind: 'grain', params: { size: 1.4, opacity: 44, blend: 'overlay' } });
  assert.equal(filter.operations[5].value, 'saturate(280%) contrast(130%)');
  assert.deepEqual(filter.operations[5].animation, { name: 'hue-cycle', duration: 20 });
});

test('Noire and Trippy 3 retain their original overlay settings', () => {
  const noire = getFilter('noire').operations[1].params;
  const trippy = getFilter('trippy-3').operations[1].params;
  assert.deepEqual(noire, { kind: 'radial', stops: [[0.4, 'transparent'], [1, 'rgba(0,0,0,0.85)']], blend: 'normal', opacity: 100 });
  assert.deepEqual(trippy, { kind: 'linear', angle: 45, stops: [[0, 'rgba(255,0,128,0.5)'], [1, 'rgba(0,255,200,0.5)']], blend: 'color-dodge', opacity: 100 });
});

test('getFilter falls back to original for unknown ids', () => {
  assert.equal(getFilter('pop').name, 'Pop');
  assert.equal(getFilter('nope').id, 'original');
});

test('gradientCSS renders radial and linear CSS gradients', () => {
  assert.equal(
    gradientCSS({ kind: 'radial', stops: [[0.6, 'transparent'], [1, 'rgba(0,0,0,0.85)']] }),
    'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.85) 100%)'
  );
  assert.equal(
    gradientCSS({ kind: 'linear', angle: 45, stops: [[0, 'red'], [1, 'blue']] }),
    'linear-gradient(45deg, red 0%, blue 100%)'
  );
  assert.equal(
    gradientCSS({ kind: 'linear', angle: 0, stops: [[0, 'red'], [1, 'blue']] }),
    'linear-gradient(0deg, red 0%, blue 100%)'
  );
});

test('all current Wobbletone effects translate in their original order', () => {
  const filter = translateWobbletonePreset({ id: 'everything', name: 'Everything', effects: EFFECTS });
  assert.equal(filter.operations.length, EFFECTS.length);
  assert.deepEqual(filter.operations.map((operation) => operation.kind), [
    ...Array(9).fill('css-filter'),
    ...Array(5).fill('pixel'),
    'bloom', 'pixel', 'overlay', 'overlay', 'grain',
    'overlay', 'overlay', 'overlay', 'pixel',
    'css-filter', 'css-filter', 'css-filter', 'css-filter',
  ]);
});

test('versioned Wobbletone archives translate and incompatible archives fail', () => {
  const archive = { schema: 'wobbletone-presets', version: 1, presets: [{ id: 'one', name: 'One', effects: [EFFECTS[1]] }] };
  assert.deepEqual(translateWobbletoneArchive(archive).map((filter) => filter.id), ['one']);
  assert.throws(() => translateWobbletoneArchive({ ...archive, version: 2 }), /Unsupported Wobbletone preset archive/);
});

test('partial preset effects receive the current Wobbletone defaults', () => {
  const filter = translateWobbletonePreset({
    id: 'defaults', name: 'Defaults',
    effects: [{ defId: 'brightness', params: {} }, { defId: 'gradient', params: {} }, { defId: 'bloom', params: {} }],
  });
  assert.equal(filter.operations[0].value, 'brightness(110%)');
  assert.deepEqual(filter.operations[1].params, { c1: '#ff5c8a', c2: '#7c5cff', angle: 135, blend: 'soft-light', opacity: 50 });
  assert.equal(filter.operations[2].params.threshold, 140);
});

test('disabled effects are omitted and unknown effects identify their position', () => {
  const filter = translateWobbletonePreset({
    id: 'mixed', name: 'Mixed',
    effects: [{ defId: 'contrast', enabled: false, params: { v: 120 } }, { defId: 'grain', enabled: true, params: { size: 1, opacity: 20, blend: 'overlay' } }],
  });
  assert.deepEqual(filter.operations.map((operation) => operation.kind), ['grain']);
  assert.throws(
    () => translateWobbletonePreset({ id: 'broken', name: 'Broken', effects: [{ defId: 'contrast', params: { v: 120 } }, { defId: 'future-effect', params: {} }] }),
    /Preset "Broken" effect 2 \(future-effect\)/
  );
});

test('validation rejects unknown operation kinds and effect names', () => {
  assert.throws(() => validateFilter({ id: 'bad', name: 'Bad', operations: [{ kind: 'future' }] }), /position 1/);
  assert.throws(() => validateFilter({ id: 'bad', name: 'Bad', operations: [{ kind: 'pixel', effect: 'future', params: {} }] }), /pixel effect.*future/);
});

test('photo markup preserves arbitrary operation ordering and the source once', () => {
  const dataUrl = 'data:image/jpeg;base64,QUJD';
  const html = buildFilteredPhotoHTML(dataUrl, 'old-film', 'photo');
  assert.equal((html.match(/data:image\/jpeg/g) || []).length, 1);
  assert.ok(html.indexOf('filter-image') < html.indexOf('filter-overlay'));
  assert.ok(html.includes('filter:sepia(35%) contrast(90%)'));
  assert.ok(html.includes('mix-blend-mode:multiply'));
  assert.ok(html.includes('filter-clipped'));
});

test('SVG definitions are deterministic and emitted once per operation', () => {
  const filter = translateWobbletonePreset({ id: 'tone', name: 'Tone', effects: [EFFECTS[9], EFFECTS[14], EFFECTS[22]] });
  FILTERS.push(filter);
  try {
    const first = buildFilterDefs('tone');
    const second = buildFilterDefs('tone');
    assert.equal(first, second);
    assert.match(first, /id="aimless-tone-1"/);
    assert.match(first, /id="aimless-tone-2"/);
    assert.match(first, /id="aimless-tone-3"/);
    assert.equal((first.match(/<filter /g) || []).length, 3);
    assert.match(first, /<feComposite in="rgb" in2="SourceGraphic" operator="in"\/>/);
  } finally {
    FILTERS.pop();
  }
});

test('grain and animation assets are emitted only when required', () => {
  const filter = translateWobbletonePreset({ id: 'motion', name: 'Motion', effects: [EFFECTS[18], EFFECTS[23]] });
  FILTERS.push(filter);
  try {
    const css = buildFilterCSS('motion', 'body');
    assert.equal((css.match(/data:image\/svg\+xml/g) || []).length, 1);
    assert.match(css, /@keyframes aimless-hue-cycle/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /print/);
    assert.equal(grainDataUri(), grainDataUri());
  } finally {
    FILTERS.pop();
  }
});

test('Original adds no filter-specific CSS or SVG definitions', () => {
  assert.equal(buildFilterCSS('original', '#detail-content'), '');
  assert.equal(buildFilterDefs('original'), '');
});
