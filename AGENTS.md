# Aimless — Agent Notes

A walking app with no map. Press Go, follow a compass arrow to five random points, get a card
at each one, take a photo if you want, end up with a drawing of the shape you walked and a
self-contained HTML file you can keep. Zero dependencies, zero build step, zero server.

## Start here

1. [`docs/roadmap.md`](./docs/roadmap.md) — the build plan. Executive summary, 12 decisions, six
   steps. **It is short on purpose.**
2. [`docs/blueprint.md`](./docs/blueprint.md) — what and why.
3. [`docs/deck.md`](./docs/deck.md) — the card content. Binding. Read before touching `deck.js`.
4. [`docs/verdict.md`](./docs/verdict.md) — the template the human fills in after five real walks.
   Do not delete it and do not fill it in yourself.

## Commands

No build step, no `node_modules`.

- Tests: `npm test` → `node --test test/**/*.test.js`
- Stamp the service worker cache name: `npm run stamp` — **required after any change under
  `public/`**, or phones keep the old files. `npm run stamp:check` fails CI if you forget.
  See [`docs/cache-busting.md`](./docs/cache-busting.md).
- Dev: serve `public/` over `http://localhost` (a secure context, so geolocation works).
  `cd public && python3 -m http.server 8080` is sufficient for desktop.
- Deploy: push to `main`. `.github/workflows/pages.yml` runs the tests and the stamp check,
  then publishes `public/` to GitHub Pages. All paths in the app are relative, so it works at a
  domain root or under a `/aimless/` project-site prefix.
- Phone testing: needs HTTPS. Use the Tailscale + `*.ts.net` certificate pattern already set up for
  the sibling `pomo-day-sync` project.
- Icons: `npm run icons` → `node scripts/make-icons.mjs` (uses `sips` on macOS).
- Simulator: `public/sim.html` — drives the walk logic from a synthetic track. Use it constantly.

## Repo shape

This listing is the inventory `sw.js` precaches from. Keep it exact: `lib/proximity.js` was
once missing here, was therefore missing from `PRECACHE` too, and would have broken the app
offline. If you add a file under `public/`, add it in both places.

```
public/
  index.html          # the app: inline CSS + UI JS, all screens
  sim.html            # GPS simulator (roadmap A11)
  manifest.json       # no "id" (defaults to start_url) and no "version" (not a manifest member)
  sw.js               # precaches the shell for offline use; cache name is generated, see below
  icons/              # generated PNGs (192, 512, 512-maskable)
  lib/
    geo.js  rng.js  walk.js  deck.js  store.js  dexie.mjs  proximity.js  export.js  skins.js
    platform.js         # UA detection: isIOS, isInAppBrowser, isStandalone
    inner.js            # The Inner voice: I Ching hexagram from coordinates (docs/iching/)
    filters.js          # ordered photo filter presets and Wobbletone translation
    filter-renderer.js  # ordered canvas pipeline for filtered share cards
    kml.js              # KML route export (plan + trace + stop placemarks)
  data/
    crow.json  threshold.json  lattice.json
    inner.json          # 64 hexagrams: number, hex_font, binary, title, haiku
test/
  geo.test.js  rng.test.js  walk.test.js  deck.test.js  proximity.test.js  skins.test.js
  platform.test.js  export.test.js  inner.test.js  filters.test.js  filter-renderer.test.js  kml.test.js
scripts/
  make-icons.mjs      # npm run icons
  stamp-sw.mjs        # npm run stamp -- rewrites the sw.js cache name
docs/
  roadmap.md  blueprint.md  deck.md  verdict.md  cache-busting.md
.github/workflows/
  pages.yml           # test + stamp check, then deploy public/ to GitHub Pages
package.json          # no dependencies; "test": "node --test test/**/*.test.js"
```

## Hard constraints

- **Zero runtime dependencies.** No npm packages, no CDN scripts, no framework, no bundler. A CDN
  breaks first-load offline, which is fatal for a walking app. `package.json` declares no
  dependencies. Sole exception: **Dexie is vendored** at `public/lib/dexie.mjs` (Apache-2.0) and
  used by `store.js` — local file, no CDN.
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
- **The walk snapshots itself** to `prefs/activeWalk` on arrival, photo capture and every 30s;
  `finishWalk` clears it. The Go screen's "Resume walk"/"Discard" UI was removed (round-2
  enhancements) — the wake lock + re-acquire on `visibilitychange` keeps an interrupted walk
  alive in practice, so the snapshot is retained but currently has no UI. True background GPS is
  impossible for a PWA — the snapshot + wake lock is the mitigation.
- **The focused walk state** (`body.walk-focused`, 10s idle) blanks everything but the compass and
  disables taps; it must never engage while a card is showing, and any interaction resets the clock.

## Conventions

**Every asset path is relative** (`./lib/geo.js`, `start_url: "./"`, `'./data/x.json'`), and
`sw.js` derives its root from `new URL('./', self.location)`. This is what lets the same build
serve from a domain root and from the `/aimless/` GitHub Pages prefix. Do not "tidy" them back
to absolute paths.

Vanilla ES modules. Pure logic in `public/lib/*.js`, tested with `node --test`; anything touching
the DOM, storage or geolocation stays in `public/index.html` or `sim.html` and is verified manually
via the simulator. Inline CSS and UI JS in `index.html` (the `pomo-day-sync` pattern). Dark, high
contrast — this is read outdoors in daylight. No emojis. One logical change per commit, prefixed
with the step id (e.g. `W2: chained walk generation`).
