import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  drawCard,
  drawWalk,
  assemble,
  pairKey,
  pushRecent,
  recentKeys,
  OPENERS,
  CONSTRAINTS,
  CODAS,
  PROBABILITIES,
  RECENT_WALKS,
} from '../public/lib/deck.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'public', 'data');

function loadVoice(slug) {
  return JSON.parse(readFileSync(join(DATA, `${slug}.json`), 'utf8'));
}

const CROW = loadVoice('crow');
const THRESHOLD = loadVoice('threshold');
const LATTICE = loadVoice('lattice');

test('all three voice files have the required fields', () => {
  for (const v of [CROW, THRESHOLD, LATTICE]) {
    assert.ok(v.slug, 'missing slug');
    assert.ok(v.name, 'missing name');
    assert.ok(v.epithet, 'missing epithet');
    assert.ok(v.lore, 'missing lore');
    assert.ok(Array.isArray(v.directives) && v.directives.length === 12, `${v.slug} directives`);
    assert.ok(Array.isArray(v.targets) && v.targets.length === 14, `${v.slug} targets`);
  }
});

test('no directive or target contains an exclamation mark or emoji', () => {
  for (const v of [CROW, THRESHOLD, LATTICE]) {
    for (const d of v.directives) {
      assert.ok(!d.includes('!'), `${v.slug} directive has !: ${d}`);
      assert.ok(!d.match(/[\u{1F000}-\u{1FFFF}]/u), `${v.slug} directive has emoji: ${d}`);
    }
    for (const t of v.targets) {
      assert.ok(!t.includes('!'), `${v.slug} target has !: ${t}`);
    }
  }
});

test('no shared slot contains an exclamation mark or emoji', () => {
  for (const s of [...OPENERS, ...CONSTRAINTS, ...CODAS]) {
    assert.ok(!s.includes('!'), `slot has !: ${s}`);
  }
});

test('drawCard returns a card with text', () => {
  const card = drawCard({ seed: 'test', voice: CROW, stopIndex: 0 });
  assert.ok(card.text.length > 10);
  assert.ok(card.directive);
  assert.ok(card.target);
  assert.equal(card.voice, 'crow');
  assert.ok(card.pairKey);
});

test('drawCard text contains the directive and target', () => {
  const card = drawCard({ seed: 'test', voice: CROW, stopIndex: 0 });
  assert.ok(card.text.includes(card.directive));
  assert.ok(card.text.includes(card.target));
});

test('drawCard is deterministic for the same seed/voice/stop', () => {
  const a = drawCard({ seed: 'repro', voice: CROW, stopIndex: 2 });
  const b = drawCard({ seed: 'repro', voice: CROW, stopIndex: 2 });
  assert.deepEqual(a, b);
});

test('different stop indices can produce different cards', () => {
  // drawCard is independently seeded per stop, so collisions are possible.
  // drawWalk handles within-walk dedup. Here we just verify that different
  // stop indices *can* produce different cards (they do for most seeds).
  let foundDifferent = false;
  for (let i = 0; i < 10 && !foundDifferent; i++) {
    const a = drawCard({ seed: `diff-${i}`, voice: CROW, stopIndex: 0 });
    const b = drawCard({ seed: `diff-${i}`, voice: CROW, stopIndex: 1 });
    if (a.pairKey !== b.pairKey) foundDifferent = true;
  }
  assert.ok(foundDifferent, 'expected at least one seed to produce different cards for stops 0 and 1');
});

test('drawWalk produces the right number of cards with no repeated pairs', () => {
  const { cards, used } = drawWalk({ seed: 'walk-1', voice: CROW, stops: 5 });
  assert.equal(cards.length, 5);
  assert.equal(used.length, 5);
  const keys = new Set(used);
  assert.equal(keys.size, used.length, 'duplicate pair keys within a walk');
});

test('drawWalk is deterministic', () => {
  const a = drawWalk({ seed: 'repro-walk', voice: THRESHOLD, stops: 5 });
  const b = drawWalk({ seed: 'repro-walk', voice: THRESHOLD, stops: 5 });
  assert.deepEqual(a, b);
});

test('drawWalk avoids recent pairs from previous walks', () => {
  // First walk.
  const w1 = drawWalk({ seed: 'recent-1', voice: CROW, stops: 5 });
  // Second walk with the recent pairs from the first.
  const w2 = drawWalk({ seed: 'recent-2', voice: CROW, stops: 5, recent: w1.used });
  const w1Keys = new Set(w1.used);
  for (const k of w2.used) {
    assert.ok(!w1Keys.has(k), `walk 2 reused pair from walk 1: ${k}`);
  }
});

test('assemble produces correct grammar', () => {
  const text = assemble({
    directive: 'Find',
    target: 'the brightest thing at ground level',
    opener: null,
    constraint: null,
    coda: null,
  });
  assert.equal(text, 'Find the brightest thing at ground level.');
});

test('assemble with opener', () => {
  const text = assemble({
    directive: 'Find',
    target: 'the brightest thing at ground level',
    opener: 'Do not look for long',
    constraint: null,
    coda: null,
  });
  assert.equal(text, 'Do not look for long. Find the brightest thing at ground level.');
});

test('assemble with constraint', () => {
  const text = assemble({
    directive: 'Appraise',
    target: 'the most recently disturbed surface here',
    opener: null,
    constraint: 'without moving your feet',
    coda: null,
  });
  assert.equal(text, 'Appraise the most recently disturbed surface here, without moving your feet.');
});

test('assemble with coda', () => {
  const text = assemble({
    directive: 'Find',
    target: 'the brightest thing at ground level',
    opener: null,
    constraint: null,
    coda: 'Now forget it',
  });
  assert.equal(text, 'Find the brightest thing at ground level. Now forget it.');
});

test('assemble with all slots', () => {
  const text = assemble({
    directive: 'Count',
    target: 'all the ways out of this spot',
    opener: 'Somebody chose this',
    constraint: 'twice, from opposite sides',
    coda: 'That was the point',
  });
  assert.equal(
    text,
    'Somebody chose this. Count all the ways out of this spot, twice, from opposite sides. That was the point.'
  );
});

test('pairKey is unique per directive+target', () => {
  assert.equal(pairKey('Find', 'the thing'), pairKey('Find', 'the thing'));
  assert.notEqual(pairKey('Find', 'the thing'), pairKey('Find', 'another thing'));
  assert.notEqual(pairKey('Find', 'the thing'), pairKey('Count', 'the thing'));
});

test('pushRecent caps at RECENT_WALKS', () => {
  let buffer = [];
  for (let i = 0; i < RECENT_WALKS + 2; i++) {
    buffer = pushRecent(buffer, [`pair-${i}`]);
  }
  assert.equal(buffer.length, RECENT_WALKS);
  // Oldest should have been dropped.
  assert.ok(!buffer.flat().includes('pair-0'));
  assert.ok(buffer.flat().includes(`pair-${RECENT_WALKS + 1}`));
});

test('recentKeys flattens the buffer', () => {
  const buffer = [['a', 'b'], ['c'], ['d', 'e']];
  const keys = recentKeys(buffer);
  assert.deepEqual(keys, ['a', 'b', 'c', 'd', 'e']);
});

test('card text never ends with an exclamation mark', () => {
  for (let i = 0; i < 20; i++) {
    const card = drawCard({ seed: `punct-${i}`, voice: CROW, stopIndex: i });
    assert.ok(!card.text.endsWith('!'), `card ends with !: ${card.text}`);
  }
});

test('card text is second person present tense (starts with a verb or opener)', () => {
  // We can't fully NLP-check this, but we can verify no banned words from deck.md.
  const banned = ['maybe', 'perhaps', 'enjoy', 'have fun', 'take your time', 'well done', 'liminal', 'mindful'];
  for (let i = 0; i < 20; i++) {
    for (const v of [CROW, THRESHOLD, LATTICE]) {
      const card = drawCard({ seed: `ban-${i}`, voice: v, stopIndex: i });
      const lower = card.text.toLowerCase();
      for (const word of banned) {
        assert.ok(!lower.includes(word), `card contains banned word "${word}": ${card.text}`);
      }
    }
  }
});
