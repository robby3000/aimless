// Publish helpers for handing a walk keepsake to a Neocities site:
// slug, sitename validation, target URLs, description and OG head tags.
// Pure: takes data, returns strings. No DOM, no storage.

import { esc, formatWalkDate, voiceName } from './export.js';
import { formatKm } from './geo.js';
import { unreachableRate } from './proximity.js';

/** Folder every published walk page lives under on the Neocities site. */
export const NEOCITIES_FOLDER = 'aimless';

/** Tagline appended to every generated description and OG description. */
export const OG_TAGLINE = 'Created with Aimless.earth. Go Nowhere, Somewhere.';

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
 * Slug for the NEXT build: the plain walk slug for the first build,
 * then `<slug>-2`, `-3`, ... so each build's files never collide with
 * an earlier upload still sitting in the site's `aimless/` folder.
 * `walk.neocities.builds` is the count of completed builds.
 */
export function nextBuildSlug(walk) {
  const builds = walk.neocities?.builds ?? 0;
  return walkSlug(walk) + (builds > 0 ? `-${builds + 1}` : '');
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

/** walkDescription plus the Aimless tagline - the default everywhere a description is pre-filled. */
export function defaultDescription(walk) {
  return `${walkDescription(walk)} ${OG_TAGLINE}`;
}

/**
 * The OG <head> block for a walk page. One tag per line, every attribute
 * value escaped. width/height are the JPG's real pixel size.
 * url and imageUrl are optional: without `url` there is no og:url, and
 * without `imageUrl` the whole og:image:* cluster and twitter:image are
 * omitted - standard exports get the reduced block until the walk is
 * published and real URLs exist to point at.
 */
export function ogHeadHtml({ title, description, url, imageUrl, width, height, alt }) {
  const lines = [
    `<meta name="description" content="${esc(description)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
  ];
  if (url) lines.push(`<meta property="og:url" content="${esc(url)}">`);
  if (imageUrl) {
    lines.push(
      `<meta property="og:image" content="${esc(imageUrl)}">`,
      `<meta property="og:image:type" content="image/jpeg">`,
      `<meta property="og:image:width" content="${esc(width)}">`,
      `<meta property="og:image:height" content="${esc(height)}">`,
      `<meta property="og:image:alt" content="${esc(alt)}">`,
    );
  }
  lines.push(
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
  );
  if (imageUrl) lines.push(`<meta name="twitter:image" content="${esc(imageUrl)}">`);
  return lines.join('\n');
}
