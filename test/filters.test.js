import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FILTERS, getFilter, gradientCSS, buildFilterCSS } from '../public/lib/filters.js';

test('FILTERS lists the 11 rail presets with unique ids', () => {
  assert.equal(FILTERS.length, 11);
  assert.equal(new Set(FILTERS.map((f) => f.id)).size, 11);
  for (const f of FILTERS) {
    assert.match(f.id, /^[a-z0-9-]+$/);
    assert.ok(f.name.length > 0);
  }
});

test('Original is the only filterless preset and carries no overlay', () => {
  const filterless = FILTERS.filter((f) => !f.filter);
  assert.equal(filterless.length, 1);
  assert.equal(filterless[0].id, 'original');
  assert.ok(!filterless[0].overlay);
});

test('overlay presets have a well-formed blend and gradient', () => {
  const withOverlay = FILTERS.filter((f) => f.overlay);
  assert.deepEqual(withOverlay.map((f) => f.id).sort(), ['noire', 'old-film', 'trippy-3']);
  for (const f of withOverlay) {
    assert.ok(['normal', 'multiply', 'color-dodge'].includes(f.overlay.blend));
    const g = f.overlay.gradient;
    assert.ok(['radial', 'linear'].includes(g.kind));
    assert.ok(g.stops.length >= 2);
    for (const [offset, color] of g.stops) {
      assert.ok(offset >= 0 && offset <= 1);
      assert.ok(color.length > 0);
    }
  }
});

test('getFilter falls back to original for unknown ids', () => {
  assert.equal(getFilter('pop').name, 'Pop');
  assert.equal(getFilter('nope').id, 'original');
});

test('gradientCSS renders radial and linear CSS gradients', () => {
  assert.equal(
    gradientCSS({ kind: 'radial', stops: [[0.6, 'transparent'], [1, 'rgba(0,0,0,0.85)']] }),
    'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.85) 100%)'
  );
  assert.equal(
    gradientCSS({ kind: 'linear', angle: 45, stops: [[0, 'red'], [1, 'blue']] }),
    'linear-gradient(45deg, red 0%, blue 100%)'
  );
});

test('buildFilterCSS is empty for Original', () => {
  assert.equal(buildFilterCSS('original', '#detail-content'), '');
});

test('buildFilterCSS scopes the photo rule to the filter class', () => {
  const css = buildFilterCSS('pop', '#detail-content');
  assert.ok(css.includes('#detail-content.filter-pop .photo-frame img { filter: contrast(118%)'));
  assert.ok(!css.includes('::after'));
});

test('buildFilterCSS emits an overlay layer for vignette/duotone presets', () => {
  const css = buildFilterCSS('old-film', 'body');
  assert.ok(css.includes('body.filter-old-film .photo-frame::after'));
  assert.ok(css.includes('radial-gradient(circle, transparent 60%, rgba(40,20,0,0.4) 100%)'));
  assert.ok(css.includes('mix-blend-mode: multiply'));
  assert.ok(css.includes('overflow: hidden'));
});

test('buildFilterCSS omits mix-blend-mode for normal-blend overlays', () => {
  const css = buildFilterCSS('noire', 'body');
  assert.ok(css.includes('.photo-frame::after'));
  assert.ok(!css.includes('mix-blend-mode'));
});
