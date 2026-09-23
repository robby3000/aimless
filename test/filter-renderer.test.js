import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPhotoToCanvas } from '../public/lib/filter-renderer.js';
import { getFilter } from '../public/lib/filters.js';

class FakeContext {
  constructor() { this.drawCalls = []; }
  drawImage(...args) { this.drawCalls.push(args); }
}

class FakeCanvas {
  constructor(width, height) { this.width = width; this.height = height; this.context = new FakeContext(); }
  getContext() { return this.context; }
}

const createCanvas = (width, height) => new FakeCanvas(width, height);
const rendered = new FakeCanvas(7, 7);
const render = (canvas, spec) => { render.calls.push([canvas, spec]); return rendered; };
render.calls = [];

test('renderPhotoToCanvas cover-fits the source and renders the filter spec', async () => {
  render.calls.length = 0;
  const image = { width: 200, height: 100 };
  const output = await renderPhotoToCanvas(image, 'sepia', 100, 100, createCanvas, render);
  assert.equal(output, rendered);
  const [fitted, spec] = render.calls[0];
  assert.equal(fitted.width, 100);
  assert.equal(fitted.height, 100);
  // scale = max(0.5, 1) = 1 -> draws 200×100 centred, cropping left/right.
  assert.deepEqual(fitted.context.drawCalls[0].slice(1), [-50, 0, 200, 100]);
  assert.equal(spec, getFilter('sepia').spec);
});

test('renderPhotoToCanvas accepts a filter object and resolves unknown ids to original', async () => {
  render.calls.length = 0;
  const image = { naturalWidth: 100, naturalHeight: 100 };
  await renderPhotoToCanvas(image, getFilter('pop'), 50, 50, createCanvas, render);
  assert.equal(render.calls[0][1], getFilter('pop').spec);
  await renderPhotoToCanvas(image, 'nope', 50, 50, createCanvas, render);
  assert.equal(render.calls[1][1], getFilter('original').spec);
});

test('renderPhotoToCanvas rejects filter objects without a spec', async () => {
  await assert.rejects(
    () => renderPhotoToCanvas({ width: 1, height: 1 }, { id: 'bad', name: 'Bad' }, 1, 1, createCanvas, render),
    /Invalid filter preset/
  );
});
