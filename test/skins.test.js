import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKINS, getSkin, scopeCSS, BASE_CSS } from '../public/lib/skins.js';

test('skins have unique ids and non-empty names', () => {
  const ids = SKINS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of SKINS) {
    assert.ok(s.name.length > 0);
    assert.equal(typeof s.css, 'string');
  }
});

test('the named skins are present', () => {
  const names = SKINS.map((s) => s.name);
  for (const name of [
    'Verdant', 'Neon', 'Old Skool', '1980s', 'Kitsch', 'Aquarium',
    'Minimalist 1', 'Chapters', 'Carousel', 'Contact Sheet',
  ]) {
    assert.ok(names.includes(name), `missing skin ${name}`);
  }
});

test('getSkin falls back to the default for unknown ids', () => {
  assert.equal(getSkin('verdant').name, 'Verdant');
  assert.equal(getSkin('nonsense'), SKINS[0]);
  assert.equal(getSkin(undefined), SKINS[0]);
});

test('no skin contains a script or event handler', () => {
  for (const s of SKINS) {
    assert.ok(!/<script/i.test(s.css), `${s.id} contains a script tag`);
    assert.ok(!/on\w+\s*=/i.test(s.css), `${s.id} contains an event handler`);
    assert.ok(!/url\((['"]?)https?:/i.test(s.css), `${s.id} references a remote URL`);
  }
});

test('scopeCSS prefixes class selectors with the scope', () => {
  const out = scopeCSS('.stop { color: red; }', '#detail-content');
  assert.ok(out.includes('#detail-content .stop {'));
});

test('scopeCSS maps body onto the scope itself', () => {
  const out = scopeCSS('body { background: black; }', '#detail-content');
  assert.ok(out.includes('#detail-content {'));
  assert.ok(!out.includes('#detail-content body'));
});

test('scopeCSS maps :root onto the scope itself', () => {
  // Custom properties in BASE_CSS must still be defined after scoping.
  const out = scopeCSS(':root { --x: 1; }', '#detail-content');
  assert.ok(out.includes('#detail-content {'));
  assert.ok(!out.includes('#detail-content :root'));
});

test('scopeCSS handles comma-separated selectors', () => {
  const out = scopeCSS('h1, h2 { color: green; }', '#x');
  assert.ok(out.includes('#x h1'));
  assert.ok(out.includes('#x h2'));
});

test('scopeCSS handles descendant selectors under body', () => {
  const out = scopeCSS('body .trace { padding: 1px; }', '#x');
  assert.ok(out.includes('#x .trace {'));
});

test('scopeCSS maps body pseudo-elements onto the scope itself', () => {
  // Fixed overlays hang off body::before/::after; scoping must not turn
  // them into "#detail-content body::before", which matches nothing.
  const out = scopeCSS('body::before { content: ""; }', '#detail-content');
  assert.ok(out.includes('#detail-content::before {'));
  assert.ok(!out.includes('#detail-content body'));
});

test('scopeCSS scopes rules inside @media and keeps the prelude', () => {
  const out = scopeCSS('@media (prefers-reduced-motion: no-preference) { body::after { animation: x 1s; } }', '#d');
  assert.ok(out.includes('@media (prefers-reduced-motion: no-preference) {'));
  assert.ok(out.includes('#d::after {'));
});

test('scopeCSS passes @keyframes through untouched', () => {
  // Keyframe selectors (from/to/percentages) must never be prefixed.
  const css = '@keyframes drift { 0%, 100% { transform: translateX(-2%); } 50% { transform: translateX(2%); } }';
  const out = scopeCSS(css, '#d');
  assert.ok(out.includes('@keyframes drift {'));
  assert.ok(!out.includes('#d 0%'));
  assert.ok(!out.includes('#d 50%'));
});

test('scopeCSS ignores comments when matching body selectors', () => {
  // A comment above body::before once rode into the prelude and defeated
  // the exact-match mapping, silently dropping the rule in-app.
  const out = scopeCSS('/* tank */\nbody::before { content: ""; }', '#d');
  assert.ok(out.includes('#d::before {'));
  assert.ok(!out.includes('body'));
});

test('base hides waypoint numbers; skins opt in', () => {
  // .stop-num is always emitted in the markup so any skin can reveal it;
  // the default keeps numbers off.
  assert.ok(BASE_CSS.includes('.stop-num { display: none; }'));
});

test('base hides the expansion hooks; skins opt in', () => {
  // Hidden same-named radio pairs back CSS-only expand/collapse:
  // .stop-open/.stop-shut per stop (Contact Sheet's lightbox) and
  // .zoom-open/.zoom-shut per frame (tap-to-enlarge). Skins that don't
  // use them must never see them.
  // The input./label. prefixes are load-bearing: they keep the hide rule
  // ahead of a skin's .photo-frame > * selectors, which tie bare classes
  // and win on source order — that once leaked visible radio pills into
  // exports.
  assert.ok(BASE_CSS.includes('input.stop-open, input.stop-shut, input.zoom-open, input.zoom-shut,'));
  assert.ok(BASE_CSS.includes('label.stop-face, label.stop-back, label.zoom-face, label.zoom-back { display: none; }'));
});

test('contact sheet reveals label surfaces bound to its radio state', () => {
  // The export is script-free, so the label->radio activation IS the
  // interaction (labels survive iOS versions that ignore input taps);
  // in-app index.html keeps every hook display:none and JS drives .checked.
  const cs = getSkin('contactsheet');
  assert.ok(/label\.stop-face\s*{[^}]*display:\s*block/.test(cs.css), 'contact sheet must un-hide .stop-face');
  assert.ok(cs.css.includes('input.stop-open:checked ~ .stop-body'), 'contact sheet must wire :checked to expansion');
  assert.ok(/label\.stop-back\s*{[^}]*display:\s*block/.test(cs.css), 'contact sheet must reveal .stop-back on the open card');
});

test('chapters and carousel wire the tap-to-enlarge photo hook', () => {
  // Expansion is driven by sibling selectors (input:checked ~ leaf), not
  // :has() — older Safari parses :has() but does not re-render it when the
  // :checked state flips, so a :has-driven zoom looks dead on tap there.
  for (const id of ['chapters', 'carousel']) {
    const css = getSkin(id).css;
    assert.ok(css.includes('.zoom-open'), `${id} must surface .zoom-open`);
    assert.ok(css.includes('input.zoom-open:checked ~ :not(input):not(label)'), `${id} must expand the leaf on :checked`);
    assert.ok(css.includes('input.zoom-open:checked ~ label.zoom-back'), `${id} must surface .zoom-back for tap-to-close`);
    assert.ok(!css.includes('has(:checked)'), `${id} must not rely on :has for expansion`);
  }
});

test('chapters and carousel frames hug the photo via the emitted --ar', () => {
  // Fixed-height letterbox plates left dead space around images; frames
  // must size from the photo's own aspect ratio instead.
  for (const id of ['chapters', 'carousel']) {
    const css = getSkin(id).css;
    assert.ok(css.includes('aspect-ratio: var(--ar'), `${id} frame must use the --ar hook`);
    assert.ok(!/\.photo-frame\s*{[^}]*height:\s*\d+svh/.test(css), `${id} frame must not fix its height`);
  }
});

test('carousel keeps its cross axis scrollable and its snap areas margin-free', () => {
  // overflow:hidden on the non-snap axis can break scroll snapping, and
  // margins between snap areas are dead space the port can rest in.
  const css = getSkin('carousel').css;
  assert.ok(css.includes('scroll-snap-type: x mandatory'));
  assert.ok(!/overflow-y:\s*hidden/.test(css), 'overflow-y:hidden breaks scroll snapping');
  assert.ok(/body\s*>\s*\.trace[^}]*margin:\s*0/.test(css), 'snap children must not carry margins');
});

test('skins decorate .photo-frame, never the leaf photo element', () => {
  // The leaf is <img> in exports but <canvas> in-app; only the .photo-frame
  // wrapper exists in both markups, so skin rules must target the frame —
  // a bare img selector would silently lose its styling in-app.
  for (const s of SKINS) {
    assert.ok(!/(^|[\s,{>+~])img(?![\w-])/.test(s.css), `${s.id} styles the img element directly`);
  }
});

test('aquarium keeps its residents on fixed, click-through viewport layers', () => {
  // The point of the skin: the tank stays in the viewport while the walk
  // result scrolls, and never intercepts taps on the content beneath.
  const a = getSkin('aquarium');
  const fixed = a.css.match(/[^{}]+{[^}]*position: fixed[^}]*}/gs) || [];
  assert.ok(fixed.length >= 3, 'expected rays, fish and bubble layers');
  for (const layer of fixed) assert.ok(layer.includes('pointer-events: none'), 'overlay layer is not click-through');
});

test('aquarium animates nine fish, six bubble columns and the rays', () => {
  // One aqua-drift per fish lane, one aqua-rise per bubble column, one
  // rays drift - each with its own duration and delay, as in the guide.
  const a = getSkin('aquarium');
  assert.equal((a.css.match(/animation: aqua-drift/g) || []).length, 9);
  assert.equal((a.css.match(/animation: aqua-rise/g) || []).length, 6);
  assert.equal((a.css.match(/animation: aqua-rays/g) || []).length, 1);
  for (const kf of ['aqua-rays', 'aqua-drift', 'aqua-bob', 'aqua-rise']) {
    assert.ok(a.css.includes(`@keyframes ${kf} {`), `missing @keyframes ${kf}`);
  }
});

test('aquarium motion survives scoping for the in-app detail view', () => {
  const out = scopeCSS(getSkin('aquarium').css, '#detail-content');
  assert.ok(out.includes('@keyframes aqua-drift {'));
  assert.ok(out.includes('@media (prefers-reduced-motion: no-preference) {'));
  assert.ok(out.includes('#detail-content::before {'));
  // The fish ride class pseudo-elements; every rule mentioning one must
  // carry the scope (base group, static rule, @media animation, print).
  const lines = out.split('\n').filter((l) => l.includes('.seed::before'));
  assert.ok(lines.length >= 3, 'expected several scoped .seed::before rules');
  for (const l of lines) assert.ok(l.includes('#detail-content'), `unscoped fish selector in: ${l}`);
  assert.ok(!out.includes('#detail-content body'), 'body selector leaked into scoped output');
  const open = (out.match(/{/g) || []).length;
  const close = (out.match(/}/g) || []).length;
  assert.equal(open, close);
});

test('every skin has a share-card palette', () => {
  // The share-sheet preview card is drawn on a canvas, which cannot apply
  // CSS, so each skin carries its colours and font as data.
  for (const s of SKINS) {
    assert.ok(s.card, `${s.id} is missing a card palette`);
    for (const key of ['bg', 'fg', 'accent', 'font']) {
      assert.equal(typeof s.card[key], 'string', `${s.id}.card.${key} must be a string`);
      assert.ok(s.card[key].length > 0, `${s.id}.card.${key} must not be empty`);
    }
    for (const key of ['bg', 'fg', 'accent']) {
      assert.ok(/^#[0-9a-f]{6}$/i.test(s.card[key]), `${s.id}.card.${key} must be a hex colour`);
    }
  }
});

test('every skin has a trace palette and an export logo variant', () => {
  // The trace SVG's dots and strokes are attributes (not CSS), and the
  // export logo is baked in at export time, so both are data on the skin.
  for (const s of SKINS) {
    assert.ok(s.trace, `${s.id} is missing a trace palette`);
    for (const key of ['planStroke', 'traceStroke', 'originFill', 'stopFill']) {
      assert.ok(/^#[0-9a-f]{6}$/i.test(s.trace[key] || ''), `${s.id}.trace.${key} must be a hex colour`);
    }
    assert.ok(['light', 'dark', 'sky'].includes(s.icon), `${s.id}.icon must be light, dark or sky`);
  }
});

test('every skin survives scoping (produces output, no dangling braces)', () => {
  for (const s of SKINS) {
    const out = scopeCSS(s.css, '#detail-content');
    const open = (out.match(/{/g) || []).length;
    const close = (out.match(/}/g) || []).length;
    assert.equal(open, close, `${s.id} has unbalanced braces after scoping`);
  }
});
