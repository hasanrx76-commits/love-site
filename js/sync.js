/* ============================================
   SYNC MODULE - Real-time sync between two devices
   Uses PeerJS (WebRTC). Both devices use the same
   sync code. Whatever one adds appears on the other
   device instantly.
   ============================================ */

const Sync = (() => {
  const PEER_CDN = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
  const CODE_KEY = 'rw_sync_code';

  let peer = null;
  let conn = null;
  let roomId = null;
  let connected = false;
  let retryTimer = null;
  let destroyed = false;
  let applyingRemote = false;

  // --- UI helpers ---
  function $(id) { return document.getElementById(id); }

  function setStatus(msg, ok) {
    const el = $('sync-status');
    if (el) {
      el.textContent = msg;
      el.style.color = ok ? '#4caf50' : (msg.indexOf('Not connected') === 0 ? 'var(--text-muted)' : '#ff9800');
    }
  }

  function setConnectedUI() {
    const cb = $('sync-connect-btn');
    const db = $('sync-disconnect-btn');
    if (cb) cb.style.display = 'none';
    if (db) db.style.display = 'inline-block';
  }

  function setDisconnectedUI() {
    const cb = $('sync-connect-btn');
    const db = $('sync-disconnect-btn');
    if (cb) cb.style.display = 'inline-block';
    if (db) db.style.display = 'none';
  }

  // --- Library loading ---
  function ensureLib() {
    return new Promise((resolve, reject) => {
      if (window.Peer) return resolve();
      const s = document.createElement('script');
      s.src = PEER_CDN;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Could not load sync library. Sync needs internet.'));
      document.head.appendChild(s);
    });
  }

  function normalizeCode(code) {
    return (code || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  // --- Connection ---
  function connect() {
    clearTimeout(retryTimer);
    if (conn) return;
    const code = normalizeCode($('sync-code-input') ? $('sync-code-input').value : '');
    if (code.length < 4) {
      setStatus('Sync code too short - use at least 4 characters.', false);
      return;
    }
    localStorage.setItem(CODE_KEY, code);
    roomId = 'love-' + code;

    ensureLib().then(() => {
      if (destroyed) return;
      setStatus('Connecting...', false);
      if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }

      // Both devices try to register the SAME id. The one that wins becomes host.
      peer = new Peer(roomId, { debug: 0 });

      peer.on('open', () => {
        setStatus('Connected! Waiting for the other device (open same file with same code)...', false);
      });

      // We became the host -> accept the partner's connection
      peer.on('connection', (c) => {
        setupConn(c);
        sendSnapshot();
      });

      peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          // Partner already has this id -> we are the client, connect to them
          setStatus('Found partner device, connecting...', false);
          connectToHost();
        } else if (err.type === 'peer-unavailable') {
          // Host not online yet -> retry
          scheduleRetry();
        } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error' || err.type === 'socket-closed') {
          setStatus('Connection problem (check internet). Retrying...', false);
          scheduleRetry();
        } else {
          setStatus('Sync error: ' + err.type, false);
        }
      });
    }).catch((err) => {
      setStatus(err.message || 'Sync error', false);
    });
  }

  function connectToHost() {
    if (!peer) return;
    try {
      const c = peer.connect(roomId, { reliable: true });
      c.on('open', () => {
        setupConn(c);
        sendSnapshot();
      });
      c.on('error', () => scheduleRetry());
    } catch (e) {
      scheduleRetry();
    }
  }

  function scheduleRetry() {
    if (destroyed) return;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (destroyed) return;
      if (conn) return;
      // Re-create peer to retry registering/connecting
      if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
      connect();
    }, 4000);
  }

  // --- Connection setup (shared by host & client) ---
  function setupConn(c) {
    if (conn) { try { conn.close(); } catch (e) {} }
    conn = c;
    connected = true;
    setConnectedUI();
    setStatus('Connected! Both devices are in sync. Anything you add appears on the other device.', true);

    c.on('data', (msg) => {
      handleMessage(msg);
    });
    c.on('close', () => {
      conn = null;
      connected = false;
      setDisconnectedUI();
      setStatus('Disconnected. Retrying...', false);
      scheduleRetry();
    });
    c.on('error', () => {
      conn = null;
      connected = false;
      setDisconnectedUI();
      setStatus('Disconnected. Retrying...', false);
      scheduleRetry();
    });
  }

  function send(obj) {
    if (conn && connected) {
      try { conn.send(obj); } catch (e) {}
    }
  }

  // --- Snapshots (sent on connect, merged on receive) ---
  async function sendSnapshot() {
    const data = Storage.getAllData();
    for (const sec of ['gallery', 'videos']) {
      const arr = data[sec] || [];
      for (const item of arr) {
        if (item && item.blobId) {
          try {
            item._blob = await Storage.getMediaBlob(item.blobId);
            delete item.blobId;
          } catch (e) {}
        }
      }
    }
    send({ type: 'snapshot', data });
  }

  async function applySnapshot(data) {
    if (!data || typeof data !== 'object') return;
    for (const key of Object.keys(data)) {
      const rv = data[key];
      if (Array.isArray(rv)) {
        if (key === 'gallery' || key === 'videos') {
          await applyMediaUpsert(key, rv, true);
        } else {
          const local = Storage.get(key);
          const merged = Array.isArray(local) ? mergeArrays(local, rv) : rv;
          Storage.set(key, merged);
        }
      } else if (rv && typeof rv === 'object') {
        const local = Storage.get(key);
        const base = (local && typeof local === 'object' && !Array.isArray(local)) ? JSON.parse(JSON.stringify(local)) : {};
        Object.keys(rv).forEach(k => {
          if (rv[k] !== '' && rv[k] !== null && rv[k] !== undefined) base[k] = rv[k];
        });
        Storage.set(key, base);
      } else {
        Storage.set(key, rv);
      }
    }
    Sections.renderAll();
    if (window.Customizer && Customizer.renderAdminLists) Customizer.renderAdminLists();
  }

  function mergeArrays(local, remote) {
    const map = {};
    (local || []).forEach(i => { if (i && i.id) map[i.id] = i; });
    (remote || []).forEach(i => { if (i && i.id) map[i.id] = i; });
    return Object.values(map);
  }

  // --- Live updates ---
  async function broadcastSection(section, value) {
    if (!connected || !conn) return;
    if (section === 'gallery' || section === 'videos') {
      const items = (value || []).map(i => ({ ...i }));
      for (const item of items) {
        if (item.blobId) {
          try {
            item._blob = await Storage.getMediaBlob(item.blobId);
            delete item.blobId;
          } catch (e) { delete item._blob; }
        }
      }
      send({ type: 'media-section', section, items });
    } else {
      send({ type: 'section', section, value });
    }
  }

  // Upsert received media items (from live broadcast or snapshot)
  async function applyMediaUpsert(section, items, isSnapshot) {
    const local = Storage.get(section);
    const map = {};
    (Array.isArray(local) ? local : []).forEach(i => { if (i && i.id) map[i.id] = i; });

    for (const item of items) {
      if (!item || !item.id) continue;
      const existing = map[item.id];
      const newItem = { ...item };
      delete newItem._blob;
      delete newItem.blobId;

      let blob = item._blob;
      if (blob && !(blob instanceof Blob) && typeof Blob !== 'undefined' && ArrayBuffer.isView(blob)) {
        blob = new Blob([blob], { type: item.type || 'application/octet-stream' });
      }

      if (blob) {
        try {
          const savedId = await Storage.idbSaveBlob(blob);
          newItem.blobId = savedId;
          if (existing && existing.blobId && existing.blobId !== savedId) {
            try { Storage.removeMediaBlob(existing.blobId); } catch (e) {}
          }
        } catch (e) {
          console.warn('media upsert failed', e);
        }
      } else if (existing && existing.blobId) {
        // remote item has no blob anymore -> drop local blob
        try { Storage.removeMediaBlob(existing.blobId); } catch (e) {}
        delete newItem.blobId;
      }

      map[item.id] = newItem;
    }

    const merged = Object.values(map);
    Storage.set(section, merged);
  }

  async function applyMediaSection(section, items) {
    await applyMediaUpsert(section, items, false);
    Sections.renderAll();
    if (window.Customizer && Customizer.renderAdminLists) Customizer.renderAdminLists();
  }

  // --- Message router ---
  async function handleMessage(msg) {
    if (!msg) return;
    if (msg.type === 'snapshot') {
      applySnapshot(msg.data);
    } else if (msg.type === 'section') {
      Storage.set(msg.section, msg.value);
      Sections.renderAll();
      if (window.Customizer && Customizer.renderAdminLists) Customizer.renderAdminLists();
    } else if (msg.type === 'media-section') {
      applyingRemote = true;
      try { await applyMediaSection(msg.section, msg.items); } finally { applyingRemote = false; }
    } else if (msg.type === 'remove') {
      applyingRemote = true;
      try {
        const arr = Storage.getArray(msg.section);
        const item = arr.find(i => i.id === msg.id);
        if (item && item.blobId) {
          try { Storage.removeMediaBlob(item.blobId); } catch (e) {}
        }
        Storage.removeItem(msg.section, msg.id);
        Sections.renderAll();
        if (window.Customizer && Customizer.renderAdminLists) Customizer.renderAdminLists();
      } finally {
        applyingRemote = false;
      }
    }
  }

  // --- Disconnect ---
  function disconnect() {
    destroyed = true;
    clearTimeout(retryTimer);
    if (conn) { try { conn.close(); } catch (e) {} }
    if (peer) { try { peer.destroy(); } catch (e) {} }
    conn = null;
    peer = null;
    connected = false;
    setDisconnectedUI();
    setStatus('Disconnected. You can still use the website normally.', false);
  }

  // --- Init ---
  function init() {
    // Wire up UI
    const connectBtn = $('sync-connect-btn');
    const disconnectBtn = $('sync-disconnect-btn');
    const codeInput = $('sync-code-input');

    if (connectBtn) {
      connectBtn.addEventListener('click', () => {
        destroyed = false;
        connect();
      });
    }
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => {
        disconnect();
        destroyed = false; // allow reconnect later
      });
    }
    if (codeInput) {
      const saved = localStorage.getItem(CODE_KEY);
      if (saved) codeInput.value = saved;
    }

    // Broadcast local changes
    window.addEventListener('storage-update', (e) => {
      if (!applyingRemote && connected && conn && e.detail) {
        broadcastSection(e.detail.section, e.detail.value);
      }
    });
    window.addEventListener('storage-removed', (e) => {
      if (!applyingRemote && connected && conn && e.detail) {
        send({ type: 'remove', section: e.detail.section, id: e.detail.id });
      }
    });

    // Auto-connect if a sync code was saved before
    const saved = localStorage.getItem(CODE_KEY);
    if (saved && normalizeCode(saved).length >= 4) {
      destroyed = false;
      connect();
    }
  }

  return {
    init, connect, disconnect
  };
})();

