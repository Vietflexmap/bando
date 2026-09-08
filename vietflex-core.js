(() => {
  'use strict';

  const V = window.Vietflex;
  if (!V) {
    console.error('[Vietflexmap] Không tải được Vietflex Core.');
    return;
  }

  // Giữ API tương thích cho Esri Leaflet và Map Composer hiện hữu.
  window.L = V;
  window.__VIETFLEX_NO_OSM__ = true;

  const GOOGLE_ROADMAP_URL = 'https://{s}.google.com/vt/lyrs=m&hl=vi&gl=VN&x={x}&y={y}&z={z}';
  const GOOGLE_SUBDOMAINS = ['mt0', 'mt1', 'mt2', 'mt3'];
  const originalTileLayer = V.tileLayer;
  const googleLayers = [];
  let mainGoogleErrors = 0;
  let fallbackTriggered = false;

  function nfc(value = '') {
    try { return String(value).normalize('NFC'); } catch (_) { return String(value); }
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

  function showBasemapStatus(text, state = 'busy', autoHide = 0) {
    const chip = statusChip();
    if (!chip) return;
    chip.textContent = text;
    chip.className = `vf-basemap-status show ${state}`;
    clearTimeout(showBasemapStatus.timer);
    if (autoHide) {
      showBasemapStatus.timer = setTimeout(() => chip.classList.remove('show'), autoHide);
    }
  }

  function fallbackToVnSdi() {
    if (fallbackTriggered) return;
    fallbackTriggered = true;
    const select = document.getElementById('basemapSelect');
    const canUseVnSdi = select?.querySelector('option[value="vnsdi"]');
    if (select && canUseVnSdi) {
      select.value = 'vnsdi';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      showBasemapStatus('Google Roadmap không phản hồi · đã chuyển sang VN‑SDI', 'warn', 6500);
    } else {
      showBasemapStatus('Không tải được nền Vietflex Google Roadmap', 'warn', 6500);
    }
  }

  // app.js cũ giữ key nội bộ "osm" để tương thích project JSON. Chỉ thay đúng
  // URL OSM cũ bằng Google Roadmap; tuyệt đối không gọi OSM. Dùng TileLayer gốc
  // thay vì gọi legacyGoogleTiles() vòng lại để tránh lỗi khởi tạo/đệ quy.
  if (typeof originalTileLayer === 'function') {
    V.tileLayer = function vietflexTileLayer(url, options = {}) {
      const text = String(url || '');
      if (/tile\.openstreetmap\.org/i.test(text)) {
        const googleOptions = {
          ...options,
          subdomains: GOOGLE_SUBDOMAINS,
          maxZoom: Math.max(Number(options.maxZoom) || 0, 20),
          // Google legacy tiles hiển thị bình thường khi không ép CORS. Ép
          // crossorigin như cấu hình OSM cũ có thể làm Chrome chặn toàn bộ tile.
          crossOrigin: false,
          attribution: 'Vietflex · Google Maps'
        };
        const layer = originalTileLayer.call(V, GOOGLE_ROADMAP_URL, googleOptions);
        layer.__vfGoogleRoadmap = true;
        googleLayers.push(layer);

        layer.on?.('loading', () => showBasemapStatus('Đang tải nền Vietflex · Google Roadmap…', 'busy'));
        layer.on?.('load', () => {
          if (options.pane === 'basePane') mainGoogleErrors = 0;
          showBasemapStatus('Vietflex · Google Roadmap đã sẵn sàng', 'ok', 1800);
        });
        layer.on?.('tileerror', () => {
          if (options.pane !== 'basePane') return;
          mainGoogleErrors += 1;
          if (mainGoogleErrors === 2) showBasemapStatus('Đang thử lại nền Google Roadmap…', 'warn');
          if (mainGoogleErrors >= 8) fallbackToVnSdi();
        });
        return layer;
      }
      return originalTileLayer.call(V, url, options);
    };
  }

  // Chính sách ứng dụng: không gọi OSM/Nominatim ở bất kỳ fetch fallback nào.
  const nativeFetch = window.fetch?.bind(window);
  if (nativeFetch) {
    window.fetch = function noOsmFetch(input, init) {
      const raw = typeof input === 'string' ? input : (input?.url || '');
      let host = '';
      try { host = new URL(raw, location.href).hostname; } catch (_) {}
      if (/(^|\.)openstreetmap\.org$/i.test(host) || /(^|\.)nominatim\.openstreetmap\.org$/i.test(host)) {
        return Promise.reject(new TypeError('OSM/Nominatim disabled by Vietflexmap configuration'));
      }
      return nativeFetch(input, init);
    };
  }

  const sanitizeSource = (text = '') => nfc(text)
    .replace(/Vietflexmap\s*\/\s*OpenStreetMap\s*\/\s*VN-SDI/gi, 'Vietflex Map Core / Google Roadmap / VN-SDI')
    .replace(/OpenStreetMap/gi, 'Vietflex Map Core')
    .replace(/Nominatim/gi, 'GeoJSON thủ công')
    .replace(/\bOSM\b/gi, 'Vietflex');

  function normalizeVietnameseText() {
    const ids = [
      'titleInput', 'subtitleInput', 'provinceInput', 'communeInput', 'mapCodeInput',
      'authorInput', 'agencyInput', 'sourceInput', 'noteInput', 'mapTitle', 'mapSubtitle',
      'mapPlace', 'agencyText', 'provincePrint', 'communePrint', 'sourcePrint', 'notePrint',
      'authorPrint', 'insetCaption'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if ('value' in el && typeof el.value === 'string') {
        const clean = nfc(el.value);
        if (clean !== el.value) el.value = clean;
      } else if (el.textContent) {
        const clean = nfc(el.textContent);
        if (clean !== el.textContent) el.textContent = clean;
      }
    });
  }

  function installTypographyPolish() {
    if (document.getElementById('vfTypographyPolish')) return;
    const style = document.createElement('style');
    style.id = 'vfTypographyPolish';
    style.textContent = `
      /* Vietnamese-safe typography: avoid spacing combining marks at scaled preview. */
      html,body,button,input,select,textarea,.leaflet-container{
        font-family:"Segoe UI",Arial,"Helvetica Neue",sans-serif!important;
        font-kerning:normal;font-variant-ligatures:common-ligatures;text-rendering:optimizeLegibility;
      }
      .map-sheet{font-family:"Segoe UI",Arial,"Helvetica Neue",sans-serif!important;-webkit-font-smoothing:antialiased}
      .map-sheet .agency,.map-sheet .title-block h1,.map-sheet .map-place,
      .map-sheet .legend-card h3,.map-sheet .info-card h3,.map-sheet .note-card h3,
      .map-sheet .inset-title,.map-sheet .north-letter{
        font-family:"Segoe UI",Arial,"Helvetica Neue",sans-serif!important;
        letter-spacing:0!important;font-kerning:normal!important;font-feature-settings:"kern" 1,"liga" 1;
      }
      .map-sheet .title-block h1{font-weight:800;line-height:1.08;word-spacing:.05em}
      .map-sheet .map-place{font-weight:700;line-height:1.18}
      .map-sheet .agency{font-weight:700;line-height:1.28}
      .panel-section h2,.brand-copy strong,.toolbar-button{letter-spacing:0!important}
      .panel-section input,.panel-section textarea,.panel-section select{line-height:1.35}
      .vf-basemap-status{position:absolute;left:50%;top:10px;z-index:1200;max-width:min(420px,80%);transform:translate(-50%,-8px);opacity:0;pointer-events:none;padding:8px 12px;border-radius:999px;background:rgba(17,48,70,.92);color:#fff;font:700 11px/1.25 "Segoe UI",Arial,sans-serif;box-shadow:0 5px 18px rgba(0,0,0,.18);transition:.2s}
      .vf-basemap-status.show{opacity:1;transform:translate(-50%,0)}
      .vf-basemap-status.ok{background:rgba(24,104,69,.92)}
      .vf-basemap-status.warn{background:rgba(142,92,22,.94)}
      @media(max-width:900px){.vf-basemap-status{top:7px;font-size:10px;max-width:88%;white-space:normal;text-align:center}}
      @media print{.vf-basemap-status{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  function refreshUiLabels() {
    installTypographyPolish();
    normalizeVietnameseText();

    const select = document.getElementById('basemapSelect');
    const legacyOption = select?.querySelector('option[value="osm"]');
    if (legacyOption) legacyOption.textContent = 'Vietflex · Google Roadmap';

    const print = document.getElementById('basemapPrint');
    if (print && (!select || select.value === 'osm')) print.textContent = 'Vietflex · Google Roadmap';

    const sourceInput = document.getElementById('sourceInput');
    if (sourceInput) sourceInput.value = sanitizeSource(sourceInput.value);
    const sourcePrint = document.getElementById('sourcePrint');
    if (sourcePrint) sourcePrint.textContent = sanitizeSource(sourcePrint.textContent);

    if (select && !select.dataset.vietflexBound) {
      select.dataset.vietflexBound = '1';
      select.addEventListener('change', () => {
        setTimeout(() => {
          if (select.value === 'osm' && print) print.textContent = 'Vietflex · Google Roadmap';
          normalizeVietnameseText();
        }, 0);
      });
    }

    document.querySelectorAll('input[type="text"],input:not([type]),textarea').forEach(el => {
      if (el.dataset.vfUnicodeBound) return;
      el.dataset.vfUnicodeBound = '1';
      const clean = () => {
        const next = nfc(el.value);
        if (next !== el.value) el.value = next;
      };
      el.addEventListener('input', clean);
      el.addEventListener('change', clean);
      el.addEventListener('blur', clean);
    });

    if (sourceInput && !sourceInput.dataset.vietflexBound) {
      sourceInput.dataset.vietflexBound = '1';
      const clean = () => {
        const cleaned = sanitizeSource(sourceInput.value);
        if (cleaned !== sourceInput.value) sourceInput.value = cleaned;
      };
      sourceInput.addEventListener('input', clean);
      sourceInput.addEventListener('change', clean);
    }

    const sheet = document.getElementById('mapSheet');
    if (sheet && !sheet.dataset.vfUnicodeObserver) {
      sheet.dataset.vfUnicodeObserver = '1';
      let normalizing = false;
      const observer = new MutationObserver(() => {
        if (normalizing) return;
        normalizing = true;
        normalizeVietnameseText();
        normalizing = false;
      });
      observer.observe(sheet, { childList: true, characterData: true, subtree: true });
    }
  }

  document.addEventListener('DOMContentLoaded', refreshUiLabels, { once: true });
  window.addEventListener('load', () => setTimeout(refreshUiLabels, 50), { once: true });

  console.info('[Vietflexmap] Vietflex Core active · Google Roadmap · Unicode NFC · OSM disabled.');
})();
