// Platform and browser-shell detection from the user agent. Pure, no DOM.

const IN_APP_UA =
  /FBAN|FBAV|FBIOS|Instagram|TikTok|BytedanceWebview|musical_ly|Twitter|Slack|LinkedInApp|Line\/|Snapchat|Pinterest|MicroMessenger|GSA\//i;

/**
 * True on iPhone/iPad/iPod. iPadOS 13+ reports a Macintosh UA, so callers
 * should pass hasTouch = navigator.maxTouchPoints > 0 to catch it.
 */
export function isIOS(ua, hasTouch = false) {
  return /iP(hone|ad|od)/.test(ua) || (/\bMacintosh\b/.test(ua) && hasTouch);
}

/**
 * True when the page is inside an app's in-app webview (Instagram, X, Slack,
 * ...) rather than a full browser. DeviceOrientationEvent.requestPermission
 * is unreliable or a silent no-op there. Two signals: a known app token in
 * the UA, or - on iOS - a WebKit UA with no "Safari" token, which is how a
 * plain WKWebView identifies itself (Mobile Safari always carries one).
 */
export function isInAppBrowser(ua) {
  if (IN_APP_UA.test(ua)) return true;
  if (/iP(hone|ad|od)/.test(ua) && !/Safari\//.test(ua)) return true;
  return /; wv\)/.test(ua);   // Android WebView
}

/**
 * True when running as an installed home-screen PWA. iosStandalone is
 * navigator.standalone (the old iOS API, still the only one Safari
 * implements); mediaStandalone is
 * matchMedia('(display-mode: standalone)').matches.
 */
export function isStandalone(iosStandalone, mediaStandalone) {
  return iosStandalone === true || mediaStandalone === true;
}
