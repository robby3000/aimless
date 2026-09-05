// Navigation guard for active walks.
//
// The bottom nav (Go, Walk, Archive, Info) and the big Go button must never
// cancel an in-progress walk or discard its data. This module encapsulates the
// pure logic that decides what to do when a navigation action is requested
// while a walk is active, so it can be unit-tested independently of the DOM.

/**
 * Decide what to do when a navigation target is requested during a walk.
 *
 * @param {boolean} walkActive - whether a walk is currently in progress
 * @param {string} target - the requested navigation target:
 *   'go' | 'walk' | 'archive' | 'info'
 * @returns {string} 'show-walk' | 'allow'
 *   'show-walk' — redirect to the walk screen; do not navigate away or start a
 *                 new walk. Used when the user taps Go (nav or big button)
 *                 during a walk, or taps the Walk nav button to return.
 *   'allow'     — safe to navigate to the requested screen. Info and Archive
 *                 are read-only views that don't touch walk state.
 */
export function resolveNavTarget(walkActive, target) {
  if (!walkActive) return 'allow';
  // Tapping Go (nav or big button) during a walk must not start a new walk.
  // Send the user back to their active walk instead.
  if (target === 'go') return 'show-walk';
  // The Walk nav button returns to the active walk.
  if (target === 'walk') return 'show-walk';
  // Info and Archive are safe to view during a walk.
  return 'allow';
}

/**
 * Decide whether the big Go button should be allowed to start a new walk.
 *
 * @param {boolean} walkActive - whether a walk is currently in progress
 * @returns {boolean} true if a new walk may start, false if the user should be
 *   redirected to their active walk instead.
 */
export function canStartNewWalk(walkActive) {
  return !walkActive;
}
