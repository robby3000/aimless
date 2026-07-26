# Aimless — Build Roadmap

> Execution plan. Read [`blueprint.md`](./blueprint.md) first (what and why) and
> [`deck.md`](./deck.md) before step W3 (the card content — binding).
>
> **This is a weekend build. Roughly 15 hours of work.** If you find yourself adding architecture,
> stop and re-read blueprint §8. The plan being short is not an oversight; it is the point.

---

## Executive summary

Aimless sends you to five random points and gives you something strange to do at each one. No map,
no accounts, no server, no API keys, no build step — a folder of static files plus a service worker.
Press Go, follow a compass arrow, get a card on arrival, take a photograph, and end up with a
drawing of the shape you walked and a self-contained HTML file you can keep.

It is a real app, and it is also a one-weekend experiment that decides whether the much larger
`glyph-drift` plan is worth building. Three decisions carry it:

1. **Vanilla PWA, zero dependencies.** One `index.html` with inline CSS and JS, a handful of ES
   modules for the pure logic, `manifest.json` and `sw.js`. Same shape as `pomo-day-sync`. Tests via
   Node's built-in runner, so there is no `node_modules` at all.
2. **No street data and no map, anywhere.** Points are a chained wander by bearing and distance;
   the end-of-walk drawing is an abstract SVG trace. This removes tile providers, API keys,
   attribution obligations and roughly two-thirds of the work — and it arguably makes the walk
   better, because you improvise the route instead of being handed one.
3. **Cards come from a hand-written deck, not an AI.** The app costs nothing to run and works with
   no signal. AI is Phase 2, and only as an A/B against the deck.

The single most important line of code is the counter behind the **"close as I can get"** button.
See blueprint §6 — it is the measurement that decides the fate of the bigger project.

---

## 1. Decisions

| # | Decision |
|---|---|
| **A1** | **Vanilla HTML/CSS/JS PWA.** No framework, no bundler, no build step. UI and styles inline in `public/index.html` (the `pomo-day-sync` pattern); pure logic in `public/lib/*.js` as ES modules imported with `<script type="module">`. |
| **A2** | **Zero runtime dependencies.** No npm packages, no CDN scripts. A CDN would break first-load offline, which is unacceptable for a walking app. `package.json` exists but declares no dependencies. |
| **A3** | **Tests via `node --test`.** Node's built-in runner over `public/lib/*.js`. Matches `pomo-day-sync`. No Vitest, no jest, no `node_modules`. |
| **A4** | **Raw IndexedDB, ~80 lines.** Three stores (blueprint §9). No Dexie, no `idb-keyval`. |
| **A5** | **No map and no basemap, ever, in Phase 1.** The walk view is a compass. The gallery shows the trace as an abstract SVG. This eliminates the entire tile/key/attribution problem. |
| **A6** | **Chained generation with a detour factor.** See §2. Legs are corrected by 1.35× for real street distance. |
| **A7** | **Seeded RNG (`mulberry32`), seed stored with the walk.** Walks are reproducible and shareable as a short string. Never call `Math.random()` in generation. |
| **A8** | **Arrival is 30m with two-fix hysteresis, plus a manual "close as I can get".** Both count as reaching the stop; the manual one is flagged `approached` and counted. |
| **A9** | **Cards from the deck grammar in [`deck.md`](./deck.md).** Three voices. Seeded, no repeats within a walk. |
| **A10** | **Export is one self-contained HTML file** with base64 images inline, plus a JSON export/import for backup. No sync, no cloud. |
| **A11** | **A simulator page ships in Phase 1.** `public/sim.html` drives the walk logic from a synthetic track. You cannot debug a GPS app at a desk without one, and you will need it more than you expect. |
| **A12** | **Phase 2 (AI) is not built until five real walks are logged in [`verdict.md`](./verdict.md).** Non-negotiable. It is the entire reason this repo exists. |

---

## 2. The generation algorithm

The core of the app, and the thing most worth getting right. Pure, in `public/lib/walk.js`.

```
generateWalk(origin, n, budgetMin, seed):
  # leg length from time budget, corrected for real streets
  walkingMin = budgetMin - (n * 1.5)             # 90s dwell per stop
  totalWalked = 75 * walkingMin                  # metres, at 4.5 km/h
  legStraight = (totalWalked / n) / 1.35         # detour factor
  minLeg, maxLeg = legStraight * 0.6, legStraight * 1.4

  cur = origin
  heading = rng.range(0, 360)
  for i in 0..n-1:
    if i == n-1:                                 # last leg heads roughly home
      heading = bearingTo(cur, origin) + rng.range(-40, 40)
      dist    = clamp(distanceTo(cur, origin), minLeg, maxLeg)
    else:
      turn    = rng.pick(sign) * rng.range(40, 150)   # never straight, never a backtrack
      heading = (heading + turn) mod 360
      dist    = rng.range(minLeg, maxLeg)
    cur = destination(cur, heading, dist)
    emit cur
```

Defaults: **5 stops, 45 minutes** → about 420m per leg, roughly a 2.8km walk.

Sanity clamps: minimum leg 150m (closer is not a journey), maximum 1200m (further is a trek).
If the budget produces legs outside that range, adjust the stop count and tell the user what you
did.

---

## 3. Steps

Each step is a sitting. Commit at the end of each.

### W1 — Shell and storage · ~2h

`public/index.html` with inline CSS and a token set (dark, high contrast — this is used outdoors).
`manifest.json` (standalone, portrait, maskable icons), `sw.js` precaching the shell with a
versioned cache. Three screens: **Go**, **Walk**, **Archive**. `public/lib/store.js` — raw
IndexedDB, three stores, open/upgrade/put/get/all/delete.

*Done when:* installs to a home screen, the shell loads with the network off, and a round-trip write
and read of a walk record passes a test.

### W2 — Geo core and generation · ~2h

`public/lib/geo.js` — `haversine`, `bearing`, `destination`, `simplify` (Ramer–Douglas–Peucker).
`public/lib/rng.js` — `mulberry32`, plus seeded `range`, `pick`, `sign`.
`public/lib/walk.js` — the algorithm in §2.

*Done when:* tests cover known distances and bearings, RNG determinism against an exact expected
sequence, RDP endpoint preservation, and — for the generator — correct stop count, every leg within
`[minLeg, maxLeg]`, every turn within 40–150°, the last stop measurably closer to the origin than
the second-to-last, and byte-identical output for a repeated seed.

### W3 — The deck · ~4h

`public/lib/deck.js` — the slot grammar. `public/data/*.json` — the three voices.
**This is the largest single time sink and it is writing, not coding.** Content and rules are
specified in [`deck.md`](./deck.md); implement it as written.

*Done when:* a 5-stop walk produces five distinct, coherent cards; the same seed reproduces them;
and you have read every directive against every target for at least one voice and cut the pairs that
produce nonsense.

### W4 — The walk · ~4h

Read §5 before starting. `watchPosition` with high accuracy, started on Go and torn down on end.
Compass screen: big arrow, bearing, distance, stop counter. Arrival at 30m with two-fix hysteresis →
vibrate (Android), tone, flash, card. **"Close as I can get"** button, always visible, flagged and
counted. Photo capture via `<input type="file" accept="image/*" capture="environment">`, downscaled
on a canvas, stored as a blob. Trace buffered and simplified. **Give up** button that ends cleanly
and saves everything. `public/sim.html` (A11) driving all of it from a synthetic track.

*Done when:* a full walk completes in the simulator with the network off, and arrival fires exactly
once per stop even with an injected GPS spike.

### W5 — Gallery and export · ~3h

Archive list. Walk detail: the trace as an abstract SVG drawing, stops in sequence with their cards,
photographs and captions, plus the approached-vs-reached count. Export to a single self-contained
HTML file with inline base64 images. JSON export and import. A `@media print` stylesheet that folds
it into something worth keeping.

*Done when:* an exported HTML file opens correctly in a browser with no network and no original app,
and the print preview is genuinely pleasant.

### W6 — Five real walks · the actual point

Different places, different weather, different times of day. Fill in
[`verdict.md`](./verdict.md) after each one, **while still outside or immediately after** — not from
memory a week later.

*Done when:* five walks are logged and the three questions in blueprint §2 have honest answers.

### P2 — AI cards · only after W6, only if warranted

A single endpoint holding the key (a small Node handler or one serverless function) that takes a
coarse locality and returns N cards. Ship it **alternating at random with the deck, unlabelled**.
Record which you preferred before revealing which was which. Anything else produces a flattering
answer instead of a true one.

---

## 4. Repo shape

```
public/
  index.html          # the app: inline CSS + UI JS
  sim.html            # GPS simulator (A11)
  manifest.json
  sw.js
  icons/
  lib/
    geo.js  rng.js  walk.js  deck.js  store.js  export.js
  data/
    crow.json  threshold.json  lattice.json
test/
  geo.test.js  rng.test.js  walk.test.js  deck.test.js  store.test.js
docs/
package.json          # no dependencies; "test": "node --test test/"
```

---

## 5. Device notes

Condensed from the fuller treatment in the sibling `glyph-drift` repo
(`docs/device-reality.md`). These six will each cost you an afternoon if ignored.

1. **iOS has no vibration API.** WebKit never shipped it and formally opposes it. Signal arrival
   with a tone and a screen flash on every platform; treat haptics as an Android bonus. Do not show
   a UI hinting at vibration on a device that cannot vibrate.
2. **Prime audio inside the Go tap.** iOS suspends `AudioContext` until a gesture resumes it. Call
   `audioCtx.resume()` in the button handler or your first arrival is silent — on the most important
   moment in the app.
3. **HTTPS is required, from day one.** Geolocation, wake lock, camera and service workers all need
   a secure context, and a LAN IP is not one. `localhost` is fine for desktop; for phone testing use
   the Tailscale + `*.ts.net` certificate pattern already set up for `pomo-day-sync`.
4. **Request a wake lock** on Go and **re-request it on `visibilitychange`** — it is released
   automatically whenever the page is hidden. Release it when the walk ends.
5. **Reject bad fixes.** Discard anything with `accuracy > 50` for arrival decisions and anything
   with a `timestamp` older than ~30s. Urban GPS spikes cause phantom arrivals; hence the two-fix
   hysteresis in A8.
6. **Tear down the watch** on end, on give-up and on page unload. An orphaned high-accuracy
   `watchPosition` is the worst battery bug available to this app.

There is no background geolocation on the web. Aimless is a screen-on, foreground, wake-locked
session. Do not attempt workarounds.

---

## 6. Scope discipline

Before adding anything not in this document, check it against blueprint §8. The likely temptations,
and the answer to each:

| Temptation | Answer |
|---|---|
| "A small map would help" | No. A5. The absence is the design. |
| "It should sync between devices" | No. Export a file. |
| "Let's add accounts so walks can be shared" | No. Share the seed string, or the exported HTML. |
| "The AI cards would be so much better" | Maybe. A12. Five walks first. |
| "Snapping would fix the unreachable points" | That is the question being measured, not a bug to fix. Blueprint §6. |
| "Just a few more voices in the deck" | After W6. Three is enough to test whether register matters. |

If Aimless turns out to be good and you want the bigger version, it is already planned in the
`glyph-drift` repo and most of the deck content transfers directly.
