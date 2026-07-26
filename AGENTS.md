# Aimless — Agent Notes

**Nothing is built yet. This repo currently contains documentation only.**

## Start here

1. [`docs/roadmap.md`](./docs/roadmap.md) — the build plan. Executive summary, 12 decisions, six
   steps. **It is short on purpose.**
2. [`docs/blueprint.md`](./docs/blueprint.md) — what and why.
3. [`docs/deck.md`](./docs/deck.md) — the card content. Binding. Read before step W3.
4. [`docs/verdict.md`](./docs/verdict.md) — the template the human fills in after five real walks.
   Do not delete it and do not fill it in yourself.

## Commands

To be confirmed as W1 lands. There is no build step and no `node_modules`.

- Tests: `npm test` → `node --test test/`
- Dev: serve `public/` over `http://localhost` (a secure context, so geolocation works).
  `python3 -m http.server` from `public/` is sufficient.
- Phone testing: needs HTTPS. Use the Tailscale + `*.ts.net` certificate pattern already set up for
  the sibling `pomo-day-sync` project.
- Simulator: `public/sim.html` — drives the walk logic from a synthetic track. Use it constantly.

## Hard constraints

- **Zero runtime dependencies.** No npm packages, no CDN scripts, no framework, no bundler. A CDN
  breaks first-load offline, which is fatal for a walking app. `package.json` declares no
  dependencies.
- **No map, no basemap, no tile provider, ever** (roadmap A5). The walk view is a compass; the
  gallery is an abstract SVG trace. The absence is the design, not a gap to fill.
- **No accounts, no server database, no sync.** Everything is IndexedDB and an export file.
- **Seeded randomness only** (A7). Never call `Math.random()` in generation code.
- **Do not build Phase 2 (AI cards) until five real walks are logged in `verdict.md`** (A12). This
  is the entire reason the repo exists.
- **Count the "close as I can get" presses** and surface the total. See `blueprint.md` §6 — that
  number decides whether the sibling `glyph-drift` project gets built.

## Scope

Before adding anything, check `blueprint.md` §8 and the temptations table in `roadmap.md` §6. The
plan is small deliberately. If it grows past a weekend, the experiment has failed on its own terms
even if the app is good.

## Device gotchas

Six things that will each cost an afternoon. Full detail in `roadmap.md` §5, and a longer treatment
in the sibling `glyph-drift` repo at `docs/device-reality.md`.

- **iOS has no vibration API** and never will. Tone plus screen flash on all platforms; haptics are
  an Android bonus.
- **Prime `AudioContext` inside the Go tap**, or the first arrival is silent on iOS.
- **HTTPS from day one** — geolocation, camera, wake lock and service workers all need a secure
  context, and a LAN IP is not one.
- **Re-request the wake lock on `visibilitychange`**; it is dropped whenever the page hides.
- **Reject fixes with `accuracy > 50` or older than 30s**, and require two consecutive in-radius
  fixes before firing arrival. GPS spikes cause phantom arrivals.
- **Tear down `watchPosition`** on end, give-up and unload.

## Conventions

Vanilla ES modules. Pure logic in `public/lib/*.js`, tested with `node --test`; anything touching
the DOM, storage or geolocation stays in `public/index.html` or `sim.html` and is verified manually
via the simulator. Inline CSS and UI JS in `index.html` (the `pomo-day-sync` pattern). Dark, high
contrast — this is read outdoors in daylight. No emojis. One logical change per commit, prefixed
with the step id (e.g. `W2: chained walk generation`).
