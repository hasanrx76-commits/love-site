/* ============================================
   SECTIONS MODULE - Renders all 23 sections
   ============================================ */

const Sections = (() => {

  // --- Navigation ---
  function renderNav() {
    const names = Storage.getData('names');
    const boyName = names.boy || Storage.defaults.names.boy || 'Him';
    const girlName = names.girl || Storage.defaults.names.girl || 'Her';

    document.getElementById('nav-boy').textContent = boyName;
    document.getElementById('nav-girl').textContent = girlName;
    document.getElementById('welcome-boy-name').textContent = boyName;
    document.getElementById('welcome-girl-name').textContent = girlName;

    const navLinks = document.getElementById('nav-links');
    const sections = [
      { id: 'landing', label: 'Home' },
      { id: 'couple', label: 'About Us' },
      { id: 'love-story', label: 'Our Story' },
      { id: 'timeline', label: 'Timeline' },
      { id: 'gallery', label: 'Gallery' },
      { id: 'videos', label: 'Videos' },
      { id: 'letters', label: 'Letters' },
      { id: 'memories', label: 'Memories' },
      { id: 'countdown', label: 'Countdown' },
      { id: 'gift', label: 'Gift' },
      { id: 'memory-game', label: 'Game' },
      { id: 'wish', label: 'Wishes' },
      { id: 'visitor', label: 'Visitor Book' },
      { id: 'footer', label: 'Footer' }
    ];
    navLinks.innerHTML = sections.map(s =>
      `<a href="#section-${s.id}" data-section="${s.id}">${s.label}</a>`
    ).join('');

    // Active link on scroll
    window.addEventListener('scroll', () => {
      const scrollPos = window.scrollY + 100;
      sections.forEach(s => {
        const el = document.getElementById('section-' + s.id);
        if (el) {
          const link = navLinks.querySelector(`[data-section="${s.id}"]`);
          if (link) {
            if (el.offsetTop <= scrollPos && el.offsetTop + el.offsetHeight > scrollPos) {
              navLinks.querySelectorAll('a').forEach(a => a.classList.remove('active'));
              link.classList.add('active');
            }
          }
        }
      });
    });
  }

  // --- Couple Introduction ---
  function renderCouple() {
    const names = Storage.getData('names');
    const photos = Storage.getData('photos');
    const about = Storage.getData('about');
    const dates = Storage.getData('dates');

    const boyName = names.boy || Storage.defaults.names.boy || 'His Name';
    const girlName = names.girl || Storage.defaults.names.girl || 'Her Name';

    document.getElementById('couple-boy-name').textContent = boyName;
    document.getElementById('couple-girl-name').textContent = girlName;
    document.getElementById('landing-boy-name').textContent = boyName;
    document.getElementById('landing-girl-name').textContent = girlName;
    document.getElementById('landing-tagline').textContent = names.tagline || 'Two souls, one heart';
    document.getElementById('footer-boy').textContent = boyName;
    document.getElementById('footer-girl').textContent = girlName;
    document.getElementById('footer-message').textContent = names.footerMessage || 'Made with love, for love';
    document.getElementById('countdown-label').textContent = dates.countdownLabel || 'Until our next special day';

    if (photos.boy) {
      const img = document.getElementById('boy-photo');
      img.src = photos.boy;
      img.alt = boyName + "'s photo";
    }
    if (photos.girl) {
      const img = document.getElementById('girl-photo');
      img.src = photos.girl;
      img.alt = girlName + "'s photo";
    }

    document.getElementById('boy-about').textContent = about.boy || 'About him...';
    document.getElementById('girl-about').textContent = about.girl || 'About her...';

    if (dates.boyBirthday) {
      document.getElementById('boy-birthday').innerHTML = `Birthday: <span>${formatDate(dates.boyBirthday)}</span>`;
    }
    if (dates.girlBirthday) {
      document.getElementById('girl-birthday').innerHTML = `Birthday: <span>${formatDate(dates.girlBirthday)}</span>`;
    }
  }

  // --- Love Story ---
  function renderLoveStory() {
    const content = Storage.getData('content');
    const container = document.getElementById('love-story-content');
    if (!content.loveStory) {
      container.innerHTML = '<div class="story-placeholder">Add your love story paragraphs in the admin panel</div>';
      return;
    }
    const paragraphs = content.loveStory.split('\n').filter(p => p.trim());
    container.innerHTML = paragraphs.map(p => `<p>${escapeHTML(p)}</p>`).join('');
  }

  // --- Timeline ---
  function renderTimeline() {
    const events = Storage.getArray('timeline');
    const container = document.getElementById('timeline-container');
    if (events.length === 0) {
      container.innerHTML = '<div class="timeline-placeholder">Add timeline events in the admin panel</div>';
      return;
    }
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    container.innerHTML = events.map(e => `
      <div class="timeline-item" data-id="${e.id}">
        <div class="timeline-dot"></div>
        <div class="timeline-date">${e.date ? formatDate(e.date) : 'Date not set'}</div>
        <div class="timeline-title">${escapeHTML(e.title || '')}</div>
        <div class="timeline-desc">${escapeHTML(e.desc || '')}</div>
        <button class="rw-delete-btn" onclick="Sections.deleteItem('timeline','${e.id}','event')" title="Delete">&#10005;</button>
      </div>
    `).join('');
  }

  // --- Gallery ---
  const _sectionUrls = { gallery: [], videos: [] };
  function releaseSectionUrls(section) {
    (_sectionUrls[section] || []).forEach(u => { try { URL.revokeObjectURL(u); } catch (e) {} });
    _sectionUrls[section] = [];
  }

  // --- Gallery ---
  async function renderGallery() {
    const gallery = Storage.getArray('gallery');
    const container = document.getElementById('gallery-container');
    if (!container) return;
    if (gallery.length === 0) {
      releaseSectionUrls('gallery');
      container.innerHTML = '<div class="gallery-placeholder">Upload photos here - click Add Photo</div>';
      return;
    }
    releaseSectionUrls('gallery');
    const urls = {};
    await Promise.all(gallery.map(async g => {
      if (g.url) {
        urls[g.id] = g.url;
      } else if (g.blobId) {
        try {
          const u = await Storage.getMediaUrl(g);
          if (u) { urls[g.id] = u; if (u.startsWith('blob:')) _sectionUrls.gallery.push(u); }
        } catch (e) {}
      } else if (g.data) {
        urls[g.id] = g.data;
      }
    }));
    container.innerHTML = gallery.map(g => `
      <div class="gallery-item" data-id="${g.id}" onclick="Sections.openLightbox('${urls[g.id] || ''}', '${escapeHTML(g.name || '')}')">
        <img src="${urls[g.id] || ''}" alt="${escapeHTML(g.name || '')}" loading="lazy">
        <div class="gallery-overlay"><span>${escapeHTML(g.name || '')}</span></div>
        <button class="rw-delete-btn rw-delete-top" onclick="event.stopPropagation();Sections.deleteItem('gallery','${g.id}','photo')" title="Delete">&#10005;</button>
        <button class="rw-change-btn" onclick="event.stopPropagation();Sections.changeMedia('gallery','${g.id}')" title="Change Photo">&#128260;</button>
      </div>
    `).join('');
  }

  // --- Videos ---
  async function renderVideos() {
    const videos = Storage.getArray('videos');
    const container = document.getElementById('videos-container');
    if (!container) return;
    if (videos.length === 0) {
      releaseSectionUrls('videos');
      container.innerHTML = '<div class="videos-placeholder">Add videos here - upload a file or paste a YouTube link</div>';
      return;
    }
    releaseSectionUrls('videos');
    const urls = {};
    await Promise.all(videos.map(async v => {
      if (v.url) {
        urls[v.id] = v.url;
      } else if (v.blobId) {
        try {
          const u = await Storage.getMediaUrl(v);
          if (u) { urls[v.id] = u; if (u.startsWith('blob:')) _sectionUrls.videos.push(u); }
        } catch (e) {}
      } else if (v.data) {
        urls[v.id] = v.data;
      }
    }));
    container.innerHTML = videos.map(v => `
      <div class="video-item" data-id="${v.id}">
        <button class="rw-delete-btn rw-delete-top" onclick="Sections.deleteItem('videos','${v.id}','video')" title="Delete">&#10005;</button>
        <button class="rw-change-btn" onclick="Sections.changeMedia('videos','${v.id}')" title="Change Video">&#128260;</button>
        ${v.external
          ? `<iframe src="${escapeHTML(v.data)}" title="${escapeHTML(v.name || 'Video')}" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>`
          : urls[v.id]
            ? `<video src="${urls[v.id]}" controls preload="auto" playsinline></video>`
            : `<div class="video-placeholder-inline">Video could not load</div>`}
        <div class="video-title">${escapeHTML(v.name || '')}</div>
      </div>
    `).join('');
  }

  // --- Love Letters ---
  function renderLetters() {
    const letters = Storage.getArray('loveLetters');
    const container = document.getElementById('letters-container');
    if (letters.length === 0) {
      container.innerHTML = '<div class="letters-placeholder">Add love letters in the admin panel</div>';
      return;
    }
    container.innerHTML = letters.map(l => `
      <div class="letter-card" data-id="${l.id}">
        <button class="rw-delete-btn rw-delete-top" onclick="Sections.deleteItem('loveLetters','${l.id}','letter')" title="Delete">&#10005;</button>
        <div class="letter-from">From: ${escapeHTML(l.from || 'Anonymous')}</div>
        <div class="letter-date">${l.date ? formatDate(l.date) : ''}</div>
        <div class="letter-body">${escapeHTML(l.body || '')}</div>
      </div>
    `).join('');
  }

  // --- Paragraphs ---
  function renderParagraphs() {
    const paragraphs = Storage.getArray('paragraphs');
    const container = document.getElementById('paragraphs-container');
    if (paragraphs.length === 0) {
      container.innerHTML = '<div class="paragraphs-placeholder">Add paragraphs in the admin panel</div>';
      return;
    }
    container.innerHTML = paragraphs.map(p => `
      <div class="paragraph-item" data-id="${p.id}">
        ${escapeHTML(p.text || '')}
        <button class="rw-delete-btn" onclick="Sections.deleteItem('paragraphs','${p.id}','paragraph')" title="Delete">&#10005;</button>
      </div>
    `).join('');
  }

  // --- Memories ---
  function renderMemories() {
    const memories = Storage.getArray('memories');
    const container = document.getElementById('memories-container');
    if (memories.length === 0) {
      container.innerHTML = '<div class="memories-placeholder">Add memories in the admin panel</div>';
      return;
    }
    container.innerHTML = memories.map(m => `
      <div class="dream-item" data-id="${m.id}">
        <button class="rw-delete-btn" onclick="Sections.deleteItem('memories','${m.id}','memory')" title="Delete">&#10005;</button>
        <div class="dream-icon">${m.icon || '&#10084;'}</div>
        <div>
          <strong>${escapeHTML(m.title || '')}</strong>
          <p class="dream-text">${escapeHTML(m.text || '')}</p>
          <small style="color:var(--text-muted);opacity:0.5">${m.date ? formatDate(m.date) : ''}</small>
        </div>
      </div>
    `).join('');
  }

  // --- Secret Messages ---
  function renderSecrets() {
    const secrets = Storage.getArray('secrets');
    const container = document.getElementById('secret-container');
    if (secrets.length === 0) {
      container.innerHTML = '<div class="secret-placeholder">Write secret messages to each other</div>';
      return;
    }
    container.innerHTML = secrets.map(s => `
      <div class="letter-card" data-id="${s.id}">
        <button class="rw-delete-btn rw-delete-top" onclick="Sections.deleteItem('secrets','${s.id}','secret')" title="Delete">&#10005;</button>
        <div class="letter-from">&#128274; Secret from ${escapeHTML(s.from || 'Someone')}</div>
        <div class="letter-body">${escapeHTML(s.text || '')}</div>
      </div>
    `).join('');
  }

  // --- Countdown ---
  function renderCountdown() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  function updateCountdown() {
    const dates = Storage.getData('dates');
    let targetDate = dates.countdownDate || dates.anniversary;
    if (!targetDate) return;

    const now = new Date();
    const target = new Date(targetDate);

    // If date is in the past this year, use next year
    if (target < now) {
      target.setFullYear(target.getFullYear() + 1);
    }

    const diff = target - now;
    if (diff <= 0) return;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('cd-days').textContent = days;
    document.getElementById('cd-hours').textContent = hours;
    document.getElementById('cd-minutes').textContent = minutes;
    document.getElementById('cd-seconds').textContent = seconds;
  }

  // --- Gift Box ---
  function renderGift() {
    const content = Storage.getData('content');
    const giftBox = document.getElementById('gift-box');
    const giftMessage = document.getElementById('gift-message');
    const giftText = document.getElementById('gift-text');

    giftText.textContent = content.giftMessage || 'You are my everything!';

    giftBox.onclick = () => {
      giftBox.classList.add('opened');
      setTimeout(() => {
        giftMessage.classList.remove('hidden');
        // Trigger confetti if enabled
        const effects = Storage.getData('effects');
        if (effects.confetti) triggerConfetti();
      }, 800);
    };
  }

  // --- Surprise ---
  function renderSurprise() {
    const content = Storage.getData('content');
    const container = document.getElementById('surprise-cards');
    const revealBtn = document.getElementById('surprise-reveal');

    if (!content.surpriseMessages) {
      container.innerHTML = '<div class="secret-placeholder">Add surprise messages in the admin panel</div>';
      return;
    }

    const messages = content.surpriseMessages.split('\n').filter(m => m.trim());
    container.innerHTML = messages.map((m, i) => `
      <div class="letter-card" style="opacity:0;transform:scale(0.8);transition:all 0.5s ${i * 0.1}s" data-reveal>
        <div class="letter-body">${escapeHTML(m)}</div>
      </div>
    `).join('');

    revealBtn.onclick = () => {
      container.querySelectorAll('[data-reveal]').forEach(card => {
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
      });
    };
  }

  // --- Wish Wall ---
  function renderWishes() {
    const wishes = Storage.getArray('wishes');
    const container = document.getElementById('wish-wall');
    if (wishes.length === 0) {
      container.innerHTML = '<div class="wish-placeholder">Add wishes to the wall</div>';
      return;
    }
    container.innerHTML = wishes.map(w => `
      <div class="wish-card">
        ${escapeHTML(w.text || '')}
        <button class="rw-delete-btn" onclick="Sections.deleteItem('wishes','${w.id}','wish')" title="Delete">&#10005;</button>
      </div>
    `).join('');
  }

  // --- Visitor Book ---
  function renderVisitors() {
    const visitors = Storage.getArray('visitors');
    const container = document.getElementById('visitor-book');
    if (visitors.length === 0) {
      container.innerHTML = '<div class="visitor-placeholder">Leave a message for the couple</div>';
      return;
    }
    container.innerHTML = visitors.reverse().map(v => `
      <div class="visitor-entry" style="position:relative">
        <button class="rw-delete-btn rw-delete-top" onclick="Sections.deleteItem('visitors','${v.id}','message')" title="Delete">&#10005;</button>
        <div class="visitor-entry-name">${escapeHTML(v.name || 'Anonymous')}</div>
        <div class="visitor-entry-msg">${escapeHTML(v.message || '')}</div>
        <div class="visitor-entry-date">${v.date ? formatDate(v.date) : ''}</div>
      </div>
    `).join('');
  }

  // --- Photo Frames ---
  function renderFrames() {
    const gallery = Storage.getArray('gallery');
    const container = document.getElementById('photo-frames');
    if (gallery.length === 0) {
      container.innerHTML = '<div class="frames-placeholder">Upload photos for frames in the admin panel</div>';
      return;
    }
    // Show first 6 in frames
    container.innerHTML = gallery.slice(0, 6).map(g => `
      <div class="photo-frame">
        <img src="${g.data}" alt="${escapeHTML(g.name || '')}" loading="lazy">
        <div class="frame-caption">${escapeHTML(g.name || '')}</div>
      </div>
    `).join('');
  }

  // --- Dream Future ---
  function renderDreams() {
    const content = Storage.getData('content');
    const container = document.getElementById('dream-content');
    if (!content.dreamGoals) {
      container.innerHTML = '<div class="dream-placeholder">Add your dream future goals in the admin panel</div>';
      return;
    }
    const goals = content.dreamGoals.split('\n').filter(g => g.trim());
    const icons = ['&#127775;', '&#128149;', '&#127968;', '&#9992;', '&#127752;', '&#127880;', '&#128151;', '&#127774;'];
    container.innerHTML = goals.map((g, i) => `
      <div class="dream-item">
        <button class="rw-delete-btn" onclick="Sections.deleteDream(${i})" title="Delete">&#10005;</button>
        <div class="dream-icon">${icons[i % icons.length]}</div>
        <div class="dream-text">${escapeHTML(g)}</div>
      </div>
    `).join('');
  }

  // --- Quotes ---
  function renderQuotes() {
    const quotes = Storage.getArray('quotes');
    const container = document.getElementById('quotes-container');
    if (quotes.length === 0) {
      container.innerHTML = '<div class="quotes-placeholder">Add favorite quotes in the admin panel</div>';
      return;
    }
    container.innerHTML = quotes.map(q => `
      <div class="quote-card">
        <button class="rw-delete-btn rw-delete-top" onclick="Sections.deleteItem('quotes','${q.id}','quote')" title="Delete">&#10005;</button>
        <div class="quote-text">${escapeHTML(q.text || '')}</div>
        <div class="quote-author">- ${escapeHTML(q.author || 'Unknown')}</div>
      </div>
    `).join('');
  }

  // --- Lightbox ---
  function openLightbox(src, caption) {
    const lightbox = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox-caption').textContent = caption;
    lightbox.classList.remove('hidden');
    lightbox.onclick = (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
        lightbox.classList.add('hidden');
      }
    };
  }

  // --- Delete Item (with confirmation) ---
  function deleteItem(section, id, label) {
    if (confirm('Delete this ' + (label || 'item') + '?')) {
      if (section === 'gallery' || section === 'videos') {
        Storage.removeMediaItem(section, id).then(() => {
          renderAll();
          Animations.refresh();
          showToast('Deleted!');
        });
        return;
      }
      Storage.removeItem(section, id);
      renderAll();
      Animations.refresh();
      showToast('Deleted!');
    }
  }

  // --- Change/Replace Media (photo or video) ---
  function changeMedia(section, id) {
    const item = (Storage.getArray(section) || []).find(i => i.id === id);
    if (!item) return;

    // External (YouTube) video: open modal to change the link
    if (section === 'videos' && item.external) {
      openContentModal('Change Video Link', [
        { key: 'url', label: 'New YouTube / online link', value: item.data || '', placeholder: 'https://www.youtube.com/watch?v=...' },
        { key: 'name', label: 'Video Title', value: item.name || '' }
      ], (data) => {
        let url = (data.url || '').trim();
        if (!url) { showToast('Please paste a link!'); return; }
        const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
        if (yt) url = 'https://www.youtube.com/embed/' + yt[1];
        Storage.updateItem('videos', id, { data: url, name: data.name || item.name || 'Video' });
        renderVideos();
        Animations.refresh();
        showToast('Video link updated! &#127916;');
      });
      return;
    }

    // File-based media: open a file picker and replace
    const accept = section === 'gallery' ? 'image/*' : 'video/*';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const saved = await Storage.replaceMediaFile(section, id, file);
      if (!saved) {
        showToast('Could not save - device storage is full!');
        return;
      }
      if (section === 'gallery') renderGallery(); else renderVideos();
      Animations.refresh();
      showToast(section === 'gallery' ? 'Photo changed! &#128247;' : 'Video changed! &#127916;');
    };
    input.click();
  }

  // --- Delete Dream Goal (by index) ---
  function deleteDream(index) {
    if (!confirm('Delete this dream goal?')) return;
    const content = Storage.getData('content');
    const goals = content.dreamGoals.split('\n').filter(g => g.trim());
    goals.splice(index, 1);
    content.dreamGoals = goals.join('\n');
    Storage.setData('content', content);
    renderDreams();
    Animations.refresh();
    showToast('Deleted!');
  }

  // --- Helpers ---
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Render All ---
  function renderAll() {
    renderNav();
    renderCouple();
    renderLoveStory();
    renderTimeline();
    renderGallery();
    renderVideos();
    renderLetters();
    renderParagraphs();
    renderMemories();
    renderSecrets();
    renderGift();
    renderSurprise();
    renderWishes();
    renderVisitors();
    renderFrames();
    renderDreams();
    renderQuotes();
    renderCountdown();
    setupCouplePhotoUploads();
    setupLetterModal();
    setupSecretLock();
    setupDirectAddButtons();
  }

  // --- Generic Content Modal ---
  function openContentModal(title, fields, onSave) {
    let existing = document.getElementById('rw-content-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'rw-content-modal';
    modal.className = 'lightbox';

    const fieldHTML = fields.map(f => {
      if (f.type === 'textarea') {
        return `
          <div class="letter-modal-field">
            <label>${f.label}</label>
            <textarea id="rw-field-${f.key}" class="fancy-textarea" placeholder="${f.placeholder || ''}">${f.value || ''}</textarea>
          </div>`;
      } else if (f.type === 'date') {
        return `
          <div class="letter-modal-field">
            <label>${f.label}</label>
            <input type="date" id="rw-field-${f.key}" class="fancy-input" value="${f.value || ''}">
          </div>`;
      } else if (f.type === 'file') {
        return `
          <div class="letter-modal-field">
            <label>${f.label}</label>
            <input type="file" id="rw-field-${f.key}" class="fancy-input" accept="${f.accept || ''}">
          </div>`;
      } else {
        return `
          <div class="letter-modal-field">
            <label>${f.label}</label>
            <input type="text" id="rw-field-${f.key}" class="fancy-input" placeholder="${f.placeholder || ''}" value="${f.value || ''}">
          </div>`;
      }
    }).join('');

    modal.innerHTML = `
      <div class="letter-modal-box">
        <h3 class="letter-modal-title">${title}</h3>
        ${fieldHTML}
        <div class="letter-modal-actions">
          <button id="rw-modal-save" class="glow-btn">Save</button>
          <button id="rw-modal-cancel" class="glow-btn" style="background:rgba(255,255,255,0.1);box-shadow:none;">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('rw-modal-cancel').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    document.getElementById('rw-modal-save').onclick = () => {
      const result = {};
      fields.forEach(f => {
        const el = document.getElementById('rw-field-' + f.key);
        if (el) result[f.key] = f.type === 'file' ? el.files[0] : el.value.trim();
      });
      onSave(result);
      modal.remove();
    };
  }

  // --- Setup All Direct Add Buttons ---
  function setupDirectAddButtons() {
    // Love Story Paragraph
    const lovestoryBtn = document.getElementById('add-lovestory-now');
    if (lovestoryBtn) {
      lovestoryBtn.onclick = () => openContentModal('Add Love Story Paragraph', [
        { key: 'text', label: 'Your Story', type: 'textarea', placeholder: 'Write about a special moment...' }
      ], (data) => {
        if (!data.text) { showToast('Please write something!'); return; }
        const content = Storage.getData('content');
        content.loveStory = content.loveStory ? content.loveStory + '\n' + data.text : data.text;
        Storage.setData('content', content);
        renderLoveStory();
        Animations.refresh();
        showToast('Story added! &#128172;');
      });
    }

    // Surprise Message
    const surpriseBtn = document.getElementById('add-surprise-now');
    if (surpriseBtn) {
      surpriseBtn.onclick = () => openContentModal('Add Surprise Message', [
        { key: 'text', label: 'Surprise Message', type: 'textarea', placeholder: 'Something sweet and unexpected...' }
      ], (data) => {
        if (!data.text) { showToast('Please write something!'); return; }
        const content = Storage.getData('content');
        content.surpriseMessages = content.surpriseMessages ? content.surpriseMessages + '\n' + data.text : data.text;
        Storage.setData('content', content);
        renderSurprise();
        Animations.refresh();
        showToast('Surprise added! &#127873;');
      });
    }

    // Photo Frames (same gallery storage)
    const framesBtn = document.getElementById('add-frames-now');
    if (framesBtn) {
      framesBtn.onclick = () => openContentModal('Add Photo to Frames', [
        { key: 'data', label: 'Choose Photo', type: 'file', accept: 'image/*' },
        { key: 'name', label: 'Photo Title (optional)', placeholder: 'e.g. Our day at the beach' }
      ], async (data) => {
        if (!data.data) { showToast('Please choose a photo!'); return; }
        const dataUrl = await Storage.fileToBase64(data.data);
        Storage.addItem('gallery', { data: dataUrl, name: data.name || data.data.name || 'Photo' });
        renderGallery();
        renderFrames();
        Animations.refresh();
        showToast('Photo added! &#128247;');
      });
    }

    // Timeline Event
    const timelineBtn = document.getElementById('add-timeline-event-now');
    if (timelineBtn) {
      timelineBtn.onclick = () => openContentModal('Add Timeline Event', [
        { key: 'date', label: 'Date', type: 'date', value: new Date().toISOString().slice(0, 10) },
        { key: 'title', label: 'Event Title', placeholder: 'e.g. Our first date' },
        { key: 'desc', label: 'Description', type: 'textarea', placeholder: 'What happened?' }
      ], (data) => {
        if (!data.title) { showToast('Please write a title!'); return; }
        Storage.addItem('timeline', data);
        renderTimeline();
        Animations.refresh();
        showToast('Event added! &#128197;');
      });
    }

    // Gallery Photo
    const galleryBtn = document.getElementById('add-gallery-photo-now');
    if (galleryBtn) {
      galleryBtn.onclick = () => openContentModal('Add Gallery Photo', [
        { key: 'data', label: 'Choose Photo', type: 'file', accept: 'image/*' },
        { key: 'name', label: 'Photo Title (optional)', placeholder: 'e.g. Our trip to Goa' }
      ], async (data) => {
        if (!data.data) { showToast('Please choose a photo!'); return; }
        const dataUrl = await Storage.fileToBase64(data.data);
        Storage.addItem('gallery', { data: dataUrl, name: data.name || data.data.name || 'Photo' });
        renderGallery();
        renderFrames();
        Animations.refresh();
        showToast('Photo added! &#128247;');
      });
    }

    // Video
    const videoBtn = document.getElementById('add-video-now');
    if (videoBtn) {
      videoBtn.onclick = () => openContentModal('Add Video', [
        { key: 'url', label: 'YouTube / online link (works on all devices)', placeholder: 'https://www.youtube.com/watch?v=...' },
        { key: 'data', label: 'OR upload video file (saved on this device)', type: 'file', accept: 'video/*' },
        { key: 'name', label: 'Video Title (optional)', placeholder: 'e.g. Our wedding dance' }
      ], async (data) => {
        if (data.url && data.url.trim()) {
          let url = data.url.trim();
          const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
          if (yt) {
            url = 'https://www.youtube.com/embed/' + yt[1];
          } else if (!/^https?:\/\//.test(url)) {
            showToast('Please paste a valid link starting with http(s)://');
            return;
          }
          Storage.addItem('videos', { data: url, name: data.name || 'Video', external: true });
          renderVideos();
          Animations.refresh();
          showToast('Video added! &#127916;');
          return;
        }
        if (!data.data) { showToast('Please choose a video file or paste a link!'); return; }
        const saved = await Storage.addMediaFile('videos', data.data, { name: data.name || data.data.name || 'Video' });
        if (!saved) {
          showToast('Could not save video - device storage is full! Delete some photos/videos first, or use a YouTube link.');
          return;
        }
        renderVideos();
        Animations.refresh();
        showToast('Video saved! &#127916;');
      });
    }

    // Paragraph
    const paraBtn = document.getElementById('add-paragraph-now');
    if (paraBtn) {
      paraBtn.onclick = () => openContentModal('Add Paragraph', [
        { key: 'text', label: 'Your Words', type: 'textarea', placeholder: 'Write from your heart...' }
      ], (data) => {
        if (!data.text) { showToast('Please write something!'); return; }
        Storage.addItem('paragraphs', { text: data.text });
        renderParagraphs();
        Animations.refresh();
        showToast('Paragraph added! &#128172;');
      });
    }

    // Memory
    const memBtn = document.getElementById('add-memory-now');
    if (memBtn) {
      memBtn.onclick = () => openContentModal('Add Memory', [
        { key: 'title', label: 'Memory Title', placeholder: 'e.g. First kiss' },
        { key: 'text', label: 'Memory', type: 'textarea', placeholder: 'Tell the memory...' },
        { key: 'date', label: 'Date', type: 'date' }
      ], (data) => {
        if (!data.title) { showToast('Please write a title!'); return; }
        Storage.addItem('memories', { ...data, icon: '&#10084;' });
        renderMemories();
        Animations.refresh();
        showToast('Memory added! &#128142;');
      });
    }

    // Secret (password locked)
    const secretBtn = document.getElementById('add-secret-now');
    if (secretBtn) {
      secretBtn.onclick = () => {
        askSecretPassword(() => {
          openContentModal('Add Secret Message', [
            { key: 'from', label: 'From', placeholder: 'Your name' },
            { key: 'text', label: 'Secret Message', type: 'textarea', placeholder: 'Shh... your secret...' }
          ], (data) => {
            if (!data.text) { showToast('Please write a message!'); return; }
            Storage.addItem('secrets', { from: data.from || 'Anonymous', text: data.text });
            renderSecrets();
            Animations.refresh();
            showToast('Secret added! &#128274;');
          });
        });
      };
    }

    // Dream Goal
    const dreamBtn = document.getElementById('add-dream-now');
    if (dreamBtn) {
      dreamBtn.onclick = () => openContentModal('Add Dream Goal', [
        { key: 'text', label: 'Dream Goal', type: 'textarea', placeholder: 'e.g. Build our dream home by the beach' }
      ], (data) => {
        if (!data.text) { showToast('Please write a goal!'); return; }
        const content = Storage.getData('content');
        content.dreamGoals = content.dreamGoals ? content.dreamGoals + '\n' + data.text : data.text;
        Storage.setData('content', content);
        renderDreams();
        Animations.refresh();
        showToast('Dream added! &#127775;');
      });
    }

    // Quote
    const quoteBtn = document.getElementById('add-quote-now');
    if (quoteBtn) {
      quoteBtn.onclick = () => openContentModal('Add Favorite Quote', [
        { key: 'text', label: 'Quote', type: 'textarea', placeholder: 'The quote text...' },
        { key: 'author', label: 'Author', placeholder: 'e.g. Rumi' }
      ], (data) => {
        if (!data.text) { showToast('Please write a quote!'); return; }
        Storage.addItem('quotes', { text: data.text, author: data.author || 'Unknown' });
        renderQuotes();
        Animations.refresh();
        showToast('Quote added! &#10077;&#10078;');
      });
    }
  }

  // --- Letter Writing Modal ---
  function setupLetterModal() {
    const modal = document.getElementById('letter-modal');
    const writeBtn = document.getElementById('write-letter-btn');
    if (!modal || !writeBtn) return;

    writeBtn.onclick = () => {
      document.getElementById('letter-date-input').value = new Date().toISOString().slice(0, 10);
      modal.classList.remove('hidden');
    };

    document.getElementById('letter-cancel-btn').onclick = () => modal.classList.add('hidden');
    modal.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };

    document.getElementById('letter-save-btn').onclick = () => {
      const from = document.getElementById('letter-from-input').value.trim();
      const date = document.getElementById('letter-date-input').value;
      const body = document.getElementById('letter-body-input').value.trim();
      if (!body) {
        showToast('Please write your letter first!');
        return;
      }
      Storage.addItem('loveLetters', {
        from: from || 'Anonymous',
        date: date || new Date().toISOString().slice(0, 10),
        body
      });
      modal.classList.add('hidden');
      document.getElementById('letter-from-input').value = '';
      document.getElementById('letter-body-input').value = '';
      renderLetters();
      showToast('Letter saved! &#10084;');
    };
  }

  // --- Direct Photo Upload on Couple Cards ---
  function setupCouplePhotoUploads() {
    const setup = (btnId, inputId, key) => {
      const btn = document.getElementById(btnId);
      const input = document.getElementById(inputId);
      if (!btn || !input) return;
      btn.onclick = () => input.click();
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        try {
          const dataUrl = await Storage.fileToBase64(file);
          const photos = Storage.getData('photos');
          photos[key] = dataUrl;
          Storage.setData('photos', photos);
          const img = document.getElementById(key === 'boy' ? 'boy-photo' : 'girl-photo');
          if (img) img.src = dataUrl;
          btn.innerHTML = '&#128260; Change Photo';
          triggerConfetti();
          showToast('Photo updated! &#128247;');
        } catch (err) {
          console.warn('Photo upload failed:', err);
          showToast('Photo upload failed. Try a smaller image.');
        }
        input.value = '';
      };
      // If a photo already exists, show "Change Photo"
      const photos = Storage.getData('photos');
      if (photos[key]) btn.innerHTML = '&#128260; Change Photo';
    };
    setup('boy-add-photo', 'boy-photo-upload', 'boy');
    setup('girl-add-photo', 'girl-photo-upload', 'girl');
  }

  // --- Toast Notification ---
  function showToast(msg) {
    const existing = document.getElementById('rw-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'rw-toast';
    toast.textContent = msg;
    toast.style.cssText = `
      position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
      padding:12px 24px;background:linear-gradient(135deg,var(--primary),var(--secondary));
      color:#fff;border-radius:50px;font-size:0.9rem;font-weight:600;z-index:99999;
      box-shadow:0 5px 30px rgba(0,0,0,0.3);animation:fadeInUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = '0.3s'; }, 2000);
    setTimeout(() => toast.remove(), 2500);
  }

  // --- Secret Password Lock (dual confirm change within 1 hour) ---
  const SECRET_PASSWORD = '181261';
  const SECRET_CHANGE_WINDOW = 60 * 60 * 1000; // 1 hour

  async function sha256(str) {
    const data = new TextEncoder().encode(str);
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      try {
        const buf = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {}
    }
    // Simple fallback hash (non-secure contexts / file://)
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < str.length; i++) {
      h1 ^= str.charCodeAt(i); h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 ^= str.charCodeAt(i); h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
    }
    return ('00000000' + (h1 >>> 0).toString(16)).slice(-8) + ('00000000' + (h2 >>> 0).toString(16)).slice(-8);
  }

  function getSecretState() {
    const st = Storage.getData('secretLock') || {};
    return { passwordHash: st.passwordHash || '', pending: st.pending || null };
  }

  async function currentSecretHash() {
    const st = getSecretState();
    return st.passwordHash || sha256(SECRET_PASSWORD);
  }

  function askSecretPassword(cb) {
    const modal = document.getElementById('secret-pin-modal');
    const input = document.getElementById('secret-pin-input');
    if (!modal || !input) { cb(); return; }
    input.value = '';
    modal.classList.remove('hidden');
    const okBtn = document.getElementById('secret-pin-ok');
    const cancelBtn = document.getElementById('secret-pin-cancel');
    const done = async (pass) => {
      const want = await currentSecretHash();
      if ((await sha256(pass)) === want) {
        modal.classList.add('hidden');
        input.value = '';
        cb();
      } else {
        input.value = '';
        input.focus();
        input.style.animation = 'none';
        void input.offsetWidth;
        input.style.animation = 'rwshake 0.4s';
        showToast('Galat password! &#128274;');
      }
    };
    okBtn.onclick = () => done(input.value);
    cancelBtn.onclick = () => { modal.classList.add('hidden'); input.value = ''; };
    input.onkeydown = (e) => { if (e.key === 'Enter') done(input.value); };
    modal.onclick = (e) => { if (e.target === modal) { modal.classList.add('hidden'); input.value = ''; } };
    setTimeout(() => input.focus(), 60);
  }

  function getWhoLabel(id) {
    const names = Storage.getData('names');
    if (id === 'boy') return names.boy || 'Asif';
    return names.girl || 'Shahjadi';
  }

  function secretStatusText(state) {
    const pend = state.pending;
    if (!pend) return 'Abhi koi pending request nahi hai. Dono me se koi bhi naya password daal sakta hai.';
    const remain = SECRET_CHANGE_WINDOW - (Date.now() - pend.at);
    const who = getWhoLabel(pend.by);
    const other = getWhoLabel(pend.by === 'boy' ? 'girl' : 'boy');
    if (remain <= 0) return '&#9203; Purana request khatam ho gaya (1 ghanta). Naya password dobara daalo.';
    const mins = Math.max(1, Math.round(remain / 60000));
    return '&#9203; <b>' + who + '</b> ne naya password request bheja hai. <b>' + other +
      '</b> ko <b>' + mins + ' min</b> ke andar same password daalna hoga.';
  }

  function openSecretChange() {
    const modal = document.getElementById('secret-change-modal');
    const whoSel = document.getElementById('secret-change-who');
    if (!modal || !whoSel) return;
    const who = localStorage.getItem('rw_whoami') || 'boy';
    whoSel.innerHTML = '<option value="boy">' + getWhoLabel('boy') + '</option>' +
                       '<option value="girl">' + getWhoLabel('girl') + '</option>';
    whoSel.value = who;
    document.getElementById('secret-change-input').value = '';
    document.getElementById('secret-change-input2').value = '';
    refreshSecretStatus();
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('secret-change-input').focus(), 60);
  }

  function refreshSecretStatus() {
    const box = document.getElementById('secret-change-status');
    if (!box) return;
    const state = getSecretState();
    const pend = state.pending;
    const me = localStorage.getItem('rw_whoami') || 'boy';
    const ok = !!(pend && pend.by !== me && (Date.now() - pend.at) <= SECRET_CHANGE_WINDOW);
    box.className = 'secret-change-status' + (ok ? ' ok' : '');
    box.innerHTML = secretStatusText(state);
  }

  function setupSecretLock() {
    if (window.__secretLockSetup) return;
    window.__secretLockSetup = true;
    const pinChange = document.getElementById('secret-pin-change');
    if (pinChange) {
      pinChange.onclick = () => {
        document.getElementById('secret-pin-modal').classList.add('hidden');
        openSecretChange();
      };
    }
    const saveBtn = document.getElementById('secret-change-save');
    const cancelBtn = document.getElementById('secret-change-cancel');
    const whoSel = document.getElementById('secret-change-who');
    const modal = document.getElementById('secret-change-modal');
    if (!saveBtn || !modal) return;

    const hide = () => modal.classList.add('hidden');
    saveBtn.onclick = async () => {
      const p1 = document.getElementById('secret-change-input').value.trim();
      const p2 = document.getElementById('secret-change-input2').value.trim();
      const by = whoSel.value;
      localStorage.setItem('rw_whoami', by);
      if (!p1) { showToast('Naya password likho!'); return; }
      if (p1.length < 4) { showToast('Password kam se kam 4 characters ka ho!'); return; }
      if (p1 !== p2) { showToast('Dono password match nahi hua!'); return; }

      const newHash = await sha256(p1);
      const state = getSecretState();
      const now = Date.now();
      let pend = state.pending;
      if (pend && (now - pend.at) > SECRET_CHANGE_WINDOW) pend = null;

      if (!pend) {
        state.pending = { hash: newHash, by: by, at: now };
        Storage.setData('secretLock', state);
        hide();
        showToast('Request save! ' + getWhoLabel(by) + ' ne daala - doosre person ko 1 ghante me same password daalna hai.');
      } else if (pend.hash === newHash && pend.by !== by) {
        state.passwordHash = newHash;
        state.pending = null;
        Storage.setData('secretLock', state);
        hide();
        showToast('Password change ho gaya! &#128276;&#127881;');
        if (typeof triggerConfetti === 'function') triggerConfetti();
      } else if (pend.hash === newHash && pend.by === by) {
        showToast('Aapne pehle hi yahi password daala hai. Doosre person ka wait karo.');
      } else {
        state.pending = { hash: newHash, by: by, at: now };
        Storage.setData('secretLock', state);
        showToast('Match nahi hua. Naya request save. Doosre person ko 1 ghante me same password daalna hai.');
      }
    };
    cancelBtn.onclick = hide;
    modal.onclick = (e) => { if (e.target === modal) hide(); };
    whoSel.onchange = () => localStorage.setItem('rw_whoami', whoSel.value);

    // Live refresh when the other device syncs a pending request
    window.addEventListener('storage-update', (e) => {
      if (e.detail && e.detail.section === 'secretLock') refreshSecretStatus();
    });
  }

  return {
    renderAll, renderNav, renderCouple, renderLoveStory,
    renderTimeline, renderGallery, renderVideos, renderLetters,
    renderParagraphs, renderMemories, renderSecrets, renderCountdown,
    renderGift, renderSurprise, renderWishes, renderVisitors,
    renderFrames, renderDreams, renderQuotes, openLightbox,
    deleteItem, deleteDream, changeMedia, showToast,
    formatDate, escapeHTML, askSecretPassword
  };
})();

// Confetti helper
function triggerConfetti() {
  const colors = ['#ff6b9d', '#c44569', '#f8b500', '#4caf50', '#7c4dff', '#00bcd4'];
  const container = document.body;
  for (let i = 0; i < 100; i++) {
    const conf = document.createElement('div');
    conf.style.cssText = `
      position: fixed;
      top: -10px;
      left: ${Math.random() * 100}vw;
      width: ${5 + Math.random() * 10}px;
      height: ${5 + Math.random() * 10}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      z-index: 30000;
      pointer-events: none;
      animation: confettiFall ${2 + Math.random() * 3}s linear forwards;
    `;
    container.appendChild(conf);
    setTimeout(() => conf.remove(), 5000);
  }
}

// Add confetti animation to page
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
  @keyframes confettiFall {
    0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
`;
document.head.appendChild(confettiStyle);
