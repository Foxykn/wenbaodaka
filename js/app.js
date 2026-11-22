// 文保打卡 · 应用主逻辑
import { loadData, loadDetails, BATCHES, CATS, ERA_GROUPS } from './data.js';
import { store } from './store.js';
import { HeritageMap } from './map.js';
import { gcj02ToBd09, gcj02ToWgs84, wgs84ToGcj02, formatCoord } from './coord.js';
import { buildRoute, filterCandidates, routeMarkdown } from './route.js';
import { initI18n, setLanguage, translateDom, isEnglish, isTraditional, toSimplified, englishSummary, formatEnglishName } from './i18n.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const PAGE_SIZE = 24;
const SORT_LABELS = {
  default: '按批次与编号',
  name: '按名称',
  era: '按年代',
  random: '随机顺序',
};

const state = {
  data: null,
  filters: {
    q: '',
    prov: '',
    city: '',
    batch: 0,
    cat: -1,
    era: '',
    onlyUnvisited: false,
    onlyWish: false,
    onlyVisited: false,
  },
  sort: 'default',
  mode: 'both',
  view: 'explore',
  filtered: [],
  rendered: 0,
  activeId: '',
  mineTab: 'visited',
  map: null,
  details: {},
  detailsLoaded: new Set(),
  detailsLoading: new Map(),
  suppressCityChange: false,
  route: {
    mode: 'wish',
    cats: [],
    era: '',
    province: '',
    city: '',
    region: null,
    regionLabel: '',
    origin: '',
    originCoord: null,
    days: 3,
    date: '',
    transport: 'mixed',
    pace: 'standard',
    local: 'auto',
    excludeVisited: false,
    plan: null,
    customDays: null,
    map: null,
    drawing: false,
    drawStart: null,
    drawRect: null,
    candidateLayer: null,
    planLayer: null,
  },
  initialRouteDone: false,
};

const LOCATION_NOTES = {
  '7-1512-4-015': '岩画群由百岔河、砧子山、西拉沐沦、苇塘河等片区组成，分布范围很广；此点为百岔河片区裕顺广村北的参考位置。',
};

const dom = {};

function cacheDom() {
  const ids = [
    'exploreView', 'statsView', 'mineView', 'searchForm', 'searchInput', 'heroTotal', 'heroQuick',
    'provinceList', 'citySelect', 'cityHint', 'batchFilters', 'catFilters', 'eraSelect', 'onlyUnvisited', 'onlyWish',
    'resetFilters', 'resultCount', 'resultSub', 'activeFilters', 'viewToggle', 'sortSelect',
    'mobileProvStrip', 'split', 'map', 'mapSub', 'mapFootStats', 'zoomIn', 'zoomOut', 'zoomHome', 'layerBtn',
    'mapLegend', 'siteList', 'listSentinel', 'listEmpty', 'emptyReset', 'listHint',
    'drawer', 'drawerBackdrop', 'drawerContent', 'modalBackdrop', 'aboutModal', 'aboutClose',
    'aboutTitle', 'sourceList', 'aboutDisclaimer', 'buildDate', 'aboutTotal', 'toast',
    'backTop', 'mobileFilter', 'sidebar', 'sidebarAbout', 'sidebarClose', 'sidebarBackdrop', 'sideVisited', 'sideProgress',
    'lightbox', 'lightboxImg', 'lightboxCaption', 'lightboxClose',
    'langSelect', 'routeView', 'routeModeTabs', 'routeWishPanel', 'routeFuzzyPanel', 'routeWishList', 'routeWishCount',
    'routeWishEmpty', 'routeCatChips', 'routeEra', 'routeProvince', 'routeCity', 'routeRegionLabel',
    'routeDrawBtn', 'routeUseViewBtn', 'routeClearRegion', 'routeOrigin', 'routeCityOptions', 'routeLocate', 'routeDays',
    'routePace', 'routeLocal', 'routeExcludeVisited', 'routeGenerate', 'routeStatus', 'routeDate',
    'routeMap', 'routeMapCount', 'routeMapDraw', 'routeMapUseView', 'routeMapClear', 'routeMapRegion', 'routeMapHint', 'routeResult', 'routeLoadSaved',
    'sideProgressText', 'mineBadge', 'randomBtn', 'aboutBtn', 'statsContent', 'mineContent',
  ];
  for (const id of ids) dom[id] = document.getElementById(id);
}

// ---------- 工具 ----------
function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function icon(name, cls = '') {
  return `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}
function fmt(n) {
  return Number(n || 0).toLocaleString('zh-CN');
}
function debounce(fn, wait = 240) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
function batchMeta(n) {
  return BATCHES.find((b) => b.n === n) || BATCHES[0];
}
function catMeta(id) {
  return CATS.find((c) => c.id === id) || CATS[5];
}
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
function formatDateLong(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}
function highlight(text, terms) {
  const safe = escapeHTML(text);
  if (!terms || !terms.length) return safe;
  const pattern = terms.map((t) => escapeRegExp(t)).filter(Boolean).join('|');
  if (!pattern) return safe;
  try {
    return safe.replace(new RegExp(`(${pattern})`, 'gi'), '<mark>$1</mark>');
  } catch {
    return safe;
  }
}
function haversine(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

let toastTimer = 0;
function toast(message, ms = 2200) {
  if (!dom.toast) return;
  dom.toast.textContent = message;
  dom.toast.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('is-show'), ms);
}

function searchTerms() {
  const raw = state.filters.q.trim().toLowerCase();
  const q = isTraditional() ? toSimplified(raw) : raw;
  return q.split(/\s+/).filter(Boolean);
}

function compactSearch(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s（）()【】\[\]·•,，。、；;：:!！?？"“”'‘’\-—_/\\]/g, '');
}

function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function bigrams(value) {
  const out = new Set();
  for (let i = 0; i < value.length - 1; i++) out.add(value.slice(i, i + 2));
  return out;
}

function fuzzyScore(text, query) {
  if (!text || !query) return 0;
  if (text.includes(query)) return 1;
  const edit = 1 - editDistance(text, query) / Math.max(text.length, query.length);
  const a = bigrams(text);
  const b = bigrams(query);
  let hit = 0;
  for (const g of b) if (a.has(g)) hit++;
  const dice = a.size + b.size ? (2 * hit) / (a.size + b.size) : 0;
  return Math.max(edit, dice);
}

function buildSearchMatches() {
  const q = state.filters.q.trim();
  if (!q) {
    state.searchFuzzy = false;
    return null;
  }
  const terms = searchTerms();
  const exact = new Set();
  for (const u of state.data.units) {
    if (terms.every((t) => u.searchText.includes(t))) exact.add(u.id);
  }
  if (exact.size) {
    state.searchFuzzy = false;
    return exact;
  }
  const qNorm = compactSearch(q);
  if (qNorm.length < 2) {
    state.searchFuzzy = false;
    return new Set();
  }
  const fuzzy = new Set();
  const threshold = qNorm.length <= 3 ? 0.6 : 0.5;
  for (const u of state.data.units) {
    const names = u.fuzzyNames || [u.fuzzyText || ''];
    if (names.some((name) => fuzzyScore(name, qNorm) >= threshold)) fuzzy.add(u.id);
  }
  state.searchFuzzy = fuzzy.size > 0;
  return fuzzy;
}

// ---------- 启动 ----------
async function init() {
  cacheDom();
  await initI18n();
  bindEvents();
  dom.map.innerHTML = '<div class="map-loading"><span></span>正在摊开地图…</div>';

  try {
    const data = await loadData();
    state.data = data;
    dom.heroTotal.textContent = fmt(data.total);
    dom.aboutTotal.textContent = fmt(data.total);
    dom.buildDate.textContent = (data.builtAt || '').slice(0, 10) || '2026';
    fillAbout(data.meta);

    renderFilterOptions();
    initRouteOptions();
    initMap();
    store.subscribe(onStoreChange);
    updateProgress();
    applyFilters({ fit: true, initial: true });
    renderStats();
    renderMine();
    routeFromHash(true);

    const loading = $('.map-loading', dom.map);
    if (loading) loading.remove();
    state.initialRouteDone = true;
    window.__guobao = { state, store, dom };
  } catch (err) {
    console.error(err);
    showFatal(err);
  }
}

function showFatal(err) {
  const hint = location.protocol === 'file:'
    ? '当前是直接用 file:// 打开的。浏览器的模块与数据加载限制会阻止页面工作，请在项目目录运行 <code>npm run dev</code>，再访问 <code>http://localhost:4173</code>。'
    : '请确认 data/ 下的数据文件完整，并通过本地服务器访问。';
  document.body.innerHTML = `
    <div class="fatal">
      <div class="fatal-seal">文保</div>
      <h1>地图没能打开</h1>
      <p>${hint}</p>
      <p class="fatal-err">${escapeHTML(err?.message || String(err))}</p>
    </div>`;
}

// ---------- 筛选 ----------
function renderFilterOptions() {
  const data = state.data;
  const all = data.provinceList.reduce((s, p) => s + p.count, 0);
  dom.provinceList.innerHTML = [
    `<button class="province-item all" data-prov="">全部省份<span>${fmt(all)}</span></button>`,
    ...data.provinceList.map(
      (p) => `<button class="province-item" data-prov="${escapeHTML(p.name)}">${escapeHTML(p.name)}<span>${fmt(p.count)}</span></button>`,
    ),
  ].join('');

  dom.batchFilters.innerHTML = BATCHES.map(
    (b) => `<button class="chip" data-batch="${b.n}">${b.name}<b>${fmt(b.count)}</b></button>`,
  ).join('');

  dom.catFilters.innerHTML = CATS.map(
    (c) => `<button class="chip" data-cat="${c.id}"><i class="dot" style="--c:${c.color}"></i>${c.name}<b>${fmt(c.count)}</b></button>`,
  ).join('');

  dom.eraSelect.innerHTML = [
    '<option value="">全部年代</option>',
    ...data.eraList.filter((e) => e.count > 0).map(
      (e) => `<option value="${e.id}">${e.label}（${fmt(e.count)}）</option>`,
    ),
  ].join('');

  dom.mobileProvStrip.innerHTML = [
    `<button class="mprov-chip" data-prov="">全部<b>${fmt(all)}</b></button>`,
    ...data.provinceList.map(
      (p) => `<button class="mprov-chip" data-prov="${escapeHTML(p.name)}">${escapeHTML(p.name)}<b>${fmt(p.count)}</b></button>`,
    ),
  ].join('');
}

function matchesFilters(u, f, skip = '', terms = null) {
  if (skip !== 'prov' && f.prov && u.prov !== f.prov) return false;
  if (skip !== 'city' && skip !== 'prov' && f.city && u.city !== f.city) return false;
  if (skip !== 'batch' && f.batch && u.batch !== f.batch) return false;
  if (skip !== 'cat' && f.cat >= 0 && u.cat !== f.cat) return false;
  if (skip !== 'era' && f.era && u.eraGroup !== f.era) return false;
  if (f.onlyUnvisited && store.isVisited(u.id)) return false;
  if (f.onlyWish && !store.isWished(u.id)) return false;
  if (f.onlyVisited && !store.isVisited(u.id)) return false;
  if (f.q && (!state.searchMatchIds || !state.searchMatchIds.has(u.id))) return false;
  return true;
}

function getFiltered() {
  const f = state.filters;
  const terms = searchTerms();
  const list = state.data.units.filter((u) => matchesFilters(u, f, '', terms));
  list.sort(sorter());
  return list;
}

// 分面统计：某一项的计数 = 应用“其他筛选条件”后，该项各取值的数量
function computeFacetCounts() {
  const f = state.filters;
  const terms = searchTerms();
  const prov = new Map();
  const city = new Map();
  const batch = new Map();
  const cat = new Map();
  const era = new Map();
  let provAll = 0;
  let cityAll = 0;
  let batchAll = 0;
  let catAll = 0;
  let eraAll = 0;

  for (const u of state.data.units) {
    if (matchesFilters(u, f, 'prov', terms)) {
      prov.set(u.prov, (prov.get(u.prov) || 0) + 1);
      provAll++;
    }
    if (f.prov && matchesFilters(u, f, 'city', terms)) {
      city.set(u.city, (city.get(u.city) || 0) + 1);
      cityAll++;
    }
    if (matchesFilters(u, f, 'batch', terms)) {
      batch.set(u.batch, (batch.get(u.batch) || 0) + 1);
      batchAll++;
    }
    if (matchesFilters(u, f, 'cat', terms)) {
      cat.set(u.cat, (cat.get(u.cat) || 0) + 1);
      catAll++;
    }
    if (matchesFilters(u, f, 'era', terms)) {
      era.set(u.eraGroup, (era.get(u.eraGroup) || 0) + 1);
      eraAll++;
    }
  }
  return { prov, city, batch, cat, era, provAll, cityAll, batchAll, catAll, eraAll };
}

function updateFacetCounts() {
  if (!state.data) return;
  const counts = computeFacetCounts();
  const f = state.filters;
  const dimIfZero = (el, n) => {
    el.classList.toggle('is-zero', n === 0 && !el.classList.contains('is-active'));
  };

  $$('.province-item', dom.provinceList).forEach((el) => {
    const prov = el.dataset.prov || '';
    const n = prov ? counts.prov.get(prov) || 0 : counts.provAll;
    const shown = prov && prov === f.prov && f.city ? state.filtered.length : n;
    const span = el.querySelector('span');
    if (span) span.textContent = fmt(shown);
    el.classList.toggle('is-zero', shown === 0 && prov !== f.prov);
  });

  const cityTotals = new Map();
  for (const u of state.data.units) {
    if (u.prov === f.prov) cityTotals.set(u.city, (cityTotals.get(u.city) || 0) + 1);
  }
  const cityOptions = [...cityTotals.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hans-CN'),
  );
  state.suppressCityChange = true;
  dom.citySelect.disabled = !f.prov;
  dom.citySelect.innerHTML = f.prov
    ? [
        `<option value="">全部地级市（${fmt(counts.cityAll)}）</option>`,
        ...cityOptions.map(
          ([name]) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}（${fmt(counts.city.get(name) || 0)}）</option>`,
        ),
      ].join('')
    : '<option value="">先选择省份</option>';
  dom.citySelect.value = f.city;
  state.suppressCityChange = false;
  if (dom.cityHint) dom.cityHint.textContent = f.prov ? '数量随筛选联动' : '先选省份';

  $$('.chip[data-batch]', dom.batchFilters).forEach((el) => {
    const n = counts.batch.get(Number(el.dataset.batch)) || 0;
    const b = el.querySelector('b');
    if (b) b.textContent = fmt(n);
    dimIfZero(el, n);
  });

  $$('.chip[data-cat]', dom.catFilters).forEach((el) => {
    const n = counts.cat.get(Number(el.dataset.cat)) || 0;
    const b = el.querySelector('b');
    if (b) b.textContent = fmt(n);
    dimIfZero(el, n);
  });

  dom.eraSelect.innerHTML = [
    `<option value="">全部年代（${fmt(counts.eraAll)}）</option>`,
    ...state.data.eraList.filter((e) => e.count > 0).map(
      (e) => `<option value="${e.id}">${e.label}（${fmt(counts.era.get(e.id) || 0)}）</option>`,
    ),
  ].join('');
  dom.eraSelect.value = f.era;

  $$('.mprov-chip', dom.mobileProvStrip).forEach((el) => {
    const prov = el.dataset.prov || '';
    const n = prov ? counts.prov.get(prov) || 0 : counts.provAll;
    const shown = prov && prov === f.prov && f.city ? state.filtered.length : n;
    const b = el.querySelector('b');
    if (b) b.textContent = fmt(shown);
    el.classList.toggle('is-zero', shown === 0 && prov !== f.prov);
  });

  if (state.map) state.map.setProvinceCounts(counts.prov);
}

function sorter() {
  switch (state.sort) {
    case 'name':
      return (a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN');
    case 'era': {
      const order = new Map(ERA_GROUPS.map((g, i) => [g.id, i]));
      return (a, b) => (order.get(a.eraGroup) ?? 99) - (order.get(b.eraGroup) ?? 99) || a.era.localeCompare(b.era, 'zh');
    }
    case 'random':
      return (a, b) => a.randomRank - b.randomRank;
    default:
      return (a, b) => a.batch - b.batch || a.id.localeCompare(b.id, 'zh', { numeric: true });
  }
}

function applyFilters({ fit = false, initial = false } = {}) {
  if (!state.data) return;
  state.searchMatchIds = buildSearchMatches();
  state.filtered = getFiltered();
  state.rendered = 0;
  renderList(true);
  renderActiveFilters();
  updateResultMeta();
  updateFacetCounts();

  if (state.map) {
    state.map.setActiveProvince(state.filters.prov);
    if (fit) {
      state.map.setSites(state.filtered, { fit: state.filtered.length !== state.data.total });
      if (!state.filters.prov && state.filtered.length === state.data.total) state.map.resetView();
    } else {
      state.map.setSites(state.filtered, { fit: false });
    }
    if (state.activeId && !state.filtered.some((u) => u.id === state.activeId)) closeDetail(false);
  }

  updateFilterUI();
  if (!initial && state.view === 'explore') {
    // 筛选后回到列表顶部，但不强制滚动页面
    dom.siteList.scrollTop = 0;
  }
}

function renderActiveFilters() {
  const f = state.filters;
  const chips = [];
  if (f.q) chips.push({ key: 'q', label: `搜索 “${f.q}”` });
  if (f.era) chips.push({ key: 'era', label: ERA_GROUPS.find((e) => e.id === f.era)?.label || f.era });
  if (f.prov) chips.push({ key: 'prov', label: f.prov });
  if (f.city) chips.push({ key: 'city', label: f.city });
  if (f.cat >= 0) chips.push({ key: 'cat', label: catMeta(f.cat).name });
  if (f.batch) chips.push({ key: 'batch', label: batchMeta(f.batch).name });
  if (f.onlyUnvisited) chips.push({ key: 'onlyUnvisited', label: '未打卡' });
  if (f.onlyWish) chips.push({ key: 'onlyWish', label: '想去' });
  if (f.onlyVisited) chips.push({ key: 'onlyVisited', label: '已打卡' });

  dom.activeFilters.innerHTML = chips
    .map(
      (c) => `<span class="active-filter">${escapeHTML(c.label)}<button data-clear="${c.key}" aria-label="移除筛选">${icon('close')}</button></span>`,
    )
    .join('');
}

function updateResultMeta() {
  const n = state.filtered.length;
  dom.resultCount.textContent = fmt(n);
  const parts = [];
  if (state.filters.era) parts.push(ERA_GROUPS.find((e) => e.id === state.filters.era)?.label || state.filters.era);
  if (state.filters.prov) parts.push(state.filters.prov);
  if (state.filters.city) parts.push(state.filters.city);
  if (state.filters.cat >= 0) parts.push(catMeta(state.filters.cat).name);
  if (state.filters.batch) parts.push(batchMeta(state.filters.batch).name);
  if (state.filters.q) parts.push(state.searchFuzzy ? '模糊匹配' : '搜索');
  dom.resultSub.textContent = parts.length ? parts.join(' · ') : '八批全部';
  dom.mapFootStats.textContent = `${fmt(n)} 处 · ${new Set(state.filtered.map((u) => u.prov)).size} 省`;
  dom.mapSub.textContent = `当前 ${fmt(n)} 处 · 点击省份筛选`;
  dom.listHint.textContent = SORT_LABELS[state.sort] || '';
  dom.listEmpty.hidden = n !== 0;
}

function updateFilterUI() {
  const f = state.filters;
  $$('.province-item', dom.provinceList).forEach((el) => {
    el.classList.toggle('is-active', (el.dataset.prov || '') === f.prov);
  });
  $$('.mprov-chip', dom.mobileProvStrip).forEach((el) => {
    el.classList.toggle('is-active', (el.dataset.prov || '') === f.prov);
  });
  if (f.prov && dom.mobileProvStrip.offsetParent !== null) {
    const active = dom.mobileProvStrip.querySelector('.mprov-chip.is-active');
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
  $$('.chip[data-batch]', dom.batchFilters).forEach((el) => {
    el.classList.toggle('is-active', Number(el.dataset.batch) === f.batch);
  });
  $$('.chip[data-cat]', dom.catFilters).forEach((el) => {
    el.classList.toggle('is-active', Number(el.dataset.cat) === f.cat);
  });
  dom.eraSelect.value = f.era;
  dom.citySelect.disabled = !f.prov;
  dom.citySelect.value = f.city;
  dom.onlyUnvisited.checked = f.onlyUnvisited;
  dom.onlyWish.checked = f.onlyWish;
  dom.sortSelect.value = state.sort;
  $$('button', dom.viewToggle).forEach((b) => b.classList.toggle('is-active', b.dataset.mode === state.mode));
  dom.split.classList.toggle('mode-map', state.mode === 'map');
  dom.split.classList.toggle('mode-list', state.mode === 'list');
  $$('.legend-item[data-cat]', dom.mapLegend).forEach((el) => {
    el.classList.toggle('is-off', f.cat >= 0 && Number(el.dataset.cat) !== f.cat);
  });
}

function resetFilters() {
  state.filters = { q: '', prov: '', city: '', batch: 0, cat: -1, era: '', onlyUnvisited: false, onlyWish: false, onlyVisited: false };
  dom.searchInput.value = '';
  applyFilters({ fit: true });
  closeSidebar();
}

function setFilter(patch) {
  const next = { ...state.filters, ...patch };
  if ('prov' in patch && patch.prov !== state.filters.prov) next.city = '';
  if (next.city && !next.prov) next.city = '';
  state.filters = next;
  applyFilters({ fit: true });
}

function setFilterAndExplore(patch) {
  state.filters = { q: '', prov: '', city: '', batch: 0, cat: -1, era: '', onlyUnvisited: false, onlyWish: false, onlyVisited: false, ...patch };
  if (state.filters.city && !state.filters.prov) state.filters.city = '';
  dom.searchInput.value = state.filters.q || '';
  applyFilters({ fit: true });
  navigate('explore');
  setTimeout(scrollToWorkspace, 60);
}

// ---------- 列表 ----------
function cardHTML(u) {
  const terms = searchTerms();
  const visited = store.isVisited(u.id);
  const wish = store.isWished(u.id);
  const active = state.activeId === u.id;
  return `
    <article class="site-card ${active ? 'is-active' : ''} ${visited ? 'is-visited' : ''}" data-id="${u.id}" tabindex="0" aria-label="${escapeHTML(u.name)}">
      <div class="card-top">
        <span class="batch-badge b${u.batch}">${u.batchName.replace('第', '').replace('批', '批')}</span>
        <span class="card-name">${highlight(u.name, terms)}</span>
        <span class="card-flags">
          ${visited ? '<span class="flag visited">已打卡</span>' : ''}
          ${wish ? '<span class="flag wish">想去</span>' : ''}
          ${u.approx ? '<span class="flag approx">参考</span>' : ''}
        </span>
      </div>
      ${u.alias ? `<div class="card-alias">又称：${escapeHTML(u.alias)}</div>` : ''}
      <div class="card-meta">
        <span class="cat-label" style="--c:${u.catColor}"><i></i>${u.catName}</span>
        <span class="sep"></span><span>${escapeHTML(u.era)}</span>
        <span class="sep"></span><span>${escapeHTML(u.region)}</span>
      </div>
      <div class="card-addr">${escapeHTML(u.addr)}</div>
      <div class="card-foot">
        <button class="mini-btn ${visited ? 'is-on' : ''}" data-action="visit" aria-label="${visited ? '取消打卡' : '打卡'}">${icon('check')}${visited ? '已打卡' : '打卡'}</button>
        <button class="mini-btn wish ${wish ? 'is-on' : ''}" data-action="wish" aria-label="${wish ? '取消想去' : '加入想去'}">${icon('bookmark')}${wish ? '已想去' : '想去'}</button>
        <span class="card-code">${u.id}</span>
      </div>
    </article>`;
}

function renderList(reset = false) {
  if (reset) {
    dom.siteList.innerHTML = '';
    state.rendered = 0;
    $$('.load-more', dom.siteList).forEach((n) => n.remove());
  }
  const total = state.filtered.length;
  if (!total) {
    dom.listEmpty.hidden = false;
    return;
  }
  dom.listEmpty.hidden = true;
  const end = Math.min(state.rendered + PAGE_SIZE, total);
  let html = '';
  for (let i = state.rendered; i < end; i++) html += cardHTML(state.filtered[i]);
  dom.siteList.insertAdjacentHTML('beforeend', html);
  state.rendered = end;

  $$('.load-more', dom.siteList).forEach((n) => n.remove());
  if (state.rendered < total) {
    dom.siteList.insertAdjacentHTML(
      'beforeend',
      `<button class="load-more" type="button">加载更多 <span>${fmt(state.rendered)} / ${fmt(total)}</span></button>`,
    );
  }
}

function updateCard(id) {
  const card = dom.siteList.querySelector(`[data-id="${id}"]`);
  if (!card) return;
  const u = state.data.byId.get(id);
  if (!u) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = cardHTML(u).trim();
  card.replaceWith(wrapper.firstElementChild);
}

// ---------- 地图 ----------
function initMap() {
  const data = state.data;
  state.map = new HeritageMap(dom.map, {
    onSiteClick: (id) => openDetail(id),
    onProvinceClick: (prov) => {
      const next = state.filters.prov === prov ? '' : prov;
      setFilter({ prov: next });
      if (next) toast(next + '：' + fmt(state.filtered.length) + ' 处文保');
    },
    getUserState: (id) => ({ visited: store.isVisited(id), wish: store.isWished(id) }),
  });
  state.map.init(data.provinces, data.units, data.provCounts);

  dom.mapLegend.innerHTML = [
    ...CATS.map(
      (c) => `<button class="legend-item" data-cat="${c.id}" style="--c:${c.color}" title="只看${c.name}"><i></i>${c.name}</button>`,
    ),
    '<span class="legend-item" style="--c:transparent;cursor:default"><i style="background:transparent;border:1px dashed #8a7f6d"></i>参考位置</span>',
  ].join('');
}

// ---------- 详情 ----------
function detailLinks(u) {
  const gcj = [u.glng, u.glat];
  const bd = gcj02ToBd09(gcj[0], gcj[1]);
  const q = encodeURIComponent(u.name);
  const addr = encodeURIComponent(u.addr);
  return {
    amap: `https://uri.amap.com/marker?position=${gcj[0]},${gcj[1]}&name=${q}&src=guobao&coordinate=gaode&callnative=0`,
    baidu: `https://api.map.baidu.com/marker?location=${bd[1]},${bd[0]}&title=${q}&content=${addr}&output=html&src=webapp.guobao`,
    tencent: `https://apis.map.qq.com/uri/v1/marker?marker=coord:${u.glat},${u.glng};title:${q};addr=${addr}&referer=guobao`,
    osm: `https://www.openstreetmap.org/?mlat=${u.lat}&mlon=${u.lng}#map=15/${u.lat}/${u.lng}`,
  };
}

function nearbyOf(u, limit = 5) {
  return state.data.units
    .filter((x) => x.id !== u.id)
    .map((x) => ({ unit: x, d: haversine(u, x) }))
    .filter((x) => x.d <= 100)
    .sort((a, b) => a.d - b.d)
    .slice(0, limit);
}

function detailHTML(u) {
  const visited = store.isVisited(u.id);
  const wish = store.isWished(u.id);
  const links = detailLinks(u);
  const nearby = nearbyOf(u);
  const bm = batchMeta(u.batch);
  const cm = catMeta(u.cat);
  const note = store.getNote(u.id);
  const idx = state.filtered.findIndex((x) => x.id === u.id);
  const prev = idx > 0 ? state.filtered[idx - 1] : null;
  const next = idx >= 0 && idx < state.filtered.length - 1 ? state.filtered[idx + 1] : null;

  const nearbyHTML = nearby.length
    ? nearby
        .map(
          ({ unit, d }) => `
          <button class="nearby-item" data-action="nearby" data-id="${unit.id}">
            <span class="batch-badge b${unit.batch}">${unit.batchName.replace('第', '').replace('批', '')}</span>
            <span class="nm">${escapeHTML(unit.name)}</span>
            <span class="dist">${d < 1 ? '<1' : d.toFixed(0)} km</span>
          </button>`,
        )
        .join('')
    : '<div class="muted small" style="padding:6px 0">周边 100 公里内暂无其他文保。</div>';

  return `
    <div class="drawer-inner">
      <button class="drawer-close" data-action="close" aria-label="关闭详情">${icon('close')}</button>
      <div class="detail-head">
        <div class="detail-badges">
          <span class="batch-badge b${u.batch}">${u.batchName} · ${u.batchYear}</span>
          <span class="detail-cat" style="--c:${u.catColor}"><i></i>${u.catName}</span>
          ${u.approx ? '<span class="flag approx">参考位置</span>' : ''}
        </div>
        <h2 class="detail-name">${escapeHTML(u.name)}</h2>
        ${u.alias ? `<p class="detail-alias">又称：${escapeHTML(u.alias)}</p>` : ''}
        ${u.en && (isEnglish() || u.en.includes(' ')) ? `<p class="detail-en">${escapeHTML(isEnglish() ? formatEnglishName(u.en) : u.en)}</p>` : ''}
        <div class="detail-loc">
          ${icon('pin')}
          <div>${escapeHTML(u.region)}<small>${escapeHTML(u.addr)}</small></div>
        </div>
        <div class="detail-actions">
          <button class="big-btn primary ${visited ? 'is-on' : ''}" data-action="visit">
            ${icon('check')}${visited ? '已打卡' : '打卡'}
          </button>
          <button class="big-btn wish ${wish ? 'is-on' : ''}" data-action="wish">
            ${icon('bookmark')}${wish ? '已在想去' : '想去'}
          </button>
        </div>
        ${visited ? `<div class="detail-visited-at">${formatDateLong(store.visitedAt(u.id))} 打卡</div>` : ''}
        ${visited ? '<div class="detail-stamp" aria-hidden="true">已<br>打卡</div>' : ''}
      </div>

      <div class="detail-section">
        <div class="section-label">简介</div>
        <div class="detail-intro" id="detailIntro"><span class="media-loading">简介加载中…</span></div>
        <div class="detail-source" id="detailSource"></div>
      </div>

      <div class="detail-section">
        <div class="section-label">图片 <span class="media-count" id="detailImageCount"></span></div>
        <div class="detail-gallery" id="detailGallery"><div class="media-loading">图片加载中…</div></div>
      </div>

      <div class="detail-section">
        <div class="section-label">档案</div>
        <dl class="fact-grid">
          <div class="fact"><dt>公布批次</dt><dd>${u.batchName} · ${u.batchYear}</dd></div>
          <div class="fact"><dt>文物类别</dt><dd>${escapeHTML(cm.full)}</dd></div>
          <div class="fact"><dt>时代</dt><dd>${escapeHTML(u.era)}</dd></div>
          <div class="fact"><dt>公布编号</dt><dd class="mono">${u.id}</dd></div>
        </dl>
      </div>

      <div class="detail-section">
        <div class="section-label">位置</div>
        <div class="addr-box">
          ${escapeHTML(u.addr)}
          ${u.approx ? `<span class="approx-note">${escapeHTML(LOCATION_NOTES[u.id] || '该点位为参考位置，具体位置与保护范围请以文物部门公布信息为准。')}</span>` : ''}
        </div>
        <div class="nav-grid" style="margin-top:10px">
          <a class="nav-link" href="${links.amap}" target="_blank" rel="noopener">高德地图 ${icon('external')}</a>
          <a class="nav-link" href="${links.baidu}" target="_blank" rel="noopener">百度地图 ${icon('external')}</a>
          <a class="nav-link" href="${links.tencent}" target="_blank" rel="noopener">腾讯地图 ${icon('external')}</a>
          <a class="nav-link" href="${links.osm}" target="_blank" rel="noopener">OpenStreetMap ${icon('external')}</a>
        </div>
        <button class="nav-link" data-action="copy" style="width:100%;margin-top:8px">复制坐标 ${formatCoord(u.lng, u.lat, 5)} ${icon('copy')}</button>
        <button class="nav-link" data-action="focus" style="width:100%;margin-top:8px">在地图上定位 ${icon('target')}</button>
      </div>

      <div class="detail-section">
        <div class="section-label">我的记录</div>
        <textarea class="note-field" data-note maxlength="500" placeholder="记一笔：哪一年去的？看到了什么？">${escapeHTML(note)}</textarea>
        <div class="note-saved" data-note-status>自动保存在这台设备</div>
      </div>

      <div class="detail-section">
        <div class="section-label">附近文保</div>
        <div class="nearby-list">${nearbyHTML}</div>
      </div>

      <div class="detail-section">
        <div class="section-label">多知道一点</div>
        <p class="detail-desc">${escapeHTML(cm.desc)}</p>
        <p class="detail-desc batch-note">${escapeHTML(bm.name)}：${escapeHTML(bm.note)}${bm.count !== bm.announced ? `（本站收录 ${fmt(bm.count)} 处，含后续增补）` : ''}</p>
      </div>

      <div class="detail-pager">
        <button data-action="prev" ${prev ? '' : 'disabled'}>${icon('left')}${prev ? escapeHTML(prev.name.slice(0, 12)) : '上一处'}</button>
        <button data-action="next" ${next ? '' : 'disabled'}>${next ? escapeHTML(next.name.slice(0, 12)) : '下一处'}${icon('right')}</button>
      </div>
    </div>`;
}

function fallbackIntro(u) {
  const cm = catMeta(u.cat);
  const bm = batchMeta(u.batch);
  let text = `${u.name}位于${u.addr || u.region}，为${u.batchName}全国重点文物保护单位（${u.batchYear} 年公布），类别属${cm.full}，时代为${u.era}。`;
  text += cm.desc;
  if (!u.addr) text += `公布地址为${u.region}。`;
  if (u.approx) text += '该点位为区县级参考位置，具体保护范围以文物部门公布信息为准。';
  text += '全国重点文物保护单位的保护范围与建设控制地带由省级人民政府依法划定公布，开放时间与预约方式请以管理单位公告为准。';
  return text.slice(0, 500);
}

function galleryHTML(images) {
  if (!images.length) {
    return '<div class="media-empty">暂无图片资料</div>';
  }
  return `<div class="gallery-grid ${images.length === 1 ? 'single' : ''}">${images
    .slice(0, 8)
    .map(
      (src, index) => `<button class="gallery-item" type="button" data-action="lightbox" data-src="${escapeHTML(src)}" data-index="${index}" aria-label="查看第 ${index + 1} 张图片">
        <img src="${escapeHTML(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.closest('.gallery-item').classList.add('is-broken')">
      </button>`,
    )
    .join('')}</div>`;
}

function fillDetailMedia(u) {
  if (!u) return;
  const introEl = document.getElementById('detailIntro');
  const sourceEl = document.getElementById('detailSource');
  const galleryEl = document.getElementById('detailGallery');
  const countEl = document.getElementById('detailImageCount');
  if (!introEl || !galleryEl) return;

  const detail = state.details?.[u.id];
  const baseIntro = detail?.intro || fallbackIntro(u);
  const intro = isEnglish()
    ? `${englishSummary(u)}${detail?.intro ? `\n\nOriginal Chinese description (Baidu Baike):\n${detail.intro}` : ''}`
    : baseIntro;
  const images = (detail?.images || []).filter(Boolean).slice(0, 8);

  introEl.textContent = intro;
  if (sourceEl) {
    sourceEl.innerHTML = isEnglish()
      ? detail?.source
        ? `Text and images from <a href="${escapeHTML(detail.source)}" target="_blank" rel="noopener">Baidu Baike · ${escapeHTML(detail.sourceTitle || 'entry')} ${icon('external')}</a>; copyright remains with the original authors and Baidu Baike.`
        : 'English summary generated from the official National Key Cultural Heritage Site list; the original Chinese description is not machine-translated.'
      : detail?.source
        ? `图文资料来自 <a href="${escapeHTML(detail.source)}" target="_blank" rel="noopener">百度百科 · ${escapeHTML(detail.sourceTitle || '词条')} ${icon('external')}</a>，版权归原作者及百度百科所有。`
        : '简介由本站根据国家文物局公布的文保名录信息整理。';
  }
  if (!detail && !state.detailsLoaded.has(u.batch)) {
    galleryEl.innerHTML = '<div class="media-loading">图片加载中…</div>';
  } else {
    galleryEl.innerHTML = galleryHTML(images);
  }
  if (countEl) countEl.textContent = images.length ? `${images.length} 张` : '';
}

function ensureDetails(u) {
  if (!u) return Promise.resolve({});
  if (state.detailsLoaded.has(u.batch)) return Promise.resolve(state.details);
  if (state.detailsLoading.has(u.batch)) return state.detailsLoading.get(u.batch);
  const promise = loadDetails(u.batch)
    .then((units) => {
      Object.assign(state.details, units || {});
      state.detailsLoaded.add(u.batch);
      if (state.activeId) {
        const active = state.data?.byId.get(state.activeId);
        if (active && active.batch === u.batch) fillDetailMedia(active);
      }
      return state.details;
    })
    .finally(() => {
      state.detailsLoading.delete(u.batch);
    });
  state.detailsLoading.set(u.batch, promise);
  return promise;
}

function openDetail(id, { updateHash = true, focusMap = true } = {}) {
  const u = state.data?.byId.get(id);
  if (!u) return;
  if (state.activeId && state.activeId !== id) {
    const oldCard = dom.siteList.querySelector(`[data-id="${state.activeId}"]`);
    if (oldCard) oldCard.classList.remove('is-active');
  }
  state.activeId = id;
  dom.drawerContent.innerHTML = detailHTML(u);
  dom.drawer.classList.toggle('is-route-preview', state.view === 'route');
  fillDetailMedia(u);
  ensureDetails(u);
  dom.drawer.classList.add('is-open');
  dom.drawer.setAttribute('aria-hidden', 'false');
  dom.drawerBackdrop.classList.add('is-open');
  dom.drawerContent.scrollTop = 0;
  const card = dom.siteList.querySelector(`[data-id="${id}"]`);
  if (card) card.classList.add('is-active');
  if (state.map) {
    state.map.select(id);
    if (focusMap) state.map.focus(id);
  }
  syncBodyLock();
  closeSidebar();
  if (updateHash && location.hash !== `#/site/${id}`) {
    history.pushState(null, '', `#/site/${id}`);
  }
}

function closeDetail(updateHash = true) {
  if (!state.activeId) return;
  const oldId = state.activeId;
  state.activeId = '';
  dom.drawer.classList.remove('is-open');
  dom.drawer.setAttribute('aria-hidden', 'true');
  dom.drawerBackdrop.classList.remove('is-open');
  const card = dom.siteList.querySelector(`[data-id="${oldId}"]`);
  if (card) card.classList.remove('is-active');
  if (state.map) state.map.select('');
  syncBodyLock();
  if (updateHash && location.hash.startsWith('#/site/')) {
    history.pushState(null, '', '#/');
  }
}

function updateDetailActions() {
  const id = state.activeId;
  if (!id) return;
  const u = state.data.byId.get(id);
  if (!u) return;
  const visited = store.isVisited(id);
  const wish = store.isWished(id);
  const visitBtn = dom.drawerContent.querySelector('[data-action="visit"]');
  const wishBtn = dom.drawerContent.querySelector('[data-action="wish"]');
  if (visitBtn) {
    visitBtn.classList.toggle('is-on', visited);
    visitBtn.innerHTML = `${icon('check')}${visited ? '已打卡' : '打卡'}`;
  }
  if (wishBtn) {
    wishBtn.classList.toggle('is-on', wish);
    wishBtn.innerHTML = `${icon('bookmark')}${wish ? '已在想去' : '想去'}`;
  }
  const head = dom.drawerContent.querySelector('.detail-head');
  if (head) {
    let stamp = head.querySelector('.detail-stamp');
    let at = head.querySelector('.detail-visited-at');
    if (visited && !stamp) head.insertAdjacentHTML('beforeend', '<div class="detail-stamp" aria-hidden="true">已<br>打卡</div>');
    if (!visited && stamp) stamp.remove();
    if (visited && !at) head.insertAdjacentHTML('beforeend', `<div class="detail-visited-at">${formatDateLong(store.visitedAt(id))} 打卡</div>`);
    if (!visited && at) at.remove();
    if (visited && at) at.textContent = `${formatDateLong(store.visitedAt(id))} 打卡`;
  }
}

// ---------- 打卡操作 ----------
function handleAction(action, id, el) {
  if (!action) return;
  const targetId = id || state.activeId;
  if (action === 'visit' && targetId) {
    const now = store.toggleVisited(targetId);
    toast(now ? `已打卡：${state.data.byId.get(targetId)?.name || ''}` : '已取消打卡');
  } else if (action === 'wish' && targetId) {
    const now = store.toggleWish(targetId);
    toast(now ? '已加入想去清单' : '已从想去清单移除');
  } else if (action === 'lightbox' && el?.dataset.src) {
    openLightbox(el.dataset.src, state.data.byId.get(state.activeId)?.name || '');
  } else if (action === 'close') {
    closeDetail();
  } else if (action === 'copy' && state.activeId) {
    copyCoords(state.data.byId.get(state.activeId));
  } else if (action === 'focus' && state.activeId) {
    const unitId = state.activeId;
    closeDetail(true);
    if (window.innerWidth < 760) {
      scrollToWorkspace();
      setTimeout(() => state.map.focus(unitId), 300);
    } else {
      state.map.focus(unitId);
    }
    toast('已在地图上定位');
  } else if (action === 'nearby' && id) {
    const routePreview = state.view === 'route';
    openDetail(id, { updateHash: !routePreview, focusMap: !routePreview });
  } else if (action === 'prev' || action === 'next') {
    const idx = state.filtered.findIndex((x) => x.id === state.activeId);
    const nextIdx = action === 'prev' ? idx - 1 : idx + 1;
    if (nextIdx >= 0 && nextIdx < state.filtered.length) {
      const routePreview = state.view === 'route';
      openDetail(state.filtered[nextIdx].id, { updateHash: !routePreview, focusMap: !routePreview });
    }
  }
}

async function copyCoords(u) {
  if (!u) return;
  const text = `${u.lng}, ${u.lat}`;
  try {
    await navigator.clipboard.writeText(text);
    toast(`已复制坐标：${text}`);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast(`已复制坐标：${text}`); } catch { toast('复制失败，请手动选择坐标'); }
    ta.remove();
  }
}

// ---------- 视图切换 ----------
function navigate(view) {
  const hash = view === 'explore' ? '#/' : `#/${view}`;
  if (location.hash === hash) showView(view);
  else location.hash = hash;
}

function showView(view) {
  state.view = view;
  dom.exploreView.hidden = view !== 'explore';
  dom.routeView.hidden = view !== 'route';
  dom.statsView.hidden = view !== 'stats';
  dom.mineView.hidden = view !== 'mine';
  $$('.nav-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
  if (view !== 'explore') closeDetail(false);
  if (view === 'mine') renderMine();
  if (view === 'stats') renderStats();
  if (view === 'route') renderRouteView();
  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  if (view === 'explore') {
    setTimeout(() => state.map?.invalidate(), 80);
  }
  if (view === 'route') {
    setTimeout(() => state.route.map?.invalidateSize(), 80);
  }
}

function routeFromHash(initial = false) {
  const raw = location.hash.replace(/^#\/?/, '');
  if (raw.startsWith('site/')) {
    const id = decodeURIComponent(raw.slice(5));
    showView('explore');
    if (state.data?.byId.has(id)) {
      openDetail(id, { updateHash: false, focusMap: initial });
    }
  } else if (raw.startsWith('route')) {
    showView('route');
  } else if (raw.startsWith('stats')) {
    showView('stats');
  } else if (raw.startsWith('mine')) {
    showView('mine');
  } else {
    showView('explore');
  }
}

// ---------- AI 路线 ----------
const TRANSPORT_LABEL = { train: '火车为主', flight: '飞机为主', car: '自驾为主', mixed: '自动选择交通（高铁 / 飞机 + 市内公交 / 打车）' };
const LEG_ICON = { train: 'i-train', flight: 'i-plane', drive: 'i-car', taxi: 'i-car', walk: 'i-walk', transit: 'i-bus', lunch: 'i-clock' };
let routeEventsBound = false;

function initRouteOptions() {
  if (!state.data || state.route.optionsReady) return;
  state.route.optionsReady = true;

  dom.routeCatChips.innerHTML = CATS.map(
    (c) =>
      `<button type="button" class="chip" data-route-cat="${c.id}"><i class="dot" style="--c:${c.color}"></i>${c.name}</button>`,
  ).join('');

  dom.routeEra.innerHTML = [
    '<option value="">不限年代</option>',
    ...state.data.eraList.filter((e) => e.count > 0).map((e) => `<option value="${e.id}">${e.label}</option>`),
  ].join('');

  dom.routeProvince.innerHTML = [
    '<option value="">不限省份</option>',
    ...state.data.provinceList.map((p) => `<option value="${escapeHTML(p.name)}">${escapeHTML(p.name)}</option>`),
  ].join('');

  const cityMap = new Map();
  for (const u of state.data.units) {
    if (!u.city) continue;
    if (!cityMap.has(u.prov)) cityMap.set(u.prov, new Set());
    cityMap.get(u.prov).add(u.city);
  }
  state.route.cityMap = cityMap;
  const allCities = [...new Set(state.data.units.map((u) => u.city).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'zh-Hans-CN'),
  );
  dom.routeCityOptions.innerHTML = allCities.map((c) => `<option value="${escapeHTML(c)}"></option>`).join('');
  dom.routeCity.disabled = true;
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  state.route.date = state.route.date || now.toISOString().slice(0, 10);
  dom.routeDate.value = state.route.date;

  try {
    dom.routeLoadSaved.hidden = !localStorage.getItem('guobao.route.v1');
  } catch { /* ignore */ }
  bindRouteEvents();
  renderRouteWishlist();
}

function populateRouteCities(prov) {
  const cities = prov ? [...(state.route.cityMap?.get(prov) || [])].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')) : [];
  dom.routeCity.disabled = !prov;
  dom.routeCity.innerHTML = [
    `<option value="">${prov ? '不限城市' : '先选省份'}</option>`,
    ...cities.map((c) => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`),
  ].join('');
  if (state.route.city && !cities.includes(state.route.city)) state.route.city = '';
  dom.routeCity.value = state.route.city;
}

function renderRouteView() {
  if (!state.data) return;
  initRouteOptions();
  if (!state.route.map) initRouteMap();
  const wishMode = state.route.mode === 'wish';
  dom.routeWishPanel.hidden = !wishMode;
  dom.routeFuzzyPanel.hidden = wishMode;
  dom.routeMapDraw.hidden = wishMode;
  dom.routeMapClear.hidden = wishMode;
  $$('button', dom.routeModeTabs).forEach((b) => {
    const on = b.dataset.routeMode === state.route.mode;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', String(on));
  });
  renderRouteWishlist();
  if (!state.route.plan) {
    dom.routeStatus.textContent = '本地智能规划 · 车次 / 航班 / 开放时间以官方为准';
    dom.routeStatus.classList.remove('is-error');
  }
  populateRouteCities(state.route.province);
  updateRouteCandidates({ fit: !state.route.plan });
  setTimeout(() => state.route.map?.invalidateSize(), 70);
}

function renderRouteWishlist() {
  if (!state.data || !dom.routeWishList) return;
  const wish = store.state.wish || {};
  const rows = Object.entries(wish)
    .map(([id, v]) => ({ unit: state.data.byId.get(id), at: v?.at || '' }))
    .filter((x) => x.unit)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  dom.routeWishCount.textContent = `${fmt(rows.length)} 处`;
  dom.routeWishEmpty.hidden = rows.length > 0;
  dom.routeWishList.innerHTML = rows
    .map(
      ({ unit: u }, i) => `<div class="route-wish-item">
        <span class="idx">${i + 1}</span>
        <a class="nm" href="#/site/${u.id}">${escapeHTML(u.name)}</a>
        <span class="loc">${escapeHTML(u.city || u.prov)}</span>
        <button type="button" class="rm" data-route-wish-remove="${u.id}" aria-label="移出想去">${icon('close')}</button>
      </div>`,
    )
    .join('');
}

function routeWishIds() {
  return Object.keys(store.state.wish || {});
}

function regionBoundsLabel(region) {
  if (!region) return '未框选';
  return '已框选';
}

function updateRouteCandidates({ fit = false } = {}) {
  if (!state.data) return;
  const mode = state.route.mode;
  const list = filterCandidates({
    units: state.data.units,
    mode,
    wishIds: routeWishIds(),
    cats: state.route.cats,
    era: state.route.era,
    region: state.route.region,
    province: state.route.province,
    city: state.route.city,
    excludeVisited: state.route.excludeVisited,
    isVisited: (id) => store.isVisited(id),
  });
  state.route.candidateCount = list.length;
  state.route.candidatePool = list;
  dom.routeMapCount.textContent = `${fmt(list.length)} 处候选`;
  const areaLabel = state.route.region ? state.route.regionLabel || '已框选' : '';
  dom.routeRegionLabel.textContent = state.route.region
    ? `${areaLabel} · ${fmt(list.length)} 处`
    : '未框选';
  dom.routeMapRegion.textContent = state.route.region ? `${areaLabel} · ${fmt(list.length)} 处` : '中国 · 未框选';

  if (!state.route.map) return;
  const map = state.route.map;
  const layer = state.route.candidateLayer;
  layer.clearLayers();
  if (!state.route.plan) {
    if (!map.hasLayer(layer)) layer.addTo(map);
    const renderer = state.route.canvasRenderer;
    for (const u of list) {
      const [glng, glat] = wgs84ToGcj02(u.lng, u.lat);
      L.circleMarker([glat, glng], {
        radius: 2.2,
        stroke: false,
        fillColor: u.catColor || '#a63a2b',
        fillOpacity: 0.62,
        renderer,
      })
        .bindTooltip(`${escapeHTML(u.name)} · ${escapeHTML(u.catName)}`, { direction: 'top', offset: [0, -2] })
        .addTo(layer);
    }
  } else if (map.hasLayer(layer)) {
    map.removeLayer(layer);
  }
  if (fit && list.length) {
    const pts = list.map((u) => {
      const [glng, glat] = wgs84ToGcj02(u.lng, u.lat);
      return [glat, glng];
    });
    if (pts.length === 1) map.setView(pts[0], 8);
    else map.fitBounds(L.latLngBounds(pts), { padding: [24, 24], maxZoom: 7 });
  }
}

function setRouteDrawing(on) {
  const map = state.route.map;
  if (!map) return;
  state.route.drawing = on;
  [dom.routeDrawBtn, dom.routeMapDraw].forEach((b) => {
    if (!b) return;
    b.classList.toggle('is-active', on);
    b.textContent = on ? '拖动框选中…' : '框选区域';
  });
  const c = map.getContainer();
  if (on) {
    map.dragging.disable();
    c.style.cursor = 'crosshair';
    c.style.touchAction = 'none';
    dom.routeMapHint.textContent = '按住鼠标或手指拖出矩形；手机上更推荐用「用当前范围」。';
  } else {
    map.dragging.enable();
    c.style.cursor = '';
    c.style.touchAction = '';
    dom.routeMapHint.textContent = '缩放 / 拖动地图后点「用当前范围」，比拖矩形更适合手机。';
    if (state.route.drawRect && !state.route.region) {
      map.removeLayer(state.route.drawRect);
      state.route.drawRect = null;
    }
  }
}

function clearRouteRegion() {
  const map = state.route.map;
  if (state.route.regionRect && map) map.removeLayer(state.route.regionRect);
  state.route.regionRect = null;
  state.route.region = null;
  state.route.regionLabel = '';
  setRouteDrawing(false);
  updateRouteCandidates({ fit: true });
}

function useRouteViewport() {
  const map = state.route.map;
  if (!map) return;
  if (map.getZoom() < 5) {
    toast('先放大地图到省 / 市范围，再用当前范围');
    return;
  }
  const b = map.getBounds();
  const sw = b.getSouthWest();
  const ne = b.getNorthEast();
  if (Math.abs(ne.lat - sw.lat) < 0.02 || Math.abs(ne.lng - sw.lng) < 0.02) {
    toast('当前范围太小，请先缩放地图');
    return;
  }
  if (state.route.regionRect) map.removeLayer(state.route.regionRect);
  state.route.regionRect = L.rectangle(b, {
    color: '#a63a2b',
    weight: 1.4,
    fillColor: '#a63a2b',
    fillOpacity: 0.06,
    dashArray: '5 4',
    interactive: false,
  }).addTo(map);
  const [wswLng, wswLat] = gcj02ToWgs84(sw.lng, sw.lat);
  const [wneLng, wneLat] = gcj02ToWgs84(ne.lng, ne.lat);
  state.route.region = [
    [wswLat, wswLng],
    [wneLat, wneLng],
  ];
  state.route.regionLabel = '当前屏幕范围';
  setRouteDrawing(false);
  updateRouteCandidates({ fit: false });
  dom.routeMapHint.textContent = '已使用当前屏幕范围；缩放 / 拖动地图后可再次点「用当前范围」。';
  toast(`已选择当前地图范围 · ${fmt(state.route.candidateCount || 0)} 处候选`);
}

function initRouteMap() {
  if (state.route.map || !dom.routeMap || typeof L === 'undefined') return;
  const map = L.map(dom.routeMap, {
    center: [35, 105],
    zoom: 4,
    minZoom: 3,
    maxZoom: 16,
    zoomControl: true,
    attributionControl: false,
    boxZoom: false,
    worldCopyJump: true,
  });
  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: '1234',
    maxZoom: 18,
  }).addTo(map);
  state.route.map = map;
  state.route.canvasRenderer = L.canvas({ padding: 0.4 });
  state.route.candidateLayer = L.layerGroup();
  state.route.planLayer = L.layerGroup().addTo(map);

  const c = map.getContainer();
  c.addEventListener(
    'pointerdown',
    (e) => {
      if (!state.route.drawing) return;
      e.preventDefault();
      e.stopPropagation();
      const start = map.mouseEventToLatLng(e);
      state.route.drawStart = start;
      if (state.route.drawRect) map.removeLayer(state.route.drawRect);
      state.route.drawRect = L.rectangle(L.latLngBounds(start, start), {
        color: '#a63a2b',
        weight: 1.4,
        fillColor: '#a63a2b',
        fillOpacity: 0.08,
        dashArray: '5 4',
        interactive: false,
      }).addTo(map);
      try { c.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    },
    true,
  );
  c.addEventListener(
    'pointermove',
    (e) => {
      if (!state.route.drawing || !state.route.drawStart || !state.route.drawRect) return;
      e.preventDefault();
      const p = map.mouseEventToLatLng(e);
      state.route.drawRect.setBounds(L.latLngBounds(state.route.drawStart, p));
    },
    true,
  );
  const finish = (e) => {
    if (!state.route.drawing || !state.route.drawStart || !state.route.drawRect) return;
    e.preventDefault();
    const b = state.route.drawRect.getBounds();
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    state.route.drawStart = null;
    if (Math.abs(ne.lat - sw.lat) < 0.02 || Math.abs(ne.lng - sw.lng) < 0.02) {
      map.removeLayer(state.route.drawRect);
      state.route.drawRect = null;
      setRouteDrawing(false);
      toast('框选范围太小，请拖大一点');
      return;
    }
    if (state.route.regionRect) map.removeLayer(state.route.regionRect);
    const [wswLng, wswLat] = gcj02ToWgs84(sw.lng, sw.lat);
    const [wneLng, wneLat] = gcj02ToWgs84(ne.lng, ne.lat);
    state.route.region = [
      [wswLat, wswLng],
      [wneLat, wneLng],
    ];
    state.route.regionRect = state.route.drawRect;
    state.route.drawRect = null;
    state.route.regionLabel = '框选区域';
    setRouteDrawing(false);
    updateRouteCandidates({ fit: false });
    map.fitBounds(b, { padding: [24, 24] });
    toast(`已框选 ${fmt(state.route.candidateCount || 0)} 处候选`);
  };
  c.addEventListener('pointerup', finish, true);
  c.addEventListener('pointercancel', finish, true);
}

function drawRoutePlan(plan) {
  const map = state.route.map;
  if (!map || !plan?.ok) return;
  const layer = state.route.planLayer;
  layer.clearLayers();
  if (map.hasLayer(state.route.candidateLayer)) map.removeLayer(state.route.candidateLayer);
  const points = [];
  let n = 0;
  if (plan.summary.origin?.point) {
    const [glng, glat] = wgs84ToGcj02(plan.summary.origin.point[0], plan.summary.origin.point[1]);
    L.marker([glat, glng], {
      icon: L.divIcon({
        className: '',
        html: '<div class="route-stop-icon is-start">起</div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      }),
      zIndexOffset: 400,
    })
      .bindTooltip(`出发：${escapeHTML(plan.summary.origin.name || '当前位置')}`)
      .addTo(layer);
    points.push([glat, glng]);
  }
  for (const day of plan.days) {
    for (const s of day.sites) {
      n++;
      const [glng, glat] = wgs84ToGcj02(s.unit.lng, s.unit.lat);
      L.marker([glat, glng], {
        icon: L.divIcon({
          className: '',
          html: `<div class="route-stop-icon">${n}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
        zIndexOffset: 500 + n,
      })
        .bindTooltip(`${n}. ${escapeHTML(s.unit.name)}`, { direction: 'top', offset: [0, -12] })
        .on('click', () => { openDetail(s.unit.id, { updateHash: false, focusMap: false }); })
        .addTo(layer);
      points.push([glat, glng]);
    }
  }
  if (points.length > 1) {
    L.polyline(points, {
      color: '#a63a2b',
      weight: 2.5,
      opacity: 0.78,
      dashArray: '7 6',
    }).addTo(layer);
    map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 11 });
  } else if (points.length === 1) {
    map.setView(points[0], 11);
  }
  dom.routeMapCount.textContent = `${fmt(n)} 处 · 路线`;
  dom.routeMapRegion.textContent = state.route.region ? '已框选 · 路线' : '中国 · 路线';
}

function transportLabel(t) {
  return TRANSPORT_LABEL[t] || '混合交通';
}

function formatMinutes(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return m + ' 分钟';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? h + ' 小时 ' + r + ' 分' : h + ' 小时';
}

function formatMinutesEn(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}

function englishLegHTML(leg) {
  if (leg.type === 'visit') return '';
  const labels = {
    train: 'High-speed rail', flight: 'Flight', drive: 'Drive', taxi: 'Taxi',
    walk: 'Walk', transit: 'Bus / metro', lunch: 'Lunch / rest',
  };
  const label = labels[leg.type] || 'Transfer';
  const ic = LEG_ICON[leg.type] || 'i-route';
  let text = label;
  if (leg.type === 'lunch') text = 'Lunch / rest';
  else if (leg.type === 'train') {
    const from = leg.fromStation ? `${leg.from} (${leg.fromStation})` : leg.from;
    const to = leg.toStation ? `${leg.to} (${leg.toStation})` : leg.to;
    text = `High-speed rail: ${from} → ${to}`;
  } else if (leg.type === 'flight') {
    const from = leg.fromAirport ? `${leg.from} (${leg.fromAirport})` : leg.from;
    const to = leg.toAirport ? `${leg.to} (${leg.toAirport})` : leg.to;
    text = `Flight: ${from} → ${to}`;
  } else if (leg.to) {
    text = `${label} to ${leg.to}`;
  }
  const meta = [leg.km ? `${leg.km} km` : '', leg.min ? formatMinutesEn(leg.min) : ''].filter(Boolean).join(' · ');
  const query =
    leg.type === 'train' && leg.queryUrl
      ? `<a class="route-query" href="${escapeHTML(leg.queryUrl)}" target="_blank" rel="noopener">Check trains ${icon('external')}</a>`
      : leg.type === 'flight' && leg.queryUrl
        ? `<a class="route-query" href="${escapeHTML(leg.queryUrl)}" target="_blank" rel="noopener">Check flights ${icon('external')}</a>`
        : '';
  const nav = leg.navQuery
    ? `<div class="route-leg-nav">Navigate: <b>${escapeHTML(leg.navQuery)}</b>
        <button type="button" class="route-copy" data-route-copy="${escapeHTML(leg.navQuery)}">Copy</button>
        ${leg.amap ? `<a href="${escapeHTML(leg.amap)}" target="_blank" rel="noopener">Amap ${icon('external')}</a>` : ''}
        ${leg.navAddress ? `<span class="route-nav-addr">Address: ${escapeHTML(leg.navAddress)}</span>` : ''}
      </div>`
    : '';
  return `<div class="route-leg ${leg.type === 'lunch' ? 'is-lunch' : ''}">
    <span class="time">${escapeHTML(leg.at || '')}</span>
    <span class="route-leg-icon">${icon(ic)}</span>
    <div class="body">${escapeHTML(text)}
      ${meta ? `<div class="meta">${meta}</div>` : ''}
      ${query ? `<div class="route-query-wrap">${query}</div>` : ''}
      ${nav}
    </div>
  </div>`;
}
function legHTML(leg) {
  if (leg.type === 'visit') return '';
  if (isEnglish()) return englishLegHTML(leg);
  const ic = LEG_ICON[leg.type] || 'i-route';
  const meta = [leg.km ? `${leg.km} km` : '', leg.min ? formatMinutes(leg.min) : ''].filter(Boolean).join(' · ');
  const query =
    leg.type === 'train' && leg.queryUrl
      ? `<a class="route-query" href="${escapeHTML(leg.queryUrl)}" target="_blank" rel="noopener">12306 查车次 ${icon('external')}</a>`
      : leg.type === 'flight' && leg.queryUrl
        ? `<a class="route-query" href="${escapeHTML(leg.queryUrl)}" target="_blank" rel="noopener">查航班 ${icon('external')}</a>`
        : '';
  const nav = leg.navQuery
    ? `<div class="route-leg-nav">导航搜：<b>${escapeHTML(leg.navQuery)}</b>
        <button type="button" class="route-copy" data-route-copy="${escapeHTML(leg.navQuery)}">复制</button>
        ${leg.amap ? `<a href="${escapeHTML(leg.amap)}" target="_blank" rel="noopener">高德 ${icon('external')}</a>` : ''}
        ${leg.navAddress ? `<span class="route-nav-addr">地址：${escapeHTML(leg.navAddress)}</span>` : ''}
      </div>`
    : '';
  return `<div class="route-leg ${leg.type === 'lunch' ? 'is-lunch' : ''}">
    <span class="time">${escapeHTML(leg.at || '')}</span>
    <span class="route-leg-icon">${icon(ic)}</span>
    <div class="body">${escapeHTML(leg.text || `${leg.from || ''} → ${leg.to || ''}`)}
      ${meta ? `<div class="meta">${meta}</div>` : ''}
      ${query ? `<div class="route-query-wrap">${query}</div>` : ''}
      ${nav}
    </div>
  </div>`;
}

function renderRoutePlan(plan) {
  if (!plan?.ok) {
    dom.routeResult.innerHTML = `<div class="route-result-empty"><div class="route-result-mark">路</div><h3>${isEnglish() ? 'No route could be generated' : '这次没有排出来'}</h3><p>${escapeHTML(isEnglish() ? 'No available sites for this selection.' : plan?.error || '没有可用点位')}</p></div>`;
    return;
  }
  const s = plan.summary;
  const en = isEnglish();
  const omitted = s.omitted
    ? en
      ? `${fmt(s.omitted)} more candidates were left out; earlier-batch sites and smoother transport were preferred.`
      : `清单/区域里还有 ${fmt(s.omitted)} 处未纳入，优先保留交通更顺、批次更早的点位。`
    : '';
  const originText = s.origin?.resolved
    ? en
      ? `From ${escapeHTML(s.origin.name || 'origin')}`
      : `从 ${escapeHTML(s.origin.name || '出发地')} 出发`
    : en
      ? 'Origin not recognised; the route starts at the first site. Enter a city above or use location.'
      : '未识别出发地，路线从第一处文保开始（可以在上方填写城市或点定位）';
  const paceEn = { 轻松: 'easy', 标准: 'standard', 紧凑: 'tight' }[s.pace] || s.pace;
  const summaryHTML = `<div class="route-summary">
    <div>
      <div class="eyebrow"><span></span>${s.dayCount} DAYS · ${s.siteCount} SITES</div>
      <h3>${escapeHTML(en ? `${s.dayCount} days · ${s.siteCount} sites` : `${s.dayCount} 天 · ${s.siteCount} 处文保`)}</h3>
      <p>${s.date ? escapeHTML(s.date) + ' · ' : ''}${originText} · ${escapeHTML(en ? 'Auto transport' : transportLabel(s.transport))} · ${escapeHTML(en ? paceEn + ' pace' : s.pace + '节奏')}${s.regionLabel ? ' · ' + escapeHTML(en ? 'Selected area' : s.regionLabel) : ''}${omitted ? '<br>' + escapeHTML(omitted) : ''}</p>
      <div class="route-edit-hint">${en ? 'Use the dropdown at the end of a day to add a site, or ↑ ↓ × on each site to reorder. Times and local transport recalculate automatically.' : '可直接用每天末尾的下拉添加地点，用每处右侧的 ↑ ↓ × 调整顺序；时间与当地交通会自动重算。'}</div>
    </div>
    <div class="route-summary-side">
      <div class="route-summary-stats">
        <div><strong>${fmt(s.siteCount)}</strong><span>文保</span></div>
        <div><strong>${fmt(s.dayCount)}</strong><span>天</span></div>
        <div><strong>${fmt(s.totalKm)}</strong><span>公里估算</span></div>
        <div><strong>${fmt(s.trainCount)}</strong><span>段火车</span></div>
        <div><strong>${fmt(s.flightCount || 0)}</strong><span>段航班</span></div>
      </div>
      <div class="route-summary-actions">
        <button type="button" class="route-summary-btn" data-route-action="optimize">${icon('spark')}重新生成</button>
        <button type="button" class="route-summary-btn" data-route-action="save">${icon('check')}保存</button>
        <button type="button" class="route-summary-btn" data-route-action="markdown">${icon('download')}导出</button>
        <button type="button" class="route-summary-btn" data-route-action="print">${icon('copy')}打印</button>
      </div>
    </div>
  </div>`;
  const dayHTML = plan.days
    .map((day) => {
      const firstCity = day.sites[0]?.unit.city || '';
      const lastCity = day.sites[day.sites.length - 1]?.unit.city || '';
      const title = firstCity && lastCity && firstCity !== lastCity ? `${firstCity} → ${lastCity}` : firstCity || '当日行程';
      const legs = day.legs
        .map((leg) => {
          if (leg.type !== 'visit') return legHTML(leg);
          const s2 = day.sites.find((x) => x.unit.id === leg.siteId);
          if (!s2) return '';
          const idx = day.sites.indexOf(s2) + 1;
          const u = s2.unit;
          return `<div class="route-site">
            <span class="num">${idx}</span>
            <div class="info">
              <div class="nm"><a href="#/site/${u.id}" data-route-preview="${u.id}">${escapeHTML(u.name)}</a><span class="tag">${escapeHTML(u.catName)}</span></div>
              <div class="where">${escapeHTML(u.region || u.addr)}</div>
              <div class="when">${escapeHTML(s2.arrival)}–${escapeHTML(s2.depart)} · 建议停留 ${Math.max(30, Math.round(s2.visit / 5) * 5)} 分钟</div>
              <div class="route-site-nav">${en ? 'Navigate:' : '导航搜：'}<b>${escapeHTML(s2.nav?.query || u.name)}</b>
                <button type="button" class="route-copy" data-route-copy="${escapeHTML(s2.nav?.query || u.name)}">${en ? 'Copy' : '复制'}</button>
                ${s2.nav?.amap ? `<a href="${escapeHTML(s2.nav.amap)}" target="_blank" rel="noopener">${en ? 'Amap' : '高德'} ${icon('external')}</a>` : ''}
              </div>
              <div class="route-site-addr">${en ? 'Address:' : '地址：'}${escapeHTML(s2.nav?.address || u.addr)}</div>
            </div>
            <div class="route-edit">
              <button type="button" data-route-edit="up" data-day="${day.n}" data-id="${u.id}" aria-label="前移" ${idx === 1 ? 'disabled' : ''}>↑</button>
              <button type="button" data-route-edit="down" data-day="${day.n}" data-id="${u.id}" aria-label="后移" ${idx === day.sites.length ? 'disabled' : ''}>↓</button>
              <button type="button" data-route-edit="remove" data-day="${day.n}" data-id="${u.id}" aria-label="移出行程">×</button>
            </div>
          </div>`;
        })
        .join('');
      const used = new Set(plan.days.flatMap((d) => d.sites.map((s) => s.unit.id)));
      const lastUnit = day.sites[day.sites.length - 1]?.unit;
      const addPool = (state.route.candidatePool || [])
        .filter((u) => !used.has(u.id))
        .map((u) => ({ u, d: lastUnit ? haversine(lastUnit, u) : 0 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 40);
      const addOptions = addPool
        .map(({ u }) => `<option value="${u.id}">${escapeHTML(u.name)} · ${escapeHTML(u.city || u.prov)}</option>`)
        .join('');
      return `<article class="route-day">
        <div class="route-day-head">
          <span class="route-day-num">DAY ${day.n}</span>
          <h4>${escapeHTML(title)}</h4>
          <span>${en ? `${day.sites.length} ${day.sites.length === 1 ? 'site' : 'sites'} · ends ${escapeHTML(day.endTime)}` : `${day.sites.length} 处 · ${escapeHTML(day.endTime)} 结束`}</span>
        </div>
        <div class="route-timeline">${legs}</div>
        ${addOptions ? `<div class="route-add-row"><select data-route-add-day="${day.n}" aria-label="${en ? 'Add a site to this day' : '添加到这一天'}"><option value="">${en ? `+ Add a site to DAY ${day.n}` : `＋ 添加地点到 DAY ${day.n}`}</option>${addOptions}</select></div>` : ''}
        ${day.warning ? `<div class="route-day-note">${escapeHTML(en ? (day.crossCity ? 'This day includes cross-city travel; high-speed rail is preferred. Check 12306 for exact trains.' : 'This day is tight; consider removing a site or staying nearby.') : day.warning)}</div>` : ''}
      </article>`;
    })
    .join('');
  dom.routeResult.innerHTML = `${summaryHTML}<div class="route-days">${dayHTML}</div><div class="route-disclaimer">${s.notes.map((n) => escapeHTML(n)).join('<br>')}</div>`;
}

function routeBuildOptions(extra = {}) {
  return {
    units: state.data.units,
    mode: state.route.mode,
    wishIds: routeWishIds(),
    origin: state.route.origin,
    originCoord: state.route.originCoord,
    days: state.route.days,
    date: state.route.date,
    transport: state.route.transport,
    pace: state.route.pace,
    local: state.route.local,
    cats: state.route.cats,
    era: state.route.era,
    region: state.route.region,
    regionLabel: state.route.region ? '框选区域' : state.route.province ? dom.routeProvince.value : '',
    province: state.route.province,
    city: state.route.city,
    excludeVisited: state.route.excludeVisited,
    isVisited: (id) => store.isVisited(id),
    ...extra,
  };
}

function generateRoute() {
  if (!state.data) return;
  state.route.origin = dom.routeOrigin.value.trim();
  state.route.days = Number(dom.routeDays.value) || 3;
  state.route.date = dom.routeDate.value || state.route.date;
  state.route.transport = 'mixed';
  state.route.pace = dom.routePace.value || 'standard';
  state.route.local = dom.routeLocal.value || 'auto';
  state.route.excludeVisited = dom.routeExcludeVisited.checked;
  const plan = buildRoute(routeBuildOptions());
  if (!plan.ok) {
    state.route.plan = null;
    dom.routeStatus.textContent = plan.error;
    dom.routeStatus.classList.add('is-error');
    renderRoutePlan(plan);
    toast(plan.error);
    return;
  }
  state.route.plan = plan;
  state.route.customDays = plan.days.map((d) => d.sites.map((s) => s.unit.id));
  dom.routeStatus.textContent = isEnglish()
    ? `${plan.summary.dayCount} days · ${plan.summary.siteCount} sites · ready`
    : `${plan.summary.dayCount} 天 · ${plan.summary.siteCount} 处 · 已生成`;
  dom.routeStatus.classList.remove('is-error');
  renderRoutePlan(plan);
  drawRoutePlan(plan);
  dom.routeResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast(`已生成 ${plan.summary.dayCount} 天路线`);
}

function rebuildCustomRoute() {
  if (!state.route.customDays || !state.route.plan) return;
  const forcedDays = state.route.customDays
    .map((ids) => ids.filter((id) => state.data.byId.has(id)))
    .filter((ids) => ids.length);
  if (!forcedDays.length) {
    toast('路线里至少保留一处文保');
    return;
  }
  const plan = buildRoute(routeBuildOptions({ forcedDays }));
  if (!plan.ok) {
    dom.routeStatus.textContent = plan.error;
    dom.routeStatus.classList.add('is-error');
    toast(plan.error);
    return;
  }
  state.route.plan = plan;
  state.route.customDays = plan.days.map((d) => d.sites.map((s) => s.unit.id));
  dom.routeStatus.textContent = isEnglish() ? 'Route recalculated · times and transport updated' : '已按你的调整重新计算 · 时间与交通已更新';
  dom.routeStatus.classList.remove('is-error');
  renderRoutePlan(plan);
  drawRoutePlan(plan);
}

function loadSavedRoute() {
  try {
    const raw = localStorage.getItem('guobao.route.v1');
    if (!raw) return toast('这台设备还没有保存过路线');
    const data = JSON.parse(raw);
    if (!data?.plan?.ok) return toast('保存的路线已失效');
    state.route.plan = data.plan;
    state.route.customDays = data.plan.days.map((d) => d.sites.map((s) => s.unit.id));
    renderRoutePlan(data.plan);
    drawRoutePlan(data.plan);
    dom.routeStatus.textContent = isEnglish() ? 'Saved route loaded' : '已读取上次保存的路线';
    dom.routeStatus.classList.remove('is-error');
    toast('已读取上次路线');
  } catch {
    toast('读取失败，保存的数据可能已损坏');
  }
}

function saveRoutePlan() {
  if (!state.route.plan?.ok) return;
  try {
    localStorage.setItem('guobao.route.v1', JSON.stringify({ plan: state.route.plan, savedAt: new Date().toISOString() }));
    dom.routeLoadSaved.hidden = false;
    toast('路线已保存到这台设备');
  } catch {
    toast('保存失败，可能是浏览器空间不足');
  }
}

function downloadRoutePlan() {
  if (!state.route.plan?.ok) return;
  const md = routeMarkdown(state.route.plan);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `文保行程-${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('已导出 Markdown 行程');
}

function locateRouteOrigin() {
  if (!navigator.geolocation) {
    toast('当前浏览器不支持定位，请手动填写出发地');
    return;
  }
  dom.routeLocate.classList.add('is-loading');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.route.originCoord = [pos.coords.longitude, pos.coords.latitude];
      state.route.origin = '当前位置';
      dom.routeOrigin.value = '当前位置';
      dom.routeLocate.classList.remove('is-loading');
      toast('已使用当前位置作为出发地');
    },
    () => {
      dom.routeLocate.classList.remove('is-loading');
      toast('定位失败，请手动填写出发地');
    },
    { enableHighAccuracy: false, timeout: 8000 },
  );
}

function resetRoutePlan() {
  state.route.plan = null;
  state.route.customDays = null;
  state.route.planLayer?.clearLayers();
  dom.routeResult.innerHTML = '<div class="route-result-empty"><div class="route-result-mark">路</div><h3>还没有生成路线</h3><p>先去「想去」里收几处文保，或者切到「按兴趣区域」，框一片地方，让行程助手排一下。</p></div>';
  dom.routeStatus.textContent = '本地智能规划 · 车次 / 航班 / 开放时间以官方为准';
  dom.routeStatus.classList.remove('is-error');
}

function setRouteMode(mode) {
  if (mode === state.route.mode) return;
  state.route.mode = mode;
  resetRoutePlan();
  if (mode === 'wish' && state.route.region) clearRouteRegion();
  renderRouteView();
}

function bindRouteEvents() {
  if (routeEventsBound) return;
  routeEventsBound = true;

  dom.routeModeTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-route-mode]');
    if (btn) setRouteMode(btn.dataset.routeMode);
  });
  dom.routeCatChips.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-route-cat]');
    if (!btn) return;
    const n = Number(btn.dataset.routeCat);
    const i = state.route.cats.indexOf(n);
    if (i >= 0) state.route.cats.splice(i, 1);
    else state.route.cats.push(n);
    btn.classList.toggle('is-active', i < 0);
    updateRouteCandidates({ fit: true });
  });
  dom.routeEra.addEventListener('change', () => {
    state.route.era = dom.routeEra.value;
    updateRouteCandidates({ fit: true });
  });
  dom.routeProvince.addEventListener('change', () => {
    state.route.province = dom.routeProvince.value;
    state.route.city = '';
    populateRouteCities(state.route.province);
    updateRouteCandidates({ fit: true });
  });
  dom.routeCity.addEventListener('change', () => {
    state.route.city = dom.routeCity.value;
    updateRouteCandidates({ fit: true });
  });
  [dom.routeDrawBtn, dom.routeMapDraw].forEach((btn) => {
    btn?.addEventListener('click', () => setRouteDrawing(!state.route.drawing));
  });
  [dom.routeUseViewBtn, dom.routeMapUseView].forEach((btn) => {
    btn?.addEventListener('click', useRouteViewport);
  });
  [dom.routeClearRegion, dom.routeMapClear].forEach((btn) => {
    btn?.addEventListener('click', clearRouteRegion);
  });
  dom.routeOrigin.addEventListener('input', () => {
    state.route.origin = dom.routeOrigin.value;
    state.route.originCoord = null;
  });
  dom.routeLocate.addEventListener('click', locateRouteOrigin);
  dom.routeDays.addEventListener('change', () => { state.route.days = Number(dom.routeDays.value) || 3; if (state.route.plan) generateRoute(); });
  dom.routeDate.addEventListener('change', () => { state.route.date = dom.routeDate.value; if (state.route.plan) rebuildCustomRoute(); });
  dom.routePace.addEventListener('change', () => { state.route.pace = dom.routePace.value; if (state.route.plan) rebuildCustomRoute(); });
  dom.routeLocal.addEventListener('change', () => { state.route.local = dom.routeLocal.value; if (state.route.plan) rebuildCustomRoute(); });
  dom.routeExcludeVisited.addEventListener('change', () => {
    state.route.excludeVisited = dom.routeExcludeVisited.checked;
    updateRouteCandidates({ fit: true });
  });
  dom.routeGenerate.addEventListener('click', generateRoute);
  dom.routeLoadSaved.addEventListener('click', loadSavedRoute);
  dom.routeWishList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-route-wish-remove]');
    if (!btn) return;
    store.toggleWish(btn.dataset.routeWishRemove);
  });
  dom.routeResult.addEventListener('click', (e) => {
    const preview = e.target.closest('[data-route-preview]');
    if (preview) {
      e.preventDefault();
      openDetail(preview.dataset.routePreview, { updateHash: false, focusMap: false });
      return;
    }
    const copyBtn = e.target.closest('[data-route-copy]');
    if (copyBtn) {
      const text = copyBtn.dataset.routeCopy || '';
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => toast('已复制导航名称：' + text)).catch(() => toast('复制失败'));
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); toast('已复制导航名称：' + text); } catch { toast('复制失败'); }
        ta.remove();
      }
      return;
    }
    const edit = e.target.closest('[data-route-edit]');
    if (edit) {
      const dayIdx = Number(edit.dataset.day) - 1;
      const id = edit.dataset.id;
      const days = state.route.customDays;
      if (!days?.[dayIdx]) return;
      const arr = days[dayIdx];
      const pos = arr.indexOf(id);
      if (pos < 0) return;
      if (edit.dataset.routeEdit === 'remove') {
        if (days.flat().length <= 1) { toast('路线里至少保留一处文保'); return; }
        arr.splice(pos, 1);
      } else if (edit.dataset.routeEdit === 'up' && pos > 0) {
        [arr[pos - 1], arr[pos]] = [arr[pos], arr[pos - 1]];
      } else if (edit.dataset.routeEdit === 'down' && pos < arr.length - 1) {
        [arr[pos + 1], arr[pos]] = [arr[pos], arr[pos + 1]];
      }
      rebuildCustomRoute();
      return;
    }
    const btn = e.target.closest('[data-route-action]');
    if (!btn) return;
    if (btn.dataset.routeAction === 'save') saveRoutePlan();
    else if (btn.dataset.routeAction === 'markdown') downloadRoutePlan();
    else if (btn.dataset.routeAction === 'print') window.print();
    else if (btn.dataset.routeAction === 'optimize') generateRoute();
  });
  dom.routeResult.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-route-add-day]');
    if (!sel || !sel.value) return;
    const dayIdx = Number(sel.dataset.routeAddDay) - 1;
    if (!state.route.customDays?.[dayIdx]) return;
    state.route.customDays[dayIdx].push(sel.value);
    rebuildCustomRoute();
  });
}


function updateProgress() {
  if (!state.data) return;
  const total = state.data.total;
  const visited = store.visitedCount;
  const wish = store.wishCount;
  const pct = total ? (visited / total) * 100 : 0;
  $$('.js-mine-badge').forEach((el) => { el.textContent = String(visited); });
  if (dom.sideVisited) dom.sideVisited.textContent = String(visited);
  if (dom.sideProgress) dom.sideProgress.style.width = `${Math.min(100, pct)}%`;
  if (dom.sideProgressText) dom.sideProgressText.textContent = `${fmt(visited)} / ${fmt(total)}${wish ? ` · 想去 ${fmt(wish)}` : ''}`;
}

function onStoreChange({ type, id }) {
  updateProgress();
  if (id && state.map) state.map.refreshMarker(id);
  if (id) updateCard(id);
  updateDetailActions();
  if (type === 'clear' || type === 'import' || type === 'sync') {
    if (state.map) state.map.refreshAllMarkers();
    applyFilters({ fit: false });
    if (state.view === 'mine') renderMine();
  } else if (type === 'visit' || type === 'unvisit' || type === 'wish' || type === 'unwish') {
    if (state.filters.onlyUnvisited || state.filters.onlyWish || state.filters.onlyVisited) {
      applyFilters({ fit: false });
    }
  }
  if (state.view === 'mine') renderMine();
  if (state.view === 'route') {
    renderRouteWishlist();
    updateRouteCandidates();
  }
  if (type === 'note' && id) {
    const status = dom.drawerContent.querySelector('[data-note-status]');
    if (status) {
      status.textContent = '已保存';
      setTimeout(() => { status.textContent = '自动保存在这台设备'; }, 1600);
    }
  }
}

function provinceProgress() {
  const visited = store.visitedIds;
  const map = new Map();
  for (const id of visited) {
    const u = state.data.byId.get(id);
    if (!u) continue;
    map.set(u.prov, (map.get(u.prov) || 0) + 1);
  }
  return [...map.entries()]
    .map(([prov, n]) => ({ prov, n, total: state.data.provCounts.get(prov) || 0 }))
    .sort((a, b) => b.n - a.n || b.n / b.total - a.n / a.total)
    .slice(0, 8);
}

function trailItemHTML(entry, idx, kind) {
  const u = entry.unit;
  const note = store.getNote(u.id);
  return `
    <div class="trail-item">
      <span class="idx">${String(idx + 1).padStart(2, '0')}</span>
      <div class="body">
        <div class="nm" data-action="open" data-id="${u.id}">${escapeHTML(u.name)}</div>
        <div class="meta">${u.batchName} · ${u.catName} · ${escapeHTML(u.region)} · ${formatDate(entry.at)} ${kind === 'visit' ? '打卡' : '收藏'}</div>
        ${note ? `<div class="note">${escapeHTML(note)}</div>` : ''}
      </div>
      <div class="ops">
        <button data-action="open" data-id="${u.id}" title="查看详情">${icon('arrow')}</button>
        <button data-action="remove" data-kind="${kind}" data-id="${u.id}" title="移除">${icon('trash')}</button>
      </div>
    </div>`;
}

function renderMine() {
  if (!state.data || !dom.mineContent) return;
  const total = state.data.total;
  const visitedEntries = Object.entries(store.state.visited)
    .map(([id, e]) => ({ unit: state.data.byId.get(id), at: e.at }))
    .filter((x) => x.unit)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const wishEntries = Object.entries(store.state.wish)
    .map(([id, e]) => ({ unit: state.data.byId.get(id), at: e.at }))
    .filter((x) => x.unit)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const visited = visitedEntries.length;
  const wish = wishEntries.length;
  const pct = total ? visited / total : 0;
  const C = 2 * Math.PI * 76;
  const provs = provinceProgress();
  const visitedProvCount = new Set(visitedEntries.map((x) => x.unit.prov)).size;
  const batchCovered = new Set(visitedEntries.map((x) => x.unit.batch)).size;

  const batchRows = BATCHES.map((b) => {
    const n = visitedEntries.filter((x) => x.unit.batch === b.n).length;
    const p = b.count ? (n / b.count) * 100 : 0;
    return `<div class="progress-row">
      <span class="bar-label">${b.name}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${p.toFixed(1)}%"></div></div>
      <span class="bar-value">${fmt(n)}/${fmt(b.count)}</span>
    </div>`;
  }).join('');

  const provRows = provs.length
    ? provs.map((p) => `<div class="progress-row">
        <span class="bar-label">${escapeHTML(p.prov)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${((p.n / p.total) * 100).toFixed(1)}%"></div></div>
        <span class="bar-value">${fmt(p.n)}/${fmt(p.total)}</span>
      </div>`).join('')
    : '<div class="muted small">打卡之后，这里会出现你的省份进度。</div>';

  const list = state.mineTab === 'visited' ? visitedEntries : wishEntries;
  const listHTML = list.length
    ? list.map((e, i) => trailItemHTML(e, i, state.mineTab === 'visited' ? 'visit' : 'wish')).join('')
    : `<div class="trail-empty">
        <div class="empty-seal">${state.mineTab === 'visited' ? '迹' : '愿'}</div>
        <p>${state.mineTab === 'visited' ? '还没有打卡记录。去地图上找一处文保，点一下「打卡」。' : '想去清单还是空的。看到心动的地方，点「想去」收进来。'}</p>
        <button data-action="explore">去探索</button>
      </div>`;

  dom.mineContent.innerHTML = `
    <div class="trail-hero">
      <div class="ring-wrap">
        <svg viewBox="0 0 180 180">
          <circle class="ring-bg" cx="90" cy="90" r="76"></circle>
          <circle class="ring-fg" cx="90" cy="90" r="76" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}"></circle>
        </svg>
        <div class="ring-text"><strong>${fmt(visited)}</strong><span>已打卡 / ${fmt(total)}</span></div>
      </div>
      <div class="trail-summary">
        <h3>${visited === 0 ? '第一处，从哪里开始？' : visited < 10 ? '路刚开始，慢慢走。' : visited < 50 ? '已经走过不少地方了。' : '这份名单，正在变成你的地图。'}</h3>
        <p>打卡与想去只保存在这台设备的浏览器里，不会上传。可以导出 JSON 备份，或换设备时导入。</p>
        <div class="trail-kpis">
          <div><strong>${fmt(visited)}</strong><span>已打卡</span></div>
          <div class="wish"><strong>${fmt(wish)}</strong><span>想去</span></div>
          <div class="prov"><strong>${fmt(visitedProvCount)}</strong><span>走过的省份</span></div>
          <div><strong>${fmt(batchCovered)}/8</strong><span>覆盖批次</span></div>
        </div>
      </div>
      <div class="trail-actions">
        <button data-action="export">${icon('download')}导出</button>
        <button data-action="import">${icon('upload')}导入</button>
        <button data-action="clear">${icon('trash')}清空</button>
      </div>
    </div>

    <div class="trail-columns">
      <div class="trail-panel">
        <div class="panel-head"><h3>省份进度</h3><span>已打卡 / 全省文保</span></div>
        <div class="progress-list">${provRows}</div>
        <button class="text-link" data-action="view-visited" style="margin-top:14px">在地图上查看我的足迹 ${icon('arrow')}</button>
      </div>
      <div class="trail-panel">
        <div class="panel-head"><h3>批次进度</h3><span>八批公布</span></div>
        <div class="progress-list">${batchRows}</div>
      </div>
    </div>

    <div class="trail-panel">
      <div class="trail-tabs">
        <button class="trail-tab ${state.mineTab === 'visited' ? 'is-active' : ''}" data-action="tab" data-tab="visited">已打卡<b>${fmt(visited)}</b></button>
        <button class="trail-tab ${state.mineTab === 'wish' ? 'is-active' : ''}" data-action="tab" data-tab="wish">想去<b>${fmt(wish)}</b></button>
      </div>
      <div class="trail-list">${listHTML}</div>
    </div>`;
}

// ---------- 数据页 ----------
function renderStats() {
  if (!state.data || !dom.statsContent || dom.statsContent.dataset.ready) return;
  const data = state.data;
  const topProv = data.provinceList.slice(0, 18);
  const maxProv = topProv[0]?.count || 1;
  const provinceRows = topProv
    .map(
      (p) => `<div class="bar-row" data-prov="${escapeHTML(p.name)}">
        <span class="bar-label">${escapeHTML(p.name)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${((p.count / maxProv) * 100).toFixed(1)}%"></div></div>
        <span class="bar-value">${fmt(p.count)}</span>
      </div>`,
    )
    .join('');

  const timeline = BATCHES.map(
    (b) => `<button class="timeline-item" data-batch="${b.n}">
      <span class="yr">${b.year}</span>
      <strong>${b.name}</strong>
      <span>${fmt(b.count)} 处${b.count !== b.announced ? ' · 含增补' : ''}</span>
    </button>`,
  ).join('');

  const catTotal = CATS.reduce((s, c) => s + c.count, 0);
  const radius = 70;
  const C = 2 * Math.PI * radius;
  let offset = 0;
  const segments = CATS.map((c) => {
    const len = (c.count / catTotal) * C;
    const seg = `<circle cx="90" cy="90" r="${radius}" fill="none" stroke="${c.color}" stroke-width="22"
      stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"
      transform="rotate(-90 90 90)" data-cat="${c.id}"><title>${c.name} ${fmt(c.count)} 处</title></circle>`;
    offset += len;
    return seg;
  }).join('');
  const donutLegend = CATS.map(
    (c) => `<div class="donut-item" data-cat="${c.id}"><i style="--c:${c.color}"></i>${c.name}<b>${((c.count / catTotal) * 100).toFixed(1)}%</b><span style="color:var(--faint);font-size:10px">${fmt(c.count)}</span></div>`,
  ).join('');

  const maxEra = Math.max(...data.eraList.map((e) => e.count), 1);
  const eraRows = data.eraList
    .filter((e) => e.count > 0)
    .map(
      (e) => `<div class="era-row" data-era="${e.id}">
        <span class="bar-label">${e.label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${((e.count / maxEra) * 100).toFixed(1)}%"></div></div>
        <span class="bar-value">${fmt(e.count)}</span>
      </div>`,
    )
    .join('');

  const topBatch = [...BATCHES].sort((a, b) => b.count - a.count)[0];
  const topCat = [...CATS].sort((a, b) => b.count - a.count)[0];
  const topEra = [...data.eraList].sort((a, b) => b.count - a.count)[0];
  const avg = Math.round(data.total / data.provinceList.length);

  dom.statsContent.innerHTML = `
    <div class="stat-hero">
      <div><strong>${fmt(data.total)}</strong><span>处全国重点文物保护单位</span></div>
      <div><strong>${data.provinceCount}</strong><span>个省级行政区</span></div>
      <div><strong>8</strong><span>批公布（1961—2019）</span></div>
      <div><strong>6</strong><span>大文物类别</span></div>
    </div>

    <div class="chart-grid">
      <div class="panel">
        <div class="panel-head"><h3>省份分布</h3><span>点击省份筛选地图 · 前 18</span></div>
        <div class="bar-chart">${provinceRows}</div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>类别构成</h3><span>点击扇区查看</span></div>
        <div class="donut-wrap">
          <svg class="donut" viewBox="0 0 180 180" aria-label="文物类别构成">
            ${segments}
            <text x="90" y="93" text-anchor="middle" font-family="Songti SC, serif" font-size="22" fill="#24211b">${fmt(catTotal)}</text>
            <text x="90" y="115" text-anchor="middle" font-family="PingFang SC, sans-serif" font-size="9" letter-spacing="0.6" fill="#847b6b">处文保</text>
          </svg>
          <div class="donut-legend">${donutLegend}</div>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-bottom:20px">
      <div class="panel-head"><h3>八批时间轴</h3><span>1961—2019 · 点击批次筛选</span></div>
      <div class="timeline">${timeline}</div>
    </div>

    <div class="chart-grid">
      <div class="panel">
        <div class="panel-head"><h3>年代分布</h3><span>按时代标签归并 · 点击筛选</span></div>
        <div class="era-chart">${eraRows}</div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>几个数字</h3><span>从名单里读出来的</span></div>
        <div class="insight-grid" style="grid-template-columns:1fr;margin-top:0">
          <div class="insight"><div class="k">文保第一大省</div><div class="v">${escapeHTML(data.provinceList[0].name)} · ${fmt(data.provinceList[0].count)} 处</div><div class="d">约占全国 ${((data.provinceList[0].count / data.total) * 100).toFixed(1)}%，古建筑与古遗址尤其密集。</div></div>
          <div class="insight"><div class="k">数量最多的一批</div><div class="v">${topBatch.name} · ${fmt(topBatch.count)} 处</div><div class="d">${topBatch.year} 年公布，占全部文保的 ${((topBatch.count / data.total) * 100).toFixed(1)}%。</div></div>
          <div class="insight"><div class="k">最常见的类别</div><div class="v">${topCat.name} · ${fmt(topCat.count)} 处</div><div class="d">古建筑是这份名单里最庞大的一类，从宫殿、寺庙到桥梁、民居。</div></div>
          <div class="insight"><div class="k">最常出现的时代</div><div class="v">${topEra.label} · ${fmt(topEra.count)} 处</div><div class="d">时代标签按“史前—夏商周—秦汉—魏晋—隋唐—宋辽金—元—明—清—近现代”归并。</div></div>
          <div class="insight"><div class="k">平均每省</div><div class="v">${avg} 处</div><div class="d">31 个省级行政区的平均值；实际分布很不均衡。</div></div>
          <div class="insight"><div class="k">参考坐标</div><div class="v">${fmt(data.meta.approxCount)} 处</div><div class="d">约 ${((data.meta.approxCount / data.total) * 100).toFixed(1)}% 的点位为区县或乡镇级参考点，地图上以虚线小点表示。</div></div>
        </div>
      </div>
    </div>

    <div class="data-note">
      <strong>关于数据</strong>
      <p>${escapeHTML(data.meta.disclaimer)}</p>
      <p>名录来自国家文物局公开数据；坐标来自《中国八批 5058 处重点文物保护单位空间分布数据集》（DOI: 10.3974/geodb.2024.01.09.V1），并结合官方公布地址对明显偏离的点位做了校正。行政区划归属由坐标与阿里云 DataV 边界自动判断。</p>
    </div>`;
  dom.statsContent.dataset.ready = '1';
}

// ---------- 弹窗与杂项 ----------
function fillAbout(meta) {
  if (!meta) return;
  dom.sourceList.innerHTML = (meta.sources || [])
    .map(
      (s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${escapeHTML(s.title)} ${icon('external')}</a><p>${escapeHTML(s.desc)}</p></li>`,
    )
    .join('');
  dom.aboutDisclaimer.textContent = meta.disclaimer || '';
}

function openAbout() {
  dom.aboutModal.hidden = false;
  requestAnimationFrame(() => {
    dom.aboutModal.classList.add('is-open');
    dom.modalBackdrop.classList.add('is-open');
  });
  syncBodyLock();
}
function closeAbout() {
  dom.aboutModal.classList.remove('is-open');
  dom.modalBackdrop.classList.remove('is-open');
  setTimeout(() => { dom.aboutModal.hidden = true; }, 260);
  syncBodyLock();
}
function openLightbox(src, caption) {
  if (!src || !dom.lightbox) return;
  dom.lightboxImg.src = src;
  dom.lightboxImg.alt = caption || '文保单位图片';
  dom.lightboxCaption.textContent = caption || '';
  dom.lightbox.hidden = false;
  requestAnimationFrame(() => dom.lightbox.classList.add('is-open'));
  syncBodyLock();
}

function closeLightbox() {
  if (!dom.lightbox) return;
  dom.lightbox.classList.remove('is-open');
  setTimeout(() => {
    if (!dom.lightbox.classList.contains('is-open')) {
      dom.lightbox.hidden = true;
      dom.lightboxImg.removeAttribute('src');
    }
  }, 260);
  syncBodyLock();
}

function syncBodyLock() {
  const lock = dom.drawer.classList.contains('is-open') || dom.aboutModal.classList.contains('is-open') || dom.sidebar.classList.contains('is-open') || dom.lightbox.classList.contains('is-open');
  document.body.classList.toggle('no-scroll', lock);
}

function openSidebar() {
  dom.sidebar.classList.add('is-open');
  dom.sidebarBackdrop.classList.add('is-open');
  syncBodyLock();
}
function closeSidebar() {
  dom.sidebar.classList.remove('is-open');
  dom.sidebarBackdrop.classList.remove('is-open');
  syncBodyLock();
}

function scrollToWorkspace() {
  const workspace = $('.workspace');
  if (!workspace) return;
  const top = workspace.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top, behavior: 'smooth' });
}

function randomSite() {
  const pool = state.filtered.length ? state.filtered : state.data.units;
  if (!pool.length) return;
  let pick = pool[Math.floor(Math.random() * pool.length)];
  if (pick.id === state.activeId && pool.length > 1) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
  showView('explore');
  openDetail(pick.id, { updateHash: true, focusMap: true });
  toast(`随机访古：${pick.name}`);
}

function exportTrail() {
  if (!store.visitedCount && !store.wishCount) {
    toast('还没有可导出的记录');
    return;
  }
  const data = store.exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  a.href = url;
  a.download = `文保打卡-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('已导出 JSON 备份');
}

function importTrail() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const added = store.importData(data);
      toast(added ? `已导入 ${added} 条记录` : '没有新的记录可导入');
    } catch (err) {
      toast('导入失败：文件格式不正确');
    }
  };
  input.click();
}

function clearTrail() {
  if (!store.visitedCount && !store.wishCount && !Object.keys(store.state.notes).length) {
    toast('没有需要清空的记录');
    return;
  }
  if (!window.confirm('确定清空所有打卡、想去和笔记吗？此操作不可撤销，建议先导出备份。')) return;
  store.clear();
  toast('已清空所有记录');
}

// ---------- 事件绑定 ----------
function bindEvents() {
  $$('.nav-btn').forEach((btn) => btn.addEventListener('click', () => navigate(btn.dataset.view)));

  dom.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.filters.q = dom.searchInput.value.trim();
    applyFilters({ fit: true });
    scrollToWorkspace();
  });
  const applySearch = debounce(() => {
    state.filters.q = dom.searchInput.value.trim();
    applyFilters({ fit: true });
  }, 280);
  dom.searchInput.addEventListener('input', applySearch);
  dom.searchInput.addEventListener('search', () => {
    state.filters.q = dom.searchInput.value.trim();
    applyFilters({ fit: true });
  });

  dom.heroQuick.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-quick]');
    if (!btn) return;
    const [kind, value] = btn.dataset.quick.split(':');
    if (kind === 'random') return randomSite();
    if (kind === 'batch') setFilterAndExplore({ batch: Number(value) });
    if (kind === 'cat') setFilterAndExplore({ cat: Number(value) });
    if (kind === 'prov') setFilterAndExplore({ prov: value });
  });

  dom.provinceList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-prov]');
    if (!btn) return;
    const prov = btn.dataset.prov;
    const next = state.filters.prov === prov ? '' : prov;
    setFilter({ prov: next });
    if (next) toast(next + '：' + fmt(state.filtered.length) + ' 处文保');
  });
  dom.mobileProvStrip.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-prov]');
    if (!btn) return;
    const prov = btn.dataset.prov;
    const next = state.filters.prov === prov ? '' : prov;
    setFilter({ prov: next });
    if (next) toast(next + '：' + fmt(state.filtered.length) + ' 处文保');
  });
  dom.batchFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-batch]');
    if (!btn) return;
    const n = Number(btn.dataset.batch);
    setFilter({ batch: state.filters.batch === n ? 0 : n });
  });
  dom.catFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    const n = Number(btn.dataset.cat);
    setFilter({ cat: state.filters.cat === n ? -1 : n });
  });
  dom.eraSelect.addEventListener('change', () => setFilter({ era: dom.eraSelect.value }));
  const onCitySelectChange = () => {
    if (state.suppressCityChange) return;
    const value = dom.citySelect.value;
    if (value === state.filters.city) return;
    setFilter({ city: value });
  };
  dom.citySelect.addEventListener('input', onCitySelectChange);
  dom.citySelect.addEventListener('change', onCitySelectChange);
  dom.onlyUnvisited.addEventListener('change', () => setFilter({ onlyUnvisited: dom.onlyUnvisited.checked }));
  dom.onlyWish.addEventListener('change', () => setFilter({ onlyWish: dom.onlyWish.checked }));
  dom.resetFilters.addEventListener('click', resetFilters);
  dom.emptyReset.addEventListener('click', resetFilters);
  dom.activeFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-clear]');
    if (!btn) return;
    const key = btn.dataset.clear;
    if (key === 'q') {
      dom.searchInput.value = '';
      state.filters.q = '';
    } else if (key === 'batch') state.filters.batch = 0;
    else if (key === 'cat') state.filters.cat = -1;
    else if (key === 'prov') {
      state.filters.prov = '';
      state.filters.city = '';
    } else if (key === 'city') state.filters.city = '';
    else state.filters[key] = '';
    applyFilters({ fit: true });
  });
  dom.sortSelect.addEventListener('change', () => {
    state.sort = dom.sortSelect.value;
    applyFilters({ fit: false });
  });
  dom.viewToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    state.mode = btn.dataset.mode;
    updateFilterUI();
    state.map?.invalidate();
  });

  dom.siteList.addEventListener('click', (e) => {
    const loadMore = e.target.closest('.load-more');
    if (loadMore) {
      renderList(false);
      return;
    }
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const card = actionBtn.closest('[data-id]');
      handleAction(actionBtn.dataset.action, card?.dataset.id, actionBtn);
      return;
    }
    const card = e.target.closest('[data-id]');
    if (card) openDetail(card.dataset.id);
  });
  dom.siteList.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.site-card[data-id]');
    if (!card) return;
    e.preventDefault();
    openDetail(card.dataset.id);
  });
  dom.siteList.addEventListener('scroll', () => {
    if (state.view !== 'explore') return;
    if (state.rendered >= state.filtered.length) return;
    const el = dom.siteList;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 380) renderList(false);
  }, { passive: true });

  dom.drawerBackdrop.addEventListener('click', () => closeDetail());
  dom.lightboxClose.addEventListener('click', closeLightbox);
  dom.lightbox.addEventListener('click', (e) => { if (e.target === dom.lightbox) closeLightbox(); });
  dom.drawerContent.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (!action) return;
    handleAction(action.dataset.action, action.dataset.id, action);
  });
  dom.drawerContent.addEventListener('input', (e) => {
    const note = e.target.closest('[data-note]');
    if (!note || !state.activeId) return;
    const id = state.activeId;
    const value = note.value;
    clearTimeout(note._timer);
    note._timer = setTimeout(() => store.setNote(id, value), 450);
  });

  dom.langSelect.addEventListener('change', () => setLanguage(dom.langSelect.value));
  dom.randomBtn.addEventListener('click', randomSite);
  dom.aboutBtn.addEventListener('click', openAbout);
  dom.sidebarAbout.addEventListener('click', openAbout);
  dom.aboutClose.addEventListener('click', closeAbout);
  dom.modalBackdrop.addEventListener('click', closeAbout);

  dom.zoomIn.addEventListener('click', () => state.map?.zoomIn());
  dom.zoomOut.addEventListener('click', () => state.map?.zoomOut());
  dom.zoomHome.addEventListener('click', () => {
    setFilter({ prov: '' });
    state.map?.resetView();
  });
  dom.layerBtn.addEventListener('click', () => {
    const mode = state.map?.cycleBase();
    toast(mode === 'satellite' ? '已切换为卫星影像' : mode === 'none' ? '已隐藏底图，仅显示点位与省界' : '已切换为标准地图');
  });

  dom.mapLegend.addEventListener('click', (e) => {
    const item = e.target.closest('[data-cat]');
    if (!item) return;
    const n = Number(item.dataset.cat);
    setFilter({ cat: state.filters.cat === n ? -1 : n });
  });

  dom.mobileFilter.addEventListener('click', openSidebar);
  dom.sidebarClose.addEventListener('click', closeSidebar);
  dom.sidebarBackdrop.addEventListener('click', closeSidebar);
  document.addEventListener('click', (e) => {
    if (!dom.sidebar.classList.contains('is-open')) return;
    if (dom.sidebar.contains(e.target) || dom.mobileFilter.contains(e.target)) return;
    closeSidebar();
  });

  dom.statsContent.addEventListener('click', (e) => {
    const target = e.target.closest('[data-prov],[data-batch],[data-cat],[data-era]');
    if (!target) return;
    if (target.dataset.prov) setFilterAndExplore({ prov: target.dataset.prov });
    else if (target.dataset.batch) setFilterAndExplore({ batch: Number(target.dataset.batch) });
    else if (target.dataset.cat) setFilterAndExplore({ cat: Number(target.dataset.cat) });
    else if (target.dataset.era) setFilterAndExplore({ era: target.dataset.era });
  });

  dom.mineContent.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (!action) return;
    const act = action.dataset.action;
    if (act === 'tab') {
      state.mineTab = action.dataset.tab;
      renderMine();
    } else if (act === 'open') {
      navigate('explore');
      openDetail(action.dataset.id, { updateHash: true, focusMap: true });
    } else if (act === 'remove') {
      const id = action.dataset.id;
      if (action.dataset.kind === 'visit') store.toggleVisited(id);
      else store.toggleWish(id);
    } else if (act === 'export') exportTrail();
    else if (act === 'import') importTrail();
    else if (act === 'clear') clearTrail();
    else if (act === 'explore') navigate('explore');
    else if (act === 'view-visited') {
      state.filters = { q: '', prov: '', city: '', batch: 0, cat: -1, era: '', onlyUnvisited: false, onlyWish: false, onlyVisited: true };
      dom.searchInput.value = '';
      applyFilters({ fit: true });
      navigate('explore');
      setTimeout(scrollToWorkspace, 80);
    }
  });

  window.addEventListener('hashchange', () => {
    if (!state.data) return;
    routeFromHash(false);
  });
  window.addEventListener('scroll', () => {
    dom.backTop.classList.toggle('is-show', window.scrollY > 700);
  }, { passive: true });
  dom.backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (e.key === '/' && !typing) {
      e.preventDefault();
      dom.searchInput.focus();
      dom.searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (e.key === 'Escape') {
      if (dom.lightbox.classList.contains('is-open')) closeLightbox();
      else if (dom.aboutModal.classList.contains('is-open')) closeAbout();
      else if (dom.drawer.classList.contains('is-open')) closeDetail();
      else if (dom.sidebar.classList.contains('is-open')) closeSidebar();
      return;
    }
    if (!typing && dom.drawer.classList.contains('is-open') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      const idx = state.filtered.findIndex((x) => x.id === state.activeId);
      const next = e.key === 'ArrowLeft' ? idx - 1 : idx + 1;
      if (next >= 0 && next < state.filtered.length) openDetail(state.filtered[next].id);
    }
  });

  window.addEventListener('resize', debounce(() => state.map?.invalidate(), 200));
}

init();
