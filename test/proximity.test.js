import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTracker,
  reachStop,
  unreachableRate,
  ARRIVE_M,
  HYSTERESIS,
} from '../public/lib/proximity.js';

const STOP_0 = { seq: 0, lat: 55.8642, lng: -4.2518, reachedAt: null, approached: false };
const STOP_1 = { seq: 1, lat: 55.8650, lng: -4.2500, reachedAt: null, approached: false };

function fixAt(stop, accuracy = 10, age = 0) {
  return { lat: stop.lat, lng: stop.lng, accuracy, timestamp: Date.now() - age };
}

function fixNear(stop, offsetM = 5, accuracy = 10) {
  // ~5m north
  return { lat: stop.lat + offsetM / 111320, lng: stop.lng, accuracy, timestamp: Date.now() };
}

test('tracker returns distance and bearing to the current stop', () => {
  const tracker = createTracker([STOP_0, STOP_1]);
  const r = tracker.update(fixNear(STOP_0, 100), Date.now());
  assert.equal(r.target.seq, 0);
  assert.ok(r.distance > 90 && r.distance < 110);
  assert.ok(r.bearing >= 0 && r.bearing < 360);
});

test('tracker requires hysteresis before arrival fires', () => {
  const stops = [{ ...STOP_0 }];
  const tracker = createTracker(stops);
  const now = Date.now();

  // First fix inside radius: no arrival yet.
  const r1 = tracker.update(fixAt(stops[0]), now);
  assert.equal(r1.arrived, null);
  assert.equal(r1.band, 'arrived');

  // Second fix: arrival fires.
  const r2 = tracker.update(fixAt(stops[0]), now + 1000);
  assert.ok(r2.arrived, 'arrival should fire on second consecutive fix');
  assert.equal(r2.arrived.seq, 0);
});

test('tracker does not fire arrival on a single fix then a far fix', () => {
  const stops = [{ ...STOP_0 }];
  const tracker = createTracker(stops);
  const now = Date.now();

  const r1 = tracker.update(fixAt(stops[0]), now);
  assert.equal(r1.arrived, null);

  // Move far away - resets streak.
  const farFix = { lat: stops[0].lat + 0.01, lng: stops[0].lng, accuracy: 10, timestamp: now };
  const r2 = tracker.update(farFix, now + 1000);
  assert.equal(r2.arrived, null);
  assert.equal(r2.band, 'far');

  // Back inside: streak restarts, no arrival yet.
  const r3 = tracker.update(fixAt(stops[0]), now + 2000);
  assert.equal(r3.arrived, null);
});

test('tracker rejects fixes with accuracy > 50m for arrival', () => {
  const stops = [{ ...STOP_0 }];
  const tracker = createTracker(stops);
  const now = Date.now();

  const r1 = tracker.update(fixAt(stops[0], 60), now);
  assert.equal(r1.usable, false);
  assert.equal(r1.arrived, null);

  const r2 = tracker.update(fixAt(stops[0], 60), now + 1000);
  assert.equal(r2.arrived, null, 'bad-accuracy fixes must not trigger arrival');
});

test('tracker rejects stale fixes for arrival', () => {
  const stops = [{ ...STOP_0 }];
  const tracker = createTracker(stops);
  const now = Date.now();

  const r1 = tracker.update(fixAt(stops[0], 10, 40000), now);
  assert.equal(r1.usable, false);
  assert.equal(r1.arrived, null);
});

test('tracker reports done when all stops are reached', () => {
  const stops = [{ ...STOP_0, reachedAt: 1000 }];
  const tracker = createTracker(stops);
  const r = tracker.update(fixAt(STOP_0), Date.now());
  assert.equal(r.target, null);
  assert.equal(r.band, 'done');
});

test('tracker advances to next stop after arrival', () => {
  const stops = [{ ...STOP_0 }, { ...STOP_1 }];
  const tracker = createTracker(stops);
  const now = Date.now();

  // Arrive at stop 0.
  tracker.update(fixAt(stops[0]), now);
  const r2 = tracker.update(fixAt(stops[0]), now + 1000);
  assert.ok(r2.arrived);
  reachStop(stops[0]);

  // Now target should be stop 1.
  const r3 = tracker.update(fixNear(STOP_1, 200), now + 2000);
  assert.equal(r3.target.seq, 1);
});

test('reachStop marks reached and approached flags', () => {
  const stop = { seq: 0, lat: 0, lng: 0, reachedAt: null, approached: false };
  reachStop(stop);
  assert.ok(stop.reachedAt);
  assert.equal(stop.approached, false);

  reachStop(stop, { approached: true });
  assert.equal(stop.approached, true);
});

test('unreachableRate computes the fudge ratio', () => {
  const stops = [
    { reachedAt: 1000, approached: false },
    { reachedAt: 2000, approached: true },
    { reachedAt: 3000, approached: false },
    { reachedAt: null, approached: false },
  ];
  const r = unreachableRate(stops);
  assert.equal(r.reached, 2);
  assert.equal(r.approached, 1);
  assert.equal(r.rate, 1 / 3);
});

test('unreachableRate handles empty', () => {
  const r = unreachableRate([]);
  assert.equal(r.reached, 0);
  assert.equal(r.rate, 0);
});
