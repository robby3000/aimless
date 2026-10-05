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


/**
 * The app favicon and touch icon, inlined as PNG data URIs so exported
 * artifacts carry the Aimless icons with no extra files. Emitted into
 * every generated document head by iconsHeadHtml().
 */
const ICON_DATA_URIS = {
  favicon16: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAPYQAAD2EBqD+naQAAASBQTFRFEiAbBRQQARAMDhwYAhIOsK2h8OfXOEI8DhwXEB4ZJTEs//3t9evax8K0Dx4ZChkUER8aAA4L59q///7vQUpGDRsXDx0ZJDErg4R6Dh4bHikdEBoQExoKRD8gDh4aAREN//Pj/PLh0s2+AA0NDx4bIioeUkklDR0aDh0bOjsgCxsZ/vPi/fPiy8e7fWEgHioeYFMnARUZEB8bCRoaS0AYIC4pAxENGCYhb3FoAAkIBxMTMDQgLjMgaVkoLjMfTEMbpaae///t082/AREMDRgUNWVUaLucZZFtCxYVDBwaDR4bCxcN7+bX///vAAsHDBQTYK2PYayQar6fCREODRwYNz85w7+xT1dOEBwXLVFEYKmMM1xNDxsXDBsWEBwYCxQSLLyXwAAAAH9JREFUeJxjZEADjLgFGBkZ/yILsAAFGH8gBDhB/C//wQJ8jIwfGBgEQSKvQQJijIzfGT9IgviMj0AC8owIcA0swIMkcgoowKmHJMC4F2ioC4hxRxVIHHBk3AQU8AcJrGVgCAFS+14DBSJAAkuAbmH+F7MY7LA4xr9LiPEcFAAA4WsXEQ827FwAAAAASUVORK5CYII=",
  favicon32: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAPYQAAD2EBqD+naQAAAlhQTFRFEiAbER8aCBcTDBsVEB4ZDhwXi4yCvLmrnZ2QGSUgDx4ZCRcT7eTU+O7d8unY9+3c6+TTBhURER8bDBsWVl5U/PHg/PHhUFdQDRsWWV9X+/HgU1pR5d/T8+nZ7uXV8ujY7eTTCxoVChkWp4lLy8a4+O7f2dXIOkQ/BBQPAAsHAA8LDBwaMDMfa1kmAA0NaFQbWUwiDx0YtrSm//bl7eXVUVhPChsaOTohEB8bCxwaHSYdtYgzBxkZBhYRqaeb+e/e7+bW//TkSVFJDRsXDR0aT0cl56k8ChoaCRoaGCUf8OfY9Ovao6KWAxQRLTIfJi4eDx4bEB4bknQuCBkaFiQg8efX9OrapaSXNjUYDh8aBxkacl4qCxsaESAbCRka/74/Eh4XCxoWEB4aBxUQoJ+S/fLhQUlAlHIstYozABEYroQzw5A1Dx8aDh0ZCxgQS1NLGCQfBRQQi42D5d7Oz8q8KjUvAxcZMTUgi28uJy4fGiUct4w0OTkgDRwX6eHR/PLh+vDf//bmMj01Dh0YCBcSBxURAAwJECAaFSQfChYVPTwgknIvEyEbXU8mZlcoAxYZnnowknEniIqCzce6AhIODhoVRHpmYKuOYauPRHxpnHw1GyUbHicdPTgZuLar+e/fDxsXL1NFZbSXX6qOY7GUPHZmDBgV39jIARENEBwXTYpzYayQX6mNY7GTDBUSGSYh5+DQ//bkPkZBDxoWSIBrYa2RYKqOXqiNDBQRRk5HEyEcDBoWEB0YIj00ZraXYq6RZLOVN2FSIzszRXtmRnxoJUI4EB0ZDhkVsd130QAAAXBJREFUeJxjZCAAGAenAkZGxv9Mf3ArYGEEg2+4FDByQRQwvsOhQJiR8TsDA1DVC1wK2Bg/MTBwsv14i8sKFnGwDQ/+43KkElj+zVtkRzKqMzK+hIpoA2WBPv19FUkBowFIz9l/IL4ZkHXcgomR8QiSAlugrAlQYi8Dgwsj41OgXgt+xh0IBYwejFfeMdgzMh59x+DBxsi4gYEh8LYa41qEgmDGk+8YvIBG7PRgZPy6HigaC3boPJgVyYyMt++LGEMC8AyLCNCIXEbGVeGL30IVxIqAZKbZ6h2zBqu58uOLI0R1LSwcWqDhv5GHE6KGsfo/g3AJYw48oKZChOeeAAYEA28KI2PBPwahxq9wBQsgocMYBVFuIbqb/S+DZxBjBEzBSpCC71yMQVDPs6xm3CptyHi6GaZgMyiOgVHsAYsQlgmqSfMZXeGRtQdixf0ERJzVTnv3Hyk2N/MDlVzIxohaRHQfY2T46oJFfrDmLFQAAAlvVCGIOpbHAAAAAElFTkSuQmCC",
  appleTouch: "data:image/png;base64,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",
};

/** <link> tags giving every generated page the Aimless tab and touch icons. */
export function iconsHeadHtml() {
  return [
    `<link rel="icon" href="${ICON_DATA_URIS.favicon16}" type="image/png" sizes="16x16">`,
    `<link rel="icon" href="${ICON_DATA_URIS.favicon32}" type="image/png" sizes="32x32">`,
    `<link rel="apple-touch-icon" href="${ICON_DATA_URIS.appleTouch}">`,
  ].join('\n');
}

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
 *   leaks the walked coordinates into every shared copy); `title` replaces
 *   the default `<title>` text (escaped); `headHtml` is emitted verbatim on
 *   its own line after the viewport meta, for caller-built OG tags
 *   (see publish.js `ogHeadHtml`).
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
<title>${opts.title ? esc(opts.title) : `Aimless — Walk ${walk.seed}`}</title>
${iconsHeadHtml()}
${opts.headHtml ? `${opts.headHtml}\n` : ''}<style>
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
