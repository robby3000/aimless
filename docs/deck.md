# The Deck

> Content specification for `public/lib/deck.js` and `public/data/*.json`.
> Implement as written. This is the app's entire personality.

---

## 1. What a card is

**One to three sentences, shown when you reach a stop.** Something to do, notice, or refuse.

A card must be:

- **Second person, present tense.** "Find the…", "Wait beside…", "Do not…"
- **Certain.** Never "maybe", "perhaps", "you could", "try to", "why not".
- **Obeyable anywhere.** A street corner in Glasgow, a car park in Slough, a village lane.
- **Finishable in about two minutes**, standing up, without special equipment.
- **Free.** Never asks you to buy, take, damage or move anything.

A card must never be:

- Encouraging. No "enjoy", "have fun", "take your time", "well done".
- Explanatory. It does not mention the app, itself, the deck, or why.
- Theoretical. No "liminal", "energy", "vibes", "journey", "mindful", "psychogeography".
- Punctuated with an exclamation mark or an emoji.

## 2. Why the cards are deliberately generic

This is the most important design note in the repo, and it runs against the instinct.

Aimless has **no idea where you are**. It has a coordinate and nothing else. That turns out to be an
advantage. A card like *"find the oldest repair on this street"* is obeyable everywhere: there is
always *something* that qualifies, and the interpretive work — deciding what counts — is done by
you. That work is the entire experience.

Contrast a hypothetical AI card that names a real building and gets it wrong, or instructs you to
find something that is not there. It does not degrade into productive ambiguity; it simply fails,
and you are standing in the rain having been told a lie.

Dérive app, which has run a Situationist card deck since around 2016, reached the same conclusion:
their guidance says cards "should not be so specific that they only have one specific outcome". Their
base deck is *follow a mini-bus taxi*, *move towards a body of water*, *find a tree*.

So: **specific in register, general in target.** The voice is sharp and particular; what it points
at is loose enough to always exist. When Phase 2 adds AI cards, this deck is the control group they
have to beat.

## 3. The grammar

Each card is assembled from slots:

```
[OPENER?] DIRECTIVE TARGET [, CONSTRAINT]? [CODA?]
```

- **DIRECTIVE** and **TARGET** come from the chosen voice. This is what makes a Crow card sound like
  a Crow card.
- **OPENER**, **CONSTRAINT** and **CODA** are shared across all voices, each with an inclusion
  probability, so cards vary in length and rhythm.
- Suggested probabilities: opener 0.25, constraint 0.45, coda 0.35. Tune by reading output.
- All draws use the walk's seeded RNG (roadmap A7), keyed by `(seed, voice, stopIndex)`.
- **No repeats within a walk**, and ideally none across the last three walks — keep a small ring
  buffer of recent pairs in `prefs`.

12 directives × 14 targets gives 168 base pairs per voice before modifiers. A five-stop walk uses
five. That is enough that repetition will not be the reason you stop using it.

## 4. Shared slots

### Openers

```
There is one within twenty paces.
You have already walked past it.
Do not look for long.
Somebody chose this.
This will take two minutes.
Nobody else has done this here.
Start from where you are standing.
Assume it is deliberate.
```

### Constraints

```
without crossing the road
without moving your feet
before you have counted to thirty
from below
from as far away as you can while still seeing it
with one eye closed
only if it is worth less than a pound
without taking a photograph
twice, from opposite sides
while standing perfectly still
```

### Codas

```
It was left, not lost.
Someone else already decided against it.
This is not the first time.
It will not be here next year.
That was the point.
Do not explain it to anyone.
Now forget it.
It has been there longer than you have.
```

Note that `without taking a photograph` deliberately conflicts with the app's own photo feature.
Cards that refuse the thing the app is for are among the better ones — keep it.

## 5. The three voices

Names and lore carry over from the sibling `glyph-drift` repo's sigils, so this writing transfers
directly if the larger project is ever built. In Aimless they are **voices only** — there is no
geometry attached.

---

### 5.1 The Crow

**Epithet:** the appraising eye
**Shown to the user:** *The crow does not search; it appraises. It knows the difference between a
thing that has been dropped and a thing that has been left.*
**Register:** dry, appraising, faintly amused. Short declaratives. Never sentimental. Treats human
arrangements as curious animal behaviour.

**Directives**

```
Find            Appraise        Photograph      Count
Stand beside    Go back for     Ignore          Look under
Wait beside     Price           Judge           Take an interest in
```

**Targets**

```
the brightest thing at ground level
something dropped rather than placed
the most recently disturbed surface here
a repair someone hoped you would not notice
the thing nobody else has taken
an arrangement made entirely by accident
whatever a bird would land on first
the shiniest object within twenty paces
something that has been moved and not put back
the smallest thing here that was once expensive
a thing that is pretending to be another thing
whatever is directly beneath your feet
the object here with the least dignity
something that has outlasted its purpose
```

---

### 5.2 The Threshold

**Epithet:** the place that is neither
**Shown to the user:** *A threshold is not somewhere you are, it is somewhere you are passing
through, which is why almost nobody has ever looked at one.*
**Register:** still, attentive, unhurried. Concerned with waiting and with the architecture of
transit. The only voice that regularly tells you to stay put.

**Directives**

```
Wait beside     Stand inside    Do not leave    Occupy
Listen from     Watch           Stay until      Sit at
Remain in       Time            Notice          Shelter in
```

**Targets**

```
the nearest place designed to be passed through
a space between two buildings
whatever is sheltering you from nothing
the last dry spot
an entrance nobody is using
the gap where two surfaces meet badly
a place that is neither inside nor outside
the quietest three metres available
somewhere clearly meant for waiting
a corner that has no purpose
the spot where the noise changes
a boundary that is not a wall
the place with the worst view
wherever you would stand to be least noticed
```

---

### 5.3 The Lattice

**Epithet:** the grid that does not fit
**Shown to the user:** *The lattice does not care how the streets are arranged. It has its own grid
and it is imposing it.*
**Register:** geometric, indifferent, faintly bureaucratic. Speaks of coordinates and intersections
as though the city were an inconvenience obstructing a diagram.

**Directives**

```
Record          Count           Photograph      Measure by eye
Locate          Log             Verify          Survey
Enumerate       Establish       Align yourself with    Cross
```

**Targets**

```
every straight line visible from here
the point where two systems disagree
an angle that should not exist
the oldest surface in view
where a plan collided with an older plan
all the ways out of this spot
the nearest right angle that is wrong
a repeated element, and its exceptions
the seam between two materials
everything here that was installed rather than built
the number of decisions visible from where you stand
a grid that has been overruled
the boundary between two authorities
whatever is numbered
```

---

## 6. Worked examples

```
Appraise the most recently disturbed surface here, without moving your feet.
Someone else already decided against it.

You have already walked past it. Find a repair someone hoped you would not notice.

Wait beside the gap where two surfaces meet badly, while standing perfectly still.

Count all the ways out of this spot, twice, from opposite sides. That was the point.

Do not leave the quietest three metres available. It has been there longer than you have.
```

## 7. Quality bar

Before shipping W3: **read every directive against every target for at least one voice** — 168
pairs — and cut any pair that produces nonsense rather than strangeness. Some grammatical roughness
is fine and even good; incoherence is not. Expect to cut perhaps one in ten and to replace them.

Then walk with it. A card that reads well on a screen and dies on a pavement is a bad card, and you
will only find out outdoors.

## 8. Adding voices later

Not before five real walks (roadmap A12, W6). When you do:

1. Every target must exist **everywhere**. If it does not exist in a village, cut it.
2. The register must be audible. If a card could belong to another voice, it is not distinctive
   enough.
3. No card may require trespass, purchase, confrontation, or anything that inconveniences a
   stranger.
4. No card may involve a road, traffic, water, climbing or darkness.
5. Write the directives last. Targets are the hard part and the interesting part.
