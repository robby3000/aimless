// Walk Result skins. Each skin is a CSS fragment written against the shared
// walk-result markup vocabulary (body, h1/h2, .seed, .date, .summary, .trace,
// .stop, .stop-num, .status, .card-text, img, footer). The same fragment
// skins the in-app detail view (scoped to #detail-content via scopeCSS) and
// the self-contained HTML export (embedded as-is). CSS only - exports must
// never contain scripts.
//
// Skins style decoration only: colours, typography, borders, backgrounds.
// Never layout, so the same fragment works against both markups.

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
.seed { font-family: monospace; color: var(--accent); font-size: 0.9rem; }
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
.status.missed { background: #4a2a2a; color: #c88; }
.card-text { font-size: 1.1rem; line-height: 1.6; }
footer { margin-top: 32px; color: var(--fg-dim); font-size: 0.8rem; text-align: center; }
footer a { color: inherit; }
.app-icon { width: 44px; height: 44px; border-radius: 10px; vertical-align: -6px; margin-right: 6px; }
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

export const SKINS = [
  {
    id: 'default',
    name: 'Default',
    css: '',
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
.status.reached { color: #4a5d2a; }
.status.approached { color: #8a5a1e; }
.status.missed { color: #8a2e1e; }
.card-text { font-size: 1.05rem; color: #46392a; }
.card-text::first-letter { font-size: 1.6em; font-weight: 700; color: #6b5233; }
img { border: 1px solid #8a7355; padding: 6px; background: #f7f0dd; }
footer { font-style: italic; color: #93826a; }
footer::before { content: "~ "; }
footer::after { content: " ~"; }
`,
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
.status.missed { background: #3d0f0f; color: #ff3333; }
.card-text { color: #33ff33; }
img { border: 2px solid #33ff33; border-radius: 0; filter: contrast(1.1); }
footer { color: #1e7a1e; }
footer::before { content: "*** "; }
footer::after { content: " ***"; }
`,
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
.status.approached { background: #ffcc66; color: #994400; border-radius: 12px; }
.status.missed { background: #ff99aa; color: #990033; border-radius: 12px; }
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
    card: {
      bg: '#ffb3e6',
      fg: '#661166',
      accent: '#ff0066',
      font: "700 52px 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive",
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
 * properties stay defined). No @-rule support - skins stay simple.
 */
export function scopeCSS(css, scope) {
  return css.replace(/(^|})([^{}]+){/g, (match, brace, selectors) => {
    const scoped = selectors.split(',').map((raw) => {
      const s = raw.trim();
      if (!s) return s;
      if (s === 'body' || s === ':root') return scope;
      if (s.startsWith('body ')) return `${scope} ${s.slice(5)}`;
      return `${scope} ${s}`;
    }).join(', ');
    return `${brace} ${scoped} {`;
  });
}
