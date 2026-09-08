(() => {
  'use strict';

  const V = window.Vietflex;
  if (!V) {
    console.error('[Vietflexmap] Vietflex Core không tải được.');
    return;
  }

  window.L = V;
  window.__VIETFLEX_NO_OSM__ = true;

  const originalTileLayer = V.tileLayer;
  const GOOGLE_URL = 'https://mt{s}.google.com/vt/lyrs=m&hl=vi&gl=VN&x={x}&y={y}&z={z}';
  const GOOGLE_SUBDOMAINS = ['0', '1', '2', '3'];

  function nfc(value = '') {
    try { return String(value).normalize('NFC'); } catch (_) { return String(value); }
  }

  function createGoogleRoadmap(options = {}) {
    let layer = null;

    if (typeof V.legacyGoogleTiles === 'function') {
      const patchedFactory = V.tileLayer;
      try {
        V.tileLayer = originalTileLayer;
        layer = V.legacyGoogleTiles({ mapType: 'roadmap' });
      } catch (error) {
        console.warn('[Vietflexmap] legacyGoogleTiles lỗi, dùng TileLayer Google tương thích.', error);
      } finally {
        V.tileLayer = patchedFactory;
      }
    }

    if (!layer && typeof originalTileLayer === 'function') {
      layer = originalTileLayer.call(V, GOOGLE_URL, {
        subdomains: GOOGLE_SUBDOMAINS,
        maxZoom: 20,
        attribution: 'Vietflex · Google Maps'
      });
    }

    if (!layer) throw new Error('Không tạo được lớp nền Vietflex Google Roadmap');

    layer.__vfGoogleRoadmap = true;
    layer.__vfRoadmapRole = options.role || 'main';

    if (layer.options) {
      if (options.pane) layer.options.pane = options.pane;
      if (Number.isFinite(Number(options.maxZoom))) layer.options.maxZoom = Number(options.maxZoom);
      delete layer.options.crossOrigin;
    }
    if (options.opacity !== undefined) layer.setOpacity?.(Number(options.opacity));

    return layer;
  }

  if (typeof originalTileLayer === 'function') {
    V.tileLayer = function vietflexNoOsmTileLayer(url, options = {}) {
      if (/tile\.openstreetmap\.org/i.test(String(url || ''))) {
        return createGoogleRoadmap({
          pane: options.pane,
          opacity: options.opacity,
          maxZoom: options.maxZoom,
          role: options.pane === 'basePane' ? 'main' : 'inset'
        });
      }
      return originalTileLayer.call(V, url, options);
    };
  }

  const nativeFetch = window.fetch?.bind(window);
  if (nativeFetch) {
    window.fetch = function noOsmFetch(input, init) {
      const raw = typeof input === 'string' ? input : (input?.url || '');
      let host = '';
      try { host = new URL(raw, location.href).hostname; } catch (_) {}
      if (/(^|\.)openstreetmap\.org$/i.test(host)) {
        return Promise.reject(new TypeError('OSM/Nominatim disabled by Vietflexmap'));
      }
      return nativeFetch(input, init);
    };
  }

  function injectPolishCss() {
    if (document.getElementById('vfOneShotPolish')) return;
    const style = document.createElement('style');
    style.id = 'vfOneShotPolish';
    style.textContent = `
      html,body,button,input,select,textarea,.leaflet-container{
        font-family:"Segoe UI",Tahoma,Arial,sans-serif!important;
        font-kerning:normal!important;
        font-variant-ligatures:common-ligatures!important;
        text-rendering:optimizeLegibility;
      }
      .map-sheet{
        font-family:"Segoe UI",Tahoma,Arial,sans-serif!important;
        -webkit-font-smoothing:antialiased;
        font-synthesis:none;
      }
      .map-sheet .agency,.map-sheet .title-block h1,.map-sheet .map-place,
      .map-sheet .legend-card h3,.map-sheet .info-card h3,.map-sheet .note-card h3,
      .map-sheet .inset-title,.map-sheet .north-letter,
      .map-sheet .map-code,.map-sheet .source-block,.map-sheet .credits-block{
        font-family:"Segoe UI",Tahoma,Arial,sans-serif!important;
        letter-spacing:0!important;
        word-spacing:0!important;
        font-kerning:normal!important;
        font-feature-settings:"kern" 1,"liga" 1!important;
      }
      .map-sheet .title-block h1{font-weight:800!important;line-height:1.12!important}
      .map-sheet .map-place{font-weight:700!important;line-height:1.2!important}
      .map-sheet .agency{font-weight:700!important;line-height:1.25!important}
      .panel-section h2,.brand-copy span,.brand-copy strong,.toolbar-button{letter-spacing:0!important}
      .sheet-viewport{contain:layout style;}
      .vf-basemap-status{
        position:absolute;left:50%;top:10px;z-index:1300;transform:translate(-50%,-8px);
        max-width:min(430px,84%);padding:7px 12px;border-radius:999px;
        background:rgba(19,51,73,.94);color:#fff;font:700 11px/1.25 "Segoe UI",Arial,sans-serif;
        box-shadow:0 6px 20px rgba(0,0,0,.2);opacity:0;pointer-events:none;transition:.2s;
      }
      .vf-basemap-status.show{opacity:1;transform:translate(-50%,0)}
      .vf-basemap-status.ok{background:rgba(31,112,73,.95)}
      .vf-basemap-status.warn{background:rgba(147,91,18,.96)}
      @media(max-width:900px){.vf-basemap-status{top:7px;max-width:90%;font-size:10px;text-align:center;white-space:normal}}
      @media print{.vf-basemap-status{display:none!important}.map-sheet{zoom:1!important;transform:none!important}}
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

  function showStatus(text, state = 'busy', hideAfter = 0) {
    const chip = statusChip();
    if (!chip) return;
    chip.textContent = nfc(text);
    chip.className = `vf-basemap-status show ${state}`;
    clearTimeout(showStatus.timer);
    if (hideAfter) showStatus.timer = setTimeout(() => chip.classList.remove('show'), hideAfter);
  }

  function normalizeText(root = document) {
    const ids = [
      'titleInput','subtitleInput','provinceInput','communeInput','mapCodeInput','authorInput','agencyInput','sourceInput','noteInput',
      'mapTitle','mapSubtitle','mapPlace','agencyText','mapCodePrint','provincePrint','communePrint','sourcePrint','notePrint','authorPrint','insetCaption'
    ];
    ids.forEach(id => {
      const el = root.getElementById ? root.getElementById(id) : document.getElementById(id);
      if (!el) return;
      if ('value' in el && typeof el.value === 'string') {
        const next = nfc(el.value);
        if (next !== el.value) el.value = next;
      }
      const text = el.textContent;
      if (text) {
        const next = nfc(text);
        if (next !== text) el.textContent = next;
      }
    });
  }

  function sanitizeLabels() {
    const select = document.getElementById('basemapSelect');
    const legacy = select?.querySelector('option[value="osm"]');
    if (legacy) legacy.textContent = 'Vietflex · Google Roadmap';

    const print = document.getElementById('basemapPrint');
    if (print && (!select || select.value === 'osm')) print.textContent = 'Vietflex · Google Roadmap';

    const sourceInput = document.getElementById('sourceInput');
    const sourcePrint = document.getElementById('sourcePrint');
    const cleanSource = text => nfc(text)
      .replace(/Vietflexmap\s*\/\s*OpenStreetMap\s*\/\s*VN-SDI/gi, 'Vietflex Map Core / Google Roadmap / VN-SDI')
      .replace(/OpenStreetMap/gi, 'Vietflex Map Core')
      .replace(/Nominatim/gi, 'GeoJSON thủ công')
      .replace(/\bOSM\b/gi, 'Vietflex');
    if (sourceInput) sourceInput.value = cleanSource(sourceInput.value);
    if (sourcePrint) sourcePrint.textContent = cleanSource(sourcePrint.textContent);
  }

  function removeAnyOsmLayer(map) {
    if (!map?.eachLayer) return;
    const remove = [];
    map.eachLayer(layer => {
      const url = String(layer?._url || '');
      if (/openstreetmap\.org/i.test(url)) remove.push(layer);
    });
    remove.forEach(layer => map.removeLayer(layer));
  }

  function findGoogleLayer(map) {
    let found = null;
    map?.eachLayer?.(layer => {
      if (!found && (layer?.__vfGoogleRoadmap || /google\.com\/vt/i.test(String(layer?._url || '')))) found = layer;
    });
    return found;
  }

  function bindGoogleHealth(layer, mainMap) {
    if (!layer || layer.__vfHealthBound) return;
    layer.__vfHealthBound = true;
    let errors = 0;
    let loaded = false;

    layer.on?.('loading', () => showStatus('Đang tải nền Vietflex · Google Roadmap…', 'busy'));
    layer.on?.('load', () => {
      loaded = true;
      errors = 0;
      showStatus('Vietflex · Google Roadmap sẵn sàng', 'ok', 1800);
    });
    layer.on?.('tileload', () => { loaded = true; errors = 0; });
    layer.on?.('tileerror', () => {
      errors += 1;
      if (errors === 3) showStatus('Google Roadmap đang phản hồi chậm…', 'warn');
      if (errors >= 12 && !loaded) fallbackToVnSdi(mainMap);
    });

    setTimeout(() => {
      if (!loaded && errors > 0) fallbackToVnSdi(mainMap);
    }, 4500);
  }

  function fallbackToVnSdi(mainMap) {
    if (fallbackToVnSdi.done) return;
    fallbackToVnSdi.done = true;
    const select = document.getElementById('basemapSelect');
    if (select?.querySelector('option[value="vnsdi"]')) {
      select.value = 'vnsdi';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      mainMap?.invalidateSize?.({ pan: false });
      showStatus('Google Roadmap không phản hồi · đã chuyển sang VN‑SDI', 'warn', 6000);
    } else {
      showStatus('Không tải được nền Google Roadmap', 'warn', 6000);
    }
  }

  function ensureGoogleOnMap(map, options = {}) {
    if (!map) return null;
    removeAnyOsmLayer(map);
    let layer = findGoogleLayer(map);
    if (!layer) {
      try {
        layer = createGoogleRoadmap(options);
        layer.addTo(map);
      } catch (error) {
        console.error('[Vietflexmap] Không thể tạo nền Google Roadmap.', error);
        return null;
      }
    }
    if (options.opacity !== undefined) layer.setOpacity?.(Number(options.opacity));
    return layer;
  }

  function updateScaleFallback(map) {
    if (!map?.getContainer || !map?.containerPointToLatLng) return;
    const c = map.getContainer();
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (!w || !h) return;
    try {
      const span = Math.min(170, Math.max(90, w * .13));
      const a = map.containerPointToLatLng([w / 2 - span / 2, h / 2]);
      const b = map.containerPointToLatLng([w / 2 + span / 2, h / 2]);
      const meters = map.distance(a, b);
      if (!Number.isFinite(meters) || meters <= 0) return;
      const mpp = meters / span;
      const denominator = Math.max(1, Math.round(mpp / (0.0254 / 96)));
      const nicePow = Math.pow(10, Math.floor(Math.log10(denominator)));
      const n = denominator / nicePow;
      const nice = n >= 7.5 ? 10 : n >= 3.75 ? 5 : n >= 1.75 ? 2.5 : 1;
      const ratio = Math.round(nice * nicePow);
      const formatted = ratio.toLocaleString('vi-VN');
      const top = document.getElementById('scaleRatio');
      const print = document.getElementById('scaleRatioPrint');
      if (top) top.textContent = `Tỷ lệ ~ 1:${formatted}`;
      if (print) print.textContent = `TỶ LỆ XẤP XỈ 1:${formatted}`;
    } catch (_) {}
  }

  function rescueRuntime() {
    injectPolishCss();
    sanitizeLabels();
    normalizeText();

    const maps = window.__vfMaps || [];
    const mainMap = maps[0];
    const insetMap = maps[1];

    if (!mainMap) {
      showStatus('Không khởi tạo được bản đồ chính · hãy tải lại trang', 'warn', 8000);
      return;
    }

    const invalidateAll = () => {
      maps.forEach(m => m?.invalidateSize?.({ pan: false }));
      updateScaleFallback(mainMap);
    };
    [80, 280, 800, 1800].forEach(ms => setTimeout(invalidateAll, ms));
    window.addEventListener('resize', () => setTimeout(invalidateAll, 100));

    const select = document.getElementById('basemapSelect');
    const mainOpacity = Number(document.getElementById('baseOpacity')?.value || .72);

    if (!select || select.value === 'osm') {
      const mainGoogle = ensureGoogleOnMap(mainMap, { pane: 'basePane', opacity: mainOpacity, maxZoom: 20, role: 'main' });
      bindGoogleHealth(mainGoogle, mainMap);
    }
    if (insetMap) ensureGoogleOnMap(insetMap, { opacity: .18, maxZoom: 13, role: 'inset' });

    select?.addEventListener('change', () => {
      sanitizeLabels();
      setTimeout(() => {
        if (select.value === 'osm') {
          fallbackToVnSdi.done = false;
          const layer = ensureGoogleOnMap(mainMap, { pane: 'basePane', opacity: Number(document.getElementById('baseOpacity')?.value || .72), maxZoom: 20, role: 'main' });
          bindGoogleHealth(layer, mainMap);
        }
        invalidateAll();
      }, 80);
    });

    document.getElementById('baseOpacity')?.addEventListener('input', event => {
      const layer = findGoogleLayer(mainMap);
      layer?.setOpacity?.(Number(event.target.value));
    });

    document.querySelectorAll('input,textarea').forEach(el => {
      if (el.dataset.vfNfcBound) return;
      el.dataset.vfNfcBound = '1';
      const clean = () => {
        if (typeof el.value !== 'string') return;
        const next = nfc(el.value);
        if (next !== el.value) el.value = next;
      };
      el.addEventListener('input', clean);
      el.addEventListener('change', clean);
      el.addEventListener('blur', clean);
    });

    const sheet = document.getElementById('mapSheet');
    if (sheet && !sheet.dataset.vfNfcObserver) {
      sheet.dataset.vfNfcObserver = '1';
      let busy = false;
      new MutationObserver(() => {
        if (busy) return;
        busy = true;
        normalizeText();
        busy = false;
      }).observe(sheet, { subtree: true, childList: true, characterData: true });
    }

    setTimeout(() => {
      const panel = document.getElementById('autoGeneratorPanel');
      const editor = document.querySelector('.editor-scroll');
      if (!panel && editor) {
        const warning = document.createElement('div');
        warning.className = 'status warn';
        warning.style.cssText = 'margin:8px 0 12px;padding:9px;border:1px solid rgba(255,210,140,.35);border-radius:8px';
        warning.textContent = 'Automatic Generator chưa khởi tạo. Hãy tải lại trang; phần biên tập thủ công vẫn hoạt động.';
        editor.prepend(warning);
      }
    }, 2500);

    mainMap.on?.('moveend zoomend resize', () => updateScaleFallback(mainMap));
    setTimeout(() => updateScaleFallback(mainMap), 500);
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectPolishCss();
    sanitizeLabels();
    normalizeText();
  }, { once: true });

  window.addEventListener('load', () => setTimeout(rescueRuntime, 0), { once: true });

  console.info('[Vietflexmap] One-shot runtime fix active · Vietflex Google Roadmap · no OSM.');
})();
