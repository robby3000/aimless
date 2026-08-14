// Walk Result skins. Each skin is a CSS fragment written against the shared
// walk-result markup vocabulary (body, h1/h2, .seed, .walk-voice, .date,
// .summary, .trace, .stop, .stop-num, .status, .card-text, img, footer; The
// Inner voice adds an optional .card-hex > .glyph + .hex-title block before
// .card-text, which gains .card-haiku containing one .haiku-line per line).
// The same fragment skins the in-app detail view (scoped to #detail-content
// via scopeCSS) and the self-contained HTML export (embedded as-is). CSS
// only - exports must never contain scripts.
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
:root { --bg: #0a0a0a; --surface: #161616; --fg: #e8e8e8; --fg-dim: #888; --accent: #7ab8ff; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: var(--bg); color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  line-height: 1.6; padding: 24px; max-width: 640px; margin: 0 auto;
}
h1 { font-size: 1.4rem; margin-bottom: 4px; }
h1 a { color: inherit; text-decoration: none; }
.seed { font-family: monospace; color: var(--accent); font-size: 0.9rem; }
.walk-voice { font-size: 0.9rem; color: inherit; opacity: 0.85; margin-top: 2px; }
.date { color: var(--fg-dim); font-size: 0.9rem; margin-bottom: 16px; }
.summary { color: var(--fg-dim); font-size: 0.9rem; margin-bottom: 24px; }
.summary b { color: var(--fg); }
.trace { background: var(--surface); border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center; }
.trace svg { max-width: 100%; height: auto; }
.stop {
  display: flex; gap: 12px; margin-bottom: 20px;
  border-bottom: 1px solid #222; padding-bottom: 16px;
}
.stop-num {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--accent); color: #0a0a0a;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.9rem; flex-shrink: 0;
}
.stop-body { flex: 1; }
.stop-meta { margin-bottom: 8px; }
.status { font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
.status.reached { background: #2a4a2a; color: #8c8; }
.status.approached { background: #4a3a2a; color: #fc8; }
.status.missed { background: #4a2a2a; color: #e0a3a3; }
.card-text { font-size: 1.1rem; line-height: 1.6; }
/* The Inner voice: a large hexagram glyph beside its title, then the haiku
   below a faint rule. No colour is set so every skin's palette flows through. */
.card-hex { display: flex; align-items: center; gap: 14px; }
.card-hex .glyph { font-size: 3rem; line-height: 1; flex-shrink: 0; }
.card-hex .hex-title { font-size: 1.15rem; font-weight: 700; line-height: 1.3; }
.card-haiku {
  margin-top: 12px; padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, currentColor 22%, transparent);
}
.haiku-line { display: block; overflow-wrap: break-word; }
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
.stop-num { background: #333; color: white; }
.status.reached { background: #d4e8d4; color: #264; }
.status.approached { background: #f0e4d4; color: #642; }
.status.missed { background: #f0d4d4; color: #622; }
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
    css: '',
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
.stop-num { background: #5a7a2e; color: #f4f1e4; border-radius: 50% 0 50% 50%; }
.status.reached { background: #dfeccb; color: #3c531f; }
.status.approached { background: #efe6c3; color: #7a5a1e; }
.status.missed { background: #ecd9cb; color: #7a3a1e; }
.card-text { color: #38451f; }
img { outline: 4px solid #eef2df; outline-offset: 2px; }
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
.stop-num {
  background: transparent; color: #00f5ff;
  border: 2px solid #00f5ff; border-radius: 0;
  text-shadow: 0 0 6px #00f5ff;
  box-shadow: 0 0 10px #00f5ff66;
}
.status.reached { background: transparent; color: #39ff6a; border: 1px solid #39ff6a; }
.status.approached { background: transparent; color: #ffe74c; border: 1px solid #ffe74c; }
.status.missed { background: transparent; color: #ff3864; border: 1px solid #ff3864; }
.card-text { color: #e0d7ff; text-shadow: 0 0 4px #7a5cff55; }
img { border: 2px solid #ff2bd6; box-shadow: 0 0 16px #ff2bd677; border-radius: 0; }
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
.stop-num {
  background: transparent; color: #6b5233;
  border: 1.5px solid #6b5233; border-radius: 50%;
  font-family: Georgia, serif;
}
.status { font-style: italic; text-transform: none; letter-spacing: 0; background: transparent; padding: 0; }
/* The base skin's .status.* backgrounds win on specificity, so each variant
   must re-declare transparent here. */
.status.reached { background: transparent; color: #4a5d2a; }
.status.approached { background: transparent; color: #7a4a12; }
.status.missed { background: transparent; color: #8a2e1e; }
.card-text { font-size: 1.05rem; color: #46392a; }
.card-text::first-letter { font-size: 1.6em; font-weight: 700; color: #6b5233; }
img { border: 1px solid #8a7355; padding: 6px; background: #f7f0dd; }
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
.stop-num {
  background: #33ff33; color: #000; border-radius: 0;
  font-family: 'Courier New', monospace;
}
.status { border-radius: 0; font-family: 'Courier New', monospace; }
.status.reached { background: #0f3d0f; color: #33ff33; }
.status.approached { background: #3d3d0f; color: #ffff33; }
.status.missed { background: #3d0f0f; color: #ff5555; }
.card-text { color: #33ff33; }
img { border: 2px solid #33ff33; border-radius: 0; filter: contrast(1.1); }
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
.stop-num {
  background: #ffcc00; color: #cc0066;
  border: 3px solid #ff66cc; border-radius: 50%;
  transform: rotate(-8deg);
}
.status.reached { background: #ccff66; color: #336600; border-radius: 12px; }
.status.approached { background: #ffcc66; color: #7a3300; border-radius: 12px; }
.status.missed { background: #ff99aa; color: #7a0028; border-radius: 12px; }
.card-text { color: #771177; }
img {
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
  font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
}
h1, h2 {
  font-family: 'Fraunces', Georgia, 'Times New Roman', serif;
  color: #EEF6F2;
}
h1 { font-style: italic; text-shadow: 0 2px 24px rgba(130, 214, 195, 0.25); }
a { color: #F2946B; }
.seed {
  font-family: 'IBM Plex Mono', ui-monospace, 'Courier New', monospace;
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
.stop-num {
  background: radial-gradient(circle at 32% 28%, #EEF6F2 0%, rgba(238, 246, 242, 0.72) 45%, rgba(238, 246, 242, 0.32) 100%);
  color: #0B2A38;
  border: 1px solid rgba(238, 246, 242, 0.45);
}
.status.reached { background: rgba(47, 107, 82, 0.45); color: #A8E0C8; }
.status.approached { background: rgba(201, 168, 118, 0.22); color: #E8C468; }
.status.missed { background: rgba(232, 114, 76, 0.18); color: #F2946B; }
.card-text { color: #C9DEDA; }
.card-hex .glyph { color: #82D6C3; text-shadow: 0 0 14px rgba(130, 214, 195, 0.45); }
.card-hex .hex-title { font-family: Georgia, serif; color: #EEF6F2; }
img { border: 1px solid rgba(233, 244, 240, 0.28); border-radius: 2px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35); }
footer {
  font-family: 'IBM Plex Mono', ui-monospace, 'Courier New', monospace;
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
      font: "italic 600 52px 'Fraunces', Georgia, 'Times New Roman', serif",
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
}
.stop-num {
  background: none;
  color: #3a3a3a;
  border-radius: 0;
  width: auto; height: auto;
  font-weight: 400;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.1rem;
}
.status { display: none; }
.card-text { color: #2c2c2c; font-size: 1.1rem; line-height: 1.7; }
.card-hex .glyph { color: #3a3a3a; font-family: Georgia, serif; }
.card-hex .hex-title { font-family: Georgia, serif; font-weight: 700; color: #3a3a3a; }
img { border: none; outline: none; box-shadow: none; border-radius: 8px; }
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
