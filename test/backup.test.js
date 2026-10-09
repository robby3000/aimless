import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackup, parseBackup, resolveRestoredFilter, BACKUP_SCHEMA, BACKUP_VERSION } from '../public/lib/backup.js';

const WALK = {
  id: 'walk-1',
  seed: 'sill-ash-398',
  started: 1000,
  ended: 2000,
  voice: 'crow',
  skin: 'default',
  stops: [{ seq: 0, lat: 55.86, lng: -4.25, reachedAt: 1500 }],
  trace: [{ lat: 55.86, lng: -4.25 }],
};

const PHOTO = {
  id: 'walk-1-photo-0',
  walkId: 'walk-1',
  stopSeq: 0,
  dataUrl: 'data:image/jpeg;base64,AAAA',
  taken: 1600,
};

const FILTER = {
  id: 'rainy',
  name: 'Rainy',
  createdAt: 3000,
  spec: {
    format: 'wobbletone-filter',
    version: 1,
    name: 'Rainy',
    effects: [{ type: 'saturate', params: { v: 150 } }],
  },
};

test('buildBackup produces the schema envelope and round-trips', () => {
  const backup = buildBackup({ walks: [WALK], photos: [PHOTO], filters: [FILTER], prefs: { stops: 7 } });
  assert.equal(backup.schema, BACKUP_SCHEMA);
  assert.equal(backup.version, BACKUP_VERSION);
  assert.ok(backup.exportedAt);
  const parsed = parseBackup(JSON.stringify(backup));
  assert.deepEqual(parsed.walks, [WALK]);
  assert.deepEqual(parsed.photos, [PHOTO]);
  assert.equal(parsed.filters.length, 1);
  assert.equal(parsed.filters[0].id, 'rainy');
  assert.deepEqual(parsed.prefs, { stops: 7 });
  assert.deepEqual(parsed.skipped, { walks: 0, photos: 0, filters: 0 });
});

test('parseBackup rejects non-JSON and non-object input', () => {
  assert.throws(() => parseBackup('not json {'), /Not valid JSON/);
  assert.throws(() => parseBackup('[1,2]'), /Not an Aimless backup/);
  assert.throws(() => parseBackup('null'), /Not an Aimless backup/);
});

test('parseBackup rejects other schemas including a wobbletone archive', () => {
  assert.throws(() => parseBackup({ hello: 'world' }), /Not an Aimless backup/);
  assert.throws(
    () => parseBackup({ schema: 'wobbletone-presets', version: 2, presets: [] }),
    /Not an Aimless backup/
  );
});

test('parseBackup rejects a newer version', () => {
  assert.throws(
    () => parseBackup({ schema: BACKUP_SCHEMA, version: BACKUP_VERSION + 1 }),
    /newer version/
  );
});

test('parseBackup rejects malformed top-level fields', () => {
  assert.throws(() => parseBackup({ schema: BACKUP_SCHEMA, version: 1, walks: {} }), /Malformed backup/);
  assert.throws(() => parseBackup({ schema: BACKUP_SCHEMA, version: 1, prefs: 'oops' }), /Malformed backup/);
});

test('parseBackup skips invalid records and counts them', () => {
  const parsed = parseBackup({
    schema: BACKUP_SCHEMA,
    version: 1,
    walks: [WALK, { id: 42 }, 'nope', { stops: [] }],
    photos: [PHOTO, { id: 'x' }, { id: 'y', walkId: 'w', dataUrl: 123 }],
    filters: [FILTER, { id: 'BAD ID', name: 'x', spec: {} }, { name: 'no spec' }],
  });
  assert.equal(parsed.walks.length, 1);
  assert.equal(parsed.photos.length, 1);
  assert.equal(parsed.filters.length, 1);
  assert.deepEqual(parsed.skipped, { walks: 3, photos: 2, filters: 2 });
});

test('parseBackup defaults missing sections to empty', () => {
  const parsed = parseBackup({ schema: BACKUP_SCHEMA, version: 1 });
  assert.deepEqual(parsed.walks, []);
  assert.deepEqual(parsed.photos, []);
  assert.deepEqual(parsed.filters, []);
  assert.equal(parsed.prefs, null);
});

test('filter validation does not mutate the stored record', () => {
  const loose = { ...FILTER, spec: { ...FILTER.spec, extraKey: 'kept' } };
  const parsed = parseBackup({ schema: BACKUP_SCHEMA, version: 1, filters: [loose] });
  assert.equal(parsed.filters.length, 1);
  assert.equal(parsed.filters[0].spec.extraKey, 'kept');
});

test('restore skips a filter that is already installed', () => {
  const existing = new Map([[FILTER.id, FILTER]]);
  assert.equal(resolveRestoredFilter({ ...FILTER }, existing), null);
});

test('restore renames on a bare id collision', () => {
  const incoming = { ...FILTER, name: 'Stormy' };
  const record = resolveRestoredFilter(incoming, new Map([[FILTER.id, FILTER]]));
  assert.equal(record.id, 'rainy-2');
  assert.equal(record.name, 'Stormy');
});

test('a renamed restore climbs past existing suffixes', () => {
  const existing = new Map([
    [FILTER.id, FILTER],
    ['rainy-2', { ...FILTER, id: 'rainy-2', name: 'Rainy Two' }],
  ]);
  const incoming = { ...FILTER, name: 'Stormy' };
  assert.equal(resolveRestoredFilter(incoming, existing).id, 'rainy-3');
});

test('restore keeps a genuinely new filter unchanged', () => {
  const record = resolveRestoredFilter({ ...FILTER, id: 'sunny', name: 'Sunny' }, new Map());
  assert.equal(record.id, 'sunny');
  assert.equal(record.name, 'Sunny');
});

test('re-importing the same archive twice adds nothing the second time', () => {
  const installed = new Map();
  const first = resolveRestoredFilter({ ...FILTER }, installed);
  installed.set(first.id, first);
  assert.equal(resolveRestoredFilter({ ...FILTER }, installed), null);
});
