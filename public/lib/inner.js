// The Inner voice. Every other voice draws a card from a seeded deck; The
// Inner draws nothing - each waypoint is assigned the I Ching hexagram that
// its own coordinates determine, so the same spot on Earth always yields the
// same hexagram. See docs/iching/hexagram-from-coordinates.md. Pure: no DOM,
// no fetch, no storage; the hexagram data (public/data/inner.json) is passed
// in as an index built by buildHexIndex.

/**
 * The decimal digits of |x| after the point, with exponential notation
 * expanded (String() switches to "1.2e-7" below 1e-6, which would otherwise
 * poison the digit extraction for coordinates within 0.1m of the equator or
 * the prime meridian).
 */
export function decimalsOf(x) {
  const s = String(Math.abs(x));
  const e = s.indexOf('e');
  if (e === -1) {
    const dot = s.indexOf('.');
    return dot === -1 ? '' : s.slice(dot + 1);
  }
  const digits = s.slice(0, e).replace('.', '');
  const point = 1 + parseInt(s.slice(e + 1), 10);   // decimal point position within digits
  if (point <= 0) return '0'.repeat(-point) + digits;
  return point >= digits.length ? '' : digits.slice(point);
}

/**
 * The last six decimal digits - the most granular, the ones that vary
 * between waypoints a street apart - zero-padded on the left when shorter.
 */
function last6(dec) {
  return dec.length >= 6 ? dec.slice(-6) : dec.padStart(6, '0');
}

/**
 * The six-bit binary string for a coordinate, bottom line first. Line i sums
 * lng digit i with lat digit (7 - i) across the last-six window; an odd sum
 * is a solid line (1), even is broken (0). Cross-pairing makes every line a
 * function of both coordinates and avoids adjacent-digit correlation.
 */
export function binaryFromCoord(lat, lng) {
  const lat6 = last6(decimalsOf(lat));
  const lng6 = last6(decimalsOf(lng));
  let bin = '';
  for (let i = 0; i < 6; i++) {
    bin += (Number(lng6[i]) + Number(lat6[5 - i])) % 2 === 1 ? '1' : '0';
  }
  return bin;
}

/** Map from 6-bit binary string to hexagram entry (the inner.json array). */
export function buildHexIndex(data) {
  const index = new Map();
  for (const entry of data) index.set(entry.binary, entry);
  return index;
}

/** The hexagram entry a coordinate resolves to. */
export function hexagramFromCoord(lat, lng, index) {
  const bin = binaryFromCoord(lat, lng);
  const entry = index.get(bin);
  if (!entry) throw new Error(`no hexagram for binary ${bin}`);
  return entry;
}

/**
 * A card for one stop, in the shape the walk flow expects (drawCard's
 * contract) plus the hexagram payload the card UI and the export render.
 */
export function innerCard(stop, index) {
  const h = hexagramFromCoord(stop.lat, stop.lng, index);
  return {
    text: h.haiku,
    voice: 'inner',
    hexagram: { number: h.number, title: h.title, glyph: h.hex_font },
  };
}
