/* ============================================
   STORAGE MODULE - LocalStorage + Cloud (Firebase)
   --------------------------------------------
   Primary source is Firebase Firestore when the cloud is enabled.
   localStorage acts as an offline cache / fallback.
   ============================================ */

const Storage = (() => {
  const PREFIX = 'rw_';
  let cloudEnabled = false;

  // --- IndexedDB for large media files (videos/images) ---
  // localStorage is limited to ~5MB, so real videos go here instead.
  const IDB_NAME = 'rw-media';
  const IDB_STORE = 'media';
  let _idbPromise = null;

  function idbOpen() {
    if (_idbPromise) return _idbPromise;
    _idbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('IndexedDB not supported')); return; }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return _idbPromise;
  }

  function idbSaveBlob(blob) {
    const id = 'm' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    return idbOpen().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(blob, id);
      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
    }));
  }

  function idbGetBlob(id) {
    return idbOpen().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    }));
  }

  function idbDeleteBlob(id) {
    return idbOpen().then(db => new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    }));
  }

  function idbGetObjectURL(id) {
    return idbGetBlob(id).then(blob => blob ? URL.createObjectURL(blob) : null);
  }

  // Get the raw Blob for a media item's IndexedDB id
  function getMediaBlob(blobId) {
    return idbGetBlob(blobId);
  }

  // Delete a blob from IndexedDB by id (used by sync/change flows)
  function removeMediaBlob(blobId) {
    return idbDeleteBlob(blobId);
  }

  // Convert an IndexedDB blob id into a data URL (for export/lightbox)
  function idbToDataUrl(id) {
    return idbGetBlob(id).then(blob => {
      if (!blob) return null;
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    });
  }

  // Default data structure
  const defaults = {
    names: {
      boy: 'Asif',
      girl: 'Shahjadi',
      tagline: 'Two souls, one heart',
      footerMessage: 'Made with love, for love'
    },
    photos: {
      boy: '',
      girl: '',
      cover: ''
    },
    about: {
      boy: 'A wonderful person who believes in love.',
      girl: 'A beautiful soul who makes every day special.'
    },
    dates: {
      anniversary: '',
      boyBirthday: '',
      girlBirthday: '',
      countdownDate: '',
      countdownLabel: 'Until our next special day'
    },
    content: {
      loveStory: '',
      giftMessage: 'You are my everything!',
      surpriseMessages: '',
      dreamGoals: ''
    },
    loveLetters: [],
    paragraphs: [],
    memories: [],
    secrets: [],
    timeline: [],
    quotes: [],
    wishes: [],
    gallery: [],
    videos: [],
    music: [],
    visitors: [],
    style: {
      theme: 'romantic',
      primaryColor: '#ff6b9d',
      secondaryColor: '#c44569',
      bgColor: '#1a0a2e',
      textColor: '#ffffff',
      font: "'Poppins', sans-serif",
      headingFont: "'Great Vibes', cursive",
      sky: 'night',
      particleColor: '#ff6b9d',
      fontSize: 16
    },
    effects: {
      stars: true,
      particles: true,
      fireflies: true,
      butterflies: false,
      lanterns: false,
      clouds: true,
      flowers: false,
      snow: false,
      rain: false,
      cherry: false,
      fireworks: false,
      aurora: false,
      moon: true,
      bloom: true,
      dof: false,
      confetti: false,
      animSpeed: 'normal',
      camera: 'auto',
      heartMode: 'theme',
      heartCustomColor: '#ff6b9d'
    },
    loveTheme: 'rose',
    musicAutoplay: 'off',
    secretLock: {
      passwordHash: '',
      pending: null
    }
  };

  // Love background themes (premium presets)
  const loveThemes = [
    { id: 'rose', name: '🌹 Rose Love', skyTop: '#1a0a2e', skyBottom: '#4a1a3e', heartColor: '#ff2d6d', particleColor: '#ff6b9d', css: { primary: '#ff6b9d', secondary: '#c44569', bg: '#1a0a2e' } },
    { id: 'cherry', name: '🌸 Cherry Blossom', skyTop: '#2a1020', skyBottom: '#7a3a5a', heartColor: '#ff7ba8', particleColor: '#ffb7c5', css: { primary: '#ff88aa', secondary: '#d4627a', bg: '#2a1020' } },
    { id: 'royal', name: '👑 Royal Purple', skyTop: '#140a2e', skyBottom: '#4a2a7a', heartColor: '#b388ff', particleColor: '#9c6bff', css: { primary: '#9c6bff', secondary: '#7c4dff', bg: '#140a2e' } },
    { id: 'golden', name: '✨ Golden Heart', skyTop: '#1a1200', skyBottom: '#4a3600', heartColor: '#ffd700', particleColor: '#ffd700', css: { primary: '#ffd700', secondary: '#ff8c00', bg: '#1a1200' } },
    { id: 'sunset', name: '🌅 Sunset Love', skyTop: '#2a0a20', skyBottom: '#ff6b3a', heartColor: '#ff5e62', particleColor: '#ff9a62', css: { primary: '#ff6b4a', secondary: '#e64a19', bg: '#2a0a20' } },
    { id: 'ocean', name: '🌊 Ocean Love', skyTop: '#001a2e', skyBottom: '#0a4a6a', heartColor: '#00d4ff', particleColor: '#00bcd4', css: { primary: '#00bcd4', secondary: '#0097a7', bg: '#001a2e' } },
    { id: 'lavender', name: '💜 Lavender Dream', skyTop: '#1a0a2e', skyBottom: '#6a4a9a', heartColor: '#d88bff', particleColor: '#b388ff', css: { primary: '#b388ff', secondary: '#8e5bd6', bg: '#1a0a2e' } },
    { id: 'midnight', name: '🌙 Midnight Stars', skyTop: '#050520', skyBottom: '#1a1a4a', heartColor: '#ff66cc', particleColor: '#ff88cc', css: { primary: '#7c4dff', secondary: '#536dfe', bg: '#0d0d2b' } },
    { id: 'emerald', name: '💚 Emerald Love', skyTop: '#0a1a0a', skyBottom: '#1a4a2a', heartColor: '#5dff9b', particleColor: '#4caf50', css: { primary: '#4caf50', secondary: '#2e7d32', bg: '#0a1a0a' } },
    { id: 'ruby', name: '❤️ Ruby Red', skyTop: '#2a0505', skyBottom: '#6a1010', heartColor: '#ff1a1a', particleColor: '#ff4444', css: { primary: '#ff4444', secondary: '#c62828', bg: '#2a0505' } },
    { id: 'galaxy', name: '🌌 Galaxy Love', skyTop: '#0a0520', skyBottom: '#3a1a6a', heartColor: '#66ccff', particleColor: '#b39aff', css: { primary: '#8a7bff', secondary: '#5a4ade', bg: '#0a0520' } }
  ];

  // --- Core read/write ---
  function setCloudEnabled(v) { cloudEnabled = v; }
  function isCloudEnabled() { return cloudEnabled; }

  function get(key) {
    // Cloud cache is the primary source when enabled
    if (cloudEnabled && typeof Cloud !== 'undefined' && Cloud.getCache) {
      const v = Cloud.getCache(key);
      if (v !== undefined) return v;
    }
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Storage read error:', key, e);
      return null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage write error:', key, e);
      // If quota exceeded, try to free space
      if (e.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded. Consider exporting and clearing old data.');
        window.dispatchEvent(new CustomEvent('storage-full', { detail: { key } }));
      }
      return false;
    }
    // Push every write to the cloud so the other device sees it instantly
    if (cloudEnabled && typeof Cloud !== 'undefined' && Cloud.pushSection) {
      Cloud.pushSection(key, value);
    }
    return true;
  }

  function remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  // --- Data accessors ---
  function getData(section) {
    const saved = get(section);
    if (!saved) return JSON.parse(JSON.stringify(defaults[section] || {}));
    return Object.assign({}, JSON.parse(JSON.stringify(defaults[section] || {})), saved);
  }

  function setData(section, value) {
    set(section, value);
    // Dispatch custom event for live updates
    window.dispatchEvent(new CustomEvent('storage-update', { detail: { section, value } }));
  }

  function getAllData() {
    const data = {};
    Object.keys(defaults).forEach(key => {
      data[key] = getData(key);
    });
    return data;
  }

  function setAllData(data) {
    Object.keys(data).forEach(key => {
      set(key, data[key]);
    });
    window.dispatchEvent(new CustomEvent('storage-update', { detail: { section: 'all', value: data } }));
  }

  // --- Array operations ---
  function getArray(section) {
    const data = get(section);
    return Array.isArray(data) ? data : [];
  }

  function addItem(section, item) {
    const arr = getArray(section);
    item.id = Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    arr.push(item);
    const ok = set(section, arr);
    window.dispatchEvent(new CustomEvent('storage-update', { detail: { section, value: arr } }));
    return ok ? item : null;
  }

  function updateItem(section, id, updates) {
    const arr = getArray(section);
    const idx = arr.findIndex(item => item.id === id);
    if (idx !== -1) {
      arr[idx] = { ...arr[idx], ...updates };
      set(section, arr);
      window.dispatchEvent(new CustomEvent('storage-update', { detail: { section, value: arr } }));
      return arr[idx];
    }
    return null;
  }

  function removeItem(section, id) {
    let arr = getArray(section);
    arr = arr.filter(item => item.id !== id);
    set(section, arr);
    window.dispatchEvent(new CustomEvent('storage-update', { detail: { section, value: arr } }));
    window.dispatchEvent(new CustomEvent('storage-removed', { detail: { section, id } }));
  }

  // --- Media helpers (store as base64 or object URLs) ---
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      // Compress images to save localStorage space (important on phones)
      if (file.type && file.type.startsWith('image/')) {
        compressImage(file).then(resolve).catch(() => {
          // Fallback to plain read
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Compress & resize images (max 1280px, JPEG quality 0.82)
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const MAX = 1280;
          let w = img.width;
          let h = img.height;
          if (w > MAX || h > MAX) {
            const ratio = Math.min(MAX / w, MAX / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          // Keep PNG transparent as PNG, else JPEG
          if (file.type === 'image/png') {
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          }
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Invalid image')); };
      img.src = url;
    });
  }

  async function addMediaFile(section, file, meta = {}) {
    // Cloud mode: upload to Firebase Storage (or Firestore media doc fallback)
    if (cloudEnabled && typeof Cloud !== 'undefined' && Cloud.addMediaItem) {
      const item = await Cloud.addMediaItem(section, file, meta);
      if (item) return addItem(section, item);
      // null -> fall through to local storage (e.g. videos when no Storage bucket)
    }
    // Local mode: Images: compress then store the compressed blob in IndexedDB (no 5MB limit).
    // Videos & other files: store directly in IndexedDB (supports large sizes, keeps audio).
    if (file.type && file.type.startsWith('image/')) {
      const dataUrl = await fileToBase64(file);
      let blob;
      try {
        blob = dataUrlToBlob(dataUrl);
      } catch (e) {
        blob = file;
      }
      const blobId = await idbSaveBlob(blob);
      const item = {
        ...meta,
        name: file.name,
        type: blob.type || file.type,
        blobId: blobId,
        size: blob.size || file.size
      };
      return addItem(section, item);
    }
    const blobId = await idbSaveBlob(file);
    const item = {
      ...meta,
      name: file.name,
      type: file.type,
      blobId: blobId,
      size: file.size
    };
    return addItem(section, item);
  }

  // Convert a data URL string back to a Blob
  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream';
    const bstr = atob(parts[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
    return new Blob([u8arr], { type: mime });
  }

  // Get a displayable URL for a media item (cloud url, data URL or object URL from IndexedDB)
  async function getMediaUrl(item) {
    if (!item) return null;
    if (item.url) return item.url;
    if (item.data) return item.data;
    if (item.mediaId && cloudEnabled && typeof Cloud !== 'undefined' && Cloud.getMedia) {
      return Cloud.getMedia(item.mediaId);
    }
    if (item.blobId) return idbGetObjectURL(item.blobId);
    return null;
  }

  // Get a permanent data URL for a media item (used by export/lightbox)
  async function getMediaDataUrl(item) {
    if (!item) return null;
    if (item.data) return item.data;
    if (item.url) {
      try {
        const res = await fetch(item.url);
        const blob = await res.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch (e) { return null; }
    }
    if (item.blobId) return idbToDataUrl(item.blobId);
    return null;
  }

  async function removeMediaItem(section, id) {
    // Cloud mode: also delete the file from Firebase Storage / Firestore media doc
    if (cloudEnabled && typeof Cloud !== 'undefined' && Cloud.deleteMediaFile) {
      const arr = getArray(section);
      const item = arr.find(i => i.id === id);
      if (item) {
        if (item.url && !item.external) {
          try { await Cloud.deleteMediaFile(section, item.id); } catch (e) {}
        } else if (item.mediaId && Cloud.deleteMedia) {
          try { await Cloud.deleteMedia(item.mediaId); } catch (e) {}
        }
      }
    } else {
      const arr = getArray(section);
      const item = arr.find(i => i.id === id);
      if (item && item.blobId) {
        try { await idbDeleteBlob(item.blobId); } catch (e) {}
      }
    }
    removeItem(section, id);
  }

  // Replace an existing media item's file (photo/video) in place
  async function replaceMediaFile(section, id, file) {
    const arr = getArray(section);
    const idx = arr.findIndex(i => i.id === id);
    if (idx === -1) return null;
    const old = arr[idx];

    // Cloud mode: upload replacement, delete the old file
    if (cloudEnabled && typeof Cloud !== 'undefined' && Cloud.addMediaItem && Cloud.deleteMediaFile) {
      const nu = await Cloud.addMediaItem(section, file, {});
      if (nu) {
        if (old.url && !old.external) {
          try { await Cloud.deleteMediaFile(section, old.id); } catch (e) {}
        } else if (old.mediaId && Cloud.deleteMedia) {
          try { await Cloud.deleteMedia(old.mediaId); } catch (e) {}
        }
        const updated = { ...old, name: nu.name, type: nu.type, size: nu.size };
        delete updated.blobId;
        delete updated.url;
        delete updated.mediaId;
        if (nu.url) updated.url = nu.url;
        if (nu.mediaId) updated.mediaId = nu.mediaId;
        arr[idx] = updated;
        const ok = set(section, arr);
        window.dispatchEvent(new CustomEvent('storage-update', { detail: { section, value: arr } }));
        return ok ? updated : null;
      }
      // nu == null -> fall through to local replacement (video without Storage)
    }

    if (old.blobId) {
      try { await idbDeleteBlob(old.blobId); } catch (e) {}
    }
    let blobId, name, type, size;
    if (file.type && file.type.startsWith('image/')) {
      const dataUrl = await fileToBase64(file);
      let blob;
      try { blob = dataUrlToBlob(dataUrl); } catch (e) { blob = file; }
      blobId = await idbSaveBlob(blob);
      name = file.name;
      type = blob.type || file.type;
      size = blob.size || file.size;
    } else {
      blobId = await idbSaveBlob(file);
      name = file.name;
      type = file.type;
      size = file.size;
    }
    const updated = { ...old, blobId, name, type, size };
    delete updated.data;
    arr[idx] = updated;
    const ok = set(section, arr);
    window.dispatchEvent(new CustomEvent('storage-update', { detail: { section, value: arr } }));
    return ok ? updated : null;
  }

  // --- Export / Import ---
  async function exportJSON() {
    const data = getAllData();
    // Include IndexedDB media (videos) in the backup as data URLs
    const mediaSections = ['gallery', 'videos'];
    for (const sec of mediaSections) {
      const arr = Array.isArray(data[sec]) ? data[sec] : [];
      for (const item of arr) {
        if (item && item.blobId) {
          try {
            const url = await idbToDataUrl(item.blobId);
            if (url) {
              item.data = url;
              delete item.blobId;
            }
          } catch (e) {}
        }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'love-story-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          // Move media data URLs into IndexedDB to avoid localStorage quota limits
          for (const sec of ['gallery', 'videos']) {
            const arr = Array.isArray(data[sec]) ? data[sec] : [];
            for (const item of arr) {
              if (item && item.data && !item.blobId && !item.external && item.size > 50 * 1024) {
                try {
                  const res = await fetch(item.data);
                  const blob = await res.blob();
                  const blobId = await idbSaveBlob(blob);
                  item.blobId = blobId;
                  delete item.data;
                } catch (err) {
                  console.warn('Could not import media item', err);
                }
              }
            }
          }
          setAllData(data);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function resetAll() {
    Object.keys(defaults).forEach(key => {
      set(key, JSON.parse(JSON.stringify(defaults[key])));
    });
    window.dispatchEvent(new CustomEvent('storage-update', { detail: { section: 'all', value: defaults } }));
  }

  // --- Initialize defaults for missing keys ---
  function init() {
    Object.keys(defaults).forEach(key => {
      if (get(key) === null) {
        set(key, JSON.parse(JSON.stringify(defaults[key])));
      } else {
        // Migrate old data: fill empty values with defaults
        migrateEmptyValues(key, defaults[key], get(key));
      }
    });
  }

  function migrateEmptyValues(key, defaultVal, currentVal) {
    if (defaultVal && typeof defaultVal === 'object' && !Array.isArray(defaultVal)) {
      if (currentVal && typeof currentVal === 'object' && !Array.isArray(currentVal)) {
        let changed = false;
        Object.keys(defaultVal).forEach(subKey => {
          if ((currentVal[subKey] === '' || currentVal[subKey] === null || currentVal[subKey] === undefined)
              && defaultVal[subKey] !== '') {
            currentVal[subKey] = defaultVal[subKey];
            changed = true;
          }
        });
        if (changed) set(key, currentVal);
      }
    }
  }

  return {
    get, set, remove,
    setCloudEnabled, isCloudEnabled,
    getData, setData,
    getAllData, setAllData,
    getArray, addItem, updateItem, removeItem,
    addMediaFile, fileToBase64, dataUrlToBlob, getMediaUrl, getMediaDataUrl,
    getMediaBlob, removeMediaBlob, removeMediaItem, replaceMediaFile,
    idbSaveBlob,
    exportJSON, importJSON, resetAll, init,
    defaults, loveThemes
  };
})();

// Initialize on load
Storage.init();
