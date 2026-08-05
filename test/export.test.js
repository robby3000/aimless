import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHTMLExport, ICON_SVG, ICON_DATA_URI } from '../public/lib/export.js';
import { BASE_CSS } from '../public/lib/skins.js';

const WALK = {
  seed: 'test-seed',
  started: 0,
  gaveUp: false,
  stops: [
    { seq: 0, lat: 55.86, lng: -4.25, reachedAt: 1, approached: false, cardText: 'A card.' },
    { seq: 1, lat: 55.87, lng: -4.26, reachedAt: null, approached: false, cardText: 'Another.' },
  ],
};

test('icon SVG matches the master icon colours', () => {
  // Sampled from icons/icon-master.png: field, cream, origin green, dash orange.
  for (const c of ['#12201b', '#ede4d4', '#5fa98d', '#ffb43d']) {
    assert.ok(ICON_SVG.includes(c), `missing ${c}`);
  }
});

test('icon data URI is an encoded SVG', () => {
  assert.ok(ICON_DATA_URI.startsWith('data:image/svg+xml'));
  assert.ok(decodeURIComponent(ICON_DATA_URI).includes('<svg'));
});

test('export inlines the icon as a data URI image', async () => {
  const html = await buildHTMLExport(WALK, [], '<svg></svg>');
  assert.ok(html.includes('class="app-icon"'));
  assert.ok(html.includes(ICON_DATA_URI));
  assert.ok(!html.includes('./icons/'), 'export must not reference icon files');
});

test('export embeds the shared base css and optional skin css', async () => {
  const plain = await buildHTMLExport(WALK, [], '<svg></svg>');
  assert.ok(plain.includes(BASE_CSS));
  assert.ok(!plain.includes('id="skin"'));
  const skinned = await buildHTMLExport(WALK, [], '<svg></svg>', 'body { background: red; }');
  assert.ok(skinned.includes('id="skin"'));
  assert.ok(skinned.includes('background: red'));
});
