// Walk export: a self-contained HTML file with inline base64 images - the
// keepsake. Pure: takes data, returns strings. No DOM, no storage.

import { unreachableRate } from './proximity.js';
import { formatKm } from './geo.js';
import { BASE_CSS, PRINT_CSS } from './skins.js';

/**
 * The transparent monochrome app icons (public/icons/icon-*.svg), inlined
 * into exports as data URIs so the keepsake needs no network. Each skin
 * picks the variant with the best contrast against its background
 * (skin.icon): 'light' for dark backgrounds, 'dark' for light ones, 'sky'
 * where the blue suits the palette.
 */
export const LOGO_SVGS = {
  light: `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 648 648" width="648" height="648"><style>.a{fill:#eeeeee}</style><path fill-rule="evenodd" class="a" d="m186.4 339.5l40.8 10.6-4.4 16.8-40.8-10.6z"/><path fill-rule="evenodd" class="a" d="m208.4 428.8l26.5-32.9 13.5 10.9-26.5 32.9z"/><path fill-rule="evenodd" class="a" d="m311.9 300.2l26.4-32.9 13.6 10.9-26.4 32.9z"/><path fill-rule="evenodd" class="a" d="m363.8 235.7l26.5-32.9 13.5 10.9-26.5 32.9z"/><path fill-rule="evenodd" class="a" d="m467.3 230.4l16.2 38.9-16 6.7-16.2-38.9z"/><path fill-rule="evenodd" class="a" d="m498.9 306.5l16.1 39-16.1 6.6-16.1-39z"/><path fill-rule="evenodd" class="a" d="m346.8 379.9l41 10.1-4.2 16.9-41-10.1z"/><path fill-rule="evenodd" class="a" d="m426.7 399.8l40.9 10.3-4.3 16.9-40.9-10.3z"/><path fill-rule="evenodd" class="a" d="m286.7 332.1h2l11.3 10.2-16.4 21 24.5 6-4.1 16.3-4.1-1-36.8-9.1 2.1-7.1-4.1-4.9z"/><path fill-rule="evenodd" class="a" d="m108 392c-37.6 0-68-30.4-68-68 0-37.6 30.4-68 68-68 37.6 0 68 30.4 68 68 0 37.6-30.4 68-68 68z"/><path fill-rule="evenodd" class="a" d="m432 230c-37.6 0-68-30.4-68-68 0-37.6 30.4-68 68-68 37.6 0 68 30.4 68 68 0 37.6-30.4 68-68 68z"/><path fill-rule="evenodd" class="a" d="m540 500c-37.6 0-68-30.4-68-68 0-37.6 30.4-68 68-68 37.6 0 68 30.4 68 68 0 37.6-30.4 68-68 68z"/><path fill-rule="evenodd" class="a" d="m162 554c-37.6 0-68-30.4-68-68 0-37.6 30.4-68 68-68 37.6 0 68 30.4 68 68 0 37.6-30.4 68-68 68z"/></svg>`,
  dark: `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 648 648" width="648" height="648"><style>.a{fill:#666}</style><path fill-rule="evenodd" class="a" d="m186.4 339.5l40.8 10.6-4.4 16.8-40.8-10.6z"/><path fill-rule="evenodd" class="a" d="m208.4 428.8l26.5-32.9 13.5 10.9-26.5 32.9z"/><path fill-rule="evenodd" class="a" d="m311.9 300.2l26.4-32.9 13.6 10.9-26.4 32.9z"/><path fill-rule="evenodd" class="a" d="m363.8 235.7l26.5-32.9 13.5 10.9-26.5 32.9z"/><path fill-rule="evenodd" class="a" d="m467.3 230.4l16.2 38.9-16 6.7-16.2-38.9z"/><path fill-rule="evenodd" class="a" d="m498.9 306.5l16.1 39-16.1 6.6-16.1-39z"/><path fill-rule="evenodd" class="a" d="m346.8 379.9l41 10.1-4.2 16.9-41-10.1z"/><path fill-rule="evenodd" class="a" d="m426.7 399.8l40.9 10.3-4.3 16.9-40.9-10.3z"/><path fill-rule="evenodd" class="a" d="m286.7 332.1h2l11.3 10.2-16.4 21 24.5 6-4.1 16.3-4.1-1-36.8-9.1 2.1-7.1-4.1-4.9z"/><path fill-rule="evenodd" class="a" d="m108 392c-37.6 0-68-30.4-68-68 0-37.6 30.4-68 68-68 37.6 0 68 30.4 68 68 0 37.6-30.4 68-68 68z"/><path fill-rule="evenodd" class="a" d="m432 230c-37.6 0-68-30.4-68-68 0-37.6 30.4-68 68-68 37.6 0 68 30.4 68 68 0 37.6-30.4 68-68 68z"/><path fill-rule="evenodd" class="a" d="m540 500c-37.6 0-68-30.4-68-68 0-37.6 30.4-68 68-68 37.6 0 68 30.4 68 68 0 37.6-30.4 68-68 68z"/><path fill-rule="evenodd" class="a" d="m162 554c-37.6 0-68-30.4-68-68 0-37.6 30.4-68 68-68 37.6 0 68 30.4 68 68 0 37.6-30.4 68-68 68z"/></svg>`,
  sky: `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 648 648" width="648" height="648"><style>.a{fill:#00bfff}</style><path fill-rule="evenodd" class="a" d="m186.4 339.5l40.8 10.6-4.4 16.8-40.8-10.6z"/><path fill-rule="evenodd" class="a" d="m208.4 428.8l26.5-32.9 13.5 10.9-26.5 32.9z"/><path fill-rule="evenodd" class="a" d="m311.9 300.2l26.4-32.9 13.6 10.9-26.4 32.9z"/><path fill-rule="evenodd" class="a" d="m363.8 235.7l26.5-32.9 13.5 10.9-26.5 32.9z"/><path fill-rule="evenodd" class="a" d="m467.3 230.4l16.2 38.9-16 6.7-16.2-38.9z"/><path fill-rule="evenodd" class="a" d="m498.9 306.5l16.1 39-16.1 6.6-16.1-39z"/><path fill-rule="evenodd" class="a" d="m346.8 379.9l41 10.1-4.2 16.9-41-10.1z"/><path fill-rule="evenodd" class="a" d="m426.7 399.8l40.9 10.3-4.3 16.9-40.9-10.3z"/><path fill-rule="evenodd" class="a" d="m286.7 332.1h2l11.3 10.2-16.4 21 24.5 6-4.1 16.3-4.1-1-36.8-9.1 2.1-7.1-4.1-4.9z"/><path fill-rule="evenodd" class="a" d="m108 392c-37.6 0-68-30.4-68-68 0-37.6 30.4-68 68-68 37.6 0 68 30.4 68 68 0 37.6-30.4 68-68 68z"/><path fill-rule="evenodd" class="a" d="m432 230c-37.6 0-68-30.4-68-68 0-37.6 30.4-68 68-68 37.6 0 68 30.4 68 68 0 37.6-30.4 68-68 68z"/><path fill-rule="evenodd" class="a" d="m540 500c-37.6 0-68-30.4-68-68 0-37.6 30.4-68 68-68 37.6 0 68 30.4 68 68 0 37.6-30.4 68-68 68z"/><path fill-rule="evenodd" class="a" d="m162 554c-37.6 0-68-30.4-68-68 0-37.6 30.4-68 68-68 37.6 0 68 30.4 68 68 0 37.6-30.4 68-68 68z"/></svg>`,
};

export function logoDataUri(variant = 'sky') {
  const svg = LOGO_SVGS[variant] || LOGO_SVGS.sky;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Display names for the voice slugs stored on walk records. */
export const VOICE_NAMES = {
  crow: 'The Crow',
  threshold: 'The Threshold',
  lattice: 'The Lattice',
  inner: 'The Inner',
};

export function voiceName(slug) {
  if (!slug) return null;
  return VOICE_NAMES[slug] || slug[0].toUpperCase() + slug.slice(1);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "August 8, 2026" in local time. */
export function formatWalkDate(ms) {
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Convert a blob to a base64 data URL.
 */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Build a self-contained HTML document for a walk.
 * @param {object} walk  The walk record from IndexedDB.
 * @param {Array} photos Array of { stopSeq, dataUrl?, blob? } for this walk.
 * @param {string} svgTrace  Pre-rendered SVG string of the trace.
 * @param {string} [skinCss]  Optional skin CSS fragment (lib/skins.js),
 *   embedded after the base styles. CSS only - no scripts, ever.
 * @param {string} [icon]  Logo variant ('light' | 'dark' | 'sky') - the
 *   active skin's `icon` field, chosen for contrast against its background.
 */
export async function buildHTMLExport(walk, photos, svgTrace, skinCss = '', icon = 'sky') {
  const photoMap = new Map();
  for (const p of photos) photoMap.set(p.stopSeq, p);

  const photoDataUrls = new Map();
  for (const [seq, p] of photoMap) {
    if (p.dataUrl) {
      photoDataUrls.set(seq, p.dataUrl);
    } else if (p.blob) {
      try {
        photoDataUrls.set(seq, await blobToDataURL(p.blob));
      } catch {
        // Legacy IndexedDB blob unreadable (WebKit corrupts stored blobs
        // after a restart) - export the walk without this photo.
      }
    }
  }

  const date = walk.started ? formatWalkDate(walk.started) : 'Unknown date';
  const distance = walk.distanceM != null ? `, ${formatKm(walk.distanceM)}` : '';
  const voice = voiceName(walk.voice);
  const unreachable = unreachableRate(walk.stops);
  const reached = walk.stops.filter((s) => s.reachedAt).length;

  const stopCards = walk.stops.map((s, i) => {
    const photoUrl = photoDataUrls.get(s.seq);
    const photoHtml = photoUrl
      ? `<img src="${photoUrl}" style="max-width:100%;border-radius:8px;margin-top:8px;">`
      : '';
    const status = s.approached
      ? '<span class="status approached">close as I can get</span>'
      : s.reachedAt
        ? '<span class="status reached">reached</span>'
        : '<span class="status missed">not reached</span>';
    // Inner stops carry the hexagram resolved from their coordinates: the
    // glyph beside its title, then the haiku with one element per line so
    // the breaks are structural rather than white-space dependent.
    const hex = s.hexagram;
    const hexHtml = hex
      ? `<div class="card-hex"><span class="glyph">${hex.glyph}</span><span class="hex-title">${hex.title}</span></div>`
      : '';
    const cardHtml = hex
      ? `<div class="card-text card-haiku">${(s.cardText || '').split('\n').map((l) => `<span class="haiku-line">${l}</span>`).join('')}</div>`
      : `<div class="card-text">${s.cardText || ''}</div>`;
    return `<div class="stop">
      <div class="stop-num">${i + 1}</div>
      <div class="stop-body">
        <div class="stop-meta">${status}</div>
        ${hexHtml}
        ${cardHtml}
        ${photoHtml}
      </div>
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Aimless — Walk ${walk.seed}</title>
<style>
${BASE_CSS}
@media print {
${PRINT_CSS}
}
</style>
${skinCss ? `<style id="skin">\n${skinCss}\n</style>` : ''}
</head>
<body>
  <h1><a class="app-link" href="https://aimless.earth"><img class="app-icon" src="${logoDataUri(icon)}" alt="">Aimless</a></h1>
  <div class="seed">${walk.seed}</div>
  ${voice ? `<div class="walk-voice">Voice of ${voice}</div>` : ''}
  <div class="date">${date}${distance}</div>
  <div class="summary">
    <b>${reached}</b> of ${walk.stops.length} stops reached.
    ${unreachable.approached > 0 ? `<b>${unreachable.approached}</b> marked "close as I can get".` : ''}
  </div>
  <div class="trace">${svgTrace}</div>
  ${stopCards}
  <footer>Generated by <a href="https://aimless.earth">Aimless</a>. This file is self-contained — no network needed.</footer>
</body>
</html>`;
}

/**
 * Trigger a download in the browser.
 */
export function downloadFile(filename, content, mimeType) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
