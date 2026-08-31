import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildHTMLExport, voiceName, formatWalkDate } from '../public/lib/export.js';
import { FILTERS, translateWobbletonePreset } from '../public/lib/filters.js';

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

afterEach(() => { delete globalThis.FileReader; });

test('buildHTMLExport embeds a stored data URL as-is', async () => {
  const dataUrl = 'data:image/jpeg;base64,QUJD';
  const html = await buildHTMLExport(WALK, [{ stopSeq: 0, dataUrl }], '<svg></svg>');
  assert.ok(html.includes(`src="${dataUrl}"`));
  assert.ok(html.includes('First card.'));
  assert.ok(html.includes('moss-fern-quartz'));
});

test('buildHTMLExport converts a legacy blob via FileReader', async () => {
  globalThis.FileReader = class {
    readAsDataURL() { this.result = 'data:image/jpeg;base64,REVG'; this.onload(); }
  };
  const html = await buildHTMLExport(WALK, [{ stopSeq: 0, blob: new Blob(['x']) }], '<svg></svg>');
  assert.ok(html.includes('src="data:image/jpeg;base64,REVG"'));
});

test('buildHTMLExport skips a photo whose legacy blob cannot be read', async () => {
  // iOS WebKit corrupts IndexedDB-stored blobs after a restart; the export
  // must still be produced, just without that photo.
  globalThis.FileReader = class {
    readAsDataURL() { this.error = new Error('WebKitBlobResource error 1'); this.onerror(); }
  };
  const html = await buildHTMLExport(WALK, [{ stopSeq: 0, blob: new Blob(['x']) }], '<svg></svg>');
  assert.ok(!html.includes('<img src="data:'));
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

test('photos are wrapped in .photo-frame for ordered filter operations', async () => {
  const html = await buildHTMLExport(WALK, [{ stopSeq: 0, dataUrl: 'data:image/jpeg;base64,QUJD' }], '<svg></svg>');
  assert.ok(html.includes('<div class="photo-frame"><img class="filter-image" src="data:image/jpeg;base64,QUJD"'));
  assert.ok(html.includes('.photo-frame { position: relative;'));
});

test('a photo filter adds a body class and ordered operation markup', async () => {
  const dataUrl = 'data:image/jpeg;base64,QUJD';
  const html = await buildHTMLExport(WALK, [{ stopSeq: 0, dataUrl }], '<svg></svg>', '', 'sky', 'noire');
  assert.ok(html.includes('<body class="filter-noire">'));
  assert.ok(html.includes('filter:grayscale(100%) contrast(175%) brightness(85%)'));
  assert.ok(html.includes('radial-gradient(circle, transparent 40%, rgba(0,0,0,0.85) 100%)'));
  assert.equal((html.match(/data:image\/jpeg;base64,QUJD/g) || []).length, 1);
});

test('Psych post 2 export preserves its ordered stack and shared grain', async () => {
  const dataUrl = 'data:image/jpeg;base64,PSYCH';
  const html = await buildHTMLExport(WALK, [{ stopSeq: 0, dataUrl }], '<svg></svg>', '', 'sky', 'psych-post-2');
  assert.ok(html.includes('<body class="filter-psych-post-2">'));
  const saturation = html.indexOf('filter:saturate(120%)');
  const vignette = html.indexOf('radial-gradient(ellipse at center, transparent 40%, #000000 100%)');
  const blur = html.indexOf('filter:blur(8.7px)');
  const posterize = html.indexOf('filter:url(#aimless-psych-post-2-4)');
  const grain = html.indexOf('background-image:var(--aimless-grain)');
  const psychedelic = html.indexOf('filter:saturate(280%) contrast(130%)');
  assert.ok([saturation, vignette, blur, posterize, grain, psychedelic].every((position) => position >= 0));
  assert.equal(html.split(dataUrl).length - 1, 1);
  assert.equal((html.match(/--aimless-grain:/g) || []).length, 1);
  assert.match(html, /background-size:90px/);
  assert.match(html, /data:image\/png;base64/);
  assert.match(html, /animation-duration:20s/);
  assert.match(html, /prefers-reduced-motion/);
});

test('advanced exports emit shared assets once and each photo source once', async () => {
  const filter = translateWobbletonePreset({
    id: 'advanced', name: 'Advanced', effects: [
      { defId: 'duotone', params: { shadow: '#102030', highlight: '#f0d0b0', contrast: 20 } },
      { defId: 'grain', params: { size: 1, opacity: 20, blend: 'overlay' } },
      { defId: 'bloom', params: { blur: 8, threshold: 140, contrast: 180, saturate: 100, opacity: 30, color: '#ffffff', tint: 0, blend: 'screen' } },
    ],
  });
  FILTERS.push(filter);
  try {
    const walk = { ...WALK, stops: Array.from({ length: 7 }, (_, seq) => ({ seq, lat: 55.86 + seq / 1000, lng: -4.25, reachedAt: 1, cardText: `Card ${seq}` })) };
    const photos = walk.stops.map(({ seq }) => ({ stopSeq: seq, dataUrl: `data:image/jpeg;base64,PHOTO${seq}` }));
    const html = await buildHTMLExport(walk, photos, '<svg></svg>', '', 'sky', 'advanced');
    photos.forEach(({ dataUrl }) => assert.equal(html.split(dataUrl).length - 1, 1));
    assert.equal((html.match(/id="aimless-advanced-1"/g) || []).length, 1);
    assert.equal((html.match(/id="aimless-advanced-3"/g) || []).length, 1);
    assert.equal((html.match(/--aimless-grain:/g) || []).length, 1);
  } finally {
    FILTERS.pop();
  }
});

test('Original adds no filter class or CSS', async () => {
  const html = await buildHTMLExport(WALK, [], '<svg></svg>');
  assert.ok(html.includes('<body>'));
  assert.ok(!html.includes('filter-original'));
  assert.ok(!html.includes('<style id="filter">'));
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
