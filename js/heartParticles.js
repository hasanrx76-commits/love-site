/* ============================================
   PARTICLE HEART BACKGROUND
   Thousands of stars combine into a living heart in space.
   Heart formula: x = 16*sin(t)^3, y = 13*cos(t) - 5*cos(2t) - 2*cos(3t) - cos(4t)
   Every particle follows the heart equation (filled + outline),
   exactly mirrored for a perfectly symmetrical shape.
   ============================================ */

const HeartParticles = (() => {
  let canvas = null;
  let ctx = null;
  let dpr = 1;
  let W = 0;
  let H = 0;
  let isMobile = false;
  let rafId = null;

  const TAU = Math.PI * 2;
  const PALETTE_LEN = 32;

  let palette = [];
  let particles = [];
  let smallHearts = [];
  let outline = [];

  let bounds = { xMin: -16, xMax: 16, yMin: -17, yMax: 5.5 };
  let YCENTER = 0;
  let heartMode = 'theme';
  let customColor = { r: 255, g: 107, b: 157 };
  let glowRGB = { r: 255, g: 77, b: 166 };
  let nextSpawn = 1.2;

  // reusable position arrays (no per-frame allocation)
  let px = null, py = null, pfArr = null, sparkArr = null;

  // --- heart formula ---
  function hx(ang, r) {
    const s = Math.sin(ang);
    return 16 * s * s * s * r;
  }
  function hy(ang, r) {
    const c = Math.cos(ang);
    return (13 * c - 5 * Math.cos(2 * ang) - 2 * Math.cos(3 * ang) - Math.cos(4 * ang)) * r;
  }

  function computeBounds() {
    let yMin = 1e9, yMax = -1e9, xMin = 1e9, xMax = -1e9;
    const steps = 720;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * TAU;
      const x = hx(a, 1), y = hy(a, 1);
      if (x < xMin) xMin = x; if (x > xMax) xMax = x;
      if (y < yMin) yMin = y; if (y > yMax) yMax = y;
    }
    bounds = { xMin, xMax, yMin, yMax };
    YCENTER = (yMin + yMax) / 2;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function parseHex(hex) {
    let h = String(hex || '#ff6b9d').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    if (isNaN(n)) return { r: 255, g: 107, b: 157 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  // pink -> purple -> red gradient (theme), single colors (rainbow/custom)
  function buildPalette() {
    palette = [];
    if (heartMode === 'custom') {
      const c = customColor;
      for (let i = 0; i < PALETTE_LEN; i++) palette.push('rgb(' + c.r + ',' + c.g + ',' + c.b + ')');
      glowRGB = { r: c.r, g: c.g, b: c.b };
      return;
    }
    if (heartMode === 'rainbow') {
      for (let i = 0; i < PALETTE_LEN; i++) {
        palette.push('hsl(' + Math.round(i * (360 / PALETTE_LEN)) + ',100%,62%)');
      }
      glowRGB = { r: 255, g: 120, b: 255 };
      return;
    }
    for (let i = 0; i < PALETTE_LEN; i++) {
      const n = i / (PALETTE_LEN - 1);
      let r, g, b;
      if (n < 0.5) {
        const t = n * 2;
        r = lerp(255, 176, t); g = lerp(45, 107, t); b = lerp(99, 255, t);
      } else {
        const t = (n - 0.5) * 2;
        r = lerp(176, 255, t); g = lerp(107, 150, t); b = lerp(255, 214, t);
      }
      palette.push('rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')');
    }
    glowRGB = { r: 255, g: 77, b: 166 };
  }

  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const h2r = function (pp, qq, tt) {
        if (tt < 0) tt += 1;
        if (tt > 1) tt -= 1;
        if (tt < 1 / 6) return pp + (qq - pp) * 6 * tt;
        if (tt < 1 / 2) return qq;
        if (tt < 2 / 3) return pp + (qq - pp) * (2 / 3 - tt) * 6;
        return pp;
      };
      r = h2r(p, q, h + 1 / 3);
      g = h2r(p, q, h);
      b = h2r(p, q, h - 1 / 3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function applyMode(mode, color) {
    if (mode) heartMode = mode;
    if (color) customColor = parseHex(color);
    buildPalette();
  }

  // unit outline used for the small floating hearts
  function buildOutline() {
    outline = [];
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * TAU;
      outline.push({
        x: hx(a, 1) / 16,
        y: (hy(a, 1) - YCENTER) / 16
      });
    }
  }

  function buildParticles() {
    particles = [];
    const count = isMobile ? 1000 : 1200;
    const half = Math.round(count / 2);
    for (let i = 0; i < half; i++) {
      const ang = Math.random() * TAU;
      const r = Math.pow(Math.random(), 0.6); // bias toward outline
      const ry = hy(ang, r);
      const n = Math.min(1, Math.max(0, (ry - bounds.yMin) / (bounds.yMax - bounds.yMin)));
      const pal = Math.round(n * (PALETTE_LEN - 1));
      const size = 0.8 + Math.random() * 1.1;
      const z = (Math.random() * 2 - 1) * 2.6;   // depth
      const sp = Math.random() * TAU;            // sparkle phase
      const fl = Math.random() * TAU;            // flow phase
      const star = Math.random() < 0.03;         // twinkle stars
      particles.push({ ang, r, sgn: 1, z, sp, fl, pal, size, star });
      particles.push({ ang, r, sgn: -1, z, sp, fl, pal, size, star }); // perfect mirror
    }
    px = new Float32Array(particles.length);
    py = new Float32Array(particles.length);
    pfArr = new Float32Array(particles.length);
    sparkArr = new Float32Array(particles.length);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
  }

  function loop() {
    rafId = requestAnimationFrame(loop);
    draw();
  }

  function draw() {
    const t = performance.now() / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // black space background
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#04030a';
    ctx.fillRect(0, 0, W, H);

    // everything below is additive -> neon bloom
    ctx.globalCompositeOperation = 'lighter';

    const cx = W / 2;
    const cy = H / 2;
    const k = Math.min(W, H) * 0.32 * (1 + 0.04 * Math.sin(t * 1.7)); // gentle pulse

    // gentle 3D rotation (never fully edge-on so the heart stays visible)
    const rotY = Math.sin(t * 0.3) * 0.5 + Math.sin(t * 0.11 + 2) * 0.18;
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const rotX = Math.sin(t * 0.22 + 1.3) * 0.14;
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const fov = 340;

    // rainbow mode: one hue that steps every few seconds
    let fillAll = null;
    if (heartMode === 'rainbow') {
      const hue = (Math.floor(t / 3.5) * 137.508) % 360;
      fillAll = 'hsl(' + Math.round(hue) + ',100%,62%)';
      glowRGB = hslToRgb(hue / 360, 1, 0.62);
    } else if (heartMode === 'custom') {
      fillAll = 'rgb(' + customColor.r + ',' + customColor.g + ',' + customColor.b + ')';
    }

    // --- transform all particles (follow heart equation, rotated in 3D) ---
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const ang = p.ang + 0.04 * Math.sin(t * 0.35 + p.fl); // slow drift along heart
      const rx = hx(ang, p.r) * p.sgn;
      const ry = hy(ang, p.r);
      const rz = p.z;
      const x1 = rx * cosY + rz * sinY;
      const z1 = -rx * sinY + rz * cosY;
      const y1 = ry * cosX - z1 * sinX;
      const z2 = ry * sinX + z1 * cosX;
      const pf = fov / (fov + z2 * k);
      pfArr[i] = pf;
      px[i] = cx + x1 * k * pf;
      py[i] = cy + (YCENTER - y1) * k * pf;
      sparkArr[i] = 0.6 + 0.4 * Math.sin(t * 2.1 + p.sp);
    }

    // --- breathing center glow (bloom) ---
    const glowR = Math.min(W, H) * 0.58 * (1 + 0.06 * Math.sin(t * 1.6));
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    g.addColorStop(0, 'rgba(' + glowRGB.r + ',' + glowRGB.g + ',' + glowRGB.b + ',0.22)');
    g.addColorStop(0.5, 'rgba(' + glowRGB.r + ',' + glowRGB.g + ',' + glowRGB.b + ',0.07)');
    g.addColorStop(1, 'rgba(' + glowRGB.r + ',' + glowRGB.g + ',' + glowRGB.b + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // --- thin glowing connection lines ---
    drawLines();

    // --- particle halos + cores + star sparkles ---
    const haloA = isMobile ? 0.16 : 0.22;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const pf = pfArr[i];
      const sp = sparkArr[i];
      const a = 0.8 * pf * (0.5 + 0.5 * sp);
      const r = p.size * 1.6 * pf;
      const col = fillAll || palette[p.pal];
      // soft halo (glow)
      ctx.globalAlpha = a * haloA;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(px[i], py[i], r * 3.4, 0, TAU);
      ctx.fill();
      // bright core
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(px[i], py[i], r, 0, TAU);
      ctx.fill();
      // twinkle star burst
      if (p.star && sp > 0.88) {
        ctx.globalAlpha = (sp - 0.88) * 3 * pf;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px[i], py[i], r * 2.1, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // --- small hearts floating out ---
    updateSmallHearts(t, cx, cy, k);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // spatial-hash grid keeps line finding fast (60 FPS even on phones)
  function drawLines() {
    const n = particles.length;
    if (n < 2) return;
    const spacing = Math.sqrt((W * H) / n);
    const cell = Math.max(12, Math.min(90, spacing * 2.2));
    const cols = Math.ceil(W / cell) + 1;
    const rows = Math.ceil(H / cell) + 1;
    const gridSize = cols * rows;
    const head = new Int32Array(gridSize).fill(-1);
    const next = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const gx = Math.floor(px[i] / cell);
      const gy = Math.floor(py[i] / cell);
      const idx = gx + gy * cols;
      next[i] = head[idx];
      head[idx] = i;
    }
    const d2 = cell * cell;
    const maxLines = isMobile ? 1200 : 2000;
    let count = 0;
    ctx.beginPath();
    for (let i = 0; i < n && count < maxLines; i++) {
      const gx = Math.floor(px[i] / cell);
      const gy = Math.floor(py[i] / cell);
      for (let dy = -1; dy <= 1 && count < maxLines; dy++) {
        for (let dx = -1; dx <= 1 && count < maxLines; dx++) {
          const ci = (gx + dx) + (gy + dy) * cols;
          if (ci < 0 || ci >= gridSize) continue;
          let j = head[ci];
          while (j !== -1 && count < maxLines) {
            if (j > i) {
              const ax = px[i] - px[j];
              const ay = py[i] - py[j];
              if (ax * ax + ay * ay < d2) {
                ctx.moveTo(px[i], py[i]);
                ctx.lineTo(px[j], py[j]);
                count++;
              }
            }
            j = next[j];
          }
        }
      }
    }
    ctx.globalAlpha = isMobile ? 0.10 : 0.14;
    ctx.strokeStyle = 'rgba(255,150,255,1)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function updateSmallHearts(t, cx, cy, k) {
    if (t >= nextSpawn && smallHearts.length < 6) {
      const ang = Math.random() * TAU;
      const rx = hx(ang, 1);
      const ry = hy(ang, 1);
      smallHearts.push({
        x: cx + rx * k * 0.92,
        y: cy + (YCENTER - ry) * k * 0.92,
        t0: t,
        life: 3.4,
        size: 7 + Math.random() * 11,
        vy: 16 + Math.random() * 14,
        vx: (Math.random() * 2 - 1) * 7,
        drift: Math.random() * TAU
      });
      nextSpawn = t + 1.6 + Math.random() * 1.8;
    }
    for (let i = smallHearts.length - 1; i >= 0; i--) {
      const h = smallHearts[i];
      const age = t - h.t0;
      if (age >= h.life) { smallHearts.splice(i, 1); continue; }
      const pr = age / h.life;
      const alpha = Math.sin(Math.PI * pr);
      const x = h.x + h.vx * age + Math.sin(age * 2 + h.drift) * 6;
      const y = h.y - h.vy * age;
      const size = h.size * (1 + 0.5 * Math.sin(pr * Math.PI * 3));
      const col = 'rgb(' + glowRGB.r + ',' + glowRGB.g + ',' + glowRGB.b + ')';
      // glow halo
      ctx.globalAlpha = alpha * 0.28;
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let j = 0; j < outline.length; j++) {
        const ox = x + outline[j].x * size;
        const oy = y + outline[j].y * size;
        if (j === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
      }
      ctx.closePath();
      ctx.fill();
      // bright core
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath();
      for (let j = 0; j < outline.length; j++) {
        const ox = x + outline[j].x * size * 0.55;
        const oy = y + outline[j].y * size * 0.55;
        if (j === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  function init() {
    canvas = document.getElementById('heart-particles-canvas');
    if (!canvas || typeof canvas.getContext !== 'function') return;
    ctx = canvas.getContext('2d');
    isMobile = window.innerWidth < 768;
    computeBounds();
    buildOutline();
    const effects = (typeof Storage !== 'undefined' && Storage.getData) ? Storage.getData('effects') : null;
    if (effects) {
      heartMode = effects.heartMode || 'theme';
      customColor = parseHex(effects.heartCustomColor);
    }
    buildPalette();
    buildParticles();
    resize();
    window.addEventListener('resize', resize);
    loop();
  }

  return { init, applyMode };
})();
