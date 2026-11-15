import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  RING_HUB,
  RING_JOIN_ADDRESS,
  RING_SLUG_RE,
  ringFooterHtml,
  ringJoinMailto,
  resolveRing,
  validateRegistry,
  validateManifest,
} from '../public/lib/ring.js';

const SITE = { host: 'rob.neocities.org', base: 'https://rob.neocities.org/' };

const member = (slug, n) => ({
  slug,
  url: `https://rob.neocities.org/aimless/${slug}.html`,
  title: `walk ${n}`,
  date: `2026-10-0${n}`,
  site: SITE.host,
});

const REGISTRY = {
  version: 1,
  updated: '2026-11-15',
  sites: [SITE],
  members: [member('walk-20261001-aaaa01', 1), member('walk-20261002-bbbb02', 2), member('walk-20261003-cccc03', 3)],
};

// --- slug format ---

test('RING_SLUG_RE accepts plain and rebuild-suffixed slugs', () => {
  assert.match('walk-20261004-k3f9z2', RING_SLUG_RE);
  assert.match('walk-20261004-k3f9z2-2', RING_SLUG_RE);
  for (const bad of ['', 'walk', 'walk-2026-k3f9z2', 'WALK-20261004-k3f9z2', 'walk-20261004-K3F9Z2', 'xwalk-20261004-k3f9z2']) {
    assert.doesNotMatch(bad, RING_SLUG_RE);
  }
});

// --- resolveRing ---

test('resolveRing lists when no params are given', () => {
  assert.equal(resolveRing(REGISTRY, {}).kind, 'list');
  assert.equal(resolveRing(REGISTRY, { from: '', dir: '' }).kind, 'list');
});

test('resolveRing reports an empty registry', () => {
  const empty = { ...REGISTRY, members: [] };
  assert.equal(resolveRing(empty, { from: 'walk-20261001-aaaa01', dir: 'next' }).kind, 'empty');
});

test('resolveRing walks prev and next with wrap-around', () => {
  const [a, b, c] = REGISTRY.members;
  assert.deepEqual(resolveRing(REGISTRY, { from: a.slug, dir: 'next' }), { kind: 'redirect', url: b.url });
  assert.deepEqual(resolveRing(REGISTRY, { from: a.slug, dir: 'prev' }), { kind: 'redirect', url: c.url });
  assert.deepEqual(resolveRing(REGISTRY, { from: c.slug, dir: 'next' }), { kind: 'redirect', url: a.url });
  assert.deepEqual(resolveRing(REGISTRY, { from: c.slug, dir: 'prev' }), { kind: 'redirect', url: b.url });
});

test('resolveRing random never returns the from member', () => {
  const from = REGISTRY.members[1].slug;
  for (const r of [0, 0.4, 0.99]) {
    const res = resolveRing(REGISTRY, { from, dir: 'random' }, () => r);
    assert.equal(res.kind, 'redirect');
    assert.notEqual(res.url, REGISTRY.members[1].url);
  }
});

test('resolveRing random over a ring of one reports empty', () => {
  const one = { ...REGISTRY, members: [REGISTRY.members[0]] };
  const res = resolveRing(one, { from: one.members[0].slug, dir: 'random' }, () => 0.5);
  assert.equal(res.kind, 'empty');
});

test('resolveRing reports pending for an unknown from slug', () => {
  const res = resolveRing(REGISTRY, { from: 'walk-20261231-zzzz99', dir: 'next' });
  assert.equal(res.kind, 'pending');
});

test('resolveRing treats an unrecognised dir as random', () => {
  const res = resolveRing(REGISTRY, { from: REGISTRY.members[0].slug, dir: 'sideways' }, () => 0);
  assert.equal(res.kind, 'redirect');
  assert.equal(res.url, REGISTRY.members[1].url);
});

// --- validateRegistry ---

test('validateRegistry accepts the fixture', () => {
  assert.equal(validateRegistry(REGISTRY), true);
});

test('validateRegistry rejects malformed registries', () => {
  const bad = [
    [{ ...REGISTRY, version: 2 }, /version/],
    [{ ...REGISTRY, sites: {} }, /sites/],
    [{ ...REGISTRY, members: {} }, /members/],
    [{ ...REGISTRY, sites: [{ host: 'x', base: 'http://x/' }] }, /https/],
    [{ ...REGISTRY, sites: [{ host: 'x', base: 'https://x' }] }, /ending/],
    [{ ...REGISTRY, sites: [SITE, SITE] }, /duplicate/],
    [{ ...REGISTRY, members: [REGISTRY.members[0], REGISTRY.members[0]] }, /duplicate/],
    [{ ...REGISTRY, members: [{ ...REGISTRY.members[0], url: 'http://x/y.html' }] }, /https/],
    [{ ...REGISTRY, members: [{ ...REGISTRY.members[0], title: '' }] }, /title/],
    [{ ...REGISTRY, members: [{ ...REGISTRY.members[0], date: '' }] }, /date/],
    [{ ...REGISTRY, members: [{ ...REGISTRY.members[0], site: 'elsewhere.example' }] }, /not registered/],
    [{ ...REGISTRY, members: [{ ...REGISTRY.members[0], slug: 'not a slug' }] }, /bad slug/],
  ];
  for (const [registry, pattern] of bad) {
    assert.throws(() => validateRegistry(registry), pattern);
  }
});

// --- validateManifest ---

test('validateManifest accepts and rejects', () => {
  assert.equal(validateManifest({ version: 1, walks: [{ slug: 'walk-20261004-k3f9z2', title: 't', date: '2026-10-04' }] }), true);
  assert.equal(validateManifest({ version: 1, walks: [] }), true);
  assert.throws(() => validateManifest({ version: 2, walks: [] }), /version/);
  assert.throws(() => validateManifest({ version: 1 }), /walks/);
  assert.throws(() => validateManifest({ version: 1, walks: [{ slug: 'bad', title: 't', date: 'd' }] }), /bad slug/);
});

// --- the committed registry always validates ---

test('public/ring/ring.json is a valid registry', () => {
  const registry = JSON.parse(readFileSync(new URL('../public/ring/ring.json', import.meta.url), 'utf8'));
  assert.equal(validateRegistry(registry), true);
});

// --- footer + join ---

test('ringFooterHtml bakes three escaped hub links', () => {
  const html = ringFooterHtml('walk-20261004-k3f9z2');
  assert.match(html, /<nav class="ring">/);
  const dirs = [...html.matchAll(/dir=(\w+)/g)].map((m) => m[1]);
  assert.deepEqual(dirs, ['prev', 'random', 'next']);
  assert.ok(html.includes(`${RING_HUB}?from=walk-20261004-k3f9z2&amp;dir=`));
  assert.ok(!html.includes('&dir='));
});

test('ringFooterHtml percent-encodes the slug', () => {
  assert.ok(ringFooterHtml('walk"x').includes('from=walk%22x'));
});

test('ringJoinMailto encodes subject and body with host, base and folder', () => {
  const url = ringJoinMailto(RING_JOIN_ADDRESS, { host: 'rob.neocities.org', base: 'https://rob.neocities.org/', folder: 'https://rob.neocities.org/aimless/' });
  assert.ok(url.startsWith(`mailto:${RING_JOIN_ADDRESS}?subject=`));
  const parsed = new URL(url);
  const decoded = decodeURIComponent(parsed.search);
  assert.ok(decoded.includes('rob.neocities.org'));
  assert.ok(decoded.includes('https://rob.neocities.org/'));
  assert.ok(decoded.includes('https://rob.neocities.org/aimless/'));
  assert.ok(!parsed.search.includes(' '));
});
