import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { oracleCard } from '../public/lib/oracle.js';
import { makeRng } from '../public/lib/rng.js';
import { decimalsOf } from '../public/lib/inner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = (slug) => JSON.parse(readFileSync(join(__dirname, '..', 'public', 'data', `${slug}.json`), 'utf8'));

const ORACLE_SLUGS = ['stray', 'small', 'slow', 'echo', 'crow', 'threshold', 'lattice'];
const VOICES = Object.fromEntries(ORACLE_SLUGS.map((s) => [s, DATA(s)]));

// The worked example from docs/ignore/haiku-recombination.md.
const DOC_LAT = 51.51060719513929;
const DOC_LNG = -0.1318628895242;
const STOP = { lat: DOC_LAT, lng: DOC_LNG };

test('every oracle voice ships four pools of exactly 64 lines', () => {
  for (const slug of ORACLE_SLUGS) {
    const v = VOICES[slug];
    for (const pool of ['titles', 'l1', 'l2', 'l3']) {
      assert.equal(v[pool].length, 64, `${slug}.${pool} has ${v[pool].length} entries`);
      assert.ok(v[pool].every((l) => typeof l === 'string' && l.length > 0), `${slug}.${pool} has an empty line`);
    }
    assert.ok(v.slug && v.name && v.epithet, `${slug} is missing metadata`);
  }
});

test('oracleCard reproduces the documented worked example', () => {
  // Seed "51060719513929|1318628895242|stray" draws [32, 37, 11, 5] in the
  // frozen order title -> l1 -> l2 -> l3.
  const stray = VOICES.stray;
  const rng = makeRng(`${decimalsOf(DOC_LAT)}|${decimalsOf(DOC_LNG)}|stray`);
  const draws = [rng.int(0, 63), rng.int(0, 63), rng.int(0, 63), rng.int(0, 63)];
  assert.deepEqual(draws, [32, 37, 11, 5]);

  const card = oracleCard(STOP, stray);
  assert.equal(card.oracle.title, stray.titles[32]);
  assert.equal(card.text, `${stray.l1[37]}\n${stray.l2[11]}\n${stray.l3[5]}`);
  assert.equal(card.voice, 'stray');
});

test('the draw is deterministic for a given coordinate and voice', () => {
  assert.deepEqual(oracleCard(STOP, VOICES.stray), oracleCard(STOP, VOICES.stray));
});

test('the voice slug salts the draw', () => {
  const a = oracleCard(STOP, VOICES.stray);
  const b = oracleCard(STOP, VOICES.slow);
  assert.notDeepEqual(a, b);
});

test('a moved coordinate reshuffles the card', () => {
  const a = oracleCard(STOP, VOICES.stray);
  const b = oracleCard({ lat: DOC_LAT + 0.0001, lng: DOC_LNG }, VOICES.stray);
  assert.notDeepEqual(a, b);
});

test('card text is exactly three newline-separated lines', () => {
  for (const slug of ORACLE_SLUGS) {
    const card = oracleCard(STOP, VOICES[slug]);
    assert.equal(card.text.split('\n').length, 3, `${slug} card is not three lines`);
  }
});

test('a shared used-set keeps lines and titles unique within a walk', () => {
  // 3-entry pools force collisions by the fourth draw: three stops consume
  // every string, and none may repeat.
  const tiny = {
    slug: 'tiny',
    titles: ['t0', 't1', 't2'],
    l1: ['a0', 'a1', 'a2'],
    l2: ['b0', 'b1', 'b2'],
    l3: ['c0', 'c1', 'c2'],
  };
  const used = new Set();
  const seen = new Set();
  for (let i = 0; i < 3; i++) {
    const card = oracleCard({ lat: 51.5 + i * 0.001, lng: -0.1 }, tiny, used);
    for (const s of [card.oracle.title, ...card.text.split('\n')]) {
      assert.ok(!seen.has(s), `repeated within the walk: ${s}`);
      seen.add(s);
    }
  }
  assert.equal(used.size, 12, 'every pool string should be spent');
});

test('a drawn string equal to one already used re-rolls', () => {
  // 't' sits in every pool, so the title takes it and each line must dodge.
  const voice = {
    slug: 'dup',
    titles: ['t'],
    l1: ['t', 'a', 'b'],
    l2: ['t', 'c'],
    l3: ['t', 'd', 'e'],
  };
  const card = oracleCard({ lat: 51.5, lng: -0.1 }, voice, new Set());
  assert.equal(card.oracle.title, 't');
  for (const l of card.text.split('\n')) assert.notEqual(l, 't');
});

test('a fresh used-set does not alter the draw', () => {
  const stray = VOICES.stray;
  assert.deepEqual(oracleCard(STOP, stray, new Set()), oracleCard(STOP, stray));
});

test('index draws are spread across the pools, not clumped', () => {
  // 2000 distinct coordinates through one voice: every slot should see a
  // broad spread of indices (loose chi-squared-flavoured sanity check).
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const card = oracleCard({ lat: 51 + i * 0.00037, lng: -0.1 - i * 0.00041 }, VOICES.stray);
    seen.add(card.text);
  }
  assert.ok(seen.size > 1900, `only ${seen.size} distinct cards in 2000 draws`);
});

