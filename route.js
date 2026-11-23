// 本地智能行程规划：地理聚类 + 最近邻排序 + 交通/时间估算。
// 不依赖外部模型；车次、开放时间与预约信息需以官方为准。

const ROAD_FACTOR = 1.28;
const PACE = {
  easy: { label: '轻松', maxStops: 2, visitFactor: 0.85 },
  standard: { label: '标准', maxStops: 3, visitFactor: 1 },
  tight: { label: '紧凑', maxStops: 4, visitFactor: 1.15 },
};
const CAT_VISIT = { 0: 80, 1: 70, 2: 75, 3: 90, 4: 60, 5: 60 };
const STATIONS = {
  北京: '北京北 / 北京清河 / 北京朝阳（按车次）',
  上海: '上海虹桥',
  天津: '天津西',
  重庆: '重庆北 / 重庆西',
  石家庄: '石家庄站',
  太原: '太原南',
  大同: '大同南',
  运城: '运城北',
  西安: '西安北',
  郑州: '郑州东',
  洛阳: '洛阳龙门',
  济南: '济南西',
  青岛: '青岛北',
  南京: '南京南',
  苏州: '苏州站',
  杭州: '杭州东',
  合肥: '合肥南',
  武汉: '武汉站',
  长沙: '长沙南',
  广州: '广州南',
  深圳: '深圳北',
  成都: '成都东',
  昆明: '昆明南',
  贵阳: '贵阳北',
  南宁: '南宁东',
  福州: '福州站',
  厦门: '厦门北',
  南昌: '南昌西',
  沈阳: '沈阳北',
  大连: '大连北',
  长春: '长春西',
  哈尔滨: '哈尔滨西',
  呼和浩特: '呼和浩特东',
  银川: '银川站',
  兰州: '兰州西',
  西宁: '西宁站',
  乌鲁木齐: '乌鲁木齐站',
  拉萨: '拉萨站',
  海口: '海口东',
  三亚: '三亚站',
  吐鲁番: '吐鲁番北',
  库尔勒: '库尔勒站',
  阿克苏: '阿克苏站',
  喀什: '喀什站',
  伊宁: '伊宁站',
  哈密: '哈密站',
  嘉峪关: '嘉峪关南',
  敦煌: '敦煌站',
  张掖: '张掖西',
  天水: '天水南',
  延安: '延安站',
  榆林: '榆林站',
  包头: '包头东',
  鄂尔多斯: '鄂尔多斯站',
  赤峰: '赤峰站',
  通辽: '通辽站',
  海拉尔: '海拉尔站',
  锡林浩特: '锡林浩特站',
  乌兰浩特: '乌兰浩特站',
  库车: '库车站',
};
const AIRPORTS = {
  北京: { name: '北京首都 / 大兴', code: 'BJS' },
  上海: { name: '上海虹桥 / 浦东', code: 'SHA' },
  广州: { name: '广州白云', code: 'CAN' },
  深圳: { name: '深圳宝安', code: 'SZX' },
  成都: { name: '成都双流 / 天府', code: 'CTU' },
  重庆: { name: '重庆江北', code: 'CKG' },
  西安: { name: '西安咸阳', code: 'XIY' },
  昆明: { name: '昆明长水', code: 'KMG' },
  杭州: { name: '杭州萧山', code: 'HGH' },
  南京: { name: '南京禄口', code: 'NKG' },
  武汉: { name: '武汉天河', code: 'WUH' },
  长沙: { name: '长沙黄花', code: 'CSX' },
  郑州: { name: '郑州新郑', code: 'CGO' },
  太原: { name: '太原武宿', code: 'TYN' },
  大同: { name: '大同云冈', code: 'DAT' },
  运城: { name: '运城张孝', code: 'YCU' },
  呼和浩特: { name: '呼和浩特白塔', code: 'HET' },
  银川: { name: '银川河东', code: 'INC' },
  兰州: { name: '兰州中川', code: 'LHW' },
  西宁: { name: '西宁曹家堡', code: 'XNN' },
  乌鲁木齐: { name: '乌鲁木齐地窝堡', code: 'URC' },
  拉萨: { name: '拉萨贡嘎', code: 'LXA' },
  青岛: { name: '青岛胶东', code: 'TAO' },
  厦门: { name: '厦门高崎', code: 'XMN' },
  福州: { name: '福州长乐', code: 'FOC' },
  南昌: { name: '南昌昌北', code: 'KHN' },
  合肥: { name: '合肥新桥', code: 'HFE' },
  沈阳: { name: '沈阳桃仙', code: 'SHE' },
  大连: { name: '大连周水子', code: 'DLC' },
  长春: { name: '长春龙嘉', code: 'CGQ' },
  哈尔滨: { name: '哈尔滨太平', code: 'HRB' },
  南宁: { name: '南宁吴圩', code: 'NNG' },
  贵阳: { name: '贵阳龙洞堡', code: 'KWE' },
  海口: { name: '海口美兰', code: 'HAK' },
  三亚: { name: '三亚凤凰', code: 'SYX' },
  吐鲁番: { name: '吐鲁番交河', code: 'TLQ' },
  库车: { name: '库车龟兹', code: 'KCA' },
  喀什: { name: '喀什徕宁', code: 'KHG' },
  和田: { name: '和田昆冈', code: 'HTN' },
  阿勒泰: { name: '阿勒泰雪都', code: 'AAT' },
  伊宁: { name: '伊宁机场', code: 'YIN' },
  克拉玛依: { name: '克拉玛依古海', code: 'KRY' },
  哈密: { name: '哈密伊州', code: 'HMI' },
  敦煌: { name: '敦煌莫高', code: 'DNH' },
  嘉峪关: { name: '嘉峪关酒泉', code: 'JGN' },
  张掖: { name: '张掖甘州', code: 'YZY' },
  天水: { name: '天水麦积山', code: 'THQ' },
  延安: { name: '延安南泥湾', code: 'ENY' },
  榆林: { name: '榆林榆阳', code: 'UYN' },
  包头: { name: '包头东河', code: 'BAV' },
  鄂尔多斯: { name: '鄂尔多斯伊金霍洛', code: 'DSN' },
  赤峰: { name: '赤峰玉龙', code: 'CIF' },
  通辽: { name: '通辽机场', code: 'TGO' },
  海拉尔: { name: '呼伦贝尔海拉尔', code: 'HLD' },
  锡林浩特: { name: '锡林浩特机场', code: 'XIL' },
  乌兰浩特: { name: '乌兰浩特义勒力特', code: 'HLH' },
  阿克苏: { name: '阿克苏红旗坡', code: 'AKU' },
  喀纳斯: { name: '喀纳斯机场', code: 'KJI' },
};
function cityKey(name) {
  return String(name || '').replace(/(特别行政区|自治州|地区|盟|市|县|区)$/g, '');
}
function stationFor(city) {
  const key = cityKey(city);
  return STATIONS[key] || `${key || '就近城市'}站（建议再查高铁站）`;
}
function airportFor(city) {
  const key = cityKey(city);
  return AIRPORTS[key] || { name: `${key || '就近城市'}机场`, code: '' };
}
function amapNav(from, to, name) {
  if (!to) return '';
  if (!from) return `https://uri.amap.com/marker?position=${to[0]},${to[1]}&name=${encodeURIComponent(name)}&coordinate=wgs84&callnative=1`;
  return `https://uri.amap.com/navigation?from=${from[0]},${from[1]},起点&to=${to[0]},${to[1]},${encodeURIComponent(name)}&mode=car&coordinate=wgs84&callnative=1`;
}
function trainSearch(fromCity, toCity, date) {
  const from = cityKey(fromCity);
  const to = cityKey(toCity);
  const fs = encodeURIComponent(`${from},${from}`);
  const ts = encodeURIComponent(`${to},${to}`);
  return `https://kyfw.12306.cn/otn/leftTicket/init?linktypeid=dc&fs=${fs}&ts=${ts}&date=${date || ''}&flag=N,1%7CN,1`;
}
function flightSearch(fromCity, toCity, date) {
  const a = airportFor(fromCity);
  const b = airportFor(toCity);
  if (a.code && b.code) {
    return `https://flights.ctrip.com/online/list/oneway-${a.code.toLowerCase()}-${b.code.toLowerCase()}?depdate=${date || ''}`;
  }
  return 'https://flights.ctrip.com/';
}
function amapTransit(from, to, name) {
  if (!from || !to) return '';
  return `https://uri.amap.com/navigation?from=${from[0]},${from[1]},起点&to=${to[0]},${to[1]},${encodeURIComponent(name)}&mode=bus&coordinate=wgs84&callnative=1`;
}
function localLeg({ fromPoint, toPoint, fromName, toName, toUnitId, nav, transport, pref }) {
  const km = roadKm(fromPoint, toPoint);
  let type;
  if (transport === 'car') type = 'drive';
  else if (pref === 'taxi') type = 'taxi';
  else if (km <= 1.2) type = 'walk';
  else if ((pref === 'transit' && km <= 20) || km <= 15) type = 'transit';
  else type = 'taxi';
  let min;
  let text;
  if (type === 'walk') {
    min = Math.round((km / 4.8) * 60) + 2;
    text = `步行约 ${min} 分钟`;
  } else if (type === 'transit') {
    min = Math.round((km / 18) * 60) + 8;
    text = `公交 / 地铁约 ${min} 分钟（具体线路用高德 / 百度地图查）`;
  } else if (type === 'taxi') {
    min = Math.round((km / 38) * 60) + 6;
    text = `打车约 ${min} 分钟`;
  } else {
    min = Math.round((km / 55) * 60) + 8;
    text = `自驾约 ${min} 分钟`;
  }
  const amap = type === 'transit' || type === 'walk'
    ? amapTransit(fromPoint, toPoint, nav?.query || toName)
    : amapNav(fromPoint, toPoint, nav?.query || toName);
  return {
    type,
    from: fromName,
    to: toName,
    km: Math.round(km),
    min,
    toUnitId,
    fromPoint,
    toPoint,
    navName: nav?.name,
    navQuery: nav?.query,
    navAddress: nav?.address,
    navText: nav?.query,
    amap,
    text: `${text}到${toName}${nav?.query ? `，导航搜「${nav.query}」` : ''}`,
  };
}function navOf(u) {
  const loc = u.city && u.county && u.city !== u.county ? `${u.city}${u.county}` : (u.city || u.county || '');
  const query = `${u.name} ${loc}`.trim();
  return { name: u.name, query, address: u.addr, amap: amapNav(null, [u.lng, u.lat], query) };
}


export function haversine(a, b) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLon = (b[0] - a[0]) * rad;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function roadKm(a, b) {
  return haversine(a, b) * ROAD_FACTOR;
}
function minutes(km, speed) {
  return Math.round((km / speed) * 60);
}
function pad2(n) {
  return String(n).padStart(2, '0');
}
function clock(min) {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  return `${pad2(h)}:${pad2(m)}`;
}
function durationText(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return m + ' 分钟';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? h + ' 小时 ' + r + ' 分' : h + ' 小时';
}
function pointOf(u) {
  return [u.lng, u.lat];
}
function unitName(u) {
  return u?.name || '';
}
function cityCenterMap(units) {
  const acc = new Map();
  for (const u of units) {
    if (!u.city) continue;
    const key = `${u.prov}|${u.city}`;
    if (!acc.has(key)) acc.set(key, [0, 0, 0]);
    const a = acc.get(key);
    a[0] += u.lng;
    a[1] += u.lat;
    a[2]++;
  }
  const out = new Map();
  for (const [key, [x, y, n]] of acc) out.set(key, [x / n, y / n]);
  return out;
}
function closestCity(point, units) {
  let best = null;
  let bestD = Infinity;
  for (const u of units) {
    if (!u.city) continue;
    const d = haversine(point, pointOf(u));
    if (d < bestD) {
      bestD = d;
      best = u;
    }
  }
  return best;
}
function centroid(points) {
  if (!points.length) return null;
  return [
    points.reduce((s, p) => s + p[0], 0) / points.length,
    points.reduce((s, p) => s + p[1], 0) / points.length,
  ];
}
function kmeans(points, k) {
  if (!points.length) return [];
  if (k <= 1) return [points];
  k = Math.min(k, points.length);
  const all = centroid(points);
  const seeds = [];
  let first = points[0];
  let far = -1;
  for (const p of points) {
    const d = haversine(all, pointOf(p));
    if (d > far) {
      far = d;
      first = p;
    }
  }
  seeds.push(first);
  while (seeds.length < k) {
    let pick = null;
    let best = -1;
    for (const p of points) {
      const d2 = Math.min(...seeds.map((s) => haversine(pointOf(p), pointOf(s))));
      const score = d2;
      if (score > best && !seeds.some((s) => s.id === p.id)) {
        best = score;
        pick = p;
      }
    }
    if (!pick) break;
    seeds.push(pick);
  }
  let groups = seeds.map((s) => [s]);
  for (let iter = 0; iter < 8; iter++) {
    const centers = groups.map((g) => centroid(g.map(pointOf)));
    const next = centers.map(() => []);
    for (const p of points) {
      let bi = 0;
      let bd = Infinity;
      centers.forEach((c, i) => {
        const d = haversine(pointOf(p), c);
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      next[bi].push(p);
    }
    // 避免空簇：从最大的簇移一个最远的点过来
    for (let i = 0; i < next.length; i++) {
      if (next[i].length) continue;
      const donor = next.reduce((a, b) => (a.length > b.length ? a : b));
      if (donor.length <= 1) break;
      let farPoint = donor[0];
      let farD = -1;
      for (const p of donor) {
        const d = haversine(pointOf(p), centers[i]);
        if (d > farD) {
          farD = d;
          farPoint = p;
        }
      }
      donor.splice(donor.indexOf(farPoint), 1);
      next[i].push(farPoint);
    }
    groups = next;
  }
  return groups.filter((g) => g.length);
}

function splitBalancedOrder(order, dayCount, maxStops) {
  if (!order.length) return [];
  const days = Math.max(1, Math.min(dayCount, order.length));
  const base = Math.floor(order.length / days);
  let extra = order.length % days;
  const groups = [];
  let cursor = 0;
  for (let i = 0; i < days; i++) {
    let count = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    count = Math.min(count, maxStops);
    groups.push(order.slice(cursor, cursor + count));
    cursor += count;
  }
  if (cursor < order.length) groups[groups.length - 1].push(...order.slice(cursor));
  return groups.filter((g) => g.length);
}

function cityAwareGroups(sites, dayCount, maxStops) {
  const byCity = new Map();
  for (const u of sites) {
    const key = u.city || u.county || u.prov || '未知';
    if (!byCity.has(key)) byCity.set(key, []);
    byCity.get(key).push(u);
  }
  const cityUnits = [...byCity.entries()].map(([city, list]) => {
    const [lng, lat] = centroid(list.map(pointOf));
    return { id: city, city, sites: list, lat, lng };
  });
  if (!cityUnits.length) return [];
  const clusterCount = Math.min(dayCount, cityUnits.length);
  const clusters = kmeans(cityUnits, clusterCount).map((cities) => {
    const set = cities.filter(Boolean);
    const all = set.flatMap((c) => c.sites);
    return {
      sites: all,
      cities: set.map((c) => ({ city: c.city, sites: c.sites, point: pointOf(c) })),
    };
  }).filter((c) => c.sites.length);

  // 容量修复：优先整城搬迁，避免把同城点位拆散；确实放不下时再拆分城市。
  let guard = 0;
  while (guard++ < 30) {
    const over = clusters.find((c) => c.sites.length > maxStops);
    if (!over) break;
    let moved = false;
    const candidates = over.cities
      .filter((c) => over.cities.length > 1)
      .sort((a, b) => a.sites.length - b.sites.length);
    for (const city of candidates) {
      let target = null;
      let targetDist = Infinity;
      for (const other of clusters) {
        if (other === over || other.sites.length + city.sites.length > maxStops) continue;
        const d = haversine(city.point, centroid(other.sites.map(pointOf)) || city.point);
        if (d < targetDist) {
          targetDist = d;
          target = other;
        }
      }
      if (target) {
        over.cities = over.cities.filter((c) => c !== city);
        over.sites = over.sites.filter((u) => !city.sites.includes(u));
        target.cities.push(city);
        target.sites.push(...city.sites);
        moved = true;
        break;
      }
    }
    if (moved) continue;
    // 所有城都搬不动：拆一个城市，或把站点分成多组
    const biggest = [...over.cities].sort((a, b) => b.sites.length - a.sites.length)[0];
    if (!biggest) break;
    const rest = biggest.sites.slice(maxStops);
    if (!rest.length) break;
    over.cities = over.cities.filter((c) => c !== biggest);
    over.sites = over.sites.filter((u) => !biggest.sites.includes(u));
    const p = pointOf({ lng: biggest.point[0], lat: biggest.point[1] });
    clusters.push({ sites: rest, cities: [{ city: biggest.city, sites: rest, point: p }] });
    // 剩余的前 maxStops 处留在原组
    over.sites.push(...biggest.sites.slice(0, maxStops));
    over.cities.push({ city: biggest.city, sites: biggest.sites.slice(0, maxStops), point: p });
  }

  // 组数超过天数时，把最小的组并入最近且有容量的组。
  while (clusters.length > dayCount) {
    clusters.sort((a, b) => a.sites.length - b.sites.length);
    const small = clusters.shift();
    let target = null;
    let targetDist = Infinity;
    const smallPoint = centroid(small.sites.map(pointOf));
    for (const other of clusters) {
      if (other.sites.length + small.sites.length > maxStops) continue;
      const d = haversine(smallPoint, centroid(other.sites.map(pointOf)) || smallPoint);
      if (d < targetDist) {
        targetDist = d;
        target = other;
      }
    }
    if (!target) {
      clusters.push(small);
      break;
    }
    target.sites.push(...small.sites);
    target.cities.push(...small.cities);
  }

  return clusters.filter((c) => c.sites.length).map((c) => c.sites);
}

function balanceGroups(groups, maxStops) {
  let changed = true;
  while (changed) {
    changed = false;
    const over = groups.find((g) => g.length > maxStops);
    if (!over) break;
    const target = groups
      .filter((g) => g !== over && g.length < maxStops)
      .sort((a, b) => haversine(centroid(a.map(pointOf)), centroid(over.map(pointOf))) - haversine(centroid(b.map(pointOf)), centroid(over.map(pointOf))))[0];
    if (!target) break;
    const c = centroid(over.map(pointOf));
    let pick = null;
    let far = -1;
    for (const u of over) {
      const d = haversine(c, pointOf(u));
      if (d > far) {
        far = d;
        pick = u;
      }
    }
    if (pick && over.length > 1) {
      over.splice(over.indexOf(pick), 1);
      target.push(pick);
      changed = true;
    }
  }
  return groups.filter((g) => g.length);
}

function orderSites(sites, start) {
  if (sites.length <= 1) return sites.slice();

  // 先按城市分块，避免一天之内反复跨城折返；块内再走最近邻。
  const cityBlocks = new Map();
  for (const u of sites) {
    const key = u.city || '';
    if (!cityBlocks.has(key)) cityBlocks.set(key, []);
    cityBlocks.get(key).push(u);
  }
  if (cityBlocks.size > 1) {
    const pending = [...cityBlocks.values()];
    const out = [];
    let cur = start;
    while (pending.length) {
      let best = null;
      let bestDist = Infinity;
      let bestSite = null;
      for (const block of pending) {
        for (const u of block) {
          const d = haversine(cur, pointOf(u));
          if (d < bestDist) {
            bestDist = d;
            best = block;
            bestSite = u;
          }
        }
      }
      if (!best) break;
      pending.splice(pending.indexOf(best), 1);
      const restBlock = best.slice();
      while (restBlock.length) {
        let bi = 0;
        let bd = Infinity;
        restBlock.forEach((u, i) => {
          const d = haversine(cur, pointOf(u));
          if (d < bd) {
            bd = d;
            bi = i;
          }
        });
        const [u] = restBlock.splice(bi, 1);
        out.push(u);
        cur = pointOf(u);
      }
    }
    return out;
  }

  const rest = sites.slice();
  const out = [];
  let cur = start;
  while (rest.length) {
    let bi = 0;
    let bd = Infinity;
    rest.forEach((u, i) => {
      const d = haversine(cur, pointOf(u));
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    const [u] = rest.splice(bi, 1);
    out.push(u);
    cur = pointOf(u);
  }
  // 2-opt：固定起点，消除回头路
  const route = [start, ...out.map(pointOf)];
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 20) {
    improved = false;
    for (let i = 1; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length - 1; j++) {
        const a = route[i - 1];
        const b = route[i];
        const c = route[j];
        const d = route[j + 1];
        const before = haversine(a, b) + haversine(c, d);
        const after = haversine(a, c) + haversine(b, d);
        if (after + 0.02 < before) {
          const mid = route.slice(i, j + 1).reverse();
          route.splice(i, mid.length, ...mid);
          improved = true;
        }
      }
    }
  }
  const pool = sites.slice();
  return route
    .slice(1)
    .map((p) => {
      const i = pool.findIndex((u) => pointOf(u)[0] === p[0] && pointOf(u)[1] === p[1]);
      return i >= 0 ? pool.splice(i, 1)[0] : null;
    })
    .filter(Boolean);
}

function visitMinutes(u, pace) {
  const base = CAT_VISIT[u.cat] || 75;
  return Math.max(35, Math.round((base * pace.visitFactor) / 5) * 5);
}

function normalizeCity(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/(特别行政区|自治州|地区|盟|市|县|区)$/g, '');
}
const EN_CITY_NAMES = {
  beijing: '北京', shanghai: '上海', tianjin: '天津', chongqing: '重庆',
  guangzhou: '广州', shenzhen: '深圳', hangzhou: '杭州', nanjing: '南京',
  suzhou: '苏州', chengdu: '成都', xian: "西安", 'xi\'an': '西安',
  wuhan: '武汉', changsha: '长沙', zhengzhou: '郑州', luoyang: '洛阳',
  kaifeng: '开封', datong: '大同', taiyuan: '太原', yuncheng: '运城',
  pingyao: '平遥', huhehaote: '呼和浩特', hohhot: '呼和浩特',
  lanzhou: '兰州', dunhuang: '敦煌', xining: '西宁', urumqi: '乌鲁木齐',
  lhasa: '拉萨', kunming: '昆明', guilin: '桂林', xiamen: '厦门',
  fuzhou: '福州', quanzhou: '泉州', qingdao: '青岛', jinan: '济南',
  shenyang: '沈阳', dalian: '大连', harbin: '哈尔滨', changchun: '长春',
};

export function resolveOrigin(text, coord, cityCenters) {
  if (coord && Number.isFinite(coord[0]) && Number.isFinite(coord[1])) {
    let near = null;
    let nearD = Infinity;
    for (const [key, point] of cityCenters) {
      const d = haversine([coord[0], coord[1]], point);
      if (d < nearD) {
        nearD = d;
        near = key.split('|')[1] || '';
      }
    }
    return { name: text || '当前位置', city: near || '', point: [coord[0], coord[1]], resolved: true };
  }
  const input = EN_CITY_NAMES[String(text || '').trim().toLowerCase()] || text;
  const target = normalizeCity(input);
  if (!target) return { name: '', point: null, resolved: false };
  let best = null;
  for (const [key, point] of cityCenters) {
    const city = key.split('|')[1] || '';
    const c = normalizeCity(city);
    if (!c) continue;
    if (c === target) return { name: text.trim(), city, point, resolved: true };
    if (!best && (c.includes(target) || target.includes(c))) best = { name: city, city, point, resolved: true };
  }
  return best ? { name: text.trim(), city: best.city, point: best.point, resolved: true } : { name: text.trim(), city: '', point: null, resolved: false };
}

function insideBounds(u, bounds) {
  if (!bounds) return true;
  return u.lat >= bounds[0][0] && u.lat <= bounds[1][0] && u.lng >= bounds[0][1] && u.lng <= bounds[1][1];
}

export function filterCandidates({
  units,
  mode,
  wishIds,
  cats,
  era,
  region,
  province,
  city,
  excludeVisited,
  isVisited,
}) {
  let list;
  if (mode === 'wish') {
    const ids = new Set(wishIds);
    list = units.filter((u) => ids.has(u.id));
  } else {
    list = units.filter((u) => {
      if (cats?.length && !cats.includes(u.cat)) return false;
      if (era && u.eraGroup !== era) return false;
      if (province && u.prov !== province) return false;
      if (city && u.city !== city) return false;
      if (region && !insideBounds(u, region)) return false;
      if (excludeVisited && isVisited?.(u.id)) return false;
      return true;
    });
  }
  if (excludeVisited && mode === 'wish') list = list.filter((u) => !isVisited?.(u.id));
  return list;
}

function rankSites(list, mode, originPoint, region) {
  if (mode === 'wish') return list.slice();
  const center = region
    ? [(region[0][1] + region[1][1]) / 2, (region[0][0] + region[1][0]) / 2]
    : centroid(list.map(pointOf));
  return list
    .map((u) => {
      const d = center ? haversine(pointOf(u), center) : 0;
      const batchScore = Math.max(0, 8 - u.batch) * 1.2;
      return { u, score: batchScore - d * 0.004 + (u.approx ? -0.2 : 0) };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.u);
}

export function buildRoute({
  units,
  mode,
  wishIds,
  forcedDays,
  local,
  origin,
  originCoord,
  days,
  date,
  transport,
  pace,
  cats,
  era,
  region,
  regionLabel,
  province,
  city,
  excludeVisited,
  isVisited,
}) {
  const forced = Array.isArray(forcedDays) && forcedDays.some((d) => Array.isArray(d) && d.length);
  const forcedUnits = forced
    ? forcedDays.flatMap((ids) => ids.map((id) => units.find((u) => u.id === id)).filter(Boolean))
    : [];
  const all = forced
    ? forcedUnits
    : filterCandidates({ units, mode, wishIds, cats, era, region, province, city, excludeVisited, isVisited });
  const cityCenters = cityCenterMap(units);
  const org = resolveOrigin(origin, originCoord, cityCenters);
  const daysWanted = Math.max(1, Math.min(7, Number(days) || 3));
  const p = PACE[pace] || PACE.standard;
  const localPref = local || 'auto';

  if (!all.length) {
    return {
      ok: false,
      error: forced
        ? '定制路线里还没有地点，先添加一处文保。'
        : mode === 'wish'
          ? '「想去」清单还是空的，先在详情页把想去的文保加入清单。'
          : '这个区域/类型下暂时没有匹配的文保，试试扩大框选范围或减少筛选。',
    };
  }

  let chosen;
  let groups;
  let omitted = 0;
  if (forced) {
    chosen = all;
    groups = forcedDays
      .map((ids) => ids.map((id) => units.find((u) => u.id === id)).filter(Boolean))
      .filter((g) => g.length);
  } else {
    const maxSites = daysWanted * p.maxStops;
    chosen = rankSites(all, mode, org.point, region).slice(0, maxSites);
    omitted = Math.max(0, all.length - chosen.length);
    if (!chosen.length) chosen = all.slice(0, maxSites);
    const actualDays = Math.max(1, Math.min(daysWanted, chosen.length));
    const globalOrder = orderSites(chosen, org.point || pointOf(chosen[0]));
    groups = splitBalancedOrder(globalOrder, actualDays, p.maxStops);
  }

  const planDays = [];
  let prevSite = null;
  let totalKm = 0;
  let trainCount = 0;
  let flightCount = 0;
  for (const group of groups) {
    const firstCity = group[0]?.city || '';
    const gatewayUnit = closestCity(centroid(group.map(pointOf)), units);
    const gateway = gatewayUnit
      ? { name: gatewayUnit.city, point: cityCenters.get(`${gatewayUnit.prov}|${gatewayUnit.city}`) || pointOf(gatewayUnit) }
      : { name: '就近城市', point: centroid(group.map(pointOf)) };
    const start = prevSite || (org.point ? { point: org.point, name: org.name || '出发地', city: org.city || (org.name !== '当前位置' ? org.name : '') } : null);
    const ordered = group.slice();
    const day = { n: planDays.length + 1, sites: [], legs: [], km: 0, train: 0, flight: 0, startName: start?.name || '', endCity: ordered[ordered.length - 1]?.city || '' };
    let t = 8 * 60 + 30;
    let dayStart = start?.point || null;

    const first = ordered[0];
    const toFirst = first ? pointOf(first) : null;
    if (dayStart && first) {
      const straight = haversine(dayStart, toFirst);
      const fromCity = start?.city || org.city || (start?.name && start.name !== '当前位置' ? start.name : '出发地');
      const toCity = first.city || gateway.name;
      const destPoint = first.city
        ? cityCenters.get(`${first.prov}|${first.city}`) || pointOf(first)
        : gateway.point;
      const firstNav = navOf(first);
      const crossCity = fromCity && toCity && fromCity !== toCity;
      const useFlight = (transport === 'flight' || transport === 'mixed') && straight >= (transport === 'flight' ? 650 : 1200);
      const useTrain = !useFlight && (transport === 'train' || transport === 'mixed' || transport === 'flight') && (straight > 160 || (crossCity && straight > 60));

      if (useFlight) {
        const fromAirport = airportFor(fromCity);
        const toAirport = airportFor(toCity);
        const flightKm = Math.round(haversine(dayStart, destPoint));
        const flyMin = minutes(flightKm, 700) + 120;
        day.legs.push({
          at: clock(t),
          type: 'flight',
          from: fromCity,
          to: toCity,
          km: flightKm,
          min: flyMin,
          fromAirport: fromAirport.name,
          toAirport: toAirport.name,
          queryUrl: flightSearch(fromCity, toCity, date),
          text: `从${fromCity}（${fromAirport.name}）飞往${toCity}（${toAirport.name}），约 ${durationText(flyMin)}；航班号和班期以航司 / 携程实时查询为准`,
        });
        totalKm += flightKm;
        flightCount++;
        day.flight = (day.flight || 0) + 1;
        t += flyMin + 35;
        const airportLeg = localLeg({
          fromPoint: destPoint,
          toPoint: toFirst,
          fromName: toAirport.name,
          toName: first.name,
          toUnitId: first.id,
          nav: firstNav,
          transport: 'flight',
          pref: localPref,
        });
        airportLeg.at = clock(t);
        day.legs.push(airportLeg);
        totalKm += airportLeg.km;
        day.km += airportLeg.km;
        t += airportLeg.min;
      } else if (useTrain) {
        const railKm = haversine(dayStart, destPoint) * 1.15;
        const trainMin = minutes(railKm, 150) + 45;
        const fromStation = stationFor(fromCity);
        const toStation = stationFor(toCity);
        day.legs.push({
          at: clock(t),
          type: 'train',
          from: fromCity,
          to: toCity,
          km: Math.round(railKm),
          min: trainMin,
          fromStation,
          toStation,
          queryUrl: trainSearch(fromCity, toCity, date),
          text: `从${fromCity}（${fromStation}）乘高铁 / 动车到${toCity}（${toStation}），约 ${durationText(trainMin)}；建议 G / D 字头，车次以 12306 实时查询为准`,
        });
        totalKm += railKm;
        trainCount++;
        day.train++;
        t += trainMin + 25;
        const stationMin = localPref === 'transit' ? 30 : 22;
        day.legs.push({
          at: clock(t),
          type: localPref === 'transit' ? 'transit' : 'taxi',
          from: toStation,
          to: first.name,
          km: 0,
          min: stationMin,
          toUnitId: first.id,
          navName: firstNav.name,
          navQuery: firstNav.query,
          navAddress: firstNav.address,
          text: `${localPref === 'transit' ? '公交 / 地铁' : '打车 / 包车'}约 ${stationMin} 分钟到${first.name}（具体线路用高德 / 百度地图查）`,
        });
        t += stationMin;
      } else {
        const firstLeg = localLeg({
          fromPoint: dayStart,
          toPoint: toFirst,
          fromName: start?.name || '出发地',
          toName: first.name,
          toUnitId: first.id,
          nav: firstNav,
          transport,
          pref: localPref,
        });
        firstLeg.at = clock(t);
        day.legs.push(firstLeg);
        totalKm += firstLeg.km;
        day.km += firstLeg.km;
        t += firstLeg.min;
      }
    }
    for (let i = 0; i < ordered.length; i++) {
      const u = ordered[i];
      if (i > 0) {
        const prev = ordered[i - 1];
        const uNav = navOf(u);
        const km = roadKm(pointOf(prev), pointOf(u));
        const crossCity = prev.city && u.city && prev.city !== u.city;
        if (crossCity && transport !== 'car' && km > 60) {
          const fromStation = stationFor(prev.city);
          const toStation = stationFor(u.city);
          const railKm = km * 1.15;
          const trainMin = minutes(railKm, 160) + 35;
          day.legs.push({
            at: clock(t),
            type: 'train',
            from: prev.city,
            to: u.city,
            km: Math.round(railKm),
            min: trainMin,
            fromStation,
            toStation,
            queryUrl: trainSearch(prev.city, u.city, date),
            text: `跨城从${prev.city}（${fromStation}）乘高铁 / 动车到${u.city}（${toStation}），约 ${durationText(trainMin)}；车次以 12306 实时查询为准`,
          });
          totalKm += railKm;
          trainCount++;
          day.train++;
          day.crossCity = true;
          t += trainMin + 20;
          day.legs.push({
            at: clock(t),
            type: 'taxi',
            from: toStation,
            to: u.name,
            km: 0,
            min: 20,
            toUnitId: u.id,
            navName: uNav.name,
            navQuery: uNav.query,
            navAddress: uNav.address,
            text: `到${u.city}后打车 / 公交到${u.name}，约 20 分钟（具体线路用高德 / 百度地图查）`,
          });
          t += 20;
        } else {
          const local = localLeg({
            fromPoint: pointOf(prev),
            toPoint: pointOf(u),
            fromName: prev.name,
            toName: u.name,
            toUnitId: u.id,
            nav: uNav,
            transport,
            pref: localPref,
          });
          local.at = clock(t);
          day.legs.push(local);
          totalKm += local.km;
          day.km += local.km;
          t += local.min;
        }
      }
      const visit = visitMinutes(u, p);
      const arrival = clock(t);
      // 午后加一顿饭，不改变真实营业时间，只做节奏提示
      if (t >= 12 * 60 && t < 13 * 60) {
        day.legs.push({ at: clock(t), type: 'lunch', from: '途中', to: '', km: 0, min: 45, text: '午餐与休整' });
        t += 45;
      }
      const arrive2 = clock(t);
      t += visit;
      day.sites.push({
        unit: u,
        arrival: arrival === arrive2 ? arrival : `${arrival} / ${arrive2}`,
        visit,
        depart: clock(t),
        note: `${u.catName} · ${u.era}`,
        nav: navOf(u),
      });
      day.legs.push({ at: clock(t), type: 'visit', siteId: u.id, from: u.name, to: '', km: 0, min: visit, text: `参观${u.name}` });
    }
    day.endTime = clock(t);
    if (day.crossCity) day.warning = '这天含跨城移动，已优先排高铁 / 动车；请按 12306 核对车次，不要把跨城段改成打车。';
    if (day.endTime > '18:30') day.warning = day.warning ? `${day.warning} 这天节奏偏紧，建议减少一处或改住附近。` : '这天节奏偏紧，建议减少一处或改住附近。';
    prevSite = ordered[ordered.length - 1] ? { point: pointOf(ordered[ordered.length - 1]), name: ordered[ordered.length - 1].city || ordered[ordered.length - 1].name, city: ordered[ordered.length - 1].city } : prevSite;
    planDays.push(day);
  }

  const routeSites = planDays.flatMap((d) => d.sites.map((s) => s.unit));
  const cities = [...new Set(routeSites.map((u) => u.city).filter(Boolean))];
  const summary = {
    siteCount: routeSites.length,
    dayCount: planDays.length,
    totalKm: Math.round(totalKm),
    trainCount,
    flightCount,
    date: date || '',
    omitted,
    cities,
    origin: org,
    transport,
    pace: p.label,
    regionLabel: regionLabel || '',
    notes: [
      '路线为本地智能规划：按地理聚类与距离排序生成，不是实时导航。',
      '高铁/动车车次、航班号与班期请分别以 12306 / 航司或携程为准；页面中的时间为行程估算，不是实际班次时刻。',
      '自驾里程与用时为道路估算，实际以导航为准。',
      '景区开放时间、预约与闭馆日请以官方公告为准。',
      '出发地按城市中心估算；自驾/打车从城市中心或上一站起算。',
      '地图连线只表示行程顺序，不是实际道路轨迹。',
      '跨城优先排高铁 / 动车，只有市内短途才用步行、公交或打车。',
    ],
  };
  return { ok: true, days: planDays, summary, candidates: all.length, origin: org };
}

export function routeMarkdown(plan) {
  if (!plan?.ok) return '';
  const lines = [`# 文保行程 · ${plan.summary.dayCount} 天 ${plan.summary.siteCount} 处`, ''];
  const transportName = { train: '火车为主', flight: '飞机为主', car: '自驾为主', mixed: '自动选择交通（高铁 / 飞机 + 市内公交 / 打车）' }[plan.summary.transport] || plan.summary.transport;
  lines.push(`出发日期：${plan.summary.date || '未填写'}  ·  出发地：${plan.summary.origin.name || '未填写'}  ·  交通：${transportName}  ·  节奏：${plan.summary.pace}`);
  lines.push('');
  for (const d of plan.days) {
    lines.push(`## Day ${d.n} · ${d.sites[0]?.unit.city || ''}${d.sites.length > 1 ? ' → ' + (d.sites[d.sites.length - 1]?.unit.city || '') : ''}`);
    for (const leg of d.legs) {
      if (leg.type === 'visit') continue;
      if (leg.type === 'lunch') lines.push(`- 🍜 ${leg.text}`);
      else if (leg.type === 'train') lines.push(`- 🚄 ${leg.text}（约 ${leg.km} km，${durationText(leg.min)}）\n  查车次：${leg.queryUrl || '12306'}`);
      else if (leg.type === 'flight') lines.push(`- ✈️ ${leg.text}（约 ${leg.km} km，${durationText(leg.min)}）\n  查航班：${leg.queryUrl || '携程'} `);
      else if (leg.type === 'walk') lines.push(`- 🚶 ${leg.text}`);
      else if (leg.type === 'transit') lines.push(`- 🚌 ${leg.text}（约 ${leg.km} km，${durationText(leg.min)}）`);
      else lines.push(`- 🚗 ${leg.text}（约 ${leg.km} km，${durationText(leg.min)}）`);
    }
    for (const s of d.sites) lines.push(`- **${s.unit.name}**（${s.unit.catName} · ${s.unit.era}） ${s.arrival}–${s.depart}\n  导航搜：${s.nav?.query || s.unit.name}  ·  地址：${s.nav?.address || s.unit.addr}`);
    lines.push('');
  }
  lines.push('> 车次、自驾路线、开放时间与预约信息请以 12306 / 导航 / 景区官方公告为准。');
  return lines.join('\n');
}
