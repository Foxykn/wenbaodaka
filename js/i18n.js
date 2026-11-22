// 轻量界面本地化：简体 / 繁體 / English
// 繁体使用 OpenCC（仅在繁体模式按需加载），英文词典覆盖界面与指引；
// 文保名称、地址和原始简介保留中文，方便现场导航与核对原文。
const LANG_KEY = 'guobao.lang.v1';

export const LANGS = [
  { id: 'zh', label: '简体' },
  { id: 'zhHant', label: '繁體' },
  { id: 'en', label: 'EN' },
];

const EN = {
  '文保打卡': 'Wenbao Daka',
  '全国重点文物保护单位': 'National Key Cultural Heritage Sites',
  '探索': 'Explore',
  '数据': 'Data',
  '路线': 'Route',
  '我的足迹': 'My Trail',
  '随机访古': 'Random site',
  '关于': 'About',
  '搜索': 'Search',
  '筛选': 'Filters',
  '重置': 'Reset',
  '年代': 'Period',
  '省份': 'Province',
  '城市': 'City',
  '地级市': 'Prefecture',
  '文物类别': 'Category',
  '公布批次': 'Batch',
  '批次': 'Batch',
  '地图': 'Map',
  '仅图': 'Map only',
  '列表': 'List',
  '名称': 'Name',
  '批次 · 编号': 'Batch · ID',
  '按批次与编号排列': 'Sorted by batch and ID',
  '全部年代': 'All periods',
  '不限年代': 'Any period',
  '不限省份': 'Any province',
  '不限城市': 'Any city',
  '先选省份': 'Select a province first',
  '先选择省份': 'Select a province first',
  '全部省份': 'All provinces',
  '清空筛选': 'Clear filters',
  '没有找到匹配的文保': 'No matching heritage sites',
  '加载更多': 'Load more',
  '已加载': 'Loaded',
  '按批次与编号': 'By batch and ID',
  '随机': 'Random',
  'MY TRAIL · 我的足迹': 'MY TRAIL',
  '你走过的，': 'What you have walked,',
  '才是你的。': 'is yours.',
  '打卡与想去都只保存在这台设备的浏览器里，不会上传。可以随时导出备份。':
    'Check-ins and wishlist stay in this browser only and are never uploaded. Export a backup whenever you like.',
  '省份分布': 'By province', '类别构成': 'By category', '八批时间轴': 'Eight batches',
  '年代分布': 'By period', '几个数字': 'Key numbers', '处文保，': 'sites. ',
  '文保打卡 v1.0 · 数据构建于': 'Wenbao Daka v1.0 · data built',
  '版本': 'Version', '数据构建于': 'Data built',
  '只看还没打卡的': 'Not visited yet',
  '只看想去清单': 'Wishlist only',
  '我的打卡': 'My check-ins',
  '八批全部': 'All 8 batches',
  '名称': 'Name',
  '随便看看': 'Surprise me',
  '地图找点': 'Find on map',
  '在地图上找一处': 'Find a site on the map',
  '点击省份可筛选 · 滚轮缩放': 'Click a province to filter · scroll to zoom',
  '数据从哪来？': 'Where does the data come from?',
  '关于这份名单': 'About this list',
  '数据来源': 'Data source',
  '图文说明': 'Text & images',
  '打卡说明': 'Check-in notes',
  '坐标与地址': 'Coordinates & address',
  '国家文物局': 'National Cultural Heritage Administration',
  '全国重点文物保护单位': 'National Key Cultural Heritage Sites',
  '个省级行政区': 'provincial-level regions',
  '批公布': 'batches',
  '大类别': 'categories',
  '处文保': 'sites',
  '处': 'sites',
  '文保': 'sites',
  '天': 'days',
  '段火车': 'rail legs',
  '段航班': 'flight legs',
  '公里估算': 'est. km',
  '当地交通': 'Local transport',
  '交通方式': 'Transport',
  '出发地': 'From',
  '出发日期': 'Departure date',
  '天数': 'Days',
  '节奏': 'Pace',
  '轻松 · 每天 2 处': 'Easy · 2 sites/day',
  '标准 · 每天 3 处': 'Standard · 3 sites/day',
  '紧凑 · 每天 4 处': 'Tight · 4 sites/day',
  '自动：近步行 / 中公交 / 远打车': 'Auto: walk / transit / taxi',
  '用于车次 / 航班查询': 'for train / flight search',
  '车站/景点之间': 'between station & site',
  '如：北京 / 太原': 'e.g. Beijing / Taiyuan',
  '使用当前位置': 'Use current location',
  '复制坐标': 'Copy coordinates',
  '在地图上定位': 'Show on map',
  '附近 100 公里内暂无其他文保。': 'No other sites within 100 km.',
  '暂无其他文保': 'No other sites nearby',
  '排序': 'Sort',
  '数据构建于': 'Data built',
  '版本': 'Version',
  '公共交通优先': 'Public transport first',
  '打车为主': 'Taxi first',
  '生成路线': 'Generate route',
  '路线地图': 'Route map',
  '候选点': 'Candidates',
  '框选区域': 'Draw area',
  '用当前范围': 'Use current view',
  '清除框选': 'Clear area',
  '在地图上框选': 'Draw on map',
  '未框选': 'No area selected',
  '中国 · 未框选': 'China · no area',
  '大致区域': 'Approximate area',
  '可多选': 'multi-select',
  '可选': 'optional',
  '按想去清单': 'From wishlist',
  '按兴趣区域': 'By interest area',
  '我的想去清单': 'My wishlist',
  '去探索添加 →': 'Add from Explore →',
  '排除已打卡': 'Exclude visited',
  '读取上次路线': 'Load saved route',
  '还没有生成路线': 'No route yet',
  '保存': 'Save',
  '导出': 'Export',
  '打印': 'Print',
  '重新生成': 'Regenerate',
  '简介': 'Overview',
  '图片': 'Photos',
  '档案': 'Facts',
  '位置': 'Location',
  '我的记录': 'My notes',
  '附近文保': 'Nearby sites',
  '多知道一点': 'More',
  '公布编号': 'Official ID',
  '地址': 'Address',
  '导航': 'Navigate',
  '上一处': 'Previous',
  '下一处': 'Next',
  '暂无图片资料': 'No images available',
  '简介加载中…': 'Loading overview…',
  '图片加载中…': 'Loading photos…',
  '打卡': 'Check in',
  '已打卡': 'Visited',
  '想去': 'Wishlist',
  '已在想去': 'In wishlist',
  '已想去': 'In wishlist',
  '复制': 'Copy',
  '高德': 'Amap',
  '参考位置': 'Approx. location',
  '古遗址': 'Archaeological site',
  '古墓葬': 'Tomb / cemetery',
  '古建筑': 'Historic building',
  '石窟寺': 'Cave temple',
  '石窟寺及石刻': 'Cave temple & rock carving',
  '近现代': 'Modern heritage',
  '近现代重要史迹及代表性建筑': 'Modern historic site / building',
  '其他': 'Other',
  '史前': 'Prehistoric',
  '夏商周': 'Xia–Shang–Zhou',
  '秦汉': 'Qin–Han',
  '魏晋南北朝': 'Wei–Jin–Northern & Southern',
  '隋唐五代': 'Sui–Tang–Five Dynasties',
  '宋辽金': 'Song–Liao–Jin',
  '元': 'Yuan',
  '明': 'Ming',
  '清': 'Qing',
  '其他 / 跨代': 'Other / multi-period',
  '北京': 'Beijing', '天津': 'Tianjin', '河北': 'Hebei', '山西': 'Shanxi',
  '内蒙古': 'Inner Mongolia', '辽宁': 'Liaoning', '吉林': 'Jilin',
  '黑龙江': 'Heilongjiang', '上海': 'Shanghai', '江苏': 'Jiangsu',
  '浙江': 'Zhejiang', '安徽': 'Anhui', '福建': 'Fujian', '江西': 'Jiangxi',
  '山东': 'Shandong', '河南': 'Henan', '湖北': 'Hubei', '湖南': 'Hunan',
  '广东': 'Guangdong', '广西': 'Guangxi', '海南': 'Hainan', '重庆': 'Chongqing',
  '四川': 'Sichuan', '贵州': 'Guizhou', '云南': 'Yunnan', '西藏': 'Tibet',
  '陕西': 'Shaanxi', '甘肃': 'Gansu', '青海': 'Qinghai', '宁夏': 'Ningxia',
  '新疆': 'Xinjiang', '香港': 'Hong Kong', '澳门': 'Macao', '台湾': 'Taiwan',
  '第一批 · 1961': 'Batch 1 · 1961',
  '第二批 · 1982': 'Batch 2 · 1982',
  '第三批 · 1988': 'Batch 3 · 1988',
  '第四批 · 1996': 'Batch 4 · 1996',
  '第五批 · 2001': 'Batch 5 · 2001',
  '第六批 · 2006': 'Batch 6 · 2006',
  '第七批 · 2013': 'Batch 7 · 2013',
  '第八批 · 2019': 'Batch 8 · 2019',
  'AI 路线': 'AI Route',
  '把五千年，': 'Five thousand years,',
  '走成一张地图。': 'mapped for the road.',
  '从第一批 180 处到第八批 762 处，按省份、批次、年代与类型逛一逛，把想去的地方收进自己的访古清单。':
    'From 180 sites in the first batch to 762 in the eighth, browse by province, batch, period and type, and save the places you want to see.',
  '五千年山河': 'Five thousand years',
  '皆在脚下': 'all within reach',
  '数据从哪来？': 'Where does the data come from?',
  '全国重点文物保护单位': 'National Key Cultural Heritage Sites',
  '1961—2019 · 八批文保': '1961–2019 · 8 batches',
  'DATA · 八批文保': 'DATA · 8 BATCHES',
  'AI ROUTE · 行程助手': 'AI ROUTE · PLANNER',
  'MY TRAIL · 我的足迹': 'MY TRAIL',
  '往下看，长江黄河，': 'Look down: rivers and mountains,',
  '去看一处文保': 'Visit a heritage site',
  '想去': 'Wishlist',
  '如何分布？': 'How are they distributed?',
  '你走过的，': 'What you have walked,',
  '才是你的。': 'is yours.',
  '从省份、批次、类别与年代四个切面，看看这份跨越五千年的名单。':
    'Explore this 5,000-year list through province, batch, category and period.',
  '简介与图片主要来自百度百科（缺失项由本站根据国家文物局公布名录整理），版权归原作者及百度百科所有，仅用于本页面展示；如权利人认为不妥，请联系删除。':
    'Text and images mainly come from Baidu Baike (missing items are compiled from the official list). Copyright remains with the original authors and Baidu Baike; used here for display only. Rights holders may contact us for removal.',
  '「打卡」和「想去」只写入浏览器 localStorage，不会上传服务器。清理浏览器数据会丢失记录，建议在「我的足迹」中导出备份。':
    'Check-ins and wishlist are stored only in your browser (localStorage) and are never uploaded. Clearing browser data will erase them; export a backup from My Trail.',
  '点位由公开地理编码数据生成；少部分较早批次或同名文保单位的坐标存在偏差，本站结合官方公布地址对明显偏离的点位做了校正。若你发现错误，欢迎以官方公布信息为准。':
    'Locations are derived from public geocoding data. Some early-batch or same-name sites may be offset; obvious deviations have been checked against official addresses. If you find an error, the official published address takes precedence.',
  '「全国重点文物保护单位」是中国不可移动文物的最高保护级别。1961 年至 2019 年，国务院先后公布八批，共 5058 处（不含合并项目）。本站把它们整理成可搜索、可筛选、可打卡的地图。':
    '“National Key Cultural Heritage Site” is the highest protection level for immovable cultural relics in China. From 1961 to 2019 the State Council announced eight batches, totalling 5,058 sites (merged items excluded). This site turns them into a searchable, filterable, check-in map.',
};

Object.assign(EN, {
  '搜一处文保：名称 / 别名 / 模糊匹配……': 'Search by name, alias or fuzzy match…',
  '语言 / Language': 'Language',
  '本地智能规划 · 车次 / 航班 / 开放时间以官方为准': 'Local planner · check official sources for trains, flights and opening hours',
  '这次没有排出来': 'No route could be generated',
  '没有可用点位': 'No available sites',
  '已按你的调整重新计算 · 时间与交通已更新': 'Route recalculated · times and transport updated',
  '地址：': 'Address:',
  '导航搜：': 'Navigate:',
  '已生成': 'Generated',
  '去探索添加 →': 'Add from Explore →',
  '还没有标记想去的地方。去地图或名录里点开一处文保，点一下「想去」就会出现在这里。':
    'No wishlist items yet. Open a site from the map or list and tap “Wishlist”.',
  '先去「想去」里收几处文保，或者切到「按兴趣区域」，框一片地方，让行程助手排一下。':
    'Add a few sites to your wishlist, or switch to “By interest area” and select an area for the planner.',
  '已生成 %s 天路线': 'Generated a %s-day route',
  '已选择当前地图范围 · %s 处候选': 'Using current map view · %s candidates',
  '这不是实时导航': 'This is not live navigation',
  '第一批': 'Batch 1', '第二批': 'Batch 2', '第三批': 'Batch 3', '第四批': 'Batch 4',
  '第五批': 'Batch 5', '第六批': 'Batch 6', '第七批': 'Batch 7', '第八批': 'Batch 8',
  '一批': 'Batch 1', '二批': 'Batch 2', '三批': 'Batch 3', '四批': 'Batch 4',
  '五批': 'Batch 5', '六批': 'Batch 6', '七批': 'Batch 7', '八批': 'Batch 8',
  '辽': 'Liao', '金': 'Jin', '宋': 'Song', '唐': 'Tang', '汉': 'Han',
  '战国': 'Warring States', '新石器时代': 'Neolithic', '旧石器时代': 'Paleolithic',
  '商': 'Shang', '周': 'Zhou', '秦': 'Qin', '隋': 'Sui', '五代': 'Five Dynasties',
  '南北朝': 'Northern & Southern Dynasties', '魏晋': 'Wei–Jin', '元': 'Yuan',
  '明': 'Ming', '清': 'Qing', '中华民国': 'Republic of China', '待考': 'Unknown',
  '村落': 'Village', '城墙': 'City wall', '宫殿': 'Palace', '寺庙': 'Temple',
});
const PATTERNS = [
  [/^(\d[\d,]*)\s*天\s*·\s*(\d[\d,]*)\s*处文保$/, '$1 days · $2 sites'],
  [/^(\d[\d,]*)\s*天\s*·\s*(\d[\d,]*)\s*处\s*·\s*已生成$/, '$1 days · $2 sites · ready'],
  [/^(\d[\d,]*)\s*处候选$/, '$1 candidates'],
  [/^(\d[\d,]*)\s*处$/, '$1 sites'],
  [/^已框选\s*·\s*(\d[\d,]*)\s*处$/, 'Selected · $1 sites'],
  [/^当前屏幕范围\s*·\s*(\d[\d,]*)\s*处$/, 'Current view · $1 sites'],
  [/^第([一二三四五六七八九十]+)批$/, (m) => `Batch ${m[1]}`],
  [/^(\d[\d,]*)\s*处文保$/, '$1 sites'],
  [/^(\d[\d,]*)\s*天$/, '$1 days'],
  [/^(\d[\d,]*)\s*处文保，$/, '$1 sites. '],
  [/^全部年代（(.+)）$/, 'All periods ($1)'],
  [/^全部省份（(.+)）$/, 'All provinces ($1)'],
  [/^全部地级市（(.+)）$/, 'All prefectures ($1)'],
  [/^([\u4e00-\u9fff]+)（([\d,]+)）$/, (m) => `${EN[m[1]] || m[1]} (${m[2]})`],
];

let current = 'zh';
let toTw = null;
let toCn = null;
let observer = null;
let scheduled = false;
let translating = false;
const twCache = new Map();

function normalize(value) {
  return String(value || '');
}

function englishText(text) {
  const raw = String(text || '');
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  if (EN[trimmed] !== undefined) {
    return raw.replace(trimmed, EN[trimmed]);
  }
  for (const [re, replacement] of PATTERNS) {
    const m = trimmed.match(re);
    if (m) {
      const out = typeof replacement === 'function' ? replacement(m) : trimmed.replace(re, replacement);
      return raw.replace(trimmed, out);
    }
  }
  return raw;
}

function traditionalText(text) {
  if (!toTw) return text;
  const raw = String(text || '');
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  let converted = twCache.get(trimmed);
  if (converted === undefined) {
    converted = toTw(trimmed);
    twCache.set(trimmed, converted);
  }
  return raw.replace(trimmed, converted);
}

function localizeText(text) {
  if (current === 'en') return englishText(text);
  if (current === 'zhHant') return traditionalText(text);
  return text;
}

function localizeAttr(value) {
  return localizeText(value);
}

export function t(text, ...args) {
  let out = current === 'en' ? EN[text] || text : current === 'zhHant' ? traditionalText(text) : text;
  for (const arg of args) out = out.replace('%s', arg);
  return out;
}

export function isEnglish() {
  return current === 'en';
}

export function isTraditional() {
  return current === 'zhHant';
}

export function lang() {
  return current;
}

export function toSimplified(text) {
  return toCn ? toCn(String(text || '')) : String(text || '');
}

function walkText(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (/^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE)$/.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (current === 'en' && parent.closest('[data-no-i18n]')) return NodeFilter.FILTER_REJECT;
      return node.nodeValue && /[\u4e00-\u9fff]/.test(node.nodeValue)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const next = localizeText(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }
}

function translateAttributes(root) {
  if (!root || root.nodeType !== 1) return;
  const els = [root, ...root.querySelectorAll('[placeholder],[title],[aria-label]')];
  for (const el of els) {
    for (const attr of ['placeholder', 'title', 'aria-label']) {
      const value = el.getAttribute?.(attr);
      if (!value || !/[\u4e00-\u9fff]/.test(value)) continue;
      const next = localizeAttr(value);
      if (next !== value) el.setAttribute(attr, next);
    }
  }
}

export function translateDom(root = document.body) {
  if (!root) return;
  if (current === 'zh') return;
  translating = true;
  if (observer) observer.disconnect();
  walkText(root);
  translateAttributes(root);
  if (root.querySelectorAll) {
    for (const el of root.querySelectorAll('[placeholder],[title],[aria-label]')) translateAttributes(el);
  }
  const guide = document.getElementById('enGuide');
  if (guide) guide.hidden = current !== 'en';
  translating = false;
  if (observer) observer.observe(document.body, { subtree: true, childList: true, characterData: true });
}

function scheduleTranslate() {
  if (current === 'zh' || scheduled || translating) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    translateDom();
  });
}

export async function initI18n() {
  try {
    current = localStorage.getItem(LANG_KEY) || 'zh';
  } catch {
    current = 'zh';
  }
  if (!LANGS.some((l) => l.id === current)) current = 'zh';
  document.documentElement.lang = current === 'en' ? 'en' : current === 'zhHant' ? 'zh-Hant' : 'zh-CN';
  document.title = current === 'en'
    ? 'Wenbao Daka · National Key Cultural Heritage Sites of China'
    : current === 'zhHant'
      ? '文保打卡 · 全國重點文物保護單位地圖'
      : '文保打卡 · 全国重点文物保护单位地图';
  if (current === 'zhHant') {
    const [tw, cn] = await Promise.all([
      import('../vendor/opencc/cn2t.js'),
      import('../vendor/opencc/t2cn.js'),
    ]);
    toTw = tw.Converter({ from: 'cn', to: 'tw' });
    toCn = cn.Converter({ from: 'tw', to: 'cn' });
  }
  const select = document.getElementById('langSelect');
  if (select) select.value = current;
  const guide = document.getElementById('enGuide');
  if (guide) guide.hidden = current !== 'en';
  translateDom(document.body);
  if (observer) observer.disconnect();
  observer = new MutationObserver((records) => {
    if (current === 'zh') return;
    const outsideMap = records.some((r) => {
      const el = r.target.nodeType === 1 ? r.target : r.target.parentElement;
      return !(el && el.closest && el.closest('.leaflet-container'));
    });
    if (outsideMap) scheduleTranslate();
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
}

export function setLanguage(next) {
  if (!LANGS.some((l) => l.id === next)) return;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch { /* ignore */ }
  location.reload();
}

export function formatEnglishName(value) {
  return String(value || '').replace(/\(/g, ' (').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
}

export function englishSummary(u) {
  const cat = {
    0: 'an archaeological site', 1: 'a tomb / cemetery site', 2: 'a historic building',
    3: 'a cave-temple or rock-carving site', 4: 'a modern historic site', 5: 'a cultural heritage site',
  }[u.cat] || 'a cultural heritage site';
  const era = EN[u.era] || u.era;
  const prov = EN[u.prov] || u.prov;
  const batch = u.batchName ? EN[`${u.batchName} · ${u.batchYear}`] || u.batchName : '';
  const loc = [u.city, u.county].filter(Boolean).join(', ');
  return `${u.en && /[A-Za-z]/.test(u.en) ? formatEnglishName(u.en) : u.name} is ${cat} from the ${era} period, located in ${prov}${loc ? `, ${loc}` : ''}. It is a National Key Cultural Heritage Site (${batch || `${u.batchName} of ${u.batchYear}`}). Official address: ${u.addr}.`;
}
