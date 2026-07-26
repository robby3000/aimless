import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, makeRng, hashSeed, randomSeed } from '../public/lib/rng.js';

test('mulberry32 is deterministic for the same seed', () => {
  const a = mulberry32(12345);
  const b = mulberry32(12345);
  const seqA = Array.from({ length: 10 }, () => a());
  const seqB = Array.from({ length: 10 }, () => b());
  assert.deepEqual(seqA, seqB);
});

test('mulberry32 produces values in [0, 1)', () => {
  const r = mulberry32(999);
  for (let i = 0; i < 1000; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1, `got ${v}`);
  }
});

test('different seeds produce different sequences', () => {
  const a = Array.from({ length: 5 }, () => mulberry32(1)());
  const b = Array.from({ length: 5 }, () => mulberry32(2)());
  assert.notDeepEqual(a, b);
});

test('hashSeed is deterministic', () => {
  assert.equal(hashSeed('hello'), hashSeed('hello'));
  assert.notEqual(hashSeed('hello'), hashSeed('world'));
});

test('hashSeed returns uint32', () => {
  const h = hashSeed('test');
  assert.ok(h >= 0 && h <= 0xffffffff);
});

test('makeRng range produces values in [min, max)', () => {
  const rng = makeRng('test');
  for (let i = 0; i < 100; i++) {
    const v = rng.range(10, 20);
    assert.ok(v >= 10 && v < 20, `got ${v}`);
  }
});

test('makeRng int produces integers in [min, max]', () => {
  const rng = makeRng('test');
  for (let i = 0; i < 100; i++) {
    const v = rng.int(1, 5);
    assert.ok(Number.isInteger(v));
    assert.ok(v >= 1 && v <= 5, `got ${v}`);
  }
});

test('makeRng pick returns an element from the array', () => {
  const rng = makeRng('test');
  const arr = [10, 20, 30, 40, 50];
  for (let i = 0; i < 100; i++) {
    const v = rng.pick(arr);
    assert.ok(arr.includes(v));
  }
});

test('makeRng sign returns -1 or 1', () => {
  const rng = makeRng('test');
  for (let i = 0; i < 100; i++) {
    const v = rng.sign();
    assert.ok(v === -1 || v === 1);
  }
});

test('makeRng chance returns boolean', () => {
  const rng = makeRng('test');
  const v = rng.chance(0.5);
  assert.ok(typeof v === 'boolean');
});

test('makeRng chance(1) is always true, chance(0) is always false', () => {
  const rngT = makeRng('t');
  const rngF = makeRng('f');
  for (let i = 0; i < 50; i++) {
    assert.equal(rngT.chance(1), true);
    assert.equal(rngF.chance(0), false);
  }
});

test('makeRng shuffle returns a new array with same elements', () => {
  const rng = makeRng('test');
  const arr = [1, 2, 3, 4, 5];
  const shuffled = rng.shuffle(arr);
  assert.notEqual(shuffled, arr);          // new array
  assert.deepEqual([...shuffled].sort(), arr);  // same elements
});

test('makeRng is deterministic with string seed', () => {
  const a = makeRng('rust-gate-417');
  const b = makeRng('rust-gate-417');
  assert.equal(a.range(0, 100), b.range(0, 100));
  assert.equal(a.int(0, 100), b.int(0, 100));
});

test('makeRng is deterministic with number seed', () => {
  const a = makeRng(42);
  const b = makeRng(42);
  assert.equal(a.next(), b.next());
});

test('randomSeed produces a sayable string', () => {
  const seed = randomSeed();
  assert.match(seed, /^[a-z]+-[a-z]+-\d{3}$/);
});
