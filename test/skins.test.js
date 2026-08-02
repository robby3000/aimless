import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKINS, getSkin, scopeCSS } from '../public/lib/skins.js';

test('skins have unique ids and non-empty names', () => {
  const ids = SKINS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of SKINS) {
    assert.ok(s.name.length > 0);
    assert.equal(typeof s.css, 'string');
  }
});

test('the five named skins are present', () => {
  const names = SKINS.map((s) => s.name);
  for (const name of ['Verdant', 'Neon', 'Old Skool', '1980s', 'Kitsch']) {
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

test('scopeCSS handles comma-separated selectors', () => {
  const out = scopeCSS('h1, h2 { color: green; }', '#x');
  assert.ok(out.includes('#x h1'));
  assert.ok(out.includes('#x h2'));
});

test('scopeCSS handles descendant selectors under body', () => {
  const out = scopeCSS('body .trace { padding: 1px; }', '#x');
  assert.ok(out.includes('#x .trace {'));
});

test('every skin survives scoping (produces output, no dangling braces)', () => {
  for (const s of SKINS) {
    const out = scopeCSS(s.css, '#detail-content');
    const open = (out.match(/{/g) || []).length;
    const close = (out.match(/}/g) || []).length;
    assert.equal(open, close, `${s.id} has unbalanced braces after scoping`);
  }
});
