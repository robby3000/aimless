// Engine submodule smoke test — public/lib/engine must be checked out
// (CI uses `submodules: true`); if it's missing these imports throw at
// module load and every test here fails loudly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ENGINE_VERSION } from '../public/lib/engine/version.js';
import { renderBuffer } from '../public/lib/engine/render.js';
import { planInvalidate } from '../public/lib/engine/incremental.js';

test('engine submodule is mounted and importable', () => {
  assert.match(ENGINE_VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(typeof renderBuffer, 'function');
  assert.equal(planInvalidate([], ['a']), 0);
});
