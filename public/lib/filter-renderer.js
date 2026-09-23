import { renderToCanvas } from './engine/canvas.js';
import { getFilter } from './filters.js';

function defaultCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// Engine-backed photo renderer. The source is cover-fit into width×height,
// then the filter's spec renders at that size — same order the legacy
// pipeline used. Async to preserve the old call signature; `createCanvas`
// and `render` are injectable so the adapter contract is testable in Node.
export async function renderPhotoToCanvas(image, filterOrId, width, height, createCanvas = defaultCanvas, render = renderToCanvas) {
  const filter = typeof filterOrId === 'string' ? getFilter(filterOrId) : filterOrId;
  if (!filter || !filter.spec) throw new Error('Invalid filter preset');
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const fitted = createCanvas(width, height);
  fitted.getContext('2d').drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  return render(fitted, filter.spec);
}
