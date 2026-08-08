import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildHTMLExport } from '../public/lib/export.js';

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
    { seq: 1, lat: 55.86, lng: -4.24, reachedAt: null, approached: true, cardText: 'Second card.' },
  ],
  trace: [{ lat: 55.8642, lng: -4.2518 }, { lat: 55.87, lng: -4.25 }],
  gaveUp: false,
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
  assert.ok(html.includes('1</b> of 2 stops reached'));
});
