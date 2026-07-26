# Aimless

Go nowhere, on purpose.

Press one button. Aimless picks five points at random bearings and distances, chained into a wander
rather than scattered around you. It gives you a compass arrow and a distance — no map, no route,
no fastest way. When you get close to a point your phone sounds and a card appears telling you to do
something odd: *appraise the most recently disturbed surface here, without moving your feet*. You
photograph it, or you don't. At the end you get an abstract drawing of the shape you walked and a
single HTML file you can keep, print, or send to someone.

No accounts. No server. No map tiles. No API keys. No build step. A folder of static files that
works on a plane.

---

**Status: planning. No code yet.** Start with [`AGENTS.md`](./AGENTS.md).

## Documentation

| Document | Purpose |
|---|---|
| [`docs/roadmap.md`](./docs/roadmap.md) | The build plan — decisions, six steps, device notes. Short on purpose. |
| [`docs/blueprint.md`](./docs/blueprint.md) | What it is, why it exists, how walks are generated |
| [`docs/deck.md`](./docs/deck.md) | The cards: grammar, three voices, and why they are deliberately generic |
| [`docs/verdict.md`](./docs/verdict.md) | Template for the five real walks. The actual output of the project. |

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
