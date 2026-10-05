import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHTMLExport, voiceName, formatWalkDate, parseMyVoiceText } from '../public/lib/export.js';
import { ogHeadHtml } from '../public/lib/publish.js';

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

test('the footer omits the KML link unless opted in', async () => {
  const html = await buildHTMLExport(WALK, [], '<svg></svg>');
  assert.ok(!html.includes('Export KML</a>'));
  assert.ok(!html.includes('vnd.google-earth.kml'));
});

test('the footer has an Export KML data URI link when includeKml is set', async () => {
  const html = await buildHTMLExport(WALK, [], '<svg></svg>', '', 'sky', { includeKml: true });
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

test('without title/headHtml the head is the plain keepsake head', async () => {
  const html = await buildHTMLExport(WALK, [], '<svg></svg>');
  assert.ok(html.includes('<title>Aimless — Walk '));
  assert.ok(!html.includes('og:'));
  assert.ok(html.includes('initial-scale=1.0">\n<title>'));
});

test('export head carries the app icon link tags', async () => {
  const html = await buildHTMLExport(WALK, [], '<svg></svg>');
  assert.ok(html.includes('<link rel="icon" href="data:image/png;base64,'));
  assert.ok(html.includes('sizes="16x16"'));
  assert.ok(html.includes('sizes="32x32"'));
  assert.ok(html.includes('<link rel="apple-touch-icon" href="data:image/png;base64,'));
  assert.ok(html.indexOf('rel="icon"') > html.indexOf('<title>'), 'icons not after <title>');
  assert.ok(html.indexOf('rel="icon"') < html.indexOf('<style'), 'icons not before <style>');
});

test('opts.title and opts.headHtml reach the head', async () => {
  const headHtml = '<meta property="og:title" content="x">';
  const html = await buildHTMLExport(WALK, [], '<svg></svg>', '', 'sky', {
    title: 'quiet "grammar" <of> fences',
    headHtml,
  });
  assert.ok(html.includes('<title>quiet &quot;grammar&quot; &lt;of&gt; fences</title>'));
  assert.ok(!html.includes('Aimless — Walk'));
  assert.equal(html.split(headHtml).length - 1, 1);
  assert.ok(html.indexOf(headHtml) < html.indexOf('<style'), 'headHtml not before <style>');
});

test('exported artifacts carry no script or filter machinery', async () => {
  const dataUrl = 'data:image/jpeg;base64,QUJD';
  const photos = [{ stopSeq: 0, dataUrl }];
  const headHtml = ogHeadHtml({
    title: 'A walk',
    description: 'A walk on a day.',
    url: 'https://rob.neocities.org/aimless/walk-20261004-abc.html',
    imageUrl: 'https://rob.neocities.org/aimless/walk-20261004-abc.jpg',
    width: 1200,
    height: 630,
    alt: 'A walk trace',
  });
  for (const html of [
    await buildHTMLExport(WALK, photos, '<svg></svg>'),
    await buildHTMLExport(WALK, photos, '<svg></svg>', '', 'sky', { title: 'A walk', headHtml }),
  ]) {
    assertNoScriptOrFilters(html);
  }
});

function assertNoScriptOrFilters(html) {
  assert.ok(!html.includes('<script'));
  assert.ok(!html.includes('filter:'));
  assert.ok(!html.includes('url(#'));
  assert.ok(!html.includes('filter-step'));
  assert.ok(!html.includes('filter-defs'));
  assert.ok(!html.includes('filter-composite'));
  assert.ok(!html.includes('filter-overlay'));
  assert.ok(html.includes('<body>'));
  assert.equal((html.match(/data:image\/jpeg;base64,QUJD/g) || []).length, 1);
}

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

test('parseMyVoiceText splits on blank lines and preserves internal breaks', () => {
  const blocks = parseMyVoiceText('line 1\nline 2\nline 3\n\nline 4\nline 5\n\n\nline 6');
  assert.deepEqual(blocks, ['line 1\nline 2\nline 3', 'line 4\nline 5', 'line 6']);
});

test('parseMyVoiceText tolerates CRLF and ragged blank lines', () => {
  const blocks = parseMyVoiceText('one\r\ntwo\r\n\r\n   \r\nthree');
  assert.deepEqual(blocks, ['one\ntwo', 'three']);
  assert.deepEqual(parseMyVoiceText(''), []);
  assert.deepEqual(parseMyVoiceText('\n\n\n'), []);
});

test('buildHTMLExport places My Voice blocks under photos in order', async () => {
  const walk = {
    ...WALK,
    voice: 'myvoice',
    stops: WALK.stops.map((s) => ({ ...s, cardText: undefined })),
    myVoice: ['first block\nstill first', 'second block'],
  };
  const photos = [
    { stopSeq: 1, dataUrl: 'data:image/jpeg;base64,P1' },
    { stopSeq: 0, dataUrl: 'data:image/jpeg;base64,P0' },
  ];
  const html = await buildHTMLExport(walk, photos, '<svg></svg>');
  // Block 0 belongs to the first photo (stopSeq 0), wherever it lands in the doc.
  // Full data URLs as markers: bare 'P0'/'P1' can also match inside icon base64.
  assert.ok(html.indexOf('first block') > html.indexOf('base64,P0'), 'first block not under photo 1');
  assert.ok(html.indexOf('first block') < html.indexOf('base64,P1'), 'first block after second photo');
  assert.ok(html.indexOf('second block') > html.indexOf('base64,P1'), 'second block not under photo 2');
  assert.ok(html.includes('<span class="haiku-line">still first</span>'), 'internal line break not preserved');
});

test('extra My Voice blocks trail the last stop as plain paragraphs', async () => {
  const walk = { ...WALK, voice: 'none', myVoice: ['only block', 'extra block', 'another extra'] };
  const html = await buildHTMLExport(walk, [{ stopSeq: 0, dataUrl: 'data:image/jpeg;base64,P0' }], '<svg></svg>');
  assert.ok(html.indexOf('extra block') > html.indexOf('only block'));
  assert.ok(html.indexOf('extra block') < html.indexOf('<footer>'), 'tail block not before footer');
  // The tail is a run of plain paragraphs — no card chrome per block.
  const tail = html.slice(html.indexOf('<div class="myvoice-tail">'), html.indexOf('<footer>'));
  assert.ok(tail.includes('<p>extra block</p><p>another extra</p>'));
  assert.ok(!tail.includes('card-haiku') && !tail.includes('stop-num'));
});

test('My Voice text is HTML-escaped', async () => {
  const walk = { ...WALK, voice: 'myvoice', myVoice: ['a <b> & "quote"'] };
  const html = await buildHTMLExport(walk, [{ stopSeq: 0, dataUrl: 'data:image/jpeg;base64,P0' }], '<svg></svg>');
  assert.ok(html.includes('a &lt;b&gt; &amp; &quot;quote&quot;'));
});
