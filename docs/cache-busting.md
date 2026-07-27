# Cache busting a service worker

A note on the single most dangerous bug class in a PWA, and the two-line habit that
prevents it. Written after it nearly bit us during the W-compass fix.

---

## 1. The problem

A service worker exists to make the app work with no signal. To do that it keeps a copy
of the app in the Cache Storage API and serves from there. That is the whole point, and
it is also the trap: **an installed PWA does not fetch your new code just because you
deployed it.** The user's phone is running a frozen copy of the app from whenever they
last got an update, and it is very good at continuing to do so.

Aimless uses two strategies, set in `public/sw.js`:

| Asset | Strategy | Sees a deploy? |
|---|---|---|
| `.html`, `.json` | network-first | Yes, on the next online load |
| everything else (`lib/*.js`, icons) | **cache-first** | **No. Never.** |

Cache-first is right for the JS modules — they are the thing you most need offline, and
re-fetching them on every load would be wasteful. But it means a change to
`public/lib/geo.js` is invisible to an installed phone for the rest of time.

### The near-miss

The compass fix added a new export, `headingFromAlpha`, to `lib/geo.js`, and an import
of it in `index.html`. Consider what that combination does on a phone with a warm cache:

- `index.html` is network-first, so the phone gets the **new** HTML.
- `lib/geo.js` is cache-first, so the phone keeps the **old** module.
- The new HTML does `import { headingFromAlpha } from './lib/geo.js'`.
- The old module has no such export. An ES module import of a missing binding is a
  **link-time error**, not a runtime one — it throws before a single line executes.

The result is not a broken compass. It is a blank screen, on a phone, in a field. And it
would have been invisible in every desktop test, because a desktop hard-refresh bypasses
the service worker.

## 2. The mechanism

Two separate things have to happen, and it is worth being precise about which is which.

**A new worker must install.** The browser re-fetches `sw.js` on navigation and compares
it byte-for-byte with the installed copy. Byte-identical means nothing happens, no matter
what else you deployed. So *any* change to `sw.js` is the trigger.

**The old cache must be deleted.** That is this, in the `activate` handler:

```js
caches.keys().then((keys) =>
  Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
)
```

Every cache whose name is not the current `CACHE` is dropped. So if — and only if — the
new worker carries a *different* `CACHE` string, the stale files go with it.

Hence the idiom: **change the cache name and you get both properties at once.** The
byte-difference that triggers the install, and the name-difference that purges the old
files. One string, two jobs.

`skipWaiting()` and `clients.claim()` in `sw.js` make this happen on the next load rather
than after every tab is closed.

## 3. Why a hand-typed version number is not enough

The obvious version is `const CACHE = 'aimless-v0.1.0'`, bumped by hand. It works exactly
as long as you remember, and the failure mode when you forget is silent, delayed, and
only reproducible on a device you are not holding. That is the worst shape a bug can have.

So `scripts/stamp-sw.mjs` derives it instead:

```
const CACHE = 'aimless-v0.1.1-3f9a2c48';
                       │        └── sha256 of every file under public/, first 8 hex
                       └── version from package.json
```

The hash covers each file's **path and bytes**, in sorted order, so a rename counts as a
change just as an edit does. `sw.js` itself is excluded from the hash — it is the file
being rewritten, so including it would make the hash depend on its own output and never
settle.

That exclusion is not merely a workaround, it is also correct. Editing `sw.js` leaves the
hash unchanged, so the cache name does not rotate and the existing cache survives — which
is what you want, because none of the *cached files* changed. The new worker still
installs (the byte comparison on `sw.js` guarantees that) and still re-runs `install`, so
any newly added `PRECACHE` entry is fetched into the surviving cache. The rule is:
the hash tracks the contents of the app shell, and `sw.js` looks after itself.

The version prefix is not load-bearing; the hash does the work. It is there so a human
reading DevTools can tell at a glance which release a cache belongs to.

```sh
npm run stamp         # rewrite the cache name in public/sw.js
npm run stamp:check   # exit 1 if it is stale, change nothing
```

`stamp:check` runs in CI (`.github/workflows/pages.yml`) **before** the Pages deploy. If
you change anything under `public/` and forget to stamp, the build fails and nothing
ships. The discipline is enforced by a machine rather than by memory.

### Why check in CI instead of just stamping in CI

We could have the workflow run `npm run stamp` and deploy the result, which can never be
forgotten. We deliberately do not, for two reasons. The deployed artifact would differ
from the committed source, so `sw.js` in git would be a lie. And the cache name is a real
part of the app's behaviour — if it is generated invisibly at deploy time, nobody
debugging a stale-cache report has any way to reason about it. A failing check costs
thirty seconds; an unreproducible deploy costs an afternoon.

## 4. The manifest does not need a version

`web app manifest` has no `version` member. It is not in the spec and browsers ignore it
entirely — the intuition comes from Chrome *extension* manifests, which are a different
format. `public/manifest.json` used to carry `"version": "0.1.0"` and it did nothing at
all.

It has been removed, on the grounds that a second version number which is silently inert
is worse than no version number: it invites someone to bump it and believe they have
shipped an update.

The manifest is re-read by the browser periodically and does control the installed app's
name, icons and colours. It has no role in cache invalidation.

## 5. Checklist

After changing anything in `public/`:

1. `npm test`
2. `npm run stamp`
3. Commit the modified `sw.js` **along with** the change that caused it.

To verify on a device: DevTools → Application → Cache Storage should show exactly one
`aimless-*` cache, with the current name. More than one means `activate` did not run.

## 6. Further reading

- [Service Worker lifecycle](https://web.dev/articles/service-worker-lifecycle) — the
  install/waiting/active states, and why `skipWaiting` is a considered choice rather than
  a default.
- MDN: [`Cache`](https://developer.mozilla.org/en-US/docs/Web/API/Cache),
  [`Clients.claim()`](https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim).
