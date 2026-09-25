import { SPEC_FORMAT, SPEC_VERSION, validateSpec, specFromLegacy } from './engine/spec.js';

// Legacy Wobbletone ids that migrate into current spec types.
const LEGACY_ALIASES = new Set(['glow', 'halation']);

// Wobbletone v1 defIds accepted on import (the engine registry names).
const EFFECT_DEFAULTS = {
  brightness: { v: 110 }, contrast: { v: 110 }, saturate: { v: 120 }, hue: { v: 0 }, sepia: { v: 60 }, grayscale: { v: 100 }, invert: { v: 100 }, blur: { v: 1 }, opacity: { v: 80 },
  duotone: { shadow: '#1a0d3d', highlight: '#ff5c8a', contrast: 20 },
  tritone: { shadow: '#0b1d3a', mid: '#c44d4d', highlight: '#ffe8a3' }, posterize: { steps: 5 }, heatmap: { intensity: 100 },
  drama: { style: 'Cinematic', strength: 70, shadows: 0, highlights: 0, saturation: 100 },
  bloom: { blur: 12, threshold: 140, contrast: 180, saturate: 100, opacity: 50, color: '#ffffff', tint: 0, blend: 'screen' },
  chromatic: { offset: 4, strength: 70 }, colorwash: { color: '#7c5cff', blend: 'overlay', opacity: 40 },
  gradient: { c1: '#ff5c8a', c2: '#7c5cff', angle: 135, blend: 'soft-light', opacity: 50 },
  grain: { size: 0.9, opacity: 25, blend: 'overlay' }, vignette: { color: '#000000', size: 60, opacity: 50 },
  scanlines: { size: 3, color: '#000000', opacity: 30, blend: 'multiply' }, prism: { c1: '#ff2e88', c2: '#2effd5', angle: 45, width: 20, opacity: 35 },
  glitch: { style: 'CCD Failure', amount: 42, bandSize: 28, split: 6, corrupt: 40, seed: 317 },
  solarize: { amount: 60, threshold: 50 }, hueband: { bands: 6, spread: 0 },
  psychedelic: { saturate: 280, contrast: 130, bands: 6, solarize: 50 }, infrared: { intensity: 70 },
  vintage: { sepia: 45, contrast: 95, saturate: 80, brightness: 105 }, dropshadow: { x: 0, y: 8, blur: 16, color: '#7c5cff' },
};

export function translateWobbletoneArchive(archive) {
  if (!archive || archive.schema !== 'wobbletone-presets' || ![1, 2].includes(archive.version) || !Array.isArray(archive.presets)) throw new Error('Unsupported Wobbletone preset archive');
  return archive.presets.map((preset) => translateWobbletonePreset(preset));
}

// Accepts a bare Filter Spec (Wobbletone Code tab output), a v2 preset
// record { spec }, or a v1 record { effects: [{defId, params, enabled}] }.
function wobbletoneSpecFrom(preset) {
  if (!preset || typeof preset !== 'object') throw new Error('Invalid Wobbletone preset');
  const label = `Preset "${preset.name || 'Untitled'}"`;
  try {
    if (preset.format === SPEC_FORMAT) return validateSpec(preset);
    if (preset.spec && typeof preset.spec === 'object') return validateSpec(preset.spec);
  } catch (err) {
    throw new Error(`${label}: ${err.message}`);
  }
  if (!Array.isArray(preset.effects)) throw new Error('Invalid Wobbletone preset');
  // specFromLegacy silently drops unknown types — check defIds first so a
  // bad import fails loudly instead of quietly losing an effect.
  preset.effects.forEach((effect, index) => {
    if (!effect || effect.enabled === false) return;
    const defId = effect.defId;
    if (!EFFECT_DEFAULTS[defId] && !LEGACY_ALIASES.has(defId)) {
      throw new Error(`${label} effect ${index + 1} (${defId || 'unknown'}): Unsupported Wobbletone effect: ${defId}`);
    }
  });
  return specFromLegacy(preset.effects, preset.name);
}

export function translateWobbletonePreset(preset, overrides = {}) {
  const spec = wobbletoneSpecFrom(preset);
  return validateFilter({
    id: overrides.id || preset.id,
    name: overrides.name || preset.name || spec.name,
    spec,
  });
}

// Filter Specification shorthand — entries are validated/normalised in
// place by validateFilter at module load.
const spec = (effects) => ({ format: SPEC_FORMAT, version: SPEC_VERSION, effects });

export const FILTERS = [
  { id: 'pop', name: 'Pop', spec: spec([
    { type: 'contrast', params: { v: 118 } },
    { type: 'saturate', params: { v: 135 } },
    { type: 'brightness', params: { v: 102 } },
  ]) },
  { id: 'old-film', name: 'Old film', spec: spec([
    { type: 'sepia', params: { v: 35 } },
    { type: 'contrast', params: { v: 90 } },
    { type: 'brightness', params: { v: 105 } },
    { type: 'saturate', params: { v: 85 } },
    { type: 'overlay', params: { kind: 'radial', stops: [[0.6, 'transparent'], [1, 'rgba(40,20,0,0.4)']], blend: 'multiply', opacity: 100 } },
  ]) },
  { id: 'black-and-white', name: 'Black and white', spec: spec([
    { type: 'grayscale', params: { v: 100 } },
    { type: 'contrast', params: { v: 110 } },
    { type: 'brightness', params: { v: 98 } },
  ]) },
  { id: 'original', name: 'Original', spec: spec([]) },
  { id: 'noire', name: 'Noire', spec: spec([
    { type: 'grayscale', params: { v: 100 } },
    { type: 'contrast', params: { v: 175 } },
    { type: 'brightness', params: { v: 85 } },
    { type: 'overlay', params: { kind: 'radial', stops: [[0.4, 'transparent'], [1, 'rgba(0,0,0,0.85)']], blend: 'normal', opacity: 100 } },
  ]) },
  { id: 'sepia', name: 'Sepia', spec: spec([
    { type: 'sepia', params: { v: 90 } },
    { type: 'contrast', params: { v: 95 } },
    { type: 'brightness', params: { v: 90 } },
    { type: 'saturate', params: { v: 110 } },
  ]) },
  { id: 'muted', name: 'Muted', spec: spec([
    { type: 'saturate', params: { v: 55 } },
    { type: 'contrast', params: { v: 85 } },
    { type: 'brightness', params: { v: 105 } },
  ]) },
  { id: 'cold', name: 'Cold', spec: spec([
    { type: 'hue', params: { v: 180 } },
    { type: 'sepia', params: { v: 45 } },
    { type: 'hue', params: { v: 200 } }, // -160deg ≡ +200deg; registry clamps 0–360
    { type: 'saturate', params: { v: 80 } },
    { type: 'contrast', params: { v: 105 } },
    { type: 'brightness', params: { v: 98 } },
  ]) },
  { id: 'trippy-1', name: 'Trippy 1', spec: spec([
    { type: 'invert', params: { v: 100 } },
    { type: 'hue', params: { v: 180 } },
    { type: 'saturate', params: { v: 200 } },
    { type: 'contrast', params: { v: 130 } },
  ]) },
  { id: 'trippy-2', name: 'Trippy 2', spec: spec([
    { type: 'hue', params: { v: 290 } },
    { type: 'saturate', params: { v: 350 } },
    { type: 'contrast', params: { v: 140 } },
    { type: 'brightness', params: { v: 110 } },
  ]) },
  { id: 'trippy-3', name: 'Trippy 3', spec: spec([
    { type: 'invert', params: { v: 30 } },
    { type: 'hue', params: { v: 90 } },
    { type: 'saturate', params: { v: 250 } },
    { type: 'contrast', params: { v: 200 } },
    { type: 'overlay', params: { kind: 'linear', angle: 45, stops: [[0, 'rgba(255,0,128,0.5)'], [1, 'rgba(0,255,200,0.5)']], blend: 'color-dodge', opacity: 100 } },
  ]) },
  translateWobbletonePreset({
    id: '01511ff0-3806-4525-8fa3-25e4112d8ece',
    name: 'psych-post-2',
    effects: [
      { defId: 'saturate', enabled: true, params: { v: 120 } },
      { defId: 'vignette', enabled: true, params: { color: '#000000', size: 60, opacity: 56 } },
      { defId: 'blur', enabled: true, params: { v: 8.7 } },
      { defId: 'posterize', enabled: true, params: { steps: 10 } },
      { defId: 'grain', enabled: true, params: { size: 1.4, opacity: 44, blend: 'overlay' } },
      { defId: 'psychedelic', enabled: true, params: { saturate: 280, contrast: 130, bands: 8, solarize: 60 } },
    ],
  }, { id: 'psych-post-2', name: 'Psych post 2' }),
];

// A filter preset is { id, name, spec } — the spec is the renderable form.
// Validating normalises params (clamps, defaults) in place.
export function validateFilter(filter) {
  if (!filter || !/^[a-z0-9-]+$/.test(filter.id || '') || !String(filter.name || '').trim()) throw new Error('Invalid Aimless filter preset');
  if (!filter.spec || typeof filter.spec !== 'object') throw new Error('Invalid Aimless filter preset: missing spec');
  filter.spec = validateSpec(filter.spec);
  return filter;
}

FILTERS.forEach(validateFilter);

// Imported filters live in the 'filters' IndexedDB store; index.html
// hydrates this list at startup and after every import/delete.
let importedFilters = [];

export function setImportedFilters(filters) {
  importedFilters = (filters || []).map((filter) => validateFilter(filter));
  return importedFilters;
}

export function allFilters() {
  return [...FILTERS, ...importedFilters];
}

export function getFilter(id) {
  return allFilters().find((filter) => filter.id === id) || FILTERS.find((filter) => filter.id === 'original');
}

// Parse pasted/file JSON into a validated {id, name, spec} record for the
// filters store. Accepts a bare Filter Spec, a {spec} record, or a legacy
// v1 {effects} preset. `takenIds` are extra ids to avoid (live imports).
export function importFilterSpec(input, takenIds = []) {
  let parsed;
  try {
    parsed = typeof input === 'string' ? JSON.parse(input) : input;
  } catch {
    throw new Error('Not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Not a filter specification');
  const name = String(parsed.name || (parsed.spec && parsed.spec.name) || '').trim() || 'Imported';
  const taken = new Set([...FILTERS.map((filter) => filter.id), ...takenIds]);
  let id = /^[a-z0-9-]+$/.test(parsed.id || '')
    ? parsed.id
    : (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'imported');
  for (let n = 2; taken.has(id); n += 1) id = `${id.replace(/-\d+$/, '')}-${n}`;
  return translateWobbletonePreset(parsed, { id, name });
}
