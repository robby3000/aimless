import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildKmlString } from '../public/lib/kml.js';

const WALK = {
  seed: 'sill-ash-398',
  origin: { lat: 55.8642, lng: -4.2518 },
  stops: [
    { seq: 0, lat: 55.8650, lng: -4.2500, reachedAt: 1000, approached: false },
    { seq: 1, lat: 55.8660, lng: -4.2490, reachedAt: null, approached: true },
  ],
  trace: [
    { lat: 55.8642, lng: -4.2518 },
    { lat: 55.8645, lng: -4.2510 },
    { lat: 55.8650, lng: -4.2500 },
  ],
};

test('buildKmlString throws on missing walk', () => {
  assert.throws(() => buildKmlString(null), /Invalid walk/);
  assert.throws(() => buildKmlString({}), /Invalid walk/);
  assert.throws(() => buildKmlString({ stops: [] }), /Invalid walk/);
});

test('buildKmlString throws on missing origin', () => {
  assert.throws(
    () => buildKmlString({ stops: [{ seq: 0, lat: 1, lng: 2 }] }),
    /origin/
  );
});

test('coordinates are ordered longitude,latitude,altitude', () => {
  const kml = buildKmlString(WALK);
  // The origin is -4.2518,55.8642,0 — longitude first.
  assert.match(kml, /-4\.2518,55\.8642,0/);
  // No latitude-first occurrence of the origin coords.
  assert.doesNotMatch(kml, /55\.8642,-4\.2518,/);
});

test('missing altitude defaults to 0', () => {
  const walk = {
    seed: 'x',
    origin: { lat: 1, lng: 2 },
    stops: [{ seq: 0, lat: 3, lng: 4, reachedAt: 1, approached: false }],
    trace: [{ lat: 5, lng: 6 }],
  };
  const kml = buildKmlString(walk);
  // Every coordinate triple ends with ,0
  const coords = [...kml.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)];
  assert.ok(coords.length > 0, 'should find coordinate triples');
  for (const [, , , alt] of coords) {
    assert.equal(alt, '0', `altitude should default to 0, got ${alt}`);
  }
});

test('honors explicit altitude when provided', () => {
  const walk = {
    seed: 'x',
    origin: { lat: 1, lng: 2, alt: 42 },
    stops: [{ seq: 0, lat: 3, lng: 4, alt: 7, reachedAt: 1, approached: false }],
    trace: [{ lat: 5, lng: 6, alt: 9 }],
  };
  const kml = buildKmlString(walk);
  assert.match(kml, /2,1,42/);
  assert.match(kml, /4,3,7/);
  assert.match(kml, /6,5,9/);
});

test('escapes XML special characters in the route name', () => {
  const walk = {
    seed: '<evil>&"quote"',
    origin: { lat: 1, lng: 2 },
    stops: [{ seq: 0, lat: 3, lng: 4, reachedAt: 1, approached: false }],
    trace: [{ lat: 5, lng: 6 }],
  };
  const kml = buildKmlString(walk);
  assert.doesNotMatch(kml, /<evil>/);
  assert.match(kml, /&lt;evil&gt;&amp;&quot;quote&quot;/);
});

test('produces three layers: plan line, trace line, stop points', () => {
  const kml = buildKmlString(WALK);
  // Two LineStrings (plan + trace).
  const lineStrings = (kml.match(/<LineString>/g) || []).length;
  assert.equal(lineStrings, 2, 'should have exactly two LineStrings (plan + trace)');

  // Three Points (origin + 2 stops).
  const points = (kml.match(/<Point>/g) || []).length;
  assert.equal(points, 3, 'should have one Point per origin + stop');

  // Placemarks: 2 lines + 3 points = 5.
  const placemarks = (kml.match(/<Placemark>/g) || []).length;
  assert.equal(placemarks, 5);
});

test('plan path runs origin -> stops in sequence order', () => {
  const walk = {
    seed: 'x',
    origin: { lat: 0, lng: 0 },
    stops: [
      { seq: 1, lat: 2, lng: 2, reachedAt: 1, approached: false },
      { seq: 0, lat: 1, lng: 1, reachedAt: 1, approached: false },
    ],
    trace: [{ lat: 0.5, lng: 0.5 }],
  };
  const kml = buildKmlString(walk);
  // The planned placemark's coordinates block: 0,0 -> 1,1 -> 2,2 (sorted by seq).
  const planned = kml.split('— planned')[1].split('— walked')[0];
  assert.match(planned, /0,0,0[\s\S]*1,1,0[\s\S]*2,2,0/);
});

test('falls back to plan path when trace is empty', () => {
  const walk = {
    seed: 'x',
    origin: { lat: 0, lng: 0 },
    stops: [{ seq: 0, lat: 1, lng: 1, reachedAt: 1, approached: false }],
    trace: [],
  };
  const kml = buildKmlString(walk);
  // The walked LineString should still contain coordinates (the plan path).
  const walked = kml.split('— walked')[1].split('</Placemark>')[0];
  assert.match(walked, /0,0,0/);
  assert.match(walked, /1,1,0/);
});

test('stop placemarks carry reach status in their names', () => {
  const kml = buildKmlString(WALK);
  assert.match(kml, /Stop 1<\/name>/);              // reached, no suffix
  assert.match(kml, /Stop 2 \(close as I can get\)/); // approached
});

test('not-reached stops are labelled as such', () => {
  const walk = {
    seed: 'x',
    origin: { lat: 0, lng: 0 },
    stops: [{ seq: 0, lat: 1, lng: 1, reachedAt: null, approached: false }],
    trace: [{ lat: 0.5, lng: 0.5 }],
  };
  const kml = buildKmlString(walk);
  assert.match(kml, /Stop 1 \(not reached\)/);
});

test('output is a valid KML 2.2 document with tessellate', () => {
  const kml = buildKmlString(WALK);
  assert.match(kml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(kml, /<kml xmlns="http:\/\/www\.opengis\.net\/kml\/2\.2">/);
  assert.match(kml, /<tessellate>1<\/tessellate>/);
  assert.match(kml, /<\/kml>$/);
});
