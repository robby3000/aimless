# Aimless

Go nowhere, on purpose.

Press one button. Aimless picks five points at random bearings and distances, chained into a wander
rather than scattered around you. It gives you a compass arrow and a distance — no map, no route,
no fastest way. When you get close to a point your phone sounds and the place speaks: a card whose
text is drawn deterministically from the coordinates themselves, so the location is quite literally
the author. You photograph something, or you don't. At the end you get an abstract drawing of the
shape you walked and a single HTML file you can keep, print, or send to someone.

No accounts. No server. No map tiles. No API keys. No build step. A folder of static files that
works on a plane.

---

**Status: live** as an installable PWA. Contributor notes and commands are in
[`AGENTS.md`](./AGENTS.md).

## What it does

- Generates a seeded wander of waypoints — same seed, same route — sized to your chosen stop count
  and time budget, navigated by compass arrow only.
- At each waypoint a voice speaks. Seven oracle voices derive their cards deterministically from
  the coordinates; The Inner draws an I Ching hexagram; My Voice keeps quiet and optionally pairs
  your own text with the walk at export.
- Photos you capture can be filtered individually or together — named presets or a Surprise roll —
  rendered by the shared `wobbletone-engine` submodule, and the whole artifact restyles through
  selectable skins.
- Exports a self-contained HTML keepsake, a share card, and a KML route for mapping apps.
- Works fully offline once installed; all data lives in IndexedDB on the device.

## Documentation

Planning docs (`roadmap`, `blueprint`, `deck`, `verdict`) are deliberately not in this public repo —
`docs/` is gitignored as local working material. [`AGENTS.md`](./AGENTS.md) carries what a
contributor needs.

## Stack

Vanilla HTML, CSS and JavaScript. A PWA with a service worker, IndexedDB for storage, and Node's
built-in test runner for the pure logic. Zero dependencies — `package.json` exists but installs
nothing.

## Why it is this small

Aimless is the deliberately minimal version of a larger concept planned in the sibling `glyph-drift`
repo. That plan is twelve milestones and rests on three untested assumptions: that walking to
arbitrary points is repeatedly enjoyable, that the cards carry the experience, and that place-aware
AI text beats a hand-written deck.

Aimless answers all three in a weekend, and it counts one number nobody would think to measure — how
often a random point turns out to be unreachable — which determines whether the bigger version needs
building at all.

It is not a throwaway prototype. It is meant to be finished and kept. It just happens to also be the
experiment.
