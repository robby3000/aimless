// Imported skins (.aimlessskin files). An imported skin carries everything
// the app needs to treat it like a built-in: the css plus the trace palette,
// export logo variant and share-card palette that live on every SKINS entry.
//
// Two file shapes share the same record format:
//
//   { "format": "aimless-skin", "version": 1, ...skin record }
//   { "format": "aimless-skin-collection", "version": 1, "skins": [...] }
//
// A collection imports every skin at once — premium rounds ship as one
// download. A skin whose id matches an already-imported skin overwrites
// it, so re-import cycles do not stack duplicates; an id matching a
// built-in is rejected, since the built-in always wins resolution.
//
// The css rules are load-bearing for the export contract: exported
// artifacts embed skin css verbatim inside a <style> element and must stay
// standalone, so anything that could break out of that element or pull an
// external resource is rejected.

import { SKINS } from './skins.js';

export const SKIN_FORMAT = 'aimless-skin';
export const SKIN_VERSION = 1;
export const SKIN_COLLECTION_FORMAT = 'aimless-skin-collection';

const SKIN_ID = /^[a-z][a-z0-9-]{1,30}$/;
const HEX6 = /^#[0-9a-f]{6}$/i;
const ICONS = ['light', 'dark', 'sky'];
const TRACE_KEYS = ['planStroke', 'traceStroke', 'originFill', 'stopFill'];
const CARD_KEYS = ['bg', 'fg', 'accent'];

/** What this skin's css may not contain, and why. */
const CSS_FORBIDDEN = [
  [/<\//, 'css contains "</", which would break the artifact\'s <style> element'],
  [/@import\b/i, 'css may not @import — artifacts must be standalone'],
  [/javascript\s*:/i, 'css may not contain javascript: URLs'],
  [/expression\s*\(/i, 'css may not contain expression()'],
  [/-moz-binding/i, 'css may not contain -moz-binding'],
];

function validateSkinCss(css) {
  if (typeof css !== 'string' || !css.trim()) throw new Error('skin has no css');
  let depth = 0;
  for (const ch of css) {
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    if (depth < 0) throw new Error('skin css has unbalanced braces');
  }
  if (depth !== 0) throw new Error('skin css has unbalanced braces');
  for (const [re, msg] of CSS_FORBIDDEN) {
    if (re.test(css)) throw new Error(msg);
  }
  // url() may only embed data: URIs — anything else is an external fetch the
  // standalone artifact cannot honour offline.
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]*)/g)) {
    if (!m[1].toLowerCase().startsWith('data:')) {
      throw new Error('css may only url() data: URIs — artifacts must be standalone');
    }
  }
}

/**
 * Validate one skin record (from a file or a backup) into the shape the
 * stores keep. Throws with a human-readable reason on the first violation.
 * @param {object} obj        the parsed record.
 * @param {string[]} [builtinIds]  ids the file may not claim (built-ins).
 */
export function validateSkinRecord(obj, builtinIds = SKINS.map((s) => s.id)) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('not a skin record');
  if (!SKIN_ID.test(obj.id || '')) throw new Error('skin id must be lowercase a-z, 0-9 and dashes');
  if (builtinIds.includes(obj.id)) throw new Error(`skin id "${obj.id}" collides with a built-in skin`);
  if (typeof obj.name !== 'string' || !obj.name.trim() || obj.name.length > 40) {
    throw new Error('skin needs a name (40 chars max)');
  }
  validateSkinCss(obj.css);
  if (!ICONS.includes(obj.icon)) throw new Error(`skin icon must be one of ${ICONS.join(', ')}`);
  if (!obj.trace || typeof obj.trace !== 'object') throw new Error('skin is missing a trace palette');
  for (const key of TRACE_KEYS) {
    if (!HEX6.test(obj.trace[key] || '')) throw new Error(`skin trace.${key} must be a 6-digit hex colour`);
  }
  if (!obj.card || typeof obj.card !== 'object') throw new Error('skin is missing a card palette');
  for (const key of CARD_KEYS) {
    if (!HEX6.test(obj.card[key] || '')) throw new Error(`skin card.${key} must be a 6-digit hex colour`);
  }
  if (typeof obj.card.font !== 'string' || !obj.card.font.trim() || obj.card.font.length > 200) {
    throw new Error('skin card.font must be a font shorthand string');
  }
  return {
    id: obj.id,
    name: obj.name.trim(),
    css: obj.css,
    icon: obj.icon,
    trace: { planStroke: obj.trace.planStroke, traceStroke: obj.trace.traceStroke, originFill: obj.trace.originFill, stopFill: obj.trace.stopFill },
    card: { bg: obj.card.bg, fg: obj.card.fg, accent: obj.card.accent, font: obj.card.font },
  };
}

/**
 * Parse .aimlessskin file text into store records. Returns
 * { records, errors }: one entry per skin in the file (single-skin files
 * return one record), with per-skin errors collected instead of throwing.
 * @param {string|object} input   file text or already-parsed JSON.
 */
export function parseSkinFile(input) {
  let parsed;
  try {
    parsed = typeof input === 'string' ? JSON.parse(input) : input;
  } catch {
    throw new Error('Not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Not an Aimless skin file');
  }
  if (parsed.format === SKIN_FORMAT) {
    if (typeof parsed.version !== 'number' || parsed.version < 1) throw new Error('Not an Aimless skin file');
    if (parsed.version > SKIN_VERSION) throw new Error('Skin file is from a newer version');
    return { records: [validateSkinRecord(parsed)], errors: [] };
  }
  if (parsed.format === SKIN_COLLECTION_FORMAT) {
    if (typeof parsed.version !== 'number' || parsed.version < 1) throw new Error('Not an Aimless skin file');
    if (parsed.version > SKIN_VERSION) throw new Error('Skin file is from a newer version');
    if (!Array.isArray(parsed.skins)) throw new Error('Malformed skin collection');
    const records = [];
    const errors = [];
    for (const entry of parsed.skins) {
      try {
        records.push(validateSkinRecord(entry));
      } catch (err) {
        errors.push(err.message);
      }
    }
    if (!records.length && !errors.length) throw new Error('Skin collection is empty');
    return { records, errors };
  }
  throw new Error('Not an Aimless skin file');
}

/**
 * Serialize a stored skin record back into a .aimlessskin file body —
 * the same shape the importer accepts, so files round-trip.
 */
export function skinFileJson(record) {
  return JSON.stringify({ format: SKIN_FORMAT, version: SKIN_VERSION, ...record }, null, 2) + '\n';
}
