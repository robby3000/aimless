# Verdict

> Fill this in. It is the output of the project.
>
> Aimless exists to answer three questions cheaply. If the app gets built and this file stays empty,
> the weekend was spent building an app instead of learning something — which may be fine, but it
> was not the plan.
>
> **Write each walk up while you are still outside, or within the hour.** Retrospective notes a week
> later are reconstructions, and they are kind to whatever you have already decided you think.

---

## The questions

1. **Is walking to arbitrary points enjoyable, repeatedly?** Not "was it interesting once" —
   did you want to do it again the next day?
2. **Are the cards good enough to be the point?** Would the walk have been as good with no cards
   at all? That is the real test, and it is uncomfortable.
3. **Do place-aware AI cards beat the hand-written deck?** *(Phase 2 only. Alternate them
   unlabelled. Record your preference before you check which was which.)*

---

## Walk log

Copy the block per walk. Five minimum, in different places, weather and times of day.

### Walk 1 — *date, area, weather, time of day*

- **Voice / stops / budget:**
- **Seed:**
- **Reached properly / "close as I can get":**  ` / `
- **Actual duration vs. estimate:**
- **Did you finish, or give up?** If you gave up: at which stop, and why?

**Best card, and why it worked:**

**Worst card, and why it failed:**

**Did you take photographs without being prompted to, or only because the app asked?**

**The moment, if there was one.** The bit you would tell someone about.

**Would you go again tomorrow?** Yes / No / Only somewhere else.

---

## Running tallies

Update after each walk.

| | Count |
|---|---|
| Walks completed | |
| Walks abandoned | |
| Stops reached properly | |
| Stops via "close as I can get" | |
| **Unreachable rate** | **%** |
| Photographs taken | |
| Cards that landed | |
| Cards that died | |

---

## The unreachable rate decides the bigger project

This is the number the sibling `glyph-drift` plan is waiting on. See `blueprint.md` §6.

| Rate | What it means |
|---|---|
| **Under ~10%** | Random points are fine. Snap-to-street solves a problem you do not have, and a large part of the `glyph-drift` plan — vector tiles, the street source abstraction, the safety filter, the whole of M4 — is unnecessary. Aimless is the right size for this idea. |
| **~10–25%** | Annoying but survivable. Try widening the arrival radius and adding a "reroll this stop" button before reaching for street data. |
| **Over ~25%** | Snapping is genuinely needed. This is a real argument for building the larger version, and you now have evidence for it rather than an assumption. |

**Measured rate after five walks:** `___%`

**Conclusion:**

---

## Answers

Write these only after five walks. Be willing to write "no".

### 1. Is it enjoyable, repeatedly?

### 2. Are the cards the point, or scenery?

### 3. *(Phase 2)* Did the AI beat the deck?

---

## Decision

Tick one and write a sentence.

- [ ] **Keep Aimless as it is.** It is finished and good. Nothing further.
- [ ] **Extend Aimless a little.** Name the two or three specific things, and check each against
      `blueprint.md` §8 first.
- [ ] **Build Glyph Drift.** State which specific finding justifies the step up — "I got bored of my
      own streets", "the unreachable rate was 30%", "I want other people's marks in my city". A
      general enthusiasm is not a finding.
- [ ] **Stop.** It did not work. Write down why, honestly, so the idea does not get reinvented in
      eighteen months with the same flaw.

**Signed off:** *date*
