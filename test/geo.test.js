import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversine,
  bearing,
  destination,
  angleDelta,
  nextRotation,
  simplify,
  pathLength,
  bounds,
  formatDistance,
  formatKm,
  compassPoint,
  headingFromAlpha,
  createTraceGate,
} from '../public/lib/geo.js';

const GLA = { lat: 55.8642, lng: -4.2518 };   // Glasgow
const EDI = { lat: 55.9533, lng: -3.1883 };   // Edinburgh

test('haversine Glasgow-Edinburgh is about 67km', () => {
  const d = haversine(GLA, EDI);
  assert.ok(d > 65000 && d < 68000, `got ${d}`);
});

test('haversine is symmetric', () => {
  assert.equal(haversine(GLA, EDI), haversine(EDI, GLA));
});

test('haversine same point is zero', () => {
  assert.equal(haversine(GLA, GLA), 0);
});

test('bearing Glasgow->Edinburgh is roughly east-northeast', () => {
  const b = bearing(GLA, EDI);
  // Glasgow to Edinburgh: slightly north, mostly east.
  assert.ok(b > 70 && b < 90, `got ${b}deg`);
});

test('bearing is in [0, 360)', () => {
  const b = bearing(EDI, GLA);
  assert.ok(b >= 0 && b < 360);
});

test('destination round-trips with haversine', () => {
  const dest = destination(GLA, 90, 500);   // 500m east
  const d = haversine(GLA, dest);
  assert.ok(Math.abs(d - 500) < 1, `got ${d}`);
});

test('destination 0 bearing goes north', () => {
  const dest = destination(GLA, 0, 1000);
  assert.ok(dest.lat > GLA.lat);
  assert.ok(Math.abs(dest.lng - GLA.lng) < 0.0001);
});

test('destination 90 bearing goes east', () => {
  const dest = destination(GLA, 90, 1000);
  assert.ok(dest.lng > GLA.lng);
  assert.ok(Math.abs(dest.lat - GLA.lat) < 0.0001);
});

test('angleDelta wraps correctly', () => {
  assert.equal(angleDelta(0, 90), 90);
  assert.equal(angleDelta(350, 10), 20);
  assert.equal(angleDelta(10, 350), -20);
  assert.ok(Math.abs(angleDelta(0, 180)) === 180);  // 180 or -180, both valid
});

test('nextRotation sweeps through the 0/360 wrap without a full spin', () => {
  // The arrow bug: feeding rotate() a raw 0-360 angle animates 359 -> 0 as
  // a near-full backwards spin whenever the target crosses straight-up.
  let r = 350;
  r = nextRotation(r, 10);
  assert.equal(r, 370);             // forward through north, not -340
  r = nextRotation(r, 350);
  assert.equal(r, 350);             // and back again
  r = nextRotation(r, 0);
  assert.equal(r, 360);
  // Repeated calls keep the displayed angle equivalent to the target.
  for (const target of [5, 355, 5, 355, 90, 270, 5]) {
    r = nextRotation(r, target);
    const displayed = ((r % 360) + 360) % 360;
    assert.ok(Math.abs(angleDelta(displayed, target)) < 1e-9, `target ${target}, got ${r}`);
  }
});

test('simplify preserves endpoints', () => {
  const pts = [
    { lat: 0, lng: 0 },
    { lat: 0.001, lng: 0 },
    { lat: 0.002, lng: 0 },
    { lat: 0.003, lng: 0 },
  ];
  const s = simplify(pts, 5);
  assert.equal(s[0], pts[0]);
  assert.equal(s[s.length - 1], pts[pts.length - 1]);
});

test('simplify removes collinear points', () => {
  const pts = [
    { lat: 0, lng: 0 },
    { lat: 0.001, lng: 0 },
    { lat: 0.002, lng: 0 },
    { lat: 0.003, lng: 0 },
  ];
  const s = simplify(pts, 5);
  assert.equal(s.length, 2);
});

test('simplify keeps a deviating point', () => {
  const pts = [
    { lat: 0, lng: 0 },
    { lat: 0.001, lng: 0.001 },   // ~140m off the line
    { lat: 0.002, lng: 0 },
  ];
  const s = simplify(pts, 8);
  assert.equal(s.length, 3);
});

test('simplify handles short input', () => {
  assert.equal(simplify([], 5).length, 0);
  assert.equal(simplify([{ lat: 0, lng: 0 }], 5).length, 1);
  assert.equal(simplify([{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }], 5).length, 2);
});

test('pathLength sums segment distances', () => {
  const a = { lat: 55.8642, lng: -4.2518 };
  const b = { lat: 55.8642, lng: -4.25 };   // ~120m east
  const c = { lat: 55.8652, lng: -4.25 };   // ~111m north
  const len = pathLength([a, b, c]);
  assert.ok(len > 200 && len < 260, `got ${len}`);
});

test('bounds returns min/max', () => {
  const b = bounds([
    { lat: 1, lng: 2 },
    { lat: 3, lng: 0 },
    { lat: 0, lng: 5 },
  ]);
  assert.deepEqual(b, { minLat: 0, maxLat: 3, minLng: 0, maxLng: 5 });
});

test('formatDistance formats metres and kilometres', () => {
  assert.equal(formatDistance(500), '500 m');
  assert.equal(formatDistance(1500), '1.50 km');
  assert.equal(formatDistance(15000), '15.0 km');
});

test('formatKm always uses kilometres with one decimal', () => {
  assert.equal(formatKm(3200), '3.2 km');
  assert.equal(formatKm(1234), '1.2 km');
  assert.equal(formatKm(880), '0.9 km');
  assert.equal(formatKm(0), '0.0 km');
});

test('compassPoint returns correct cardinal', () => {
  assert.equal(compassPoint(0), 'N');
  assert.equal(compassPoint(90), 'E');
  assert.equal(compassPoint(180), 'S');
  assert.equal(compassPoint(270), 'W');
  assert.equal(compassPoint(45), 'NE');
});

test('headingFromAlpha inverts the counter-clockwise alpha', () => {
  // Facing north, alpha is 0; facing east, alpha is 270.
  assert.equal(headingFromAlpha(0), 0);
  assert.equal(headingFromAlpha(270), 90);
  assert.equal(headingFromAlpha(180), 180);
  assert.equal(headingFromAlpha(90), 270);
});

test('headingFromAlpha adds the screen rotation angle', () => {
  assert.equal(headingFromAlpha(0, 90), 90);
  assert.equal(headingFromAlpha(270, 90), 180);
  assert.equal(headingFromAlpha(0, 270), 270);
});

test('headingFromAlpha always returns [0, 360)', () => {
  for (let a = 0; a < 360; a += 7) {
    for (const angle of [0, 90, 180, 270]) {
      const h = headingFromAlpha(a, angle);
      assert.ok(h >= 0 && h < 360, `alpha=${a} angle=${angle} gave ${h}`);
    }
  }
});

test('arrow points at the target bearing regardless of heading', () => {
  // The bug: the arrow was rendered at (bearing - alpha), which puts it at
  // bearing + 2*heading in the world - correct only when facing north.
  const target = 90;
  for (let h = 0; h < 360; h += 15) {
    const alpha = (360 - h) % 360;
    const heading = headingFromAlpha(alpha);
    const relative = (target - heading + 360) % 360;   // on-screen rotation
    const world = (heading + relative) % 360;          // where it really points
    assert.equal(Math.round(world), target, `heading ${h}`);
  }
});

// A fix distM metres along bearingDeg from origin, at time t (ms).
function fixAt(origin, bearingDeg, distM, t, accuracy = 10) {
  return { ...destination(origin, bearingDeg, distM), t, accuracy };
}

test('trace gate rejects a mid-walk spike and keeps the walk that follows', () => {
  const gate = createTraceGate();
  // 60s of honest walking east at 1.4 m/s.
  for (let i = 0; i <= 60; i++) {
    assert.ok(gate.accept(fixAt(GLA, 90, 1.4 * i, i * 1000)), `fix ${i}`);
  }
  // A 300m spike one second later: implies ~300 m/s, must be dropped.
  assert.equal(gate.accept(fixAt(GLA, 0, 300, 61000)), false);
  // The next honest fix (back on the path) is still accepted.
  assert.ok(gate.accept(fixAt(GLA, 90, 1.4 * 61, 62000)));
});

test('trace gate keeps stationary jitter at several fixes per second', () => {
  // The naive speed-gate failure mode: 2 fixes/second bouncing ±10m reads as
  // ~72 km/h, but the accuracy allowance (15m + 15m) must absorb it.
  const gate = createTraceGate();
  for (let i = 0; i <= 40; i++) {
    const brg = i % 2 === 0 ? 0 : 180;
    assert.ok(gate.accept(fixAt(GLA, brg, 10, i * 500, 15)), `fix ${i}`);
  }
});

test('trace gate accepts a fast walk near the speed limit', () => {
  const gate = createTraceGate();
  for (let i = 0; i <= 30; i++) {
    assert.ok(gate.accept(fixAt(GLA, 90, 5.5 * i, i * 1000, 5)), `fix ${i}`);
  }
});

test('trace gate drops fixes with hopeless accuracy without starting a streak', () => {
  const gate = createTraceGate();
  assert.ok(gate.accept(fixAt(GLA, 0, 0, 0)));
  assert.equal(gate.accept(fixAt(GLA, 90, 1, 1000, 65)), false);
  // A normal fix right after is accepted immediately - no re-anchor delay.
  assert.ok(gate.accept(fixAt(GLA, 90, 2, 2000)));
});

test('trace gate re-anchors when a "spike" persists for 10s', () => {
  // GPS settled 200m away from a bad first fix: the jump is real.
  const gate = createTraceGate();
  assert.ok(gate.accept(fixAt(GLA, 0, 0, 0)));
  const accepted = [];
  for (let i = 1; i <= 12; i++) {
    accepted.push(gate.accept(fixAt(GLA, 90, 200 + 1.4 * i, i * 1000)));
  }
  // Rejected for the first 10s of the cluster...
  assert.deepEqual(accepted.slice(0, 10), Array(10).fill(false));
  // ...then re-anchored, and the cluster's own movement flows through.
  assert.deepEqual(accepted.slice(10), [true, true]);
});

test('trace gate rejects an out-of-order timestamp jump', () => {
  const gate = createTraceGate();
  assert.ok(gate.accept(fixAt(GLA, 0, 0, 5000)));
  // Older than the anchor and 100m away: dt clamps to 0, no speed allowance.
  assert.equal(gate.accept(fixAt(GLA, 90, 100, 4000)), false);
});
