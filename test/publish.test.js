import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NEOCITIES_FOLDER,
  OG_TAGLINE,
  walkSlug,
  nextBuildSlug,
  normalizeSitename,
  neocitiesTargets,
  walkDescription,
  defaultDescription,
  ogHeadHtml,
} from '../public/lib/publish.js';

// Local-time constructors keep these fixtures timezone-independent.
const STARTED = new Date(2026, 9, 4, 12).getTime(); // Oct 4 2026, local noon

const WALK = {
  id: 'walk-1796941200000',
  seed: 'moss-fern-quartz',
  started: STARTED,
  voice: 'crow',
  distanceM: 3200,
  stops: [
    { seq: 0, reachedAt: STARTED + 600000, approached: false },
    { seq: 1, reachedAt: STARTED + 700000, approached: false },
    { seq: 2, reachedAt: STARTED + 800000, approached: false },
    { seq: 3, reachedAt: STARTED + 900000, approached: false },
    { seq: 4, reachedAt: STARTED + 1000000, approached: false },
  ],
};

test('NEOCITIES_FOLDER is the fixed upload folder', () => {
  assert.equal(NEOCITIES_FOLDER, 'aimless');
});

test('walkSlug is stable for the same walk and matches the format', () => {
  const slug = walkSlug(WALK);
  assert.equal(slug, walkSlug(WALK));
  assert.match(slug, /^walk-\d{8}-[a-z0-9]{1,6}$/);
});

test('walkSlug differs for ids 1 ms apart', () => {
  const a = walkSlug({ ...WALK, id: 'walk-1796941200000' });
  const b = walkSlug({ ...WALK, id: 'walk-1796941200001' });
  assert.notEqual(a, b);
});

test('walkSlug takes the date from started, not from the id ms', () => {
  const slug = walkSlug(WALK);
  assert.equal(slug.slice(0, 13), 'walk-20261004');
  // id ms (1796941200000) is a different date than `started`.
  const idDate = new Date(1796941200000);
  assert.notEqual(
    `${idDate.getFullYear()}${String(idDate.getMonth() + 1).padStart(2, '0')}${String(idDate.getDate()).padStart(2, '0')}`,
    '20261004',
  );
});

test('walkSlug tail is the base36 of the id digits', () => {
  const slug = walkSlug(WALK);
  const expected = Number('1796941200000').toString(36).slice(-6);
  assert.equal(slug, `walk-20261004-${expected}`);
});

test('walkSlug falls back to the seed when the id has no digits', () => {
  const slug = walkSlug({ ...WALK, id: 'walk-x', seed: 'Moss-Fern-Quartz!' });
  assert.equal(slug, 'walk-20261004-mossfe');
  assert.match(slug, /^walk-\d{8}-[a-z0-9]{1,6}$/);
});

test('nextBuildSlug is the plain slug for a walk with no builds', () => {
  for (const neocities of [undefined, null, {}]) {
    assert.equal(nextBuildSlug({ ...WALK, neocities }), walkSlug(WALK), JSON.stringify(neocities));
  }
});

test('nextBuildSlug appends the next build number after completed builds', () => {
  const walk = {
    ...WALK,
    neocities: { builds: 1, slug: walkSlug(WALK), pageUrl: 'https://rob.neocities.org/aimless/x.html' },
  };
  assert.equal(nextBuildSlug(walk), `${walkSlug(WALK)}-2`);
  assert.equal(nextBuildSlug({ ...walk, neocities: { ...walk.neocities, builds: 2 } }), `${walkSlug(WALK)}-3`);
});

test('normalizeSitename trims, lowercases and accepts hyphens', () => {
  assert.equal(normalizeSitename('  My-Site  '), 'my-site');
  assert.equal(normalizeSitename('rob'), 'rob');
  assert.equal(normalizeSitename('a'), 'a');
});

test('normalizeSitename strips a pasted scheme, domain suffix and slash', () => {
  assert.equal(normalizeSitename('x.neocities.org'), 'x');
  assert.equal(normalizeSitename('https://x.neocities.org/'), 'x');
  assert.equal(normalizeSitename('http://X.Neocities.ORG/'), 'x');
});

test('normalizeSitename rejects invalid names', () => {
  for (const bad of ['-x', 'x-', 'a b', '', '  ', 'x'.repeat(33), 'x..y', 'x_y', null, undefined]) {
    assert.equal(normalizeSitename(bad), null, JSON.stringify(bad));
  }
});

test('normalizeSitename accepts 32 chars', () => {
  assert.equal(normalizeSitename('x'.repeat(32)), 'x'.repeat(32));
});

test('neocitiesTargets builds urls, paths and names', () => {
  assert.deepEqual(neocitiesTargets('rob', 'walk-20261004-abc'), {
    pageUrl: 'https://rob.neocities.org/aimless/walk-20261004-abc.html',
    imageUrl: 'https://rob.neocities.org/aimless/walk-20261004-abc.jpg',
    htmlPath: 'aimless/walk-20261004-abc.html',
    imagePath: 'aimless/walk-20261004-abc.jpg',
    htmlName: 'walk-20261004-abc.html',
    imageName: 'walk-20261004-abc.jpg',
  });
});

test('walkDescription includes date, distance, reached count and voice', () => {
  assert.equal(
    walkDescription(WALK),
    'A walk on October 4, 2026, 3.2 km, 5 of 5 stops reached. Voice of The Crow.',
  );
});

test('walkDescription omits distance when distanceM is null or undefined', () => {
  for (const distanceM of [null, undefined]) {
    const text = walkDescription({ ...WALK, distanceM });
    assert.ok(!text.includes('km'));
    assert.ok(text.startsWith('A walk on October 4, 2026,'));
  }
});

test('walkDescription counts only truly reached stops, not approached', () => {
  const walk = {
    ...WALK,
    stops: [
      { seq: 0, reachedAt: STARTED + 1, approached: false },
      { seq: 1, reachedAt: STARTED + 2, approached: true },
      { seq: 2 },
    ],
  };
  assert.ok(walkDescription(walk).includes('1 of 3 stops reached.'));
});

test('walkDescription omits the voice sentence for none, myvoice and absent', () => {
  for (const voice of ['none', 'myvoice', undefined, null]) {
    const text = walkDescription({ ...WALK, voice });
    assert.ok(!text.includes('Voice of'), voice);
  }
});

test('defaultDescription is walkDescription plus the tagline', () => {
  assert.equal(OG_TAGLINE, 'Created with Aimless.earth. Go Nowhere, Somewhere.');
  assert.equal(defaultDescription(WALK), `${walkDescription(WALK)} ${OG_TAGLINE}`);
});

const OG = {
  title: 'A walk on October 4, 2026',
  description: 'A walk on October 4, 2026, 3.2 km, 5 of 5 stops reached.',
  url: 'https://rob.neocities.org/aimless/walk-20261004-abc.html',
  imageUrl: 'https://rob.neocities.org/aimless/walk-20261004-abc.jpg',
  width: 1200,
  height: 630,
  alt: 'A walk trace',
};

test('ogHeadHtml emits every tag exactly once', () => {
  const html = ogHeadHtml(OG);
  const expected = [
    '<meta name="description"',
    'property="og:type"',
    'property="og:title"',
    'property="og:description"',
    'property="og:url"',
    'property="og:image"',
    'property="og:image:type"',
    'property="og:image:width"',
    'property="og:image:height"',
    'property="og:image:alt"',
    'name="twitter:card"',
    'name="twitter:title"',
    'name="twitter:description"',
  ];
  for (const tag of expected) {
    assert.equal(html.split(tag).length - 1, 1, tag);
  }
  // og:image prefix also matches og:image:* tags, so count lines instead.
  assert.equal(html.split('property="og:image"').length - 1, 1);
  assert.equal(html.split('name="twitter:image"').length - 1, 1);
});

test('ogHeadHtml sets the fixed values', () => {
  const html = ogHeadHtml(OG);
  assert.ok(html.includes('<meta property="og:type" content="website">'));
  assert.ok(html.includes('<meta property="og:image:type" content="image/jpeg">'));
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
  assert.ok(html.includes('<meta property="og:image:width" content="1200">'));
  assert.ok(html.includes('<meta property="og:image:height" content="630">'));
});

test('ogHeadHtml escapes quotes and angle brackets in values', () => {
  const html = ogHeadHtml({ ...OG, title: 'He said "hi" <now>' });
  assert.ok(html.includes('He said &quot;hi&quot; &lt;now&gt;'));
  assert.ok(!html.includes('"hi"'));
  assert.ok(!html.includes('<now>'));
});

test('ogHeadHtml without url/imageUrl keeps the always tags and drops the rest', () => {
  const html = ogHeadHtml({ title: OG.title, description: OG.description });
  for (const tag of [
    '<meta name="description"',
    'property="og:type"',
    'property="og:title"',
    'property="og:description"',
    'name="twitter:card"',
    'name="twitter:title"',
    'name="twitter:description"',
  ]) {
    assert.equal(html.split(tag).length - 1, 1, tag);
  }
  for (const tag of [
    'property="og:url"',
    'property="og:image"',
    'name="twitter:image"',
  ]) {
    assert.ok(!html.includes(tag), tag);
  }
});

test('ogHeadHtml emits og:url alone when only url is supplied', () => {
  const html = ogHeadHtml({ title: OG.title, description: OG.description, url: OG.url });
  assert.equal(html.split('property="og:url"').length - 1, 1);
  assert.ok(!html.includes('property="og:image"'));
  assert.ok(!html.includes('name="twitter:image"'));
});
