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
  compassPoint,
  headingFromAlpha,
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
