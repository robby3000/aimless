# Aimless — Agent Notes

A walking app with no map. Press Go, follow a compass arrow to random points (5 stops / 45 min
by default; stops, budget and voice are Go-screen wheels), get a card at each one, take a photo
if you want, end up with a drawing of the shape you walked and a self-contained HTML file you
can keep. Zero dependencies, zero build step, zero server.

## Start here

**`docs/` is gitignored — everything in it is local-only.** The files exist on disk but not on
GitHub; the links below resolve for whoever holds the working copy.

1. `docs/roadmap.md` — the build plan. Executive summary, 16 decisions (A1–A16), six
   steps. **It is short on purpose.**
2. `docs/blueprint.md` — what and why.
3. `docs/deck.md` — the original card grammar. Historical: the seeded deck is gone (cards now
   come from oracle pools, see Conventions → Voice model). `deck.js` survives only for the SVG
   walk trace (`drawWalk`) and recent-seed avoidance.
4. `docs/verdict.md` — the template the human fills in after five real walks.
   Do not delete it and do not fill it in yourself.
5. `docs/ignore/` — working drafts and discussion docs (voice pools, UI proposals). Nothing in
   it is load-bearing.

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
  fur-bg.webp         # body::before fur texture: fixed 1200x1080 centered, coral
                      # ring visible only on viewports bigger than the image
  lib/
    geo.js  rng.js  walk.js  deck.js  store.js  dexie.mjs  proximity.js  export.js  skins.js
    platform.js         # UA detection: isIOS, isInAppBrowser, isStandalone
    inner.js            # The Inner voice: I Ching hexagram from coordinates (docs/iching/)
    filters.js          # Filter Spec presets ({id,name,spec}) + Wobbletone translation
    backup.js           # app-data archive: buildBackup/parseBackup over walks+photos+filters+prefs
    filter-renderer.js  # thin engine adapter: cover-fit + renderToCanvas (share cards)
    engine/             # wobbletone-engine git submodule — shared CPU renderer (do not edit here)
    kml.js              # KML route export (plan + trace + stop placemarks)
    walk-nav.js         # navigation guard: prevents bottom-nav taps from canceling a walk
    surprise.js         # Surprise rail action: seeded-random effect stack onto one photo
    oracle.js           # oracle voices: coordinate -> 4 pool indices (titles/l1/l2/l3)
    publish.js          # Neocities hand-off: slug, sitename, OG head, target URLs
  data/
    crow.json  threshold.json  lattice.json    # oracle pools (the seeded-deck format is replaced)
    stray.json small.json slow.json echo.json  # oracle pools
    inner.json          # 64 hexagrams: number, hex_font, binary, title, haiku
test/
  geo.test.js  rng.test.js  walk.test.js  deck.test.js  proximity.test.js  skins.test.js
  platform.test.js  export.test.js  inner.test.js  filters.test.js  backup.test.js  filter-renderer.test.js
  kml.test.js  walk-nav.test.js  engine.test.js  surprise.test.js  oracle.test.js
  publish.test.js
scripts/
  make-icons.mjs      # npm run icons
  stamp-sw.mjs        # npm run stamp -- rewrites the sw.js cache name
docs/                 # GITIGNORED, local only — planning, specs, drafts in docs/ignore/
.github/workflows/
  pages.yml           # test + stamp check, then deploy public/ to GitHub Pages
package.json          # no dependencies; "test": "node --test test/**/*.test.js"
.gitignore            # has a belt-and-braces block: never commit exports, photos, or secrets
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
- **This repo is PUBLIC.** `docs/` is gitignored so local planning drafts are safe there, but
  durable private/competition research and strategy belongs in the **private KnowledgeVault**
  (`/mnt/d/KnowledgeVault/…`). Respect the no-public-exposure posture: the NUC/Tailscale is never
  an origin for anything Aimless publishes.
- **Count the "close as I can get" presses** and surface the total. See `blueprint.md` §6 — that
  number decides whether the sibling `glyph-drift` project gets built.

## Scope

Before adding anything, check `blueprint.md` §8 and the temptations table in `roadmap.md` §6. The
plan is small deliberately. If it grows past a weekend, the experiment has failed on its own terms
even if the app is good.

## Device gotchas

Things that will each cost an afternoon. Full detail in `roadmap.md` §5, and a longer treatment
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
- **The walk snapshots itself** to `prefs/activeWalk` on arrival, photo capture, page hide and
  every 30s; `finishWalk` clears it. The Go screen's "Resume walk"/"Discard" UI was removed
  (round-2 enhancements) and this is now a **deliberate decision (roadmap A16)**: the wake lock +
  re-acquire on `visibilitychange` keeps an interrupted walk alive in practice, and a suspended
  app has no GPS anyway, so the snapshot stays dormant with no recovery UI. True background GPS
  is impossible for a PWA — the wake lock is the mitigation.
- **The focused walk state** (`body.walk-focused`, 10s idle) blanks everything but the compass and
  disables taps; it must never engage while a card is showing, and any interaction resets the clock.

## Conventions

**Every asset path is relative** (`./lib/geo.js`, `start_url: "./"`, `'./data/x.json'`), and
`sw.js` derives its root from `new URL('./', self.location)`. This is what lets the same build
serve from a domain root and from the `/aimless/` GitHub Pages prefix. Do not "tidy" them back
to absolute paths.

**Never edit files under `public/lib/engine/`** — it is a git submodule of
`wobbletone-engine`. Change the engine repo, push, then bump the submodule
pointer here (`cd public/lib/engine && git fetch && git checkout <sha>`). CI
checks out with `submodules: true`; the engine repo is public.

Photo filters are Filter Specs (`{id, name, spec}` in `filters.js`), rendered to pixels by the
`engine/` submodule (`renderToCanvas`). Preview, share cards, and export all use baked pixels —
there is no CSS/SVG filter pipeline. Runtime-imported specs persist in the `filters` store (Dexie
schema v2) and resolve through `getFilter` after the built-ins. Exported keepsakes must stay free
of scripts and filter machinery — `export.test.js` asserts it. Published
Neocities pages are the same artifact plus OpenGraph head tags (`opts.title` /
`opts.headHtml`); still script-free, still covered by the same test.

**Per-photo filter resolution** is `effectiveSpec(photo, fallback)`: `photo.filterSpec`
(a Surprise roll) beats `photo.filterId` (a named pick) beats the global pref. Detail render,
export, and share cards all go through it. `Surprise` in the rail is an *action token*, not a
stored filter — every deliberate tap re-rolls a 3–6-effect stack generated by `surprise.js`
from the engine's own `registry.js` param tables (crypto-seeded `makeRng`, `opacity` excluded,
validated through `validateSpec`).

**Voice model**: nine voices on the wheel. Seven oracle voices (Crow, Threshold, Lattice, Stray,
Small, Slow, Echo) derive cards from coordinates via `oracle.js` — four indices pick a title +
three lines from each voice's `data/*.json` pools (64⁴ combos per voice; every pooled line must
stand alone
grammatically because recombination splits sibling lines). The Inner is separate — a coordinate-
derived I Ching hexagram (`inner.js` + `inner.json`). My Voice has no cards; it optionally takes a
user text file at export time (blank-line-separated blocks map to photos). "No Voice" was removed —
the legacy `'none'` pref migrates to `'myvoice'`, and `export.js` keeps the name so old archived
walks still render. `deck.js` survives for the SVG walk trace (`drawWalk`) and recent-seed
avoidance (`pushRecent`/`recentKeys`); the seeded card deck is gone.

**Modal opt-out convention**: informational modals (welcome, photo-select hint) show on every
relevant entry until dismissed *with the "do not show again" checkbox checked* — all dismissal
paths (button, backdrop, Escape) must honor the checkbox.

**UI gotchas learned the hard way**:
- `[hidden]` loses to any `display:` rule — sheet rows need `.sheet-row[hidden]{display:none}`.
- Loading placeholders must match the photo's stored aspect ratio (`photo.ar`) or lazy fills
  shove the viewport; fixed-height placeholders caused real scroll jumps.
- Suppress native tap/selection feedback (`-webkit-tap-highlight-color: transparent`,
  `user-select:none`, `-webkit-touch-callout:none`) on photo frames, or iOS/Android paint their
  own blue over the coral selection ring.
- **A lit filter means "the filter the current selection has"** — never "the last one used."
  One photo selected → its filter lit; multiple selected with the same filter → that filter lit;
  empty or mixed selection → nothing lit. Skins always light (a skin always applies). Scroll-settle
  alone never lights a filter with no photos selected, and never fires action tokens (Surprise, +).

Vanilla ES modules. Pure logic in `public/lib/*.js`, tested with `node --test`; anything touching
the DOM, storage or geolocation stays in `public/index.html` or `sim.html` and is verified manually
via the simulator. Inline CSS and UI JS in `index.html` (the `pomo-day-sync` pattern). Dark, high
contrast — this is read outdoors in daylight. No emojis. **No em dashes in shipped copy** —
user-facing text stays short, dry and human; instructions may be explicit, mechanics stay
unexplained. One logical change per commit, prefixed
with the area (`detail:`, `walk:`, `filters:`, `echo:` …).
