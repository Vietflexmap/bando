(() => {
  'use strict';

  const V = window.Vietflex;
  if (!V) {
    console.error('[Vietflexmap] Không tải được Vietflex Core.');
    return;
  }

  // Giữ biến L để Esri Leaflet và mã Map Composer cũ tiếp tục tương thích.
  window.L = V;
  window.__VIETFLEX_NO_OSM__ = true;

  // app.js cũ dùng key nội bộ "osm" cho lớp nền mặc định. Ta giữ key này
  // để project JSON cũ mở được, nhưng thay TileLayer OSM bằng Vietflex Google Roadmap.
  const originalTileLayer = V.tileLayer;
  if (typeof originalTileLayer === 'function' && typeof V.legacyGoogleTiles === 'function') {
    V.tileLayer = function vietflexTileLayer(url, options = {}) {
      const text = String(url || '');
      if (/tile\.openstreetmap\.org/i.test(text)) {
        const layer = V.legacyGoogleTiles({
          ...options,
          mapType: 'roadmap'
        });
        // Bảo toàn pane/opacity do Map Composer truyền vào.
        if (layer?.options) {
          if (options.pane) layer.options.pane = options.pane;
          if (options.opacity !== undefined) layer.options.opacity = options.opacity;
          if (options.maxZoom !== undefined) layer.options.maxZoom = options.maxZoom;
        }
        return layer;
      }
      return originalTileLayer.call(V, url, options);
    };
  }

  // Chính sách ứng dụng: không gọi OSM/Nominatim ở bất kỳ fallback fetch nào.
  const nativeFetch = window.fetch?.bind(window);
  if (nativeFetch) {
    window.fetch = function noOsmFetch(input, init) {
      const url = typeof input === 'string' ? input : (input?.url || '');
      if (/(?:^|\.)openstreetmap\.org(?:\/|$)/i.test(new URL(url, location.href).hostname) || /nominatim\.openstreetmap\.org/i.test(url)) {
        return Promise.reject(new TypeError('OSM/Nominatim disabled by Vietflexmap configuration'));
      }
      return nativeFetch(input, init);
    };
  }

  const sanitizeSource = (text = '') => String(text)
    .replace(/Vietflexmap\s*\/\s*OpenStreetMap\s*\/\s*VN-SDI/gi, 'Vietflex Map Core / Google Roadmap / VN-SDI')
    .replace(/OpenStreetMap/gi, 'Vietflex Map Core')
    .replace(/Nominatim/gi, 'GeoJSON thủ công')
    .replace(/\bOSM\b/gi, 'Vietflex');

  function refreshUiLabels() {
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
        }, 0);
      });
    }

    if (sourceInput && !sourceInput.dataset.vietflexBound) {
      sourceInput.dataset.vietflexBound = '1';
      const clean = () => {
        const cleaned = sanitizeSource(sourceInput.value);
        if (cleaned !== sourceInput.value) sourceInput.value = cleaned;
      };
      sourceInput.addEventListener('input', clean);
      sourceInput.addEventListener('change', clean);
    }

    const autoStatus = document.getElementById('autoStatus');
    if (autoStatus && !autoStatus.dataset.noOsmObserver) {
      autoStatus.dataset.noOsmObserver = '1';
      const observer = new MutationObserver(() => {
        if (/OpenStreetMap|Nominatim|\bOSM\b/i.test(autoStatus.textContent || '')) {
          autoStatus.textContent = 'Nguồn GeoJSON tự động không phản hồi. OSM đã tắt; hãy thử lại hoặc nạp GeoJSON thủ công.';
          autoStatus.classList.remove('busy', 'ok');
          autoStatus.classList.add('warn');
        }
      });
      observer.observe(autoStatus, { childList: true, characterData: true, subtree: true });
    }
  }

  document.addEventListener('DOMContentLoaded', refreshUiLabels, { once: true });
  window.addEventListener('load', () => setTimeout(refreshUiLabels, 0), { once: true });

  console.info('[Vietflexmap] Vietflex Core active · Google Roadmap · OSM disabled.');
})();
