(() => {
  'use strict';

  const VN_SDI_MAP_URL = 'https://vnsdi.mae.gov.vn/server/rest/services/BDHCVN/BanDoHanhChinhVietNam/MapServer';
  const VN_ADMIN_OVERLAY_URL = 'https://dosm.vnsdi.gov.vn/server/rest/services/Hosted/DuongBienGioiDiaGioi_dam_09112023/MapServer';
  const VIETNAM_BOUNDS = L.latLngBounds([8.0, 102.0], [23.8, 110.8]);
  const $ = (id) => document.getElementById(id);

  const els = {
    sheet: $('mapSheet'), pageSize: $('pageSize'), orientation: $('orientation'), gridInterval: $('gridInterval'), exportScale: $('exportScale'),
    paperBadge: $('paperBadge'), gridBadge: $('gridBadge'), presetBtn: $('presetBtn'),
    titleInput: $('titleInput'), subtitleInput: $('subtitleInput'), provinceInput: $('provinceInput'), communeInput: $('communeInput'),
    mapCodeInput: $('mapCodeInput'), authorInput: $('authorInput'), agencyInput: $('agencyInput'), sourceInput: $('sourceInput'), noteInput: $('noteInput'),
    logoInput: $('logoInput'), clearLogoBtn: $('clearLogoBtn'), agencyLogo: $('agencyLogo'),
    mapTitle: $('mapTitle'), mapSubtitle: $('mapSubtitle'), mapPlace: $('mapPlace'), agencyText: $('agencyText'), mapCodePrint: $('mapCodePrint'),
    provincePrint: $('provincePrint'), communePrint: $('communePrint'), sourcePrint: $('sourcePrint'), notePrint: $('notePrint'), authorPrint: $('authorPrint'),
    basemapPrint: $('basemapPrint'), mapDate: $('mapDate'), datePrint: $('datePrint'), featureCountPrint: $('featureCountPrint'),
    basemapSelect: $('basemapSelect'), adminToggle: $('adminToggle'), gridToggle: $('gridToggle'), featureLabelToggle: $('featureLabelToggle'),
    insetToggle: $('insetToggle'), watermarkToggle: $('watermarkToggle'), zoomControlToggle: $('zoomControlToggle'), mapWatermark: $('mapWatermark'),
    baseOpacity: $('baseOpacity'), boundaryOpacity: $('boundaryOpacity'), geojsonInput: $('geojsonInput'), geoDropBox: $('geoDropBox'),
    fitDataBtn: $('fitDataBtn'), clearDataBtn: $('clearDataBtn'), dataSummary: $('dataSummary'), serviceStatus: $('serviceStatus'),
    latInput: $('latInput'), lngInput: $('lngInput'), goCoordBtn: $('goCoordBtn'), addAnnotationBtn: $('addAnnotationBtn'), clearAnnotationsBtn: $('clearAnnotationsBtn'),
    saveProjectBtn: $('saveProjectBtn'), loadProjectInput: $('loadProjectInput'), exportPngBtn: $('exportPngBtn'), exportPdfBtn: $('exportPdfBtn'),
    printBtn: $('printBtn'), resetBtn: $('resetBtn'), coordinateGrid: $('coordinateGrid'), scaleBar: $('scaleBar'), scaleLabel: $('scaleLabel'),
    scaleRatio: $('scaleRatio'), scaleRatioPrint: $('scaleRatioPrint'), cursorCoords: $('cursorCoords'), insetCard: $('insetCard'), insetCaption: $('insetCaption'),
    toast: $('toast')
  };

  const map = L.map('map', {
    zoomControl: true,
    attributionControl: true,
    preferCanvas: true,
    minZoom: 4,
    maxZoom: 20
  });
  ['basePane', 'adminPane', 'boundaryPane', 'labelPane'].forEach(name => map.createPane(name));
  map.getPane('basePane').style.zIndex = 200;
  map.getPane('adminPane').style.zIndex = 390;
  map.getPane('boundaryPane').style.zIndex = 420;
  map.getPane('labelPane').style.zIndex = 470;
  map.fitBounds(VIETNAM_BOUNDS, { padding: [12, 12] });

  const bases = {
    osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      pane: 'basePane', maxZoom: 19, crossOrigin: true,
      attribution: '&copy; OpenStreetMap contributors'
    }),
    imagery: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      pane: 'basePane', maxZoom: 19, crossOrigin: true,
      attribution: 'Tiles &copy; Esri'
    }),
    vnsdi: L.esri.dynamicMapLayer({
      url: VN_SDI_MAP_URL, pane: 'basePane', opacity: Number(els.baseOpacity.value), f: 'image'
    })
  };

  let activeBase = bases.osm.addTo(map);
  let adminLayer = null;
  let adminFallback = null;
  let geoLayer = null;
  let loadedGeoJSON = null;
  let selectedFeatureLayer = null;
  let annotationMode = false;
  let logoDataUrl = '';
  let coordMarker = null;
  let annotationSerial = 0;
  const annotationRecords = [];

  const featureLabels = L.layerGroup().addTo(map);
  const annotationsLayer = L.layerGroup().addTo(map);

  const insetMap = L.map('insetMap', {
    attributionControl: false, zoomControl: false, dragging: false, scrollWheelZoom: false,
    doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false, preferCanvas: true
  }).setView([15.8, 107.5], 4.4);
  const insetContext = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 13, opacity: .22, crossOrigin: true
  }).addTo(insetMap);
  const insetBoundaries = L.layerGroup().addTo(insetMap);

  function toast(message, duration = 2400) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove('show'), duration);
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function stripAccents(text = '') {
    return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  }

  function propertyValue(props, candidates) {
    if (!props) return '';
    const normalized = Object.entries(props).map(([key, value]) => [stripAccents(key).replace(/[^a-z0-9]/g, ''), value]);
    for (const candidate of candidates) {
      const key = stripAccents(candidate).replace(/[^a-z0-9]/g, '');
      const hit = normalized.find(([k, value]) => k === key && value !== null && value !== undefined && String(value).trim());
      if (hit) return String(hit[1]).trim();
    }
    return '';
  }

  function featureName(feature) {
    const p = feature?.properties || {};
    return propertyValue(p, ['TEN_XA', 'TENXA', 'TENPHUONG', 'TEN_PHUONG', 'XA_PHUONG', 'COMMUNE', 'WARD', 'NAME_3', 'NAME_2', 'NAME', 'TEN', 'TENDVHC', 'ten_dvhc']) || 'Đối tượng hành chính';
  }

  function featureProvince(feature) {
    const p = feature?.properties || {};
    return propertyValue(p, ['TEN_TINH', 'TENTINH', 'TINH_THANH', 'PROVINCE', 'NAME_1', 'TINH', 'TP', 'ten_tinh']);
  }

  function countFeatures(data) {
    if (!data) return 0;
    if (data.type === 'FeatureCollection') return Array.isArray(data.features) ? data.features.length : 0;
    if (data.type === 'Feature') return 1;
    return 1;
  }

  function localDate() {
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  }

  function updateText() {
    const title = els.titleInput.value.trim() || 'BẢN ĐỒ HÀNH CHÍNH CẤP XÃ';
    const subtitle = els.subtitleInput.value.trim();
    const province = els.provinceInput.value.trim();
    const commune = els.communeInput.value.trim();
    const code = els.mapCodeInput.value.trim() || 'VF-COMMUNE';
    const author = els.authorInput.value.trim() || 'Long Ngo';
    const date = localDate();

    els.mapTitle.textContent = title;
    els.mapSubtitle.textContent = subtitle;
    els.agencyText.textContent = els.agencyInput.value.trim() || 'VIETFLEXMAP';
    els.mapPlace.textContent = [province, commune].filter(Boolean).join(' · ').toUpperCase() || 'TỈNH / THÀNH PHỐ · XÃ / PHƯỜNG';
    els.mapCodePrint.textContent = code;
    els.provincePrint.textContent = province || '—';
    els.communePrint.textContent = commune || '—';
    els.sourcePrint.textContent = els.sourceInput.value.trim() || '—';
    els.notePrint.textContent = els.noteInput.value.trim() || '—';
    els.authorPrint.textContent = `Thiết kế / biên tập: ${author}`;
    els.mapDate.textContent = date;
    els.datePrint.textContent = date;
    els.insetCaption.textContent = commune ? `Vị trí ${commune}${province ? ` trong ${province}` : ''}` : 'Vị trí xã trong tỉnh';
  }

  ['titleInput', 'subtitleInput', 'provinceInput', 'communeInput', 'mapCodeInput', 'authorInput', 'agencyInput', 'sourceInput', 'noteInput']
    .forEach(id => $(id).addEventListener('input', updateText));
  updateText();

  function applyPage() {
    const size = els.pageSize.value;
    const orientation = els.orientation.value;
    els.sheet.dataset.size = size;
    els.sheet.dataset.orientation = orientation;
    els.sheet.classList.toggle('compact', size === 'A4');
    els.sheet.classList.toggle('large', size === 'A2');
    els.paperBadge.textContent = `${size} · ${orientation === 'landscape' ? 'Ngang' : 'Dọc'}`;
    let style = document.getElementById('dynamicPageStyle');
    if (!style) {
      style = document.createElement('style');
      style.id = 'dynamicPageStyle';
      document.head.appendChild(style);
    }
    style.textContent = `@page{size:${size} ${orientation};margin:0}`;
    setTimeout(() => {
      map.invalidateSize();
      insetMap.invalidateSize();
      updateDecorations();
    }, 90);
  }
  els.pageSize.addEventListener('change', applyPage);
  els.orientation.addEventListener('change', applyPage);
  applyPage();

  function setBasemapLabel(value) {
    const labels = {
      osm: 'Vietflex · OpenStreetMap', imagery: 'Vệ tinh · Esri World Imagery',
      vnsdi: 'VN-SDI · Bản đồ hành chính', none: 'Nền trắng'
    };
    els.basemapPrint.textContent = labels[value] || value;
  }

  function switchBasemap() {
    if (activeBase && map.hasLayer(activeBase)) map.removeLayer(activeBase);
    const value = els.basemapSelect.value;
    activeBase = value === 'none' ? null : bases[value];
    if (activeBase) {
      activeBase.setOpacity?.(Number(els.baseOpacity.value));
      activeBase.addTo(map);
    }
    setBasemapLabel(value);
    adminLayer?.bringToFront?.();
    adminFallback?.bringToFront?.();
    geoLayer?.bringToFront?.();
  }
  els.basemapSelect.addEventListener('change', switchBasemap);
  els.baseOpacity.addEventListener('input', () => {
    const opacity = Number(els.baseOpacity.value);
    Object.values(bases).forEach(layer => layer.setOpacity?.(opacity));
  });

  function createAdminOverlay() {
    try {
      adminLayer = L.esri.tiledMapLayer({
        url: VN_ADMIN_OVERLAY_URL,
        pane: 'adminPane',
        opacity: Number(els.boundaryOpacity.value)
      });
      adminLayer.on('loading', () => {
        els.serviceStatus.textContent = 'Đang tải lớp biên giới / địa giới VN-SDI…';
        els.serviceStatus.className = 'status';
      });
      adminLayer.on('load', () => {
        els.serviceStatus.textContent = 'VN-SDI/DOSM: lớp biên giới – địa giới đang hoạt động.';
        els.serviceStatus.className = 'status ok';
      });
      adminLayer.on('requesterror', () => activateAdminFallback());
      if (els.adminToggle.checked) adminLayer.addTo(map);
    } catch (error) {
      activateAdminFallback();
    }
  }

  function activateAdminFallback() {
    if (adminLayer && map.hasLayer(adminLayer)) map.removeLayer(adminLayer);
    if (!adminFallback) {
      adminFallback = L.esri.dynamicMapLayer({
        url: VN_SDI_MAP_URL,
        pane: 'adminPane',
        opacity: Number(els.boundaryOpacity.value),
        f: 'image'
      });
      adminFallback.on?.('requesterror', () => {
        els.serviceStatus.textContent = 'VN-SDI đang hạn chế tải lớp ranh giới. GeoJSON địa phương vẫn dùng bình thường.';
        els.serviceStatus.className = 'status warn';
      });
    }
    if (els.adminToggle.checked && !map.hasLayer(adminFallback)) adminFallback.addTo(map);
    els.serviceStatus.textContent = 'Đang dùng lớp hành chính VN-SDI dự phòng.';
    els.serviceStatus.className = 'status warn';
  }
  createAdminOverlay();

  els.adminToggle.addEventListener('change', () => {
    [adminLayer, adminFallback].forEach(layer => {
      if (!layer) return;
      if (els.adminToggle.checked) {
        if (!map.hasLayer(layer)) layer.addTo(map);
      } else if (map.hasLayer(layer)) map.removeLayer(layer);
    });
  });

  els.boundaryOpacity.addEventListener('input', () => {
    const opacity = Number(els.boundaryOpacity.value);
    adminLayer?.setOpacity?.(opacity);
    adminFallback?.setOpacity?.(opacity);
    geoLayer?.setStyle?.(layerStyle);
  });

  function layerStyle(feature) {
    const selected = selectedFeatureLayer && selectedFeatureLayer.feature === feature;
    const opacity = Number(els.boundaryOpacity.value);
    return selected
      ? { pane: 'boundaryPane', color: '#8f2323', weight: 3.3, opacity, fillColor: '#d7655d', fillOpacity: .2 }
      : { pane: 'boundaryPane', color: '#24506d', weight: 1.45, opacity, fillColor: '#f8fbfd', fillOpacity: .035, dashArray: '5 3' };
  }

  function clearFeatureLabels() {
    featureLabels.clearLayers();
  }

  function layerCenter(layer) {
    if (layer?.getBounds) {
      const bounds = layer.getBounds();
      if (bounds?.isValid?.()) return bounds.getCenter();
    }
    if (layer?.getLatLng) return layer.getLatLng();
    return null;
  }

  function rebuildFeatureLabels() {
    clearFeatureLabels();
    if (!geoLayer || !els.featureLabelToggle.checked) return;
    const mapBounds = map.getBounds().pad(.08);
    let count = 0;
    geoLayer.eachLayer(layer => {
      if (count >= 90) return;
      const center = layerCenter(layer);
      if (!center || !mapBounds.contains(center)) return;
      const name = featureName(layer.feature);
      L.marker(center, {
        pane: 'labelPane', interactive: false,
        icon: L.divIcon({ className: 'feature-label', html: `<span>${escapeHtml(name)}</span>`, iconSize: [0, 0], iconAnchor: [0, 0] })
      }).addTo(featureLabels);
      count++;
    });
  }

  function selectFeature(layer, zoom = false) {
    if (selectedFeatureLayer?.setStyle) selectedFeatureLayer.setStyle(layerStyle(selectedFeatureLayer.feature));
    selectedFeatureLayer = layer;
    layer.setStyle?.(layerStyle(layer.feature));
    layer.bringToFront?.();
    const name = featureName(layer.feature);
    const province = featureProvince(layer.feature);
    els.communeInput.value = name;
    if (province) els.provinceInput.value = province;
    updateText();
    refreshInset();
    if (zoom && layer.getBounds) {
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
    toast(`Đã chọn: ${name}`);
  }

  function normalizeGeoJSON(json) {
    if (!json || !json.type) throw new Error('Không có type GeoJSON');
    const valid = ['FeatureCollection', 'Feature', 'Polygon', 'MultiPolygon', 'Point', 'MultiPoint', 'LineString', 'MultiLineString', 'GeometryCollection'];
    if (!valid.includes(json.type)) throw new Error('Không phải GeoJSON hợp lệ');
    if (json.type === 'FeatureCollection' || json.type === 'Feature') return json;
    return { type: 'Feature', properties: {}, geometry: json };
  }

  function loadGeoJSON(data, options = {}) {
    const normalized = normalizeGeoJSON(data);
    if (geoLayer) map.removeLayer(geoLayer);
    loadedGeoJSON = normalized;
    selectedFeatureLayer = null;

    geoLayer = L.geoJSON(normalized, {
      pane: 'boundaryPane',
      style: layerStyle,
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
        pane: 'boundaryPane', radius: 5, color: '#24506d', weight: 1.5, fillColor: '#fff', fillOpacity: .75
      }),
      onEachFeature: (feature, layer) => {
        const name = featureName(feature);
        layer.bindTooltip(name, { sticky: true, direction: 'top' });
        layer.on('click', event => {
          if (annotationMode) return;
          L.DomEvent.stopPropagation(event);
          selectFeature(layer, false);
        });
      }
    }).addTo(map);

    const featureCount = countFeatures(normalized);
    els.featureCountPrint.textContent = String(featureCount);
    els.dataSummary.textContent = `Đã nạp ${featureCount.toLocaleString('vi-VN')} đối tượng GeoJSON.`;
    els.dataSummary.className = 'status ok';

    rebuildFeatureLabels();
    refreshInset();
    if (options.fit !== false) {
      const bounds = geoLayer.getBounds?.();
      if (bounds?.isValid?.()) map.fitBounds(bounds, { padding: [28, 28] });
    }

    if (options.selectName) {
      let match = null;
      geoLayer.eachLayer(layer => {
        if (!match && stripAccents(featureName(layer.feature)) === stripAccents(options.selectName)) match = layer;
      });
      if (match) selectFeature(match, false);
    } else if (options.selectFirst !== false) {
      let first = null;
      geoLayer.eachLayer(layer => { if (!first) first = layer; });
      if (first) selectFeature(first, false);
    }
  }

  async function readGeoJSONFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      loadGeoJSON(json);
      toast(`Đã nạp ${file.name}`);
    } catch (error) {
      console.error(error);
      toast('Không đọc được GeoJSON/JSON. Kiểm tra cấu trúc và hệ tọa độ.', 3800);
    }
  }
  els.geojsonInput.addEventListener('change', event => readGeoJSONFile(event.target.files?.[0]));

  ['dragenter', 'dragover'].forEach(type => els.geoDropBox.addEventListener(type, event => {
    event.preventDefault();
    els.geoDropBox.classList.add('dragging');
  }));
  ['dragleave', 'drop'].forEach(type => els.geoDropBox.addEventListener(type, event => {
    event.preventDefault();
    els.geoDropBox.classList.remove('dragging');
  }));
  els.geoDropBox.addEventListener('drop', event => readGeoJSONFile(event.dataTransfer?.files?.[0]));

  els.fitDataBtn.addEventListener('click', () => {
    const bounds = geoLayer?.getBounds?.();
    if (bounds?.isValid?.()) map.fitBounds(bounds, { padding: [30, 30] });
    else toast('Chưa có GeoJSON để zoom.');
  });

  function clearGeoJSON(showToast = true) {
    if (geoLayer) map.removeLayer(geoLayer);
    geoLayer = null;
    loadedGeoJSON = null;
    selectedFeatureLayer = null;
    clearFeatureLabels();
    insetBoundaries.clearLayers();
    insetMap.setView([15.8, 107.5], 4.4);
    els.featureCountPrint.textContent = '0';
    els.dataSummary.textContent = 'Chưa nạp GeoJSON địa phương.';
    els.dataSummary.className = 'status';
    els.geojsonInput.value = '';
    refreshInset();
    if (showToast) toast('Đã xóa lớp GeoJSON.');
  }
  els.clearDataBtn.addEventListener('click', () => clearGeoJSON(true));
  els.featureLabelToggle.addEventListener('change', rebuildFeatureLabels);

  function refreshInset() {
    insetBoundaries.clearLayers();
    if (!loadedGeoJSON) {
      insetMap.setView([15.8, 107.5], 4.4);
      els.insetCaption.textContent = 'Nạp ranh giới tỉnh/xã để tạo sơ đồ vị trí';
      return;
    }
    const context = L.geoJSON(loadedGeoJSON, {
      interactive: false,
      style: feature => selectedFeatureLayer?.feature === feature
        ? { color: '#8f2323', weight: 2.2, fillColor: '#d7655d', fillOpacity: .46 }
        : { color: '#586c79', weight: .75, fillColor: '#f7f5ee', fillOpacity: .32 },
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 3, color: '#586c79', weight: 1, fillOpacity: .35 })
    }).addTo(insetBoundaries);
    const bounds = context.getBounds?.();
    if (bounds?.isValid?.()) insetMap.fitBounds(bounds, { padding: [8, 8] });
    const center = layerCenter(selectedFeatureLayer);
    if (center) L.circleMarker(center, { radius: 4, color: '#8f2323', fillColor: '#8f2323', fillOpacity: 1, weight: 1 }).addTo(insetBoundaries);
    updateText();
  }
  els.insetToggle.addEventListener('change', () => {
    els.insetCard.style.display = els.insetToggle.checked ? '' : 'none';
    setTimeout(() => insetMap.invalidateSize(), 50);
  });
  els.watermarkToggle.addEventListener('change', () => {
    els.mapWatermark.style.display = els.watermarkToggle.checked ? '' : 'none';
  });

  function addSvgElement(name, attrs, text) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    els.coordinateGrid.appendChild(node);
    return node;
  }

  function autoGridInterval(bounds) {
    const span = Math.max(bounds.getEast() - bounds.getWest(), bounds.getNorth() - bounds.getSouth());
    const target = span / 6;
    const steps = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10];
    return steps.find(step => step >= target) || 10;
  }

  function gridStep() {
    const bounds = map.getBounds();
    return els.gridInterval.value === 'auto' ? autoGridInterval(bounds) : Number(els.gridInterval.value);
  }

  function dms(value, axis, step) {
    const suffix = axis === 'lon' ? (value >= 0 ? 'E' : 'W') : (value >= 0 ? 'N' : 'S');
    const abs = Math.abs(value);
    if (step >= 1) return `${Math.round(abs)}°${suffix}`;
    const deg = Math.floor(abs + 1e-10);
    const minutesTotal = (abs - deg) * 60;
    if (step >= 1 / 60) return `${deg}°${Math.round(minutesTotal)}′${suffix}`;
    const min = Math.floor(minutesTotal + 1e-8);
    const sec = Math.round((minutesTotal - min) * 60);
    return `${deg}°${String(min).padStart(2, '0')}′${String(sec).padStart(2, '0')}″${suffix}`;
  }

  function updateGrid() {
    const svg = els.coordinateGrid;
    if (!els.gridToggle.checked) {
      svg.innerHTML = '';
      svg.style.display = 'none';
      els.gridBadge.textContent = 'Lưới: tắt';
      return;
    }
    svg.style.display = '';
    const container = map.getContainer();
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;

    const bounds = map.getBounds();
    const step = gridStep();
    els.gridBadge.textContent = `Lưới: ${step.toLocaleString('vi-VN')}°`;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML = '';

    const westStart = Math.ceil((bounds.getWest() - 1e-10) / step) * step;
    const southStart = Math.ceil((bounds.getSouth() - 1e-10) / step) * step;
    let verticalCount = 0;
    let horizontalCount = 0;

    for (let lng = westStart; lng <= bounds.getEast() + step * .001 && verticalCount < 18; lng += step) {
      const x = map.latLngToContainerPoint([bounds.getCenter().lat, lng]).x;
      if (x < 2 || x > w - 2) continue;
      const label = dms(lng, 'lon', step);
      addSvgElement('line', { x1: x, y1: 0, x2: x, y2: h, class: 'grid-line' });
      addSvgElement('line', { x1: x, y1: 0, x2: x, y2: 10, class: 'grid-tick' });
      addSvgElement('line', { x1: x, y1: h - 10, x2: x, y2: h, class: 'grid-tick' });
      addSvgElement('text', { x, y: 13, class: 'grid-label', 'text-anchor': 'middle' }, label);
      addSvgElement('text', { x, y: h - 4, class: 'grid-label', 'text-anchor': 'middle' }, label);
      verticalCount++;
    }

    for (let lat = southStart; lat <= bounds.getNorth() + step * .001 && horizontalCount < 18; lat += step) {
      const y = map.latLngToContainerPoint([lat, bounds.getCenter().lng]).y;
      if (y < 2 || y > h - 2) continue;
      const label = dms(lat, 'lat', step);
      addSvgElement('line', { x1: 0, y1: y, x2: w, y2: y, class: 'grid-line' });
      addSvgElement('line', { x1: 0, y1: y, x2: 10, y2: y, class: 'grid-tick' });
      addSvgElement('line', { x1: w - 10, y1: y, x2: w, y2: y, class: 'grid-tick' });
      addSvgElement('text', { x: 5, y: y - 4, class: 'grid-label side', 'text-anchor': 'start' }, label);
      addSvgElement('text', { x: w - 5, y: y - 4, class: 'grid-label side', 'text-anchor': 'end' }, label);
      horizontalCount++;
    }
  }

  function niceDistance(value) {
    if (!Number.isFinite(value) || value <= 0) return 1;
    const power = Math.pow(10, Math.floor(Math.log10(value)));
    const n = value / power;
    const nice = n >= 5 ? 5 : n >= 2 ? 2 : 1;
    return nice * power;
  }

  function niceRatio(value) {
    if (!Number.isFinite(value) || value <= 0) return 0;
    const power = Math.pow(10, Math.floor(Math.log10(value)));
    const n = value / power;
    const nice = n >= 7.5 ? 10 : n >= 3.75 ? 5 : n >= 1.75 ? 2.5 : 1;
    return Math.round(nice * power);
  }

  function trimZero(number) {
    return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, '');
  }

  function updateScale() {
    const container = map.getContainer();
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    const span = Math.min(170, Math.max(90, w * .13));
    const left = map.containerPointToLatLng([w / 2 - span / 2, h / 2]);
    const right = map.containerPointToLatLng([w / 2 + span / 2, h / 2]);
    const measured = map.distance(left, right);
    const target = niceDistance(measured);
    const px = Math.max(48, Math.min(185, span * target / measured));
    els.scaleBar.style.width = `${px}px`;
    els.scaleLabel.textContent = target >= 1000 ? `${trimZero(target / 1000)} km` : `${Math.round(target)} m`;

    const metersPerPixel = measured / span;
    const denominator = niceRatio(metersPerPixel / (0.0254 / 96));
    const formatted = denominator ? denominator.toLocaleString('vi-VN') : '—';
    els.scaleRatio.textContent = `Tỷ lệ ~ 1:${formatted}`;
    els.scaleRatioPrint.textContent = `TỶ LỆ XẤP XỈ 1:${formatted}`;
  }

  let decoFrame = 0;
  function updateDecorations() {
    cancelAnimationFrame(decoFrame);
    decoFrame = requestAnimationFrame(() => {
      updateGrid();
      updateScale();
    });
  }
  map.on('move zoom resize', updateDecorations);
  map.on('moveend zoomend', rebuildFeatureLabels);
  els.gridToggle.addEventListener('change', updateGrid);
  els.gridInterval.addEventListener('change', updateGrid);
  setTimeout(updateDecorations, 180);

  map.on('mousemove', event => {
    els.cursorCoords.textContent = `Kinh độ ${event.latlng.lng.toFixed(6)} · Vĩ độ ${event.latlng.lat.toFixed(6)}`;
  });

  function createAnnotation(latlng, text, options = {}) {
    const record = {
      id: options.id || `a${++annotationSerial}`,
      lat: Number(latlng.lat), lng: Number(latlng.lng), text: String(text).trim(), marker: null
    };
    const marker = L.marker([record.lat, record.lng], {
      pane: 'labelPane', draggable: true,
      icon: L.divIcon({ className: 'annotation-label', html: `<span>${escapeHtml(record.text)}</span>`, iconSize: [0, 0], iconAnchor: [0, 0] })
    }).addTo(annotationsLayer);
    record.marker = marker;
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      record.lat = p.lat;
      record.lng = p.lng;
    });
    marker.on('dblclick', event => {
      L.DomEvent.stopPropagation(event);
      annotationsLayer.removeLayer(marker);
      const index = annotationRecords.findIndex(item => item.id === record.id);
      if (index >= 0) annotationRecords.splice(index, 1);
      toast('Đã xóa ghi chú.');
    });
    annotationRecords.push(record);
    return marker;
  }

  els.addAnnotationBtn.addEventListener('click', () => {
    annotationMode = true;
    document.body.classList.add('annotation-mode');
    els.addAnnotationBtn.textContent = 'Click lên bản đồ…';
    toast('Click vị trí cần ghi chú trên bản đồ.');
  });

  map.on('click', event => {
    if (!annotationMode) return;
    annotationMode = false;
    document.body.classList.remove('annotation-mode');
    els.addAnnotationBtn.textContent = '+ Thêm ghi chú';
    const text = window.prompt('Nội dung nhãn / ghi chú:', 'Ghi chú');
    if (!text?.trim()) return;
    createAnnotation(event.latlng, text);
  });

  function clearAnnotations(showToast = true) {
    annotationsLayer.clearLayers();
    annotationRecords.length = 0;
    if (showToast) toast('Đã xóa ghi chú trên bản đồ.');
  }
  els.clearAnnotationsBtn.addEventListener('click', () => clearAnnotations(true));

  function goToCoordinate() {
    const lat = Number(String(els.latInput.value).replace(',', '.'));
    const lng = Number(String(els.lngInput.value).replace(',', '.'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      toast('Tọa độ không hợp lệ. Nhập vĩ độ và kinh độ dạng số.', 3200);
      return;
    }
    if (coordMarker) map.removeLayer(coordMarker);
    coordMarker = L.marker([lat, lng], {
      pane: 'labelPane',
      icon: L.divIcon({ className: 'coord-marker', iconSize: [12, 12], iconAnchor: [6, 6] })
    }).addTo(map).bindTooltip(`${lat.toFixed(6)}, ${lng.toFixed(6)}`, { direction: 'top' });
    map.setView([lat, lng], Math.max(map.getZoom(), 14));
    toast('Đã định vị tọa độ.');
  }
  els.goCoordBtn.addEventListener('click', goToCoordinate);
  [els.latInput, els.lngInput].forEach(input => input.addEventListener('keydown', event => {
    if (event.key === 'Enter') goToCoordinate();
  }));

  els.resetBtn.addEventListener('click', () => map.fitBounds(VIETNAM_BOUNDS, { padding: [12, 12] }));

  function setLogo(dataUrl) {
    logoDataUrl = dataUrl || '';
    if (logoDataUrl) {
      els.agencyLogo.src = logoDataUrl;
      els.agencyLogo.hidden = false;
    } else {
      els.agencyLogo.removeAttribute('src');
      els.agencyLogo.hidden = true;
    }
  }
  els.logoInput.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
  els.clearLogoBtn.addEventListener('click', () => {
    els.logoInput.value = '';
    setLogo('');
    toast('Đã bỏ logo khỏi layout.');
  });

  function settingsSnapshot() {
    const ids = [
      'pageSize', 'orientation', 'gridInterval', 'exportScale', 'titleInput', 'subtitleInput', 'provinceInput', 'communeInput',
      'mapCodeInput', 'authorInput', 'agencyInput', 'sourceInput', 'noteInput', 'basemapSelect', 'adminToggle', 'gridToggle',
      'featureLabelToggle', 'insetToggle', 'watermarkToggle', 'zoomControlToggle', 'baseOpacity', 'boundaryOpacity'
    ];
    const settings = {};
    ids.forEach(id => {
      const el = $(id);
      settings[id] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return settings;
  }

  function applySettings(settings = {}) {
    Object.entries(settings).forEach(([id, value]) => {
      const el = $(id);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = Boolean(value);
      else el.value = String(value);
    });
    updateText();
    applyPage();
    switchBasemap();
    els.insetCard.style.display = els.insetToggle.checked ? '' : 'none';
    els.mapWatermark.style.display = els.watermarkToggle.checked ? '' : 'none';
    const opacity = Number(els.boundaryOpacity.value);
    adminLayer?.setOpacity?.(opacity);
    adminFallback?.setOpacity?.(opacity);
    if (els.adminToggle.checked) {
      if (adminLayer && !map.hasLayer(adminLayer)) adminLayer.addTo(map);
      if (adminFallback && !map.hasLayer(adminFallback)) adminFallback.addTo(map);
    } else {
      if (adminLayer && map.hasLayer(adminLayer)) map.removeLayer(adminLayer);
      if (adminFallback && map.hasLayer(adminFallback)) map.removeLayer(adminFallback);
    }
    rebuildFeatureLabels();
    updateDecorations();
  }

  function projectObject() {
    const center = map.getCenter();
    return {
      type: 'VietflexmapMapComposerProject', version: 2, savedAt: new Date().toISOString(),
      settings: settingsSnapshot(), logoDataUrl,
      mapView: { lat: center.lat, lng: center.lng, zoom: map.getZoom() },
      selectedFeatureName: selectedFeatureLayer ? featureName(selectedFeatureLayer.feature) : '',
      annotations: annotationRecords.map(({ id, lat, lng, text }) => ({ id, lat, lng, text })),
      geojson: loadedGeoJSON
    };
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  els.saveProjectBtn.addEventListener('click', () => {
    const json = JSON.stringify(projectObject(), null, 2);
    downloadBlob(new Blob([json], { type: 'application/json;charset=utf-8' }), `${filename()}-project.json`);
    toast('Đã lưu project JSON.');
  });

  els.loadProjectInput.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const project = JSON.parse(await file.text());
      if (project.type !== 'VietflexmapMapComposerProject') throw new Error('Sai loại project');
      clearGeoJSON(false);
      clearAnnotations(false);
      applySettings(project.settings || {});
      setLogo(project.logoDataUrl || '');
      if (project.geojson) loadGeoJSON(project.geojson, { fit: false, selectFirst: false, selectName: project.selectedFeatureName || '' });
      (project.annotations || []).forEach(item => createAnnotation(L.latLng(item.lat, item.lng), item.text, { id: item.id }));
      if (project.mapView) map.setView([project.mapView.lat, project.mapView.lng], project.mapView.zoom);
      updateDecorations();
      toast('Đã phục hồi project.');
    } catch (error) {
      console.error(error);
      toast('Không nạp được project JSON.', 3400);
    } finally {
      els.loadProjectInput.value = '';
    }
  });

  els.presetBtn.addEventListener('click', () => {
    applySettings({
      pageSize: 'A3', orientation: 'landscape', gridInterval: 'auto', exportScale: '2',
      titleInput: 'BẢN ĐỒ HÀNH CHÍNH CẤP XÃ', subtitleInput: 'Bản đồ phục vụ tra cứu, báo cáo và trình bày nhanh',
      basemapSelect: 'osm', adminToggle: true, gridToggle: true, featureLabelToggle: true, insetToggle: true,
      watermarkToggle: true, zoomControlToggle: false, baseOpacity: '0.72', boundaryOpacity: '0.98'
    });
    toast('Đã áp dụng preset bản đồ hành chính cấp xã.');
  });

  function filename() {
    const raw = [els.communeInput.value, els.provinceInput.value, els.titleInput.value].filter(Boolean).join('-') || 'ban-do-cap-xa';
    return raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'ban-do-cap-xa';
  }

  async function renderSheet() {
    map.closePopup();
    els.sheet.classList.add('exporting');
    els.sheet.classList.toggle('show-export-zoom', els.zoomControlToggle.checked);
    map.invalidateSize();
    insetMap.invalidateSize();
    updateDecorations();
    await new Promise(resolve => setTimeout(resolve, 260));
    try {
      return await html2canvas(els.sheet, {
        backgroundColor: '#ffffff', useCORS: true, allowTaint: false, logging: false,
        scale: Number(els.exportScale.value) || 2, imageTimeout: 15000, scrollX: 0, scrollY: -window.scrollY
      });
    } finally {
      els.sheet.classList.remove('exporting', 'show-export-zoom');
    }
  }

  function downloadDataUrl(dataUrl, name) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  els.exportPngBtn.addEventListener('click', async () => {
    const original = els.exportPngBtn.textContent;
    els.exportPngBtn.disabled = true;
    els.exportPngBtn.textContent = 'Đang xuất…';
    try {
      const canvas = await renderSheet();
      downloadDataUrl(canvas.toDataURL('image/png'), `${filename()}.png`);
      toast('Đã tạo PNG layout độ phân giải cao.');
    } catch (error) {
      console.error(error);
      toast('PNG bị chặn bởi CORS của ảnh nền. Dùng In / Save PDF hoặc nền trắng.', 4400);
    } finally {
      els.exportPngBtn.disabled = false;
      els.exportPngBtn.textContent = original;
    }
  });

  els.exportPdfBtn.addEventListener('click', async () => {
    const original = els.exportPdfBtn.textContent;
    els.exportPdfBtn.disabled = true;
    els.exportPdfBtn.textContent = 'Đang xuất…';
    try {
      const canvas = await renderSheet();
      const { jsPDF } = window.jspdf;
      const size = els.pageSize.value.toLowerCase();
      const orientation = els.orientation.value === 'landscape' ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit: 'mm', format: size, compress: true });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      pdf.addImage(canvas.toDataURL('image/jpeg', .95), 'JPEG', 0, 0, pw, ph, undefined, 'FAST');
      pdf.save(`${filename()}.pdf`);
      toast('Đã tạo PDF theo đúng khổ giấy.');
    } catch (error) {
      console.error(error);
      toast('Không xuất được PDF ảnh. Hãy dùng In / Save PDF của trình duyệt.', 4400);
    } finally {
      els.exportPdfBtn.disabled = false;
      els.exportPdfBtn.textContent = original;
    }
  });

  els.printBtn.addEventListener('click', () => {
    map.invalidateSize();
    insetMap.invalidateSize();
    updateDecorations();
    setTimeout(() => window.print(), 120);
  });

  bases.vnsdi.on?.('requesterror', () => {
    els.serviceStatus.textContent = 'Nền VN-SDI trả lỗi. Có thể chuyển sang OSM/vệ tinh; lớp GeoJSON vẫn hoạt động.';
    els.serviceStatus.className = 'status warn';
  });

  window.addEventListener('resize', () => {
    map.invalidateSize();
    insetMap.invalidateSize();
    updateDecorations();
  });
})();
