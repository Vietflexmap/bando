(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const body = document.body;
  const stage = document.querySelector('.sheet-stage');
  const viewport = $('sheetViewport');
  const sheet = $('mapSheet');
  const editor = document.querySelector('.editor');
  const mobileQuery = window.matchMedia('(max-width: 900px)');

  if (!stage || !viewport || !sheet || !editor) return;

  let viewMode = 'fit';
  let previewing = false;
  let desktopEditorOpen = true;
  let resizeTimer = null;
  let lastScale = 1;

  const controls = {
    toggle: $('toggleEditorBtn'), close: $('editorCloseBtn'), backdrop: $('editorBackdrop'), fab: $('openEditorFab'),
    preview: $('previewBtn'), fit: $('fitSheetBtn'),
    previewExit: $('previewExitBtn'), previewPng: $('previewPngBtn'), previewPdf: $('previewPdfBtn'), previewPrint: $('previewPrintBtn'),
    quickPreview: $('quickPreviewBtn'), quickPng: $('quickPngBtn'), quickPdf: $('quickPdfBtn')
  };

  init();

  function init() {
    try { desktopEditorOpen = localStorage.getItem('vf-editor-open') !== '0'; } catch (_) {}
    applyResponsiveEditor(true);
    initSectionCollapse();
    bindControls();
    observeSheet();
    protectFullResolutionExport();
    scheduleFit(60);

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        applyResponsiveEditor(false);
        fitSheet();
      }, 90);
    });
    mobileQuery.addEventListener?.('change', () => {
      applyResponsiveEditor(false);
      scheduleFit(120);
    });
    document.addEventListener('keydown', onKeyDown);
    monitorAutomaticGenerator();
  }

  function bindControls() {
    controls.toggle?.addEventListener('click', () => setEditorOpen(!isEditorOpen()));
    controls.close?.addEventListener('click', () => setEditorOpen(false));
    controls.backdrop?.addEventListener('click', () => setEditorOpen(false));
    controls.fab?.addEventListener('click', () => setEditorOpen(true));
    controls.preview?.addEventListener('click', enterPreview);
    controls.quickPreview?.addEventListener('click', enterPreview);
    controls.fit?.addEventListener('click', toggleFitMode);
    controls.previewExit?.addEventListener('click', exitPreview);
    proxy(controls.previewPng, 'exportPngBtn');
    proxy(controls.previewPdf, 'exportPdfBtn');
    proxy(controls.previewPrint, 'printBtn');
    proxy(controls.quickPng, 'exportPngBtn');
    proxy(controls.quickPdf, 'exportPdfBtn');
    $('pageSize')?.addEventListener('change', () => scheduleFit(150));
    $('orientation')?.addEventListener('change', () => scheduleFit(150));
  }

  function proxy(button, targetId) {
    button?.addEventListener('click', () => $(targetId)?.click());
  }

  function isEditorOpen() {
    return mobileQuery.matches ? body.classList.contains('editor-open') : !body.classList.contains('editor-collapsed');
  }

  function setEditorOpen(open, immediate = false) {
    if (previewing && open) exitPreview();
    if (mobileQuery.matches) {
      body.classList.toggle('editor-open', open);
      body.classList.remove('editor-collapsed');
    } else {
      desktopEditorOpen = open;
      body.classList.toggle('editor-collapsed', !open);
      body.classList.remove('editor-open');
      try { localStorage.setItem('vf-editor-open', open ? '1' : '0'); } catch (_) {}
    }
    updateEditorButtons(open);
    scheduleFit(immediate ? 0 : 260);
  }

  function applyResponsiveEditor(initial) {
    if (mobileQuery.matches) {
      body.classList.remove('editor-collapsed');
      body.classList.toggle('editor-open', initial ? false : body.classList.contains('editor-open'));
      updateEditorButtons(body.classList.contains('editor-open'));
    } else {
      body.classList.remove('editor-open');
      body.classList.toggle('editor-collapsed', !desktopEditorOpen);
      updateEditorButtons(desktopEditorOpen);
    }
  }

  function updateEditorButtons(open) {
    if (controls.toggle) {
      const label = controls.toggle.querySelector('.button-label');
      if (label) label.textContent = open ? 'Ẩn tùy chọn' : 'Biên tập';
      controls.toggle.setAttribute('aria-expanded', String(open));
    }
    if (controls.fab) {
      const hidden = open && mobileQuery.matches;
      controls.fab.setAttribute('aria-hidden', String(hidden));
      controls.fab.style.display = mobileQuery.matches ? (hidden ? 'none' : 'flex') : '';
    }
  }

  function enterPreview() {
    if (previewing) return;
    previewing = true;
    body.classList.add('preview-mode', 'editor-collapsed');
    body.classList.remove('editor-open');
    scheduleFit(90);
  }

  function exitPreview() {
    if (!previewing) return;
    previewing = false;
    body.classList.remove('preview-mode');
    if (mobileQuery.matches) {
      body.classList.remove('editor-collapsed', 'editor-open');
      updateEditorButtons(false);
    } else {
      body.classList.toggle('editor-collapsed', !desktopEditorOpen);
      updateEditorButtons(desktopEditorOpen);
    }
    scheduleFit(120);
  }

  function toggleFitMode() {
    viewMode = viewMode === 'fit' ? 'actual' : 'fit';
    if (controls.fit) {
      const label = controls.fit.querySelector('.button-label');
      if (label) label.textContent = viewMode === 'fit' ? '100%' : 'Vừa màn hình';
      controls.fit.title = viewMode === 'fit' ? 'Xem kích thước 100%' : 'Thu toàn bộ tờ giấy vừa màn hình';
    }
    fitSheet();
  }

  function rawSheetSize() {
    const oldZoom = sheet.style.zoom;
    sheet.style.zoom = '1';
    sheet.style.transform = 'none';
    const width = sheet.offsetWidth;
    const height = sheet.offsetHeight;
    sheet.style.zoom = oldZoom || '1';
    return { width, height };
  }

  function fitSheet() {
    if (!sheet.isConnected || !stage.clientWidth || !stage.clientHeight) return;

    const { width: rawW, height: rawH } = rawSheetSize();
    if (!rawW || !rawH) return;

    let scale = 1;
    if (viewMode === 'fit') {
      const cs = getComputedStyle(stage);
      const padX = parseFloat(cs.paddingLeft || 0) + parseFloat(cs.paddingRight || 0);
      const padY = parseFloat(cs.paddingTop || 0) + parseFloat(cs.paddingBottom || 0);
      const reserve = previewing && mobileQuery.matches ? 54 : 0;
      const availableW = Math.max(180, stage.clientWidth - padX - 6);
      const availableH = Math.max(180, stage.clientHeight - padY - reserve - 6);
      scale = Math.min(1, availableW / rawW, availableH / rawH);
      scale = Math.max(.12, scale);
    }

    lastScale = scale;
    sheet.style.transform = 'none';
    sheet.style.zoom = String(scale);
    viewport.style.width = `${Math.ceil(rawW * scale)}px`;
    viewport.style.height = `${Math.ceil(rawH * scale)}px`;
    viewport.dataset.scale = scale.toFixed(3);

    const label = controls.fit?.querySelector('.fit-percent');
    if (label) label.textContent = `${Math.round(scale * 100)}%`;

    requestAnimationFrame(() => {
      (window.__vfMaps || []).forEach(map => map?.invalidateSize?.({ pan: false }));
    });
  }

  function scheduleFit(delay = 0) {
    setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(fitSheet)), delay);
  }

  function observeSheet() {
    const observer = new MutationObserver(() => scheduleFit(80));
    observer.observe(sheet, { attributes: true, attributeFilter: ['data-size', 'data-orientation', 'class'] });
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => scheduleFit(30));
      ro.observe(stage);
    }
  }

  function initSectionCollapse() {
    document.querySelectorAll('.panel-section').forEach((section, index) => {
      const title = section.querySelector(':scope > .section-title');
      if (!title) return;
      title.setAttribute('role', 'button');
      title.setAttribute('tabindex', '0');
      title.setAttribute('aria-expanded', 'true');
      const toggle = () => {
        const collapsed = section.classList.toggle('section-collapsed');
        title.setAttribute('aria-expanded', String(!collapsed));
        scheduleFit(50);
      };
      title.addEventListener('click', toggle);
      title.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
      if (mobileQuery.matches && index > 1 && index < 4) {
        section.classList.add('section-collapsed');
        title.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function protectFullResolutionExport() {
    if (typeof window.html2canvas !== 'function') return;
    const original = window.html2canvas;
    window.html2canvas = async function(...args) {
      body.classList.add('export-clean');
      const oldTransform = sheet.style.transform;
      const oldZoom = sheet.style.zoom;
      const oldViewportW = viewport.style.width;
      const oldViewportH = viewport.style.height;

      sheet.style.transform = 'none';
      sheet.style.zoom = '1';
      viewport.style.width = `${sheet.offsetWidth}px`;
      viewport.style.height = `${sheet.offsetHeight}px`;
      (window.__vfMaps || []).forEach(map => map?.invalidateSize?.({ pan: false }));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      try {
        return await original.apply(this, args);
      } finally {
        sheet.style.transform = oldTransform;
        sheet.style.zoom = oldZoom || String(lastScale);
        viewport.style.width = oldViewportW;
        viewport.style.height = oldViewportH;
        body.classList.remove('export-clean');
        scheduleFit(40);
      }
    };
  }

  function monitorAutomaticGenerator() {
    const status = $('autoStatus');
    if (!status) return;
    const observer = new MutationObserver(() => {
      if (mobileQuery.matches && status.classList.contains('ok') && /Hoàn tất/.test(status.textContent || '')) {
        setTimeout(() => setEditorOpen(false), 450);
      }
    });
    observer.observe(status, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      if (previewing) exitPreview();
      else if (mobileQuery.matches && body.classList.contains('editor-open')) setEditorOpen(false);
      return;
    }
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') return;
    if (event.key.toLowerCase() === 'e') {
      event.preventDefault();
      setEditorOpen(!isEditorOpen());
    }
    if (event.key.toLowerCase() === 'v') {
      event.preventDefault();
      previewing ? exitPreview() : enterPreview();
    }
  }
})();
