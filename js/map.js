// Leaflet 地图控制器：底图、省界、聚合点位、选中与定位
const PROV_SHORT = {
  北京市: '北京', 天津市: '天津', 河北省: '河北', 山西省: '山西', 内蒙古自治区: '内蒙古',
  辽宁省: '辽宁', 吉林省: '吉林', 黑龙江省: '黑龙江', 上海市: '上海', 江苏省: '江苏',
  浙江省: '浙江', 安徽省: '安徽', 福建省: '福建', 江西省: '江西', 山东省: '山东',
  河南省: '河南', 湖北省: '湖北', 湖南省: '湖南', 广东省: '广东', 广西壮族自治区: '广西',
  海南省: '海南', 重庆市: '重庆', 四川省: '四川', 贵州省: '贵州', 云南省: '云南',
  西藏自治区: '西藏', 陕西省: '陕西', 甘肃省: '甘肃', 青海省: '青海', 宁夏回族自治区: '宁夏',
  新疆维吾尔自治区: '新疆', 台湾省: '台湾', 香港特别行政区: '香港', 澳门特别行政区: '澳门',
};

export class HeritageMap {
  constructor(el, opts = {}) {
    this.el = el;
    this.opts = opts;
    this.units = [];
    this.byId = new Map();
    this.markers = new Map();
    this.activeProvince = '';
    this.selectedId = '';
    this.baseMode = 'normal';
    this.provinceLayers = new Map();
    this.ready = false;

    this.map = L.map(el, {
      center: [35.6, 104.2],
      zoom: 4,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: false,
      worldCopyJump: true,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
    });

    const tileOpts = {
      subdomains: ['1', '2', '3', '4'],
      maxZoom: 18,
      minZoom: 3,
      detectRetina: false,
      crossOrigin: false,
    };
    this.normalLayer = L.tileLayer(
      'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      tileOpts,
    );
    this.satelliteLayer = L.layerGroup([
      L.tileLayer(
        'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
        tileOpts,
      ),
      L.tileLayer(
        'https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}',
        tileOpts,
      ),
    ]);
    this.map.createPane('provinceLabels');
    this.map.getPane('provinceLabels').style.zIndex = 640;
    this.normalLayer.addTo(this.map);

    this.cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: false,
      removeOutsideVisibleBounds: true,
      animate: false,
      chunkedLoading: true,
      maxClusterRadius: window.innerWidth < 760 ? 34 : 46,
      disableClusteringAtZoom: 11,
      iconCreateFunction: (cluster) => this.clusterIcon(cluster),
    });
    this.map.addLayer(this.cluster);
    this.labelLayer = L.layerGroup().addTo(this.map);
    this.currentUnits = [];

    this.map.on('zoomend', () => {
      this.el.dataset.zoom = String(this.map.getZoom());
      this.updateOverview();
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.invalidate());
      this.ro.observe(el);
    }
    this.invalidate();
  }

  init(provinces, units, counts) {
    this.units = units;
    this.byId = new Map(units.map((u) => [u.id, u]));
    this.counts = counts || new Map();

    this.provinceLayer = L.geoJSON(provinces, {
      style: (feature) => this.provinceStyle(feature),
      onEachFeature: (feature, layer) => {
        const name = feature.properties?.name || '';
        const short = PROV_SHORT[name] || name.replace(/(省|市|自治区|特别行政区)$/, '');
        const count = this.counts.get(short) || 0;
        this.provinceLayers.set(short, layer);
        layer.bindTooltip(count ? `${short} · ${count} 处` : short, {
          sticky: true,
          className: 'map-tip',
          direction: 'top',
        });
        layer.on('mouseover', () => {
          if (this.activeProvince === short) return;
          layer.setStyle({ fillOpacity: 0.5, weight: 1.4, color: '#b7a88e' });
        });
        layer.on('mouseout', () => this.applyProvinceStyles());
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          this.opts.onProvinceClick?.(short);
        });
      },
    }).addTo(this.map);

    this.provinceLabels = L.layerGroup();
    this.buildProvinceLabels();

    for (const u of units) {
      const marker = L.marker([u.glat, u.glng], { icon: this.markerIcon(u), riseOnHover: true });
      marker.bindTooltip(u.name, {
        direction: 'top',
        offset: [0, -4],
        className: 'map-tip',
        opacity: 1,
      });
      marker.on('click', () => this.opts.onSiteClick?.(u.id));
      this.markers.set(u.id, marker);
    }
    this.ready = true;
    this.updateOverview();
  }

  buildProvinceLabels() {
    if (!this.provinceLabels) return;
    this.provinceLabels.clearLayers();
    const labelProvinces = [...(this.counts || new Map()).entries()].filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
    const offsets = {
      北京: [-8, -22], 天津: [28, -2], 河北: [-10, 22],
      上海: [30, 6], 江苏: [-4, -18], 浙江: [12, 22],
      安徽: [-22, 4], 福建: [12, 18], 江西: [-12, 16],
      湖北: [-26, 0], 湖南: [-2, 18], 山东: [22, -8],
      河南: [4, 14], 山西: [-14, -10], 陕西: [-16, 2],
      四川: [-14, 6], 重庆: [2, 14], 贵州: [0, 16],
      云南: [-10, 12], 广西: [2, 14], 广东: [12, 12], 海南: [4, 14],
      宁夏: [-2, -12], 甘肃: [-10, 0], 青海: [-6, 0],
      新疆: [0, 0], 西藏: [0, 0], 内蒙古: [0, -12],
      辽宁: [12, -10], 吉林: [12, -10], 黑龙江: [8, -12], 台湾: [12, 8],
    };
    for (const [short, count] of labelProvinces) {
      const layer = this.provinceLayers.get(short);
      if (!layer) continue;
      const center = layer.feature?.properties?.center;
      if (!center) continue;
      const [dx, dy] = offsets[short] || [0, 0];
      const cls = count >= 400 ? 'is-xl' : count >= 200 ? 'is-lg' : '';
      const label = L.marker([center[1], center[0]], {
        icon: L.divIcon({
          className: 'prov-label-wrap',
          html: '<div class="prov-label ' + cls + '" style="transform:translate(' + dx + 'px,' + dy + 'px)"><b>' + count + '</b><span>' + short + '</span></div>',
          iconSize: [56, 18],
          iconAnchor: [28, 9],
        }),
        interactive: true,
        keyboard: false,
        zIndexOffset: 200,
        pane: 'provinceLabels',
      });
      label.bindTooltip(short + ' · ' + count + ' 处', { direction: 'top', offset: [0, -12], className: 'map-tip' });
      label.on('click', () => this.opts.onProvinceClick?.(short));
      this.provinceLabels.addLayer(label);
    }
  }

  setProvinceCounts(counts) {
    this.counts = counts instanceof Map ? counts : new Map(Object.entries(counts || {}));
    this.buildProvinceLabels();
    for (const [short, layer] of this.provinceLayers) {
      const n = this.counts.get(short) || 0;
      if (layer.getTooltip()) layer.setTooltipContent(n ? short + ' · ' + n + ' 处' : short);
    }
    this.applyProvinceStyles();
  }

  clusterIcon(cluster) {
    const n = cluster.getChildCount();
    const narrow = window.innerWidth < 760;
    const size = n < 10 ? (narrow ? 22 : 26) : n < 100 ? (narrow ? 28 : 32) : (narrow ? 34 : 38);
    const cls = n < 10 ? 'small' : n < 100 ? 'medium' : 'large';
    const label = n > 999 ? `${(n / 1000).toFixed(1)}k` : String(n);
    return L.divIcon({
      html: `<div class="cluster-icon ${cls}">${label}</div>`,
      className: 'cluster-wrap',
      iconSize: [size, size],
    });
  }

  provinceStyle(feature) {
    const name = feature.properties?.name || '';
    const short = PROV_SHORT[name] || name;
    if (!name) {
      return { color: '#c8bca7', weight: 1, fillOpacity: 0, opacity: 0.55, dashArray: '3 4' };
    }
    const detail = this.map.getZoom() >= 5.5 || Boolean(this.activeProvince);
    const active = this.activeProvince === short;
    const n = this.counts?.get(short) || 0;
    const bucket = n >= 400 ? 5 : n >= 300 ? 4 : n >= 200 ? 3 : n >= 100 ? 2 : n > 0 ? 1 : 0;
    const fills = ['#f1e8d8', '#ead3b9', '#e0b596', '#d18f6d', '#bd6a4c', '#a54b35'];
    return {
      color: active ? '#a63a2b' : detail ? '#d9cfbd' : '#c8bca7',
      weight: active ? 1.8 : detail ? 0.8 : 1,
      fillColor: active ? '#e7c9bf' : fills[bucket],
      fillOpacity: active ? 0.12 : detail ? 0.06 : 0.64,
      opacity: detail ? 0.7 : 1,
    };
  }

  applyProvinceStyles() {
    if (!this.provinceLayer) return;
    this.provinceLayer.eachLayer((layer) => layer.setStyle(this.provinceStyle(layer.feature)));
  }

  updateOverview() {
    if (!this.ready) return;
    const overview = !this.activeProvince && this.map.getZoom() < 5.5;
    this.el.classList.toggle('map-overview', overview);
    const foot = this.el.parentElement?.querySelector('.map-foot span');
    if (foot) foot.textContent = overview ? '省级总览 · 颜色越深数量越多' : '© 高德地图';
    this.applyProvinceStyles();
    this.updateSiteLabels(this.currentUnits);
    if (!this.provinceLabels) return;
    if (overview) {
      if (!this.map.hasLayer(this.provinceLabels)) this.provinceLabels.addTo(this.map);
    } else if (this.map.hasLayer(this.provinceLabels)) {
      this.map.removeLayer(this.provinceLabels);
    }
  }

  markerIcon(u, selected = false) {
    const user = this.opts.getUserState?.(u.id) || {};
    const cls = [
      'site-dot',
      user.visited ? 'is-visited' : '',
      user.wish ? 'is-wish' : '',
      u.approx ? 'is-approx' : '',
      selected ? 'is-selected' : '',
    ].filter(Boolean).join(' ');
    return L.divIcon({
      className: 'site-dot-wrap',
      html: '<span class="' + cls + '" style="--c:' + u.catColor + '"></span>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -8],
    });
  }

  refreshMarker(id) {
    const u = this.byId.get(id);
    const marker = this.markers.get(id);
    if (!u || !marker) return;
    marker.setIcon(this.markerIcon(u, this.selectedId === id));
  }

  refreshAllMarkers() {
    for (const id of this.markers.keys()) this.refreshMarker(id);
  }

  updateSiteLabels(units) {
    if (!this.labelLayer) return;
    this.labelLayer.clearLayers();
    if (!units.length || units.length > 12 || this.map.getZoom() < 5) return;
    const esc = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    for (const u of units) {
      const label = L.marker([u.glat, u.glng], {
        icon: L.divIcon({
          className: 'site-label-wrap',
          html: '<div class="site-label">' + esc(u.name) + '</div>',
          iconSize: null,
          iconAnchor: [-14, 12],
        }),
        interactive: false,
        keyboard: false,
        pane: 'provinceLabels',
      });
      this.labelLayer.addLayer(label);
    }
  }

  setSites(units, { fit = false } = {}) {
    if (!this.ready) return;
    this.currentUnits = units;
    this.updateSiteLabels(units);
    this.cluster.clearLayers();
    const layers = [];
    for (const u of units) {
      const m = this.markers.get(u.id);
      if (m) layers.push(m);
    }
    if (layers.length) {
      this.cluster.addLayers(layers);
    }

    if (!fit) return;
    if (!units.length) {
      this.resetView();
      return;
    }
    if (this.activeProvince && this.provinceLayers.has(this.activeProvince)) {
      this.fitProvince(this.activeProvince);
      return;
    }
    if (layers.length === 1) {
      this.map.flyTo(layers[0].getLatLng(), 11, { duration: 0.6 });
      return;
    }
    if (layers.length <= 2200) {
      const bounds = L.latLngBounds(layers.map((l) => l.getLatLng()));
      this.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
    }
  }

  setActiveProvince(short) {
    this.activeProvince = short || '';
    this.applyProvinceStyles();
    this.updateOverview();
  }

  fitProvince(short) {
    const layer = this.provinceLayers.get(short);
    if (!layer) return;
    const bounds = layer.getBounds();
    if (!bounds.isValid()) return;
    this.map.fitBounds(bounds, { padding: [24, 24], maxZoom: 8 });
  }

  focus(id, { open = true } = {}) {
    const u = this.byId.get(id);
    if (!u) return;
    this.select(id);
    this.map.flyTo([u.glat, u.glng], Math.max(this.map.getZoom(), 12), { duration: 0.75 });
    const marker = this.markers.get(id);
    if (open && marker && this.cluster.hasLayer(marker)) {
      this.cluster.zoomToShowLayer(marker, () => {});
    }
  }

  select(id) {
    if (this.selectedId && this.selectedId !== id) this.refreshMarker(this.selectedId);
    this.selectedId = id || '';
    if (id) {
      this.refreshMarker(id);
      const marker = this.markers.get(id);
      if (marker) marker.bringToFront?.();
    }
  }

  resetView() {
    this.map.fitBounds([[18, 73], [54, 135]], { padding: [6, 6], animate: false });
  }

  zoomIn() { this.map.zoomIn(); }
  zoomOut() { this.map.zoomOut(); }

  setBase(mode) {
    this.baseMode = mode;
    this.map.removeLayer(this.normalLayer);
    if (this.map.hasLayer(this.satelliteLayer)) this.map.removeLayer(this.satelliteLayer);
    this.el.classList.remove('map-none');
    if (mode === 'normal') {
      this.normalLayer.addTo(this.map);
      if (this.normalLayer.bringToBack) this.normalLayer.bringToBack();
    } else if (mode === 'satellite') {
      this.satelliteLayer.addTo(this.map);
      if (this.satelliteLayer.eachLayer) {
        this.satelliteLayer.eachLayer((l) => l.bringToBack && l.bringToBack());
      }
    } else {
      this.el.classList.add('map-none');
    }
  }

  cycleBase() {
    const order = ['normal', 'satellite', 'none'];
    const next = order[(order.indexOf(this.baseMode) + 1) % order.length];
    this.setBase(next);
    return next;
  }

  invalidate() {
    if (!this.map) return;
    setTimeout(() => {
      try { this.map.invalidateSize({ animate: false }); } catch { /* noop */ }
    }, 80);
  }
}
