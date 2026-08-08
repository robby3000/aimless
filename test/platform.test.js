import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isIOS, isInAppBrowser, isStandalone } from '../public/lib/platform.js';

// Real UA strings, lightly trimmed.
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const IPHONE_WEBVIEW =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const IPHONE_INSTAGRAM =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 318.0.0.0.0';
const IPHONE_FACEBOOK =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/451.0.0.0.0;]';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36';
const ANDROID_WEBVIEW =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.0.0 Mobile Safari/537.36';
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';

test('isIOS detects iPhone UA', () => {
  assert.equal(isIOS(IPHONE_SAFARI), true);
  assert.equal(isIOS(ANDROID_CHROME), false);
  assert.equal(isIOS(MAC_SAFARI), false);
});

test('isIOS catches iPadOS masquerading as macOS only when touch is reported', () => {
  assert.equal(isIOS(MAC_SAFARI, false), false);
  assert.equal(isIOS(MAC_SAFARI, true), true);
});

test('isInAppBrowser flags known app tokens', () => {
  assert.equal(isInAppBrowser(IPHONE_INSTAGRAM), true);
  assert.equal(isInAppBrowser(IPHONE_FACEBOOK), true);
});

test('isInAppBrowser flags iOS webviews by the missing Safari token', () => {
  assert.equal(isInAppBrowser(IPHONE_WEBVIEW), true);
  assert.equal(isInAppBrowser(IPHONE_SAFARI), false);
});

test('isInAppBrowser flags Android WebView, not Android Chrome', () => {
  assert.equal(isInAppBrowser(ANDROID_WEBVIEW), true);
  assert.equal(isInAppBrowser(ANDROID_CHROME), false);
  assert.equal(isInAppBrowser(MAC_SAFARI), false);
});

test('isStandalone accepts either signal', () => {
  assert.equal(isStandalone(true, false), true);
  assert.equal(isStandalone(false, true), true);
  assert.equal(isStandalone(undefined, false), false);
});
