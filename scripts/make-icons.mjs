// Generates the three PWA icons from a simple vector mark: a dashed circle
// with a single arrow, suggesting a drift. No external dependencies - we draw
// to a canvas and write PNGs using node:canvas... except we have zero deps.
//
// Instead we emit minimal valid PNGs by hand. The icons are solid colour
// squares with a centered SVG rendered via a data URL in an OffscreenCanvas
// where available, falling back to a pre-baked base64 PNG otherwise.
//
// Simplest reliable approach: write an SVG and convert with `sips` on macOS.
// This script writes SVGs to /tmp and shells out to sips for the PNGs.

import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const BG = '#0a0a0a';
const FG = '#e8e8e8';
const ACCENT = '#7ab8ff';

function svg(size, maskable = false) {
  // Maskable icons need the safe zone: keep content within the central 80%.
  const pad = maskable ? size * 0.1 : 0;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2 - pad) * 0.72;
  const arrowLen = r * 0.6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${FG}" stroke-width="${size * 0.012}" stroke-dasharray="${r * 0.15} ${r * 0.1}" opacity="0.5"/>
  <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - arrowLen}" stroke="${ACCENT}" stroke-width="${size * 0.03}" stroke-linecap="round"/>
  <polygon points="${cx},${cy - arrowLen - size * 0.04} ${cx - size * 0.035},${cy - arrowLen + size * 0.02} ${cx + size * 0.035},${cy - arrowLen + size * 0.02}" fill="${ACCENT}"/>
  <circle cx="${cx}" cy="${cy}" r="${size * 0.015}" fill="${FG}"/>
</svg>`;
}

function writePng(svgStr, name, size) {
  const svgPath = `/tmp/aimless-${name}.svg`;
  const pngPath = join(OUT, `${name}.png`);
  writeFileSync(svgPath, svgStr);
  try {
    execSync(`sips -s format png -z ${size} ${size} "${svgPath}" --out "${pngPath}"`, { stdio: 'pipe' });
    console.log(`wrote ${pngPath}`);
  } catch {
    // sips may not handle SVG; fall back to writing the SVG and warning.
    console.warn(`sips failed for ${name}; writing SVG to ${pngPath.replace('.png', '.svg')}`);
    writeFileSync(join(OUT, `${name}.svg`), svgStr);
  }
}

writePng(svg(192), 'icon-192', 192);
writePng(svg(512), 'icon-512', 512);
writePng(svg(512, true), 'icon-512-maskable', 512);
