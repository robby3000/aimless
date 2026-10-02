// Walk export: a self-contained HTML file with inline base64 images - the
// keepsake. Pure: takes data, returns strings. No DOM, no storage.

import { unreachableRate } from './proximity.js';
import { formatKm } from './geo.js';
import { BASE_CSS, PRINT_CSS } from './skins.js';
import { buildKmlString } from './kml.js';

export const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Exported artifacts are baked pixels in plain <img> tags — no CSS/SVG
// filter machinery. This is the only photo styling the keepsake needs.
const PHOTO_CSS = `.photo-frame { margin-top: 8px; border-radius: 8px; overflow: hidden; }
.photo-frame img { display: block; width: 100%; height: auto; }`;

// The keepsake must contain no filter processing at all: baked images,
// no `filter:` declarations. Skins may legitimately carry img filters
// (e.g. oldskool's contrast bump) — strip them from the embedded CSS.
function stripFilterDeclarations(css) {
  return css.replace(/filter\s*:[^;}]+;?/g, '');
}

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
  stray: 'The Stray',
  small: 'The Small',
  slow: 'The Slow',
  echo: 'The Echo',
  myvoice: 'My Voice',
  none: 'No Voice',
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
 * My Voice: split an imported text file into blocks. One or more blank
 * lines start the next block; line breaks inside a block are preserved
 * verbatim (the caller renders each line as a structural span). CRLF and
 * ragged spacing tolerated; empty blocks are dropped.
 */
export function parseMyVoiceText(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n+/)
    .map((block) => block.split('\n').map((l) => l.trimEnd()).join('\n').trim())
    .filter((block) => block.length > 0);
}

/** Render one My Voice block: every internal line break becomes a line. */
function myVoiceBlockHtml(block) {
  return `<div class="card-text card-haiku myvoice-text">${block.split('\n').map((l) => `<span class="haiku-line">${esc(l)}</span>`).join('')}</div>`;
}

/**
 * Build a self-contained HTML document for a walk.
 * @param {object} walk  The walk record from IndexedDB.
 * @param {Array} photos Array of { stopSeq, dataUrl } for this walk — the
 *   caller renders each photo through the engine first, so every dataUrl
 *   is already filtered baked pixels.
 * @param {string} svgTrace  Pre-rendered SVG string of the trace.
 * @param {string} [skinCss]  Optional skin CSS fragment (lib/skins.js),
 *   embedded after the base styles. CSS only - no scripts, ever.
 * @param {string} [icon]  Logo variant ('light' | 'dark' | 'sky') - the
 *   active skin's `icon` field, chosen for contrast against its background.
 * @param {object} [opts]  Options: `includeKml` embeds a KML data-URI link in
 *   the footer so the walk can be opened in mapping apps (opt-in - the link
 *   leaks the walked coordinates into every shared copy).
 */
export async function buildHTMLExport(walk, photos, svgTrace, skinCss = '', icon = 'sky', opts = {}) {
  const photoDataUrls = new Map();
  for (const p of photos) {
    if (p.dataUrl) photoDataUrls.set(p.stopSeq, p.dataUrl);
  }

  // My Voice blocks map to photos in order (first block -> first photo),
  // regardless of which stop each photo belongs to.
  const myVoice = Array.isArray(walk.myVoice) ? walk.myVoice : [];
  const photoSeqs = [...photoDataUrls.keys()].sort((a, b) => a - b);

  const date = walk.started ? formatWalkDate(walk.started) : 'Unknown date';
  const distance = walk.distanceM != null ? `, ${formatKm(walk.distanceM)}` : '';
  const voice = voiceName(walk.voice);
  const unreachable = unreachableRate(walk.stops);
  const reached = unreachable.reached;

  const stopCards = walk.stops.map((s, i) => {
    const photoUrl = photoDataUrls.get(s.seq);
    const photoHtml = photoUrl ? `<div class="photo-frame"><img src="${esc(photoUrl)}" alt="photo"></div>` : '';
    const status = s.approached
      ? '<span class="status approached">close as I can get</span>'
      : s.reachedAt
        ? '<span class="status reached">reached</span>'
        : '<span class="status missed">not reached</span>';
    // Inner stops carry the hexagram resolved from their coordinates: the
    // glyph beside its title, then the haiku with one element per line so
    // the breaks are structural rather than white-space dependent. Oracle
    // stops reuse the same block for the drawn title, no glyph.
    const hex = s.hexagram;
    const hexHtml = hex
      ? `<div class="card-hex"><span class="glyph">${hex.glyph}</span><span class="hex-title">${hex.title}</span></div>`
      : s.oracle
        ? `<div class="card-hex"><span class="hex-title">${esc(s.oracle.title)}</span></div>`
        : '';
    const cardHtml = (hex || s.oracle)
      ? `<div class="card-text card-haiku">${(s.cardText || '').split('\n').map((l) => `<span class="haiku-line">${esc(l)}</span>`).join('')}</div>`
      : s.cardText
        ? `<div class="card-text">${esc(s.cardText)}</div>`
        : '';
    // The walker's own text sits under the photo it belongs to.
    const myIdx = photoSeqs.indexOf(s.seq);
    const myVoiceHtml = myIdx >= 0 && myVoice[myIdx] ? myVoiceBlockHtml(myVoice[myIdx]) : '';
    return `<div class="stop">
      <div class="stop-num">${i + 1}</div>
      <div class="stop-body">
        <div class="stop-meta">${status}</div>
        ${hexHtml}
        ${cardHtml}
        ${photoHtml}
        ${myVoiceHtml}
      </div>
    </div>`;
  }).join('\n');

  // Blocks beyond the photo count still belong to the walk — they trail
  // below the content as plain paragraphs, with none of the card chrome
  // (no rule above, no skin ornament) that under-photo blocks carry.
  const myVoiceTail = myVoice.length > photoSeqs.length
    ? `<div class="myvoice-tail">${myVoice.slice(photoSeqs.length)
        .map((b) => `<p>${b.split('\n').map(esc).join('<br>')}</p>`)
        .join('')}</div>`
    : '';

  // Filtered pixels are baked into the photo data URLs — the artifact
  // carries no filter markup, no SVG defs, no CSS filter declarations.
  const embeddedCss = stripFilterDeclarations(`${BASE_CSS}\n${PHOTO_CSS}\n@media print {\n${PRINT_CSS}\n}`);

  // Embed the KML route as a data URI so the keepsake offers a route export
  // with no scripts — just an anchor with a download attribute. The KML is
  // tiny (coordinates only, no images), so the data URI adds negligible weight.
  // Opt-in only: the coordinates make a shared artifact traceable to real
  // places the author walked.
  const kmlLinkHtml = opts.includeKml
    ? ` <a href="data:application/vnd.google-earth.kml+xml;charset=utf-8,${encodeURIComponent(buildKmlString(walk))}" download="aimless-${walk.seed}.kml">Export KML</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Aimless — Walk ${walk.seed}</title>
<style>
${embeddedCss}
</style>
${skinCss ? `<style id="skin">\n${stripFilterDeclarations(skinCss)}\n</style>` : ''}
</head>
<body>
  <h1><a class="app-link" href="https://aimless.earth"><img class="app-icon" src="${logoDataUri(icon)}" alt="">Aimless</a></h1>
  <div class="seed">${walk.seed}</div>
  ${voice ? `<div class="walk-voice">Voice of ${voice}</div>` : ''}
  <div class="date">${date}${distance}</div>
  <div class="summary">
    <b>${reached}</b> of ${walk.stops.length} stops reached.
  </div>
  <div class="trace">${svgTrace}</div>
  ${stopCards}
  ${myVoiceTail}
  <footer>Created with <a href="https://aimless.earth">Aimless</a>.${kmlLinkHtml}</footer>
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
