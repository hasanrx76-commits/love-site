/* ============================================
   CUSTOMIZER MODULE - Admin Panel
   ============================================ */

const Customizer = (() => {

  function init() {
    setupAdminToggle();
    setupTabs();
    populateAllFields();
    setupNamesHandlers();
    setupPhotoHandlers();
    setupContentHandlers();
    setupDatesHandlers();
    setupMediaHandlers();
    setupStyleHandlers();
    setupEffectsHandlers();
    setupExportImport();
    setupDynamicLists();
    setupThemeSwitcher();
    setupHeartColorSwitcher();
    setupCloudHandlers();

    // Apply saved love theme on load
    const savedTheme = Storage.getData('loveTheme');
    if (savedTheme) {
      applyLoveTheme(savedTheme);
    }
  }

  // --- Admin Panel Toggle ---
  function setupAdminToggle() {
    const panel = document.getElementById('admin-panel');
    const toggleBtn = document.getElementById('admin-toggle');
    const closeBtn = document.getElementById('admin-close');

    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('open');
      document.body.classList.toggle('admin-mode');
    });

    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
      document.body.classList.remove('admin-mode');
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('open')) {
        panel.classList.remove('open');
        document.body.classList.remove('admin-mode');
      }
    });
  }

  // --- Tabs ---
  function setupTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    const contents = document.querySelectorAll('.admin-tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const target = document.getElementById('tab-' + tab.dataset.tab);
        if (target) target.classList.add('active');
      });
    });
  }

  // --- Populate Fields ---
  function populateAllFields() {
    const names = Storage.getData('names');
    const about = Storage.getData('about');
    const dates = Storage.getData('dates');
    const content = Storage.getData('content');
    const style = Storage.getData('style');
    const effects = Storage.getData('effects');

    // Names
    setInputVal('admin-boy-name', names.boy);
    setInputVal('admin-girl-name', names.girl);
    setInputVal('admin-tagline', names.tagline);
    setInputVal('admin-footer-message', names.footerMessage);

    // Content
    setInputVal('admin-boy-about', about.boy);
    setInputVal('admin-girl-about', about.girl);
    setInputVal('admin-love-story', content.loveStory);
    setInputVal('admin-gift-message', content.giftMessage);
    setInputVal('admin-surprise-messages', content.surpriseMessages);
    setInputVal('admin-dream-goals', content.dreamGoals);

    // Dates
    setInputVal('admin-anniversary', dates.anniversary);
    setInputVal('admin-boy-birthday', dates.boyBirthday);
    setInputVal('admin-girl-birthday', dates.girlBirthday);
    setInputVal('admin-countdown-date', dates.countdownDate);
    setInputVal('admin-countdown-label', dates.countdownLabel);

    // Photos previews
    const photos = Storage.getData('photos');
    if (photos.boy) showPreview('admin-boy-photo-preview', photos.boy, 'boy');
    if (photos.girl) showPreview('admin-girl-photo-preview', photos.girl, 'girl');
    if (photos.cover) showPreview('admin-cover-preview', photos.cover, 'cover');

    // Style
    setInputVal('admin-theme', style.theme);
    setInputVal('admin-love-theme', Storage.getData('loveTheme') || 'rose');
    setInputVal('admin-primary-color', style.primaryColor);
    setInputVal('admin-secondary-color', style.secondaryColor);
    setInputVal('admin-bg-color', style.bgColor);
    setInputVal('admin-text-color', style.textColor);
    setInputVal('admin-font', style.font);
    setInputVal('admin-heading-font', style.headingFont);
    setInputVal('admin-sky', style.sky);
    setInputVal('admin-particle-color', style.particleColor);
    setInputVal('admin-font-size', style.fontSize);
    updateFontSizeLabel();

    // Effects
    Object.keys(effects).forEach(key => {
      const el = document.getElementById('eff-' + key);
      if (el) {
        if (el.type === 'checkbox') {
          el.checked = !!effects[key];
        } else {
          el.value = effects[key];
        }
      }
    });
    setInputVal('admin-anim-speed', effects.animSpeed);
    setInputVal('admin-camera', effects.camera);
    setInputVal('admin-heart-mode', effects.heartMode || 'theme');
    setInputVal('admin-heart-custom-color', effects.heartCustomColor || '#ff6b9d');
    const hmEl = document.getElementById('admin-heart-mode');
    const cwEl = document.getElementById('heart-custom-color-wrap');
    if (hmEl && cwEl) cwEl.style.display = (effects.heartMode === 'custom') ? 'block' : 'none';
    setInputVal('admin-autoplay', Storage.getData('musicAutoplay') || 'off');

    // Render admin lists
    renderAdminLists();

    // Render media grids
    renderMediaGrid('gallery');
    renderMediaGrid('videos');
  }

  function setInputVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  }

  function updateFontSizeLabel() {
    const range = document.getElementById('admin-font-size');
    const label = document.getElementById('admin-font-size-val');
    if (range && label) label.textContent = range.value + 'px';
  }

  function showPreview(id, src, label) {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
    }
  }

  // --- Names ---
  function setupNamesHandlers() {
    document.getElementById('save-names').addEventListener('click', () => {
      const names = Storage.getData('names');
      names.boy = document.getElementById('admin-boy-name').value.trim();
      names.girl = document.getElementById('admin-girl-name').value.trim();
      names.tagline = document.getElementById('admin-tagline').value.trim();
      names.footerMessage = document.getElementById('admin-footer-message').value.trim();
      Storage.setData('names', names);
      Sections.renderAll();
      showNotification('Names saved!');
    });
  }

  // --- Photos ---
  function setupPhotoHandlers() {
    setupPhotoUpload('admin-boy-photo-input', 'admin-boy-photo-preview', 'boy');
    setupPhotoUpload('admin-girl-photo-input', 'admin-girl-photo-preview', 'girl');
    setupPhotoUpload('admin-cover-input', 'admin-cover-preview', 'cover');
  }

  function setupPhotoUpload(inputId, previewId, key) {
    document.getElementById(inputId).addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const dataUrl = await Storage.fileToBase64(file);
      const photos = Storage.getData('photos');
      if (typeof Cloud !== 'undefined' && Cloud.isEnabled() && Cloud.storePhoto) {
        photos[key] = await Cloud.storePhoto(dataUrl);
      } else {
        photos[key] = dataUrl;
      }
      Storage.setData('photos', photos);
      showPreview(previewId, photos[key], key);
      Sections.renderAll();
      showNotification('Photo updated!');
    });
  }

  // --- Content ---
  function setupContentHandlers() {
    document.getElementById('save-content').addEventListener('click', () => {
      const about = Storage.getData('about');
      about.boy = document.getElementById('admin-boy-about').value.trim();
      about.girl = document.getElementById('admin-girl-about').value.trim();
      Storage.setData('about', about);

      const content = Storage.getData('content');
      content.loveStory = document.getElementById('admin-love-story').value;
      content.giftMessage = document.getElementById('admin-gift-message').value.trim();
      content.surpriseMessages = document.getElementById('admin-surprise-messages').value;
      content.dreamGoals = document.getElementById('admin-dream-goals').value;
      Storage.setData('content', content);

      Sections.renderAll();
      showNotification('Content saved!');
    });
  }

  // --- Dates ---
  function setupDatesHandlers() {
    document.getElementById('save-dates').addEventListener('click', () => {
      const dates = {
        anniversary: document.getElementById('admin-anniversary').value,
        boyBirthday: document.getElementById('admin-boy-birthday').value,
        girlBirthday: document.getElementById('admin-girl-birthday').value,
        countdownDate: document.getElementById('admin-countdown-date').value,
        countdownLabel: document.getElementById('admin-countdown-label').value.trim()
      };
      Storage.setData('dates', dates);
      Sections.renderAll();
      showNotification('Dates saved!');
    });
  }

  // --- Media ---
  function setupMediaHandlers() {
    // Gallery
    document.getElementById('admin-gallery-input').addEventListener('change', async (e) => {
      for (const file of e.target.files) {
        await Storage.addMediaFile('gallery', file);
      }
      renderMediaGrid('gallery');
      Sections.renderAll();
      showNotification('Gallery photos added!');
    });

    // Videos
    document.getElementById('admin-videos-input').addEventListener('change', async (e) => {
      for (const file of e.target.files) {
        // Videos go to IndexedDB now (no ~5MB localStorage limit), but huge files can still fail
        if (file.size > 150 * 1024 * 1024) {
          if (!confirm('Video "' + file.name + '" is ' + Math.round(file.size / 1024 / 1024) + 'MB. Very large videos may not save on all devices. Continue?')) {
            continue;
          }
        }
        try {
          await Storage.addMediaFile('videos', file);
        } catch (err) {
          showNotification('Could not save "' + file.name + '" - storage full!');
          break;
        }
      }
      renderMediaGrid('videos');
      Sections.renderAll();
      showNotification('Videos added!');
    });

    // Autoplay
    const autoplayEl = document.getElementById('admin-autoplay');
    if (autoplayEl) {
      autoplayEl.addEventListener('change', (e) => {
        Storage.setData('musicAutoplay', e.target.value);
      });
    }
  }

  async function renderMediaGrid(section) {
    const items = Storage.getArray(section);
    const container = document.getElementById('admin-' + section + '-list');
    if (!container) return;

    if (section === 'music') {
      container.innerHTML = items.map(m => `
        <div class="admin-media-thumb" style="aspect-ratio:auto;padding:8px;background:var(--bg-card);border-radius:8px;font-size:0.75rem;">
          <span style="color:var(--text-muted)">${escapeHTML(m.title || m.name)}</span>
          <button class="remove-media" onclick="Customizer.removeMedia('${section}','${m.id}')">&times;</button>
        </div>
      `).join('');
    } else {
      const urls = {};
      await Promise.all(items.map(async item => {
        if (item.url) {
          urls[item.id] = item.url;
        } else if (item.blobId) {
          try { urls[item.id] = await Storage.getMediaUrl(item); } catch (e) {}
        } else if (item.data) {
          urls[item.id] = item.data;
        }
      }));
      container.innerHTML = items.map(item => `
        <div class="admin-media-thumb">
          ${section === 'gallery' ? `<img src="${urls[item.id] || ''}">` : `<div style="background:var(--bg-card);width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">&#127909;</div>`}
          <button class="remove-media" onclick="Customizer.removeMedia('${section}','${item.id}')">&times;</button>
        </div>
      `).join('');
    }
  }

  function removeMedia(section, id) {
    if (section === 'gallery' || section === 'videos') {
      Storage.removeMediaItem(section, id).then(() => {
        renderMediaGrid(section);
        Sections.renderAll();
        showNotification('Removed!');
      });
      return;
    }
    Storage.removeItem(section, id);
    renderMediaGrid(section);
    Sections.renderAll();
    showNotification('Removed!');
  }

  // --- Style ---
  function setupStyleHandlers() {
    document.getElementById('admin-font-size').addEventListener('input', updateFontSizeLabel);

    document.getElementById('save-style').addEventListener('click', () => {
      const style = {
        theme: document.getElementById('admin-theme').value,
        primaryColor: document.getElementById('admin-primary-color').value,
        secondaryColor: document.getElementById('admin-secondary-color').value,
        bgColor: document.getElementById('admin-bg-color').value,
        textColor: document.getElementById('admin-text-color').value,
        font: document.getElementById('admin-font').value,
        headingFont: document.getElementById('admin-heading-font').value,
        sky: document.getElementById('admin-sky').value,
        particleColor: document.getElementById('admin-particle-color').value,
        fontSize: parseInt(document.getElementById('admin-font-size').value)
      };
      Storage.setData('style', style);
      applyStyles(style);
      showNotification('Style saved!');
    });

    // Love background theme change (live)
    const loveThemeSelect = document.getElementById('admin-love-theme');
    if (loveThemeSelect) {
      loveThemeSelect.addEventListener('change', () => {
        applyLoveTheme(loveThemeSelect.value);
      });
    }

    // Live preview on change
    ['admin-primary-color', 'admin-secondary-color', 'admin-bg-color', 'admin-text-color'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        applyCurrentStyle();
      });
    });
  }

  function applyCurrentStyle() {
    const style = {
      primaryColor: document.getElementById('admin-primary-color').value,
      secondaryColor: document.getElementById('admin-secondary-color').value,
      bgColor: document.getElementById('admin-bg-color').value,
      textColor: document.getElementById('admin-text-color').value,
      font: document.getElementById('admin-font').value,
      headingFont: document.getElementById('admin-heading-font').value,
      fontSize: parseInt(document.getElementById('admin-font-size').value)
    };
    applyStyles(style);
  }

  function applyStyles(style) {
    const root = document.documentElement;
    if (style.primaryColor) root.style.setProperty('--primary', style.primaryColor);
    if (style.secondaryColor) root.style.setProperty('--secondary', style.secondaryColor);
    if (style.bgColor) root.style.setProperty('--bg-dark', style.bgColor);
    if (style.textColor) root.style.setProperty('--text', style.textColor);
    if (style.font) root.style.setProperty('--font-body', style.font);
    if (style.headingFont) root.style.setProperty('--font-heading', style.headingFont);
    if (style.fontSize) root.style.setProperty('--font-size-base', style.fontSize + 'px');
    if (style.primaryColor) root.style.setProperty('--glow', style.primaryColor + '66');

    // Theme
    if (style.theme && style.theme !== 'custom') {
      document.documentElement.setAttribute('data-theme', style.theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  // --- Apply Love Background Theme ---
  function applyLoveTheme(id) {
    const themes = Storage.loveThemes;
    const theme = themes.find(t => t.id === id) || themes[0];
    if (!theme) return;

    // Save selection
    Storage.setData('loveTheme', theme.id);

    // Apply CSS
    const root = document.documentElement;
    if (theme.css) {
      root.style.setProperty('--primary', theme.css.primary);
      root.style.setProperty('--secondary', theme.css.secondary);
      root.style.setProperty('--bg-dark', theme.css.bg);
      root.style.setProperty('--bg-section', shadeColor(theme.css.bg, -10));
      root.style.setProperty('--glow', theme.css.primary + '66');
    }
    root.removeAttribute('data-theme');

    // Apply 3D scene
    Scene3D.applyLoveTheme(theme);

    // Update UI
    updateThemeSwitcherUI(theme.id);
    showNotification('Background changed to ' + theme.name + '!');
  }

  function shadeColor(hex, percent) {
    if (!hex) return hex;
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00ff) + percent;
    let b = (num & 0x0000ff) + percent;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  // --- Floating Theme Switcher ---
  function setupThemeSwitcher() {
    const btn = document.getElementById('theme-switch-btn');
    const panel = document.getElementById('theme-switcher');
    if (!btn || !panel) return;

    // Build theme list
    const themes = Storage.loveThemes;
    panel.innerHTML = themes.map(t => `
      <button class="theme-swatch" data-theme-id="${t.id}" onclick="Customizer.applyLoveTheme('${t.id}')">
        <span class="swatch-circle" style="background:linear-gradient(135deg, ${t.css.primary}, ${t.css.secondary})"></span>
        <span class="swatch-name">${t.name}</span>
      </button>
    `).join('');

    btn.onclick = () => {
      panel.classList.toggle('open');
    };

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!btn.contains(e.target) && !panel.contains(e.target)) {
        panel.classList.remove('open');
      }
    });

    // Set current active
    const current = Storage.getData('loveTheme') || 'rose';
    updateThemeSwitcherUI(current);
  }

  function updateThemeSwitcherUI(id) {
    document.querySelectorAll('.theme-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.themeId === id);
    });
  }

  // --- Effects ---
  function setupEffectsHandlers() {
    document.getElementById('save-effects').addEventListener('click', () => {
      const effects = {};
      document.querySelectorAll('[id^="eff-"]').forEach(el => {
        const key = el.id.replace('eff-', '');
        effects[key] = el.type === 'checkbox' ? el.checked : el.value;
      });
      effects.animSpeed = document.getElementById('admin-anim-speed').value;
      effects.camera = document.getElementById('admin-camera').value;
      effects.heartMode = document.getElementById('admin-heart-mode').value;
      effects.heartCustomColor = document.getElementById('admin-heart-custom-color').value;
      Storage.setData('effects', effects);
      Scene3D.applyEffects(effects);
      showNotification('Effects saved!');
    });

    // Show/hide custom color picker based on heart mode
    const heartModeEl = document.getElementById('admin-heart-mode');
    const customWrap = document.getElementById('heart-custom-color-wrap');
    if (heartModeEl) {
      heartModeEl.addEventListener('change', () => {
        if (customWrap) customWrap.style.display = heartModeEl.value === 'custom' ? 'block' : 'none';
      });
    }
  }

  // --- Floating Heart Color Switcher ---
  function setupHeartColorSwitcher() {
    const btn = document.getElementById('heart-color-btn');
    const panel = document.getElementById('heart-color-switcher');
    if (!btn || !panel) return;

    const effects = Storage.getData('effects');
    let mode = effects.heartMode || 'theme';

    function updateUI() {
      document.querySelectorAll('.heart-mode-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.heartMode === mode);
      });
      const row = panel.querySelector('.heart-custom-row');
      if (row) row.style.display = mode === 'custom' ? 'block' : 'none';
    }

    btn.onclick = (e) => {
      e.stopPropagation();
      panel.classList.toggle('open');
    };

    panel.querySelectorAll('.heart-mode-btn').forEach(b => {
      b.onclick = () => {
        mode = b.dataset.heartMode;
        applyHeartMode(mode);
        updateUI();
      };
    });

    const picker = document.getElementById('heart-color-picker');
    if (picker) {
      picker.oninput = () => {
        if (mode === 'custom') applyHeartMode('custom', picker.value);
      };
    }

    document.addEventListener('click', (e) => {
      if (!btn.contains(e.target) && !panel.contains(e.target)) {
        panel.classList.remove('open');
      }
    });

    updateUI();
  }

  function applyHeartMode(mode, color) {
    const effects = Storage.getData('effects');
    effects.heartMode = mode;
    if (color) effects.heartCustomColor = color;
    Storage.setData('effects', effects);
    Scene3D.applyEffects(effects);
    if (typeof HeartParticles !== 'undefined') {
      HeartParticles.applyMode(mode, color || effects.heartCustomColor);
    }
    // Sync the admin panel select too
    const sel = document.getElementById('admin-heart-mode');
    if (sel) sel.value = mode;
    const cw = document.getElementById('heart-custom-color-wrap');
    if (cw) cw.style.display = mode === 'custom' ? 'block' : 'none';
  }

  // --- Cloud (Firebase) handlers ---
  function setupCloudHandlers() {
    const statusEl = document.getElementById('cloud-status');
    const idEl = document.getElementById('cloud-couple-id');
    const noId = document.getElementById('cloud-no-id');
    const hasId = document.getElementById('cloud-has-id');
    const warn = document.getElementById('cloud-setup-warning');
    const navBtn = document.getElementById('cloud-nav-btn');

    function openCloudTab() {
      const panel = document.getElementById('admin-panel');
      if (panel && !panel.classList.contains('open')) {
        document.getElementById('admin-toggle').click();
      }
      const cloudTab = document.querySelector('.admin-tab[data-tab="cloud"]');
      if (cloudTab) cloudTab.click();
    }
    if (navBtn) navBtn.addEventListener('click', openCloudTab);

    function render(status, coupleId) {
      const enabled = Cloud.isEnabled();
      if (!enabled && status === 'local') {
        let msg = 'Local mode - Firebase config not set. Create a free Firebase project and paste your config into js/firebase-config.js';
        let errMsg = null;
        try { errMsg = Cloud.getLastError ? Cloud.getLastError() : null; } catch (e) {}
        if (errMsg) {
          msg = 'Cloud error: ' + errMsg;
          if (statusEl) statusEl.style.color = '#ff6b6b';
        }
        if (statusEl) statusEl.textContent = msg;
        if (warn) warn.style.display = 'block';
        if (idEl) idEl.value = '';
        if (noId) noId.style.display = 'none';
        if (hasId) hasId.style.display = 'none';
        if (navBtn) navBtn.style.opacity = '0.5';
        return;
      }
      if (warn) warn.style.display = 'none';
      const cid = coupleId || Cloud.getCoupleId();
      if (idEl) idEl.value = cid || '';
      if (noId) noId.style.display = cid ? 'none' : 'block';
      if (hasId) hasId.style.display = cid ? 'block' : 'none';
      if (navBtn) navBtn.style.opacity = '1';
      const linkEl = document.getElementById('cloud-invite-link');
      if (linkEl) {
        linkEl.value = cid ? (location.origin + location.pathname + '?c=' + cid) : '';
      }
      if (statusEl) {
        if (status === 'loading') {
          statusEl.textContent = 'Connecting to Firebase cloud...';
        } else if (cid) {
          statusEl.textContent = 'Cloud sync ACTIVE - Couple ID: ' + cid + '. Sab changes dono devices par turant dikhte hain.';
        } else {
          statusEl.textContent = 'Cloud ready. Create a couple or connect with your partner.';
        }
      }
    }

    Cloud.onStatus(render);

    document.getElementById('cloud-create-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('cloud-create-btn');
      btn.disabled = true;
      btn.textContent = 'Creating...';
      try {
        const id = await Cloud.createCouple();
        render();
        if (id) Sections.showToast('Couple created! ID: ' + id);
      } catch (e) {
        Sections.showToast('Failed: ' + (e && e.message ? e.message : 'check internet & Firebase setup'));
      }
      btn.disabled = false;
      btn.textContent = 'Create My Couple';
    });

    document.getElementById('cloud-join-btn')?.addEventListener('click', async () => {
      const input = document.getElementById('cloud-join-input');
      const btn = document.getElementById('cloud-join-btn');
      const code = input.value.trim();
      if (!code) { Sections.showToast('Enter the partner Couple ID first'); return; }
      btn.disabled = true;
      btn.textContent = 'Connecting...';
      try {
        const ok = await Cloud.joinCouple(code);
        render();
        if (ok) Sections.showToast('Connected! Syncing with ' + code);
        else Sections.showToast('Couple ID not found. Double-check it.');
      } catch (e) {
        Sections.showToast('Failed: ' + (e && e.message ? e.message : 'check internet & Firebase setup'));
      }
      btn.disabled = false;
      btn.textContent = 'Connect to Partner';
    });

    document.getElementById('cloud-copy-btn')?.addEventListener('click', () => {
      const id = Cloud.getCoupleId();
      if (!id) { Sections.showToast('Create a couple first'); return; }
      const copy = function (text, msg) {
        const fallback = function (t) {
          const ta = document.createElement('textarea');
          ta.value = t;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); Sections.showToast(msg); } catch (e) {}
          document.body.removeChild(ta);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => Sections.showToast(msg)).catch(() => fallback(text));
        } else fallback(text);
      };
      copy(id, 'Couple ID copied: ' + id);
    });

    document.getElementById('cloud-invite-btn')?.addEventListener('click', () => {
      const linkEl = document.getElementById('cloud-invite-link');
      if (!linkEl || !linkEl.value) { Sections.showToast('Create a couple first'); return; }
      const fallback = function (t) {
        const ta = document.createElement('textarea');
        ta.value = t;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); Sections.showToast('Invite link copied! Partner ko bhejo.'); } catch (e) {}
        document.body.removeChild(ta);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(linkEl.value).then(() => Sections.showToast('Invite link copied! Partner ko bhejo.')).catch(() => fallback(linkEl.value));
      } else fallback(linkEl.value);
    });

    document.getElementById('cloud-disconnect-btn')?.addEventListener('click', () => {
      Cloud.disconnect();
      render();
      Sections.showToast('Cloud disconnected. Data is safe in the cloud.');
    });
  }

  // --- Export / Import ---
  function setupExportImport() {
    document.getElementById('export-data').addEventListener('click', () => {
      Storage.exportJSON();
      showNotification('Data exported!');
    });

    document.getElementById('import-data-btn').addEventListener('click', () => {
      document.getElementById('import-data-input').click();
    });

    document.getElementById('import-data-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await Storage.importJSON(file);
        populateAllFields();
        Sections.renderAll();
        const style = Storage.getData('style');
        applyStyles(style);
        const effects = Storage.getData('effects');
        Scene3D.applyEffects(effects);
        showNotification('Data imported!');
      } catch (err) {
        showNotification('Import failed: ' + err.message);
      }
    });

    document.getElementById('reset-all-data').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset ALL data? This cannot be undone.')) {
        Storage.resetAll();
        populateAllFields();
        Sections.renderAll();
        location.reload();
      }
    });
  }

  // --- Dynamic Lists (Letters, Paragraphs, Memories, Secrets, Timeline, Quotes, Wishes) ---
  function setupDynamicLists() {
    // Love Letters
    document.getElementById('admin-add-letter').addEventListener('click', () => {
      const letter = { from: 'Him', body: '', date: new Date().toISOString().slice(0, 10) };
      showEditModal('Love Letter', letter, (data) => {
        Storage.addItem('loveLetters', data);
        renderAdminLists();
        Sections.renderAll();
      });
    });

    // Paragraphs
    document.getElementById('admin-add-paragraph').addEventListener('click', () => {
      const para = { text: '' };
      showEditModal('Paragraph', para, (data) => {
        Storage.addItem('paragraphs', data);
        renderAdminLists();
        Sections.renderAll();
      });
    });

    // Memories
    document.getElementById('admin-add-memory').addEventListener('click', () => {
      const mem = { title: '', text: '', icon: '&#10084;', date: '' };
      showEditModal('Memory', mem, (data) => {
        Storage.addItem('memories', data);
        renderAdminLists();
        Sections.renderAll();
      });
    });

    // Secrets
    document.getElementById('admin-add-secret').addEventListener('click', () => {
      Sections.askSecretPassword(() => {
        const sec = { from: 'Anonymous', text: '' };
        showEditModal('Secret Message', sec, (data) => {
          Storage.addItem('secrets', data);
          renderAdminLists();
          Sections.renderAll();
        });
      });
    });

    // Timeline
    document.getElementById('admin-add-timeline').addEventListener('click', () => {
      const ev = { title: '', desc: '', date: '' };
      showEditModal('Timeline Event', ev, (data) => {
        Storage.addItem('timeline', data);
        renderAdminLists();
        Sections.renderAll();
      });
    });

    // Quotes
    document.getElementById('admin-add-quote').addEventListener('click', () => {
      const q = { text: '', author: '' };
      showEditModal('Quote', q, (data) => {
        Storage.addItem('quotes', data);
        renderAdminLists();
        Sections.renderAll();
      });
    });

    // Wishes
    document.getElementById('admin-add-wish').addEventListener('click', () => {
      const w = { text: '' };
      showEditModal('Wish', w, (data) => {
        Storage.addItem('wishes', data);
        renderAdminLists();
        Sections.renderAll();
      });
    });

    // Section add buttons
    document.getElementById('add-timeline-event')?.addEventListener('click', () => {
      document.getElementById('admin-toggle').click();
    });
    document.getElementById('add-gallery-photo')?.addEventListener('click', () => {
      document.getElementById('admin-toggle').click();
      document.querySelector('[data-tab="media"]').click();
    });
    document.getElementById('add-video')?.addEventListener('click', () => {
      document.getElementById('admin-toggle').click();
      document.querySelector('[data-tab="media"]').click();
    });
    document.getElementById('add-letter')?.addEventListener('click', () => {
      document.getElementById('admin-toggle').click();
    });
    document.getElementById('add-paragraph')?.addEventListener('click', () => {
      document.getElementById('admin-toggle').click();
    });
    document.getElementById('add-memory')?.addEventListener('click', () => {
      document.getElementById('admin-toggle').click();
    });
    document.getElementById('add-secret')?.addEventListener('click', () => {
      document.getElementById('admin-toggle').click();
    });
    document.getElementById('add-quote')?.addEventListener('click', () => {
      document.getElementById('admin-toggle').click();
    });

    // Wish wall add
    document.getElementById('add-wish-btn')?.addEventListener('click', () => {
      const input = document.getElementById('wish-input');
      if (input.value.trim()) {
        Storage.addItem('wishes', { text: input.value.trim() });
        input.value = '';
        Sections.renderWishes();
        renderAdminLists();
      }
    });

    // Visitor book add
    const visitorBtn = document.getElementById('add-visitor-btn');
    if (visitorBtn) {
      visitorBtn.addEventListener('click', () => {
        const name = document.getElementById('visitor-name').value.trim();
        const msg = document.getElementById('visitor-message').value.trim();
        if (msg) {
          Storage.addItem('visitors', {
            name: name || 'Anonymous',
            message: msg,
            date: new Date().toISOString()
          });
          document.getElementById('visitor-name').value = '';
          document.getElementById('visitor-message').value = '';
          Sections.renderVisitors();
        }
      });
    }
  }

  function renderAdminLists() {
    renderAdminList('admin-letters-list', 'loveLetters', l => l.body || 'Empty letter');
    renderAdminList('admin-paragraphs-list', 'paragraphs', p => p.text || 'Empty paragraph');
    renderAdminList('admin-memories-list', 'memories', m => m.title || 'Untitled memory');
    renderAdminList('admin-secrets-list', 'secrets', s => s.text || 'Empty secret');
    renderAdminList('admin-timeline-list', 'timeline', t => t.title || 'Untitled event');
    renderAdminList('admin-quotes-list', 'quotes', q => q.text || 'Empty quote');
    renderAdminList('admin-wishes-list', 'wishes', w => w.text || 'Empty wish');
  }

  function renderAdminList(containerId, section, labelFn) {
    const container = document.getElementById(containerId);
    const items = Storage.getArray(section);
    container.innerHTML = items.map(item => `
      <div class="admin-list-item">
        <span class="admin-list-item-text">${escapeHTML(labelFn(item))}</span>
        <div class="admin-list-item-actions">
          <button class="admin-list-item-btn edit" onclick="Customizer.editItem('${section}','${item.id}')">Edit</button>
          <button class="admin-list-item-btn delete" onclick="Customizer.deleteItem('${section}','${item.id}')">Del</button>
        </div>
      </div>
    `).join('');
  }

  function editItem(section, id) {
    const items = Storage.getArray(section);
    const item = items.find(i => i.id === id);
    if (!item) return;

    showEditModal('Edit ' + section, { ...item }, (data) => {
      Storage.updateItem(section, id, data);
      renderAdminLists();
      Sections.renderAll();
    });
  }

  function deleteItem(section, id) {
    if (confirm('Delete this item?')) {
      Storage.removeItem(section, id);
      renderAdminLists();
      Sections.renderAll();
    }
  }

  // --- Edit Modal ---
  function showEditModal(title, data, onSave) {
    // Remove existing modal
    const existing = document.getElementById('edit-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'edit-modal';
    modal.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:rgba(0,0,0,0.8);
      display:flex;align-items:center;justify-content:center;
      padding:20px;
    `;

    let fieldsHTML = '';
    const skipFields = ['id'];

    Object.keys(data).forEach(key => {
      if (skipFields.includes(key)) return;
      const val = data[key];

      if (key === 'date') {
        fieldsHTML += `
          <div style="margin-bottom:12px">
            <label style="display:block;font-size:0.8rem;color:#aaa;margin-bottom:4px;text-transform:uppercase">${key}</label>
            <input type="date" id="modal-${key}" value="${val || ''}" style="width:100%;padding:10px;background:rgba(255,255,255,0.05);border:2px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:0.9rem">
          </div>
        `;
      } else if (typeof val === 'string' && val.length > 60) {
        fieldsHTML += `
          <div style="margin-bottom:12px">
            <label style="display:block;font-size:0.8rem;color:#aaa;margin-bottom:4px;text-transform:uppercase">${key}</label>
            <textarea id="modal-${key}" style="width:100%;padding:10px;background:rgba(255,255,255,0.05);border:2px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:0.9rem;min-height:80px">${val || ''}</textarea>
          </div>
        `;
      } else {
        fieldsHTML += `
          <div style="margin-bottom:12px">
            <label style="display:block;font-size:0.8rem;color:#aaa;margin-bottom:4px;text-transform:uppercase">${key}</label>
            <input type="text" id="modal-${key}" value="${escapeHTML(val || '')}" style="width:100%;padding:10px;background:rgba(255,255,255,0.05);border:2px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-size:0.9rem">
          </div>
        `;
      }
    });

    modal.innerHTML = `
      <div style="background:#1a1a2e;border-radius:16px;padding:30px;max-width:500px;width:100%;max-height:80vh;overflow-y:auto;border:1px solid rgba(255,255,255,0.1)">
        <h3 style="font-family:'Great Vibes',cursive;color:var(--primary);margin-bottom:20px;font-size:1.5rem">${title}</h3>
        ${fieldsHTML}
        <div style="display:flex;gap:10px;margin-top:20px">
          <button id="modal-save" style="flex:1;padding:12px;background:linear-gradient(135deg,var(--primary),var(--secondary));color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer">Save</button>
          <button id="modal-cancel" style="flex:1;padding:12px;background:rgba(255,255,255,0.1);color:#fff;border:none;border-radius:8px;cursor:pointer">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('modal-cancel').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    document.getElementById('modal-save').onclick = () => {
      const result = {};
      Object.keys(data).forEach(key => {
        if (skipFields.includes(key)) return;
        const el = document.getElementById('modal-' + key);
        if (!el) return;
        if (key === 'answer') {
          result[key] = parseInt(el.value) || 0;
        } else {
          result[key] = el.value;
        }
      });
      onSave(result);
      modal.remove();
    };
  }

  // --- Helpers ---
  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showNotification(msg) {
    const existing = document.getElementById('notif');
    if (existing) existing.remove();

    const notif = document.createElement('div');
    notif.id = 'notif';
    notif.textContent = msg;
    notif.style.cssText = `
      position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
      padding:12px 24px;background:linear-gradient(135deg,var(--primary),var(--secondary));
      color:#fff;border-radius:50px;font-size:0.9rem;font-weight:600;z-index:99999;
      box-shadow:0 5px 30px rgba(0,0,0,0.3);
      animation:fadeInUp 0.3s ease;
    `;
    document.body.appendChild(notif);
    setTimeout(() => { notif.style.opacity = '0'; notif.style.transition = '0.3s'; }, 2000);
    setTimeout(() => notif.remove(), 2500);
  }

  // --- Public ---
  return {
    init, populateAllFields, applyStyles, applyLoveTheme, setupThemeSwitcher,
    removeMedia, editItem, deleteItem, renderAdminLists
  };
})();
