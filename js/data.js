// 数据加载与派生字段
import { wgs84ToGcj02 } from './coord.js';

export const BATCHES = [
  { n: 1, name: '第一批', year: 1961, announced: 180, note: '新中国首次公布，多为全国标杆性遗存。' },
  { n: 2, name: '第二批', year: 1982, announced: 62, note: '数量最少的一批，几乎处处是名迹。' },
  { n: 3, name: '第三批', year: 1988, announced: 258, note: '改革开放后首次成规模扩容。' },
  { n: 4, name: '第四批', year: 1996, announced: 250, note: '类型更丰富，地方代表性增强。' },
  { n: 5, name: '第五批', year: 2001, announced: 518, note: '首次大规模扩容，此后有多次增补。' },
  { n: 6, name: '第六批', year: 2006, announced: 1080, note: '首次突破千处，覆盖更广。' },
  { n: 7, name: '第七批', year: 2013, announced: 1943, note: '数量最多的一批，近现代史迹显著增加。' },
  { n: 8, name: '第八批', year: 2019, announced: 762, note: '最近一批，类型与地域更趋均衡。' },
];

export const CATS = [
  { id: 0, name: '古遗址', full: '古遗址', color: '#8a6d3b', desc: '人类活动留下的地下或地面遗存：城址、聚落、窑址、矿冶、水利与战场。' },
  { id: 1, name: '古墓葬', full: '古墓葬', color: '#6b5b7a', desc: '帝王、贵族与平民的陵墓、墓群及其附属设施。' },
  { id: 2, name: '古建筑', full: '古建筑', color: '#9c3d2e', desc: '宫殿、寺庙、祠坛、塔、桥、民居等现存古代建筑。' },
  { id: 3, name: '石窟寺', full: '石窟寺及石刻', color: '#b07a35', desc: '石窟、摩崖造像、碑刻与经幢等石刻遗存。' },
  { id: 4, name: '近现代', full: '近现代重要史迹及代表性建筑', color: '#3f6b62', desc: '1840 年以来与重大历史事件、人物相关的史迹和代表性建筑。' },
  { id: 5, name: '其他', full: '其他', color: '#6f6a61', desc: '难以归入以上五类的文物。' },
];

const SEARCH_ALIASES = {
  '1-0071-3-024': ['应县木塔', '应县木塔景区', '应县佛宫寺释迦塔', '佛宫寺木塔'],
  '1-0058-3-011': ['赵州桥', '大石桥'],
  '1-0100-3-053': ['紫禁城'],
  '1-0112-3-065': ['盛京皇宫'],
  '1-0164-2-003': ['兵马俑', '秦始皇陵兵马俑'],
  '1-0178-2-017': ['明十三陵'],
  '3-0060-3-008': ['平遥古城'],
  '7-1162-3-460': ['嵩山少林寺'],
  '1-0035-4-002': ['敦煌莫高窟', '千佛洞'],
  '2-0013-4-003': ['凌云大佛'],
  '1-0063-3-016': ['大慈恩寺塔'],
  '1-0064-3-017': ['荐福寺塔'],
  '1-0105-3-058': ['北京天坛'],
  '1-0107-3-060': ['拉萨布达拉宫'],
  '1-0121-3-074': ['苏州拙政园'],
  '1-0124-3-077': ['苏州留园'],
};

export const ERA_GROUPS = [
  { id: '史前', label: '史前', short: '史前' },
  { id: '夏商周', label: '夏商周', short: '夏商周' },
  { id: '秦汉', label: '秦汉', short: '秦汉' },
  { id: '魏晋南北朝', label: '魏晋南北朝', short: '魏晋' },
  { id: '隋唐五代', label: '隋唐五代', short: '隋唐' },
  { id: '宋辽金', label: '宋辽金', short: '宋辽金' },
  { id: '元', label: '元', short: '元' },
  { id: '明', label: '明', short: '明' },
  { id: '清', label: '清', short: '清' },
  { id: '近现代', label: '近现代', short: '近现代' },
  { id: '其他', label: '其他 / 跨代', short: '其他' },
];

const PROV_FULL = {
  北京: '北京市', 天津: '天津市', 河北: '河北省', 山西: '山西省', 内蒙古: '内蒙古自治区',
  辽宁: '辽宁省', 吉林: '吉林省', 黑龙江: '黑龙江省', 上海: '上海市', 江苏: '江苏省',
  浙江: '浙江省', 安徽: '安徽省', 福建: '福建省', 江西: '江西省', 山东: '山东省',
  河南: '河南省', 湖北: '湖北省', 湖南: '湖南省', 广东: '广东省', 广西: '广西壮族自治区',
  海南: '海南省', 重庆: '重庆市', 四川: '四川省', 贵州: '贵州省', 云南: '云南省',
  西藏: '西藏自治区', 陕西: '陕西省', 甘肃: '甘肃省', 青海: '青海省', 宁夏: '宁夏回族自治区',
  新疆: '新疆维吾尔自治区', 香港: '香港特别行政区', 澳门: '澳门特别行政区', 台湾: '台湾省',
};

export function eraGroupOf(era) {
  const s = String(era || '');
  if (!s) return '其他';
  if (/旧石器|新石器/.test(s)) return '史前';
  if (/夏|商|周|春秋|战国/.test(s)) return '夏商周';
  if (/秦|汉/.test(s)) return '秦汉';
  if (/三国|晋|南北朝/.test(s)) return '魏晋南北朝';
  if (/隋|唐|五代/.test(s)) return '隋唐五代';
  if (/宋|辽|金/.test(s)) return '宋辽金';
  if (/元/.test(s)) return '元';
  if (/明/.test(s)) return '明';
  if (/清/.test(s)) return '清';
  if (/民国|共和国|近现代|现代/.test(s)) return '近现代';
  return '其他';
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url} 加载失败（HTTP ${res.status}）`);
  return res.json();
}

export async function loadData() {
  const [unitsRaw, meta, provinces] = await Promise.all([
    getJSON('data/units.json'),
    getJSON('data/meta.json'),
    getJSON('data/provinces.json'),
  ]);

  const catById = new Map(CATS.map((c) => [c.id, c]));
  const batchByN = new Map(BATCHES.map((b) => [b.n, b]));
  const units = [];
  const byId = new Map();

  for (const row of unitsRaw.rows) {
    const [id, name, en, batch, cat, era, prov, city, county, addr, lng, lat, approx] = row;
    const batchMeta = batchByN.get(batch) || BATCHES[0];
    const catMeta = catById.get(cat) || CATS[5];
    const [glng, glat] = wgs84ToGcj02(lng, lat);
    const group = eraGroupOf(era);
    const regionParts = [prov];
    if (city && city !== PROV_FULL[prov] && city !== prov) regionParts.push(city);
    if (county && county !== city && county !== prov) regionParts.push(county);
    const region = regionParts.join(' · ');
    const fullAddr = addr || `${PROV_FULL[prov] || prov}${city || ''}${county || ''}`;
    const unit = {
      id,
      name,
      en: en && /^[\x20-\x7E]+$/.test(en) ? en : '',
      batch,
      batchName: batchMeta.name,
      batchYear: batchMeta.year,
      cat,
      catName: catMeta.name,
      catFull: catMeta.full,
      catColor: catMeta.color,
      era: era || '待考',
      eraGroup: group,
      prov,
      provFull: PROV_FULL[prov] || prov,
      city: city || '',
      county: county || '',
      region,
      addr: fullAddr,
      lng,
      lat,
      glng,
      glat,
      approx: Boolean(approx),
      randomRank: hashString(id) / 4294967296,
    };
    const aliases = SEARCH_ALIASES[id] || [];
    unit.alias = aliases.join('、');
    unit.fuzzyNames = [unit.name, ...aliases, unit.en]
      .map((x) => String(x || '').toLowerCase().replace(/[\s（）()【】\[\]·•,，。、；;：:!！?？"“”'‘’\-—_/\\]/g, ''))
      .filter(Boolean);
    unit.fuzzyText = unit.fuzzyNames.join(' ');
    unit.searchText = [
      unit.name, unit.en, unit.era, unit.prov, unit.city, unit.county,
      unit.addr, unit.id, unit.batchName, unit.catName, unit.catFull,
      ...aliases,
    ].join(' ').toLowerCase();
    units.push(unit);
    byId.set(id, unit);
  }

  // 批次计数
  const batchCounts = new Map();
  const catCounts = new Map();
  const provCounts = new Map();
  const eraCounts = new Map();
  for (const u of units) {
    batchCounts.set(u.batch, (batchCounts.get(u.batch) || 0) + 1);
    catCounts.set(u.cat, (catCounts.get(u.cat) || 0) + 1);
    provCounts.set(u.prov, (provCounts.get(u.prov) || 0) + 1);
    eraCounts.set(u.eraGroup, (eraCounts.get(u.eraGroup) || 0) + 1);
  }
  for (const b of BATCHES) b.count = batchCounts.get(b.n) || 0;
  for (const c of CATS) c.count = catCounts.get(c.id) || 0;

  const provinceList = [...provCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'));

  const eraList = ERA_GROUPS.map((g) => ({ ...g, count: eraCounts.get(g.id) || 0 }));

  return {
    units,
    byId,
    meta,
    provinces,
    provinceList,
    provinceCount: provinceList.length,
    eraList,
    batchCounts,
    catCounts,
    provCounts,
    eraCounts,
    total: units.length,
    builtAt: meta.builtAt,
  };
}


// 详情页简介与图片按批次分片懒加载，避免拖慢首屏
const detailsCache = new Map();
export function loadDetails(batch) {
  const b = Number(batch) || 1;
  if (!detailsCache.has(b)) {
    detailsCache.set(b, fetch(`data/details-${b}.json`, { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`details-${b}.json ${res.status}`);
        return res.json();
      })
      .then((data) => data.units || {})
      .catch(() => ({})));
  }
  return detailsCache.get(b);
}
