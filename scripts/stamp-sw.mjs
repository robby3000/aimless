// Stamps the service worker cache name with a hash of everything it caches,
// so a shipped change can never be served from a stale cache. See
// docs/cache-busting.md for why this exists and how it works.
//
//   node scripts/stamp-sw.mjs           rewrite public/sw.js in place
//   node scripts/stamp-sw.mjs --check   exit 1 if the stamp is out of date
//
// Zero dependencies (roadmap A2).

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const SW = join(PUBLIC, 'sw.js');

// sw.js is excluded: it is the file we are about to rewrite, so including it
// would make the hash depend on itself and never settle.
// .DS_Store is excluded at any depth: macOS metadata that exists locally but
// not in CI, so including it makes the stamp pass on macOS and fail on Linux.
// .git is excluded: public/lib/engine is a git submodule, and its .git
// gitfile records a machine-specific path (absolute in CI checkouts,
// relative locally) — including it makes the stamp machine-dependent.
const EXCLUDE = new Set(['sw.js', '.DS_Store', '.git']);

/** Every file under public/, as paths relative to public/, sorted. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) out.push(...walk(abs));
    else if (!EXCLUDE.has(entry) && !EXCLUDE.has(relative(PUBLIC, abs))) out.push(abs);
  }
  return out.sort();
}

// index.html carries the stamp in <meta name="aimless-build" content="…">,
// which must not feed back into the hash — hash it with the marker empty.
function bytes(abs) {
  let b = readFileSync(abs, 'utf8');
  if (relative(PUBLIC, abs) === 'index.html') {
    b = b.replace(/<meta name="aimless-build" content="[^"]*">/, '<meta name="aimless-build" content="">');
  }
  return b;
}

/** Hash of the whole shell: paths as well as bytes, so a rename counts. */
function fingerprint() {
  const h = createHash('sha256');
  for (const abs of walk(PUBLIC)) {
    h.update(relative(PUBLIC, abs).split(sep).join('/'));
    h.update('\0');
    h.update(bytes(abs));
    h.update('\0');
  }
  return h.digest('hex').slice(0, 8);
}

const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const wanted = `aimless-v${version}-${fingerprint()}`;

const src = readFileSync(SW, 'utf8');
const LINE = /^const CACHE = '(.*)';$/m;
const found = src.match(LINE);
if (!found) {
  console.error("stamp-sw: no `const CACHE = '...';` line in public/sw.js");
  process.exit(2);
}

const INDEX = join(PUBLIC, 'index.html');
const META = /<meta name="aimless-build" content="([^"]*)">/;
const indexSrc = readFileSync(INDEX, 'utf8');
const metaFound = indexSrc.match(META);

if (found[1] === wanted && metaFound && metaFound[1] === wanted) {
  console.log(`stamp-sw: up to date (${wanted})`);
  process.exit(0);
}

if (process.argv.includes('--check')) {
  console.error(`stamp-sw: cache name is stale.\n  is:     ${found[1]}\n  should: ${wanted}\nRun \`npm run stamp\` and commit the result.`);
  process.exit(1);
}

writeFileSync(SW, src.replace(LINE, `const CACHE = '${wanted}';`));
// The same stamp goes into index.html as a meta tag so the running page
// can show its own build. The fingerprint normalizes it to the empty
// marker value, so the file's hash does not depend on the stamp itself.
if (metaFound) writeFileSync(INDEX, indexSrc.replace(META, `<meta name="aimless-build" content="${wanted}">`));
console.log(`stamp-sw: ${found[1]} -> ${wanted}`);
