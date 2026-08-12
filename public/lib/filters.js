// Photo filter presets for the Walk Detail screen's FILTER rail. Pure data
// plus CSS generation - no DOM access, so it is node-testable.
//
// A preset is a CSS `filter` chain on the photo img, plus an optional overlay
// (vignette, duotone) rendered as a .photo-frame::after layer in HTML and
// composited onto the share-card canvas with globalCompositeOperation.
//
// The active filter is a single class on the result container -
// `filter-<id>` on #detail-content in-app and on <body> in the export - so
// switching filters never re-renders markup, it only toggles a class.

export const FILTERS = [
  { id: 'pop', name: 'Pop', filter: 'contrast(118%) saturate(135%) brightness(102%)' },
  {
    id: 'old-film', name: 'Old film',
    filter: 'sepia(35%) contrast(90%) brightness(105%) saturate(85%)',
    overlay: {
      blend: 'multiply',
      gradient: { kind: 'radial', stops: [[0.6, 'transparent'], [1, 'rgba(40,20,0,0.4)']] },
    },
  },
  { id: 'black-and-white', name: 'Black and white', filter: 'grayscale(100%) contrast(110%) brightness(98%)' },
  { id: 'original', name: 'Original', filter: null },
  {
    id: 'noire', name: 'Noire',
    filter: 'grayscale(100%) contrast(175%) brightness(85%)',
    overlay: {
      blend: 'normal',
      gradient: { kind: 'radial', stops: [[0.4, 'transparent'], [1, 'rgba(0,0,0,0.85)']] },
    },
  },
  { id: 'sepia', name: 'Sepia', filter: 'sepia(90%) contrast(95%) brightness(90%) saturate(110%)' },
  { id: 'muted', name: 'Muted', filter: 'saturate(55%) contrast(85%) brightness(105%)' },
  // Cold: sepia applied in hue-rotated space tints toward the complementary
  // (blue-teal) side when rotated back.
  { id: 'cold', name: 'Cold', filter: 'hue-rotate(180deg) sepia(40%) hue-rotate(-170deg) saturate(80%) contrast(105%) brightness(98%)' },
  { id: 'trippy-1', name: 'Trippy 1', filter: 'invert(100%) hue-rotate(180deg) saturate(200%) contrast(130%)' },
  { id: 'trippy-2', name: 'Trippy 2', filter: 'hue-rotate(290deg) saturate(350%) contrast(140%) brightness(110%)' },
  {
    id: 'trippy-3', name: 'Trippy 3',
    filter: 'invert(30%) hue-rotate(90deg) saturate(250%) contrast(200%)',
    overlay: {
      blend: 'color-dodge',
      gradient: { kind: 'linear', angle: 45, stops: [[0, 'rgba(255,0,128,0.5)'], [1, 'rgba(0,255,200,0.5)']] },
    },
  },
];

export function getFilter(id) {
  return FILTERS.find((f) => f.id === id) || getFilter('original');
}

// Photos are wrapped in .photo-frame so overlay filters have a positioned
// parent for their ::after layer. Injected alongside the base result styles
// (scoped to #detail-content in-app, bare in the export).
export const PHOTO_FRAME_CSS = `
.photo-frame { position: relative; margin-top: 8px; }
.photo-frame img { display: block; }
`;

/** CSS gradient string for an overlay gradient spec. */
export function gradientCSS(gradient) {
  const stops = gradient.stops.map(([offset, color]) => `${color} ${Math.round(offset * 100)}%`).join(', ');
  return gradient.kind === 'radial'
    ? `radial-gradient(circle, ${stops})`
    : `linear-gradient(${gradient.angle || 180}deg, ${stops})`;
}

/**
 * The CSS for one filter, gated on a `filter-<id>` class on `scope`
 * ('#detail-content' in-app, 'body' in the export). '' for Original.
 */
export function buildFilterCSS(id, scope) {
  const f = getFilter(id);
  if (!f.filter) return '';
  const sel = `${scope}.filter-${f.id}`;
  let css = `${sel} .photo-frame img { filter: ${f.filter}; }\n`;
  if (f.overlay) {
    // Clip the overlay to the photo's rounded corners; without this the
    // gradient would paint a few px past them onto the page background.
    css += `${sel} .photo-frame { overflow: hidden; border-radius: 8px; }\n`;
    css += `${sel} .photo-frame::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: ${gradientCSS(f.overlay.gradient)};
${f.overlay.blend !== 'normal' ? `  mix-blend-mode: ${f.overlay.blend};\n` : ''}}`;
  }
  return css;
}
