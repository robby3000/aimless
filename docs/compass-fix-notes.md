# Compass fix — root-cause clarification

This note corrects the historical record for the `W-compass:` commits so future
readers (and Hermes) are not misled.

## The commits, in order

| Commit | Author | What it actually did | Root cause? |
|---|---|---|---|
| `d1297cf` W-compass: re-render arrow on orientation change | robby3000 (via Devin CLI, GLM-5.2) | Extracted `renderCompass()`; made the arrow re-render on `deviceorientation` events (not just on GPS fix). **Correct, working code.** | ❌ Mis-diagnosed. Message implies the arrow was "frozen between fixes." |
| `286ec5b` W-compass: fix Android orientation + simulator compass injection | Devin (MacBook) | Fixed the Android `alpha` handling path + corrected `sim.html` to inject a *counter-clockwise* alpha (the sim had been cancelling the bug). | Partial |
| `6de39a6` W-compass: fix arrow direction by negating deviceorientation alpha | Devin (MacBook) | **The true root cause.** `alpha` is counter-clockwise from north; a compass heading is clockwise. `heading = event.alpha` was the mirror image of reality → arrow swept ~2× the turn rate. Fix: `headingFromAlpha(alpha, screenAngle)` in `lib/geo.js`, negates alpha + corrects for screen rotation. iOS `webkitCompassHeading` untouched (already clockwise). | ✅ |

## The real bug

Standing still, the arrow looked plausible. Turning clockwise made it sweep **faster
than the walker turned** (90° out at north-east). Cause: `heading = event.alpha`
should be negated. Render is `relative = bearing - heading`; world direction is
`trueHeading + relative`. With correct heading those cancel to `bearing` (arrow nailed
to target). With `heading = 360 - trueHeading` you get `bearing + 2 × trueHeading` —
zero error at north, double sweep elsewhere. Why it was *consistent* not noisy: the
magnetometer was fine all along.

## Why `d1297cf` is still in history (and fine)

`d1297cf` shipped **correct** re-render logic. It addressed a *real* (if secondary)
defect — without it, the arrow would only update on GPS fixes, not continuously on
rotation. So it is not dead code; it complements `6de39a6`. Its only flaw was the
commit *message*, which attributed the fix to the wrong root cause. This note corrects
that attribution. The commit is kept (no rebase/force-push) to preserve a clean,
non-destructive history.

## Validation

- On-device: rob validated the arrow tracks rotation correctly after the `alpha`
  negation fix + enabling motion sensors in the Brave Android settings.
- `test/geo.test.js`: 4 tests added (incl. asserting the arrow's *world* direction
  equals the target bearing at every heading in 15° steps). 82/82 pass.
- `sim.html` now emits `(360 - heading) % 360` so the simulator no longer hides the bug.

## Lesson (for Hermes + future agents)

A test double that gets the contract wrong *in the same direction as the code* is worse
than no test — `sim.html`'s clockwise `alpha` cancelled the `alpha` sign bug and showed
green while the app was broken. Mocks must match the real device contract.
