# Aimless — Blueprint

> What it is and why. The build plan is [`roadmap.md`](./roadmap.md); the card content is
> [`deck.md`](./deck.md). Findings from the first real walks go in [`verdict.md`](./verdict.md).

---

## 1. What it is

Press one button. Aimless picks five points at random bearings and distances, chained one after
another so they form a wander rather than a star. It gives you a compass arrow and a distance —
never a map, never a route. When you get close to a point, your phone sounds and a card appears
telling you to do something odd. You answer it with a photograph if you want to. At the end you get
an abstract drawing of the shape you walked, and a single HTML file containing the whole thing that
you can keep, print, or send to someone.

There are no accounts, no server, no map tiles, no API keys and no database. It is a folder of
static files that works on a plane.

## 2. Why it exists

Aimless is the deliberately small version of a much larger concept
(see the sibling `glyph-drift` repo). That plan is twelve milestones and rests on three assumptions
nobody has tested. Aimless tests them in a weekend:

1. **Is walking to arbitrary points actually enjoyable, repeatedly?**
2. **Are the cards good enough to be the point?**
3. **Do place-aware AI cards beat hand-written generic ones?** *(Phase 2 only — see §7)*

If the answers are no, that is worth knowing for the price of a weekend rather than a month.
If they are yes, Aimless is already a good app and most of its content transfers upward unchanged.

**Aimless is not a prototype.** It is meant to be finished, used, and kept. It just happens to also
be an experiment.

## 3. The core loop

1. Open. One button: **Go**.
2. It reads your location and generates a chain of stops.
3. A large arrow, a bearing, a distance. Nothing else.
4. Within 30m of a stop: a tone, a flash, a buzz on Android. A card appears.
5. Do the thing, or don't. Photograph it, or don't.
6. The arrow swings to the next stop.
7. When you finish or give up, you get the walk back as a drawing and a gallery.

## 4. Design principles

- **No map during the walk.** You get a bearing and a distance and you work it out. This is not a
  limitation, it is the product: being told "270m, that way" preserves the improvisation that
  routing you along a chosen street removes.
- **The app never routes you.** It cannot send you into traffic because it never gives directions.
- **Every point is negotiable.** With no street data, some stops will be inside buildings, behind
  fences or in rivers. There is always a **"close as I can get"** button. Getting near is arriving.
- **Local and permanent.** Your walks live on your device. Export produces a file you own. Nothing
  is uploaded anywhere, because there is nowhere to upload it to.
- **Finite and honest.** The cards come from a hand-written deck. It will eventually repeat, and a
  finite deck with a good voice ages better than an infinite generator with a tic.
- **No dependencies.** Zero npm packages at runtime, no CDN, no build step, no framework.

## 5. Generation

Stops are a **chain**, not a scatter: each is a random bearing and distance from the *previous* one.
A scatter around your start point sends you back through the middle repeatedly; a chain produces an
actual wander. The final leg is biased back toward where you began, so you end up somewhere near
home.

Turns are constrained to between 40° and 150° off the previous heading — anything straighter is
boring, anything sharper is a backtrack.

Leg length is derived from your time budget, and **corrected for the fact that you cannot walk in
straight lines.** A street network typically forces about 1.35× the crow-flight distance. Omitting
that factor is why naive versions of this idea always overrun by a third.

Everything random comes from a **seeded generator**, and the seed is saved with the walk. The same
seed and start point reproduce the same walk, so a walk can be shared as a short string and two
people can walk the same one.

## 6. The measurement nobody would think to build

Every time you press **"close as I can get"** instead of actually reaching a stop, Aimless records
it.

That number is the whole argument about whether snap-to-street is necessary. If 5% of stops are
unreachable, the simple version is sufficient and the larger project's entire street-data pipeline
is unnecessary complexity. If it is 40%, snapping is essential and that is a strong argument for
building the bigger thing.

Aimless is therefore not just a smaller app. It is the instrument that decides whether the bigger
one is worth building. Do not skip the counter.

## 7. Phases

**Phase 1 — the weekend.** Everything above. Cards come from the hand-written deck. Entirely static,
no network, no key, no cost.

**Phase 2 — only if Phase 1 survives five real walks.** Add a small proxy holding an AI key that
generates place-aware cards from nearby street names. Ship it **alongside** the deck and alternate
between them at random within a walk, unlabelled, so question 3 gets an honest answer rather than a
flattering one.

Do not build Phase 2 first. The deck is the control group, and it is also the thing that keeps the
app working forever with no running costs.

## 8. Explicitly not in Aimless

Sigils and glyph geometry · snap-to-street · any map, basemap or tile provider · accounts, login or
identity · a server database · other users, sharing, commons or heatmaps · ghost cities · audio or
video capture · turn-by-turn anything · notifications · a build step.

Several of these are good ideas. They are all in the `glyph-drift` plan, and they should stay there
until Aimless has earned them.

## 9. Data

Three IndexedDB stores, written by hand in about eighty lines. No ORM, no wrapper library.

| Store | Contents |
|---|---|
| `walks` | id, seed, started, ended, deck, budget, stops[] (lat, lng, seq, cardText, reachedAt, approached), trace[] (simplified) |
| `photos` | id, walkId, stopSeq, blob, caption, taken |
| `prefs` | deck, stop count, budget, TTS on/off, units |

Photos are downscaled on a canvas before storage — a phone will happily hand you 12 MB and
IndexedDB will happily keep all of it.

## 10. Privacy

There is no server, so there is nothing to leak. Location is read only during a walk and stored only
on the device. The exported HTML file contains your photographs and coordinates — it is a personal
archive, and the export screen should say so plainly before you send one to anybody.
