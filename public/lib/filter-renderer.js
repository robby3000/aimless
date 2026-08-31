import { dramaSettings, getFilter, glitchSettings, grainDataUri } from './filters.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const number = (value, fallback = 0) => value != null && String(value).trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : fallback;

const BLENDS = new Set([
  'source-over', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light',
  'color-dodge', 'color-burn', 'darken', 'lighten', 'difference', 'exclusion',
  'hue', 'saturation', 'color', 'luminosity',
]);

function hexToRgb(hex) {
  const raw = String(hex || '#000000').replace('#', '');
  const value = raw.length === 3 ? raw.split('').map((char) => char + char).join('') : raw.padEnd(6, '0').slice(0, 6);
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

function resetContext(ctx, width, height) {
  if ('filter' in ctx) ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, width, height);
}

function lerpByte(start, end, amount) {
  return clamp(Math.round(start + (end - start) * amount), 0, 255);
}

function posterizeByte(value, steps) {
  const band = Math.min(steps - 1, Math.floor(value / 256 * steps));
  return Math.round(band / (steps - 1) * 255);
}

function mapPixelColor(value, colors) {
  const position = value * (colors.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(colors.length - 1, lower + 1);
  const amount = position - lower;
  return colors[lower].map((channel, index) => lerpByte(channel, colors[upper][index], amount));
}

function pixelEffectColors(effect, params) {
  if (effect === 'duotone') {
    const shadow = hexToRgb(params.shadow);
    const contrast = 1 + number(params.contrast) / 100;
    return [shadow, hexToRgb(params.highlight).map((value) => clamp(Math.round((value - 127.5) * contrast + 127.5), 0, 255))];
  }
  if (effect === 'tritone') return [hexToRgb(params.shadow), hexToRgb(params.mid), hexToRgb(params.highlight)];
  const intensity = number(params.intensity, 100) / 100;
  return [
    [0.02, 0, 0.15], [0.1, 0, 0.4], [0.35, 0.05, 0.55],
    [0.7, 0.25, 0.1], [0.95, 0.7, 0.05], [1, 1, 0.9],
  ].map((color) => color.map((value) => Math.round(value * intensity * 255)));
}

function sampleDramaTable(value, table) {
  const position = clamp(value, 0, 255) / 255 * (table.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(table.length - 1, lower + 1);
  return Math.round((table[lower] + (table[upper] - table[lower]) * (position - lower)) * 255);
}

function applyDramaPixelData(data, params) {
  const { saturation, tables } = dramaSettings(params);
  for (let index = 0; index < data.length; index += 4) {
    const luminance = 0.213 * data[index] + 0.715 * data[index + 1] + 0.072 * data[index + 2];
    data[index] = sampleDramaTable(luminance + (data[index] - luminance) * saturation, tables[0]);
    data[index + 1] = sampleDramaTable(luminance + (data[index + 1] - luminance) * saturation, tables[1]);
    data[index + 2] = sampleDramaTable(luminance + (data[index + 2] - luminance) * saturation, tables[2]);
  }
}

export function buildGlitchBands(params, width, height) {
  const settings = glitchSettings(params);
  const styleSeed = [...settings.style].reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619), settings.seed);
  const random = seededRandom(styleSeed);
  const targetBands = 4 + (1 - settings.bandSize) * 36;
  const averageHeight = Math.max(1, Math.round(height / targetBands));
  const bands = [];
  for (let y = 0; y < height;) {
    const bandHeight = Math.min(height - y, Math.max(1, Math.round(averageHeight * (0.55 + random() * 1.1))));
    const active = settings.amount > 0 && random() < settings.profile.active * (0.35 + settings.amount * 0.65);
    const dx = active ? Math.round((random() * 2 - 1) * settings.displacement) : 0;
    const dy = active ? Math.round((random() * 2 - 1) * settings.displacement * 0.06) : 0;
    const exposure = active ? 1 - random() * settings.profile.exposure * settings.amount : 1;
    bands.push({ y, height: bandHeight, dx, dy, exposure });
    y += bandHeight;
  }
  return { bands, split: Math.round(settings.split) };
}

function applyGlitchPixelData(data, params, width, height) {
  const source = new Uint8ClampedArray(data);
  const { bands, split } = buildGlitchBands(params, width, height);
  for (const band of bands) {
    for (let y = band.y; y < band.y + band.height; y++) {
      const sourceY = clamp(y - band.dy, 0, height - 1);
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const sourceX = clamp(x - band.dx, 0, width - 1);
        const redIndex = (sourceY * width + clamp(sourceX - split, 0, width - 1)) * 4;
        const greenIndex = (sourceY * width + sourceX) * 4;
        const blueIndex = (sourceY * width + clamp(sourceX + split, 0, width - 1)) * 4;
        data[index] = clamp(Math.round(source[redIndex] * band.exposure), 0, 255);
        data[index + 1] = clamp(Math.round(source[greenIndex + 1] * band.exposure), 0, 255);
        data[index + 2] = clamp(Math.round(source[blueIndex + 2] * band.exposure), 0, 255);
        data[index + 3] = source[index + 3];
      }
    }
  }
}

export function transformPixelData(imageData, effect, params, width, height) {
  if (!['duotone', 'tritone', 'posterize', 'heatmap', 'drama', 'chromatic', 'glitch'].includes(effect)) throw new Error(`Unsupported pixel effect: ${effect}`);
  const data = imageData.data;
  if (effect === 'glitch') {
    applyGlitchPixelData(data, params, width, height);
    return imageData;
  }
  if (effect === 'drama') {
    applyDramaPixelData(data, params);
    return imageData;
  }
  if (effect === 'chromatic') {
    const original = new Uint8ClampedArray(data);
    const offset = Math.round(number(params.offset));
    const strength = clamp(number(params.strength), 0, 100) / 100;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const redIndex = (y * width + clamp(x - offset, 0, width - 1)) * 4;
        const blueIndex = (y * width + clamp(x + offset, 0, width - 1)) * 4;
        data[index] = lerpByte(original[index], original[redIndex], strength);
        data[index + 1] = original[index + 1];
        data[index + 2] = lerpByte(original[index + 2], original[blueIndex + 2], strength);
      }
    }
    return imageData;
  }
  const colors = pixelEffectColors(effect, params);
  for (let index = 0; index < data.length; index += 4) {
    if (effect === 'posterize') {
      const steps = clamp(Math.round(number(params.steps, 5)), 2, 16);
      data[index] = posterizeByte(data[index], steps);
      data[index + 1] = posterizeByte(data[index + 1], steps);
      data[index + 2] = posterizeByte(data[index + 2], steps);
    } else {
      const luminance = (0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]) / 255;
      const mapped = mapPixelColor(luminance, colors);
      data[index] = mapped[0];
      data[index + 1] = mapped[1];
      data[index + 2] = mapped[2];
    }
  }
  return imageData;
}

function parseAmount(value, percentBase = 1) {
  return String(value).trim().endsWith('%') ? number(String(value).replace('%', '')) / 100 * percentBase : number(value);
}

function applyColorFunction(data, name, rawValue) {
  const amount = name === 'hue-rotate' ? number(String(rawValue).replace('deg', '')) * Math.PI / 180 : parseAmount(rawValue);
  const cos = Math.cos(amount);
  const sin = Math.sin(amount);
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index], green = data[index + 1], blue = data[index + 2];
    if (name === 'brightness') {
      data[index] = clamp(red * amount, 0, 255); data[index + 1] = clamp(green * amount, 0, 255); data[index + 2] = clamp(blue * amount, 0, 255);
    } else if (name === 'contrast') {
      data[index] = clamp((red - 128) * amount + 128, 0, 255); data[index + 1] = clamp((green - 128) * amount + 128, 0, 255); data[index + 2] = clamp((blue - 128) * amount + 128, 0, 255);
    } else if (name === 'invert') {
      data[index] = red * (1 - amount) + (255 - red) * amount; data[index + 1] = green * (1 - amount) + (255 - green) * amount; data[index + 2] = blue * (1 - amount) + (255 - blue) * amount;
    } else if (name === 'opacity') {
      data[index + 3] = clamp(data[index + 3] * amount, 0, 255);
    } else if (name === 'grayscale' || name === 'saturate') {
      const target = name === 'grayscale' ? 1 - amount : amount;
      const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      data[index] = clamp(luminance + (red - luminance) * target, 0, 255); data[index + 1] = clamp(luminance + (green - luminance) * target, 0, 255); data[index + 2] = clamp(luminance + (blue - luminance) * target, 0, 255);
    } else if (name === 'sepia') {
      const sr = clamp(red * 0.393 + green * 0.769 + blue * 0.189, 0, 255);
      const sg = clamp(red * 0.349 + green * 0.686 + blue * 0.168, 0, 255);
      const sb = clamp(red * 0.272 + green * 0.534 + blue * 0.131, 0, 255);
      data[index] = red + (sr - red) * amount; data[index + 1] = green + (sg - green) * amount; data[index + 2] = blue + (sb - blue) * amount;
    } else if (name === 'hue-rotate') {
      data[index] = clamp(red * (0.213 + cos * 0.787 - sin * 0.213) + green * (0.715 - cos * 0.715 - sin * 0.715) + blue * (0.072 - cos * 0.072 + sin * 0.928), 0, 255);
      data[index + 1] = clamp(red * (0.213 - cos * 0.213 + sin * 0.143) + green * (0.715 + cos * 0.285 + sin * 0.14) + blue * (0.072 - cos * 0.072 - sin * 0.283), 0, 255);
      data[index + 2] = clamp(red * (0.213 - cos * 0.213 - sin * 0.787) + green * (0.715 - cos * 0.715 + sin * 0.715) + blue * (0.072 + cos * 0.928 + sin * 0.072), 0, 255);
    } else {
      throw new Error(`Canvas fallback does not support ${name}()`);
    }
  }
}

export function applyCssFilterData(imageData, filter) {
  const matches = [...String(filter).matchAll(/([a-z-]+)\(([^)]+)\)/g)];
  if (!matches.length) throw new Error(`Invalid CSS filter: ${filter}`);
  matches.forEach((match) => applyColorFunction(imageData.data, match[1], match[2]));
  return imageData;
}

function applyCssFilter(source, destination, filter, width, height) {
  const ctx = destination.getContext('2d');
  resetContext(ctx, width, height);
  if ('filter' in ctx) {
    ctx.filter = filter;
    if (ctx.filter !== 'none') {
      ctx.drawImage(source, 0, 0, width, height);
      ctx.filter = 'none';
      return;
    }
  }
  const sourceCtx = source.getContext('2d');
  const imageData = sourceCtx.getImageData(0, 0, width, height);
  applyCssFilterData(imageData, filter);
  ctx.putImageData(imageData, 0, 0);
}

function createLinearGradient(ctx, angle, width, height) {
  const radians = number(angle) * Math.PI / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const length = Math.abs(width * dx) + Math.abs(height * dy);
  return ctx.createLinearGradient(width / 2 - dx * length / 2, height / 2 - dy * length / 2, width / 2 + dx * length / 2, height / 2 + dy * length / 2);
}

function blendMode(value) {
  if (!value || value === 'normal') return 'source-over';
  if (!BLENDS.has(value)) throw new Error(`Unsupported canvas blend mode: ${value}`);
  return value;
}

function drawOverlay(ctx, operation, width, height) {
  const params = operation.params || {};
  if (params.stops) {
    let gradient;
    if (params.kind === 'radial') {
      gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.hypot(width, height) / 2);
    } else {
      gradient = createLinearGradient(ctx, params.angle ?? 180, width, height);
    }
    params.stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  } else if (operation.effect === 'colorwash') {
    ctx.fillStyle = params.color;
    ctx.fillRect(0, 0, width, height);
  } else if (operation.effect === 'vignette') {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(width / 2, height / 2);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop((100 - number(params.size, 60)) / 100, 'transparent');
    gradient.addColorStop(1, params.color);
    ctx.fillStyle = gradient;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  } else if (operation.effect === 'scanlines') {
    ctx.fillStyle = params.color;
    for (let y = 0; y < height; y += Math.max(1, number(params.size, 3))) ctx.fillRect(0, y, width, 1);
  } else {
    const gradient = createLinearGradient(ctx, params.angle, width, height);
    const stops = operation.effect === 'prism'
      ? [[0.5 - params.width / 200, 'transparent'], [0.5 - params.width / 600, params.c1], [0.5, '#fff'], [0.5 + params.width / 600, params.c2], [0.5 + params.width / 200, 'transparent']]
      : [[0, params.c1], [1, params.c2]];
    stops.forEach(([offset, color]) => gradient.addColorStop(clamp(offset, 0, 1), color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}

function applyOverlay(source, destination, operation, width, height) {
  const ctx = destination.getContext('2d');
  resetContext(ctx, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  const params = operation.params || {};
  ctx.globalAlpha = clamp(number(params.opacity, 100), 0, 100) / 100;
  const defaultBlend = operation.effect === 'vignette' ? 'multiply' : operation.effect === 'prism' ? 'screen' : operation.effect === 'colorwash' ? 'overlay' : operation.effect === 'gradient' ? 'soft-light' : 'normal';
  ctx.globalCompositeOperation = blendMode(params.blend || defaultBlend);
  drawOverlay(ctx, operation, width, height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function applyGrain(source, destination, grainCanvas, grainImage, operation, width, height) {
  const ctx = destination.getContext('2d');
  resetContext(ctx, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  const params = operation.params || {};
  const dimension = Math.max(16, Math.round(64 * Math.max(0.1, number(params.size, 1))));
  grainCanvas.width = dimension;
  grainCanvas.height = dimension;
  const grainCtx = grainCanvas.getContext('2d');
  grainCtx.drawImage(grainImage, 0, 0, dimension, dimension);
  ctx.globalAlpha = clamp(number(params.opacity, 25), 0, 100) / 100;
  ctx.globalCompositeOperation = blendMode(params.blend || 'overlay');
  ctx.fillStyle = ctx.createPattern(grainCanvas, 'repeat');
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function applyBloom(source, destination, scratch, operation, width, height) {
  const params = operation.params || {};
  const scratchCtx = scratch.getContext('2d');
  resetContext(scratchCtx, width, height);
  if (!('filter' in scratchCtx)) throw new Error('Bloom requires Canvas filter support on this device');
  scratchCtx.filter = `brightness(${params.threshold}%) contrast(${params.contrast}%) blur(${params.blur}px) saturate(${params.saturate}%)`;
  if (scratchCtx.filter === 'none') throw new Error('Bloom filters are unsupported on this device');
  scratchCtx.drawImage(source, 0, 0, width, height);
  scratchCtx.filter = 'none';
  if (number(params.tint) > 0) {
    scratchCtx.globalAlpha = clamp(number(params.tint), 0, 100) / 100;
    scratchCtx.globalCompositeOperation = 'color';
    scratchCtx.fillStyle = params.color || '#ffffff';
    scratchCtx.fillRect(0, 0, width, height);
  }
  const ctx = destination.getContext('2d');
  resetContext(ctx, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  ctx.globalAlpha = clamp(number(params.opacity, 50), 0, 100) / 100;
  ctx.globalCompositeOperation = blendMode(params.blend || 'screen');
  ctx.drawImage(scratch, 0, 0, width, height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function defaultCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

let grainImagePromise;
function loadGrainImage() {
  if (!grainImagePromise) grainImagePromise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = grainDataUri();
  });
  return grainImagePromise;
}

export async function renderPhotoToCanvas(image, filterOrId, width, height, createCanvas = defaultCanvas, loadGrain = loadGrainImage) {
  const filter = typeof filterOrId === 'string' ? getFilter(filterOrId) : filterOrId;
  if (!filter || !Array.isArray(filter.operations)) throw new Error('Invalid filter preset');
  let source = createCanvas(width, height);
  let destination = createCanvas(width, height);
  let scratch = null;
  const sourceCtx = source.getContext('2d');
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  sourceCtx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);

  for (let index = 0; index < filter.operations.length;) {
    const operation = filter.operations[index];
    if (operation.kind === 'css-filter') {
      const values = [];
      while (index < filter.operations.length && filter.operations[index].kind === 'css-filter') values.push(filter.operations[index++].value);
      applyCssFilter(source, destination, values.join(' '), width, height);
    } else if (operation.kind === 'pixel') {
      const imageData = source.getContext('2d').getImageData(0, 0, width, height);
      transformPixelData(imageData, operation.effect, operation.params || {}, width, height);
      const ctx = destination.getContext('2d');
      resetContext(ctx, width, height);
      ctx.putImageData(imageData, 0, 0);
      index++;
    } else if (operation.kind === 'overlay') {
      applyOverlay(source, destination, operation, width, height);
      index++;
    } else if (operation.kind === 'grain') {
      applyGrain(source, destination, createCanvas(1, 1), await loadGrain(), operation, width, height);
      index++;
    } else if (operation.kind === 'bloom') {
      if (!scratch) scratch = createCanvas(width, height);
      applyBloom(source, destination, scratch, operation, width, height);
      index++;
    } else {
      throw new Error(`Unsupported canvas operation: ${operation.kind}`);
    }
    [source, destination] = [destination, source];
  }
  return source;
}
