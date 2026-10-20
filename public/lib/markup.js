/**
 * Pure markup builders — string-in, string-out, no DOM, no state.
 * Extracted from index.html so they are unit-testable with node --test.
 */

import { bounds } from './geo.js';

/**
 * The abstract walk-trace SVG: a dashed plan line between stops, the actual
 * walked path as a solid line, and pop-in stop markers.
 *
 * colors is configurable so the Done screen can use a different palette
 * without touching the detail view or the HTML export. When animate is
 * set the walked line draws itself then the markers pop in — pure CSS
 * inside the SVG, so it survives into the script-free HTML artifact.
 * gate emits the animations paused (trace undrawn): in-app JS releases
 * them at the right moment, instead of replaying a spent animation.
 */
export function traceSVG(plan, trace, colors = {}, { animate = true, gate = false } = {}) {
  const { planStroke = '#333', traceStroke = '#7ab8ff', originFill = '#7ab8ff', stopFill = '#e8e8e8' } = colors;
  const pts = [plan.origin, ...plan.stops];
  const all = [...trace, ...pts];
  const b = bounds(all);
  const w = 300;
  const h = 300;
  const rangeLat = (b.maxLat - b.minLat) || 0.001;
  const rangeLng = (b.maxLng - b.minLng) || 0.001;
  const scale = Math.min(w / rangeLng, h / rangeLat) * 0.85;
  const cx = w / 2;
  const cy = h / 2;
  const midLat = (b.minLat + b.maxLat) / 2;
  const midLng = (b.minLng + b.maxLng) / 2;

  const project = (p) => ({
    x: cx + (p.lng - midLng) * scale,
    y: cy - (p.lat - midLat) * scale,   // invert: north is up
  });

  // Trace path.
  const tracePts = trace.map(project);
  const tracePath = tracePts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  // Draw duration scales with the path's pixel length so a long walk
  // doesn't draw absurdly fast, clamped to a snappy range.
  let traceLen = 0;
  for (let i = 1; i < tracePts.length; i++) {
    traceLen += Math.hypot(tracePts[i].x - tracePts[i - 1].x, tracePts[i].y - tracePts[i - 1].y);
  }
  const drawDur = Math.min(5, Math.max(1.4, traceLen / 120));

  // Stop markers pop in once the line has mostly drawn, staggered.
  const stopMarkers = pts.map((p, i) => {
    const { x, y } = project(p);
    const isOrigin = i === 0;
    const r = isOrigin ? 5 : 4;
    const o = isOrigin ? 1 : 0.7;
    const delay = (drawDur * 0.85 + i * 0.12).toFixed(2);
    return `<circle class="tr-dot" style="--o:${o};animation-delay:${delay}s" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${isOrigin ? originFill : stopFill}" opacity="${o}"/>`;
  }).join('');

  // Lines between stops (the plan).
  const planPath = pts.map((p, i) => {
    const { x, y } = project(p);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const hold = gate ? ';animation-play-state:paused' : '';
  const animStyle = animate && trace.length > 1 ? `<style>
    .tr-line{stroke-dasharray:1;stroke-dashoffset:1;animation:tr-draw ${drawDur.toFixed(2)}s ease-in-out 0.25s forwards${hold}}
    .tr-dot{opacity:0;animation:tr-pop .35s ease-out forwards${hold}}
    @keyframes tr-draw{to{stroke-dashoffset:0}}
    @keyframes tr-pop{to{opacity:var(--o,1)}}
    @media (prefers-reduced-motion:reduce),print{.tr-line{stroke-dashoffset:0;animation:none}.tr-dot{opacity:var(--o,1);animation:none}}
  </style>` : '';

  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    ${animStyle}<path d="${planPath}" fill="none" stroke="${planStroke}" stroke-width="1" stroke-dasharray="3,3"/>
    <path class="tr-line" pathLength="1" d="${tracePath}" fill="none" stroke="${traceStroke}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${stopMarkers}
  </svg>`;
}
