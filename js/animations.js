/* ============================================
   GSAP ANIMATIONS MODULE
   ============================================ */

const Animations = (() => {

  function init() {
    gsap.registerPlugin(ScrollTrigger);
    setupScrollAnimations();
    setupSectionAnimations();
  }

  function setupScrollAnimations() {
    // Section titles fade in on scroll
    gsap.utils.toArray('.section-title').forEach(title => {
      gsap.fromTo(title,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: title,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });
  }

  function setupSectionAnimations() {
    // Couple cards
    gsap.utils.toArray('.couple-card').forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 50, scale: 0.9 },
        {
          opacity: 1, y: 0, scale: 1,
          duration: 0.7,
          delay: i * 0.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });

    // Timeline items
    gsap.utils.toArray('.timeline-item').forEach((item, i) => {
      gsap.fromTo(item,
        { opacity: 0, x: -30 },
        {
          opacity: 1, x: 0,
          duration: 0.5,
          delay: i * 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });

    // Gallery items
    gsap.utils.toArray('.gallery-item').forEach((item, i) => {
      gsap.fromTo(item,
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1, scale: 1,
          duration: 0.5,
          delay: i * 0.05,
          ease: 'back.out(1.5)',
          scrollTrigger: {
            trigger: item,
            start: 'top 90%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });

    // Countdown boxes
    gsap.utils.toArray('.countdown-box').forEach((box, i) => {
      gsap.fromTo(box,
        { opacity: 0, y: 30, rotateX: -15 },
        {
          opacity: 1, y: 0, rotateX: 0,
          duration: 0.6,
          delay: i * 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: box,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });

    // Letter cards
    gsap.utils.toArray('.letter-card').forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 30, rotateY: -10 },
        {
          opacity: 1, y: 0, rotateY: 0,
          duration: 0.6,
          delay: i * 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });

    // Dream items
    gsap.utils.toArray('.dream-item').forEach((item, i) => {
      gsap.fromTo(item,
        { opacity: 0, x: -30 },
        {
          opacity: 1, x: 0,
          duration: 0.5,
          delay: i * 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });

    // Quote cards
    gsap.utils.toArray('.quote-card').forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, scale: 0.9 },
        {
          opacity: 1, scale: 1,
          duration: 0.5,
          delay: i * 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });
  }

  // Animate new content added dynamically
  function animateNewElement(el, type = 'fadeUp') {
    const animations = {
      fadeUp: { from: { opacity: 0, y: 30 }, to: { opacity: 1, y: 0 } },
      fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
      scaleIn: { from: { opacity: 0, scale: 0.8 }, to: { opacity: 1, scale: 1 } },
      slideLeft: { from: { opacity: 0, x: -30 }, to: { opacity: 1, x: 0 } },
      slideRight: { from: { opacity: 0, x: 30 }, to: { opacity: 1, x: 0 } },
      flipIn: { from: { opacity: 0, rotateY: -90 }, to: { opacity: 1, rotateY: 0 } }
    };

    const anim = animations[type] || animations.fadeUp;
    gsap.fromTo(el, anim.from, { ...anim.to, duration: 0.5, ease: 'power2.out' });
  }

  // Typing effect
  function typeText(el, text, speed = 50) {
    return new Promise(resolve => {
      el.textContent = '';
      let i = 0;
      const interval = setInterval(() => {
        el.textContent += text[i];
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    });
  }

  // Parallax for section backgrounds
  function setupParallax() {
    gsap.utils.toArray('.section').forEach(section => {
      gsap.to(section, {
        backgroundPositionY: '30%',
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    });
  }

  // Re-initialize for dynamic content
  function refresh() {
    // Kill existing triggers for sections to avoid duplicates
    killAll();
    setupScrollAnimations();
    setupSectionAnimations();
    ScrollTrigger.refresh();
  }

  function killAll() {
    ScrollTrigger.getAll().forEach(st => st.kill());
  }

  return {
    init, refresh, killAll,
    animateNewElement, typeText, setupParallax
  };
})();
