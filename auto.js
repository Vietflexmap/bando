(() => {
  'use strict';

  const INDEX_URL = 'https://raw.githubusercontent.com/thanglequoc/vietnamese-provinces-database/master/json/vn_only_simplified_json_generated_data_vn_units_minified.json';
  const RAW_ROOT = 'https://raw.githubusercontent.com/thanglequoc/vietnamese-provinces-database/master/json/geojson';
  const API_ROOT = 'https://api.github.com/repos/thanglequoc/vietnamese-provinces-database/contents/json/geojson';
  const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
  const CACHE_KEY = 'vf-admin-index-2026-07-25-v1';
  const maps = window.__vfMaps || [];
  const mainMap = maps[0];
  const insetMap = maps[1];
  if (!mainMap || !insetMap) return;

  const $ = id => document.getElementById(id);
  let catalog = null;
  let flatUnits = [];
  let autoFeeding = false;
  let activeAutoRecord = null;
  let autoInsetGroup = L.layerGroup().addTo(insetMap);
  const geoCache = new Map();

  injectStyles();
  buildPanel();
  init();

  function injectStyles() {
    const css = `
      .auto-generator{margin:0 0 4px;padding:14px 0 17px;border-bottom:1px solid rgba(255,255,255,.14)}
      .auto-generator .auto-hero{border:1px solid rgba(126,196,239,.35);background:linear-gradient(145deg,rgba(36,83,116,.78),rgba(17,48,70,.9));border-radius:7px;padding:11px;margin-bottom:10px}
      .auto-kicker{font-size:9px;letter-spacing:.12em;color:#88c8ee;font-weight:800}.auto-hero strong{display:block;margin-top:3px;font-size:13px;color:#fff}.auto-hero p{margin:5px 0 0;font-size:10px;line-height:1.45;color:#b7cedd}
      .auto-generator label{display:block;margin:8px 0;font-size:11px;color:#b9ccda}.auto-generator input,.auto-generator select{width:100%;margin-top:5px;border:1px solid #36546a;border-radius:5px;background:#132f44;color:#fff;padding:8px 9px;outline:none}
      .auto-generator input:focus,.auto-generator select:focus{border-color:#83bfe6;box-shadow:0 0 0 2px rgba(119,185,229,.14)}
      .auto-search-row{display:grid;grid-template-columns:minmax(0,1fr) 82px;gap:7px;align-items:end}.auto-generate{height:35px;background:#eef7fb;color:#12324a;border:0;border-radius:5px;font-size:11px;font-weight:800}.auto-generate:disabled{opacity:.55;cursor:wait}
      .auto-results{display:grid;gap:5px;margin-top:8px;max-height:215px;overflow:auto}.auto-result{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;text-align:left;border:1px solid #36546a;border-radius:5px;padding:8px;background:#17374f;color:#eef7fb}.auto-result:hover{background:#204864;border-color:#5f8ba8}.auto-result strong{display:block;font-size:11px}.auto-result small{display:block;margin-top:2px;color:#a9c0cf;font-size:9px;line-height:1.35}.auto-code{font-size:9px;color:#8fcaec;font-weight:800;align-self:center}.auto-status{margin:8px 0 0;font-size:10px;line-height:1.45;color:#9eb6c7}.auto-status.ok{color:#9edbb0}.auto-status.warn{color:#ffd28c}.auto-status.busy{color:#8fcaec}.auto-source-note{font-size:9px;line-height:1.4;color:#7896a9;margin:8px 0 0}.auto-source-note a{color:#9bcbea}
      .auto-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:20px;background:rgba(64,163,112,.16);border:1px solid rgba(117,214,162,.28);color:#a4e0bd;font-size:9px;font-weight:800;margin-top:7px}
      @media(max-width:900px){.auto-results{max-height:300px}}
    `;
    const style = document.createElement('style');
    style.id = 'autoGeneratorStyle';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildPanel() {
    const host = document.querySelector('.editor-scroll');
    if (!host) return;
    const section = document.createElement('section');
    section.id = 'autoGeneratorPanel';
    section.className = 'auto-generator';
    section.innerHTML = `
      <div class="auto-hero">
        <span class="auto-kicker">AUTOMATIC COMMUNE MAP GENERATOR</span>
        <strong>Gõ xã/phường → tự dựng bản đồ</strong>
        <p>Tự tìm mã đơn vị, tải polygon xã và tỉnh, dựng inset vị trí, điền tiêu đề, mã bản đồ và nguồn dữ liệu.</p>
        <span class="auto-badge">● 34 tỉnh · 3.321 đơn vị cấp xã</span>
      </div>
      <label>Tỉnh / thành phố (khuyến nghị khi tên xã trùng)
        <select id="autoProvince"><option value="">Tất cả tỉnh / thành phố</option></select>
      </label>
      <div class="auto-search-row">
        <label>Tìm xã / phường / đặc khu
          <input id="autoCommune" autocomplete="off" placeholder="Ví dụ: Vĩnh Thịnh" />
        </label>
        <button id="autoGenerateBtn" class="auto-generate" type="button">Tạo ngay</button>
      </div>
      <div id="autoResults" class="auto-results" aria-live="polite"></div>
      <p id="autoStatus" class="auto-status">Đang khởi tạo danh mục hành chính…</p>
      <p class="auto-source-note">Polygon tự động dùng dữ liệu GeoJSON mở (MIT) và được trình bày cùng nền/địa giới VN-SDI. Bản đồ xuất nhanh vẫn cần đối chiếu hồ sơ pháp lý khi dùng chính thức.</p>
    `;
    host.prepend(section);
  }

  async function init() {
    document.title = 'Vietflexmap · Automatic Commune Map Generator';
    const input = $('autoCommune');
    const province = $('autoProvince');
    const button = $('autoGenerateBtn');
    input?.addEventListener('input', debounce(renderMatches, 120));
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); generateBestMatch(); }
    });
    province?.addEventListener('change', renderMatches);
    button?.addEventListener('click', generateBestMatch);
    $('geojsonInput')?.addEventListener('change', () => {
      if (!autoFeeding) {
        activeAutoRecord = null;
        autoInsetGroup.clearLayers();
      }
    });
    try {
      catalog = await loadCatalog();
      buildFlatIndex();
      populateProvinces();
      setStatus(`Sẵn sàng · ${catalog.length} tỉnh/thành · ${flatUnits.length.toLocaleString('vi-VN')} xã/phường/đặc khu.`, 'ok');
      const existingProvince = $('provinceInput')?.value?.trim();
      const existingCommune = $('communeInput')?.value?.trim();
      if (existingProvince) selectProvinceByText(existingProvince);
      if (existingCommune) { input.value = stripUnitPrefix(existingCommune); renderMatches(); }
    } catch (error) {
      console.error(error);
      setStatus('Không tải được danh mục tự động. Map Composer thủ công vẫn hoạt động bình thường.', 'warn');
    }
  }

  async function loadCatalog() {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    const response = await fetch(INDEX_URL, { mode: 'cors', cache: 'force-cache' });
    if (!response.ok) throw new Error(`Không tải được danh mục: HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error('Danh mục hành chính rỗng');
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (_) {}
    return data;
  }

  function buildFlatIndex() {
    flatUnits = [];
    for (const province of catalog || []) {
      for (const ward of province.Wards || []) {
        flatUnits.push({
          province,
          ward,
          provinceNorm: normalize(province.FullName),
          wardNorm: normalize(ward.FullName),
          wardBare: normalize(stripUnitPrefix(ward.FullName)),
          code: String(ward.Code || '')
        });
      }
    }
  }

  function populateProvinces() {
    const select = $('autoProvince');
    if (!select) return;
    const previous = select.value;
    for (const province of catalog) {
      const option = document.createElement('option');
      option.value = province.Code;
      option.textContent = `${province.FullName} · ${province.Code}`;
      select.appendChild(option);
    }
    if (previous) select.value = previous;
  }

  function renderMatches() {
    if (!catalog) return;
    const query = $('autoCommune')?.value?.trim() || '';
    const provinceCode = $('autoProvince')?.value || '';
    const box = $('autoResults');
    if (!box) return;
    box.innerHTML = '';
    if (!query) return;
    const matches = searchUnits(query, provinceCode).slice(0, 10);
    if (!matches.length) {
      box.innerHTML = '<div class="auto-status warn">Chưa thấy đơn vị phù hợp trong danh mục hiện hành.</div>';
      return;
    }
    for (const item of matches) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'auto-result';
      button.innerHTML = `<span><strong>${escapeHtml(item.ward.FullName)}</strong><small>${escapeHtml(item.province.FullName)}</small></span><span class="auto-code">${escapeHtml(item.ward.Code)}</span>`;
      button.addEventListener('click', () => generateMap(item));
      box.appendChild(button);
    }
  }

  function searchUnits(query, provinceCode = '') {
    const q = normalize(stripUnitPrefix(query));
    if (!q) return [];
    return flatUnits
      .filter(item => !provinceCode || item.province.Code === provinceCode)
      .map(item => ({ ...item, score: matchScore(item, q) }))
      .filter(item => Number.isFinite(item.score))
      .sort((a, b) => a.score - b.score || a.wardBare.length - b.wardBare.length || a.province.FullName.localeCompare(b.province.FullName, 'vi'));
  }

  function matchScore(item, q) {
    if (item.code === q) return 0;
    if (item.wardBare === q) return 1;
    if (item.wardNorm === q) return 1.1;
    if (item.wardBare.startsWith(q)) return 2 + (item.wardBare.length - q.length) / 100;
    if (item.wardBare.includes(q)) return 3 + item.wardBare.indexOf(q) / 100;
    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length > 1 && tokens.every(token => item.wardBare.includes(token))) return 4;
    return Infinity;
  }

  async function generateBestMatch() {
    const query = $('autoCommune')?.value?.trim() || $('communeInput')?.value?.trim() || '';
    if (!query) { setStatus('Hãy nhập tên xã/phường cần tạo bản đồ.', 'warn'); $('autoCommune')?.focus(); return; }
    if (!$('autoCommune').value.trim()) $('autoCommune').value = stripUnitPrefix(query);
    const matches = searchUnits(query, $('autoProvince')?.value || '');
    if (!matches.length) { renderMatches(); setStatus('Không tìm thấy đơn vị phù hợp. Thử chọn tỉnh để thu hẹp kết quả.', 'warn'); return; }
    await generateMap(matches[0]);
  }

  async function generateMap(record) {
    if (!record?.province || !record?.ward) return;
    const button = $('autoGenerateBtn');
    const original = button?.textContent || 'Tạo ngay';
    if (button) { button.disabled = true; button.textContent = 'Đang dựng…'; }
    setStatus(`Đang tải polygon ${record.ward.FullName} và ${record.province.FullName}…`, 'busy');
    try {
      activeAutoRecord = record;
      applyAutomaticMetadata(record);
      const [wardData, provinceData] = await Promise.all([
        fetchUnitGeoJSON(record.province, record.ward),
        fetchProvinceGeoJSON(record.province)
      ]);
      const wardFeature = prepareFeature(firstFeature(wardData), record, 'target');
      const provinceFeature = prepareProvinceFeature(firstFeature(provinceData), record.province);
      if (!wardFeature?.geometry) throw new Error('Không có hình học xã/phường');

      await feedGeoJSON({ type: 'FeatureCollection', features: [wardFeature] }, record);
      drawAutomaticInset(provinceFeature, wardFeature, record);
      fitMainMapToAutomaticTarget(record.ward.Code);
      updateAutomaticSource(record);
      setStatus(`Hoàn tất · ${record.ward.FullName} · ${record.province.FullName}. Có thể chỉnh tay rồi xuất PNG/PDF.`, 'ok');
      const results = $('autoResults'); if (results) results.innerHTML = '';
    } catch (error) {
      console.error(error);
      setStatus('Nguồn GeoJSON chính không phản hồi; đang thử nguồn OSM dự phòng…', 'warn');
      try {
        const fallback = await fetchNominatim(record);
        applyAutomaticMetadata(record);
        await feedGeoJSON({ type: 'FeatureCollection', features: [fallback.ward] }, record);
        if (fallback.province) drawAutomaticInset(fallback.province, fallback.ward, record);
        fitMainMapToAutomaticTarget(record.ward.Code);
        updateAutomaticSource(record, true);
        setStatus(`Đã dựng bằng nguồn dự phòng OSM · ${record.ward.FullName}. Hãy kiểm tra ranh giới trước khi xuất.`, 'warn');
      } catch (fallbackError) {
        console.error(fallbackError);
        setStatus('Không thể tự tải polygon cho đơn vị này. Bạn vẫn có thể nạp GeoJSON thủ công ở mục Nền & ranh giới.', 'warn');
      }
    } finally {
      if (button) { button.disabled = false; button.textContent = original; }
    }
  }

  function applyAutomaticMetadata(record) {
    $('presetBtn')?.click();
    setValue('provinceInput', record.province.FullName);
    setValue('communeInput', record.ward.FullName);
    setValue('titleInput', `BẢN ĐỒ HÀNH CHÍNH ${record.ward.FullName.toUpperCase()}`);
    setValue('subtitleInput', `Vị trí ${record.ward.FullName} trong ${record.province.FullName} · WGS 84`);
    setValue('mapCodeInput', `VF-${record.province.Code}-${record.ward.Code}`);
    selectProvinceByText(record.province.FullName);
    if ($('autoCommune')) $('autoCommune').value = stripUnitPrefix(record.ward.FullName);
  }

  function updateAutomaticSource(record, fallback = false) {
    const source = fallback
      ? 'Ranh giới tự động: OpenStreetMap/Nominatim (nguồn dự phòng). Nền và địa giới tham chiếu: Vietflexmap / OpenStreetMap / VN-SDI.'
      : 'Ranh giới tự động: Vietnamese Provinces Database (MIT, dữ liệu GeoJSON đơn vị hành chính Việt Nam). Nền và địa giới tham chiếu: Vietflexmap / OpenStreetMap / VN-SDI.';
    setValue('sourceInput', source);
    const summary = $('dataSummary');
    if (summary) {
      summary.textContent = `AUTO · ${record.ward.FullName} · mã ${record.ward.Code} · ${record.province.FullName}`;
      summary.className = fallback ? 'status warn' : 'status ok';
    }
  }

  async function fetchProvinceGeoJSON(province) {
    const dir = `${province.Code}_${slug(stripUnitPrefix(province.FullName))}`;
    const key = `p:${province.Code}`;
    if (geoCache.has(key)) return clone(geoCache.get(key));
    const url = `${RAW_ROOT}/${dir}/${dir}.geojson`;
    const data = await fetchJson(url);
    geoCache.set(key, data);
    return clone(data);
  }

  async function fetchUnitGeoJSON(province, ward) {
    const dir = `${province.Code}_${slug(stripUnitPrefix(province.FullName))}`;
    const filename = `${ward.Code}_${slug(stripUnitPrefix(ward.FullName))}.geojson`;
    const key = `w:${ward.Code}`;
    if (geoCache.has(key)) return clone(geoCache.get(key));
    let response = await fetch(`${RAW_ROOT}/${dir}/wards/${filename}`, { mode: 'cors', cache: 'force-cache' });
    if (response.ok) {
      const data = await response.json();
      geoCache.set(key, data);
      return clone(data);
    }
    const listing = await fetchJson(`${API_ROOT}/${dir}/wards?ref=master`);
    const match = Array.isArray(listing) ? listing.find(file => String(file.name || '').startsWith(`${ward.Code}_`) && String(file.name).endsWith('.geojson')) : null;
    if (!match?.download_url) throw new Error(`Không tìm thấy file polygon cho ${ward.Code}`);
    const data = await fetchJson(match.download_url);
    geoCache.set(key, data);
    return clone(data);
  }

  async function fetchJson(url) {
    const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return response.json();
  }

  function firstFeature(data) {
    if (!data) return null;
    if (data.type === 'FeatureCollection') return data.features?.[0] || null;
    if (data.type === 'Feature') return data;
    if (data.type && data.coordinates) return { type: 'Feature', properties: {}, geometry: data };
    return null;
  }

  function prepareFeature(feature, record, role) {
    if (!feature) return null;
    const copy = clone(feature);
    copy.properties = {
      ...(copy.properties || {}),
      TEN_XA: record.ward.FullName,
      TEN_TINH: record.province.FullName,
      NAME: record.ward.FullName,
      MA_XA: record.ward.Code,
      MA_TINH: record.province.Code,
      vf_role: role,
      vf_auto: true
    };
    return copy;
  }

  function prepareProvinceFeature(feature, province) {
    if (!feature) return null;
    const copy = clone(feature);
    copy.properties = { ...(copy.properties || {}), NAME: province.FullName, TEN_TINH: province.FullName, MA_TINH: province.Code, vf_role: 'province_context', vf_auto: true };
    return copy;
  }

  async function feedGeoJSON(fc, record) {
    const input = $('geojsonInput');
    if (!input) throw new Error('Không tìm thấy bộ nạp GeoJSON');
    autoFeeding = true;
    try {
      const file = new File([JSON.stringify(fc)], `${record.ward.Code}_${slug(stripUnitPrefix(record.ward.FullName))}.geojson`, { type: 'application/geo+json' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await waitForTargetLayer(record.ward.Code, 4200);
    } finally {
      setTimeout(() => { autoFeeding = false; }, 0);
    }
  }

  function waitForTargetLayer(code, timeout) {
    const started = performance.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        if (findTargetLayer(code)) return resolve();
        if (performance.now() - started > timeout) return reject(new Error('Hết thời gian chờ lớp xã'));
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  function findTargetLayer(code) {
    let found = null;
    const inspect = layer => {
      if (found || !layer) return;
      if (layer.feature && String(layer.feature?.properties?.MA_XA || layer.feature?.properties?.MaXa || '') === String(code)) { found = layer; return; }
      if (typeof layer.eachLayer === 'function') layer.eachLayer(inspect);
    };
    mainMap.eachLayer(inspect);
    return found;
  }

  function fitMainMapToAutomaticTarget(code) {
    const target = findTargetLayer(code);
    if (target?.getBounds) {
      const bounds = target.getBounds();
      if (bounds?.isValid?.()) mainMap.fitBounds(bounds.pad(.12), { padding: [44, 44], maxZoom: 16 });
    }
  }

  function drawAutomaticInset(provinceFeature, wardFeature, record) {
    autoInsetGroup.clearLayers();
    if (provinceFeature?.geometry) {
      const provinceLayer = L.geoJSON(provinceFeature, {
        interactive: false,
        style: { color: '#425d70', weight: 1.1, opacity: .95, fillColor: '#eef2f4', fillOpacity: .18 }
      }).addTo(autoInsetGroup);
      const bounds = provinceLayer.getBounds?.();
      if (bounds?.isValid?.()) insetMap.fitBounds(bounds, { padding: [7, 7] });
    }
    if (wardFeature?.geometry) {
      L.geoJSON(wardFeature, {
        interactive: false,
        style: { color: '#8f2323', weight: 2.2, opacity: 1, fillColor: '#d7655d', fillOpacity: .58 }
      }).addTo(autoInsetGroup);
    }
    const caption = $('insetCaption');
    if (caption) caption.textContent = `${record.ward.FullName} trong ${record.province.FullName}`;
  }

  async function fetchNominatim(record) {
    const ward = await nominatimPolygon(`${record.ward.FullName}, ${record.province.FullName}, Việt Nam`, record, 'target');
    let province = null;
    try { province = await nominatimPolygon(`${record.province.FullName}, Việt Nam`, record, 'province_context'); } catch (_) {}
    return { ward, province };
  }

  async function nominatimPolygon(query, record, role) {
    const url = `${NOMINATIM}?format=geojson&polygon_geojson=1&addressdetails=1&countrycodes=vn&limit=5&q=${encodeURIComponent(query)}`;
    const data = await fetchJson(url);
    const feature = (data.features || []).find(f => ['Polygon', 'MultiPolygon'].includes(f.geometry?.type));
    if (!feature) throw new Error(`Nominatim không có polygon: ${query}`);
    if (role === 'target') return prepareFeature(feature, record, role);
    return prepareProvinceFeature(feature, record.province);
  }

  function selectProvinceByText(text) {
    const select = $('autoProvince');
    if (!select || !catalog) return;
    const q = normalize(stripUnitPrefix(text));
    const province = catalog.find(item => normalize(stripUnitPrefix(item.FullName)) === q || normalize(item.FullName) === normalize(text));
    if (province) select.value = province.Code;
  }

  function setValue(id, value) {
    const el = $(id);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setStatus(message, state = '') {
    const el = $('autoStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `auto-status ${state}`.trim();
  }

  function stripUnitPrefix(text = '') {
    return String(text).trim().replace(/^(tỉnh|thành phố|tp\.?|xã|phường|đặc khu|thị trấn)\s+/i, '').trim();
  }

  function normalize(text = '') {
    return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }

  function slug(text = '') {
    return normalize(text).replace(/\s+/g, '_');
  }

  function escapeHtml(text = '') {
    return String(text).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function debounce(fn, wait) { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); }; }
})();
