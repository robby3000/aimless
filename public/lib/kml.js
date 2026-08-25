// KML route export. Pure: takes walk data, returns an XML string.
// No DOM, no storage. Tested with node --test (test/kml.test.js).
//
// Three layers, bottom-to-top so mapping apps render them in the same
// figure/ground order the in-app trace SVG uses (dashed plan, solid trace):
//
//   1. Plan path  - straight lines through [origin, stop1, stop2, ...].
//                   Thin + semi-transparent, the "where you were meant to go".
//   2. Trace      - the GPS points actually walked. Solid + bright.
//   3. Stops      - <Point> placemarks for the origin and each stop, labelled,
//                   so Google Earth / Organic Maps / Apple Maps show waypoints.
//
// KML 2.2 has no dash style on <LineStyle> (only color, width, colorMode), so
// the app's dashed plan line is expressed here as a thin, faint solid line
// instead. Non-standard dash hacks render inconsistently across readers and
// violate the OGC KML 2.2 requirement, so they are deliberately avoided.

const KML_NS = 'http://www.opengis.net/kml/2.2';

/** Plan path: thin, semi-transparent white. KML color is aabbggrr. */
const PLAN_COLOR = '66ffffff';   // ~40% opacity white
const PLAN_WIDTH = 2;

/** Walked trace: solid bright blue, matching the spec. */
const TRACE_COLOR = 'ff0000ff';  // opaque blue
const TRACE_WIDTH = 4;

/** Stop placemark icon color (yellow) so waypoints pop against both lines. */
const STOP_COLOR = 'ff00ffff';   // opaque yellow

function escapeXml(unsafe) {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function coord(p) {
  // KML requires longitude,latitude,altitude in that order.
  const alt = typeof p.alt === 'number' ? p.alt : 0;
  return `${p.lng},${p.lat},${alt}`;
}

function lineStringPlacemark(name, coords, color, width) {
  const body = coords.map(coord).join('\n          ');
  return `    <Placemark>
      <name>${escapeXml(name)}</name>
      <Style>
        <LineStyle>
          <color>${color}</color>
          <width>${width}</width>
        </LineStyle>
      </Style>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
          ${body}
        </coordinates>
      </LineString>
    </Placemark>`;
}

function pointPlacemark(name, point, color) {
  return `    <Placemark>
      <name>${escapeXml(name)}</name>
      <Style>
        <IconStyle>
          <color>${color}</color>
        </IconStyle>
      </Style>
      <Point>
        <coordinates>${coord(point)}</coordinates>
      </Point>
    </Placemark>`;
}

/**
 * Build a standard OGC KML 2.2 document for a walk.
 *
 * @param {object} walk  The walk record from IndexedDB. Must carry `origin`
 *   ({lat, lng}), `stops` (Array<{seq, lat, lng, reachedAt?, approached?}>)
 *   and `trace` (Array<{lat, lng}>). `seed` is used for the document name.
 * @returns {string} XML string formatted as KML.
 */
export function buildKmlString(walk) {
  if (!walk || !Array.isArray(walk.stops) || walk.stops.length === 0) {
    throw new Error('Invalid walk provided for KML generation.');
  }
  if (!walk.origin || typeof walk.origin.lat !== 'number') {
    throw new Error('Walk is missing an origin for KML generation.');
  }

  const routeName = `Aimless walk ${walk.seed ?? ''}`.trim();

  // Stops in sequence order. Real walk records store them in order already,
  // but sorting is cheap insurance and keeps the plan path and placemarks in
  // lockstep regardless of how the caller built the array.
  const stops = [...walk.stops].sort((a, b) => a.seq - b.seq);

  // Plan path: origin -> stop1 -> stop2 -> ... (straight segments).
  const planCoords = [walk.origin, ...stops];

  // Walked trace. Fall back to the plan path if no GPS trace was recorded
  // (e.g. a walk ended before the first fix) so the file is never empty.
  const traceCoords = Array.isArray(walk.trace) && walk.trace.length > 0
    ? walk.trace
    : planCoords;

  // Stop placemarks: origin first, then each stop in sequence order.
  const stopPlacemarks = [
    pointPlacemark('Origin', walk.origin, STOP_COLOR),
    ...stops.map((s, i) => {
      const status = s.approached
        ? ' (close as I can get)'
        : s.reachedAt
          ? ''
          : ' (not reached)';
      return pointPlacemark(`Stop ${i + 1}${status}`, s, STOP_COLOR);
    }),
  ].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="${KML_NS}">
  <Document>
    <name>${escapeXml(routeName)}</name>
${lineStringPlacemark(`${routeName} — planned`, planCoords, PLAN_COLOR, PLAN_WIDTH)}
${lineStringPlacemark(`${routeName} — walked`, traceCoords, TRACE_COLOR, TRACE_WIDTH)}
${stopPlacemarks}
  </Document>
</kml>`.trim();
}
