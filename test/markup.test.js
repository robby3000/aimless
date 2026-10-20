import { test } from 'node:test';
import assert from 'node:assert/strict';
import { traceSVG } from '../public/lib/markup.js';

const PLAN = { origin: { lat: 55.86, lng: -4.25 }, stops: [{ lat: 55.87, lng: -4.24 }, { lat: 55.85, lng: -4.26 }] };
const TRACE = [
  { lat: 55.86, lng: -4.25 },
  { lat: 55.865, lng: -4.245 },
  { lat: 55.87, lng: -4.24 },
];

test('traceSVG emits a valid svg with plan, trace and stop markers', () => {
  const svg = traceSVG(PLAN, TRACE);
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
  assert.match(svg, /stroke-dasharray="3,3"/);        // the dashed plan line
  assert.match(svg, /class="tr-line"/);               // the walked trace
  assert.equal((svg.match(/class="tr-dot"/g) || []).length, 3); // origin + 2 stops
});

test('traceSVG animates by default and emits no style block when animate:false', () => {
  assert.match(traceSVG(PLAN, TRACE), /animation:tr-draw/);
  assert.doesNotMatch(traceSVG(PLAN, TRACE, {}, { animate: false }), /tr-draw|<style>/);
});

test('traceSVG gate pauses the animations for in-app release', () => {
  const gated = traceSVG(PLAN, TRACE, {}, { gate: true });
  assert.match(gated, /animation-play-state:paused/);
  assert.doesNotMatch(traceSVG(PLAN, TRACE), /animation-play-state:paused/);
});

test('traceSVG emits a static drawn trace when there is nothing to animate', () => {
  const svg = traceSVG(PLAN, [TRACE[0]]);   // single point: no line to draw
  assert.doesNotMatch(svg, /tr-draw|animation-play-state/);
});

test('traceSVG honors palette overrides', () => {
  const svg = traceSVG(PLAN, TRACE, { traceStroke: '#ff0000', originFill: '#00ff00' });
  assert.match(svg, /stroke="#ff0000"/);
  assert.match(svg, /fill="#00ff00"/);
});
