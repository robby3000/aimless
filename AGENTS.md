# Aimless — Agent Notes

A walking app with no map. Press Go, follow a compass arrow to random points (5 stops / 45 min
by default; stops, budget and voice are Go-screen wheels), get a card at each one, take a photo
if you want, end up with a drawing of the shape you walked and a self-contained HTML file you
can keep. Zero dependencies, zero build step, zero server.

## Start here

**`docs/` is gitignored — everything in it is local-only.** The files exist on disk but not on
GitHub; the links below resolve for whoever holds the working copy.

1. `docs/roadmap.md` — **historical build plan, superseded** (the experiment shipped; the app is
   now a product). Still consult §1 decisions A1–A16, §2 algorithm spec, §5 device notes, §6 scope
   discipline. Its "weekend build" scale framing is obsolete — ignore it.
2. `docs/blueprint.md` — what and why.
3. `docs/deck.md` — the original card grammar. Historical: the seeded deck is gone (cards now
   come from oracle pools, see Conventions → Voice model). `deck.js` survives only for the SVG
   walk trace (`drawWalk`) and recent-seed avoidance.
4. `docs/verdict.md` — the template the human fills in after five real walks.
   Do not delete it and do not fill it in yourself.
5. `docs/ignore/` — working drafts and discussion docs (voice pools, UI proposals). Nothing in
   it is load-bearing. `docs/archive/` holds retired dev plans and superseded drafts —
   historical only, moved not deleted. Two worth reading anyway:
   - `docs/ignore/20261020-architectural-principles-and-description.md` — the architecture
     rationale: why the code is shaped the way it is, written for human maintainers.
   - `docs/ignore/20261018-codebase-review-and-refactor-plan.md` — the risk register the
     refactor worked from, with a status section recording what landed vs what is deferred.

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
- Phone testing: needs HTTPS (geolocation and friends refuse a plain LAN IP). The local
  setup lives in `docs/ignore/local-ops.md`.
- Icons: `npm run icons` → `node scripts/make-icons.mjs` (uses `sips` on macOS).
- Simulator: `public/sim.html` — drives the walk logic from a synthetic track. Use it constantly.

## Repo shape

This listing is the inventory `sw.js` precaches from. Keep it exact: `lib/proximity.js` was
once missing here, was therefore missing from `PRECACHE` too, and would have broken the app
offline. If you add a file under `public/`, add it in both places.

```
public/
  index.html          # boot + shell markup + go/walk/archive/done screens (UI JS)
  style.css           # all app styles (extracted from index.html; link, not @import)
  sim.html            # GPS simulator (roadmap A11)
  manifest.json       # no "id" (defaults to start_url) and no "version" (not a manifest member)
  sw.js               # precaches the shell for offline use; cache name is generated, see below
  icons/              # generated PNGs (192, 512, 512-maskable)
  fur-bg.webp         # #screen-go fur texture, 3x portrait export (1152x2082);
                      # media query hides it past the image bounds (no bare edges)
  images/
    og.jpg            # link-share card for aimless.earth (1200x630 JPEG)
  lib/
    geo.js  rng.js  walk.js  deck.js  store.js  dexie.mjs  proximity.js  export.js  skins.js
    markup.js           # pure markup builders (traceSVG); string in, string out, node-testable
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
    ui/
      modals.js         # promise dialogs: askConfirm, askText (self-wiring, no deps)
      detail.js         # Walk Detail: artifact view, skin/filter rails, filter management,
                        # publish hand-off, export sheet, share/OG cards. Owns detail-visit
                        # state; shared deps injected via initDetail({dbPromise, showScreen,
                        # showToast, savePrefs, toastHold, toastRelease}); prefs round-trip
                        # via loadDetailPrefs()/detailPrefValues()
  data/
    crow.json  threshold.json  lattice.json    # oracle pools (the seeded-deck format is replaced)
    stray.json small.json slow.json echo.json  # oracle pools
    inner.json          # 64 hexagrams: number, hex_font, binary, title, haiku
test/
  geo.test.js  rng.test.js  walk.test.js  deck.test.js  proximity.test.js  skins.test.js
  platform.test.js  export.test.js  inner.test.js  filters.test.js  backup.test.js  filter-renderer.test.js
  kml.test.js  walk-nav.test.js  engine.test.js  surprise.test.js  oracle.test.js
  publish.test.js  markup.test.js
scripts/
  make-icons.mjs      # npm run icons
  stamp-sw.mjs        # npm run stamp -- rewrites the sw.js cache name
  dev-serve.sh        # push public/ to a dev box + restart a tailnet-only TLS static
                      # server for phone testing; box details live in gitignored
                      # scripts/dev-serve.env (see docs/ignore/local-ops.md)
  dev-serve-tls.mjs   # the server dev-serve.sh runs (generic, no infra details)
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
- **This repo is PUBLIC.** `docs/` is gitignored so local planning drafts are safe there;
  durable private research and personal-infrastructure details belong in
  `docs/ignore/local-ops.md` or the private vault it points at. Respect the
  no-public-exposure posture: personal infrastructure is never an origin for anything
  Aimless publishes.
- **Count the "close as I can get" presses** and surface the total. See `blueprint.md` §6 for
  why that number is collected.

## Scope

Before adding anything, check `blueprint.md` §8 and the temptations table in `roadmap.md` §6. The
app stays deliberately small — new features are integrations at the edges (more skins, webring,
publish targets), not growth of the core loop.

## Device gotchas

Things that will each cost an afternoon. Full detail in `roadmap.md` §5.

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
- **`height: 100%` is NOT the visible viewport on iOS/Android.** Percentage heights resolve to the
  *large* viewport — taller than the visible area under the browser chrome. Slides sized `100%`
  overflow the screen, centered content rides low, and anything near the bottom edge (footer
  links!) lands in the untappable zone under Safari's bar. Size scroll ports and full-screen
  slides with `100svh` (small viewport = visible area), keeping `100%` as the fallback
  declaration. Headless Chrome passes every check while iOS is broken — this bug shipped.
- **A short trailing element has no stable snap point under mandatory scroll-snap in WebKit.**
  The Chapters footer was unreachable until it became a full-height slide like every other
  snap child. Any trailing strip in a snap skin must be a full slide, not a sliver.
- **Desktops get the landing page, not the app.** A head script leaves `html` without the
  `app` class when the primary pointer isn't coarse; CSS hides the app shell and shows
  `.desktop-page`. **Use `#app` to force the real app on desktop** — every headless/manual
  desktop test needs it. Phones can't regress (coarse pointer → app), and no-JS visitors get
  the readable page rather than a dead shell.

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
- **Extracted modules must never reach into index.html's scope.** A bare reference to a shell
  variable (`elToast`, `toastTimer`) fails at runtime, not at import time — the export build
  silently produced nothing once. Shared plumbing crosses the boundary only via `init*(deps)`
  or module-scope state the module owns. When moving code, scan for *bare* references too —
  a scan of called names misses them.

**Artifact footer contract** (`export.js`, test-pinned): `Created with Aimless` plus, for walks
with a published Neocities page, a `Walk index` link derived from `walk.neocities.pageUrl`.
Published builds pass `opts.indexHref` from `neocitiesTargets().indexUrl` (`…/aimless/`).
Nothing else goes in the footer: Neocities rejects `.kml` uploads, and embedded route links
leaked GPS into every shared copy — footer KML was removed for both reasons. Route export
survives only as the explicit **Export Route** action (a real `.kml` download).

Vanilla ES modules. Pure logic in `public/lib/*.js`, tested with `node --test`; DOM code lives in
`public/index.html` (go/walk/archive/done screens + boot) and `public/lib/ui/` (self-wiring
screen modules), verified manually via the simulator. Styles live in `public/style.css`, never
inline. `lib/ui/` modules own their state at module level by lifetime (detail.js owns
detail-visit state; index.html owns walk-session state) and receive shared dependencies via an
`init*(deps)` call — they must not import index.html state directly. Dark, high
contrast — this is read outdoors in daylight. No emojis. **No em dashes in shipped copy** —
user-facing text stays short, dry and human; instructions may be explicit, mechanics stay
unexplained. `punk mode` is deliberately lowercase on the Info page — not a typo to fix.
One logical change per commit, prefixed
with the area (`detail:`, `walk:`, `filters:`, `echo:` …).
