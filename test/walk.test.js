import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planWalk,
  legLength,
  estimate,
  nextStopIndex,
  PACE_M_PER_MIN,
  DWELL_MIN,
  DETOUR,
  MIN_LEG,
  MAX_LEG,
  MIN_TURN,
  MAX_TURN,
} from '../public/lib/walk.js';
import { haversine, bearing } from '../public/lib/geo.js';

const ORIGIN = { lat: 55.8642, lng: -4.2518 };   // Glasgow

test('planWalk produces the correct stop count', () => {
  const plan = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'test-1' });
  assert.equal(plan.stops.length, 5);
});

test('planWalk assigns sequential seq numbers', () => {
  const plan = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'test-1' });
  plan.stops.forEach((s, i) => assert.equal(s.seq, i));
});

test('every leg is within [minLeg, maxLeg]', () => {
  const plan = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'test-2' });
  const { minLeg, maxLeg } = legLength(5, 45);
  const pts = [plan.origin, ...plan.stops];
  for (let i = 1; i < pts.length; i++) {
    const d = haversine(pts[i - 1], pts[i]);
    assert.ok(d >= minLeg - 1 && d <= maxLeg + 1, `leg ${i}: ${d}m not in [${minLeg}, ${maxLeg}]`);
  }
});

test('every turn is within 40-150 degrees (non-final legs)', () => {
  const plan = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'test-3' });
  const pts = [plan.origin, ...plan.stops];
  let heading = bearing(pts[0], pts[1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const next = bearing(pts[i], pts[i + 1]);
    let turn = Math.abs(((next - heading + 540) % 360) - 180);
    // The last leg is biased home and exempt from the turn constraint.
    if (i < pts.length - 2) {
      assert.ok(
        turn >= MIN_TURN - 1 && turn <= MAX_TURN + 1,
        `turn at leg ${i}: ${turn}deg not in [${MIN_TURN}, ${MAX_TURN}]`
      );
    }
    heading = next;
  }
});

test('last stop is closer to origin than the second-to-last', () => {
  const plan = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'test-4' });
  const last = plan.stops[plan.stops.length - 1];
  const pen = plan.stops[plan.stops.length - 2];
  const dLast = haversine(last, plan.origin);
  const dPen = haversine(pen, plan.origin);
  assert.ok(dLast < dPen, `last ${dLast}m should be closer than pen ${dPen}m`);
});

test('same seed produces byte-identical output', () => {
  const a = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'repro' });
  const b = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'repro' });
  assert.deepEqual(a, b);
});

test('different seeds produce different walks', () => {
  const a = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'aaa' });
  const b = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'bbb' });
  assert.notDeepEqual(a.stops, b.stops);
});

test('planWalk stores the seed as a string', () => {
  const plan = planWalk({ origin: ORIGIN, stops: 3, budgetMin: 30, seed: 12345 });
  assert.equal(typeof plan.seed, 'string');
  assert.equal(plan.seed, '12345');
});

test('planWalk throws on missing origin', () => {
  assert.throws(() => planWalk({ stops: 5, budgetMin: 45, seed: 'x' }));
});

test('planWalk throws on zero stops', () => {
  assert.throws(() => planWalk({ origin: ORIGIN, stops: 0, budgetMin: 45, seed: 'x' }));
});

test('legLength computes reasonable values for 5 stops / 45 min', () => {
  const { legStraight, minLeg, maxLeg, clamped } = legLength(5, 45);
  // 45 - 5*1.5 = 37.5 min walking. 75 * 37.5 = 2812.5m. /5 /1.35 = 416.7m
  assert.ok(legStraight > 400 && legStraight < 440, `got ${legStraight}`);
  assert.equal(minLeg, legStraight * 0.6);
  assert.equal(maxLeg, legStraight * 1.4);
  assert.equal(clamped, null);
});

test('legLength clamps short legs to MIN_LEG', () => {
  const { legStraight, clamped } = legLength(20, 10);
  assert.equal(legStraight, MIN_LEG);
  assert.equal(clamped, 'short');
});

test('estimate returns sensible numbers', () => {
  const plan = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'est' });
  const est = estimate(plan);
  assert.ok(est.straightM > 0);
  assert.ok(est.walkedM > est.straightM);   // detour factor applied
  assert.ok(est.minutes > 0);
});

test('nextStopIndex finds the first unreached stop', () => {
  const stops = [
    { seq: 0, reachedAt: 1000 },
    { seq: 1, reachedAt: null },
    { seq: 2, reachedAt: null },
  ];
  assert.equal(nextStopIndex(stops), 1);
});

test('nextStopIndex returns -1 when all reached', () => {
  const stops = [
    { seq: 0, reachedAt: 1000 },
    { seq: 1, reachedAt: 2000 },
  ];
  assert.equal(nextStopIndex(stops), -1);
});

test('single-stop walk does not crash', () => {
  const plan = planWalk({ origin: ORIGIN, stops: 1, budgetMin: 15, seed: 'single' });
  assert.equal(plan.stops.length, 1);
});
