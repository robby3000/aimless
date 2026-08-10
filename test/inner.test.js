import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  decimalsOf,
  binaryFromCoord,
  buildHexIndex,
  hexagramFromCoord,
  innerCard,
} from '../public/lib/inner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INNER = JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', 'inner.json'), 'utf8'));
const INDEX = buildHexIndex(INNER);

// The worked example from docs/iching/hexagram-from-coordinates.md.
const DOC_LAT = 51.51060719513929;
const DOC_LNG = -0.1318628895242;

test('inner.json holds 64 complete, uniquely keyed hexagrams', () => {
  assert.equal(INNER.length, 64);
  assert.equal(new Set(INNER.map((h) => h.number)).size, 64);
  assert.equal(new Set(INNER.map((h) => h.binary)).size, 64);
  assert.equal(new Set(INNER.map((h) => h.hex_font)).size, 64);
  for (const h of INNER) {
    assert.ok(h.number >= 1 && h.number <= 64, `bad number ${h.number}`);
    assert.match(h.binary, /^[01]{6}$/, `bad binary for ${h.number}`);
    assert.ok(h.hex_font.length > 0, `missing glyph for ${h.number}`);
    assert.ok(h.title.length > 0, `missing title for ${h.number}`);
    assert.equal(h.haiku.split('\n').length, 3, `haiku for ${h.number} is not three lines`);
  }
});

test('the index covers all 64 binary combinations', () => {
  assert.equal(INDEX.size, 64);
  for (let i = 0; i < 64; i++) {
    assert.ok(INDEX.has(i.toString(2).padStart(6, '0')), `missing binary ${i.toString(2)}`);
  }
});

test('binaryFromCoord reproduces the documented worked example', () => {
  assert.equal(binaryFromCoord(DOC_LAT, DOC_LNG), '110111');
});

test('hexagramFromCoord resolves the worked example to hexagram 9', () => {
  const h = hexagramFromCoord(DOC_LAT, DOC_LNG, INDEX);
  assert.equal(h.number, 9);
  assert.equal(h.title, 'The Small Hoard');
  assert.equal(h.hex_font, '䷈');
});

test('the mapping is deterministic', () => {
  assert.equal(binaryFromCoord(DOC_LAT, DOC_LNG), binaryFromCoord(DOC_LAT, DOC_LNG));
  assert.deepEqual(
    hexagramFromCoord(DOC_LAT, DOC_LNG, INDEX),
    hexagramFromCoord(DOC_LAT, DOC_LNG, INDEX),
  );
});

test('the sign of the coordinate is stripped', () => {
  assert.equal(binaryFromCoord(-DOC_LAT, DOC_LNG), '110111');
  assert.equal(binaryFromCoord(DOC_LAT, 0.1318628895242), '110111');
});

test('all-even digit pairs give 000000 (The Receiving Earth)', () => {
  // Integer coordinates have no decimal digits; both windows zero-pad.
  const h = hexagramFromCoord(1, 1, INDEX);
  assert.equal(h.binary, '000000');
  assert.equal(h.number, 2);
});

test('all-odd digit pairs give 111111 (The Creative)', () => {
  // lat last six "111111" crossed with lng "000000" makes every sum 1.
  const h = hexagramFromCoord(0.111111, 0, INDEX);
  assert.equal(h.binary, '111111');
  assert.equal(h.number, 1);
});

test('short decimal strings are zero-padded on the left', () => {
  // lat "5" -> "000005", lng "1" -> "000001": only lines 1 and 6 sum odd.
  assert.equal(binaryFromCoord(51.5, -0.1), '100001');
  assert.equal(hexagramFromCoord(51.5, -0.1, INDEX).number, 27);
});

test('decimalsOf expands exponential notation', () => {
  assert.equal(decimalsOf(1e-7), '0000001');
  assert.equal(decimalsOf(0), '');
  assert.equal(decimalsOf(51.51060719513929), '51060719513929');
  assert.equal(decimalsOf(-0.1318628895242), '1318628895242');
});

test('waypoints a few hundred metres apart get different hexagrams', () => {
  // Two points ~300m apart in Glasgow: identical leftmost decimal digits,
  // so only the granular digits can tell them apart.
  const a = hexagramFromCoord(55.86423728194739, -4.25182910475823, INDEX);
  const b = hexagramFromCoord(55.86713892736482, -4.24472910581231, INDEX);
  assert.notEqual(a.binary, b.binary);
});

test('innerCard returns the card contract plus the hexagram payload', () => {
  const card = innerCard({ lat: DOC_LAT, lng: DOC_LNG }, INDEX);
  assert.equal(card.voice, 'inner');
  assert.equal(card.text, INDEX.get('110111').haiku);
  assert.deepEqual(card.hexagram, { number: 9, title: 'The Small Hoard', glyph: '䷈' });
});

test('hexagramFromCoord throws when the index has no entry', () => {
  assert.throws(() => hexagramFromCoord(DOC_LAT, DOC_LNG, new Map()), /110111/);
});
