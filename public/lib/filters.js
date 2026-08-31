const CSS_FILTER_EFFECTS = new Set([
  'brightness', 'contrast', 'saturate', 'hue', 'sepia', 'grayscale', 'invert',
  'blur', 'opacity', 'infrared', 'vintage', 'dropshadow', 'psychedelic',
]);

const PIXEL_EFFECTS = new Set(['duotone', 'tritone', 'posterize', 'heatmap', 'drama', 'chromatic', 'glitch']);
const OVERLAY_EFFECTS = new Set(['colorwash', 'gradient', 'vignette', 'scanlines', 'prism']);
const OPERATION_KINDS = new Set(['css-filter', 'pixel', 'overlay', 'grain', 'bloom']);

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
  glitch: { style: 'CCD Failure', amount: 42, bandSize: 28, split: 6, seed: 317 },
  psychedelic: { saturate: 280, contrast: 130, speed: 8, animate: 'yes' }, infrared: { intensity: 70 },
  vintage: { sepia: 45, contrast: 95, saturate: 80, brightness: 105 }, dropshadow: { x: 0, y: 8, blur: 16, color: '#7c5cff' },
};

const DRAMA_LOOKS = {
  cinematic: { curve: [0, 0.18, 0.52, 0.82, 1], saturation: 0.9, shadow: [-0.015, 0.002, 0.025], highlight: [0.028, 0.012, -0.01] },
  noir: { curve: [0, 0.11, 0.5, 0.9, 1], saturation: 0, shadow: [0, 0, 0], highlight: [0, 0, 0] },
  bleach: { curve: [0.035, 0.19, 0.53, 0.86, 0.99], saturation: 0.38, shadow: [-0.01, 0, 0.012], highlight: [0.024, 0.018, 0] },
  storm: { curve: [0, 0.14, 0.46, 0.76, 0.94], saturation: 0.72, shadow: [-0.015, 0.004, 0.04], highlight: [-0.006, 0.004, 0.022] },
  portrait: { curve: [0.018, 0.23, 0.51, 0.79, 0.985], saturation: 0.95, shadow: [0, 0, 0.006], highlight: [0.032, 0.014, -0.006] },
};

const GLITCH_PROFILES = {
  'ccd-failure': { displacement: 0.58, active: 0.46, exposure: 0.22, split: 0.8, frequencyX: 0.006, octaves: 1, noise: 'turbulence' },
  'vhs-tear': { displacement: 0.38, active: 0.72, exposure: 0.08, split: 0.55, frequencyX: 0.003, octaves: 2, noise: 'fractalNoise' },
  'rgb-fracture': { displacement: 0.14, active: 0.3, exposure: 0, split: 1.7, frequencyX: 0.012, octaves: 1, noise: 'turbulence' },
  'signal-loss': { displacement: 0.68, active: 0.56, exposure: 0.42, split: 0.45, frequencyX: 0.004, octaves: 1, noise: 'turbulence' },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const number = (value, fallback = 0) => value != null && String(value).trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : fallback;
const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function hexToRgb(hex) {
  const raw = String(hex || '#000000').replace('#', '');
  const value = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw.padEnd(6, '0').slice(0, 6);
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function rgb01(hex) {
  return hexToRgb(hex).map((value) => (value / 255).toFixed(3));
}

export function dramaSettings(params) {
  const look = DRAMA_LOOKS[String(params.style || 'cinematic').toLowerCase()] || DRAMA_LOOKS.cinematic;
  const strength = clamp(number(params.strength), 0, 100) / 100;
  const shadows = clamp(number(params.shadows), -50, 50) / 50 * 0.12 * strength;
  const highlights = clamp(number(params.highlights), -50, 50) / 50 * 0.12 * strength;
  const requestedSaturation = clamp(number(params.saturation, 100), 0, 150) / 100;
  const saturation = 1 + (look.saturation * requestedSaturation - 1) * strength;
  const tables = [0, 1, 2].map((channel) => {
    let previous = 0;
    return Array.from({ length: 17 }, (_, index) => {
      const x = index / 16;
      const position = x * (look.curve.length - 1);
      const lower = Math.floor(position);
      const upper = Math.min(look.curve.length - 1, lower + 1);
      const styled = look.curve[lower] + (look.curve[upper] - look.curve[lower]) * (position - lower);
      const tone = x + (styled - x) * strength + shadows * (1 - x) ** 2 + highlights * x ** 2;
      const grade = (look.shadow[channel] * (1 - x) + look.highlight[channel] * x) * strength;
      const value = Math.max(previous, clamp(tone + grade, 0, 1));
      previous = value;
      return value;
    });
  });
  return { saturation, tables };
}

export function glitchSettings(params) {
  const style = String(params.style || 'CCD Failure').toLowerCase().replace(/\s+/g, '-');
  const profile = GLITCH_PROFILES[style] || GLITCH_PROFILES['ccd-failure'];
  const amount = clamp(number(params.amount), 0, 100) / 100;
  const bandSize = clamp(number(params.bandSize, 28), 1, 100) / 100;
  const split = clamp(number(params.split), 0, 30) * profile.split * amount;
  return {
    style, profile, amount, bandSize, split,
    displacement: amount * 100 * profile.displacement,
    frequencyY: 0.015 + (1 - bandSize) * 0.1,
    seed: Math.round(clamp(number(params.seed, 1), 1, 9999)),
  };
}

function cssFilterForEffect(effect) {
  const p = effect.params || {};
  if (effect.defId === 'brightness') return `brightness(${p.v}%)`;
  if (effect.defId === 'contrast') return `contrast(${p.v}%)`;
  if (effect.defId === 'saturate') return `saturate(${p.v}%)`;
  if (effect.defId === 'hue') return `hue-rotate(${p.v}deg)`;
  if (effect.defId === 'sepia') return `sepia(${p.v}%)`;
  if (effect.defId === 'grayscale') return `grayscale(${p.v}%)`;
  if (effect.defId === 'invert') return `invert(${p.v}%)`;
  if (effect.defId === 'blur') return `blur(${p.v}px)`;
  if (effect.defId === 'opacity') return `opacity(${p.v}%)`;
  if (effect.defId === 'infrared') {
    const intensity = number(p.intensity) / 100;
    return `invert(${(intensity * 100).toFixed(0)}%) hue-rotate(${(180 * intensity).toFixed(0)}deg) saturate(${(120 + 80 * intensity).toFixed(0)}%)`;
  }
  if (effect.defId === 'vintage') return `sepia(${p.sepia}%) contrast(${p.contrast}%) saturate(${p.saturate}%) brightness(${p.brightness}%)`;
  if (effect.defId === 'dropshadow') return `drop-shadow(${p.x}px ${p.y}px ${p.blur}px ${p.color})`;
  if (effect.defId === 'psychedelic') return `saturate(${p.saturate}%) contrast(${p.contrast}%)`;
  throw new Error(`Unsupported CSS filter effect: ${effect.defId}`);
}

export function translateWobbletoneEffect(effect) {
  if (!effect || effect.enabled === false) return null;
  if (!effect.defId || typeof effect.params !== 'object') throw new Error('Invalid Wobbletone effect');
  const defaults = EFFECT_DEFAULTS[effect.defId];
  if (!defaults) throw new Error(`Unsupported Wobbletone effect: ${effect.defId}`);
  const params = { ...defaults, ...effect.params };
  const normalized = { ...effect, params };
  if (CSS_FILTER_EFFECTS.has(effect.defId)) {
    const operation = { kind: 'css-filter', value: cssFilterForEffect(normalized) };
    if (effect.defId === 'psychedelic' && params.animate === 'yes') operation.animation = { name: 'hue-cycle', duration: Math.max(0.1, number(params.speed, 8)) };
    return operation;
  }
  if (PIXEL_EFFECTS.has(effect.defId)) return { kind: 'pixel', effect: effect.defId, params };
  if (OVERLAY_EFFECTS.has(effect.defId)) return { kind: 'overlay', effect: effect.defId, params };
  if (effect.defId === 'grain') return { kind: 'grain', params };
  if (effect.defId === 'bloom') return { kind: 'bloom', params };
  throw new Error(`Unsupported Wobbletone effect: ${effect.defId}`);
}

export function translateWobbletoneArchive(archive) {
  if (!archive || archive.schema !== 'wobbletone-presets' || archive.version !== 1 || !Array.isArray(archive.presets)) throw new Error('Unsupported Wobbletone preset archive');
  return archive.presets.map((preset) => translateWobbletonePreset(preset));
}

export function translateWobbletonePreset(preset, overrides = {}) {
  if (!preset || !Array.isArray(preset.effects)) throw new Error('Invalid Wobbletone preset');
  const operations = preset.effects.map((effect, index) => {
    try {
      return translateWobbletoneEffect(effect);
    } catch (err) {
      throw new Error(`Preset "${preset.name || 'Untitled'}" effect ${index + 1} (${effect?.defId || 'unknown'}): ${err.message}`);
    }
  }).filter(Boolean);
  const translated = {
    id: overrides.id || preset.id,
    name: overrides.name || preset.name,
    operations,
  };
  validateFilter(translated);
  return translated;
}

export const FILTERS = [
  { id: 'pop', name: 'Pop', operations: [{ kind: 'css-filter', value: 'contrast(118%) saturate(135%) brightness(102%)' }] },
  {
    id: 'old-film', name: 'Old film', operations: [
      { kind: 'css-filter', value: 'sepia(35%) contrast(90%) brightness(105%) saturate(85%)' },
      { kind: 'overlay', effect: 'gradient', params: { kind: 'radial', stops: [[0.6, 'transparent'], [1, 'rgba(40,20,0,0.4)']], blend: 'multiply', opacity: 100 } },
    ],
  },
  { id: 'black-and-white', name: 'Black and white', operations: [{ kind: 'css-filter', value: 'grayscale(100%) contrast(110%) brightness(98%)' }] },
  { id: 'original', name: 'Original', operations: [] },
  {
    id: 'noire', name: 'Noire', operations: [
      { kind: 'css-filter', value: 'grayscale(100%) contrast(175%) brightness(85%)' },
      { kind: 'overlay', effect: 'gradient', params: { kind: 'radial', stops: [[0.4, 'transparent'], [1, 'rgba(0,0,0,0.85)']], blend: 'normal', opacity: 100 } },
    ],
  },
  { id: 'sepia', name: 'Sepia', operations: [{ kind: 'css-filter', value: 'sepia(90%) contrast(95%) brightness(90%) saturate(110%)' }] },
  { id: 'muted', name: 'Muted', operations: [{ kind: 'css-filter', value: 'saturate(55%) contrast(85%) brightness(105%)' }] },
  { id: 'cold', name: 'Cold', operations: [{ kind: 'css-filter', value: 'hue-rotate(180deg) sepia(45%) hue-rotate(-160deg) saturate(80%) contrast(105%) brightness(98%)' }] },
  { id: 'trippy-1', name: 'Trippy 1', operations: [{ kind: 'css-filter', value: 'invert(100%) hue-rotate(180deg) saturate(200%) contrast(130%)' }] },
  { id: 'trippy-2', name: 'Trippy 2', operations: [{ kind: 'css-filter', value: 'hue-rotate(290deg) saturate(350%) contrast(140%) brightness(110%)' }] },
  {
    id: 'trippy-3', name: 'Trippy 3', operations: [
      { kind: 'css-filter', value: 'invert(30%) hue-rotate(90deg) saturate(250%) contrast(200%)' },
      { kind: 'overlay', effect: 'gradient', params: { kind: 'linear', angle: 45, stops: [[0, 'rgba(255,0,128,0.5)'], [1, 'rgba(0,255,200,0.5)']], blend: 'color-dodge', opacity: 100 } },
    ],
  },
  translateWobbletonePreset({
    id: '01511ff0-3806-4525-8fa3-25e4112d8ece',
    name: 'psych-post-2',
    effects: [
      { defId: 'saturate', enabled: true, params: { v: 120 } },
      { defId: 'vignette', enabled: true, params: { color: '#000000', size: 60, opacity: 56 } },
      { defId: 'blur', enabled: true, params: { v: 8.7 } },
      { defId: 'posterize', enabled: true, params: { steps: 10 } },
      { defId: 'grain', enabled: true, params: { size: 1.4, opacity: 44, blend: 'overlay' } },
      { defId: 'psychedelic', enabled: true, params: { saturate: 280, contrast: 130, speed: 20, animate: 'yes' } },
    ],
  }, { id: 'psych-post-2', name: 'Psych post 2' }),
];

export function validateFilter(filter) {
  if (!filter || !/^[a-z0-9-]+$/.test(filter.id || '') || !String(filter.name || '').trim() || !Array.isArray(filter.operations)) throw new Error('Invalid Aimless filter preset');
  filter.operations.forEach((operation, index) => {
    if (!operation || !OPERATION_KINDS.has(operation.kind)) throw new Error(`Unsupported operation at position ${index + 1}: ${operation?.kind || 'missing'}`);
    if (operation.kind === 'css-filter' && !String(operation.value || '').trim()) throw new Error(`Invalid CSS filter at position ${index + 1}`);
    if (operation.kind === 'pixel' && !PIXEL_EFFECTS.has(operation.effect)) throw new Error(`Unsupported pixel effect at position ${index + 1}: ${operation.effect}`);
    if (operation.kind === 'overlay' && !OVERLAY_EFFECTS.has(operation.effect)) throw new Error(`Unsupported overlay at position ${index + 1}: ${operation.effect}`);
  });
  return filter;
}

FILTERS.forEach(validateFilter);

export function getFilter(id) {
  return FILTERS.find((filter) => filter.id === id) || FILTERS.find((filter) => filter.id === 'original');
}

export const PHOTO_FRAME_CSS = `
.photo-frame { position: relative; margin-top: 8px; isolation: isolate; }
.photo-frame.filter-clipped { overflow: hidden; border-radius: 8px; }
.photo-frame .filter-step, .photo-frame .filter-composite { position: relative; display: block; max-width: 100%; line-height: 0; }
.photo-frame .filter-image { display: block; width: 100%; height: auto; }
.photo-frame .filter-overlay { position: absolute; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none; }
.photo-frame .filter-composite { isolation: isolate; }
.filter-defs { position: absolute; width: 0; height: 0; overflow: hidden; }
`;

export function gradientCSS(gradient) {
  const stops = gradient.stops.map(([offset, color]) => `${color} ${Math.round(offset * 100)}%`).join(', ');
  return gradient.kind === 'radial'
    ? `radial-gradient(circle, ${stops})`
    : `linear-gradient(${gradient.angle ?? 180}deg, ${stops})`;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

export function grainDataUri() {
  const random = seededRandom(0xA11E55);
  const cells = Array.from({ length: 256 }, (_, index) => {
    const value = Math.round(random() * 255);
    return `<rect x="${(index % 16) * 4}" y="${Math.floor(index / 16) * 4}" width="4" height="4" fill="rgb(${value},${value},${value})"/>`;
  }).join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${cells}</svg>`)}`;
}

function operationId(filterId, index) {
  return `aimless-${filterId}-${index + 1}`;
}

function pixelSvgDef(operation, id) {
  const p = operation.params || {};
  if (operation.effect === 'duotone') {
    const [sr, sg, sb] = rgb01(p.shadow), [hr, hg, hb] = rgb01(p.highlight);
    const contrast = 1 + number(p.contrast) / 100;
    const lift = (value) => clamp((Number(value) - 0.5) * contrast + 0.5, 0, 1).toFixed(3);
    return `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" result="g"/><feComponentTransfer in="g"><feFuncR type="table" tableValues="${sr} ${lift(hr)}"/><feFuncG type="table" tableValues="${sg} ${lift(hg)}"/><feFuncB type="table" tableValues="${sb} ${lift(hb)}"/></feComponentTransfer></filter>`;
  }
  if (operation.effect === 'tritone') {
    const [sr, sg, sb] = rgb01(p.shadow), [mr, mg, mb] = rgb01(p.mid), [hr, hg, hb] = rgb01(p.highlight);
    return `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" result="g"/><feComponentTransfer in="g"><feFuncR type="table" tableValues="${sr} ${mr} ${hr}"/><feFuncG type="table" tableValues="${sg} ${mg} ${hg}"/><feFuncB type="table" tableValues="${sb} ${mb} ${hb}"/></feComponentTransfer></filter>`;
  }
  if (operation.effect === 'posterize') {
    const steps = clamp(Math.round(number(p.steps, 5)), 2, 16);
    const values = Array.from({ length: steps }, (_, index) => (index / (steps - 1)).toFixed(3)).join(' ');
    return `<filter id="${id}" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="discrete" tableValues="${values}"/><feFuncG type="discrete" tableValues="${values}"/><feFuncB type="discrete" tableValues="${values}"/></feComponentTransfer></filter>`;
  }
  if (operation.effect === 'heatmap') {
    const intensity = number(p.intensity, 100) / 100;
    const map = (values) => values.map((value) => (value * intensity).toFixed(3)).join(' ');
    return `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" result="g"/><feComponentTransfer in="g"><feFuncR type="table" tableValues="${map([0.02, 0.1, 0.35, 0.7, 0.95, 1])}"/><feFuncG type="table" tableValues="${map([0, 0, 0.05, 0.25, 0.7, 1])}"/><feFuncB type="table" tableValues="${map([0.15, 0.4, 0.55, 0.1, 0.05, 0.9])}"/></feComponentTransfer></filter>`;
  }
  if (operation.effect === 'drama') {
    const settings = dramaSettings(p);
    const table = (values) => values.map((value) => value.toFixed(4)).join(' ');
    return `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="${settings.saturation.toFixed(4)}" result="sat"/><feComponentTransfer in="sat"><feFuncR type="table" tableValues="${table(settings.tables[0])}"/><feFuncG type="table" tableValues="${table(settings.tables[1])}"/><feFuncB type="table" tableValues="${table(settings.tables[2])}"/></feComponentTransfer></filter>`;
  }
  if (operation.effect === 'chromatic') {
    const offset = number(p.offset);
    const strength = clamp(number(p.strength), 0, 100) / 100;
    return `<filter id="${id}" x="-10%" width="120%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/><feOffset in="r" dx="${offset}" result="ro"/><feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g"/><feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/><feOffset in="b" dx="${-offset}" result="bo"/><feBlend in="ro" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="bo" mode="screen" result="rgb"/><feComposite in="SourceGraphic" in2="rgb" operator="arithmetic" k2="${(1 - strength).toFixed(3)}" k3="${strength.toFixed(3)}"/></filter>`;
  }
  const settings = glitchSettings(p);
  const darkening = 1 - settings.profile.exposure * settings.amount * 0.12;
  const split = Math.round(settings.split).toFixed(2);
  return `<filter id="${id}" x="-15%" y="-8%" width="130%" height="116%" color-interpolation-filters="sRGB"><feTurbulence type="${settings.profile.noise}" baseFrequency="${settings.profile.frequencyX.toFixed(4)} ${settings.frequencyY.toFixed(4)}" numOctaves="${settings.profile.octaves}" seed="${settings.seed}" result="noise"/><feColorMatrix in="noise" values="1 0 0 0 0  0 0 0 0 0.5  0 0 0 0 0  0 0 0 1 0" result="horizontal"/><feDisplacementMap in="SourceGraphic" in2="horizontal" scale="${settings.displacement.toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="torn"/><feComponentTransfer in="torn" result="exposed"><feFuncR type="linear" slope="${darkening.toFixed(4)}"/><feFuncG type="linear" slope="${darkening.toFixed(4)}"/><feFuncB type="linear" slope="${darkening.toFixed(4)}"/></feComponentTransfer><feColorMatrix in="exposed" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/><feOffset in="r" dx="${split}" result="ro"/><feColorMatrix in="exposed" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g"/><feColorMatrix in="exposed" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/><feOffset in="b" dx="-${split}" result="bo"/><feBlend in="ro" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="bo" mode="screen" result="rgb"/><feComposite in="rgb" in2="SourceGraphic" operator="in"/></filter>`;
}

function bloomSvgDef(operation, id) {
  const p = operation.params || {};
  const threshold = Math.max(0.01, number(p.threshold, 140) / 100);
  const contrast = Math.max(0.01, number(p.contrast, 180) / 100);
  const slope = (threshold * contrast).toFixed(3);
  const intercept = ((1 - contrast) / 2).toFixed(3);
  const tint = clamp(number(p.tint), 0, 100) / 100;
  const opacity = clamp(number(p.opacity, 50), 0, 100) / 100;
  const blend = p.blend === 'lighten' ? 'lighten' : 'screen';
  return `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feComponentTransfer in="SourceGraphic" result="bright"><feFuncR type="linear" slope="${slope}" intercept="${intercept}"/><feFuncG type="linear" slope="${slope}" intercept="${intercept}"/><feFuncB type="linear" slope="${slope}" intercept="${intercept}"/></feComponentTransfer><feColorMatrix in="bright" type="saturate" values="${number(p.saturate, 100) / 100}" result="sat"/><feGaussianBlur in="sat" stdDeviation="${number(p.blur, 12)}" result="blur"/>${tint > 0 ? `<feFlood flood-color="${esc(p.color || '#ffffff')}" flood-opacity="${tint}" result="tint"/><feBlend in="blur" in2="tint" mode="color" result="bloom"/>` : '<feComposite in="blur" in2="blur" result="bloom"/>'}<feComponentTransfer in="bloom" result="faded"><feFuncA type="linear" slope="${opacity}"/></feComponentTransfer><feBlend in="SourceGraphic" in2="faded" mode="${blend}"/></filter>`;
}

export function buildFilterDefs(id) {
  const filter = getFilter(id);
  const definitions = filter.operations.map((operation, index) => {
    if (operation.kind === 'pixel') return pixelSvgDef(operation, operationId(filter.id, index));
    if (operation.kind === 'bloom') return bloomSvgDef(operation, operationId(filter.id, index));
    return '';
  }).filter(Boolean);
  return definitions.length ? `<svg class="filter-defs" aria-hidden="true"><defs>${definitions.join('')}</defs></svg>` : '';
}

function overlayStyle(operation) {
  const p = operation.params || {};
  let background;
  if (p.stops) background = gradientCSS(p);
  else if (operation.effect === 'colorwash') background = p.color;
  else if (operation.effect === 'gradient') background = `linear-gradient(${p.angle ?? 180}deg, ${p.c1}, ${p.c2})`;
  else if (operation.effect === 'vignette') background = `radial-gradient(ellipse at center, transparent ${100 - number(p.size, 60)}%, ${p.color} 100%)`;
  else if (operation.effect === 'scanlines') background = `repeating-linear-gradient(0deg, ${p.color} 0px, ${p.color} 1px, transparent 1px, transparent ${p.size}px)`;
  else background = `linear-gradient(${p.angle ?? 45}deg, transparent ${50 - p.width / 2}%, ${p.c1} ${50 - p.width / 6}%, #fff 50%, ${p.c2} ${50 + p.width / 6}%, transparent ${50 + p.width / 2}%)`;
  const blend = p.blend || (operation.effect === 'vignette' ? 'multiply' : operation.effect === 'prism' ? 'screen' : operation.effect === 'colorwash' ? 'overlay' : operation.effect === 'gradient' ? 'soft-light' : 'normal');
  return `background:${background};mix-blend-mode:${blend === 'normal' ? 'normal' : blend};opacity:${clamp(number(p.opacity, 100), 0, 100) / 100}`;
}

export function buildFilteredPhotoHTML(src, id, alt = '') {
  const filter = getFilter(id);
  let markup = `<img class="filter-image" src="${esc(src)}" alt="${esc(alt)}">`;
  filter.operations.forEach((operation, index) => {
    if (operation.kind === 'css-filter') {
      markup = `<div class="filter-step" style="filter:${esc(operation.value)}">${markup}</div>`;
      if (operation.animation) markup = `<div class="filter-step filter-animated" style="animation-duration:${operation.animation.duration}s">${markup}</div>`;
    } else if (operation.kind === 'pixel' || operation.kind === 'bloom') {
      markup = `<div class="filter-step" style="filter:url(#${operationId(filter.id, index)})">${markup}</div>`;
    } else {
      const style = operation.kind === 'grain'
        ? `background-image:var(--aimless-grain);background-size:${Math.max(16, 64 * Math.max(0.1, number(operation.params?.size, 1)))}px;mix-blend-mode:${operation.params?.blend || 'overlay'};opacity:${clamp(number(operation.params?.opacity, 25), 0, 100) / 100}`
        : overlayStyle(operation);
      markup = `<div class="filter-composite">${markup}<span class="filter-overlay" style="${esc(style)}"></span></div>`;
    }
  });
  const clipped = filter.operations.some((operation) => operation.kind === 'overlay' || operation.kind === 'grain' || operation.kind === 'bloom' || operation.kind === 'pixel' && ['chromatic', 'glitch'].includes(operation.effect) || operation.kind === 'css-filter' && /\b(?:blur|drop-shadow)\(/.test(operation.value));
  return `<div class="photo-frame${clipped ? ' filter-clipped' : ''}">${markup}</div>`;
}

export function buildFilterCSS(id, scope) {
  const filter = getFilter(id);
  if (!filter.operations.length) return '';
  const selector = `${scope}.filter-${filter.id}`;
  const usesGrain = filter.operations.some((operation) => operation.kind === 'grain');
  const usesAnimation = filter.operations.some((operation) => operation.animation);
  let css = usesGrain ? `${selector} { --aimless-grain: url('${grainDataUri()}'); }\n` : '';
  if (usesAnimation) css += `${selector} .filter-animated { animation-name: aimless-hue-cycle; animation-timing-function: linear; animation-iteration-count: infinite; }\n@keyframes aimless-hue-cycle { to { filter: hue-rotate(360deg); } }\n@media (prefers-reduced-motion: reduce), print { ${selector} .filter-animated { animation: none; } }`;
  return css;
}
