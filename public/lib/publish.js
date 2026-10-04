// Publish helpers for handing a walk keepsake to a Neocities site:
// slug, sitename validation, target URLs, description and OG head tags.
// Pure: takes data, returns strings. No DOM, no storage.

import { esc, formatWalkDate, voiceName } from './export.js';
import { formatKm } from './geo.js';
import { unreachableRate } from './proximity.js';

/** Folder every published walk page lives under on the Neocities site. */
export const NEOCITIES_FOLDER = 'aimless';

const SITENAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

/**
 * 'walk-20261004-k3f9z2': local date of walk.started plus a base36 tail
 * from the walk id's ms. Stable per walk. If the id carries no digits
 * (should never happen), the seed string supplies the tail instead.
 */
export function walkSlug(walk) {
  const d = new Date(walk.started);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const digits = String(walk.id).replace(/\D/g, '');
  const tail = digits
    ? Number(digits).toString(36).slice(-6)
    : String(walk.seed).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  return `walk-${y}${m}${day}-${tail}`;
}

/**
 * Accept a sitename as typed or pasted: trims, lowercases, strips a
 * leading scheme and a trailing `.neocities.org` or slash. Returns the
 * 1-32 char [a-z0-9-] name (no leading/trailing hyphen) or null.
 */
export function normalizeSitename(raw) {
  let s = String(raw ?? '').trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '');
  s = s.replace(/\.neocities\.org\/?$/, '');
  s = s.replace(/\/+$/, '');
  return SITENAME_RE.test(s) ? s : null;
}

/** URLs, upload paths and bare filenames for a sitename + slug. */
export function neocitiesTargets(sitename, slug) {
  const htmlName = `${slug}.html`;
  const imageName = `${slug}.jpg`;
  return {
    pageUrl: `https://${sitename}.neocities.org/${NEOCITIES_FOLDER}/${htmlName}`,
    imageUrl: `https://${sitename}.neocities.org/${NEOCITIES_FOLDER}/${imageName}`,
    htmlPath: `${NEOCITIES_FOLDER}/${htmlName}`,
    imagePath: `${NEOCITIES_FOLDER}/${imageName}`,
    htmlName,
    imageName,
  };
}

/**
 * Short plain-text description from walk data only, mirroring the
 * keepsake header: "A walk on October 4, 2026, 3.2 km, 5 of 5 stops
 * reached. Voice of The Crow." Distance is dropped when unknown; the
 * voice sentence is dropped for myvoice, none or absent.
 */
export function walkDescription(walk) {
  const date = walk.started ? formatWalkDate(walk.started) : 'Unknown date';
  const distance = walk.distanceM != null ? `, ${formatKm(walk.distanceM)}` : '';
  const reached = unreachableRate(walk.stops).reached;
  let text = `A walk on ${date}${distance}, ${reached} of ${walk.stops.length} stops reached.`;
  const voice = walk.voice === 'none' || walk.voice === 'myvoice' ? null : voiceName(walk.voice);
  if (voice) text += ` Voice of ${voice}.`;
  return text;
}

/**
 * The OG <head> block for a published walk page. One tag per line, every
 * attribute value escaped. width/height are the JPG's real pixel size.
 */
export function ogHeadHtml({ title, description, url, imageUrl, width, height, alt }) {
  return [
    `<meta name="description" content="${esc(description)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${esc(imageUrl)}">`,
    `<meta property="og:image:type" content="image/jpeg">`,
    `<meta property="og:image:width" content="${esc(width)}">`,
    `<meta property="og:image:height" content="${esc(height)}">`,
    `<meta property="og:image:alt" content="${esc(alt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${esc(imageUrl)}">`,
  ].join('\n');
}
