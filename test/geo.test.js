import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversine,
  bearing,
  destination,
  angleDelta,
  simplify,
  pathLength,
  bounds,
  formatDistance,
  compassPoint,
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
