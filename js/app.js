/* ============================================
   MAIN APP CONTROLLER
   ============================================ */

(function () {
  'use strict';

  // --- Loading Screen ---
  const loadingFill = document.querySelector('.loader-fill');
  let loadProgress = 0;

  function updateLoadProgress(target) {
    const step = () => {
      if (loadProgress < target) {
        loadProgress += 2;
        if (loadingFill) loadingFill.style.width = loadProgress + '%';
        requestAnimationFrame(step);
      }
    };
    step();
  }

  // --- Welcome Screen ---
  function showWelcome() {
    const loadingScreen = document.getElementById('loading-screen');
    const welcomeScreen = document.getElementById('welcome-screen');

    updateLoadProgress(100);

    setTimeout(() => {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        welcomeScreen.classList.remove('hidden');
        welcomeScreen.style.opacity = '0';
        welcomeScreen.style.transition = 'opacity 0.8s ease';
        requestAnimationFrame(() => { welcomeScreen.style.opacity = '1'; });
      }, 800);
    }, 1200);
  }

  function enterSite() {
    const welcomeScreen = document.getElementById('welcome-screen');
    const mainContent = document.getElementById('main-content');

    welcomeScreen.style.opacity = '0';
    setTimeout(() => {
      welcomeScreen.style.display = 'none';
      mainContent.classList.remove('hidden');
      mainContent.style.opacity = '0';
      mainContent.style.transition = 'opacity 0.6s ease';
      requestAnimationFrame(() => { mainContent.style.opacity = '1'; });

      // Initialize everything
      initAll();
    }, 600);
  }

  // --- Initialize Everything ---
  function initAll() {
    updateLoadProgress(30);

    // Load saved styles
    const style = Storage.getData('style');
    Customizer.applyStyles(style);

    updateLoadProgress(40);

    // Init 3D scene
    try {
      Scene3D.init();
      const effects = Storage.getData('effects');
      Scene3D.applyEffects(effects);
    } catch (err) {
      console.warn('3D scene init failed:', err);
    }

    updateLoadProgress(60);

    // Render all sections
    Sections.renderAll();

    updateLoadProgress(75);

    // Init GSAP animations
    Animations.init();

    updateLoadProgress(85);

    // Init customizer
    Customizer.init();

    // Init games
    Games.init();

    // Init particle heart (Our Love Story section)
    try { HeartParticles.init(); } catch (e) { console.warn('Particle heart init failed:', e); }

    // Init cloud sync (Firebase). Falls back to local mode if no config.
    try { Cloud.init(); } catch (e) { console.warn('Cloud init failed:', e); }

    // Invite link auto-join: partner opens ...?c=LOVE-XXXXXX and connects instantly
    try {
      if (typeof Cloud !== 'undefined' && Cloud.onStatus) {
        Cloud.onStatus((status) => {
          if (status === 'nosync') {
            const invite = new URLSearchParams(window.location.search).get('c');
            if (invite) {
              Cloud.joinCouple(invite).then((ok) => {
                if (ok) {
                  Sections.showToast('Connected with your love! &#128150;');
                  const url = new URL(window.location.href);
                  url.searchParams.delete('c');
                  window.history.replaceState({}, '', url);
                }
              });
            }
          }
        });
      }
    } catch (e) { console.warn('Invite auto-join failed:', e); }

    // Init PeerJS sync only when cloud is not available
    if (!(typeof Cloud !== 'undefined' && Cloud.isEnabled())) {
      try { Sync.init(); } catch (e) { console.warn('Sync init failed:', e); }
    }

    updateLoadProgress(95);

    // Setup navigation
    setupNavigation();

    // Setup smooth scrolling
    setupSmoothScroll();

    // Setup gift box
    Sections.renderGift();

    // Setup surprise
    Sections.renderSurprise();

    updateLoadProgress(100);

    // Check for special dates (confetti)
    checkSpecialDates();

    // Re-render when a remote change arrives from the cloud
    window.addEventListener('storage-update', (e) => {
      if (e.detail && e.detail.cloudSnapshot) {
        applyCloudSnapshot(e.detail.section);
      }
    });

    console.log('All systems initialized!');
  }

  // Apply a cloud snapshot: update the UI for the changed section only
  function applyCloudSnapshot(section) {
    try {
      const S = Sections;
      const C = Customizer;
      if (S) {
        const map = {
          names: ['renderNav', 'renderCouple'],
          photos: ['renderCouple'],
          about: ['renderCouple'],
          dates: ['renderCountdown', 'renderCouple'],
          content: ['renderLoveStory', 'renderSurprise', 'renderGift'],
          loveLetters: ['renderLetters'],
          paragraphs: ['renderLoveStory'],
          memories: ['renderMemories'],
          secrets: ['renderSecrets'],
          timeline: ['renderTimeline'],
          quotes: ['renderQuotes'],
          wishes: ['renderWishes'],
          gallery: ['renderGallery'],
          videos: ['renderVideos'],
          music: [],
          visitors: ['renderVisitors']
        };
        if (map[section]) {
          map[section].forEach(fn => { if (typeof S[fn] === 'function') S[fn](); });
        } else {
          S.renderAll();
        }
      }
      if (section === 'style' || section === 'effects' || section === 'loveTheme') {
        if (section === 'style' && C && C.applyStyles) C.applyStyles(Storage.getData('style'));
        if (section === 'effects') {
          if (window.Scene3D && Scene3D.applyEffects) Scene3D.applyEffects(Storage.getData('effects'));
          if (window.HeartParticles && HeartParticles.applyMode) {
            const fx = Storage.getData('effects');
            HeartParticles.applyMode(fx.heartMode, fx.heartCustomColor);
          }
        }
        if (section === 'loveTheme' && C && C.applyLoveTheme) {
          C.applyLoveTheme(Storage.getData('loveTheme') || 'rose');
        }
        if (C && C.populateAllFields) C.populateAllFields();
      }
      if (C && C.renderAdminLists) C.renderAdminLists();
    } catch (err) {
      console.warn('applyCloudSnapshot error:', err);
    }
  }

  // --- Navigation ---
  function setupNavigation() {
    const hamburger = document.getElementById('nav-hamburger');
    const navLinks = document.getElementById('nav-links');

    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('open');
    });

    // Close nav on link click (mobile)
    navLinks.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
      }
    });

    // Nav scroll effect
    window.addEventListener('scroll', () => {
      const nav = document.getElementById('main-nav');
      if (window.scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });
  }

  // --- Smooth Scroll ---
  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          const offset = 80;
          const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  // --- Special Dates Check ---
  function checkSpecialDates() {
    const dates = Storage.getData('dates');
    const effects = Storage.getData('effects');
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (effects.confetti) {
      if (dates.anniversary === todayStr || dates.boyBirthday === todayStr || dates.girlBirthday === todayStr) {
        setTimeout(() => triggerConfetti(), 2000);
      }
    }
  }

  // --- Event Listeners ---
  document.addEventListener('DOMContentLoaded', () => {
    // Enter button
    const enterBtn = document.getElementById('enter-btn');
    if (enterBtn) {
      enterBtn.addEventListener('click', enterSite);
    }

    // Start loading
    showWelcome();
  });

  // --- Keyboard shortcuts ---
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+A = toggle admin panel
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      const panel = document.getElementById('admin-panel');
      panel.classList.toggle('open');
      document.body.classList.toggle('admin-mode');
    }
  });

  // --- Storage full warning ---
  window.addEventListener('storage-full', () => {
    if (window.Sections && Sections.showToast) {
      Sections.showToast('Device storage is full! Delete some photos or videos first.');
    }
  });

  // --- Service Worker for PWA ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        // SW not available, that's fine
      });
    });
  }

})();
