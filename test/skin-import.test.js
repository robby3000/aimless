import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKINS, getSkin, allSkins, setImportedSkins, scopeCSS } from '../public/lib/skins.js';
import { parseSkinFile, validateSkinRecord, skinFileJson, SKIN_FORMAT, SKIN_COLLECTION_FORMAT } from '../public/lib/skin-import.js';

const GOOD = {
  format: SKIN_FORMAT,
  version: 1,
  id: 'testsuit',
  name: 'Test Suit',
  css: '.stop { color: red; }\n.status { display: none; }',
  icon: 'dark',
  trace: { planStroke: '#111111', traceStroke: '#222222', originFill: '#333333', stopFill: '#444444' },
  card: { bg: '#ffffff', fg: '#000000', accent: '#ff0000', font: "400 52px Georgia, serif" },
};

function skinFile(over = {}) {
  return JSON.stringify({ ...GOOD, ...over });
}

test('a valid .aimlessskin file parses into a normalized record', () => {
  const { records, errors } = parseSkinFile(skinFile({ extra: 'ignored' }));
  assert.equal(errors.length, 0);
  assert.equal(records.length, 1);
  assert.equal(records[0].id, 'testsuit');
  assert.equal(records[0].name, 'Test Suit');
  assert.equal(records[0].trace.traceStroke, '#222222');
  assert.equal(records[0].card.font, "400 52px Georgia, serif");
});

test('a collection file imports every skin and collects per-skin errors', () => {
  const coll = JSON.stringify({
    format: SKIN_COLLECTION_FORMAT,
    version: 1,
    skins: [
      { ...GOOD, id: 'suitone', name: 'Suit One' },
      { ...GOOD, id: 'bad id!', name: 'Broken' },
      { ...GOOD, id: 'suittwo', name: 'Suit Two' },
    ],
  });
  const { records, errors } = parseSkinFile(coll);
  assert.deepEqual(records.map((r) => r.id), ['suitone', 'suittwo']);
  assert.equal(errors.length, 1);
});

test('malformed and foreign JSON is rejected up front', () => {
  assert.throws(() => parseSkinFile('not json'), /Not valid JSON/);
  assert.throws(() => parseSkinFile('{"schema":"aimless-backup"}'), /Not an Aimless skin file/);
  assert.throws(() => parseSkinFile(JSON.stringify({ format: SKIN_FORMAT, version: 99 })), /newer version/);
});

test('css that would break the standalone artifact is rejected', () => {
  for (const [css, why] of [
    ['.x { color: red; </style><script>alert(1)</script>', 'style breakout'],
    ['@import url("https://x.test/a.css");', '@import'],
    ['.x { background: url("https://evil.test/x.png"); }', 'external url()'],
    ['.x { background: url(../secret.png); }', 'relative url()'],
    ['.x { behavior: url(x.htc); -moz-binding: url(y); }', '-moz-binding'],
    ['.x { width: expression(alert(1)); }', 'expression()'],
    ['.x { color: red;', 'unbalanced braces'],
    ['.x { color: red; } }', 'extra closing brace'],
  ]) {
    assert.throws(() => validateSkinRecord({ ...GOOD, css }), new RegExp('.'), `${why} accepted`);
  }
});

test('data: URIs in url() are allowed (self-contained)', () => {
  const rec = validateSkinRecord({ ...GOOD, css: '.x { background: url(data:image/png;base64,AA==); }' });
  assert.equal(rec.id, 'testsuit');
});

test('record shape is enforced: id, name, icon, palettes, font', () => {
  assert.throws(() => validateSkinRecord({ ...GOOD, id: 'Has_Caps' }));
  assert.throws(() => validateSkinRecord({ ...GOOD, id: 'default' }), /collides with a built-in/);
  assert.throws(() => validateSkinRecord({ ...GOOD, name: '' }));
  assert.throws(() => validateSkinRecord({ ...GOOD, icon: 'neon' }));
  assert.throws(() => validateSkinRecord({ ...GOOD, trace: { ...GOOD.trace, planStroke: '#999' } }));
  assert.throws(() => validateSkinRecord({ ...GOOD, card: { ...GOOD.card, font: '' } }));
});

test('getSkin resolves imported skins and still falls back', () => {
  const [rec] = parseSkinFile(skinFile()).records;
  setImportedSkins([rec]);
  try {
    assert.equal(getSkin('testsuit').name, 'Test Suit');
    assert.equal(getSkin('nonsense'), SKINS[0]);
    assert.equal(allSkins().at(-1).id, 'testsuit');
    assert.equal(allSkins()[0].id, SKINS[0].id);
  } finally {
    setImportedSkins([]);
  }
});

test('an imported skin survives scoping (usable in the detail view)', () => {
  const [rec] = parseSkinFile(skinFile({ css: 'body { background: #000; } .stop { color: #fff; }' })).records;
  const out = scopeCSS(rec.css, '#detail-content');
  assert.ok(out.includes('#detail-content {'));
  assert.ok(out.includes('#detail-content .stop {'));
});

test('skinFileJson round-trips through the importer', () => {
  const [rec] = parseSkinFile(skinFile()).records;
  const again = parseSkinFile(skinFileJson(rec));
  assert.deepEqual(again.records[0], { ...rec });
});
