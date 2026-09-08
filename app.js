(() => {
  'use strict';

  const VN_SDI_URL = 'https://vnsdi.mae.gov.vn/server/rest/services/BDHCVN/BanDoHanhChinhVietNam/MapServer';
  const VIETNAM_BOUNDS = L.latLngBounds([8.0, 102.0], [23.8, 110.8]);
  const $ = (id) => document.getElementById(id);
  const els = {
    sheet: $('mapSheet'), pageSize: $('pageSize'), orientation: $('orientation'), paperBadge: $('paperBadge'),
    titleInput: $('titleInput'), subtitleInput: $('subtitleInput'), provinceInput: $('provinceInput'), communeInput: $('communeInput'),
    agencyInput: $('agencyInput'), sourceInput: $('sourceInput'), noteInput: $('noteInput'), mapTitle: $('mapTitle'), mapSubtitle: $('mapSubtitle'),
    mapPlace: $('mapPlace'), agencyText: $('agencyText'), provincePrint: $('provincePrint'), communePrint: $('communePrint'),
    sourcePrint: $('sourcePrint'), notePrint: $('notePrint'), basemapPrint: $('basemapPrint'), mapDate: $('mapDate'),
    basemapSelect: $('basemapSelect'), adminToggle: $('adminToggle'), gridToggle: $('gridToggle'), featureLabelToggle: $('featureLabelToggle'),
    insetToggle: $('insetToggle'), baseOpacity: $('baseOpacity'), boundaryOpacity: $('boundaryOpacity'), geojsonInput: $('geojsonInput'),
    fitDataBtn: $('fitDataBtn'), clearDataBtn: $('clearDataBtn'), serviceStatus: $('serviceStatus'), addAnnotationBtn: $('addAnnotationBtn'),
    clearAnnotationsBtn: $('clearAnnotationsBtn'), exportPngBtn: $('exportPngBtn'), exportPdfBtn: $('exportPdfBtn'), printBtn: $('printBtn'),
    resetBtn: $('resetBtn'), coordinateGrid: $('coordinateGrid'), scaleBar: $('scaleBar'), scaleLabel: $('scaleLabel'), scaleRatio: $('scaleRatio'),
    scaleRatioPrint: $('scaleRatioPrint'), cursorCoords: $('cursorCoords'), insetCard: $('insetCard'), insetCaption: $('insetCaption'), toast: $('toast')
  };

  const map = L.map('map', {
    zoomControl: true,
    attributionControl: true,
    preferCanvas: true,
    minZoom: 4,
    maxZoom: 20
  });
  map.createPane('basePane');
  map.createPane('adminPane');
  map.createPane('boundaryPane');
  map.createPane('labelPane');
  map.getPane('basePane').style.zIndex = 200;
  map.getPane('adminPane').style.zIndex = 390;
  map.getPane('boundaryPane').style.zIndex = 410;
  map.getPane('labelPane').style.zIndex = 460;
  map.fitBounds(VIETNAM_BOUNDS, { padding: [12, 12] });

  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    pane: 'basePane', maxZoom: 19, crossOrigin: true,
    attribution: '&copy; OpenStreetMap contributors'
  });
  const vnsdiBase = L.esri.dynamicMapLayer({ url: VN_SDI_URL, pane: 'basePane', opacity: Number(els.baseOpacity.value), f: 'image' });
  let activeBase = osm.addTo(map);
  let adminLayer = null;
  let geoLayer = null;
  let loadedGeoJSON = null;
  let selectedFeatureLayer = null;
  let annotationMode = false;

  const featureLabels = L.layerGroup([], { pane: 'labelPane' }).addTo(map);
  const annotations = L.layerGroup([], { pane: 'labelPane' }).addTo(map);

  const insetMap = L.map('insetMap', {
    attributionControl: false, zoomControl: false, dragging: false, scrollWheelZoom: false,
    doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false, preferCanvas: true
  }).setView([15.8, 107.5], 4.4);
  const insetContext = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 13, opacity: .28, crossOrigin: true });
  insetContext.addTo(insetMap);
  const insetBoundaries = L.layerGroup().addTo(insetMap);

  function toast(message, duration = 2400) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove('show'), duration);
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
    return propertyValue(p, ['TEN_XA', 'TENXA', 'TENPHUONG', 'XA_PHUONG', 'COMMUNE', 'WARD', 'NAME_3', 'NAME_2', 'NAME', 'TEN', 'TENDVHC']) || 'Đối tượng hành chính';
  }

  function featureProvince(feature) {
    const p = feature?.properties || {};
    return propertyValue(p, ['TEN_TINH', 'TENTINH', 'TINH_THANH', 'PROVINCE', 'NAME_1', 'TINH', 'TP']);
  }

  function updateText() {
    const title = els.titleInput.value.trim() || 'BẢN ĐỒ HÀNH CHÍNH XÃ';
    const subtitle = els.subtitleInput.value.trim();
    const province = els.provinceInput.value.trim();
    const commune = els.communeInput.value.trim();
    els.mapTitle.textContent = title;
    els.mapSubtitle.textContent = subtitle;
    els.agencyText.textContent = els.agencyInput.value.trim() || 'VIETFLEXMAP';
    els.mapPlace.textContent = [province, commune].filter(Boolean).join(' · ').toUpperCase() || 'TỈNH / THÀNH PHỐ · XÃ / PHƯỜNG';
    els.provincePrint.textContent = province || '—';
    els.communePrint.textContent = commune || '—';
    els.sourcePrint.textContent = els.sourceInput.value.trim() || '—';
    els.notePrint.textContent = els.noteInput.value.trim() || '—';
    els.insetCaption.textContent = commune ? `Vị trí ${commune}${province ? ` trong ${province}` : ''}` : 'Vị trí xã trong tỉnh';
  }

  ['titleInput','subtitleInput','provinceInput','communeInput','agencyInput','sourceInput','noteInput'].forEach(id => {
    $(id).addEventListener('input', updateText);
  });
  els.mapDate.textContent = new Date().getFullYear();
  updateText();

  function applyPage() {
    const size = els.pageSize.value;
    const orientation = els.orientation.value;
    els.sheet.dataset.size = size;
    els.sheet.dataset.orientation = orientation;
    els.sheet.classList.toggle('compact', size === 'A4');
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
    }, 80);
  }
  els.pageSize.addEventListener('change', applyPage);
  els.orientation.addEventListener('change', applyPage);
  applyPage();

  function switchBasemap() {
    if (activeBase && map.hasLayer(activeBase)) map.removeLayer(activeBase);
    const value = els.basemapSelect.value;
    if (value === 'osm') {
      activeBase = osm;
      osm.setOpacity(Number(els.baseOpacity.value));
      osm.addTo(map);
      els.basemapPrint.textContent = 'OpenStreetMap';
    } else if (value === 'vnsdi') {
      activeBase = vnsdiBase;
      vnsdiBase.setOpacity(Number(els.baseOpacity.value));
      vnsdiBase.addTo(map);
      els.basemapPrint.textContent = 'VN-SDI · Bản đồ hành chính';
      if (els.serviceStatus.classList.contains('warn')) toast('VN-SDI có thể đang hạn chế truy cập. Có thể chuyển về OSM nếu nền không hiện.');
    } else {
      activeBase = null;
      els.basemapPrint.textContent = 'Không nền';
    }
    if (adminLayer && els.adminToggle.checked) adminLayer.bringToFront?.();
  }
  els.basemapSelect.addEventListener('change', switchBasemap);
  els.baseOpacity.addEventListener('input', () => {
    const opacity = Number(els.baseOpacity.value);
    osm.setOpacity(opacity);
    vnsdiBase.setOpacity(opacity);
  });

  async function discoverAdministrativeLayers() {
    let candidateIds = [761];
    try {
      const response = await fetch(`${VN_SDI_URL}?f=pjson`, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const service = await response.json();
      const layers = Array.isArray(service.layers) ? service.layers : [];
      const words = ['dia gioi', 'ranh gioi', 'bien gioi', 'bo bien gioi', 'hanh chinh'];
      const found = layers
        .filter(layer => words.some(word => stripAccents(layer.name || '').includes(word)))
        .map(layer => layer.id)
        .filter(Number.isInteger);
      candidateIds = [...new Set([...found, 761])].slice(0, 50);
      els.serviceStatus.textContent = `VN-SDI sẵn sàng · tự dò ${candidateIds.length} lớp ranh giới/liên quan.`;
      els.serviceStatus.className = 'status ok';
    } catch (error) {
      els.serviceStatus.textContent = 'VN-SDI hiện không cho trình duyệt đọc danh mục layer; dùng lớp biên giới dự phòng + GeoJSON địa phương.';
      els.serviceStatus.className = 'status warn';
    }

    adminLayer = L.esri.dynamicMapLayer({
      url: VN_SDI_URL,
      layers: candidateIds,
      pane: 'adminPane',
      opacity: Number(els.boundaryOpacity.value),
      f: 'image'
    });
    if (els.adminToggle.checked) adminLayer.addTo(map);
  }
  discoverAdministrativeLayers();

  els.adminToggle.addEventListener('change', () => {
    if (!adminLayer) return;
    if (els.adminToggle.checked) adminLayer.addTo(map); else map.removeLayer(adminLayer);
  });
  els.boundaryOpacity.addEventListener('input', () => {
    if (adminLayer) adminLayer.setOpacity(Number(els.boundaryOpacity.value));
    if (geoLayer) geoLayer.setStyle(layerStyle);
  });

  function layerStyle(feature) {
    const selected = selectedFeatureLayer && selectedFeatureLayer.feature === feature;
    const opacity = Number(els.boundaryOpacity.value);
    return selected
      ? { pane: 'boundaryPane', color: '#8f2323', weight: 3.2, opacity, fillColor: '#d7655d', fillOpacity: .18 }
      : { pane: 'boundaryPane', color: '#284f69', weight: 1.35, opacity, fillColor: '#ffffff', fillOpacity: .025, dashArray: '5 3' };
  }

  function clearFeatureLabels() {
    featureLabels.clearLayers();
  }

  function rebuildFeatureLabels() {
    clearFeatureLabels();
    if (!geoLayer || !els.featureLabelToggle.checked) return;
    geoLayer.eachLayer(layer => {
      const name = featureName(layer.feature);
      let center = null;
      if (layer.getBounds && layer.getBounds().isValid()) center = layer.getBounds().getCenter();
      else if (layer.getLatLng) center = layer.getLatLng();
      if (!center) return;
      L.marker(center, {
        pane: 'labelPane', interactive: false,
        icon: L.divIcon({ className: 'feature-label', html: `<span>${escapeHtml(name)}</span>`, iconSize: [0,0], iconAnchor: [0,0] })
      }).addTo(featureLabels);
    });
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function selectFeature(layer, zoom = false) {
    if (selectedFeatureLayer && selectedFeatureLayer.setStyle) selectedFeatureLayer.setStyle(layerStyle(selectedFeatureLayer.feature));
    selectedFeatureLayer = layer;
    if (layer.setStyle) layer.setStyle(layerStyle(layer.feature));
    layer.bringToFront?.();
    const name = featureName(layer.feature);
    const province = featureProvince(layer.feature);
    els.communeInput.value = name;
    if (province) els.provinceInput.value = province;
    updateText();
    refreshInset();
    if (zoom && layer.getBounds && layer.getBounds().isValid()) map.fitBounds(layer.getBounds(), { padding: [35,35], maxZoom: 16 });
    toast(`Đã chọn: ${name}`);
  }

  function loadGeoJSON(data) {
    if (geoLayer) map.removeLayer(geoLayer);
    loadedGeoJSON = data;
    selectedFeatureLayer = null;
    geoLayer = L.geoJSON(data, {
      pane: 'boundaryPane',
      style: layerStyle,
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, { pane:'boundaryPane', radius:5, color:'#284f69', weight:1.5, fillOpacity:.15 }),
      onEachFeature: (feature, layer) => {
        const name = featureName(feature);
        layer.bindTooltip(name, { sticky: true, direction: 'top' });
        layer.on('click', (event) => {
          if (annotationMode) return;
          L.DomEvent.stopPropagation(event);
          selectFeature(layer, false);
        });
      }
    }).addTo(map);
    rebuildFeatureLabels();
    refreshInset();
    const bounds = geoLayer.getBounds?.();
    if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding:[25,25] });
    let first = null;
    geoLayer.eachLayer(layer => { if (!first) first = layer; });
    if (first) selectFeature(first, false);
  }

  els.geojsonInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!json || !['FeatureCollection','Feature','Polygon','MultiPolygon','Point','MultiPoint','LineString','MultiLineString','GeometryCollection'].includes(json.type)) {
        throw new Error('Không phải GeoJSON hợp lệ');
      }
      loadGeoJSON(json);
      toast(`Đã nạp ${file.name}`);
    } catch (error) {
      console.error(error);
      toast('Không đọc được GeoJSON/JSON. Kiểm tra lại cấu trúc file.', 3600);
    }
  });

  els.fitDataBtn.addEventListener('click', () => {
    const bounds = geoLayer?.getBounds?.();
    if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding:[30,30] }); else toast('Chưa có GeoJSON để zoom.');
  });
  els.clearDataBtn.addEventListener('click', () => {
    if (geoLayer) map.removeLayer(geoLayer);
    geoLayer = null; loadedGeoJSON = null; selectedFeatureLayer = null;
    clearFeatureLabels(); refreshInset();
    els.geojsonInput.value = '';
    toast('Đã xóa lớp GeoJSON.');
  });
  els.featureLabelToggle.addEventListener('change', rebuildFeatureLabels);

  function refreshInset() {
    insetBoundaries.clearLayers();
    if (!loadedGeoJSON) {
      insetMap.setView([15.8,107.5], 4.4);
      els.insetCaption.textContent = 'Nạp ranh giới tỉnh/xã để tạo sơ đồ vị trí';
      return;
    }
    const context = L.geoJSON(loadedGeoJSON, {
      interactive: false,
      style: feature => selectedFeatureLayer?.feature === feature
        ? { color:'#8f2323', weight:2.2, fillColor:'#d7655d', fillOpacity:.42 }
        : { color:'#586c79', weight:.7, fillColor:'#f7f5ee', fillOpacity:.28 },
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius:3, color:'#586c79', weight:1, fillOpacity:.25 })
    }).addTo(insetBoundaries);
    const bounds = context.getBounds?.();
    if (bounds && bounds.isValid()) insetMap.fitBounds(bounds, { padding:[8,8] });
    if (selectedFeatureLayer) {
      let center = selectedFeatureLayer.getBounds?.().getCenter?.();
      if (!center && selectedFeatureLayer.getLatLng) center = selectedFeatureLayer.getLatLng();
      if (center) L.circleMarker(center, { radius:4, color:'#8f2323', fillColor:'#8f2323', fillOpacity:1, weight:1 }).addTo(insetBoundaries);
    }
    updateText();
  }
  els.insetToggle.addEventListener('change', () => {
    els.insetCard.style.display = els.insetToggle.checked ? '' : 'none';
  });

  function addSvgElement(name, attrs, text) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attrs).forEach(([key,value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    els.coordinateGrid.appendChild(node);
    return node;
  }

  function formatLon(lon) {
    const abs = Math.abs(lon).toFixed(2);
    return `${abs}°${lon >= 0 ? 'E' : 'W'}`;
  }
  function formatLat(lat) {
    const abs = Math.abs(lat).toFixed(2);
    return `${abs}°${lat >= 0 ? 'N' : 'S'}`;
  }

  function updateGrid() {
    const svg = els.coordinateGrid;
    if (!els.gridToggle.checked) { svg.innerHTML = ''; svg.style.display = 'none'; return; }
    svg.style.display = '';
    const container = map.getContainer();
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML = '';
    const countX = w < 850 ? 4 : 6;
    const countY = h < 650 ? 4 : 6;
    for (let i=1;i<countX;i++) {
      const x = Math.round(w * i / countX);
      const lng = map.containerPointToLatLng([x, h/2]).lng;
      addSvgElement('line', { x1:x, y1:0, x2:x, y2:h, class:'grid-line' });
      addSvgElement('line', { x1:x, y1:0, x2:x, y2:9, class:'grid-tick' });
      addSvgElement('line', { x1:x, y1:h-9, x2:x, y2:h, class:'grid-tick' });
      addSvgElement('text', { x:x+4, y:14, class:'grid-label' }, formatLon(lng));
    }
    for (let i=1;i<countY;i++) {
      const y = Math.round(h * i / countY);
      const lat = map.containerPointToLatLng([w/2, y]).lat;
      addSvgElement('line', { x1:0, y1:y, x2:w, y2:y, class:'grid-line' });
      addSvgElement('line', { x1:0, y1:y, x2:9, y2:y, class:'grid-tick' });
      addSvgElement('line', { x1:w-9, y1:y, x2:w, y2:y, class:'grid-tick' });
      addSvgElement('text', { x:6, y:y-5, class:'grid-label' }, formatLat(lat));
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

  function updateScale() {
    const container = map.getContainer();
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    const span = Math.min(150, Math.max(80, w * .12));
    const left = map.containerPointToLatLng([w/2 - span/2, h/2]);
    const right = map.containerPointToLatLng([w/2 + span/2, h/2]);
    const measured = map.distance(left, right);
    const target = niceDistance(measured);
    const px = Math.max(45, Math.min(170, span * target / measured));
    els.scaleBar.style.width = `${px}px`;
    els.scaleLabel.textContent = target >= 1000 ? `${trimZero(target/1000)} km` : `${Math.round(target)} m`;
    const metersPerPixel = measured / span;
    const denominator = niceRatio(metersPerPixel / (0.0254 / 96));
    const formatted = denominator ? denominator.toLocaleString('vi-VN') : '—';
    els.scaleRatio.textContent = `Tỷ lệ ~ 1:${formatted}`;
    els.scaleRatioPrint.textContent = `TỶ LỆ XẤP XỈ 1:${formatted}`;
  }

  function trimZero(number) {
    return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/,'');
  }

  let decoFrame = 0;
  function updateDecorations() {
    cancelAnimationFrame(decoFrame);
    decoFrame = requestAnimationFrame(() => { updateGrid(); updateScale(); });
  }
  map.on('move zoom resize', updateDecorations);
  els.gridToggle.addEventListener('change', updateGrid);
  setTimeout(updateDecorations, 150);

  map.on('mousemove', event => {
    els.cursorCoords.textContent = `Kinh độ ${event.latlng.lng.toFixed(6)} · Vĩ độ ${event.latlng.lat.toFixed(6)}`;
  });

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
    if (!text || !text.trim()) return;
    L.marker(event.latlng, {
      pane: 'labelPane', draggable: true,
      icon: L.divIcon({ className:'annotation-label', html:`<span>${escapeHtml(text.trim())}</span>`, iconSize:[0,0], iconAnchor:[0,0] })
    }).addTo(annotations);
  });
  els.clearAnnotationsBtn.addEventListener('click', () => { annotations.clearLayers(); toast('Đã xóa ghi chú trên bản đồ.'); });

  els.resetBtn.addEventListener('click', () => map.fitBounds(VIETNAM_BOUNDS, { padding:[12,12] }));

  function filename() {
    return (els.titleInput.value || 'ban-do-cap-xa')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D')
      .replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase() || 'ban-do-cap-xa';
  }

  async function renderSheet() {
    map.closePopup();
    map.invalidateSize(); insetMap.invalidateSize(); updateDecorations();
    await new Promise(resolve => setTimeout(resolve, 180));
    return html2canvas(els.sheet, {
      backgroundColor:'#ffffff', useCORS:true, allowTaint:false, logging:false, scale:2,
      imageTimeout:12000, scrollX:0, scrollY:-window.scrollY
    });
  }

  function downloadDataUrl(dataUrl, name) {
    const a = document.createElement('a');
    a.href = dataUrl; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }

  els.exportPngBtn.addEventListener('click', async () => {
    const original = els.exportPngBtn.textContent;
    els.exportPngBtn.disabled = true; els.exportPngBtn.textContent = 'Đang xuất…';
    try {
      const canvas = await renderSheet();
      downloadDataUrl(canvas.toDataURL('image/png'), `${filename()}.png`);
      toast('Đã tạo PNG độ phân giải cao.');
    } catch (error) {
      console.error(error);
      toast('Không xuất được PNG do giới hạn ảnh nền/CORS. Hãy dùng In / Save PDF.', 4200);
    } finally {
      els.exportPngBtn.disabled = false; els.exportPngBtn.textContent = original;
    }
  });

  els.exportPdfBtn.addEventListener('click', async () => {
    const original = els.exportPdfBtn.textContent;
    els.exportPdfBtn.disabled = true; els.exportPdfBtn.textContent = 'Đang xuất…';
    try {
      const canvas = await renderSheet();
      const { jsPDF } = window.jspdf;
      const size = els.pageSize.value.toLowerCase();
      const orientation = els.orientation.value === 'landscape' ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit:'mm', format:size, compress:true });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      pdf.addImage(canvas.toDataURL('image/jpeg', .94), 'JPEG', 0, 0, pw, ph, undefined, 'FAST');
      pdf.save(`${filename()}.pdf`);
      toast('Đã tạo PDF theo đúng khổ giấy.');
    } catch (error) {
      console.error(error);
      toast('Không xuất được PDF ảnh. Hãy dùng In / Save PDF của trình duyệt.', 4200);
    } finally {
      els.exportPdfBtn.disabled = false; els.exportPdfBtn.textContent = original;
    }
  });

  els.printBtn.addEventListener('click', () => {
    map.invalidateSize(); insetMap.invalidateSize(); updateDecorations();
    setTimeout(() => window.print(), 100);
  });

  vnsdiBase.on?.('requesterror', () => {
    els.serviceStatus.textContent = 'VN-SDI trả lỗi tải bản đồ. Chuyển nền OSM hoặc nạp GeoJSON để tiếp tục.';
    els.serviceStatus.className = 'status warn';
  });

  window.addEventListener('resize', () => { map.invalidateSize(); insetMap.invalidateSize(); updateDecorations(); });
})();
