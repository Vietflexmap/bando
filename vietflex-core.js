(() => {
  'use strict';

  const V = window.Vietflex;
  if (!V) {
    console.error('[Vietflexmap] Không tải được Vietflex Core.');
    return;
  }

  window.L = V;
  window.__VIETFLEX_NO_OSM__ = true;

  const ADMIN_INDEX = 'https://raw.githubusercontent.com/thanglequoc/vietnamese-provinces-database/master/json/vn_only_simplified_json_generated_data_vn_units_minified.json';
  const ADMIN_CACHE = 'vf-admin-index-2026-07-25-v1';

  const nfc = value => {
    try { return String(value ?? '').normalize('NFC'); }
    catch (_) { return String(value ?? ''); }
  };

  const norm = value => nfc(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const stripUnit = value => nfc(value).trim()
    .replace(/^(tỉnh|thành phố|tp\.?|xã|phường|đặc khu|thị trấn)\s+/i, '').trim();

  /* ------------------------------------------------------------------
     1) Leaflet-style compatibility factories for Vietflex 1.0.0
     Vietflex exports classes (Map, TileLayer, GeoJSON...) but the legacy
     composer still calls Leaflet factories (L.map(), L.geoJSON()...).
     Define them explicitly before app.js starts.
  ------------------------------------------------------------------ */
  V.map = (target, options) => new V.Map(target, options);
  V.layerGroup = (layers = [], options) => new V.LayerGroup(layers, options);
  V.featureGroup = (layers = [], options) => new V.FeatureGroup(layers, options);
  V.geoJSON = (data, options) => new V.GeoJSON(data, options);
  V.marker = (latlng, options) => new V.Marker(latlng, options);
  V.circleMarker = (latlng, options) => new V.CircleMarker(latlng, options);
  V.divIcon = options => new V.DivIcon(options);
  V.icon = options => new V.Icon(options);
  V.latLng = (...args) => new V.LatLng(...args);
  V.latLngBounds = (...args) => new V.LatLngBounds(...args);

  function createRoadmap(options = {}) {
    const safe = { ...options };
    delete safe.attribution;
    safe.crossOrigin = false;
    safe.referrerPolicy = 'strict-origin-when-cross-origin';
    safe.mapType = 'roadmap';
    const layer = V.legacyGoogleTiles(safe);
    layer.__vfGoogleRoadmap = true;
    return layer;
  }

  V.tileLayer = (url, options = {}) => {
    const text = String(url || '');
    if (/openstreetmap\.org/i.test(text)) {
      // Internal key/URL kept only for old project compatibility.
      // No OSM request is ever sent: it becomes Vietflex Google Roadmap.
      return createRoadmap(options);
    }
    return new V.TileLayer(url, options);
  };

  /* ------------------------------------------------------------------
     2) Small ArcGIS REST adapter. app.js must never abort just because an
     optional Esri Leaflet plugin is unavailable/incompatible with Vietflex.
  ------------------------------------------------------------------ */
  function arcGisRestLayer(options = {}) {
    const base = String(options.url || '').replace(/\/$/, '');
    const layer = new V.TileLayer(`${base}/tile/{z}/{y}/{x}`, {
      pane: options.pane,
      opacity: Number.isFinite(Number(options.opacity)) ? Number(options.opacity) : 1,
      minZoom: options.minZoom ?? 0,
      maxZoom: options.maxZoom ?? 20,
      crossOrigin: false,
      attribution: options.attribution || 'VN-SDI'
    });
    layer.on?.('tileerror', event => layer.fire?.('requesterror', event));
    return layer;
  }

  V.esri = {
    ...(V.esri || {}),
    dynamicMapLayer: arcGisRestLayer,
    tiledMapLayer: arcGisRestLayer
  };

  window.__VF_BOOT_OK__ = Boolean(
    V.map && V.tileLayer && V.geoJSON && V.layerGroup && V.marker && V.divIcon
  );

  /* Block network fallbacks to OSM/Nominatim. */
  const nativeFetch = window.fetch?.bind(window);
  if (nativeFetch) {
    window.fetch = (input, init) => {
      const raw = typeof input === 'string' ? input : (input?.url || '');
      let host = '';
      try { host = new URL(raw, location.href).hostname; } catch (_) {}
      if (/(^|\.)openstreetmap\.org$/i.test(host)) {
        return Promise.reject(new TypeError('OSM/Nominatim disabled by Vietflexmap'));
      }
      return nativeFetch(input, init);
    };
  }

  /* ------------------------------------------------------------------
     3) UI/typography polish and visible basemap health state.
  ------------------------------------------------------------------ */
  function installCss() {
    if (document.getElementById('vfBootstrapCss')) return;
    const style = document.createElement('style');
    style.id = 'vfBootstrapCss';
    style.textContent = `
      html,body,button,input,select,textarea,.leaflet-container{
        font-family:"Segoe UI",Tahoma,Arial,sans-serif!important;
        font-kerning:normal!important;font-variant-ligatures:common-ligatures!important;
      }
      .map-sheet,.map-sheet *{font-kerning:normal}
      .map-sheet .agency,.map-sheet .title-block h1,.map-sheet .map-place,
      .map-sheet .legend-card h3,.map-sheet .info-card h3,.map-sheet .note-card h3,
      .map-sheet .inset-title,.map-sheet .north-letter,.map-sheet .map-code{
        font-family:"Segoe UI",Tahoma,Arial,sans-serif!important;
        letter-spacing:0!important;word-spacing:0!important;
      }
      .map-sheet .title-block h1{font-weight:800!important;line-height:1.12!important}
      .map-sheet .map-place{font-weight:700!important;line-height:1.2!important}
      .vf-basemap-status{position:absolute;left:50%;top:9px;z-index:1400;max-width:82%;
        transform:translate(-50%,-7px);opacity:0;pointer-events:none;padding:7px 12px;
        border-radius:999px;background:rgba(17,48,70,.94);color:#fff;
        font:700 11px/1.25 "Segoe UI",Arial,sans-serif;box-shadow:0 5px 18px rgba(0,0,0,.2);transition:.18s}
      .vf-basemap-status.show{opacity:1;transform:translate(-50%,0)}
      .vf-basemap-status.ok{background:rgba(27,111,72,.95)}
      .vf-basemap-status.warn{background:rgba(151,94,19,.96)}
      .vf-source-input{display:none!important}
      .vf-admin-picker{width:100%;margin-top:5px;border:1px solid #36546a;border-radius:8px;
        background:#132f44;color:#fff;padding:8px 30px 8px 9px;min-height:39px;font-size:12px;outline:none}
      .vf-admin-picker:focus{border-color:#83bfe6;box-shadow:0 0 0 2px rgba(119,185,229,.14)}
      .vf-admin-picker:disabled{opacity:.58;cursor:not-allowed}
      .vf-admin-actions{grid-column:1/-1;display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:2px}
      .vf-admin-hint{font-size:9px;color:#8faabd;line-height:1.35;align-self:center}
      .vf-admin-build{min-height:34px;padding:7px 10px;border:1px solid #55758b;border-radius:7px;
        background:#eef7fb;color:#15364e;font-size:10px;font-weight:800}
      @media(max-width:900px){.vf-basemap-status{font-size:10px;max-width:90%;white-space:normal;text-align:center}.vf-admin-actions{grid-template-columns:1fr}}
      @media print{.vf-basemap-status{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function statusChip() {
    let chip = document.getElementById('vfBasemapStatus');
    if (chip) return chip;
    const frame = document.getElementById('mapFrame');
    if (!frame) return null;
    chip = document.createElement('div');
    chip.id = 'vfBasemapStatus';
    chip.className = 'vf-basemap-status';
    chip.setAttribute('role', 'status');
    chip.setAttribute('aria-live', 'polite');
    frame.appendChild(chip);
    return chip;
  }

  function showStatus(message, state = 'busy', hide = 0) {
    const chip = statusChip();
    if (!chip) return;
    chip.textContent = nfc(message);
    chip.className = `vf-basemap-status show ${state}`;
    clearTimeout(showStatus.timer);
    if (hide) showStatus.timer = setTimeout(() => chip.classList.remove('show'), hide);
  }

  function normalizeVisibleText() {
    ['titleInput','subtitleInput','provinceInput','communeInput','agencyInput','sourceInput','noteInput',
      'mapTitle','mapSubtitle','mapPlace','agencyText','provincePrint','communePrint','sourcePrint','notePrint','insetCaption']
      .forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if ('value' in el && typeof el.value === 'string') el.value = nfc(el.value);
        else if (el.textContent) el.textContent = nfc(el.textContent);
      });
  }

  function cleanPublicLabels() {
    const select = document.getElementById('basemapSelect');
    const old = select?.querySelector('option[value="osm"]');
    if (old) old.textContent = 'Vietflex · Google Roadmap';
    const print = document.getElementById('basemapPrint');
    if (print && (!select || select.value === 'osm')) print.textContent = 'Vietflex · Google Roadmap';
  }

  function bindRoadmapHealth() {
    const maps = window.__vfMaps || [];
    const main = maps[0];
    if (!main) return;
    let road = null;
    main.eachLayer?.(layer => {
      if (!road && (layer?.__vfGoogleRoadmap || /google\.com\/vt/i.test(String(layer?._url || '')))) road = layer;
    });
    if (!road || road.__vfHealthBound) return;
    road.__vfHealthBound = true;
    let loaded = false;
    let errors = 0;
    road.on?.('loading', () => showStatus('Đang tải nền Vietflex · Google Roadmap…'));
    road.on?.('tileload', () => {
      if (!loaded) showStatus('Nền Vietflex · Google Roadmap đã sẵn sàng', 'ok', 1800);
      loaded = true; errors = 0;
    });
    road.on?.('tileerror', () => {
      errors += 1;
      if (errors === 3) showStatus('Google Roadmap đang phản hồi chậm…', 'warn');
      if (!loaded && errors >= 10) {
        const select = document.getElementById('basemapSelect');
        if (select?.querySelector('option[value="imagery"]')) {
          select.value = 'imagery';
          select.dispatchEvent(new Event('change', { bubbles: true }));
          showStatus('Google Roadmap bị chặn · đã chuyển nền vệ tinh Esri', 'warn', 6000);
        }
      }
    });
  }

  function rescueMaps() {
    const maps = window.__vfMaps || [];
    maps.forEach((map, index) => {
      [0, 120, 420, 1000].forEach(delay => setTimeout(() => map?.invalidateSize?.({ pan: false }), delay));
      if (index === 1) {
        let hasBase = false;
        map?.eachLayer?.(layer => {
          if (layer?.__vfGoogleRoadmap || /google\.com\/vt/i.test(String(layer?._url || ''))) hasBase = true;
        });
        if (!hasBase) {
          try { createRoadmap({ opacity: .18, maxZoom: 13 }).addTo(map); } catch (_) {}
        }
      }
    });
    bindRoadmapHealth();
    if (maps[0]) {
      const service = document.getElementById('serviceStatus');
      if (service && window.__VF_BOOT_OK__) {
        service.textContent = 'Vietflex Core: bản đồ đã khởi tạo · đang kiểm tra lớp nền/địa giới.';
        service.className = 'status ok';
      }
    }
  }

  /* ------------------------------------------------------------------
     4) Official dependent province/commune selectors. Keep original text
     inputs hidden so all existing app.js listeners/project logic remain intact.
  ------------------------------------------------------------------ */
  async function getCatalog() {
    try {
      const cached = sessionStorage.getItem(ADMIN_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (_) {}
    const response = await fetch(ADMIN_INDEX, { mode: 'cors', cache: 'force-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error('Danh mục hành chính rỗng');
    try { sessionStorage.setItem(ADMIN_CACHE, JSON.stringify(data)); } catch (_) {}
    return data;
  }

  function emitValue(input, value) {
    if (!input) return;
    input.value = nfc(value || '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function buildAdminSelectors(catalog) {
    const provinceSource = document.getElementById('provinceInput');
    const communeSource = document.getElementById('communeInput');
    if (!provinceSource || !communeSource || document.getElementById('vfProvincePicker')) return;

    const pPicker = document.createElement('select');
    pPicker.id = 'vfProvincePicker';
    pPicker.className = 'vf-admin-picker';
    pPicker.setAttribute('aria-label', 'Chọn tỉnh hoặc thành phố');

    const wPicker = document.createElement('select');
    wPicker.id = 'vfCommunePicker';
    wPicker.className = 'vf-admin-picker';
    wPicker.setAttribute('aria-label', 'Chọn xã, phường hoặc đặc khu');
    wPicker.disabled = true;

    provinceSource.classList.add('vf-source-input');
    communeSource.classList.add('vf-source-input');
    provinceSource.insertAdjacentElement('afterend', pPicker);
    communeSource.insertAdjacentElement('afterend', wPicker);

    const provinceByCode = new Map();
    const provinceByName = new Map();
    catalog.forEach(province => {
      provinceByCode.set(String(province.Code), province);
      provinceByName.set(norm(province.FullName), province);
      provinceByName.set(norm(stripUnit(province.FullName)), province);
    });

    function fillProvinces() {
      pPicker.innerHTML = '<option value="">— Chọn tỉnh / thành phố —</option>';
      catalog.forEach(province => {
        const option = document.createElement('option');
        option.value = String(province.Code);
        option.textContent = `${province.FullName} · ${province.Code}`;
        pPicker.appendChild(option);
      });
    }

    function fillWards(province, wanted = '') {
      wPicker.innerHTML = '<option value="">— Chọn xã / phường / đặc khu —</option>';
      if (!province) { wPicker.disabled = true; return; }
      const wards = Array.isArray(province.Wards) ? province.Wards : [];
      wards.forEach(ward => {
        const option = document.createElement('option');
        option.value = String(ward.Code);
        option.textContent = `${ward.FullName} · ${ward.Code}`;
        option.dataset.name = ward.FullName;
        wPicker.appendChild(option);
      });
      wPicker.disabled = false;
      if (wanted) {
        const target = wards.find(ward => norm(ward.FullName) === norm(wanted) || norm(stripUnit(ward.FullName)) === norm(stripUnit(wanted)));
        if (target) wPicker.value = String(target.Code);
      }
    }

    function syncAuto(province, ward) {
      const ap = document.getElementById('autoProvince');
      const ac = document.getElementById('autoCommune');
      if (ap && province) {
        ap.value = String(province.Code);
        ap.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (ac) {
        ac.value = ward ? stripUnit(ward.FullName) : '';
        ac.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    function selectedProvince() { return provinceByCode.get(pPicker.value) || null; }
    function selectedWard() {
      const province = selectedProvince();
      return province?.Wards?.find(ward => String(ward.Code) === String(wPicker.value)) || null;
    }

    let internal = false;
    pPicker.addEventListener('change', () => {
      if (internal) return;
      const province = selectedProvince();
      fillWards(province);
      emitValue(provinceSource, province?.FullName || '');
      emitValue(communeSource, '');
      syncAuto(province, null);
    });

    wPicker.addEventListener('change', () => {
      if (internal) return;
      const province = selectedProvince();
      const ward = selectedWard();
      emitValue(provinceSource, province?.FullName || '');
      emitValue(communeSource, ward?.FullName || '');
      syncAuto(province, ward);
    });

    function syncFromSources() {
      if (internal) return;
      internal = true;
      try {
        const province = provinceByName.get(norm(provinceSource.value)) || provinceByName.get(norm(stripUnit(provinceSource.value)));
        if (province) {
          pPicker.value = String(province.Code);
          fillWards(province, communeSource.value);
        } else {
          pPicker.value = '';
          fillWards(null);
        }
      } finally { internal = false; }
    }
    provinceSource.addEventListener('change', () => setTimeout(syncFromSources, 0));
    communeSource.addEventListener('change', () => setTimeout(syncFromSources, 0));
    document.getElementById('loadProjectInput')?.addEventListener('change', () => setTimeout(syncFromSources, 500));

    fillProvinces();
    syncFromSources();

    const row = provinceSource.closest('.row.two');
    if (row) {
      const actions = document.createElement('div');
      actions.className = 'vf-admin-actions';
      actions.innerHTML = '<span class="vf-admin-hint">Danh mục hiện hành: 34 tỉnh/thành · 3.321 đơn vị cấp xã · chọn theo tỉnh để tránh trùng tên.</span><button class="vf-admin-build" type="button">Dựng bản đồ xã đã chọn</button>';
      row.appendChild(actions);
      actions.querySelector('button')?.addEventListener('click', () => {
        const province = selectedProvince();
        const ward = selectedWard();
        if (!province || !ward) {
          showStatus('Hãy chọn đủ Tỉnh/Thành phố và Xã/Phường', 'warn', 3200);
          return;
        }
        syncAuto(province, ward);
        setTimeout(() => {
          const button = document.getElementById('autoGenerateBtn');
          if (button) button.click();
          else showStatus('Automatic Generator chưa sẵn sàng · hãy tải lại trang', 'warn', 4500);
        }, 80);
      });
    }

    window.VFAdmin = { catalog, provincePicker: pPicker, communePicker: wPicker, syncFromSources };
  }

  async function initAdminUi() {
    try {
      const catalog = await getCatalog();
      buildAdminSelectors(catalog);
    } catch (error) {
      console.error('[Vietflexmap] Không tải được danh mục hành chính.', error);
      showStatus('Không tải được danh mục Tỉnh/Xã · kiểm tra kết nối mạng', 'warn', 5000);
    }
  }

  function afterDomReady() {
    installCss();
    cleanPublicLabels();
    normalizeVisibleText();
    rescueMaps();
    initAdminUi();

    const select = document.getElementById('basemapSelect');
    select?.addEventListener('change', () => {
      setTimeout(() => {
        cleanPublicLabels();
        rescueMaps();
      }, 60);
    });
    window.addEventListener('resize', () => rescueMaps());
  }

  document.addEventListener('DOMContentLoaded', afterDomReady, { once: true });
  window.addEventListener('load', () => setTimeout(rescueMaps, 120), { once: true });

  console.info('[Vietflexmap] Compatibility factories installed:', window.__VF_BOOT_OK__);
})();
