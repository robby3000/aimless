// Walk Result skins. Each skin is a CSS fragment written against the shared
// walk-result markup vocabulary (body, h1/h2, .seed, .walk-voice, .date,
// .summary, .trace, .stop, .stop-num, .status, .card-text, footer; The
// Inner voice adds an optional .card-hex > .glyph + .hex-title block before
// .card-text, which gains .card-haiku containing one .haiku-line per line).
// .stop-num is emitted for every stop but hidden by default in BASE_CSS -
// a skin reveals it (and styles it) when numerals suit its design.
// .stop-open/.stop-shut are a hidden radio pair per stop: CSS-only card
// expansion with single-open and tap-to-close (Contact Sheet's lightbox).
// .zoom-open/.zoom-shut are the same pair per photo frame: tap-to-enlarge.
// The export uses them as tap surfaces; in-app they stay display:none
// while JS flips .checked.
// The same fragment skins the in-app detail view (scoped to #detail-content
// via scopeCSS) and the self-contained HTML export (embedded as-is). CSS
// only - exports must never contain scripts.
//
// Photos are styled via their .photo-frame wrapper, never the leaf element:
// the leaf is <img> in exports but <canvas> in-app, while the frame exists
// in both markups unchanged.
//
// Skins style decoration only: colours, typography, borders, backgrounds.
// Never layout, so the same fragment works against both markups. A skin may
// add purely decorative layers on its own pseudo-elements (Aquarium's fish
// are a fixed full-viewport body::before) - pointer-events: none, always, so
// the page underneath stays usable.
//
// Two things a skin cannot style with CSS are carried as data instead:
//   card  - palette + font for the share-card canvas
//   trace - colours for the trace SVG (its fills/strokes are attributes)
//   icon  - which transparent logo variant ('light' | 'dark' | 'sky') the
//           HTML export embeds, chosen for contrast against the skin's bg

/**
 * Base walk-result styles. The HTML export embeds this verbatim; the in-app
 * Walk result view injects it scoped to #detail-content. Because the default
 * decoration comes from the same injectable fragment mechanism as the skins
 * (and the app's own stylesheet carries no result decoration), a skin can
 * override any of it - this is what makes skins apply fully in-app, not
 * just in exports.
 */
export const BASE_CSS = `
/* The skinnable surface: a palette/typography skin should only need to set
   these. Defaults reproduce the original dark look. */
:root {
  --bg: #23221f; --surface: #161616; --fg: #e8e8e8; --fg-dim: #888; --accent: #7ab8ff;
  --body-font: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  /* --heading-font intentionally undeclared: an unset var() makes
     font-family fall back to inherit, so headings follow body font unless
     a skin sets it explicitly. */
  --mono-font: monospace;
  --rule: #222;
  --badge-reached-bg: #2a4a2a;    --badge-reached-fg: #8c8;
  --badge-approached-bg: #4a3a2a; --badge-approached-fg: #fc8;
  --badge-missed-bg: #4a2a2a;     --badge-missed-fg: #e0a3a3;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: var(--bg); color: var(--fg);
  font-family: var(--body-font);
  line-height: 1.6; padding: 24px; max-width: 640px; margin: 0 auto;
}
h1 { font-family: var(--heading-font); font-size: 1.4rem; margin-bottom: 4px; }
h1 a { color: inherit; text-decoration: none; }
.seed { font-family: var(--mono-font); color: var(--accent); font-size: 0.9rem; }
.walk-voice { font-size: 0.9rem; color: inherit; opacity: 0.85; margin-top: 2px; }
.date { color: var(--fg-dim); font-size: 0.9rem; margin-bottom: 16px; }
.summary { color: var(--fg-dim); font-size: 0.9rem; margin-bottom: 24px; }
.summary b { color: var(--fg); }
.trace { background: var(--surface); border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center; }
.trace svg { max-width: 100%; height: auto; }
.stop {
  margin-bottom: 20px;
  border-bottom: 1px solid var(--rule); padding-bottom: 16px;
}
.stop-meta { margin-bottom: 8px; }
/* Waypoint numbers are a per-skin dial: always emitted, hidden here. A skin
   that wants them opts in and styles them itself (.stop-num { display: ... }). */
.stop-num { display: none; }
/* Expansion state hooks: hidden same-named radio pairs — .stop-open plus
   .stop-shut per stop (open one card, previous closes; the shut surface on
   the open card is tap-to-close) and .zoom-open plus .zoom-shut per photo
   frame (tap-to-enlarge). A skin that wires a pair re-shows and positions
   it (Contact Sheet makes .stop-open a transparent full-cell surface). */
.stop-open, .stop-shut, .zoom-open, .zoom-shut { display: none; }
/* Quiet status marks: every stop reports its outcome, but as small dim
   text, not a pill — it reports, it doesn't badge. */
.status { font-size: 0.8rem; font-style: italic; color: var(--fg-dim); }
.status.approached { color: var(--badge-approached-fg); }
.status.missed { color: var(--badge-missed-fg); }
.card-text { font-size: 1.1rem; line-height: 1.6; }
/* The Inner voice: a large hexagram glyph beside its title, then the haiku
   below a faint rule. No colour is set so every skin's palette flows through. */
.card-hex { display: flex; align-items: flex-end; gap: 14px; }
/* The hexagram glyphs are full-width cells: the bars are drawn narrower,
   so the font bakes in side bearing on both sides. A small negative margin
   optically left-aligns the bars with the text column. */
.card-hex .glyph { font-size: 3rem; line-height: 1; flex-shrink: 0; margin-left: -0.1em; }
.card-hex .hex-title { font-family: var(--heading-font); font-size: 1.15rem; font-weight: 700; line-height: 1.3; }
/* Title binds to its verse: no rule between them — separation lives at the
   .stop boundary. A rule here made the title read as a caption for the
   previous stop's photo. */
.card-haiku { margin-top: 8px; }
.haiku-line { display: block; overflow-wrap: break-word; }
/* My Voice overflow: blocks beyond the photo count trail the content as
   plain paragraphs — no card frame, rule, or stop number. */
.myvoice-tail { margin-top: 24px; }
.myvoice-tail p { margin: 0 0 1.1em; font-size: 1.1rem; line-height: 1.6; overflow-wrap: break-word; }
footer { margin-top: 32px; color: var(--fg-dim); font-size: 0.8rem; text-align: center; }
footer a { color: inherit; }
.app-icon { width: 44px; height: 44px; vertical-align: -8px; margin-right: 6px; }
/* Skins restyle photos via the bare img selector; the app icon must keep
   its own look, so pin it back with a more specific rule. */
img.app-icon { border: none; outline: none; box-shadow: none; transform: none; filter: none; padding: 0; background: none; }
`;

/** Print overrides for the HTML export (white paper, light badges). */
export const PRINT_CSS = `
body { background: white; color: black; max-width: none; }
.trace { background: white; border: 1px solid #ccc; }
.stop { border-bottom: 1px solid #ddd; }
.status.approached { color: #642; }
.status.missed { color: #622; }
.seed { color: #448; }
`;

// Aquarium's fish: the guide's two silhouettes (docs/ignore/aquarium.html)
// as data URIs, tinted per fish; flip bakes in a mirror so the fish swims
// left. CSS custom properties can't interpolate into url(), so each
// tint/direction combination is baked into its own URI.
const fishUri = (viewBox, body, flip) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'%3E${flip ? `%3Cg transform='translate(100 0) scale(-1 1)'%3E${body}%3C/g%3E` : body}%3C/svg%3E")`;
const fishA = (tint, flip) => fishUri('0 0 100 60', `%3Cpath d='M4 30 L22 14 L22 46 Z' fill='${tint}' opacity='0.85'/%3E%3Cellipse cx='60' cy='30' rx='36' ry='21' fill='${tint}'/%3E%3Cpath d='M50 12 L62 2 L68 16 Z' fill='${tint}' opacity='0.8'/%3E%3Cpath d='M50 48 L60 58 L66 44 Z' fill='${tint}' opacity='0.65'/%3E%3Ccircle cx='86' cy='24' r='3.2' fill='%230B2A38'/%3E`, flip);
const fishB = (tint, flip) => fishUri('0 0 100 80', `%3Cpath d='M6 40 L26 20 L26 60 Z' fill='${tint}' opacity='0.85'/%3E%3Cpath d='M30 40 C30 14 50 4 62 4 C72 4 82 20 88 40 C82 60 72 76 62 76 C50 76 30 66 30 40 Z' fill='${tint}'/%3E%3Ccircle cx='76' cy='30' r='3.4' fill='%230B2A38'/%3E`, flip);
const CORAL = '%23F2946B';
const GOLD = '%23E8C468';
const SEAFOAM = '%2382D6C3';

export const SKINS = [
  {
    id: 'default',
    name: 'Default',
    // Status labels read as numbered margin notes: "3. reached". The numeral
    // is a CSS counter, not the hidden .stop-num element. Colour is re-asserted
    // on the tinted compound selectors, which outrank .status on specificity.
    css: `
body { counter-reset: stopnum; }
.stop { counter-increment: stopnum; }
.status { font-weight: 400; font-size: 0.75rem; color: #777; }
.status.approached, .status.missed { color: #777; }
.status::before { content: counter(stopnum) ". "; }
`,
    icon: 'sky',
    trace: { planStroke: '#555555', traceStroke: '#7ab8ff', originFill: '#7ab8ff', stopFill: '#e8e8e8' },
    card: {
      bg: '#161616',
      fg: '#e8e8e8',
      accent: '#7ab8ff',
      font: "600 52px -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    },
  },

  {
    id: 'verdant',
    name: 'Verdant',
    css: `
body {
  background: #f4f1e4 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cpath d='M20 100 Q40 60 20 20 Q60 40 60 90 Q40 80 20 100 Z' fill='%23d7e3c3'/%3E%3Cpath d='M80 110 Q100 70 85 30 Q115 55 105 100 Q95 90 80 110 Z' fill='%23c3d6ae'/%3E%3C/svg%3E");
  color: #2d3a1f;
  font-family: Georgia, 'Times New Roman', serif;
}
h1, h2 { color: #3c531f; }
.seed { color: #5a7a2e; font-family: Georgia, serif; font-style: italic; }
.date, .summary { color: #6b7256; }
.summary b { color: #2d3a1f; }
.trace {
  background: #eef2df;
  border: 1px solid #b9c99a;
  border-radius: 4px;
}
.stop { border-bottom: 1px solid #b9c99a; }

.status.reached { background: #dfeccb; color: #3c531f; }
.status.approached { background: #efe6c3; color: #7a5a1e; }
.status.missed { background: #ecd9cb; color: #7a3a1e; }
.card-text { color: #38451f; }
.photo-frame { outline: 4px solid #eef2df; outline-offset: 2px; }
footer { color: #8a906e; }
`,
    icon: 'dark',
    trace: { planStroke: '#97a67b', traceStroke: '#5a7a2e', originFill: '#5a7a2e', stopFill: '#2d3a1f' },
    card: {
      bg: '#f4f1e4',
      fg: '#2d3a1f',
      accent: '#5a7a2e',
      font: "italic 600 52px Georgia, 'Times New Roman', serif",
    },
  },

  {
    id: 'neon',
    name: 'Neon',
    css: `
body {
  background: #0d0221;
  color: #e0d7ff;
  font-family: 'Courier New', ui-monospace, monospace;
}
h1, h2 {
  color: #00f5ff;
  text-shadow: 0 0 8px #00f5ff, 0 0 24px #00f5ff88;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}
.seed { color: #ff2bd6; text-shadow: 0 0 6px #ff2bd6; }
.date, .summary { color: #8f86b8; }
.summary b { color: #00f5ff; }
.trace {
  background: #150534;
  border: 1px solid #ff2bd6;
  box-shadow: 0 0 18px #ff2bd655, inset 0 0 18px #00f5ff22;
  border-radius: 0;
}
.stop { border-bottom: 1px dashed #3d2b6b; }

.status.reached { background: transparent; color: #39ff6a; border: 1px solid #39ff6a; }
.status.approached { background: transparent; color: #ffe74c; border: 1px solid #ffe74c; }
.status.missed { background: transparent; color: #ff3864; border: 1px solid #ff3864; }
.card-text { color: #e0d7ff; text-shadow: 0 0 4px #7a5cff55; }
.photo-frame { border: 2px solid #ff2bd6; box-shadow: 0 0 16px #ff2bd677; border-radius: 0; }
footer { color: #554a80; }
`,
    icon: 'sky',
    trace: { planStroke: '#5a4a8f', traceStroke: '#00f5ff', originFill: '#00f5ff', stopFill: '#e0d7ff' },
    card: {
      bg: '#0d0221',
      fg: '#00f5ff',
      accent: '#ff2bd6',
      font: "700 52px 'Courier New', ui-monospace, monospace",
    },
  },

  {
    id: 'oldskool',
    name: 'Old Skool',
    css: `
body {
  background: #efe6d0;
  color: #3b2f23;
  font-family: Georgia, 'Times New Roman', serif;
}
h1, h2 {
  font-variant: small-caps;
  letter-spacing: 0.08em;
  border-bottom: 3px double #8a7355;
  padding-bottom: 6px;
}
.seed { font-family: Georgia, serif; font-style: italic; color: #6b5233; }
.seed::before { content: "No. "; }
.date { font-style: italic; color: #7a6a50; }
.summary { color: #5d4c37; }
.summary b { color: #3b2f23; }
.trace {
  background: #f7f0dd;
  border: 1px solid #b3a284;
  outline: 1px solid #b3a284;
  outline-offset: 4px;
  border-radius: 0;
}
.stop { border-bottom: 1px dotted #a08b64; }
.status { font-style: italic; text-transform: none; letter-spacing: 0; background: transparent; padding: 0; }
/* The base skin's .status.* backgrounds win on specificity, so each variant
   must re-declare transparent here. */
.status.reached { background: transparent; color: #4a5d2a; }
.status.approached { background: transparent; color: #7a4a12; }
.status.missed { background: transparent; color: #8a2e1e; }
.card-text { font-size: 1.05rem; color: #46392a; }
.card-text::first-letter { font-size: 1.6em; font-weight: 700; color: #6b5233; }
.photo-frame { border: 1px solid #8a7355; padding: 6px; background: #f7f0dd; }
footer { font-style: italic; color: #93826a; }
footer::before { content: "~ "; }
footer::after { content: " ~"; }
`,
    icon: 'dark',
    trace: { planStroke: '#b3a284', traceStroke: '#6b5233', originFill: '#6b5233', stopFill: '#3b2f23' },
    card: {
      bg: '#efe6d0',
      fg: '#3b2f23',
      accent: '#8a7355',
      font: "600 52px Georgia, 'Times New Roman', serif",
    },
  },

  {
    id: 'eighties',
    name: '1980s',
    css: `
body {
  background: #000;
  color: #33ff33;
  font-family: 'Courier New', ui-monospace, monospace;
}
h1, h2 { color: #33ff33; text-transform: uppercase; }
h1::before, h2::before { content: "C:\\> "; color: #2aa02a; }
.seed { color: #33cc33; font-family: 'Courier New', monospace; }
.seed::before { content: "SEED="; }
.date::after { content: " _"; }
.date, .summary { color: #2ac52a; }
.summary b { color: #aaffaa; }
.trace {
  background: #020a02;
  border: 2px solid #33ff33;
  border-radius: 0;
  box-shadow: inset 0 0 40px #003300;
}
.stop { border-bottom: 1px solid #0f3d0f; }

.status { border-radius: 0; font-family: 'Courier New', monospace; }
.status.reached { background: #0f3d0f; color: #33ff33; }
.status.approached { background: #3d3d0f; color: #ffff33; }
.status.missed { background: #3d0f0f; color: #ff5555; }
.card-text { color: #33ff33; }
.photo-frame { border: 2px solid #33ff33; border-radius: 0; filter: contrast(1.1); }
footer { color: #1e7a1e; }
footer::before { content: "*** "; }
footer::after { content: " ***"; }
`,
    icon: 'light',
    trace: { planStroke: '#1e7a1e', traceStroke: '#33ff33', originFill: '#33ff33', stopFill: '#aaffaa' },
    card: {
      bg: '#000000',
      fg: '#33ff33',
      accent: '#33ff33',
      font: "700 52px 'Courier New', ui-monospace, monospace",
    },
  },

  {
    id: 'kitsch',
    name: 'Kitsch',
    css: `
body {
  background: #ffb3e6 repeating-linear-gradient(45deg, transparent, transparent 28px, #ff99dd44 28px, #ff99dd44 56px);
  color: #661166;
  font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive;
}
h1, h2 {
  color: #ff0066;
  text-shadow: 2px 2px 0 #ffff66, 4px 4px 0 #66ccff;
  transform: rotate(-2deg);
}
.seed { color: #cc00ff; font-weight: 700; }
.seed::before { content: "\\273F  "; }
.seed::after { content: "  \\273F"; }
.date, .summary { color: #9933aa; }
.summary b { color: #ff0066; }
.trace {
  background: #fffacd;
  border: 4px dashed #ff66cc;
  border-radius: 24px;
  box-shadow: 6px 6px 0 #66ccff;
}
.stop { border-bottom: 3px dotted #ff66cc; }

.status.reached { background: #ccff66; color: #336600; border-radius: 12px; }
.status.approached { background: #ffcc66; color: #7a3300; border-radius: 12px; }
.status.missed { background: #ff99aa; color: #7a0028; border-radius: 12px; }
.card-text { color: #771177; }
.photo-frame {
  border: 5px solid #ffcc00;
  outline: 3px dotted #ff66cc;
  border-radius: 20px;
  transform: rotate(1.5deg);
}
footer { color: #cc44cc; font-weight: 700; }
footer::before { content: "\\2665 "; color: #ff0066; }
footer::after { content: " \\2665"; color: #ff0066; }
`,
    icon: 'dark',
    trace: { planStroke: '#ff99dd', traceStroke: '#cc0066', originFill: '#cc0066', stopFill: '#661166' },
    card: {
      bg: '#ffb3e6',
      fg: '#661166',
      accent: '#ff0066',
      font: "700 52px 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive",
    },
  },

  {
    id: 'aquarium',
    name: 'Aquarium',
    // Deep-water teal palette from the design guide (docs/ignore/aquarium.html),
    // with the warm safelight coral kept as the accent thread. The tank comes
    // from two fixed full-viewport pseudo-layers - body::before carries light
    // rays and the fish (layered backgrounds, one gentle drift), body::after
    // is a tiling bubble field that rises - so the residents stay in the
    // viewport while the walk result scrolls beneath them, in-app and in the
    // export alike. All motion is gated on prefers-reduced-motion, and the
    // layers hide in print (fixed elements repeat on every printed page).
    css: `
body {
  background-color: #0B2A38;
  background-image: linear-gradient(180deg, #0E3242 0%, #113E4E 55%, #0C2E3B 100%);
  background-attachment: fixed;
  color: #C9DEDA;
  font-family: system-ui, -apple-system, sans-serif;
}
h1, h2 {
  font-family: Georgia, 'Times New Roman', serif;
  color: #EEF6F2;
}
h1 { font-style: italic; text-shadow: 0 2px 24px rgba(130, 214, 195, 0.25); }
a { color: #F2946B; }
.seed {
  font-family: ui-monospace, 'SF Mono', 'Courier New', monospace;
  color: #F2946B;
  letter-spacing: 0.08em;
}
.walk-voice { font-family: Georgia, serif; font-style: italic; color: #7FA3A0; }
.date, .summary { color: #7FA3A0; }
.summary b { color: #EEF6F2; }
.trace {
  background: linear-gradient(180deg, rgba(23, 67, 84, 0.55), rgba(12, 46, 59, 0.85));
  border: 1px solid rgba(233, 244, 240, 0.28);
  border-radius: 2px;
  box-shadow: inset 0 0 48px rgba(130, 214, 195, 0.08);
}
.stop { border-bottom: 1px solid rgba(233, 244, 240, 0.14); }

.stop-meta { display: none; }
.card-text { color: #C9DEDA; }
.card-hex .glyph { color: #82D6C3; text-shadow: 0 0 14px rgba(130, 214, 195, 0.45); }
.card-hex .hex-title { font-family: Georgia, serif; color: #EEF6F2; }
.photo-frame { border: 1px solid rgba(233, 244, 240, 0.28); border-radius: 2px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35); }
footer {
  font-family: ui-monospace, 'SF Mono', 'Courier New', monospace;
  color: #7FA3A0;
}

/* The tank. A skin cannot add the guide's fish-lane divs, so each resident
   is a fixed pseudo-element of the shared markup vocabulary instead:
   body::before carries the light rays, nine fish ride the pseudos of
   body/h1/.seed/.date/.summary, and bubble columns rise from
   .trace/footer/.walk-voice. Every lane below copies the guide's table
   exactly - top, left, duration, delay, bob, size, tint and direction -
   and the keyframes are the guide's verbatim, so the motion matches the
   guide fish for fish. All layers are click-through and fixed, so the
   residents stay in the viewport while the walk result scrolls. */

body::before {
  content: "";
  position: fixed;
  inset: -10% -10%;
  pointer-events: none;
  z-index: 60;
  background: repeating-linear-gradient(100deg, rgba(238, 246, 242, 0.05) 0px, rgba(238, 246, 242, 0.05) 30px, transparent 30px, transparent 130px);
  opacity: 0.6;
}

body::after, h1::before, h1::after, .seed::before, .seed::after, .date::before, .date::after, .summary::before, .summary::after {
  content: "";
  position: fixed;
  pointer-events: none;
  z-index: 60;
  background-repeat: no-repeat;
}
/* Heights carry 9px of slack under the fish for the bob. */
body::after { top: 6%; left: 12%; width: 52px; height: 40px; background-image: ${fishA(CORAL)}; background-size: 52px auto; }
h1::before { top: 16%; left: 70%; width: 40px; height: 33px; background-image: ${fishA(GOLD, true)}; background-size: 40px auto; }
h1::after { top: 28%; left: 35%; width: 64px; height: 60px; background-image: ${fishB(SEAFOAM)}; background-size: 64px auto; }
.seed::before { top: 40%; left: 18%; width: 46px; height: 37px; background-image: ${fishA(CORAL, true)}; background-size: 46px auto; }
.seed::after { top: 52%; left: 78%; width: 38px; height: 32px; background-image: ${fishA(GOLD)}; background-size: 38px auto; }
.date::before { top: 63%; left: 45%; width: 58px; height: 55px; background-image: ${fishB(SEAFOAM, true)}; background-size: 58px auto; }
.date::after { top: 74%; left: 24%; width: 48px; height: 38px; background-image: ${fishA(CORAL)}; background-size: 48px auto; }
.summary::before { top: 85%; left: 60%; width: 42px; height: 34px; background-image: ${fishA(GOLD, true)}; background-size: 42px auto; }
.summary::after { top: 93%; left: 10%; width: 36px; height: 31px; background-image: ${fishA(SEAFOAM)}; background-size: 36px auto; }

/* Bubble columns. Each pseudo carries one bubble; box-shadow companions
   ride along as vent-mates in neighbouring columns. footer and .walk-voice
   are not in every render of the result markup - the columns on .trace
   are always present, the rest are graceful enrichment. */
.trace::before, .trace::after, footer::before, footer::after, .walk-voice::before, .walk-voice::after {
  content: "";
  position: fixed;
  bottom: -24px;
  border-radius: 50%;
  background: rgba(238, 246, 242, 0.4);
  border: 1px solid rgba(238, 246, 242, 0.18);
  pointer-events: none;
  z-index: 60;
}
.trace::before { left: 6%; width: 5px; height: 5px; box-shadow: 13vw -38px 0 -1px rgba(238, 246, 242, 0.22), 24vw 12px 0 0.5px rgba(238, 246, 242, 0.28); }
.trace::after { left: 27%; width: 4px; height: 4px; box-shadow: 11vw -44px 0 1px rgba(238, 246, 242, 0.25), 21vw 8px 0 -1px rgba(238, 246, 242, 0.2); }
footer::before { left: 59%; width: 8px; height: 8px; box-shadow: 10vw -34px 0 -2px rgba(238, 246, 242, 0.25), 19vw 16px 0 -1px rgba(238, 246, 242, 0.2); }
footer::after { left: 88%; width: 5px; height: 5px; box-shadow: -7vw -40px 0 1px rgba(238, 246, 242, 0.22), -15vw 10px 0 -1px rgba(238, 246, 242, 0.25); }
.walk-voice::before { left: 38%; width: 6px; height: 6px; box-shadow: 12vw -30px 0 -1.5px rgba(238, 246, 242, 0.22), 23vw 18px 0 0.5px rgba(238, 246, 242, 0.28); }
.walk-voice::after { left: 79%; width: 6px; height: 6px; box-shadow: -8vw -46px 0 -1px rgba(238, 246, 242, 0.25), 14vw 6px 0 -2px rgba(238, 246, 242, 0.2); }

/* The guide's four keyframes, verbatim. */
@keyframes aqua-rays {
  from { background-position-x: 0; }
  to { background-position-x: 400px; }
}
@keyframes aqua-drift {
  0% { transform: translateX(-16vw); }
  50% { transform: translateX(16vw); }
  100% { transform: translateX(-16vw); }
}
@keyframes aqua-bob {
  0%, 100% { background-position-y: 0px; }
  50% { background-position-y: 9px; }
}
@keyframes aqua-rise {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  12% { opacity: 0.55; }
  88% { opacity: 0.3; }
  100% { transform: translateY(-120vh) translateX(14px); opacity: 0; }
}

/* Motion off by default, enabled only when the user allows it - as in
   the guide. Durations and delays are the guide's lane table. */
@media (prefers-reduced-motion: no-preference) {
  body::before { animation: aqua-rays 22s linear infinite; }
  body::after { animation: aqua-drift 24s ease-in-out -2s infinite, aqua-bob 3.8s ease-in-out -1s infinite; }
  h1::before { animation: aqua-drift 19s ease-in-out -9s infinite, aqua-bob 4.4s ease-in-out -2.6s infinite; }
  h1::after { animation: aqua-drift 27s ease-in-out -5s infinite, aqua-bob 3.2s ease-in-out -0.4s infinite; }
  .seed::before { animation: aqua-drift 21s ease-in-out -3s infinite, aqua-bob 4s ease-in-out -3.1s infinite; }
  .seed::after { animation: aqua-drift 23s ease-in-out -11s infinite, aqua-bob 3.6s ease-in-out -1.8s infinite; }
  .date::before { animation: aqua-drift 29s ease-in-out -6s infinite, aqua-bob 4.6s ease-in-out -2.2s infinite; }
  .date::after { animation: aqua-drift 25s ease-in-out -14s infinite, aqua-bob 3.4s ease-in-out -4s infinite; }
  .summary::before { animation: aqua-drift 20s ease-in-out -8s infinite, aqua-bob 4.2s ease-in-out -1.2s infinite; }
  .summary::after { animation: aqua-drift 22s ease-in-out -16s infinite, aqua-bob 3.9s ease-in-out -2.8s infinite; }
  .trace::before { animation: aqua-rise 9s linear -1s infinite; }
  .trace::after { animation: aqua-rise 8s linear -3.5s infinite; }
  footer::before { animation: aqua-rise 13s linear -5s infinite; }
  footer::after { animation: aqua-rise 9s linear -7s infinite; }
  .walk-voice::before { animation: aqua-rise 11s linear -8s infinite; }
  .walk-voice::after { animation: aqua-rise 10.5s linear -4s infinite; }
}

/* Fixed layers would repeat on every printed page. */
@media print {
  body::before, body::after, h1::before, h1::after, .seed::before, .seed::after, .date::before, .date::after, .summary::before, .summary::after, .trace::before, .trace::after, footer::before, footer::after, .walk-voice::before, .walk-voice::after { display: none; }
}
`,
    icon: 'light',
    trace: { planStroke: '#2F6B52', traceStroke: '#F2946B', originFill: '#E8C468', stopFill: '#EEF6F2' },
    card: {
      bg: '#0B2A38',
      fg: '#EEF6F2',
      accent: '#F2946B',
      font: "italic 600 52px Georgia, 'Times New Roman', serif",
    },
  },

  {
    id: 'minimalist1',
    name: 'Minimalist 1',
    // A light, restrained skin: no borders, no shadows, no patterns. The
    // typography carries the whole design — serif headings for gravitas,
    // system sans for legible body text, generous line-height for reading.
    // A single soft terracotta accent threads through seed, stop numbers
    // and the trace. Separation is by whitespace alone, not decoration.
    css: `
body {
  background: #f7f8f9;
  color: #2c2c2c;
  font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  line-height: 1.7;
}
h1, h2 {
  font-family: Georgia, 'Times New Roman', serif;
  color: #3a3a3a;
  font-weight: 400;
  letter-spacing: -0.01em;
}
h1 { font-size: 1.5rem; }
h2 { font-size: 1.2rem; }
.seed {
  font-family: ui-monospace, 'SF Mono', 'Courier New', monospace;
  color: #b56b50;
  letter-spacing: 0.05em;
}
.walk-voice {
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
  color: #7a7a7a;
}
.date {
  color: #7a7a7a;
  letter-spacing: 0.02em;
  margin-bottom: 20px;
}
.summary { color: #7a7a7a; }
.summary b { color: #2c2c2c; }
.trace {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 8px 16px 24px;
}
.stop {
  border: none;
  padding-bottom: 28px;
  margin-bottom: 28px;
  display: block;
}
.card-text { color: #2c2c2c; font-size: 1.1rem; line-height: 1.7; }
.card-hex .glyph { color: #3a3a3a; font-family: Georgia, serif; }
.card-hex .hex-title { font-family: Georgia, serif; font-weight: 700; color: #3a3a3a; }
.photo-frame { border: none; outline: none; box-shadow: none; border-radius: 8px; }
footer { color: #9a9a9a; font-size: 0.8rem; }
`,
    icon: 'dark',
    trace: { planStroke: '#c8c8c8', traceStroke: '#b56b50', originFill: '#b56b50', stopFill: '#2c2c2c' },
    card: {
      bg: '#f7f8f9',
      fg: '#2c2c2c',
      accent: '#b56b50',
      font: "400 52px Georgia, 'Times New Roman', serif",
    },
  },

  {
    id: 'chapters',
    name: 'Chapters',
    // Family A1: title screen, trace screen, then one full-viewport screen
    // per waypoint, then the footer. Mandatory snap, aspect-fitted photos,
    // a large faded chapter numeral via the .stop-num hook, tap-to-enlarge
    // photos via the .zoom-open/.zoom-shut hook, and the trace draws as
    // its screen lands. Requires the <header> hook; both emitters provide
    // it.
    css: `
:root {
  --bg: #1e231e; --surface: #1e1e1a; --fg: #eceae2; --fg-dim: #8f8c80;
  --accent: #d9a45b; --rule: rgba(236, 234, 226, 0.14);
  --body-font: system-ui, -apple-system, sans-serif;
  --heading-font: Georgia, 'Times New Roman', serif;
}

/* The body is the scroll port: height 100% + own scroll, so children sized
   in % fill one viewport each. In-app body maps to #detail-content, which
   is already the scroller — the same rules just work there. html overflow
   hidden makes body a real scroll container in the export: iOS Safari
   does not snap the document scroller. Dead selector in-app (html scopes
   to #detail-content html, which matches nothing). */
html { height: 100%; overflow: hidden; }
body {
  margin: 0; padding: 0; max-width: none;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: none;
  scroll-snap-type: y mandatory;
}

/* Every top-level block can snap; the real screens take the full port.
   No margins between snap areas — they are dead space the port can rest
   in (and have defeated mandatory snap in the field). Spacing lives in
   padding. Class selectors are needed: body > * loses to BASE margins. */
body > * { scroll-snap-align: start; }
body > header, body > .trace, body > .stop, body > .myvoice-tail, body > footer { margin: 0; }
header, .trace, .stop, .myvoice-tail {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 32px 24px;
}

/* Title slide: centred, quiet. */
header { align-items: center; text-align: center; }
header h1 { font-family: var(--heading-font); font-weight: 400; font-size: 2.2rem; }
header .summary { margin-bottom: 0; }

/* Trace slide: diagram centred on the field. */
.trace { align-items: center; background: none; padding-top: 0; padding-bottom: 0; }
.trace svg { max-height: 72svh; }

/* The trace draws itself — but only as its screen lands, so the animation
   isn't spent before the viewer reaches it. view() ties progress to
   visibility in the scroll port; the range runs over the last stretch of
   entry so the draw completes exactly as the slide snaps into place (a
   range ending past the rest position would leave it half-drawn).
   Progressive enhancement: without support the animation plays on load
   as it always has — in-app an IntersectionObserver replays it on entry. */
@supports (animation-timeline: view()) {
  .trace svg .tr-line, .trace svg .tr-dot {
    animation-timeline: view();
    animation-range: entry 60% entry 100%;
  }
}

/* A chapter. The stop column stays readable; the numeral looms behind. */
.stop { border-bottom: none; margin-bottom: 0; }
.stop-body { width: 100%; max-width: 620px; margin: 0 auto; }
.stop-num {
  display: block;
  font-family: var(--heading-font);
  font-size: 4.5rem; line-height: 1;
  color: rgba(217, 164, 91, 0.35);
  margin-bottom: 0.4rem;
}
.card-hex .hex-title { font-size: 1.5rem; font-weight: 400; }
.card-haiku { font-size: 1.05rem; }

/* Status labels read as small grey margin notes (same as Default). Colour
   re-asserted on the tinted compound selectors, which outrank .status. */
.status { font-weight: 400; font-size: 0.75rem; color: #777; }
.status.approached, .status.missed { color: #777; }

/* The frame hugs the photo: width = min(column, height cap × ar), and the
   emitted --ar sets the box's ratio, so portrait and landscape plates are
   exactly image-sized — no letterbox slack. */
.photo-frame {
  position: relative;
  aspect-ratio: var(--ar, 4 / 3);
  width: min(100%, calc(52svh * var(--ar, 1.3333)));
  margin: 16px auto 0;
  border-radius: 0;
  background: var(--surface);
  border: 1px solid var(--rule);
}
.photo-frame > * { display: block; width: 100%; height: 100%; object-fit: contain; }

/* Tap the photo to enlarge: the .zoom-open radio covers the frame; once
   checked, the frame pins to the viewport (in-app: the detail frame, via
   #detail-content's transform) and .zoom-shut becomes the tap-to-close
   surface. Same-named radios — only one photo can be enlarged at a time. */
.zoom-open {
  display: block;
  appearance: none;
  position: absolute; inset: 0;
  width: auto; height: auto;
  margin: 0; padding: 0;
  opacity: 0;
  cursor: zoom-in;
  z-index: 2;
}
.photo-frame:has(> .zoom-open:checked) {
  position: fixed; inset: 0; z-index: 30;
  width: auto; aspect-ratio: auto;
  margin: 0;
  border: 0; border-radius: 0;
  background: rgba(8, 9, 8, 0.94);
}
.photo-frame:has(> .zoom-open:checked) > .zoom-open { display: none; }
.photo-frame:has(> .zoom-open:checked) > .zoom-shut {
  display: block;
  appearance: none;
  position: fixed; inset: 0;
  width: auto; height: auto;
  margin: 0; padding: 0;
  opacity: 0;
  cursor: zoom-out;
}

footer { padding: 40px 24px; scroll-snap-align: end; }

/* Print must not inherit the scroll port: an overflowed body clips the
   export to a single page. Flatten to the plain sequential page and let
   the shared print reset do the rest. */
@media print {
  html, body { height: auto; }
  html { overflow: visible; }
  body { overflow: visible; scroll-snap-type: none; }
  header, .trace, .stop, .myvoice-tail { min-height: 0; display: block; padding: 0; }
  .stop-num { font-size: 1.4rem; }
  .photo-frame { height: auto; }
  .photo-frame > * { height: auto; }
}
`,
    icon: 'light',
    trace: { planStroke: '#4a463c', traceStroke: '#d9a45b', originFill: '#d9a45b', stopFill: '#eceae2' },
    card: { bg: '#1e231e', fg: '#eceae2', accent: '#d9a45b', font: "400 52px Georgia, 'Times New Roman', serif" },
  },

  {
    id: 'carousel',
    name: 'Carousel',
    // Family B1: horizontal swipe — title slide, trace slide, one slide per
    // waypoint, then the footer. Mandatory x-snap with centred 92% slides
    // so neighbours peek as the affordance. Aspect-fitted photos, large
    // faded waypoint numeral via .stop-num, tap-to-enlarge via the
    // .zoom-open/.zoom-shut hook, trace draws as its slide lands.
    // Requires the <header> hook.
    // No dot-nav: anchor targets would need emitting per stop — deferred.
    css: `
:root {
  --bg: #e9e6df; --surface: #f4f1ea; --fg: #201d18; --fg-dim: #6f6a5f;
  --accent: #2f6a4f; --rule: rgba(32, 29, 24, 0.18);
  --body-font: system-ui, -apple-system, sans-serif;
  --heading-font: Georgia, 'Times New Roman', serif;
}

/* The body is the horizontal scroll port (in-app: #detail-content, already
   the scroller). Children are 92%-wide snap-centred slides. overflow-y must
   stay scrollable (auto), not hidden: iOS Safari ignores scroll-snap-type
   when the cross axis is hidden. html overflow hidden makes body a real
   scroll container in the export (iOS does not snap the document
   scroller); it scopes to a dead selector in-app. */
html { height: 100%; overflow: hidden; }
body {
  margin: 0; padding: 0; max-width: none;
  height: 100%;
  display: flex;
  overflow-x: auto; overflow-y: auto;
  overscroll-behavior: none;
  scroll-snap-type: x mandatory;
}
body > * {
  flex: 0 0 92%;
  height: 100%;
  scroll-snap-align: center;
  display: flex; flex-direction: column;
  /* plain center overflows upward on tall slides — the top becomes
     unreachable; safe center degrades to start instead of clipping */
  justify-content: safe center;
  padding: 24px;
  overflow-y: auto;   /* a slide taller than the port scrolls inside itself */
}
/* Margins between snap areas are dead scrollable space (the BASE .trace
   margin produced a phantom vertical scroll). Class selectors — body > *
   loses to BASE's class rules. */
body > .trace, body > .stop, body > .myvoice-tail, body > footer, body > header { margin: 0; }

/* Title slide: centred, with the swipe hint as the affordance. */
header { align-items: center; text-align: center; }
header h1 { font-family: var(--heading-font); font-weight: 400; font-size: 2.2rem; }
header .summary { margin-bottom: 0; }
header::after {
  content: "swipe →";
  margin-top: 3rem;
  font-size: 0.75rem; letter-spacing: 0.3em; text-transform: uppercase;
  color: var(--fg-dim);
}

/* Trace slide. */
.trace { align-items: center; background: none; padding-top: 0; padding-bottom: 0; }
.trace svg { max-height: 70vh; margin: 0 auto; }

/* The trace draws as its slide lands, not at load: view() ties progress
   to visibility, ranged over the last stretch of entry so the draw
   completes as the slide snaps centered. Without support it plays on
   load; in-app an IntersectionObserver replays it on entry instead. */
@supports (animation-timeline: view()) {
  .trace svg .tr-line, .trace svg .tr-dot {
    animation-timeline: view();
    animation-range: entry 60% entry 100%;
  }
}

/* A slide per waypoint. The text column stays narrow; the numeral looms. */
.stop { border-bottom: none; margin-bottom: 0; }
.stop-body { width: 100%; max-width: 520px; margin: 0 auto; }
.stop-num {
  display: block;
  font-family: var(--heading-font);
  font-size: 4.5rem; line-height: 1;
  color: rgba(47, 106, 79, 0.28);
  margin-bottom: 0.4rem;
}
.card-hex .hex-title { font-size: 1.5rem; font-weight: 400; }
.card-haiku { font-size: 1.05rem; }

/* Status labels read as small grey margin notes (same as Default). */
.status { font-weight: 400; font-size: 0.75rem; color: #777; }
.status.approached, .status.missed { color: #777; }

/* The frame hugs the photo: emitted --ar sets the box ratio and the width
   caps at the viewport's height budget — portrait boxes narrow instead of
   letterboxing, landscape fills the column. */
.photo-frame {
  position: relative;
  aspect-ratio: var(--ar, 4 / 3);
  width: min(100%, calc(46svh * var(--ar, 1.3333)));
  margin: 16px auto 0;
  border-radius: 2px;
  background: var(--surface);
  border: 1px solid var(--rule);
}
.photo-frame > * { display: block; width: 100%; height: 100%; object-fit: contain; }

/* Tap the photo to enlarge: the .zoom-open radio covers the frame; once
   checked, the frame pins to the viewport (in-app: the detail frame, via
   #detail-content's transform) and .zoom-shut becomes the tap-to-close
   surface. Same-named radios — only one photo can be enlarged at a time. */
.zoom-open {
  display: block;
  appearance: none;
  position: absolute; inset: 0;
  width: auto; height: auto;
  margin: 0; padding: 0;
  opacity: 0;
  cursor: zoom-in;
  z-index: 2;
}
.photo-frame:has(> .zoom-open:checked) {
  position: fixed; inset: 0; z-index: 30;
  width: auto; aspect-ratio: auto;
  margin: 0;
  border: 0; border-radius: 0;
  background: rgba(24, 22, 18, 0.94);
}
.photo-frame:has(> .zoom-open:checked) > .zoom-open { display: none; }
.photo-frame:has(> .zoom-open:checked) > .zoom-shut {
  display: block;
  appearance: none;
  position: fixed; inset: 0;
  width: auto; height: auto;
  margin: 0; padding: 0;
  opacity: 0;
  cursor: zoom-out;
}

footer { align-items: center; }

/* Flatten to a plain sequential page on paper: a horizontal scroll port
   would clip everything right of slide one otherwise. */
@media print {
  html, body { height: auto; }
  html { overflow: visible; }
  body { display: block; overflow: visible; scroll-snap-type: none; }
  body > * { flex: none; height: auto; padding: 0; overflow: visible; }
  header::after { content: none; }
  .stop-num { font-size: 1.4rem; }
  .photo-frame { height: auto; }
  .photo-frame > * { height: auto; }
}
`,
    icon: 'dark',
    trace: { planStroke: '#a8a094', traceStroke: '#2f6a4f', originFill: '#2f6a4f', stopFill: '#201d18' },
    card: { bg: '#e9e6df', fg: '#201d18', accent: '#2f6a4f', font: "400 52px Georgia, 'Times New Roman', serif" },
  },

  {
    id: 'contactsheet',
    name: 'Contact Sheet',
    // Family D1: a dark proof sheet — numbered frames in a grid, number +
    // image only at each frame's own aspect. Tap opens a viewport-filling
    // lightbox (photo large, caption alongside) via the .stop-open radio
    // hook; .stop-shut is the close surface, and the shared radio name
    // keeps it single-open. In-app the inputs stay display:none and JS
    // flips .checked on short tap, so the long-press photo-selection
    // gesture keeps working on grid and lightbox photos alike — and
    // #detail-content's transform pins the lightbox to the preview frame
    // instead of covering the whole screen.
    css: `
:root {
  --bg: #17140f; --surface: #231e16; --fg: #e8e2d4; --fg-dim: #8d8574;
  --accent: #d9b36a; --rule: rgba(232, 226, 212, 0.16);
  --body-font: system-ui, -apple-system, sans-serif;
  --heading-font: Georgia, 'Times New Roman', serif;
  --mono-font: ui-monospace, 'SF Mono', 'Courier New', monospace;
}

/* The page is the grid: header strip and trace take the full width,
   each waypoint is a cell, footer closes the sheet. */
body {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: none;
  padding: 14px;
}
@media (min-width: 720px) {
  body { grid-template-columns: repeat(3, 1fr); gap: 18px; padding: 24px; }
}
header, .trace, .myvoice-tail, footer { grid-column: 1 / -1; }
header { padding-bottom: 10px; border-bottom: 1px solid var(--rule); }
header .summary { margin-bottom: 0; }
.trace { background: var(--surface); border: 1px solid var(--rule); }
.myvoice-tail { margin-top: 0; }

/* A proof frame: plate, frame number above the photo. Photos keep their
   own aspect — landscape and portrait both sit whole in the sheet. */
body { align-items: start; }
.stop {
  border: 1px solid var(--rule);
  background: var(--surface);
  padding: 10px;
  margin-bottom: 0;
}
.stop-num {
  display: block;
  font-family: var(--mono-font);
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  color: var(--accent);
  margin-bottom: 8px;
}
.stop-body { display: flex; flex-direction: column; }
.photo-frame { order: -1; }

.photo-frame {
  margin: 0;
  border-radius: 0;
  border: 1px solid var(--rule);
  background: #0d0b08;
}
.photo-frame > * { display: block; width: 100%; height: auto; }

/* The caption under the frame. */
.stop-meta { margin-bottom: 6px; }
.status { font-weight: 400; font-size: 0.75rem; color: #777; }
.status.approached, .status.missed { color: #777; }
.card-hex { align-items: baseline; gap: 10px; }
.card-hex .glyph { font-size: 1.9rem; }
.card-hex .hex-title { font-size: 0.95rem; }
.card-text { font-size: 0.9rem; line-height: 1.5; color: var(--fg-dim); }
.card-haiku { margin-top: 4px; }

footer { margin-top: 8px; }

/* Tap-to-expand: a hidden radio per stop is the tap surface in the export
   (script-free, so the input IS the interaction); in-app the inputs stay
   display:none and JS flips .checked. .stop-open and .stop-shut share a
   name, so only one card can be open — checking either clears the rest.
   Unchecked frames show number + photo only; checked frames become a
   viewport lightbox. */
.stop { position: relative; }
.stop-open {
  appearance: none;
  display: block;   /* BASE_CSS hides the hook; this skin uses it */
  position: absolute; inset: 0;
  margin: 0; padding: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 5;
}
.stop-open:focus-visible { opacity: 1; outline: 2px solid var(--accent); }

@media screen {
  /* Collapsed frames show number + image only. */
  .stop:not(:has(.stop-open:checked)) .stop-meta,
  .stop:not(:has(.stop-open:checked)) .card-hex,
  .stop:not(:has(.stop-open:checked)) .card-text {
    position: absolute;
    visibility: hidden;
  }

  /* Expanded: the card becomes a viewport-filling lightbox — photo large,
     caption alongside. The open radio stops intercepting and .stop-shut
     takes over as a full-viewport surface, so a tap anywhere checks it —
     which unchecks .stop-open and closes the card. In-app position:fixed
     pins to the detail frame instead (its transform is the containing
     block), so the controls below stay reachable. */
  .stop:has(.stop-open:checked) .stop-open { display: none; }
  .stop:has(.stop-open:checked) .stop-shut {
    display: block;
    appearance: none;
    position: fixed; inset: 0;
    margin: 0; padding: 0;
    opacity: 0;
    cursor: pointer;
    z-index: 40;
  }
  .stop:has(.stop-open:checked) {
    position: fixed; inset: 0; z-index: 20;
    background: rgba(13, 11, 8, 0.97);
    padding: 20px;
    overflow-y: auto;
  }
  .stop:has(.stop-open:checked)::after {
    content: "tap to close";
    position: absolute; top: 16px; right: 20px;
    font-family: var(--mono-font); font-size: 0.7rem;
    letter-spacing: 0.15em; color: var(--fg-dim);
  }
  .stop:has(.stop-open:checked) .stop-body {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(200px, 2fr);
    gap: 10px 20px;
    align-items: center;
    max-width: 1000px;
    margin: 4vh auto;
  }
  .stop:has(.stop-open:checked) .photo-frame { grid-column: 1; grid-row: 1 / 6; margin: 0; }
  .stop:has(.stop-open:checked) .photo-frame > * { max-height: 76vh; object-fit: contain; }
  .stop:has(.stop-open:checked) .stop-meta,
  .stop:has(.stop-open:checked) .card-hex,
  .stop:has(.stop-open:checked) .card-text { grid-column: 2; }

  /* My Voice overflow belongs to the final card: hidden in the sheet,
     appended inside the last card's lightbox when it opens. The tail is a
     sibling after the last .stop, so :has(+ .myvoice-tail) identifies the
     final card. pointer-events: none lets taps fall through to close. */
  .myvoice-tail { display: none; }
  .stop:has(+ .myvoice-tail):has(.stop-open:checked) ~ .myvoice-tail {
    display: block;
    position: fixed; z-index: 21;
    right: calc(20px + max(0px, (100vw - 1040px) / 2));
    bottom: 20px;
    width: min(38%, 380px);
    pointer-events: none;
    font-size: 0.85rem;
    font-style: italic;
    color: var(--fg-dim);
  }
}

/* Narrow ports stack: photo on top, caption under. */
@media screen and (max-width: 640px) {
  .stop:has(.stop-open:checked) .stop-body { grid-template-columns: 1fr; }
  .stop:has(.stop-open:checked) .photo-frame { grid-column: 1; grid-row: auto; }
  .stop:has(.stop-open:checked) .stop-meta,
  .stop:has(.stop-open:checked) .card-hex,
  .stop:has(.stop-open:checked) .card-text { grid-column: 1; }
  .stop:has(+ .myvoice-tail):has(.stop-open:checked) ~ .myvoice-tail {
    left: 20px; right: 20px; width: auto;
  }
}

/* Print: flatten the grid into the plain sequential page — everything
   visible, no tap state. */
@media print {
  body { display: block; padding: 0; }
  header, .stop { border: none; padding: 0; }
  .stop-open, .stop-shut { display: none; }
  .photo-frame { aspect-ratio: auto; border: none; }
  .photo-frame > * { height: auto; }
}
`,
    icon: 'light',
    trace: { planStroke: '#4f4636', traceStroke: '#d9b36a', originFill: '#d9b36a', stopFill: '#e8e2d4' },
    card: { bg: '#17140f', fg: '#e8e2d4', accent: '#d9b36a', font: "400 52px ui-monospace, 'SF Mono', monospace" },
  },
];

/** Find a skin by id, falling back to the default. */
export function getSkin(id) {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

/**
 * Prefix every selector in a CSS fragment with a scope, so a skin written
 * for the standalone export can be injected into the app without leaking.
 * `body` and `:root` map onto the scope itself (the latter so custom
 * properties stay defined), as do body's pseudo-elements (`body::before`
 * scopes to `#scope::before`, which keeps viewport-fixed overlays working
 * in-app). @media/@supports blocks keep their prelude and have their inner
 * rules scoped; other @-rules (e.g. @keyframes) pass through untouched.
 * The parser is a brace matcher - keep braces out of comments.
 */
export function scopeCSS(css, scope) {
  // Strip comments: they would otherwise ride along inside a selector
  // prelude and defeat the exact-match mapping for body/:root selectors.
  // (Strings containing comment delimiters are likewise unsupported.)
  return scopeBlock(css.replace(/\/\*[\s\S]*?\*\//g, ''), scope);
}

function scopeBlock(css, scope) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) return out + css.slice(i);
    const prelude = css.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    if (depth > 0 || !prelude) return out + css.slice(i);
    const inner = css.slice(open + 1, j - 1);
    if (/^@(media|supports)\b/.test(prelude)) {
      out += `${prelude} { ${scopeBlock(inner, scope)} }`;
    } else if (prelude.startsWith('@')) {
      out += `${prelude} { ${inner} }`;
    } else {
      out += `${scopeSelectors(prelude, scope)} { ${inner} }`;
    }
    i = j;
  }
  return out;
}

function scopeSelectors(selectors, scope) {
  return selectors.split(',').map((raw) => {
    const s = raw.trim();
    if (!s) return s;
    if (s === 'body' || s === ':root') return scope;
    if (s.startsWith('body ')) return `${scope} ${s.slice(5)}`;
    if (s.startsWith('body:')) return `${scope}${s.slice(4)}`;
    return `${scope} ${s}`;
  }).join(', ');
}
