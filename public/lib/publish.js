// Publish helpers for handing a walk keepsake to a Neocities site:
// slug, sitename validation, target URLs, description, OG head tags,
// the site index page and the file-list manifest.
// Pure: takes data, returns strings. No DOM, no storage.

import { esc, formatWalkDate, voiceName, logoDataUri, iconsHeadHtml } from './export.js';
import { BASE_CSS } from './skins.js';
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

/**
 * Walks listed on the site index: a `neocities` block built the files,
 * `indexed === true` is the user's "list it" choice (absent = unlisted -
 * blocks from before the field existed drop out until re-enabled).
 * The slug used for links and thumbnails is the stored (latest-build)
 * slug, so the index always points at the -N filenames a rebuild made.
 */
export function publishedEntries(walks) {
  return walks
    .filter((w) => w.neocities?.slug && w.neocities.indexed === true)
    .map((w) => ({
      slug: w.neocities.slug,
      title: w.seed,
      started: w.started,
      builtAt: w.neocities.builtAt ?? w.started ?? 0,
      description: w.neocities.description || defaultDescription(w),
    }))
    .sort((a, b) => b.builtAt - a.builtAt);
}

/**
 * aimless/index.html: a front page for a site owner's published walks.
 * Relative paths only - the file only makes sense inside the aimless
 * folder, so links and thumbnails are bare filenames and the page works
 * identically on whatever site hosts it. Script-free, artifact styling.
 * An empty list still yields a valid page: a first-timer can upload it
 * before their first build and the folder then exists.
 */
export function indexHtml(entries, opts = {}) {
  const items = entries.map((e) => `
    <div class="idx-walk">
      <a class="idx-thumb" href="${esc(e.slug)}.html"><img src="${esc(e.slug)}.jpg" alt="${esc(e.title)}"></a>
      <div class="idx-meta">
        <a class="idx-title" href="${esc(e.slug)}.html">${esc(e.title)}</a>
        <div class="date">${esc(formatWalkDate(e.started))}</div>
        ${e.description ? `<div class="idx-desc">${esc(e.description)}</div>` : ''}
      </div>
    </div>`).join('');
  const body = entries.length
    ? `<div class="idx-list">${items}\n  </div>`
    : '<p class="idx-empty">No walks yet.</p>';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(opts.title || 'Aimless walks')}</title>
${iconsHeadHtml()}
<style>
${BASE_CSS}
.idx-list { display: flex; flex-direction: column; gap: 18px; margin-top: 20px; }
.idx-walk { display: flex; gap: 14px; align-items: flex-start; }
.idx-thumb img { width: 120px; height: 63px; object-fit: cover; border-radius: 8px; display: block; }
.idx-title { font-family: monospace; color: var(--accent); text-decoration: none; font-size: 0.95rem; }
.idx-meta .date { margin-bottom: 4px; }
.idx-desc { font-size: 0.8rem; color: var(--fg-dim); }
.idx-empty { color: var(--fg-dim); margin-top: 20px; }
</style>
</head>
<body>
  <h1><a class="app-link" href="https://aimless.earth"><img class="app-icon" src="${logoDataUri(opts.icon || 'sky')}" alt="">Aimless</a></h1>
  <div class="seed">${esc(opts.subtitle || 'walks')}</div>
  ${body}
  <footer>Created with <a href="https://aimless.earth">Aimless</a>. Go Nowhere, Somewhere.</footer>
</body>
</html>`;
}

/**
 * Plain-text file list of every published walk, for pasting into an LLM
 * (or any other tool) to generate a custom index page. One header line so
 * the consumer knows the paths are relative, then per walk: page path,
 * title, date, description, and the preview image's path.
 */
export function manifestText(walks) {
  const lines = ['All paths relative to site root.'];
  for (const e of publishedEntries(walks)) {
    lines.push(`${NEOCITIES_FOLDER}/${e.slug}.html | ${e.title} | ${formatWalkDate(e.started)} | ${e.description.replace(/\s+/g, ' ')}`);
    lines.push(`${NEOCITIES_FOLDER}/${e.slug}.jpg (preview image)`);
  }
  return lines.join('\n');
}
