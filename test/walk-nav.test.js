import { test } from 'node:test';
import { strictEqual } from 'node:assert/strict';

import { resolveNavTarget, canStartNewWalk } from '../public/lib/walk-nav.js';

// --- resolveNavTarget ---

test('no walk: all targets allowed', () => {
  strictEqual(resolveNavTarget(false, 'go'), 'allow');
  strictEqual(resolveNavTarget(false, 'walk'), 'allow');
  strictEqual(resolveNavTarget(false, 'archive'), 'allow');
  strictEqual(resolveNavTarget(false, 'info'), 'allow');
});

test('walk active: Go nav redirects to walk screen (no new walk)', () => {
  strictEqual(resolveNavTarget(true, 'go'), 'show-walk');
});

test('walk active: Walk nav returns to walk screen', () => {
  strictEqual(resolveNavTarget(true, 'walk'), 'show-walk');
});

test('walk active: Archive is allowed (read-only, no data loss)', () => {
  strictEqual(resolveNavTarget(true, 'archive'), 'allow');
});

test('walk active: Info is allowed (read-only, no data loss)', () => {
  strictEqual(resolveNavTarget(true, 'info'), 'allow');
});

test('walk active: unknown target is allowed (safe default)', () => {
  strictEqual(resolveNavTarget(true, 'detail'), 'allow');
  strictEqual(resolveNavTarget(true, 'done'), 'allow');
});

// --- canStartNewWalk ---

test('no walk: can start a new walk', () => {
  strictEqual(canStartNewWalk(false), true);
});

test('walk active: cannot start a new walk', () => {
  strictEqual(canStartNewWalk(true), false);
});

// --- Regression: bottom buttons must not cancel walk ---

// The core regression: tapping any bottom nav button during a walk must
// never result in walk data loss. resolveNavTarget must never return a
// value that causes the caller to clear the walk variable or start a new
// walk. The only redirect is 'show-walk' (switch screen, keep state) or
// 'allow' (switch screen, keep state). Neither touches walk state.
test('regression: no nav target during a walk produces a destructive action', () => {
  for (const target of ['go', 'walk', 'archive', 'info']) {
    const action = resolveNavTarget(true, target);
    // Both 'show-walk' and 'allow' preserve walk state — neither clears it.
    // The caller must only switch screens, never modify `walk`.
    strictEqual(
      action === 'show-walk' || action === 'allow',
      true,
      `target "${target}" returned unexpected action "${action}"`
    );
  }
});
