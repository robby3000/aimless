// Raw IndexedDB, ~80 lines. Three stores (blueprint section 9).
// No Dexie, no idb-keyval (roadmap A4).

const DB_NAME = 'aimless';
const DB_VERSION = 1;

/** Open (and upgrade) the database. */
export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('walks')) {
        const walks = db.createObjectStore('walks', { keyPath: 'id' });
        walks.createIndex('started', 'started');
      }
      if (!db.objectStoreNames.contains('photos')) {
        const photos = db.createObjectStore('photos', { keyPath: 'id' });
        photos.createIndex('walkId', 'walkId');
        photos.createIndex('walkSeq', ['walkId', 'stopSeq']);
      }
      if (!db.objectStoreNames.contains('prefs')) {
        db.createObjectStore('prefs', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode = 'readonly') {
  return db.transaction(store, mode).objectStore(store);
}

function reqAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Put a record into a store. */
export async function put(db, store, value) {
  return reqAsPromise(tx(db, store, 'readwrite').put(value));
}

/** Get a record by key. */
export async function get(db, store, key) {
  return reqAsPromise(tx(db, store).get(key));
}

/** Get all records from a store. */
export async function all(db, store) {
  return reqAsPromise(tx(db, store).getAll());
}

/** Delete a record by key. */
export async function del(db, store, key) {
  return reqAsPromise(tx(db, store, 'readwrite').delete(key));
}

/** Get all records from an index matching a key. */
export async function byIndex(db, store, index, query) {
  return reqAsPromise(tx(db, store).index(index).getAll(query));
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
