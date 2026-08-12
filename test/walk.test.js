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
  FIRST_LEG_ARC,
  STOP_ARC,
} from '../public/lib/walk.js';
import { haversine, bearing, angleDelta } from '../public/lib/geo.js';

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

test('without startHeading the plan records startHeading null', () => {
  const plan = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'no-heading' });
  assert.equal(plan.startHeading, null);
});

test('first stop lands within FIRST_LEG_ARC of startHeading', () => {
  for (const facing of [0, 45, 90, 180, 270, 359]) {
    for (let s = 0; s < 10; s++) {
      const plan = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: `oriented-${s}`, startHeading: facing });
      const off = Math.abs(angleDelta(facing, bearing(plan.origin, plan.stops[0])));
      assert.ok(off <= FIRST_LEG_ARC + 1e-9, `facing ${facing}, seed ${s}: first stop ${off}° off`);
    }
  }
});

test('every stop lands within STOP_ARC of startHeading, measured from origin', () => {
  for (const facing of [0, 45, 90, 180, 270, 315]) {
    for (let s = 0; s < 10; s++) {
      const plan = planWalk({ origin: ORIGIN, stops: 6, budgetMin: 60, seed: `arc-${s}`, startHeading: facing });
      for (const [i, stop] of plan.stops.entries()) {
        const off = Math.abs(angleDelta(facing, bearing(plan.origin, stop)));
        assert.ok(off <= STOP_ARC + 1e-9, `facing ${facing}, seed ${s}, stop ${i}: ${off}° off`);
      }
    }
  }
});

test('startHeading wraps across north correctly', () => {
  // Facing 350°: the wedge is 275°-65°, so a stop at 10° must be accepted.
  const plan = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'wrap', startHeading: 350 });
  assert.equal(plan.startHeading, 350);
  for (const stop of plan.stops) {
    const off = Math.abs(angleDelta(350, bearing(plan.origin, stop)));
    assert.ok(off <= STOP_ARC + 1e-9, `stop ${off}° off a 350° heading`);
  }
});

test('startHeading is normalised and stored on the plan', () => {
  const plan = planWalk({ origin: ORIGIN, stops: 3, budgetMin: 30, seed: 'norm', startHeading: 370 });
  assert.equal(plan.startHeading, 10);
});

test('same seed and heading reproduce the same walk', () => {
  const a = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'repro-h', startHeading: 123 });
  const b = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'repro-h', startHeading: 123 });
  assert.deepEqual(a, b);
});

test('different headings with the same seed produce different walks', () => {
  const a = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'same-seed', startHeading: 0 });
  const b = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'same-seed', startHeading: 180 });
  assert.notDeepEqual(a.stops, b.stops);
});

test('non-finite startHeading falls back to an unconstrained walk', () => {
  const plan = planWalk({ origin: ORIGIN, stops: 5, budgetMin: 45, seed: 'nan', startHeading: NaN });
  assert.equal(plan.startHeading, null);
  assert.equal(plan.stops.length, 5);
});
