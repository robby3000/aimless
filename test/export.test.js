import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHTMLExport, voiceName, formatWalkDate } from '../public/lib/export.js';

const WALK = {
  id: 'walk-1',
  seed: 'moss-fern-quartz',
  started: 1750000000000,
  voice: 'crow',
  budgetMin: 45,
  origin: { lat: 55.8642, lng: -4.2518 },
  distanceM: 1234,
  stops: [
    { seq: 0, lat: 55.87, lng: -4.25, reachedAt: 1750000600000, approached: false, cardText: 'First card.' },
    // An approached stop also has reachedAt set - reachStop stamps both.
    { seq: 1, lat: 55.86, lng: -4.24, reachedAt: 1750000700000, approached: true, cardText: 'Second card.' },
  ],
  trace: [{ lat: 55.8642, lng: -4.2518 }, { lat: 55.87, lng: -4.25 }],
  gaveUp: false,
};

const INNER_WALK = {
  ...WALK,
  id: 'walk-inner',
  voice: 'inner',
  stops: [
    {
      seq: 0, lat: 51.51, lng: -0.13, reachedAt: 1750000600000, approached: false,
      cardText: 'Sky pours without end,\nhold the line, let it unfold\ndawn keeps its own word.',
      hexagram: { number: 1, title: 'The Making', glyph: '䷀' },
    },
  ],
};

test('buildHTMLExport embeds a rendered data URL as-is', async () => {
  const dataUrl = 'data:image/jpeg;base64,QUJD';
  const html = await buildHTMLExport(WALK, [{ stopSeq: 0, dataUrl }], '<svg></svg>');
  assert.ok(html.includes(`src="${dataUrl}"`));
  assert.ok(html.includes('First card.'));
  assert.ok(html.includes('moss-fern-quartz'));
});

test('buildHTMLExport skips photos without a rendered dataUrl', async () => {
  // The caller renders photos through the engine first; anything without a
  // dataUrl (e.g. an unreadable legacy IndexedDB blob) is omitted.
  const html = await buildHTMLExport(WALK, [{ stopSeq: 0, blob: new Blob(['x']) }], '<svg></svg>');
  assert.ok(!html.includes('<img src='));
  assert.ok(html.includes('First card.'));
});

test('buildHTMLExport works with no photos at all', async () => {
  const html = await buildHTMLExport(WALK, [], '<svg></svg>');
  // 1 truly reached (stop 0), 1 approached (stop 1) — approached does not count.
  assert.ok(html.includes('1</b> of 2 stops reached'));
});

test('header shows the voice, the spelled-out date and the distance', async () => {
  const html = await buildHTMLExport(WALK, [], '<svg></svg>');
  assert.ok(html.includes('<div class="walk-voice">Voice of The Crow</div>'));
  assert.ok(html.includes(`${formatWalkDate(WALK.started)}, 1.2 km`));
});

test('header omits the voice line and distance when the record lacks them', async () => {
  const old = { ...WALK, voice: undefined, distanceM: undefined };
  const html = await buildHTMLExport(old, [], '<svg></svg>');
  assert.ok(!html.includes('<div class="walk-voice">'));
  assert.ok(!html.includes('km</div>'));
});

test('a walk given up on does not say "Walk ended early"', async () => {
  const html = await buildHTMLExport({ ...WALK, gaveUp: true }, [], '<svg></svg>');
  assert.ok(!html.includes('Walk ended early'));
});

test('the summary does not include the "close as I can get" count', async () => {
  const html = await buildHTMLExport(WALK, [], '<svg></svg>');
  assert.ok(!html.includes('close as I can get".'));
  assert.ok(!html.includes('%)'));
});

test('the footer has an Export KML data URI link', async () => {
  const html = await buildHTMLExport(WALK, [], '<svg></svg>');
  assert.ok(html.includes('Export KML</a>'));
  assert.ok(html.includes('data:application/vnd.google-earth.kml+xml'));
  assert.ok(html.includes('download="aimless-moss-fern-quartz.kml"'));
});

test('the footer no longer says "self-contained"', async () => {
  const html = await buildHTMLExport(WALK, [], '<svg></svg>');
  assert.ok(!html.includes('self-contained'));
});

test('the header logo and title link to aimless.earth', async () => {
  const html = await buildHTMLExport(WALK, [], '<svg></svg>');
  assert.ok(html.includes('<a class="app-link" href="https://aimless.earth">'));
  assert.ok(html.includes('data:image/svg+xml'));
});

test('the icon argument selects the logo variant', async () => {
  const dark = await buildHTMLExport(WALK, [], '<svg></svg>', '', 'dark');
  const light = await buildHTMLExport(WALK, [], '<svg></svg>', '', 'light');
  assert.ok(dark.includes(encodeURIComponent('#666')));
  assert.ok(light.includes(encodeURIComponent('#eeeeee')));
});

test('inner stops render glyph and title without "Hexagram" or the number', async () => {
  const html = await buildHTMLExport(INNER_WALK, [], '<svg></svg>');
  assert.ok(html.includes('<span class="glyph">䷀</span>'));
  assert.ok(html.includes('<span class="hex-title">The Making</span>'));
  assert.ok(!html.includes('Hexagram'));
  assert.ok(!html.includes('hex-num'));
});

test('haiku lines become one block element per line', async () => {
  const html = await buildHTMLExport(INNER_WALK, [], '<svg></svg>');
  assert.ok(html.includes('<span class="haiku-line">Sky pours without end,</span>'));
  assert.ok(html.includes('<span class="haiku-line">dawn keeps its own word.</span>'));
  assert.equal((html.match(/<span class="haiku-line">/g) || []).length, 3);
});

test('photos embed as plain img in a .photo-frame wrapper', async () => {
  const html = await buildHTMLExport(WALK, [{ stopSeq: 0, dataUrl: 'data:image/jpeg;base64,QUJD' }], '<svg></svg>');
  assert.ok(html.includes('<div class="photo-frame"><img src="data:image/jpeg;base64,QUJD" alt="photo"></div>'));
  assert.ok(html.includes('.photo-frame'));
});

test('exported artifacts carry no script or filter machinery', async () => {
  const dataUrl = 'data:image/jpeg;base64,QUJD';
  const html = await buildHTMLExport(WALK, [{ stopSeq: 0, dataUrl }], '<svg></svg>');
  assert.ok(!html.includes('<script'));
  assert.ok(!html.includes('filter:'));
  assert.ok(!html.includes('url(#'));
  assert.ok(!html.includes('filter-step'));
  assert.ok(!html.includes('filter-defs'));
  assert.ok(!html.includes('filter-composite'));
  assert.ok(!html.includes('filter-overlay'));
  assert.ok(html.includes('<body>'));
  assert.equal((html.match(/data:image\/jpeg;base64,QUJD/g) || []).length, 1);
});

test('skin CSS filter declarations are stripped from the embedded styles', async () => {
  const skin = 'img { border: 2px solid #33ff33; border-radius: 0; filter: contrast(1.1); }';
  const html = await buildHTMLExport(WALK, [], '<svg></svg>', skin);
  assert.ok(html.includes('border: 2px solid #33ff33'));
  assert.ok(!html.includes('filter:'));
});

test('each photo source appears exactly once', async () => {
  const walk = { ...WALK, stops: Array.from({ length: 7 }, (_, seq) => ({ seq, lat: 55.86 + seq / 1000, lng: -4.25, reachedAt: 1, cardText: `Card ${seq}` })) };
  const photos = walk.stops.map(({ seq }) => ({ stopSeq: seq, dataUrl: `data:image/jpeg;base64,PHOTO${seq}` }));
  const html = await buildHTMLExport(walk, photos, '<svg></svg>');
  photos.forEach(({ dataUrl }) => assert.equal(html.split(dataUrl).length - 1, 1));
});

test('voiceName maps slugs and tolerates unknowns', () => {
  assert.equal(voiceName('inner'), 'The Inner');
  assert.equal(voiceName('mystery'), 'Mystery');
  assert.equal(voiceName(undefined), null);
});

test('formatWalkDate spells out the month', () => {
  assert.equal(formatWalkDate(new Date(2026, 7, 8).getTime()), 'August 8, 2026');
  assert.equal(formatWalkDate(new Date(2026, 0, 31).getTime()), 'January 31, 2026');
});
