/**
 * Walk Detail screen: the artifact view, skin/filter rails, filter
 * management, the Neocities publish hand-off, the export sheet and the
 * share/OG cards. Extracted from index.html — DOM wiring still happens
 * at module top level, exactly as it did inline.
 *
 * State owned here (detail-visit lifetime): the current walk, photo
 * selection, long-press bookkeeping, render tokens/observers, the trace
 * release listener and the per-visit animation gate. App-lifetime
 * dependencies that other screens share stay in index.html and are
 * injected via initDetail().
 */

import { makeRng } from '../rng.js';
import { surpriseSpec } from '../surprise.js';
import { put, get, all, byIndex, del } from '../store.js';
import { unreachableRate } from '../proximity.js';
import { formatKm, bounds } from '../geo.js';
import { buildHTMLExport, downloadFile, voiceName, formatWalkDate, parseMyVoiceText, esc } from '../export.js';
import { buildKmlString } from '../kml.js';
import { SKINS, getSkin, scopeCSS, BASE_CSS } from '../skins.js';
import { FILTERS, getFilter, allFilters, visibleFilters, setImportedFilters, importFilterSpec, importFilterPayload,
         filterSpecJson, setHiddenFilters, hiddenFilters, hideFilter, unhideFilter, isFilterHidden,
         effectiveFilterId, effectiveSpec } from '../filters.js';
import { renderToCanvas } from '../engine/canvas.js';
import { renderPhotoToCanvas } from '../filter-renderer.js';
import { nextBuildSlug, normalizeSitename, neocitiesTargets, defaultDescription, ogHeadHtml, publishedEntries, indexHtml, manifestText } from '../publish.js';
import { traceSVG } from '../markup.js';
import { askConfirm, askText } from './modals.js';

// Injected by index.html — shared with the go/walk/archive screens.
let dbPromise, showScreen, showToast, savePrefs, toastHold, toastRelease;
export function initDetail(deps) {
  ({ dbPromise, showScreen, showToast, savePrefs, toastHold, toastRelease } = deps);
}

// --- Walk Result skins ---
// The Skin and Filter rails' tokens are generated from SKINS and FILTERS,
// so a rail can never drift from its source table.
const railDetail = document.getElementById('rail-detail');
const railModeSkin = document.getElementById('rail-mode-skin');
const railModeFilter = document.getElementById('rail-mode-filter');
// One rail, two modes: the stacked Skin/Filter switch in the left
// gutter swaps what the rail carries. Filter is the default — skin is
// set once, filters are auditioned repeatedly.
let railMode = 'filter';
// Surprise always rides the last content slot — it's an action (roll a
// random stack onto the one selected photo), not a stored filter. Save
// appears between it and the boxed plus only while a selected photo
// carries a rolled spec. The plus opens the filters sheet.
const SURPRISE_TOKEN = '<div class="rail-item rail-surprise" data-action data-value="surprise">Surprise<span>.</span></div>';
const SAVE_TOKEN = '<div class="rail-item rail-save" data-action data-value="save">Save<span>.</span></div>';
const ADD_TOKEN = '<div class="rail-item rail-plus" data-action data-value="add"><span class="plus-box">+</span></div>';
let railHasSave = false;
// A selected photo's stored Surprise roll is what Save writes to the
// filters store.
function hasSavableSpec() {
  return currentDetailPhotos.some((p) => selectedPhotoSeqs.has(p.stopSeq) && p.filterSpec);
}
// The shared base result styles and the active skin are injected scoped
// to the detail view so they cannot leak into the rest of the app; the
// export embeds the same fragments unscoped. Base first, skin after it,
// so the skin wins every rule they both set.
const baseStyle = document.createElement('style');
baseStyle.textContent = scopeCSS(BASE_CSS, '#detail-content');
document.head.appendChild(baseStyle);
const skinStyle = document.createElement('style');
document.head.appendChild(skinStyle);
let currentSkin = 'default';
let currentFilter = 'original';
let seenPhotoSelectHint = false;
let neocitiesSitename = '';
let neocitiesIndex = '';   // last emitted aimless/index.html - "(unchanged)" tag compares against it

function applySkin() {
  skinStyle.textContent = scopeCSS(getSkin(currentSkin).css, '#detail-content');
}

// Horizontal scroll-snap rail: the centred token is the selected one.
// Tapping a token selects it instantly and scrolls it to the centre;
// swiping selects once the scroll settles. Same idea as makeWheel, flat.
function makeRail(el, onSelect, canSettle = () => true) {
  let items = [...el.querySelectorAll('.rail-item')];
  let current = -1;
  let settle = null;

  function select(index, fire) {
    index = Math.max(0, Math.min(items.length - 1, index));
    if (index === current) return;
    current = index;
    items.forEach((it, i) => it.classList.toggle('selected', i === index));
    if (fire) onSelect(items[index].dataset.value);
  }

  // Centre of an item in scroll-content coordinates. offsetLeft is wrong
  // here: it is measured from the offsetParent (nothing between the rail
  // and body is positioned), which mixes page and scroll coordinates and
  // pushed the settled selection ~one token short — the end tokens could
  // never be swiped into place. Live rects keep both frames consistent.
  function centerOf(it) {
    return it.getBoundingClientRect().left - el.getBoundingClientRect().left
      + el.scrollLeft + it.offsetWidth / 2;
  }

  el.addEventListener('scroll', () => {
    clearTimeout(settle);
    settle = setTimeout(() => {
      // Settle-select can be suppressed by mode: a filter landing centre
      // must not light (or arm) while no photo is selected.
      if (!canSettle()) return;
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0, bestDist = Infinity;
      items.forEach((it, i) => {
        const d = Math.abs(centerOf(it) - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      // Action tokens are verbs: a flick past Surprise or the plus must
      // never fire them — they need a deliberate tap.
      if (items[best].dataset.action !== undefined) return;
      select(best, true);
    }, 90);
  }, { passive: true });

  // Delegated so rebuilt item lists (imported filters) keep working.
  el.addEventListener('click', (e) => {
    const it = e.target.closest('.rail-item');
    const i = it ? items.indexOf(it) : -1;
    if (i < 0) return;
    // Action items (Surprise) fire on every tap, even when already
    // highlighted — they are verbs, not positions on a dial.
    if (it.dataset.action !== undefined) { onSelect(it.dataset.value); return; }
    select(i, true);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: centerOf(it) - el.clientWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
  });

  return {
    // Re-query items after innerHTML rebuilds. current resets too: the
    // index may coincide with the new selection's, and a stale match
    // would skip re-marking .selected on the fresh elements.
    refresh() { items = [...el.querySelectorAll('.rail-item')]; current = -1; },
    // Nothing lit: used when a lit filter would claim an application
    // that isn't true (no photos selected, or a mixed selection).
    clearSelection() {
      current = -1;
      items.forEach((it) => it.classList.remove('selected'));
    },
    setValue(value, scroll = true) {
      const i = Math.max(0, items.findIndex((it) => it.dataset.value === value));
      select(i, false);
      // Only meaningful when the rail is laid out (its screen visible);
      // showWalkDetail re-syncs whenever the detail screen opens.
      // scroll=false just moves the highlight — used in photo-selection
      // mode, where re-centering would yank the rail out from under the
      // finger mid-swipe.
      if (scroll && el.clientWidth > 0) el.scrollLeft = centerOf(items[i]) - el.clientWidth / 2;
    },
  };
}

const detailRail = makeRail(railDetail, async (value) => {
  if (railMode === 'skin') {
    currentSkin = value;
    applySkin();
    savePrefs();
    // A purposeful selection persists onto the walk record — the
    // artifact keeps this skin until another is chosen here. The put
    // must land before showWalkDetail re-reads the record, or the
    // rebuild would stamp the stale skin back over the choice.
    if (currentDetailWalk) {
      currentDetailWalk.skin = value;
      const db = await dbPromise;
      if (db) await put(db, 'walks', currentDetailWalk);
      // The trace SVG's colours come from the skin too (they are
      // attributes, not CSS), so the detail view must re-render on a
      // skin change.
      showWalkDetail(currentDetailWalk.id);
    }
    return;
  }
  if (value === 'add') {
    renderManageList();
    filtersSheetCtl.open();
    return;
  }
  // Surprise is an action: roll a random stack onto the one selected
  // photo. With anything else selected it explains itself and stops.
  if (value === 'surprise') {
    surpriseSelectedPhoto();
    return;
  }
  if (value === 'save') {
    saveSurpriseSpec();
    return;
  }
  // With photos selected the rail is scoped to them: it writes filterId
  // onto those photo records. With none selected there is no walk-wide
  // render — the tap only arms the value as last-used (the item lights
  // itself) and nudges toward selection.
  if (selectedPhotoSeqs.size && currentDetailWalk) {
    assignFilterToSelection(value);
    return;
  }
  // Armed only: the tap stores it as last-used and nudges toward
  // selection, but nothing is applied — so nothing stays lit.
  currentFilter = value;
  savePrefs();
  detailRail.clearSelection();
  if (!selectToastShown) {
    selectToastShown = true;
    showToast('Long-press photos to select');
  }
  // Scroll-settle only selects in skin mode (a skin always applies) or
  // in filter mode with photos selected (a lit filter means "applies
  // to this selection"). Swiping filters with nothing selected changes
  // nothing — deliberate taps still arm and light.
}, () => railMode === 'skin' || selectedPhotoSeqs.size > 0);

// Rebuild the rail's contents for the active mode and reflect the mode
// on the gutter buttons (coral on lighter teal = pressed).
function renderDetailRail() {
  if (railMode === 'filter') railHasSave = hasSavableSpec();
  railDetail.innerHTML = railMode === 'skin'
    ? SKINS.map((s) => `<div class="rail-item" data-value="${s.id}">${s.name}</div>`).join('')
    : visibleFilters().map((f) => `<div class="rail-item" data-value="${f.id}">${f.name}</div>`).join('') + SURPRISE_TOKEN + (railHasSave ? SAVE_TOKEN : '') + ADD_TOKEN;
  detailRail.refresh();
  if (railMode === 'skin') detailRail.setValue(currentSkin);
  else syncFilterRailToSelection();
  railModeSkin.classList.toggle('active', railMode === 'skin');
  railModeFilter.classList.toggle('active', railMode === 'filter');
  if (railMode === 'filter') watchAddToken();
}

function setRailMode(mode) {
  if (mode === railMode) return;
  railMode = mode;
  renderDetailRail();
}
railModeSkin.addEventListener('click', () => setRailMode('skin'));
railModeFilter.addEventListener('click', () => setRailMode('filter'));

// The boxed plus explains itself once per detail entry, the first time
// it sits (or scrolls) into view.
let addFilterToastShown = false;
let addObserver = null;
function watchAddToken() {
  addObserver?.disconnect();
  const token = railDetail.querySelector('.rail-plus');
  if (!token || addFilterToastShown || !('IntersectionObserver' in window)) return;
  addObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.intersectionRatio >= 0.8 && !addFilterToastShown) {
        addFilterToastShown = true;
        showToast('Add custom filters');
        addObserver.disconnect();
      }
    }
  }, { root: railDetail, threshold: 0.8 });
  addObserver.observe(token);
}

// --- Filter management ---
// Imported filters persist in the 'filters' store and ride the picker
// rail (visible = not hidden); built-ins can only be hidden, not
// deleted. The management UI lives in the #filters-sheet bottom sheet.
const elFilterJson = document.getElementById('filter-json');
const elFilterFile = document.getElementById('filter-file');
const elFilterImportStatus = document.getElementById('filter-import-status');
const elManageList = document.getElementById('filter-manage-list');

// Newest customs first (createdAt desc; missing timestamps keep store order).
function importedSorted() {
  const imported = allFilters().slice(FILTERS.length);
  if (imported.some((f) => f.createdAt)) {
    return [...imported].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  return [...imported].reverse();
}

function renderFilterRail() {
  // Imported filters only ride the rail in filter mode — in skin mode
  // the rebuild happens next time the user switches back.
  if (railMode === 'filter') renderDetailRail();
}

// Wobbletone-style cards: a live thumbnail of the spec against the
// current photo, name + effect chain, and per-filter controls. Customs
// get delete (top right) and export; every filter gets a hide switch
// (checkbox controls rail visibility).
function filterCard(f, custom) {
  const hidden = isFilterHidden(f.id);
  const effects = f.spec.effects.map((e) => e.type).join(' → ');
  return `<article class="filter-card${hidden ? ' is-hidden' : ''}">` +
    `<div class="filter-card-head">` +
    `<canvas class="filter-thumb" width="96" height="96" data-thumb="${f.id}"></canvas>` +
    `<div class="filter-card-info">` +
    `<div class="filter-name">${esc(f.name)}</div>` +
    `<div class="filter-effects">${esc(effects || 'no effects')}</div>` +
    `</div>` +
    (custom ? `<button class="filter-card-delete" data-delete="${f.id}" aria-label="Delete filter" title="Delete filter">✕</button>` : '') +
    `</div>` +
    `<div class="filter-card-actions">` +
    (custom ? `<button class="filter-card-export" data-export="${f.id}">export</button>` : '') +
    `<label class="filter-hide"><input type="checkbox" data-hide="${f.id}"${hidden ? ' checked' : ''}> hide</label>` +
    `</div></article>`;
}

function renderManageList() {
  const customs = importedSorted().map((f) => filterCard(f, true)).join('');
  const builtins = FILTERS.map((f) => filterCard(f, false)).join('');
  elManageList.innerHTML =
    (customs ? `<div class="filter-sub">Custom</div>${customs}` : '') +
    `<div class="filter-sub">Built-in</div>${builtins}`;
  pumpFilterThumbs();
}

// Card thumbnails preview each spec against the first selected photo —
// or the walk's first when nothing is selected. One card per animation
// frame so opening the sheet never blocks; detached canvases (a rebuilt
// list) are skipped.
async function pumpFilterThumbs() {
  const photo = currentDetailPhotos.find((p) => selectedPhotoSeqs.has(p.stopSeq)) || currentDetailPhotos[0];
  const jobs = [...elManageList.querySelectorAll('canvas.filter-thumb')]
    .map((canvas) => ({ canvas, spec: getFilter(canvas.dataset.thumb)?.spec }))
    .filter((job) => job.spec);
  if (!jobs.length) return;
  const { img } = photo ? await photoSource(photo) : { img: null };
  if (!img) { jobs.forEach((job) => { job.canvas.hidden = true; }); return; }
  const step = () => {
    const job = jobs.shift();
    if (!job) return;
    if (job.canvas.isConnected) {
      try {
        const rendered = renderDetailCanvas(img, photo, job.spec, 96);
        const s = Math.min(rendered.width, rendered.height);
        job.canvas.getContext('2d')
          .drawImage(rendered, (rendered.width - s) / 2, (rendered.height - s) / 2, s, s, 0, 0, 96, 96);
      } catch { job.canvas.hidden = true; }
    }
    requestAnimationFrame(step);
  };
  step();
}

export async function refreshImportedFilters() {
  const db = await dbPromise;
  setImportedFilters(db ? await all(db, 'filters') : []);
  renderFilterRail();
  renderManageList();
}

async function applyFilterImport(json) {
  const db = await dbPromise;
  try {
    const imported = allFilters().slice(FILTERS.length);
    const { records, errors } = importFilterPayload(json, allFilters().map((f) => f.id), imported);
    const now = Date.now();
    const next = imported.slice();
    for (const record of records) {
      record.createdAt = record.createdAt || now;
      if (db) await put(db, 'filters', record);
      else {
        const at = next.findIndex((f) => f.id === record.id);
        if (at >= 0) next[at] = record; else next.push(record);
      }
    }
    if (!db) setImportedFilters(next);
    await refreshImportedFilters();
    const last = records[records.length - 1];
    currentFilter = last.id;
    savePrefs();
    detailRail.setValue(last.id);
    if (currentDetailWalk) showWalkDetail(currentDetailWalk.id);
    elFilterImportStatus.textContent = records.length === 1 && !errors.length
      ? `Imported "${last.name}".`
      : `Imported ${records.length} filters.` + (errors.length ? ` Skipped ${errors.length}: ${errors[0]}` : '');
    elFilterJson.value = '';
  } catch (err) {
    elFilterImportStatus.textContent = err.message;
  }
}

document.getElementById('btn-filter-apply').addEventListener('click', () => {
  applyFilterImport(elFilterJson.value);
});
document.getElementById('btn-filter-file').addEventListener('click', () => elFilterFile.click());
elFilterFile.addEventListener('change', async () => {
  const file = elFilterFile.files && elFilterFile.files[0];
  elFilterFile.value = '';
  if (!file) return;
  applyFilterImport(await file.text());
});

// --- Publish dialog (Neocities hand-off) ---
// One modal, three steps: site name, consent + description, hand-off.
const publishOverlay = document.getElementById('publish-overlay');
const publishBox = document.getElementById('publish-box');
const publishSteps = {
  site: document.getElementById('publish-step-site'),
  consent: document.getElementById('publish-step-consent'),
  handoff: document.getElementById('publish-step-handoff'),
  published: document.getElementById('publish-step-published'),
};
const sitenameInput = document.getElementById('neocities-sitename');
const sitenameError = document.getElementById('neocities-error');
const publishDesc = document.getElementById('publish-desc');
const publishCount = document.getElementById('publish-count');
let publishBuilt = null;   // { htmlName, imageName, htmlBlob, jpgBlob }

function showPublishStep(step) {
  for (const [name, el] of Object.entries(publishSteps)) el.hidden = name !== step;
  publishBox.setAttribute('aria-labelledby', `publish-heading-${step}`);
  if (step === 'site') {
    sitenameError.hidden = true;
    sitenameInput.focus();
  }
  if (step === 'consent') renderPublishConsent();
  if (step === 'published') renderPublishedStep();
}

function openPublish(step) {
  showPublishStep(step);
  publishOverlay.hidden = false;
}
function closePublish() {
  publishOverlay.hidden = true;
}
publishOverlay.addEventListener('click', (e) => {
  if (e.target === publishOverlay) closePublish();   // backdrop closes
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !publishOverlay.hidden) closePublish();
});

// Site step: validate, persist, go straight on to consent.
function savePublishSite() {
  const name = normalizeSitename(sitenameInput.value);
  if (!name) { sitenameError.hidden = false; return; }
  sitenameError.hidden = true;
  neocitiesSitename = name;
  savePrefs();
  showPublishStep('consent');
}
document.getElementById('btn-publish-site-save').addEventListener('click', savePublishSite);
document.getElementById('btn-publish-site-cancel').addEventListener('click', closePublish);
sitenameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') savePublishSite();
});

// Consent step: the URL, what the page contains, the editable description.
function renderPublishConsent() {
  const walk = currentDetailWalk;
  if (!walk) return;
  const targets = neocitiesTargets(neocitiesSitename, nextBuildSlug(walk));
  document.getElementById('publish-url').textContent = targets.pageUrl;
  const contents = document.getElementById('publish-contents');
  contents.replaceChildren(...['Your photos', 'The route drawing', 'The words'].map((t) => {
    const li = document.createElement('li');
    li.textContent = t;
    return li;
  }));
  if (document.getElementById('opt-kml-link').checked) {
    const li = document.createElement('li');
    li.className = 'warn';
    li.textContent = 'Includes the GPS link to the real route';
    contents.appendChild(li);
  }
  publishDesc.value = walk.neocities?.description ?? defaultDescription(walk);
  publishCount.textContent = `${publishDesc.value.length}/200`;
  // New builds default to listed; a previously-built walk keeps its choice.
  document.getElementById('publish-indexed').checked = walk.neocities?.indexed ?? true;
}
publishDesc.addEventListener('input', () => {
  publishCount.textContent = `${publishDesc.value.length}/200`;
});
document.getElementById('publish-change-site').addEventListener('click', () => {
  sitenameInput.value = neocitiesSitename;
  showPublishStep('site');
});
document.getElementById('btn-publish-consent-cancel').addEventListener('click', closePublish);

function formatFileSize(bytes) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Regenerate the site index from every walk marked for it. Returns the
// emitted string, its blob, and whether it matches the last emission
// (stored in prefs - drives the hand-off's "unchanged" tag).
async function buildIndexHtml() {
  const db = await dbPromise;
  const walks = db ? await all(db, 'walks') : [currentDetailWalk].filter(Boolean);
  const str = indexHtml(publishedEntries(walks), {
    subtitle: `walks on ${neocitiesSitename}.neocities.org`,
  });
  const unchanged = str === neocitiesIndex;
  neocitiesIndex = str;
  savePrefs();
  return { str, blob: new Blob([str], { type: 'text/html' }), unchanged };
}

// Build files: OG JPEG + keepsake HTML with the OG head, then hand off.
document.getElementById('btn-publish-build').addEventListener('click', async () => {
  const walk = currentDetailWalk;
  if (!walk) return;
  const builds = (walk.neocities?.builds ?? 0) + 1;
  const slug = nextBuildSlug(walk);
  const targets = neocitiesTargets(neocitiesSitename, slug);
  let description = publishDesc.value.replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!description) description = defaultDescription(walk);
  const kmlIncluded = document.getElementById('opt-kml-link').checked;

  // Same "rendering…" toast as the HTML export - the engine render of
  // the card photo and the keepsake takes a beat.
  toastHold('rendering…');
  await new Promise((r) => requestAnimationFrame(r));
  try {
    const db = await dbPromise;
    const photos = db ? await byIndex(db, 'photos', 'walkId', walk.id) : [];
    photos.sort((a, b) => a.stopSeq - b.stopSeq);
    const jpgBlob = await buildOgCard(walk, photos[0] ?? null);
    const title = walk.seed;
    const headHtml = ogHeadHtml({
      title,
      description,
      url: targets.pageUrl,
      imageUrl: targets.imageUrl,
      width: 1200,
      height: 630,
      alt: `The route of an Aimless walk on ${formatWalkDate(walk.started)}`,
    });
    const html = await buildCurrentDetailHTML({ title, headHtml });

    walk.neocities = {
      sitename: neocitiesSitename,
      builds,
      slug,
      pageUrl: targets.pageUrl,
      imageUrl: targets.imageUrl,
      builtAt: Date.now(),
      kmlIncluded,
      description,
      indexed: document.getElementById('publish-indexed').checked,
    };
    currentDetailWalk = walk;
    if (db) await put(db, 'walks', walk);

    // The index lists only walks the user marked for it, and must chase
    // the latest -N filenames - so it regenerates on every build. The
    // "unchanged" tag is mostly dormant (rebuilds renumber the slug),
    // but correct if the numbering ever stops.
    const index = await buildIndexHtml();

    publishBuilt = {
      htmlName: targets.htmlName,
      imageName: targets.imageName,
      indexName: 'index.html',
      htmlBlob: new Blob([html], { type: 'text/html' }),
      jpgBlob,
      indexBlob: index.blob,
    };
    const files = document.getElementById('publish-files');
    files.replaceChildren(...[
      [targets.htmlName, publishBuilt.htmlBlob.size, ''],
      [targets.imageName, jpgBlob.size, ''],
      [publishBuilt.indexName, publishBuilt.indexBlob.size, index.unchanged ? 'unchanged' : ''],
    ].map(([name, size, note]) => {
      const li = document.createElement('li');
      const nameEl = document.createElement('span');
      nameEl.className = 'file-name';
      nameEl.textContent = name;
      const sizeEl = document.createElement('span');
      sizeEl.className = 'file-size';
      sizeEl.textContent = note || formatFileSize(size);
      li.append(nameEl, sizeEl);
      return li;
    }));
    document.getElementById('neocities-sub').textContent = targets.pageUrl.replace(/^https:\/\//, '');
    showPublishStep('handoff');
  } finally {
    toastRelease();
  }
});

// Hand-off step: download all three (staggered - immediate multi-clicks
// get swallowed by some browsers), then upload via the dashboard.
document.getElementById('publish-download').addEventListener('click', () => {
  if (!publishBuilt) return;
  downloadFile(publishBuilt.htmlName, publishBuilt.htmlBlob, 'text/html');
  setTimeout(() => downloadFile(publishBuilt.imageName, publishBuilt.jpgBlob, 'image/jpeg'), 300);
  setTimeout(() => downloadFile(publishBuilt.indexName, publishBuilt.indexBlob, 'text/html'), 600);
});
document.getElementById('publish-open-dashboard').addEventListener('click', () => {
  window.open('https://neocities.org/dashboard', '_blank', 'noopener');
});
document.getElementById('btn-publish-done').addEventListener('click', closePublish);

// Published step: the walk already has a page - link, open, or rebuild.
function renderPublishedStep() {
  const pub = currentDetailWalk?.neocities;
  if (!pub) return;
  document.getElementById('publish-url-published').textContent = pub.pageUrl;
  const indexEl = document.getElementById('publish-index-url');
  indexEl.hidden = !pub.sitename;
  if (pub.sitename) indexEl.textContent = `index: https://${pub.sitename}.neocities.org/aimless/`;
  document.getElementById('publish-built-when').textContent = pub.builtAt ? formatWalkDate(pub.builtAt) : 'earlier';
  document.getElementById('publish-listed').checked = pub.indexed === true;
}
// "Listed on the site index" is curation, not decoration: the index
// file is regenerated and downloaded on the spot, because the toggle
// means nothing until the new index.html reaches the site.
document.getElementById('publish-listed').addEventListener('change', async (e) => {
  const walk = currentDetailWalk;
  if (!walk?.neocities) return;
  walk.neocities.indexed = e.target.checked;
  const db = await dbPromise;
  if (db) await put(db, 'walks', walk);
  const index = await buildIndexHtml();
  downloadFile('index.html', index.blob, 'text/html');
  showToast('index.html updated - upload it to your aimless folder');
});
document.getElementById('publish-update-index').addEventListener('click', async () => {
  const index = await buildIndexHtml();
  downloadFile('index.html', index.blob, 'text/html');
  showToast(index.unchanged ? 'index.html unchanged - nothing new to upload' : 'index.html downloaded');
});
// "Copy file list": a plain-text manifest of every published walk's
// relative paths + titles, for pasting into an LLM to hand-build a
// custom index page.
document.getElementById('publish-copy-manifest').addEventListener('click', async () => {
  const db = await dbPromise;
  const walks = db ? await all(db, 'walks') : [currentDetailWalk].filter(Boolean);
  try {
    await navigator.clipboard.writeText(manifestText(walks));
    showToast('File list copied');
  } catch {
    showToast('Copy failed - select the list manually');
  }
});
document.getElementById('publish-share-link').addEventListener('click', async () => {
  const url = currentDetailWalk?.neocities?.pageUrl;
  if (!url) return;
  if (navigator.share) {
    try {
      await navigator.share({ title: currentDetailWalk.seed, url });
    } catch (err) {
      if (err.name !== 'AbortError') console.warn('Share failed:', err);
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied');
  } catch {
    showToast('Could not copy link');
  }
});
document.getElementById('publish-open').addEventListener('click', () => {
  const url = currentDetailWalk?.neocities?.pageUrl;
  if (url) window.open(url, '_blank', 'noopener');
});
document.getElementById('publish-rebuild').addEventListener('click', () => {
  showPublishStep('consent');
});
document.getElementById('btn-publish-published-done').addEventListener('click', closePublish);

// Share a payload as a file via the platform sheet, falling back to a
// plain download. allowText: small payloads may share as raw text when
// file-share is refused (Android Chrome rejects .json files); a full
// backup is far too big to paste anywhere, so it passes allowText:false.
export async function shareOrDownloadFile(filename, text, title, { type = 'application/json', allowText = true } = {}) {
  if (typeof File !== 'undefined' && navigator.share) {
    const file = new File([text], filename, { type });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title, files: [file] });
        return 'shared';
      }
      if (allowText) {
        await navigator.share({ title, text });
        return 'shared';
      }
    } catch (err) {
      if (err.name === 'AbortError') return 'aborted';
    }
  }
  downloadFile(filename, text, type);
  return 'downloaded';
}

// Export a custom filter as a bare Filter Spec file — the same shape
// the Wobbletone export produces, so the file round-trips through both
// apps' importers.
async function exportFilter(id) {
  const filter = getFilter(id);
  if (!filter) return;
  const name = await askText({ label: 'Filter name', defaultValue: filter.name });
  if (!name) return;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'aimless-filter';
  await shareOrDownloadFile(`${slug}.json`, filterSpecJson(filter, name), 'Aimless filter');
}

elManageList.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-delete], [data-export]');
  if (!t) return;
  if (t.dataset.delete) {
    const id = t.dataset.delete;
    const name = getFilter(id)?.name || id;
    if (!await askConfirm(`Delete ${name} filter?`)) return;
    const db = await dbPromise;
    if (db) await del(db, 'filters', id);
    if (currentFilter === id) currentFilter = 'original';
    savePrefs();
    await refreshImportedFilters();
  } else if (t.dataset.export) {
    exportFilter(t.dataset.export);
    return;
  }
  if (currentDetailWalk) showWalkDetail(currentDetailWalk.id);
});

// The hide switch is a checkbox per card — change, not click.
elManageList.addEventListener('change', (e) => {
  const t = e.target.closest('input[data-hide]');
  if (!t) return;
  if (t.checked) {
    hideFilter(t.dataset.hide);
    if (currentFilter === t.dataset.hide) {
      currentFilter = visibleFilters()[0]?.id || 'original';
    }
  } else {
    unhideFilter(t.dataset.hide);
  }
  savePrefs();
  renderFilterRail();
  t.closest('.filter-card')?.classList.toggle('is-hidden', t.checked);
  if (currentDetailWalk) showWalkDetail(currentDetailWalk.id);
});

// --- Walk detail ---
let currentDetailWalk = null;
let lastAnimatedDetailWalk = null;

// Detail photos render through the engine into <canvas> elements — no
// JPEG/base64 encode in the preview path (that happens once, at export).
// Two caches: decoded source bitmaps (survive filter changes) and
// rendered canvases keyed by photo+filter+dim.
const PREVIEW_MAX_DIM = 1200;
const photoImgCache = new Map();      // photo.id → Promise<Image> (decoded source)
const photoCanvasCache = new Map();   // `${id}:${filter}:${dim}` → canvas

function lruSet(map, key, value, cap) {
  map.delete(key);
  map.set(key, value);
  while (map.size > cap) map.delete(map.keys().next().value);
}

function photoSource(photo) {
  let p = photoImgCache.get(photo.id);
  if (!p) {
    const src = photo.dataUrl || (photo.blob ? URL.createObjectURL(photo.blob) : null);
    p = src ? loadImage(src).then((img) => ({ img, revoke: !photo.dataUrl ? src : null }))
            .catch(() => ({ img: null, rawSrc: src }))  // unreadable legacy blob → raw src fallback
            : Promise.resolve({ img: null, rawSrc: null });
    lruSet(photoImgCache, photo.id, p, 12);
  }
  return p;
}

function renderDetailCanvas(img, photo, spec, maxDim) {
  // The effects array is the spec's identity — a named filter's params
  // never change, and each Surprise roll differs from the last.
  const key = `${photo.id}:${maxDim}:${JSON.stringify(spec.effects)}`;
  let canvas = photoCanvasCache.get(key);
  if (!canvas) {
    canvas = renderToCanvas(img, spec, { maxDim, renderer: 'auto' });
    lruSet(photoCanvasCache, key, canvas, 16);
  }
  return canvas;
}

// Data URL for the export artifact — render may be cached, encode is not.
// Only per-photo assignments render: a Surprise spec, else a picked
// filterId, else the photo is original. There is no walk-wide filter.
async function renderDetailPhoto(photo) {
  const { img, rawSrc } = await photoSource(photo);
  if (!img) return rawSrc;
  try {
    return renderDetailCanvas(img, photo, effectiveSpec(photo, 'original'), PREVIEW_MAX_DIM).toDataURL('image/jpeg', 0.85);
  } catch {
    return rawSrc;
  }
}

// Lazy fill: empty frames mount instantly; each photo renders only as
// its card scrolls into (or near) view, at full preview res in one
// pass. Rebuilds therefore cost ~the visible frames, not the
// whole set, and rendered canvases are shared with the export path.
let detailRenderToken = 0;
let detailObserver = null;
// Snap-skin trace replay: the scroll listener armed by showWalkDetail,
// held here so a rebuild can detach the one bound to dead nodes.
let traceScrollCheck = null;
// A detail rebuild parks the viewport on the topmost visible stop — but
// remounted photo frames start as small placeholders and grow as they
// render, pushing that stop down. Keep the anchor alive through the lazy
// fill: re-apply it after each render until the user scrolls themselves
// (detected by scrollTop drifting from our last applied position).
let scrollAnchor = null;
function restoreScrollAnchor() {
  if (!scrollAnchor) return;
  if (scrollAnchor.appliedTop != null && detailContent.scrollTop !== scrollAnchor.appliedTop) {
    scrollAnchor = null;
    return;
  }
  const stop = detailContent.querySelector(`.stop[data-seq="${scrollAnchor.seq}"]`);
  if (!stop) { scrollAnchor = null; return; }
  detailContent.scrollTop += stop.getBoundingClientRect().top
    - detailContent.getBoundingClientRect().top - scrollAnchor.offset;
  scrollAnchor.appliedTop = detailContent.scrollTop;
}
function fillDetailPhotos(photos, walkId) {
  const token = ++detailRenderToken;
  if (detailObserver) detailObserver.disconnect();
  const bySeq = new Map(photos.map((p) => [p.stopSeq, p]));
  // Progress indicator: "rendering n/m" beside the Filter label while
  // queued renders are in flight. m is the observed queue size, not the
  // photo count — off-screen photos are never queued.
  const busy = document.getElementById('filter-busy');
  busy.dataset.token = token; // a superseded fill's tick must not hide a newer fill's indicator
  if (!photos.length) { busy.hidden = true; return; }
  let queued = 0;
  let finished = 0;
  const tick = () => {
    if (busy.dataset.token !== String(token)) return;
    if (finished >= queued) { busy.hidden = true; return; }
    busy.hidden = false;
    busy.textContent = `rendering ${finished + 1}/${queued}`;
  };
  const renderOne = async (p) => {
    // Capture before the awaits: a filter assign while this render is
    // in flight bumps specEpoch, and the stale pixels must not land.
    const epoch = p.specEpoch || 0;
    queued++;
    tick();
    // Let the indicator paint before the synchronous render blocks the
    // main thread — without this the label toggles off again before the
    // browser ever draws it.
    await new Promise((r) => requestAnimationFrame(r));
    try {
      const { img, rawSrc } = await photoSource(p);
      // Learn the photo's aspect ratio once so future rebuilds can mount
      // the loading placeholder at the real shape — nothing grows, so
      // nothing pushes the viewport around while renders land.
      if (img?.naturalWidth && !p.ar) {
        p.ar = img.naturalWidth / img.naturalHeight;
        dbPromise.then((db) => db && put(db, 'photos', p)).catch(() => {});
      }
      const frame = token === detailRenderToken &&
        currentDetailWalk?.id === walkId &&
        document.querySelector(`.photo-frame[data-stopseq="${p.stopSeq}"]`);
      if (!frame) return;
      if (!img) {
        if (rawSrc && (p.specEpoch || 0) === epoch) {
          const [open, shut, face, back] = frameHooks(frame);
          frame.innerHTML = `<img src="${rawSrc}" alt="photo">`;
          frame.prepend(open);
          frame.append(shut, face, back);
        }
        return;
      }
      const canvas = document.createElement('canvas');
      try {
        const rendered = renderDetailCanvas(img, p, effectiveSpec(p, 'original'), PREVIEW_MAX_DIM);
        canvas.width = rendered.width;
        canvas.height = rendered.height;
        canvas.getContext('2d').drawImage(rendered, 0, 0);
      } catch { canvas.width = canvas.height = 0; }
      if ((p.specEpoch || 0) !== epoch) return;
      // Sibling selectors drive the zoom: zoom-open stays before the
      // leaf, zoom-shut after it.
      const [open, shut, face, back] = frameHooks(frame);
      frame.replaceChildren(open, canvas, shut, face, back);
    } catch { /* unreadable photo — leave shimmer */ }
    finally { finished++; tick(); restoreScrollAnchor(); }
  };
  // No IntersectionObserver (ancient WebView): render everything.
  if (typeof IntersectionObserver === 'undefined') {
    photos.forEach(renderOne);
    return;
  }
  detailObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      detailObserver.unobserve(e.target);
      const p = bySeq.get(Number(e.target.dataset.stopseq));
      if (p) renderOne(p);
    }
  }, {
    root: document.getElementById('detail-content'),
    rootMargin: '600px 0px',   // pre-render just below the fold too
  });
  document.querySelectorAll('#detail-content .photo-frame').forEach((f) => detailObserver.observe(f));
}

// --- Per-photo filter selection ---
// Long-press on a photo selects it (coral outline); while any photos are
// selected, taps toggle others and the Filter rail writes filterId onto
// just the selected photo records. With a uniform selection the rail
// highlights the filter the selected photos share; a mixed selection
// leaves the highlight alone (the rail is input-only there). Tapping
// empty space clears the selection and returns the rail to the
// last-used filter.
const detailContent = document.getElementById('detail-content');
const selectedPhotoSeqs = new Set();
let currentDetailPhotos = [];
// The "select photos first" toast fires at most once per detail entry —
// later no-selection taps still arm the filter, silently.
let selectToastShown = false;
let pressTimer = null;
let pressSeq = -1;
let pressX = 0;
let pressY = 0;
let suppressClick = false;

// Publish the detail frame's rect as viewport-relative insets so skin
// overlays written position:fixed + inset:0 (the export viewport) pin
// to the preview frame instead — the rail below stays reachable.
// Refreshed on detail open and on resize/orientation change.
function updateDetailFrameVars() {
  const r = detailContent.getBoundingClientRect();
  detailContent.style.setProperty('--dc-top', `${r.top}px`);
  detailContent.style.setProperty('--dc-right', `${window.innerWidth - r.right}px`);
  detailContent.style.setProperty('--dc-bottom', `${window.innerHeight - r.bottom}px`);
  detailContent.style.setProperty('--dc-left', `${r.left}px`);
}
window.addEventListener('resize', () => {
  if (document.getElementById('screen-detail').classList.contains('active')) updateDetailFrameVars();
});

function syncFilterRailToSelection() {
  // The rail only carries filters in filter mode; in skin mode the
  // selection's state is re-marked when the user switches back.
  if (railMode !== 'filter') return;
  // The Save token exists only while a selected photo carries a rolled
  // spec — when that flips, rebuild the rail without moving its scroll.
  // renderDetailRail re-enters this function with the flag already set.
  if (hasSavableSpec() !== railHasSave) {
    const scroll = railDetail.scrollLeft;
    renderDetailRail();
    railDetail.scrollLeft = scroll;
    return;
  }
  // Nothing selected, or a mixed selection: nothing is lit — a lit
  // filter only ever means "this is what the selection has".
  if (!selectedPhotoSeqs.size) { detailRail.clearSelection(); return; }
  const effs = new Set(currentDetailPhotos
    .filter((p) => selectedPhotoSeqs.has(p.stopSeq))
    .map((p) => (p.filterSpec ? 'surprise' : effectiveFilterId(p, 'original'))));
  // Highlight only — never scroll: the user may still be swiping, and a
  // programmatic re-centre reads as the rail snapping back.
  if (effs.size === 1) detailRail.setValue([...effs][0], false);
  else detailRail.clearSelection();
}

// The frame's expansion-hook inputs (.zoom-open/.zoom-shut) must
// survive lazy photo fills and filter re-renders — both replace the
// frame's contents.
const frameHooks = (frame) => [...frame.querySelectorAll('.zoom-open, .zoom-shut, .zoom-face, .zoom-back')];

function togglePhotoSelected(seq) {
  const selected = !selectedPhotoSeqs.has(seq);
  if (selected) selectedPhotoSeqs.add(seq); else selectedPhotoSeqs.delete(seq);
  detailContent.querySelector(`.photo-frame[data-stopseq="${seq}"]`)
    ?.classList.toggle('selected', selected);
  syncFilterRailToSelection();
}

function clearPhotoSelection() {
  selectedPhotoSeqs.clear();
  detailContent.querySelectorAll('.photo-frame.selected')
    .forEach((f) => f.classList.remove('selected'));
  if (railMode === 'filter') detailRail.clearSelection();
}

// Long-press on an image invites the OS save/share sheet — suppress it.
detailContent.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.photo-frame')) e.preventDefault();
});

detailContent.addEventListener('pointerdown', (e) => {
  const frame = e.target.closest('.photo-frame');
  if (!frame) return;
  pressSeq = Number(frame.dataset.stopseq);
  pressX = e.clientX;
  pressY = e.clientY;
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    pressTimer = null;
    suppressClick = true;   // the release after a long-press still fires click
    togglePhotoSelected(pressSeq);
  }, 500);
});
detailContent.addEventListener('pointermove', (e) => {
  // A moved finger is a scroll, not a long-press.
  if (pressTimer && Math.hypot(e.clientX - pressX, e.clientY - pressY) > 10) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
});
for (const type of ['pointerup', 'pointercancel']) {
  detailContent.addEventListener(type, () => {
    clearTimeout(pressTimer);
    pressTimer = null;
  });
}

detailContent.addEventListener('click', (e) => {
  if (suppressClick) { suppressClick = false; return; }
  const frame = e.target.closest('.photo-frame');
  if (!selectedPhotoSeqs.size) {
    // Outside selection mode a short tap drives the skin's expansion
    // hooks. A tap on a photo zooms it when the skin wires .zoom-open
    // (Chapters, Carousel); otherwise it toggles the card hook
    // (.stop-open, Contact Sheet's lightbox). The hooks are same-named
    // radios, so toggling one on clears any other, and toggling the
    // open one off closes. Long-press never reaches here —
    // suppressClick consumed it.
    const skinCss = getSkin(currentSkin).css;
    if (frame && skinCss.includes('.zoom-open')) {
      const zoom = frame.querySelector('.zoom-open');
      if (zoom) { zoom.checked = !zoom.checked; return; }
    }
    const open = e.target.closest('.stop')?.querySelector('.stop-open');
    if (open) open.checked = !open.checked;
    return;
  }
  // A tap off the photos clears the selection; a tap on one toggles it.
  if (frame) togglePhotoSelected(Number(frame.dataset.stopseq));
  else clearPhotoSelection();
});

// Re-render only the selected photo frames in place. A filter apply
// must not rebuild the whole detail: that remounts the trace SVG and
// flashes every frame back to its loading shimmer. Frames still
// queued in the lazy fill are left alone: effectiveSpec reads fresh
// at render time, and the specEpoch guard in renderOne keeps an
// in-flight render from stamping pre-assign pixels over this refresh.
async function refreshSelectedPhotoFrames() {
  const busy = document.getElementById('filter-busy');
  busy.dataset.token = 'busy';
  busy.textContent = 'rendering…';
  busy.hidden = false;
  try {
    for (const p of currentDetailPhotos) {
      if (!selectedPhotoSeqs.has(p.stopSeq)) continue;
      const frame = detailContent.querySelector(`.photo-frame[data-stopseq="${p.stopSeq}"]`);
      if (!frame) continue;
      const epoch = p.specEpoch || 0;
      // Let the indicator paint before the synchronous render blocks.
      await new Promise((r) => requestAnimationFrame(r));
      const { img, rawSrc } = await photoSource(p);
      if ((p.specEpoch || 0) !== epoch) continue;
      if (img) {
        const canvas = document.createElement('canvas');
        try {
          const rendered = renderDetailCanvas(img, p, effectiveSpec(p, 'original'), PREVIEW_MAX_DIM);
          canvas.width = rendered.width;
          canvas.height = rendered.height;
          canvas.getContext('2d').drawImage(rendered, 0, 0);
        } catch { canvas.width = canvas.height = 0; }
        const [open, shut, face, back] = frameHooks(frame);
        frame.replaceChildren(open, canvas, shut, face, back);
      } else if (rawSrc) {
        const [open, shut, face, back] = frameHooks(frame);
        frame.innerHTML = `<img src="${rawSrc}" alt="photo">`;
        frame.prepend(open);
        frame.append(shut, face, back);
      }
      // No source at all: leave the frame. A placeholder still
      // decoding is filled by fillDetailPhotos, which resolves
      // effectiveSpec fresh when its turn comes.
    }
  } finally {
    if (busy.dataset.token === 'busy') busy.hidden = true;
  }
}

// Selection-mode rail action: pin the chosen filter onto the selected
// photo records, then re-render just those frames in place.
// Choosing a named filter clears any Surprise spec on the photo.
async function assignFilterToSelection(filterId) {
  const busy = document.getElementById('filter-busy');
  busy.dataset.token = 'busy';
  busy.textContent = 'rendering…';
  busy.hidden = false;
  const db = await dbPromise;
  for (const p of currentDetailPhotos) {
    if (!selectedPhotoSeqs.has(p.stopSeq)) continue;
    p.filterId = filterId;
    delete p.filterSpec;
    // Invalidate any in-flight lazy render of this photo; its stale
    // pixels must not land over the refresh below.
    p.specEpoch = (p.specEpoch || 0) + 1;
    if (db) await put(db, 'photos', p);
  }
  // Assigning counts as "used" — the rail highlights it next time the
  // screen opens with nothing selected.
  currentFilter = filterId;
  savePrefs();
  await refreshSelectedPhotoFrames();
}

// Rail tail action: exactly one photo must be selected. The rolled spec
// stores on the photo record — effectiveSpec resolves it above filterId.
async function surpriseSelectedPhoto() {
  // No selection behaves like any filter tap: arm + the once-per-entry
  // nudge. The single-image warning only fires for a real multi-select.
  if (!selectedPhotoSeqs.size) {
    if (!selectToastShown) {
      selectToastShown = true;
      showToast('Long-press photos to select');
    }
    return;
  }
  if (selectedPhotoSeqs.size > 1) { showToast('Select one image only'); return; }
  const p = currentDetailPhotos.find((x) => selectedPhotoSeqs.has(x.stopSeq));
  if (!p) return;
  const busy = document.getElementById('filter-busy');
  busy.dataset.token = 'busy';
  busy.textContent = 'rendering…';
  busy.hidden = false;
  // One-off roll: seed from crypto, then everything downstream is
  // deterministic — the spec is stored, so re-renders reproduce it.
  const seed = crypto.getRandomValues
    ? crypto.getRandomValues(new Uint32Array(1))[0]
    : Date.now();
  try {
    p.filterSpec = surpriseSpec(makeRng(seed));
  } catch {
    showToast('Surprise roll failed');
    busy.hidden = true;
    return;
  }
  p.specEpoch = (p.specEpoch || 0) + 1;
  const db = await dbPromise;
  if (db) await put(db, 'photos', p);
  // The roll just made the selection savable — surface the Save token.
  syncFilterRailToSelection();
  await refreshSelectedPhotoFrames();
}

// Rail tail action (exists only while a selected photo carries a roll):
// save the rolled spec as a named custom filter in the filters store.
// The photo keeps its own spec copy — the snapshot survives the saved
// filter being renamed or deleted later.
async function saveSurpriseSpec() {
  const p = currentDetailPhotos.find((x) => selectedPhotoSeqs.has(x.stopSeq) && x.filterSpec);
  if (!p) return;
  const name = await askText({ label: 'Filter name' });
  if (!name) return;
  try {
    // importFilterSpec gives validation and slug-id dedup for free. Deep
    // copy: validateSpec normalises params in place and must not mutate
    // the photo's stored roll.
    const specCopy = JSON.parse(JSON.stringify(p.filterSpec));
    specCopy.name = name;
    const record = importFilterSpec(specCopy, allFilters().map((f) => f.id));
    record.createdAt = Date.now();
    const db = await dbPromise;
    if (db) await put(db, 'filters', record);
    else setImportedFilters([...allFilters().slice(FILTERS.length), record]);
    await refreshImportedFilters();
    showToast(`Saved filter "${record.name}"`);
  } catch (err) {
    showToast(err.message || 'Could not save filter');
  }
}

// Instruction modal — long-press isn't discoverable otherwise. Shows on
// every detail open until the user ticks "do not show again".
const photoHintOverlay = document.getElementById('photo-hint-overlay');
const photoHintNever = document.getElementById('photo-hint-never');
function dismissPhotoHint() {
  if (photoHintNever.checked) {
    seenPhotoSelectHint = true;
    savePrefs();
  }
  photoHintOverlay.hidden = true;
}
document.getElementById('btn-photo-hint-ok').addEventListener('click', dismissPhotoHint);
photoHintOverlay.addEventListener('click', (e) => {
  if (e.target === photoHintOverlay) dismissPhotoHint();
});

export async function showWalkDetail(walkId) {
  // Entry means the detail screen isn't already showing — internal
  // rebuilds (skin change, filter import, text attach) call this
  // while it is.
  const enteringDetail = !document.getElementById('screen-detail').classList.contains('active');
  if (enteringDetail) {
    selectToastShown = false;
    addFilterToastShown = false;
    railMode = 'filter';
  }
  const db = await dbPromise;
  if (!db) return;
  const walk = await get(db, 'walks', walkId);
  if (!walk) return;
  // A different walk drops any in-progress selection; re-renders of the
  // same walk (skin change, management actions) keep it.
  if (currentDetailWalk?.id !== walk.id) selectedPhotoSeqs.clear();
  currentDetailWalk = walk;
  // The walk keeps the skin it was given — viewing restores that skin to
  // the rail rather than the walk inheriting whatever happens to be
  // selected. Walks saved before this field existed fall back to the
  // current skin.
  currentSkin = walk.skin || currentSkin;

  // Load photos.
  const photos = await byIndex(db, 'photos', 'walkId', walkId);
  currentDetailPhotos = photos;

  // Build the detail content.
  const date = walk.started ? formatWalkDate(walk.started) : '?';
  const distance = walk.distanceM != null ? `, ${formatKm(walk.distanceM)}` : '';
  const voice = voiceName(walk.voice);
  const unreachable = unreachableRate(walk.stops);
  const reached = unreachable.reached;

  // Build trace SVG in the active skin's palette (its dots and strokes
  // are attributes, so they cannot be skinned with CSS). The draw-on
  // animation plays once per walk view; re-renders on skin changes
  // would otherwise replay it every tap.
  const trace = walk.trace || [];
  const animateTrace = lastAnimatedDetailWalk !== walkId;
  lastAnimatedDetailWalk = walkId;
  const svg = traceSVG({ origin: walk.origin, stops: walk.stops }, trace, getSkin(currentSkin).trace, { animate: animateTrace, gate: true });

  // Photo frames mount empty and fill asynchronously — the screen
  // appears instantly; a 480px pass lands fast, then upgrades to full
  // preview res in the background (fillDetailPhotos).
  const photoMap = new Map();
  for (const p of photos) photoMap.set(p.stopSeq, p);
  // My Voice blocks map to photos in stop order — the same mapping the
  // export uses, so the detail view previews the artifact faithfully.
  const myVoiceBlocks = Array.isArray(walk.myVoice) ? walk.myVoice : [];
  const photoSeqs = [...photoMap.keys()].sort((a, b) => a - b);
  // Same markup vocabulary as the HTML export, so the shared base styles
  // and skins behave identically here and in the exported file.
  const stopHtml = walk.stops.map((s, i) => {
    // Known aspect ratios make the placeholder the photo's real shape —
    // rebuilds stop shifting the layout while renders fill in.
    const sp = photoMap.get(s.seq);
    const arStyle = sp?.ar ? ` style="aspect-ratio:${sp.ar.toFixed(4)};height:auto"` : '';
    // The zoom-open input precedes the leaf so skins drive the expansion
    // with sibling selectors (input:checked ~ leaf), no :has() required —
    // older Safari fails to re-render :has(:checked) on state change.
    // The labels are tap surfaces for the export path (label->input
    // activation works on iOS versions that ignore taps on styled
    // inputs); in-app everything stays display:none and JS drives state.
    const photoHtml = sp
      ? `<div class="photo-frame" data-stopseq="${s.seq}"${sp.ar ? ` style="--ar:${sp.ar.toFixed(4)}"` : ''}><input type="radio" name="zoomopen" id="zoomopen-${s.seq}" class="zoom-open" aria-label="enlarge photo"><div class="photo-loading"${arStyle}></div><input type="radio" name="zoomopen" id="zoomshut-${s.seq}" class="zoom-shut" aria-label="close photo"><label class="zoom-face" for="zoomopen-${s.seq}" aria-hidden="true"></label><label class="zoom-back" for="zoomshut-${s.seq}" aria-hidden="true"></label></div>`
      : '';
    // Quiet status marks — every stop reports its outcome, but subtly:
    // small dim text, not a pill. The summary line carries the count.
    const meta = s.approached
      ? '<div class="stop-meta"><span class="status approached">close as I can get</span></div>'
      : s.reachedAt
        ? '<div class="stop-meta"><span class="status reached">reached</span></div>'
        : '<div class="stop-meta"><span class="status missed">not reached</span></div>';
    // Inner stops carry the hexagram resolved from their coordinates:
    // the glyph beside its title, then the haiku with one element per
    // line so the breaks are structural rather than white-space dependent.
    // Oracle stops reuse the same block for the drawn title, no glyph.
    const hex = s.hexagram;
    const hexHtml = hex
      ? `<div class="card-hex"><span class="glyph">${hex.glyph}</span><span class="hex-title">${hex.title}</span></div>`
      : s.oracle
        ? `<div class="card-hex"><span class="hex-title">${s.oracle.title}</span></div>`
        : '';
    const cardHtml = (hex || s.oracle)
      ? `<div class="card-text card-haiku">${(s.cardText || '').split('\n').map((l) => `<span class="haiku-line">${l}</span>`).join('')}</div>`
      : s.cardText
        ? `<div class="card-text">${s.cardText}</div>`
        : '';
    // The walker's own text sits under the photo it belongs to.
    const myIdx = photoSeqs.indexOf(s.seq);
    const myVoiceHtml = myIdx >= 0 && myVoiceBlocks[myIdx]
      ? `<div class="card-text card-haiku myvoice-text">${myVoiceBlocks[myIdx].split('\n').map((l) => `<span class="haiku-line">${esc(l)}</span>`).join('')}</div>`
      : '';
    return `<div class="stop" data-seq="${s.seq}">
      <input type="radio" name="stopcard" id="stopopen-${s.seq}" class="stop-open" aria-label="waypoint ${i + 1} details">
      <input type="radio" name="stopcard" id="stopshut-${s.seq}" class="stop-shut" aria-label="close waypoint ${i + 1}">
      <label class="stop-face" for="stopopen-${s.seq}" aria-hidden="true"></label>
      <label class="stop-back" for="stopshut-${s.seq}" aria-hidden="true"></label>
      <div class="stop-num">${i + 1}</div>
      <div class="stop-body">
        ${meta}
        ${hexHtml}
        ${cardHtml}
        ${photoHtml}
        ${myVoiceHtml}
      </div>
    </div>`;
  }).join('');

  // Blocks beyond the photo count trail the content as plain
  // paragraphs — no card rule or skin ornament (same as the export).
  const myVoiceTail = myVoiceBlocks.length > photoSeqs.length
    ? `<div class="myvoice-tail">${myVoiceBlocks.slice(photoSeqs.length)
        .map((b) => `<p>${b.split('\n').map(esc).join('<br>')}</p>`)
        .join('')}</div>`
    : '';

  // The rebuild resets scroll, and photo frames re-mount as 120px
  // placeholders — restoring scrollTop would clamp to the bottom. Keep
  // the user's place instead: remember the stop at the top of the
  // viewport (and how far it was scrolled past) and put it back.
  const anchor = [...detailContent.querySelectorAll('.stop')]
    .find((el) => el.getBoundingClientRect().bottom > detailContent.getBoundingClientRect().top);
  const anchorSeq = anchor?.dataset.seq ?? null;
  const anchorOffset = anchor
    ? anchor.getBoundingClientRect().top - detailContent.getBoundingClientRect().top
    : 0;

  document.getElementById('detail-content').innerHTML = `
    <header>
    <h1>Aimless</h1>
    <div class="seed">${walk.seed}</div>
    ${voice ? `<div class="walk-voice">Voice of ${voice}</div>` : ''}
    <div class="date">${date}${distance}</div>
    <div class="summary">
      <b>${reached}</b> of ${walk.stops.length} stops reached.
    </div>
    </header>
    <div class="trace">${svg}</div>
    ${stopHtml}
    ${myVoiceTail}
  `;

  applySkin();

  showScreen('detail');
  updateDetailFrameVars();

  // Gated trace draw. The svg's animations are emitted paused — the
  // trace does not exist yet, there is nothing to replay — and in-app
  // JS releases them at the right moment. Snap-scroller skins
  // (Chapters, Carousel) put the trace on its own screen, so the draw
  // is released only once the slide's centre reaches the port's
  // centre on the scroll axis — mandatory snap guarantees it settles
  // there (checked per scroll event; a visibility ratio would fail
  // for slides taller than the port). Other skins release at open:
  // their trace plays on load, as it always has.
  // NB: must run after showScreen — while the screen is hidden all
  // rects are zero and the centring test would pass vacuously.
  {
    if (traceScrollCheck) {
      detailContent.removeEventListener('scroll', traceScrollCheck);
      traceScrollCheck = null;
    }
    const traceSvg = detailContent.querySelector('.trace svg');
    if (traceSvg?.querySelector('.tr-line')) {
      const releaseTrace = () => {
        for (const el of traceSvg.querySelectorAll('.tr-line, .tr-dot'))
          el.style.setProperty('animation-play-state', 'running', 'important');
      };
      const snapType = getComputedStyle(detailContent).scrollSnapType;
      if (snapType === 'none') {
        releaseTrace();
      } else {
        const axis = snapType.startsWith('x') ? 'x' : 'y';
        traceScrollCheck = () => {
          const port = detailContent.getBoundingClientRect();
          const box = traceSvg.getBoundingClientRect();
          const delta = axis === 'x'
            ? Math.abs((box.left + box.width / 2) - (port.left + port.width / 2))
            : Math.abs((box.top + box.height / 2) - (port.top + port.height / 2));
          if (delta > (axis === 'x' ? port.width : port.height) * 0.1) return;
          detailContent.removeEventListener('scroll', traceScrollCheck);
          traceScrollCheck = null;
          releaseTrace();
        };
        detailContent.addEventListener('scroll', traceScrollCheck, { passive: true });
        traceScrollCheck();
      }
    }
  }
  // Restore the pre-rebuild viewport position now, and keep restoring it
  // as lazy photo renders grow the placeholders (no-op on first open —
  // the screen was hidden so no anchor was found).
  scrollAnchor = anchorSeq != null ? { seq: anchorSeq, offset: anchorOffset } : null;
  restoreScrollAnchor();
  // Sync the rail after the screen is visible so its geometry exists.
  renderDetailRail();
  // Re-mark the selection the rebuild just wiped (same walk only).
  for (const seq of selectedPhotoSeqs) {
    detailContent.querySelector(`.photo-frame[data-stopseq="${seq}"]`)
      ?.classList.add('selected');
  }
  syncFilterRailToSelection();
  if (photos.length) {
    // Explain the long-press on every entry into this screen until the
    // user opts out. Internal rebuilds don't re-trigger it.
    if (enteringDetail && !seenPhotoSelectHint) {
      photoHintNever.checked = false;
      photoHintOverlay.hidden = false;
    }
    fillDetailPhotos(photos, walk.id);
  } else {
    // No photos means no lazy fill to take the indicator over.
    document.getElementById('filter-busy').hidden = true;
  }
}

// Build the current walk's self-contained HTML export (shared by the
// Export and Share buttons). extraOpts merges into buildHTMLExport's
// opts - the publish flow passes title/headHtml for the OG head.
async function buildCurrentDetailHTML(extraOpts = {}) {
  const db = await dbPromise;
  const photos = await byIndex(db, 'photos', 'walkId', currentDetailWalk.id);
  const trace = currentDetailWalk.trace || [];
  const skin = getSkin(currentSkin);
  const svg = traceSVG({ origin: currentDetailWalk.origin, stops: currentDetailWalk.stops }, trace, skin.trace);
  // Photos embed as baked pixels: render each through the engine (the
  // detail-view cache makes this a no-op when the preview already ran).
  const rendered = [];
  for (const p of photos) {
    const url = await renderDetailPhoto(p);
    if (url && url.startsWith('data:')) rendered.push({ stopSeq: p.stopSeq, dataUrl: url, ar: p.ar });
  }
  // Every exported artifact carries OG meta. Title and description
  // always; the page/image URLs only once the walk has been published
  // (the `aimless/` folder convention tells us where the file will
  // live). A publish build passes its own headHtml and wins via
  // extraOpts.
  const headHtml = extraOpts.headHtml ?? ogHeadHtml({
    title: currentDetailWalk.seed,
    description: currentDetailWalk.neocities?.description || defaultDescription(currentDetailWalk),
    ...(currentDetailWalk.neocities?.pageUrl ? {
      url: currentDetailWalk.neocities.pageUrl,
      imageUrl: currentDetailWalk.neocities.imageUrl,
      width: 1200,
      height: 630,
      alt: `The route of an Aimless walk on ${formatWalkDate(currentDetailWalk.started)}`,
    } : {}),
  });
  return buildHTMLExport(currentDetailWalk, rendered, svg, skin.css, skin.icon, {
    includeKml: document.getElementById('opt-kml-link').checked,
    headHtml,
    ...extraOpts,
  });
}

// The artifact build renders every photo through the engine — a slow,
// synchronous-feeling wait. Show a persistent "rendering…" toast for the
// duration; the rAF gap lets it paint before the work hogs the thread.
async function buildDetailHTMLWithFeedback() {
  toastHold('rendering…');
  await new Promise((r) => requestAnimationFrame(r));
  try {
    return await buildCurrentDetailHTML();
  } finally {
    toastRelease();
  }
}

// --- Share card ---
// A square PNG shared on its own (mixed-type multi-share is dropped by
// Signal and rejected by WhatsApp): the walk's first photo cover-cropped
// to 1:1, with the planned zigzag and the actual GPS trace drawn over it
// in the active skin's palette. The caption goes in the share text.
const CARD_SIZE = 1080;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// The shared card body: background, cover-fit photo, projected route.
// w x h is 1080x1080 for the share PNG, 1200x630 for the OG JPEG.
async function drawCard(ctx, w, h, walk, photo, card) {   // photo: { dataUrl?, blob? } | null
  ctx.fillStyle = card.bg;
  ctx.fillRect(0, 0, w, h);

  if (photo) {
    // Cover-fit the photo to fill the canvas. A legacy IndexedDB blob
    // may be unreadable on iOS (WebKit corrupts them after restart) -
    // then the card is drawn without a photo rather than failing.
    const src = photo.dataUrl || URL.createObjectURL(photo.blob);
    let img = null;
    try { img = await loadImage(src); } catch { /* photo unreadable - card goes out bare */ }
    if (img) {
      const rendered = await renderPhotoToCanvas(img, { spec: effectiveSpec(photo, 'original') }, w, h);
      ctx.drawImage(rendered, 0, 0);
    }
    if (!photo.dataUrl) URL.revokeObjectURL(src);
  }

  // Project walk geometry into the canvas (same mapping as traceSVG).
  const plan = [walk.origin, ...(walk.stops || [])].filter(Boolean);
  const trace = walk.trace || [];
  const all = [...trace, ...plan];
  if (!all.length) return;
  const b = bounds(all);
  const rangeLat = (b.maxLat - b.minLat) || 0.001;
  const rangeLng = (b.maxLng - b.minLng) || 0.001;
  const geoScale = Math.min(w / rangeLng, h / rangeLat) * 0.8;
  const midLat = (b.minLat + b.maxLat) / 2;
  const midLng = (b.minLng + b.maxLng) / 2;
  const project = (p) => ({
    x: w / 2 + (p.lng - midLng) * geoScale,
    y: h / 2 - (p.lat - midLat) * geoScale,   // invert: north is up
  });

  // Routes get a dark halo pass underneath so they read over any photo.
  const drawRoute = (pts, color, width, dash) => {
    if (pts.length < 2) return;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const [style, w] of [['rgba(0,0,0,0.55)', width + 10], [color, width]]) {
      ctx.beginPath();
      pts.forEach((p, i) => {
        const { x, y } = project(p);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = style;
      ctx.lineWidth = w;
      ctx.setLineDash(dash);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  };

  drawRoute(plan, card.accent, 8, [28, 22]);   // planned zigzag
  drawRoute(trace, '#FFFFFF', 7, []);          // actual GPS route

  // Origin and stop markers.
  plan.forEach((p, i) => {
    const { x, y } = project(p);
    const r = i === 0 ? 16 : 11;
    ctx.beginPath();
    ctx.arc(x, y, r + 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? card.accent : card.fg;
    ctx.fill();
  });
}

async function buildShareCard(walk, photo) {   // photo: { dataUrl?, blob? } | null
  const { card } = getSkin(currentSkin);
  const canvas = document.createElement('canvas');
  canvas.width = CARD_SIZE;
  canvas.height = CARD_SIZE;
  const ctx = canvas.getContext('2d');
  await drawCard(ctx, CARD_SIZE, CARD_SIZE, walk, photo, card);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

// Landscape 1200x630 JPEG for the published page's og:image - same
// drawing as the share card, different frame and codec.
async function buildOgCard(walk, photo) {   // photo: { dataUrl?, blob? } | null
  const { card } = getSkin(currentSkin);
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  await drawCard(ctx, 1200, 630, walk, photo, card);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
}

// --- Bottom sheets (Walk Detail) ---
// Detail footer buttons open modal sheets that overlay the nav bar —
// sibling of the screens, reading as action sheets rather than rows
// in the controls column. makeSheet wires open/close/focus-return.
function makeSheet(sheetEl, overlayEl) {
  let returnFocus = null;
  const open = () => {
    returnFocus = document.activeElement;
    overlayEl.hidden = false;
    sheetEl.hidden = false;
    void overlayEl.offsetWidth; // force reflow so the transition runs
    overlayEl.classList.add('visible');
    sheetEl.classList.add('visible');
  };
  const close = () => {
    overlayEl.classList.remove('visible');
    sheetEl.classList.remove('visible');
    setTimeout(() => {
      overlayEl.hidden = true;
      sheetEl.hidden = true;
      if (returnFocus) { returnFocus.focus?.(); returnFocus = null; }
    }, 220);
  };
  overlayEl.addEventListener('click', close);
  return { open, close, isOpen: () => sheetEl.classList.contains('visible') };
}

const exportSheet = document.getElementById('export-sheet');
const filtersSheet = document.getElementById('filters-sheet');
const exportSheetCtl = makeSheet(exportSheet, document.getElementById('export-sheet-overlay'));
const filtersSheetCtl = makeSheet(filtersSheet, document.getElementById('filters-sheet-overlay'));

document.getElementById('btn-detail-export').addEventListener('click', () => {
  if (!currentDetailWalk) return;
  // The walker's own text attaches at export time — My Voice walks only;
  // other voices' cards already write into the artifact.
  const hasText = Array.isArray(currentDetailWalk.myVoice) && currentDetailWalk.myVoice.length > 0;
  const eligible = currentDetailWalk.voice === 'myvoice';
  document.getElementById('row-add-text').hidden = !eligible;
  document.getElementById('row-remove-text').hidden = !(eligible && hasText);
  document.getElementById('add-text-title').textContent = hasText ? 'Replace text' : 'Add text';
  const published = currentDetailWalk.neocities?.pageUrl;
  document.getElementById('neocities-sub').textContent = published
    ? published.replace(/^https:\/\//, '')
    : 'Build a page for your Neocities site';
  exportSheetCtl.open();
});
document.getElementById('opt-kml-link').addEventListener('change', savePrefs);

// My Voice: the file's blank-line-separated blocks map to the walk's
// photos in order, and persist on the walk record for re-exports.
const myVoiceFile = document.getElementById('myvoice-file');
myVoiceFile.addEventListener('change', async () => {
  const file = myVoiceFile.files[0];
  myVoiceFile.value = '';
  if (!file || !currentDetailWalk) return;
  const blocks = parseMyVoiceText(await file.text());
  if (!blocks.length) { showToast('No text blocks found in that file'); return; }
  currentDetailWalk.myVoice = blocks;
  const db = await dbPromise;
  if (db) await put(db, 'walks', currentDetailWalk);
  showWalkDetail(currentDetailWalk.id);
  showToast(`${blocks.length} text block${blocks.length === 1 ? '' : 's'} attached`);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (exportSheetCtl.isOpen()) exportSheetCtl.close();
  if (filtersSheetCtl.isOpen()) filtersSheetCtl.close();
  if (!photoHintOverlay.hidden) dismissPhotoHint();
});

// Sheet row dispatch. Each action body is the verbatim logic from the old
// per-button handlers; only the trigger changed.
exportSheet.addEventListener('click', async (e) => {
  const row = e.target.closest('.sheet-row');
  if (!row) return;
  const action = row.dataset.export;
  if (!action || !currentDetailWalk) return;
  exportSheetCtl.close();

  if (action === 'share-html') {
    const html = await buildCurrentDetailHTML();
    const filename = `aimless-${currentDetailWalk.seed}.html`;
    const file = new File([html], filename, { type: 'text/html' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Aimless walk ${currentDetailWalk.seed}` });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share failed:', err);
          downloadFile(filename, html, 'text/html');
        }
      }
    } else {
      downloadFile(filename, html, 'text/html');
    }
  } else if (action === 'download-html') {
    const filename = await askText({ defaultValue: `aimless-${currentDetailWalk.seed}`, extension: '.html' });
    if (!filename) return;
    const html = await buildDetailHTMLWithFeedback();
    downloadFile(filename, html, 'text/html');
  } else if (action === 'card') {
    // Send card: single image + text, the best-supported share payload.
    const db = await dbPromise;
    const photos = db ? await byIndex(db, 'photos', 'walkId', currentDetailWalk.id) : [];
    photos.sort((a, b) => a.stopSeq - b.stopSeq);
    let cardBlob;
    try {
      cardBlob = await buildShareCard(currentDetailWalk, photos[0] ?? null);
    } catch (err) {
      console.error('Card filter render failed:', err);
      alert(`This filter could not render on this device: ${err.message}`);
      return;
    }
    const filename = `aimless-${currentDetailWalk.seed}-card.png`;
    const cardFile = new File([cardBlob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [cardFile] })) {
      try {
        await navigator.share({
          files: [cardFile],
          text: 'Go nowhere. Somewhere.\n\nhttps://aimless.earth',
          title: 'my aimless walk',
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share failed:', err);
          downloadFile(filename, cardBlob, 'image/png');
        }
      }
    } else {
      downloadFile(filename, cardBlob, 'image/png');
    }
  } else if (action === 'neocities') {
    sitenameInput.value = neocitiesSitename;
    openPublish(neocitiesSitename ? (currentDetailWalk.neocities?.pageUrl ? 'published' : 'consent') : 'site');
  } else if (action === 'add-text') {
    myVoiceFile.click();
  } else if (action === 'remove-text') {
    delete currentDetailWalk.myVoice;
    const db = await dbPromise;
    if (db) await put(db, 'walks', currentDetailWalk);
    showWalkDetail(currentDetailWalk.id);
    showToast('Text removed');
  } else if (action === 'route') {
    // KML route export: plan path + walked trace + stop placemarks.
    // The file carries real coordinates, so confirm first.
    if (!await askConfirm("Export KML route? It contains the walk's real GPS coordinates.", 'Export')) return;
    const kml = buildKmlString(currentDetailWalk);
    const filename = `aimless-${currentDetailWalk.seed}.kml`;
    const file = new File([kml], filename, { type: 'application/vnd.google-earth.kml+xml' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Aimless route ${currentDetailWalk.seed}` });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share failed:', err);
          downloadFile(filename, kml, 'application/vnd.google-earth.kml+xml');
        }
      }
    } else {
      downloadFile(filename, kml, 'application/vnd.google-earth.kml+xml');
    }
  }
});

// --- Cross-screen interface (called from index.html) ---

export function getCurrentSkin() { return currentSkin; }

// Leaving the detail ends the visit: the trace draw-on is per-visit.
// showScreen() calls this so re-opening animates again, while in-visit
// rebuilds (skin switches) re-render without leaving and stay un-animated.
export function resetDetailVisit() { lastAnimatedDetailWalk = null; }

// Detail-owned prefs, for savePrefs() in index.html.
export function detailPrefValues() {
  return {
    skin: currentSkin,
    filter: currentFilter,
    hiddenFilters: hiddenFilters(),
    seenPhotoSelectHint,
    neocitiesSitename,
    neocitiesIndex,
  };
}

// Restores detail-owned prefs — the detail half of loadPrefs() in
// index.html. Awaited so imported filters exist before the rails render.
export async function loadDetailPrefs(prefs) {
  await refreshImportedFilters();
  currentSkin = prefs.skin ?? 'default';
  currentFilter = prefs.filter ?? 'original';
  seenPhotoSelectHint = prefs.seenPhotoSelectHint ?? false;
  neocitiesSitename = prefs.neocitiesSitename ?? '';
  neocitiesIndex = prefs.neocitiesIndex ?? '';
  setHiddenFilters(prefs.hiddenFilters);
  if (isFilterHidden(currentFilter)) currentFilter = visibleFilters()[0]?.id || 'original';
  renderManageList();
  renderDetailRail();
  applySkin();
}
