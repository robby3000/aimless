// App-data backup: every durable store record serialized verbatim into one
// JSON file a user can keep off-device and restore anywhere. Photos are
// already data-URL strings in the store (the WebKit blob workaround), so
// no transformation is needed. The schema+version pair mirrors the
// wobbletone-presets discipline: a future format change gets a translator,
// never a silent break.

import { validateFilter } from './filters.js';

export const BACKUP_SCHEMA = 'aimless-backup';
export const BACKUP_VERSION = 1;

export function buildBackup({ walks = [], photos = [], filters = [], prefs = null, exportedAt = new Date().toISOString() } = {}) {
  return {
    schema: BACKUP_SCHEMA,
    version: BACKUP_VERSION,
    exportedAt,
    walks,
    photos,
    filters,
    prefs,
  };
}

// Records are validated individually: a malformed entry is skipped and
// counted rather than failing the whole restore - a backup that is 95%
// good should restore 95%.
function isValidWalk(walk) {
  return !!walk && typeof walk === 'object'
    && typeof walk.id === 'string' && walk.id.length > 0
    && (walk.stops === undefined || Array.isArray(walk.stops))
    && (walk.trace === undefined || Array.isArray(walk.trace));
}

function isValidPhoto(photo) {
  return !!photo && typeof photo === 'object'
    && typeof photo.id === 'string' && photo.id.length > 0
    && typeof photo.walkId === 'string' && photo.walkId.length > 0
    && (photo.dataUrl === undefined || typeof photo.dataUrl === 'string');
}

function isValidFilter(filter) {
  try {
    validateFilter({ ...filter, spec: filter && filter.spec ? JSON.parse(JSON.stringify(filter.spec)) : filter.spec });
    return true;
  } catch {
    return false;
  }
}

// Parse backup JSON into validated record lists. Throws with user-facing
// messages for structural problems; per-record failures are dropped into
// `skipped` counts instead.
export function parseBackup(input) {
  let parsed;
  try {
    parsed = typeof input === 'string' ? JSON.parse(input) : input;
  } catch {
    throw new Error('Not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Not an Aimless backup');
  if (parsed.schema !== BACKUP_SCHEMA) throw new Error('Not an Aimless backup');
  if (typeof parsed.version !== 'number' || parsed.version < 1) throw new Error('Not an Aimless backup');
  if (parsed.version > BACKUP_VERSION) throw new Error('Backup is from a newer version');
  for (const key of ['walks', 'photos', 'filters']) {
    if (parsed[key] !== undefined && !Array.isArray(parsed[key])) throw new Error('Malformed backup file');
  }
  if (parsed.prefs !== undefined && parsed.prefs !== null && (typeof parsed.prefs !== 'object' || Array.isArray(parsed.prefs))) {
    throw new Error('Malformed backup file');
  }

  const skipped = { walks: 0, photos: 0, filters: 0 };
  const keep = (list, valid, bucket) => (list || []).filter((record) => {
    if (valid(record)) return true;
    skipped[bucket] += 1;
    return false;
  });

  return {
    walks: keep(parsed.walks, isValidWalk, 'walks'),
    photos: keep(parsed.photos, isValidPhoto, 'photos'),
    filters: keep(parsed.filters, isValidFilter, 'filters'),
    prefs: parsed.prefs ?? null,
    skipped,
  };
}
