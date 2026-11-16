// Maintains public/ring/ring.json's `members` from registered sites'
// manifests (docs/20261003-aimless-webring-dev-plan.md). For each site
// in `sites`, GET <base>ring.json - base is the site's aimless folder,
// trailing slash included. New walks append to members in site order,
// then slug order; members whose site no longer lists them drop out, so
// their footers degrade to the hub's pending page instead of a 404.
// Writes only on change.
//
//   node scripts/ring-sync.mjs
//
// Zero dependencies (roadmap A2). Liveness, not just claims: EVERY
// claimed walk's page is fetched each run and must answer 200 with the
// Aimless marker, or it is left out - a walk deleted from its site but
// still in the manifest simply stops being offered, and comes back on
// its own if the page returns. Exits 1 on a malformed registry or
// manifest, or a manifest fetch failure that is not a plain 404 -
// nothing is written in those cases, so a broken sync can't silently
// shrink the ring.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateRegistry, validateManifest } from '../public/lib/ring.js';

const REGISTRY_PATH = join(process.cwd(), 'public/ring/ring.json');
const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
// A bad hand-edit fails here before any network work or write.
validateRegistry(registry);

// What every registered site currently claims, in join order: sites in
// registry order, each site's walks in slug order.
const claimed = new Map();
for (const site of registry.sites) {
  const manifestUrl = `${site.base}ring.json`;
  const res = await fetch(manifestUrl, { headers: { accept: 'application/json' } });
  // A missing manifest just means the site has no ring walks up right
  // now; its members drop out below. Anything worse is a real failure.
  if (res.status === 404) continue;
  if (!res.ok) throw new Error(`${manifestUrl}: HTTP ${res.status}`);
  const manifest = await res.json();
  validateManifest(manifest);
  const walks = [...manifest.walks].sort((a, b) => a.slug.localeCompare(b.slug));
  for (const w of walks) {
    if (claimed.has(w.slug)) continue;   // first site wins on a collision
    claimed.set(w.slug, {
      slug: w.slug,
      url: `${site.base}${w.slug}.html`,
      title: w.title,
      date: w.date,
      site: site.host,
    });
  }
}

// A member earns its place by answering: every claimed walk's page must
// return 200 and look like an Aimless page. Dead claims - a page deleted
// but still in the manifest, a typo'd slug, a down page - are skipped
// with a warning rather than failing the run: one broken member must
// never wedge the sync for everyone else, and a restored page re-enters
// on the next run. URLs are derived from the curated site base, so the
// marker check is the only content verification needed.
const MARKER = 'aimless.earth';
const live = [];
const dead = [];
for (const m of claimed.values()) {
  const res = await fetch(m.url, { headers: { accept: 'text/html' } }).catch(() => null);
  if (res?.ok && (await res.text()).includes(MARKER)) live.push(m);
  else dead.push(m.slug);
}
if (dead.length) console.log(`ring-sync: dead pages skipped: ${dead.join(', ')}`);

// Existing members keep their position; live new walks append.
const liveSlugs = new Set(live.map((m) => m.slug));
const keep = registry.members.filter((m) => liveSlugs.has(m.slug));
const have = new Set(registry.members.map((m) => m.slug));
const add = live.filter((m) => !have.has(m.slug));

const members = [...keep, ...add];
const removed = registry.members.length - keep.length;
if (JSON.stringify(members) === JSON.stringify(registry.members)) {
  console.log(`ring-sync: unchanged (${members.length} members)`);
  process.exit(0);
}

registry.members = members;
registry.updated = new Date().toISOString().slice(0, 10);
validateRegistry(registry);
writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`ring-sync: ${members.length} members (+${add.length}, -${removed})`);
