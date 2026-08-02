// IndexedDB via Dexie (vendored ESM build at ./dexie.mjs, Apache-2.0).
// Three stores (blueprint section 9). The schema matches the original
// hand-rolled IndexedDB version 1 exactly, so existing databases open
// without an upgrade.

import Dexie from './dexie.mjs';

const DB_NAME = 'aimless';

/** Open the database. Resolves to the Dexie instance. */
export function openDB() {
  const db = new Dexie(DB_NAME);
  db.version(1).stores({
    walks: 'id, started',
    photos: 'id, walkId, [walkId+stopSeq]',
    prefs: 'key',
  });
  return db.open().then(() => db);
}

/** Put a record into a store. */
export async function put(db, store, value) {
  return db.table(store).put(value);
}

/** Get a record by key. */
export async function get(db, store, key) {
  return db.table(store).get(key);
}

/** Get all records from a store. */
export async function all(db, store) {
  return db.table(store).toArray();
}

/** Delete a record by key. */
export async function del(db, store, key) {
  return db.table(store).delete(key);
}

/** Get all records from an index matching a key. */
export async function byIndex(db, store, index, query) {
  return db.table(store).where(index).equals(query).toArray();
}

// --- Prefs helpers (single-record store keyed by 'key') -----------------

const PREFS_KEY = 'prefs';

/** Read the prefs object, or return defaults. */
export async function getPrefs(db, defaults = {}) {
  const row = await get(db, 'prefs', PREFS_KEY);
  return row ? { ...defaults, ...row.value } : { ...defaults };
}

/** Merge and write prefs. */
export async function setPrefs(db, patch) {
  const current = await getPrefs(db);
  const value = { ...current, ...patch };
  await put(db, 'prefs', { key: PREFS_KEY, value });
  return value;
}
