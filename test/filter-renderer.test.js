import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCssFilterData, buildGlitchBands, renderPhotoToCanvas, transformPixelData } from '../public/lib/filter-renderer.js';

function pixels(values, width = values.length) {
  return { data: new Uint8ClampedArray(values.flat()), width, height: values.length / width };
}

function apply(imageData, effect, params) {
  return transformPixelData(imageData, effect, params, imageData.width, imageData.height);
}

test('duotone maps endpoints and preserves alpha', () => {
  const image = pixels([[0, 0, 0, 91], [255, 255, 255, 173]]);
  apply(image, 'duotone', { shadow: '#102030', highlight: '#e0d0c0', contrast: 0 });
  assert.deepEqual([...image.data], [16, 32, 48, 91, 224, 208, 192, 173]);
});

test('tritone maps midpoint luminance to the midtone', () => {
  const image = pixels([[128, 128, 128, 255]]);
  apply(image, 'tritone', { shadow: '#000000', mid: '#804020', highlight: '#ffffff' });
  assert.ok(Math.abs(image.data[0] - 128) <= 1);
  assert.ok(Math.abs(image.data[1] - 64) <= 1);
  assert.ok(Math.abs(image.data[2] - 32) <= 1);
});

test('posterize follows discrete band boundaries', () => {
  const image = pixels([[63, 64, 255, 77]]);
  apply(image, 'posterize', { steps: 4 });
  assert.deepEqual([...image.data], [0, 85, 255, 77]);
});

test('heatmap changes colour and preserves alpha', () => {
  const image = pixels([[120, 80, 40, 37]]);
  apply(image, 'heatmap', { intensity: 100 });
  assert.equal(image.data[3], 37);
  assert.notDeepEqual([...image.data.slice(0, 3)], [120, 80, 40]);
});

test('chromatic aberration shifts red and blue in opposite directions', () => {
  const image = pixels([[10, 1, 20, 255], [30, 2, 40, 255], [50, 3, 60, 255]], 3);
  apply(image, 'chromatic', { offset: 1, strength: 100 });
  assert.deepEqual([...image.data], [10, 1, 40, 255, 10, 2, 60, 255, 30, 3, 60, 255]);
});

test('Drama is neutral at zero strength and preserves alpha', () => {
  const image = pixels([[90, 140, 210, 73]]);
  apply(image, 'drama', { style: 'Cinematic', strength: 0, shadows: 0, highlights: 0, saturation: 100 });
  assert.deepEqual([...image.data], [90, 140, 210, 73]);
});

test('Glitch output is deterministic by seed and preserves alpha', () => {
  const params = { style: 'VHS Tear', amount: 88, bandSize: 16, split: 9, seed: 451 };
  assert.deepEqual(buildGlitchBands(params, 8, 8), buildGlitchBands(params, 8, 8));
  const values = Array.from({ length: 64 }, (_, index) => [index * 4, index * 2, 255 - index * 3, 80 + index]);
  const first = pixels(values, 8);
  const second = pixels(values, 8);
  apply(first, 'glitch', params);
  apply(second, 'glitch', params);
  assert.deepEqual([...first.data], [...second.data]);
  for (let index = 3; index < first.data.length; index += 4) assert.equal(first.data[index], values[(index - 3) / 4][3]);
});

test('unknown pixel effects fail rather than producing a heatmap', () => {
  assert.throws(() => apply(pixels([[90, 140, 210, 255]]), 'future', {}), /Unsupported pixel effect/);
});

test('pixel effects remain order-sensitive', () => {
  const first = pixels([[90, 140, 210, 255]]);
  apply(first, 'posterize', { steps: 3 });
  apply(first, 'duotone', { shadow: '#102030', highlight: '#e0a060', contrast: 0 });
  const second = pixels([[90, 140, 210, 255]]);
  apply(second, 'duotone', { shadow: '#102030', highlight: '#e0a060', contrast: 0 });
  apply(second, 'posterize', { steps: 3 });
  assert.notDeepEqual([...first.data], [...second.data]);
});

test('CSS filter fallback applies chains in order and preserves alpha unless requested', () => {
  const first = pixels([[80, 120, 200, 201]]);
  applyCssFilterData(first, 'brightness(120%) contrast(110%) saturate(80%) hue-rotate(30deg)');
  assert.equal(first.data[3], 201);
  assert.notDeepEqual([...first.data.slice(0, 3)], [80, 120, 200]);
  applyCssFilterData(first, 'opacity(50%)');
  assert.equal(first.data[3], 100);
});

test('CSS filter fallback refuses effects requiring native canvas support', () => {
  const image = pixels([[80, 120, 200, 255]]);
  assert.throws(() => applyCssFilterData(image, 'blur(4px)'), /does not support blur/);
  assert.throws(() => applyCssFilterData(image, 'drop-shadow(0 4px 8px #000)'), /does not support drop-shadow/);
});

test('the ordered canvas pipeline executes every operation family', async () => {
  class FakeContext {
    constructor() { this.filter = 'none'; this.globalAlpha = 1; this.globalCompositeOperation = 'source-over'; }
    clearRect() {}
    drawImage() {}
    fillRect() {}
    putImageData() {}
    getImageData() { return { data: new Uint8ClampedArray([80, 120, 200, 255]) }; }
    createImageData(width, height) { return { data: new Uint8ClampedArray(width * height * 4) }; }
    createLinearGradient() { return { addColorStop() {} }; }
    createRadialGradient() { return { addColorStop() {} }; }
    createPattern() { return {}; }
    save() {}
    restore() {}
    translate() {}
    scale() {}
  }
  class FakeCanvas {
    constructor(width, height) { this.width = width; this.height = height; this.context = new FakeContext(); }
    getContext() { return this.context; }
  }
  const canvases = [];
  const createCanvas = (width, height) => {
    const canvas = new FakeCanvas(width, height);
    canvases.push(canvas);
    return canvas;
  };
  const filter = {
    id: 'pipeline', name: 'Pipeline', operations: [
      { kind: 'css-filter', value: 'contrast(110%)' },
      { kind: 'pixel', effect: 'duotone', params: { shadow: '#000000', highlight: '#ffffff', contrast: 0 } },
      { kind: 'overlay', effect: 'gradient', params: { c1: '#ff0000', c2: '#0000ff', angle: 0, blend: 'soft-light', opacity: 40 } },
      { kind: 'grain', params: { size: 1, opacity: 20, blend: 'overlay' } },
      { kind: 'bloom', params: { blur: 4, threshold: 140, contrast: 180, saturate: 100, opacity: 30, color: '#ffffff', tint: 0, blend: 'screen' } },
    ],
  };
  const output = await renderPhotoToCanvas({ width: 1, height: 1 }, filter, 1, 1, createCanvas);
  assert.ok(output instanceof FakeCanvas);
  assert.ok(canvases.length >= 4);
});
