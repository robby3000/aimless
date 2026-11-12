// Publish helpers for handing a walk keepsake to the walker's own website
// (Neocities, GitHub Pages or any static host): slug, site address
// validation, target URLs, upload steps, description, OG head tags, the
// site index page, its RSS feed and the file-list manifest.
// Pure: takes data, returns strings. No DOM, no storage.

import { esc, formatWalkDate, voiceName, logoDataUri, iconsHeadHtml } from './export.js';
import { BASE_CSS } from './skins.js';
import { formatKm } from './geo.js';
import { unreachableRate } from './proximity.js';

/** Folder every published walk page lives under, at the site address. */
export const PUBLISH_FOLDER = 'aimless';

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

const HOST_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/**
 * Accept a site address as typed or pasted and return its base URL
 * (scheme, lowercased host, path ending in '/') or null. A bare name with
 * no dot, colon or slash is Neocities shorthand. A pasted trailing
 * `index.html` or `aimless/` folder is dropped, since the folder is added
 * per build. A typed http:// is kept; anything else defaults to https.
 */
export function normalizeSiteBase(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (!/[.:/]/.test(s)) {
    const name = normalizeSitename(s);
    return name ? `https://${name}.neocities.org/` : null;
  }
  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || !HOST_RE.test(url.hostname)) return null;
  let path = url.pathname.replace(/\/index\.html?$/i, '/').replace(/\/+$/, '');
  if (path.split('/').pop().toLowerCase() === PUBLISH_FOLDER) path = path.slice(0, -PUBLISH_FOLDER.length - 1);
  return `${url.protocol}//${url.host}${path}/`;
}

/** The base URL as shown to people: no scheme, no trailing slash. */
export function siteLabel(base) {
  return String(base).replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/** 'neocities' | 'github' | 'other', from the base URL's host. */
export function siteKind(base) {
  const host = new URL(base).hostname;
  if (host.endsWith('.neocities.org')) return 'neocities';
  if (host.endsWith('.github.io')) return 'github';
  return 'other';
}

/**
 * The saved site address. Prefs from before any-host publishing stored a
 * bare Neocities name (`neocitiesSitename`); it becomes its base URL.
 */
export function siteBaseFromPrefs(prefs) {
  if (prefs?.siteBase) return prefs.siteBase;
  const name = normalizeSitename(prefs?.neocitiesSitename);
  return name ? `https://${name}.neocities.org/` : '';
}

/** URLs, upload paths and bare filenames for a site base URL + slug. */
export function siteTargets(base, slug) {
  const htmlName = `${slug}.html`;
  const imageName = `${slug}.jpg`;
  const folder = `${base}${PUBLISH_FOLDER}/`;
  return {
    pageUrl: `${folder}${htmlName}`,
    imageUrl: `${folder}${imageName}`,
    indexUrl: folder,
    htmlPath: `${PUBLISH_FOLDER}/${htmlName}`,
    imagePath: `${PUBLISH_FOLDER}/${imageName}`,
    htmlName,
    imageName,
  };
}

/**
 * The hand-off instructions for a site: numbered steps plus an optional
 * button ({ label, url }) that opens the host's upload page.
 */
export function uploadSteps(base) {
  const kind = siteKind(base);
  if (kind === 'neocities') {
    return {
      steps: ['Open neocities.org/dashboard', `Open the folder ${PUBLISH_FOLDER}, or create it`, 'Upload the new or changed files'],
      link: { label: 'Open Neocities dashboard', url: 'https://neocities.org/dashboard' },
    };
  }
  if (kind === 'github') {
    const user = new URL(base).hostname.split('.')[0];
    return {
      steps: [
        'Open the repository that publishes this site',
        `Open the folder ${PUBLISH_FOLDER}, or create it`,
        'Add file, Upload files, then commit. The page is live a minute or two later',
      ],
      link: { label: 'Open GitHub', url: `https://github.com/${user}?tab=repositories` },
    };
  }
  return {
    steps: [`Upload the files to a folder called ${PUBLISH_FOLDER} at ${siteLabel(base)}`, 'Keep the file names exactly as they are'],
    link: null,
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
 * published and real URLs exist to point at. feedUrl adds the RSS
 * discovery link; pass the site feed's absolute URL on published pages.
 */
export function ogHeadHtml({ title, description, url, imageUrl, width, height, alt, feedUrl }) {
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
  if (feedUrl) lines.push(`<link rel="alternate" type="application/rss+xml" href="${esc(feedUrl)}" title="${esc(title)} RSS">`);
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
      voice: w.voice && w.voice !== 'none' ? voiceName(w.voice) : null,
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
<link rel="alternate" type="application/rss+xml" href="feed.xml" title="${esc(opts.title || 'Aimless walks')} RSS">
${iconsHeadHtml()}
<style>
${BASE_CSS}
.idx-list { display: flex; flex-direction: column; gap: 28px; margin-top: 20px; }
.idx-walk { display: flex; flex-direction: column; gap: 8px; }
.idx-thumb img { width: 100%; height: auto; aspect-ratio: 40 / 21; object-fit: cover; border-radius: 8px; display: block; }
.idx-title { font-family: monospace; color: var(--accent); text-decoration: none; font-size: 0.95rem; }
.idx-meta .date { margin-bottom: 4px; }
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
 * aimless/feed.xml: an RSS 2.0 feed of the same listed walks the index
 * shows. Sits beside index.html in the site's aimless folder; every URL
 * inside is absolute, built from the site base, so feed readers and any
 * bot that announces new walks elsewhere can follow them from anywhere.
 * Items follow index curation (indexed walks, newest build first); an
 * empty feed is still a valid channel - a first-timer can upload it
 * before their first build and subscribers see the walk when it lands.
 */
export function feedXml(entries, opts = {}) {
  const folder = `${opts.base}${PUBLISH_FOLDER}/`;
  const title = opts.title || `Aimless walks on ${siteLabel(opts.base)}`;
  const items = entries.map((e) => {
    const pageUrl = `${folder}${e.slug}.html`;
    return [
      '  <item>',
      `    <title>${esc(e.title)}</title>`,
      `    <link>${esc(pageUrl)}</link>`,
      `    <guid isPermaLink="true">${esc(pageUrl)}</guid>`,
      `    <pubDate>${new Date(e.builtAt).toUTCString()}</pubDate>`,
      `    <description>${esc(e.description)}</description>`,
      '  </item>',
    ].join('\n');
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(title)}</title>
  <link>${esc(folder)}</link>
  <atom:link href="${esc(folder)}feed.xml" rel="self" type="application/rss+xml"/>
  <description>${esc(opts.description || 'Walks made with Aimless - a walking app with no map.')}</description>
  <lastBuildDate>${new Date(opts.now ?? Date.now()).toUTCString()}</lastBuildDate>
${items.join('\n')}
</channel>
</rss>
`;
}

/**
 * Plain-text file list of every published walk, for pasting into an LLM
 * (or any other tool) to generate a custom index page. One header line so
 * the consumer knows the paths are relative, then per walk: page path,
 * title, date, description, and the preview image's path.
 */
export function manifestText(walks) {
  const lines = ['All paths relative to the site address.'];
  for (const e of publishedEntries(walks)) {
    lines.push(`${PUBLISH_FOLDER}/${e.slug}.html | ${e.title} | ${formatWalkDate(e.started)} | ${e.description.replace(/\s+/g, ' ')}${e.voice ? ` | voice: ${e.voice}` : ''}`);
    lines.push(`${PUBLISH_FOLDER}/${e.slug}.jpg (preview image)`);
  }
  return lines.join('\n');
}
