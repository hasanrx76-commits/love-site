/* ============================================
   CLOUD MODULE - Firebase Firestore + Storage
   Real-time sync between two devices using a Couple ID.
   --------------------------------------------
   Data structure in Firestore:

   couples/{coupleId}/                       (meta doc: createdAt, updatedAt)
   couples/{coupleId}/sections/{sectionKey}  { value: <names/photos/timeline/letters/...> }
   couples/{coupleId}/files/...              (Firebase Storage: photos & videos)

   Storage helper (js/storage.js) reads the latest value from the in-memory
   cloud cache, falls back to localStorage, and pushes every write to Firestore.
   Firestore offline persistence keeps the site working after a refresh.
   ============================================ */

const Cloud = (() => {
  let app = null;
  let db = null;
  let storage = null;
  let enabled = false;      // Firebase initialized OK
  let initialized = false;  // init() has been called
  let coupleId = null;
  let status = 'local';     // local | loading | synced | error
  let listeners = [];
  let cache = {};           // latest cloud values by section key
  let mediaCache = {};      // cached media data URLs by item id
  let storageOK = true;     // false once a Storage upload fails (bucket not set up / Blaze required)
  let statusCbs = [];
  let lastError = null;     // human-readable reason when init/cloud fails

  const COUPLE_KEY = 'rw_couple_id';

  // Sections that get their own Firestore document (same list as Storage defaults)
  const SECTION_KEYS = [
    'names', 'photos', 'about', 'dates', 'content',
    'loveLetters', 'paragraphs', 'memories', 'secrets', 'timeline',
    'quotes', 'wishes', 'gallery', 'videos', 'music', 'visitors',
    'style', 'effects', 'loveTheme', 'musicAutoplay', 'secretLock'
  ];

  const SDK_URLS = [
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js'
  ];

  // ------------------------------------------------------------
  // Status helpers
  // ------------------------------------------------------------
  function setStatus(s) {
    status = s;
    statusCbs.forEach(cb => { try { cb(s); } catch (e) {} });
    window.dispatchEvent(new CustomEvent('cloud-status', { detail: { status: s, coupleId } }));
  }

  function onStatus(cb) {
    statusCbs.push(cb);
    cb(status, coupleId);
    return () => {
      const i = statusCbs.indexOf(cb);
      if (i !== -1) statusCbs.splice(i, 1);
    };
  }

  function loadConfig() {
    if (typeof RW_FIREBASE_CONFIG !== 'undefined' && RW_FIREBASE_CONFIG
        && RW_FIREBASE_CONFIG.apiKey && RW_FIREBASE_CONFIG.projectId
        && RW_FIREBASE_CONFIG.apiKey.indexOf('YOUR_') !== 0
        && RW_FIREBASE_CONFIG.projectId.indexOf('YOUR_') !== 0) {
      return RW_FIREBASE_CONFIG;
    }
    return null;
  }

  // ------------------------------------------------------------
  // Lazy load the Firebase SDK (only when a real config is present)
  // ------------------------------------------------------------
  function loadSdk() {
    const ps = SDK_URLS.map(url => new Promise((resolve, reject) => {
      if (document.querySelector('script[data-fb="' + url + '"]')) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = url;
      s.dataset.fb = url;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Firebase SDK load failed: ' + url));
      document.head.appendChild(s);
    }));
    return Promise.all(ps);
  }

  // ------------------------------------------------------------
  // Init
  // ------------------------------------------------------------
  async function init() {
    if (initialized) return;
    initialized = true;

    const config = loadConfig();
    if (!config) {
      setStatus('local');
      return;
    }

    setStatus('loading');
    try {
      await loadSdk();
      if (!window.firebase || !window.firebase.initializeApp) {
        throw new Error('Firebase SDK failed to load (blocked or offline?)');
      }
      app = window.firebase.initializeApp(config);
      db = window.firebase.firestore(app);
      storage = window.firebase.storage(app);

      // Offline persistence: keeps working after refresh / on flaky internet.
      // (No synchronizeTabs - it can hang or fail on some mobile browsers,
      //  and multi-device sync already works through Firestore realtime.)
      try {
        await db.enablePersistence();
      } catch (err) {
        if (err.code !== 'failed-precondition') console.warn('Persistence:', err);
      }

      enabled = true;
      if (typeof Storage !== 'undefined' && Storage.setCloudEnabled) {
        Storage.setCloudEnabled(true);
      }

      coupleId = localStorage.getItem(COUPLE_KEY);
      if (coupleId) {
        startListeners();
        setStatus('synced');
      } else {
        setStatus('nosync');
      }
    } catch (err) {
      lastError = (err && err.message) ? err.message : String(err);
      console.warn('Firebase init failed:', err);
      enabled = false;
      setStatus('local');
    }
  }

  // ------------------------------------------------------------
  // Couple ID helpers
  // ------------------------------------------------------------
  function getCoupleId() { return coupleId; }

  function generateId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return 'LOVE-' + s;
  }

  // Create a brand new couple: push current local data up to the cloud
  async function createCouple() {
    if (!enabled || !db) return null;
    const id = generateId();
    coupleId = id;
    localStorage.setItem(COUPLE_KEY, id);
    const ref = db.collection('couples').doc(id);
    await ref.set({
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    const local = (typeof Storage !== 'undefined' && Storage.getAllData) ? Storage.getAllData() : {};
    for (const key of SECTION_KEYS) {
      const val = local[key] !== undefined ? local[key] : (typeof Storage !== 'undefined' && Storage.defaults ? Storage.defaults[key] : {});
      cache[key] = val;
      await ref.collection('sections').doc(key).set({ value: val }, { merge: true });
    }

    startListeners();
    setStatus('synced');
    return id;
  }

  // Join an existing couple (partner's Couple ID)
  async function joinCouple(id) {
    if (!enabled || !db) return false;
    const clean = String(id || '').trim().toUpperCase();
    if (!clean) return false;
    const ref = db.collection('couples').doc(clean);
    let exists = false;
    try {
      const snap = await ref.get();
      exists = snap.exists;
    } catch (e) {
      exists = false;
    }
    if (!exists) return false;

    coupleId = clean;
    localStorage.setItem(COUPLE_KEY, clean);
    startListeners();
    await mergeLocalToCloud();
    setStatus('synced');
    return true;
  }

  function disconnect() {
    listeners.forEach(un => { try { un(); } catch (e) {} });
    listeners = [];
    coupleId = null;
    localStorage.removeItem(COUPLE_KEY);
    cache = {};
    setStatus('nosync');
  }

  // Push local data up for sections that are empty on the cloud
  async function mergeLocalToCloud() {
    if (!enabled || !db || !coupleId) return;
    const local = (typeof Storage !== 'undefined' && Storage.getAllData) ? Storage.getAllData() : {};
    for (const key of SECTION_KEYS) {
      const snap = await db.collection('couples').doc(coupleId).collection('sections').doc(key).get();
      const cloudVal = snap.exists ? snap.data().value : undefined;
      const localVal = local[key];
      if (!isMeaningful(cloudVal) && isMeaningful(localVal)) {
        cache[key] = localVal;
        pushSection(key, localVal);
      } else if (cloudVal !== undefined) {
        cache[key] = cloudVal;
      }
    }
  }

  function isMeaningful(v) {
    if (v === undefined || v === null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') {
      return Object.keys(v).some(k => isMeaningful(v[k]));
    }
    return v !== '';
  }

  // ------------------------------------------------------------
  // Real-time listeners (changes appear on both devices instantly)
  // ------------------------------------------------------------
  function startListeners() {
    listeners.forEach(un => { try { un(); } catch (e) {} });
    listeners = [];
    if (!enabled || !db || !coupleId) return;

    const col = db.collection('couples').doc(coupleId).collection('sections');
    SECTION_KEYS.forEach(key => {
      const un = col.doc(key).onSnapshot(doc => {
        const value = doc.exists ? doc.data().value : undefined;
        cache[key] = value;
        if (value !== undefined) {
          try { localStorage.setItem('rw_' + key, JSON.stringify(value)); } catch (e) {}
        }
        // cloudSnapshot flag lets the UI re-render on remote changes only
        window.dispatchEvent(new CustomEvent('storage-update', {
          detail: { section: key, value, cloudSnapshot: true }
        }));
      }, err => console.warn('Cloud listener error [' + key + ']:', err));
      listeners.push(un);
    });
  }

  // ------------------------------------------------------------
  // Reads / writes used by Storage
  // ------------------------------------------------------------
  function isEnabled() { return enabled; }
  function hasCouple() { return enabled && !!coupleId; }

  function getCache(key) {
    if (cache[key] !== undefined) return cache[key];
    return undefined;
  }

  function pushSection(key, value) {
    if (!enabled || !db || !coupleId) return;
    cache[key] = value;
    db.collection('couples').doc(coupleId).collection('sections').doc(key)
      .set({ value }, { merge: true })
      .then(() => {
        db.collection('couples').doc(coupleId)
          .set({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      })
      .catch(err => console.warn('Cloud push failed [' + key + ']:', err));
  }

  // Upload a media blob to Firebase Storage, returns the item (with url).
  // When Firebase Storage is NOT available (Spark plan / bucket not set up),
  // images fall back to a separate Firestore "media" document so they still
  // sync across devices. Videos without Storage stay local-only.
  async function addMediaItem(section, file, meta) {
    if (!enabled || !db || !coupleId) return null;
    const id = 'm' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    const isImage = !!(file.type && file.type.startsWith('image/'));
    if (storage && storageOK) {
      try {
        let blob = file;
        if (isImage) {
          const dataUrl = await Storage.fileToBase64(file);
          blob = Storage.dataUrlToBlob(dataUrl);
        }
        const url = await uploadBlob(section, id, blob);
        return Object.assign({}, meta, {
          id,
          name: file.name,
          type: blob.type || file.type,
          size: blob.size || file.size,
          url: url
        });
      } catch (err) {
        console.warn('Storage upload failed, using Firestore media doc:', err);
        storageOK = false;
      }
    }
    if (isImage) {
      try {
        const dataUrl = await Storage.fileToBase64(file);
        await putMedia(id, dataUrl);
        return Object.assign({}, meta, {
          id,
          name: file.name,
          type: file.type,
          size: file.size,
          mediaId: id
        });
      } catch (err) {
        console.warn('Firestore media add failed:', err);
      }
    }
    return null;
  }

  async function uploadBlob(section, id, blob) {
    const ref = storage.ref('couples/' + coupleId + '/' + section + '/' + id);
    const snap = await ref.put(blob);
    return snap.ref.getDownloadURL();
  }

  // Store an image (data URL) in a Firestore media document
  async function putMedia(id, dataUrl) {
    mediaCache[id] = dataUrl;
    await db.collection('couples').doc(coupleId).collection('media').doc(id).set({ data: dataUrl });
  }

  // Fetch an image data URL from a Firestore media document (cached)
  async function getMedia(id) {
    if (mediaCache[id] !== undefined) return mediaCache[id];
    if (!enabled || !db || !coupleId) return null;
    try {
      const snap = await db.collection('couples').doc(coupleId).collection('media').doc(id).get();
      if (snap.exists && snap.data().data) {
        mediaCache[id] = snap.data().data;
        return mediaCache[id];
      }
    } catch (err) {
      console.warn('Media fetch failed:', id, err);
    }
    return null;
  }

  // Delete a Firestore media document
  async function deleteMedia(id) {
    if (!enabled || !db || !coupleId) return;
    delete mediaCache[id];
    try { await db.collection('couples').doc(coupleId).collection('media').doc(id).delete(); } catch (e) {}
  }

  async function deleteMediaFile(section, id) {
    if (!enabled || !db || !coupleId) return;
    if (storage) {
      try { await storage.ref('couples/' + coupleId + '/' + section + '/' + id).delete(); } catch (e) {}
    }
    await deleteMedia(id);
  }

  // Recompress a data URL to keep it small (used for profile photos when Storage is unavailable)
  function recompress(dataUrl, maxDim, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            const ratio = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  // Store a couple photo (data URL) in Firebase Storage, returns a URL
  async function storePhoto(dataUrl) {
    if (!enabled || !db || !coupleId) return dataUrl;
    if (storage && storageOK) {
      try {
        const id = 'p' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
        const blob = Storage.dataUrlToBlob(dataUrl);
        const ref = storage.ref('couples/' + coupleId + '/profile/' + id);
        const snap = await ref.put(blob);
        return snap.ref.getDownloadURL();
      } catch (e) {
        console.warn('Couple photo upload failed, keeping local data URL:', e);
        storageOK = false;
      }
    }
    // No Storage -> compress hard so the photos document stays under 1MB
    return recompress(dataUrl, 500, 0.7);
  }

  // ------------------------------------------------------------
  // Exports
  // ------------------------------------------------------------
  return {
    init, isEnabled, hasCouple,
    getCoupleId, onStatus, createCouple, joinCouple, disconnect,
    getCache, pushSection, addMediaItem, deleteMediaFile, storePhoto,
    getMedia, deleteMedia, getLastError: () => lastError
  };
})();
