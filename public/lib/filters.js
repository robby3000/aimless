import { SPEC_FORMAT, SPEC_VERSION, validateSpec, specFromLegacy } from './engine/spec.js';

// Legacy Wobbletone ids that migrate into current spec types.
const LEGACY_ALIASES = new Set(['glow', 'halation']);

// Wobbletone v1 defIds accepted on import (the engine registry names).
const EFFECT_DEFAULTS = {
  brightness: { v: 110 }, contrast: { v: 110 }, saturate: { v: 120 }, hue: { v: 0 }, sepia: { v: 60 }, invert: { v: 100 }, blur: { v: 1 }, opacity: { v: 80 },
  grayscale: { filter: 'None', intensity: 50, exposure: 0, contrast: 0, shadows: 0, highlights: 0 },
  mixer: { mode: 'Gain', r: 100, g: 100, b: 100, offset: 0 },
  duotone: { shadow: '#1a0d3d', highlight: '#ff5c8a', contrast: 20 },
  tritone: { shadow: '#0b1d3a', mid: '#c44d4d', highlight: '#ffe8a3' }, posterize: { steps: 5 }, heatmap: { intensity: 100 },
  drama: { style: 'Cinematic', strength: 70, shadows: 0, highlights: 0, saturation: 100 },
  shadowshighlights: { shadows: 40, highlights: -20 },
  bloom: { blur: 12, threshold: 140, contrast: 180, saturate: 100, opacity: 50, color: '#ffffff', tint: 0, blend: 'screen' },
  chromatic: { offset: 4, strength: 70 }, colorwash: { color: '#7c5cff', blend: 'overlay', opacity: 40 },
  gradient: { c1: '#ff5c8a', c2: '#7c5cff', angle: 135, blend: 'soft-light', opacity: 50 },
  grain: { size: 0.9, opacity: 25, blend: 'overlay' }, vignette: { color: '#000000', size: 60, opacity: 50 },
  scanlines: { size: 3, color: '#000000', opacity: 30, blend: 'multiply' }, prism: { c1: '#ff2e88', c2: '#2effd5', angle: 45, width: 20, opacity: 35 },
  glitch: { style: 'CCD Failure', amount: 42, bandSize: 28, split: 6, corrupt: 40, blocks: 0, seed: 317 },
  liquid: { intensity: 30, waveX: 20, waveY: 20, flow: 'organic', noise: 'fractal', octaves: 2, seed: 1, softness: 0, highlight: 0, mix: 0 },
  specular: { surfaceScale: 2, strength: 40, shininess: 25, color: '#ffffff', azimuth: 315, elevation: 45, bumpBlur: 0, source: 'luminance', blend: 'screen', opacity: 100 },
  morphology: { op: 'dilate', radiusX: 4, radiusY: 4 },
  outline: { threshold: 15, width: 1, color: '#101010', detail: 0, softness: 0, surface: 'original', opacity: 100 },
  echo: { count: 2, distance: 30, direction: 0, decay: 55, blur: 0, blend: 'normal', opacity: 60 },
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
  { id: 'original', name: 'Original', spec: spec([

  ]) },
  { id: 'pop', name: 'Pop', spec: spec([
    { type: 'saturate', params: {v:128} },
    { type: 'contrast', params: {v:112} },
    { type: 'brightness', params: {v:103} },
  ]) },
  { id: 'old-film', name: 'Old film', spec: spec([
    { type: 'sepia', params: {v:14} },
    { type: 'contrast', params: {v:94} },
    { type: 'saturate', params: {v:85} },
    { type: 'brightness', params: {v:103} },
    { type: 'colorwash', params: {color:"#9aa05a", blend:"soft-light", opacity:8} },
    { type: 'grain', params: {size:0.9, opacity:25, blend:"overlay", seed:1} },
  ]) },
  { id: 'soft', name: 'Soft', spec: spec([
    { type: 'shadowshighlights', params: {shadows:-11, highlights:-20} },
    { type: 'contrast', params: {v:90} },
    { type: 'saturate', params: {v:96} },
    { type: 'bloom', params: {blur:10, threshold:220, contrast:130, saturate:100, opacity:12, color:"#ffffff", tint:0, blend:"screen"} },
    { type: 'blur', params: {v:0.3} },
  ]) },
  { id: 'cold', name: 'Cold', spec: spec([
    { type: 'saturate', params: {v:85} },
    { type: 'mixer', params: {mode:"Gain", r:80, g:95, b:110, offset:4} },
  ]) },
  { id: 'warm', name: 'Warm', spec: spec([
    { type: 'mixer', params: {mode:"Gain", r:100, g:90, b:80, offset:4} },
  ]) },
  { id: 'muted', name: 'Muted', spec: spec([
    { type: 'saturate', params: {v:30} },
    { type: 'contrast', params: {v:96} },
  ]) },
  { id: 'darker-sky', name: 'Darker sky', spec: spec([
    { type: 'shadowshighlights', params: {shadows:56, highlights:-60} },
    { type: 'contrast', params: {v:176} },
    { type: 'gradient', params: {"c1":"#2a1d3a","c2":"#feffd1", angle:180, blend:"multiply", opacity:80} },
    { type: 'saturate', params: {v:75} },
  ]) },
  { id: 'black-and-white', name: 'B&W', spec: spec([
    { type: 'grayscale', params: {exposure:0, contrast:8, shadows:0, highlights:0, filter:"Yellow", intensity:30} },
  ]) },
  { id: 'grainy-bw', name: 'Grainy B&W', spec: spec([
    { type: 'grayscale', params: {exposure:0, contrast:8, shadows:0, highlights:0, filter:"Yellow", intensity:26} },
    { type: 'grain', params: {size:0.9, opacity:25, blend:"overlay", seed:1} },
  ]) },
  { id: 'hitch', name: 'Hitch', spec: spec([
    { type: 'tritone', params: {shadow:"#000c1f", mid:"#858386", highlight:"#fff9f0"} },
    { type: 'grain', params: {size:0.9, opacity:25, blend:"overlay", seed:1} },
  ]) },
  { id: 'sepia', name: 'Sepia', spec: spec([
    { type: 'duotone', params: {shadow:"#231106", highlight:"#fff2e5", contrast:65} },
    { type: 'contrast', params: {v:117} },
    { type: 'grain', params: {size:0.9, opacity:25, blend:"overlay", seed:1} },
    { type: 'vignette', params: {color:"#000000", size:20, opacity:3} },
  ]) },
  { id: 'noire', name: 'Noire', spec: spec([
    { type: 'grayscale', params: {exposure:5, contrast:35, shadows:15, highlights:21, filter:"Red", intensity:84} },
    { type: 'vignette', params: {color:"#000000", size:20, opacity:10} },
    { type: 'grain', params: {size:0.8, opacity:25, blend:"overlay", seed:1} },
  ]) },
  { id: 'bw-infrared', name: 'B&W infrared', spec: spec([
    { type: 'infrared', params: {intensity:76} },
    { type: 'hue', params: {v:88} },
    { type: 'invert', params: {v:100} },
    { type: 'contrast', params: {v:136} },
    { type: 'brightness', params: {v:92} },
    { type: 'gradient', params: {"c1":"#030303","c2":"#ffffff", angle:180, blend:"multiply", opacity:18} },
    { type: 'grayscale', params: {exposure:8, contrast:0, shadows:0, highlights:0, filter:"Blue", intensity:79} },
    { type: 'grain', params: {size:0.7, opacity:20, blend:"overlay", seed:1} },
  ]) },
  { id: 'ortho', name: 'Ortho', spec: spec([
    { type: 'grayscale', params: {exposure:12, contrast:15, shadows:0, highlights:0, filter:"Blue", intensity:65} },
    { type: 'grain', params: {size:0.9, opacity:25, blend:"overlay", seed:1} },
  ]) },
  { id: 'daido', name: 'Daidō', spec: spec([
    { type: 'grayscale', params: {exposure:0, contrast:17, shadows:-30, highlights:0, filter:"Orange", intensity:60} },
    { type: 'blur', params: {v:0.5} },
    { type: 'grain', params: {size:1.3, opacity:70, blend:"soft-light", seed:1} },
  ]) },
  { id: 'mappage', name: 'Mappage', spec: spec([
    { type: 'blur', params: {v:2.3} },
    { type: 'posterize', params: {steps:5} },
    { type: 'saturate', params: {v:151} },
    { type: 'hue', params: {v:298} },
  ]) },
  { id: 'electronica', name: 'Electronica', spec: spec([
    { type: 'glitch', params: {style:"CCD Failure", amount:68, bandSize:62, split:27, corrupt:64, blocks:73, seed:9847} },
    { type: 'chromatic', params: {offset:5, strength:29} },
    { type: 'grayscale', params: {exposure:28, contrast:15, shadows:-83, highlights:-84, filter:"Green", intensity:69} },
  ]) },
  { id: 'cadsabest', name: 'Cadsabest', spec: spec([
    { type: 'chromatic', params: {offset:14.815691480433532, strength:17} },
    { type: 'scanlines', params: {size:4.885392349499605, color:"#f8dabf", opacity:79, blend:"multiply"} },
    { type: 'colorwash', params: {color:"#a4a98a", blend:"multiply", opacity:74} },
    { type: 'heatmap', params: {intensity:70} },
    { type: 'glitch', params: {style:"CCD Failure", amount:81, bandSize:65, split:12.735080652804012, corrupt:35, blocks:83, seed:775} },
  ]) },
  { id: 'jellyfish', name: 'Jellyfish', spec: spec([
    { type: 'tritone', params: {shadow:"#34728b", mid:"#449e1e", highlight:"#ac43aa"} },
    { type: 'outline', params: {threshold:67, width:4.989490829568712, color:"#6855de", detail:6.235755150030766, softness:3.7753036360923877, surface:"original", opacity:17} },
    { type: 'chromatic', params: {offset:17.81162757698844, strength:11} },
    { type: 'glitch', params: {style:"CCD Failure", amount:52, bandSize:31, split:11.342138842282731, corrupt:49, blocks:25, seed:151} },
  ]) },
  { id: 'philly-cheese', name: 'Philly cheese', spec: spec([
    { type: 'posterize', params: {steps:11} },
    { type: 'psychedelic', params: {saturate:315, contrast:90, bands:11, solarize:7} },
    { type: 'dropshadow', params: {x:-29, y:-19, blur:6, color:"#fd08ba"} },
    { type: 'glitch', params: {style:"VHS Tear", amount:92, bandSize:85, split:26, corrupt:35, blocks:18, seed:5688} },
  ]) },
  { id: 'aubrey', name: 'Aubrey', spec: spec([
    { type: 'grain', params: {size:1.1590650389208066, opacity:7, blend:"screen", seed:1} },
    { type: 'tritone', params: {shadow:"#e60679", mid:"#d7b286", highlight:"#603f9c"} },
    { type: 'psychedelic', params: {saturate:125, contrast:198, bands:10, solarize:75} },
    { type: 'invert', params: {v:6} },
    { type: 'chromatic', params: {offset:14.647635615805326, strength:93} },
  ]) },
  { id: 'hiro', name: 'Hiro', spec: spec([
    { type: 'outline', params: {threshold:37, width:0, color:"#baf4f7", detail:10, softness:2, surface:"original", opacity:86} },
    { type: 'vignette', params: {color:"#5ed774", size:37, opacity:23} },
    { type: 'echo', params: {count:4, distance:28, direction:296, decay:59, blur:14, blend:"lighten", opacity:68} },
    { type: 'gradient', params: {"c1":"#63f606","c2":"#e652f6", angle:231, blend:"multiply", opacity:98} },
    { type: 'psychedelic', params: {saturate:308, contrast:194, bands:3, solarize:76} },
    { type: 'posterize', params: {steps:15} },
  ]) },
  { id: 'gizme', name: 'Gizme', spec: spec([
    { type: 'blur', params: {v:7.733735687148187} },
    { type: 'posterize', params: {steps:9} },
    { type: 'vintage', params: {sepia:84, contrast:72, saturate:88, brightness:134} },
    { type: 'glitch', params: {style:"VHS Tear", amount:86, bandSize:86, split:19.133280448650687, corrupt:43, blocks:77, seed:5120} },
  ]) },
  { id: 'earlswood', name: 'Earlswood', spec: spec([
    { type: 'colorwash', params: {color:"#5c89fd", blend:"multiply", opacity:91} },
    { type: 'vignette', params: {color:"#269ceb", size:61, opacity:64} },
    { type: 'drama', params: {style:"Storm", strength:82, shadows:-16, highlights:1, saturation:42} },
    { type: 'chromatic', params: {offset:16.811813013112648, strength:73} },
    { type: 'contrast', params: {v:95} },
    { type: 'hue', params: {v:221} },
  ]) },
  { id: 'gdansk-65', name: 'Gdańsk 65', spec: spec([
    { type: 'contrast', params: {v:133} },
    { type: 'vignette', params: {color:"#000000", size:35, opacity:36} },
    { type: 'blur', params: {v:4.6} },
    { type: 'glitch', params: {style:"CCD Failure", amount:66, bandSize:56, split:15.5, corrupt:40, blocks:0, seed:3149} },
    { type: 'hue', params: {v:61} },
    { type: 'gradient', params: {"c1":"#70182b","c2":"#0e6666", angle:200, blend:"overlay", opacity:100} },
    { type: 'chromatic', params: {offset:12.5, strength:70} },
    { type: 'scanlines', params: {size:7, color:"#b3eeff", opacity:75, blend:"screen"} },
  ]) },
  { id: 'daguerre', name: 'Daguerre', spec: spec([
    { type: 'specular', params: {surfaceScale:4, strength:11, shininess:69, color:"#121b1f", azimuth:276, elevation:83, bumpBlur:0, source:"alpha", blend:"lighten", opacity:90} },
    { type: 'psychedelic', params: {saturate:387, contrast:91, bands:7, solarize:91} },
    { type: 'shadowshighlights', params: {shadows:-72, highlights:93} },
    { type: 'gradient', params: {"c1":"#08fbae","c2":"#4d94b1", angle:278, blend:"color-dodge", opacity:32} },
    { type: 'vintage', params: {sepia:97, contrast:110, saturate:76, brightness:118} },
    { type: 'grain', params: {size:0.9, opacity:25, blend:"overlay", seed:1} },
  ]) },
  { id: 'schrader', name: 'Šchrader', spec: spec([
    { type: 'psychedelic', params: {saturate:236, contrast:193, bands:11, solarize:1} },
    { type: 'brightness', params: {v:70} },
    { type: 'bloom', params: {blur:42.39668401728494, threshold:202, contrast:204, saturate:99, opacity:57, color:"#eab440", tint:99, blend:"screen"} },
    { type: 'contrast', params: {v:129} },
    { type: 'shadowshighlights', params: {shadows:-21, highlights:100} },
    { type: 'liquid', params: {intensity:73, waveX:51, waveY:72, flow:"organic", noise:"turbulence", octaves:3, seed:2236, softness:12.847004728451399, highlight:87, mix:66} },
  ]) },
  { id: 'radar-station', name: 'Radar station', spec: spec([
    { type: 'shadowshighlights', params: {shadows:34, highlights:23} },
    { type: 'hue', params: {v:44} },
    { type: 'saturate', params: {v:163} },
    { type: 'posterize', params: {steps:5} },
    { type: 'bloom', params: {blur:23.4204781087444, threshold:308, contrast:121, saturate:9, opacity:25, color:"#2ba171", tint:46, blend:"screen"} },
  ]) },
  { id: 'bender', name: 'Bender', spec: spec([
    { type: 'glitch', params: {style:"Signal Loss", amount:100, bandSize:100, split:30, corrupt:100, blocks:75, seed:1195} },
    { type: 'brightness', params: {v:94} },
    { type: 'shadowshighlights', params: {shadows:31, highlights:91} },
    { type: 'chromatic', params: {offset:7.2227948584769734, strength:58} },
  ]) },
  { id: 'impaired', name: 'Impaired', spec: spec([
    { type: 'morphology', params: {op:"dilate", radiusX:2, radiusY:9} },
    { type: 'colorwash', params: {color:"#4f79a9", blend:"multiply", opacity:99} },
    { type: 'liquid', params: {intensity:5, waveX:29, waveY:94, flow:"vertical", noise:"turbulence", octaves:2, seed:8933, softness:11.574712639462748, highlight:29, mix:32} },
    { type: 'brightness', params: {v:170} },
    { type: 'glitch', params: {style:"VHS Tear", amount:54, bandSize:14, split:3.972251833200695, corrupt:74, blocks:74, seed:3620} },
  ]) },
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
  // Rail order is oldest to newest so the latest save/import lands next to
  // the action tokens. Records from before createdAt existed keep their
  // store order ahead of dated ones (sort is stable, missing = 0).
  importedFilters.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return importedFilters;
}

export function allFilters() {
  return [...FILTERS, ...importedFilters];
}

// Built-ins can't be deleted (they're code), only hidden — the picker rail
// and management sheet show visibleFilters(); getFilter still resolves a
// hidden id so saved walks render whatever they referenced.
let hiddenFilterIds = new Set();
export function setHiddenFilters(ids) { hiddenFilterIds = new Set(ids || []); }
export function hiddenFilters() { return [...hiddenFilterIds]; }
export function hideFilter(id) { hiddenFilterIds.add(id); }
export function unhideFilter(id) { hiddenFilterIds.delete(id); }
export function isFilterHidden(id) { return hiddenFilterIds.has(id); }
export function visibleFilters() {
  return allFilters().filter((filter) => !hiddenFilterIds.has(filter.id));
}

export function getFilter(id) {
  return allFilters().find((filter) => filter.id === id) || FILTERS.find((filter) => filter.id === 'original');
}

// Per-photo override: a photo pinned to a filter by the Walk Detail
// selection UI carries `filterId`; absent, the walk-wide choice applies.
export function effectiveFilterId(photo, fallbackId) {
  return photo?.filterId ?? fallbackId;
}

// A Surprise roll stores its generated spec on the photo record itself —
// it wins over both the per-photo filterId and the walk-wide pref.
// Choosing a named filter afterwards clears it (index.html).
export function effectiveSpec(photo, fallbackId) {
  return photo?.filterSpec ?? getFilter(effectiveFilterId(photo, fallbackId))?.spec;
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

// Parse pasted/file JSON into store records. A bare Filter Spec or single
// preset record imports as one filter via importFilterSpec (unchanged slug
// dedup). A Wobbletone Export All archive imports every preset at once;
// a preset whose id or name matches an existing imported filter overwrites
// it, so tweak-in-Wobbletone/re-import cycles don't stack up -2 copies.
// Presets that fail validation are skipped and reported, not fatal.
export function importFilterPayload(input, takenIds = [], imported = []) {
  let parsed;
  try {
    parsed = typeof input === 'string' ? JSON.parse(input) : input;
  } catch {
    throw new Error('Not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.schema !== 'wobbletone-presets') {
    return { records: [importFilterSpec(parsed, takenIds)], errors: [] };
  }
  if (![1, 2].includes(parsed.version) || !Array.isArray(parsed.presets)) {
    throw new Error('Unsupported Wobbletone preset archive');
  }
  const taken = new Set([...FILTERS.map((filter) => filter.id), ...takenIds]);
  const byId = new Map();
  const byName = new Map();
  for (const filter of imported || []) {
    if (filter && filter.id && !byId.has(filter.id)) byId.set(filter.id, filter);
    const key = String((filter && filter.name) || '').toLowerCase();
    if (key && !byName.has(key)) byName.set(key, filter);
  }
  const records = [];
  const errors = [];
  for (const preset of parsed.presets) {
    try {
      const spec = wobbletoneSpecFrom(preset);
      const name = String((preset && preset.name) || spec.name || 'Imported').trim() || 'Imported';
      const existing = (preset && preset.id && byId.get(preset.id)) || byName.get(name.toLowerCase());
      let id;
      if (existing) {
        id = existing.id;
      } else {
        id = /^[a-z0-9-]+$/.test((preset && preset.id) || '') ? preset.id
          : (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'imported');
        for (let n = 2; taken.has(id); n += 1) id = `${id.replace(/-\d+$/, '')}-${n}`;
      }
      taken.add(id);
      records.push({ ...validateFilter({ id, name, spec }), createdAt: existing ? existing.createdAt : undefined });
    } catch (err) {
      errors.push(err.message);
    }
  }
  if (!records.length && errors.length) throw new Error(errors[0]);
  return { records, errors };
}

// Serialize a filter for file export — a bare Filter Spec, the same shape
// the Wobbletone Code tab emits, so the file round-trips through
// importFilterSpec here and through preset import there.
export function filterSpecJson(filter, name) {
  return JSON.stringify({ ...filter.spec, name: name ?? filter.name }, null, 2) + '\n';
}

