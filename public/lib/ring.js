// The Aimless webring: published walk pages chain to each other through
// a hub page on aimless.earth. Artifacts stay script-free - the footer
// carries three static links and the hub resolves them live against a
// curated registry (public/ring/ring.json). Pure: data in, strings and
// decisions out. No DOM, no storage. Shared by the hub page, the artifact
// footer, the join flow and the sync script.

/** Where the hub lives. Footer links are baked to this at build time. */
export const RING_HUB = 'https://aimless.earth/ring/';

/** Joining is a request, not a write: one email per site. */
export const RING_JOIN_ADDRESS = 'social@aimless.earth';

/**
 * The ring key is the walk's published slug: `walk-yyyymmdd-tail`, plus
 * an optional `-N` rebuild suffix (nextBuildSlug renumbers each build so
 * uploaded files never collide).
 */
export const RING_SLUG_RE = /^walk-\d{8}-[a-z0-9]{1,6}(-\d+)?$/;

/**
 * The three footer anchors as an HTML string: prev, random and next,
 * resolved by the hub at click time. The slug goes through
 * encodeURIComponent, which doubles as its attribute escaping - every
 * character that could mean something inside a quoted attribute is
 * percent-encoded.
 */
export function ringFooterHtml(slug) {
  const from = encodeURIComponent(slug);
  return `<nav class="ring">
  <a href="${RING_HUB}?from=${from}&amp;dir=prev">previous walk</a>
  <a href="${RING_HUB}?from=${from}&amp;dir=random">random walk</a>
  <a href="${RING_HUB}?from=${from}&amp;dir=next">next walk</a>
</nav>`;
}

/**
 * mailto: URL for a site join request. One per site, ever: the
 * maintainer adds the site to the registry's `sites` by hand, and the
 * sync Action picks the site's walks up from its generated manifest.
 */
export function ringJoinMailto(address, { host, base, folder } = {}) {
  const subject = 'Aimless webring: add my site';
  const body = [
    'Please add my site to the Aimless webring.',
    '',
    `Site: ${host}`,
    `Site address: ${base}`,
    // The URL the maintainer pastes into sites[].base - trailing slash
    // and aimless folder included, so curation is one copy.
    `Ring folder: ${folder}`,
    '',
    "I tick 'Add to the Aimless webring' when I build a walk's page, and upload the ring.json file Aimless makes with it.",
  ].filter(Boolean).join('\n');
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Resolve a hub request against a registry. Returns one of:
 *   { kind: 'redirect', url } - send the visitor here
 *   { kind: 'pending' }       - `from` unknown: the walk is not in the
 *                             ring yet (unapproved site, missing upload,
 *                             or a sync that has not run)
 *   { kind: 'empty' }         - nowhere to send anyone yet
 *   { kind: 'list' }          - bare hub visit: show the member list
 * `rand` is injected (0..1) so tests stay deterministic.
 */
export function resolveRing(registry, { from, dir } = {}, rand) {
  const members = registry?.members || [];
  if (!from && !dir) return { kind: 'list' };
  if (members.length === 0) return { kind: 'empty' };
  const idx = from ? members.findIndex((m) => m.slug === from) : -1;
  if (from && idx < 0) return { kind: 'pending' };
  if ((dir === 'prev' || dir === 'next') && idx >= 0) {
    const n = members.length;
    return { kind: 'redirect', url: members[(idx + (dir === 'next' ? 1 : n - 1)) % n].url };
  }
  // Everything else is a random hop: an absent or unrecognised dir, or
  // prev/next with no anchor to be relative to. Random excludes `from` -
  // a ring of one has nowhere to go.
  const pool = members.filter((m) => m.slug !== from);
  if (pool.length === 0) return { kind: 'empty' };
  const pick = pool[Math.floor((rand ?? Math.random)() * pool.length) % pool.length];
  return { kind: 'redirect', url: pick.url };
}

/**
 * Throws with a readable message on a malformed registry: version,
 * unique slugs, https bases and member URLs, slug format, non-empty
 * title/date, and every member's site naming a registered host. npm test
 * runs this on the committed public/ring/ring.json so a bad curation
 * edit fails CI before Pages deploys it.
 */
export function validateRegistry(registry) {
  const fail = (msg) => { throw new Error(`ring registry: ${msg}`); };
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) fail('not an object');
  if (registry.version !== 1) fail(`unsupported version: ${registry.version}`);
  if (!Array.isArray(registry.sites)) fail('sites is not an array');
  if (!Array.isArray(registry.members)) fail('members is not an array');
  const hosts = new Set();
  for (const s of registry.sites) {
    if (!s || typeof s !== 'object') fail('a site is not an object');
    if (typeof s.host !== 'string' || !s.host) fail('a site has no host');
    if (!/^https:\/\/.+\/$/.test(s.base || '')) fail(`site ${s.host}: base must be an https URL ending in /`);
    if (hosts.has(s.host)) fail(`duplicate site host: ${s.host}`);
    hosts.add(s.host);
  }
  const slugs = new Set();
  for (const m of registry.members) {
    if (!m || typeof m !== 'object') fail('a member is not an object');
    if (!RING_SLUG_RE.test(m.slug || '')) fail(`bad slug: ${m.slug}`);
    if (slugs.has(m.slug)) fail(`duplicate slug: ${m.slug}`);
    slugs.add(m.slug);
    if (!/^https:\/\//.test(m.url || '')) fail(`member ${m.slug}: url must be https`);
    if (typeof m.title !== 'string' || !m.title) fail(`member ${m.slug}: missing title`);
    if (typeof m.date !== 'string' || !m.date) fail(`member ${m.slug}: missing date`);
    if (!hosts.has(m.site)) fail(`member ${m.slug}: site ${m.site} is not registered`);
  }
  return true;
}

/**
 * Validate one site's uploaded aimless/ring.json manifest - the file the
 * sync script fetches to learn which walks to add. Shape only; the sync
 * separately fetches each walk's page to check it answers.
 */
export function validateManifest(manifest) {
  const fail = (msg) => { throw new Error(`site manifest: ${msg}`); };
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) fail('not an object');
  if (manifest.version !== 1) fail(`unsupported version: ${manifest.version}`);
  if (!Array.isArray(manifest.walks)) fail('walks is not an array');
  for (const w of manifest.walks) {
    if (!w || typeof w !== 'object') fail('a walk is not an object');
    if (!RING_SLUG_RE.test(w.slug || '')) fail(`bad slug: ${w.slug}`);
    if (typeof w.title !== 'string' || !w.title) fail(`walk ${w.slug}: missing title`);
    if (typeof w.date !== 'string' || !w.date) fail(`walk ${w.slug}: missing date`);
  }
  return true;
}
