/* ============================================================
   Astro+ महासंगम — Site-wide Canvas Starfield
   Pure Canvas 2D · zero CDN · mouse + scroll reactive · 3 depth layers
   Perf: starts after window load + idle, pauses when tab hidden,
   DPR capped, mobile gets a reduced star budget and no nebula.
   ============================================================ */

(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('siteStars');
  if (!canvas) return;

  const isMobile = window.innerWidth < 768;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  // ── Sizing ──────────────────────────────────────────────────
  let W = 0, H = 0;
  const DPR = Math.min(devicePixelRatio || 1, isMobile ? 1.5 : 2);

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(resize, 150);
  }, { passive: true });
  resize();

  // ── Helpers ─────────────────────────────────────────────────
  function rnd(min, max) { return min + Math.random() * (max - min); }
  function rndInt(min, max) { return (min + Math.random() * (max - min)) | 0; }

  // ── Stars (3 depth layers) ──────────────────────────────────
  const TOTAL = isMobile ? 110 : window.innerWidth > 1280 ? 440 : 300;

  const stars = Array.from({ length: TOTAL }, () => {
    const depth = rnd(0.15, 1);       // 0.15 = far, 1 = close to camera
    const isGold = Math.random() < 0.38;
    const bri   = rndInt(185, 255);
    return {
      bx:    Math.random(),            // base position [0-1]
      by:    Math.random(),
      depth,
      baseR: rnd(0.35, 1.1) * depth,  // radius grows with proximity
      phase: rnd(0, Math.PI * 2),
      speed: rnd(0.5, 1.6),
      r: isGold ? rndInt(195, 225) : bri,
      g: isGold ? rndInt(145, 175) : bri,
      b: isGold ? rndInt(20,  50)  : Math.min(255, bri + 15),
    };
  });

  // ── Nebula blobs (desktop only — gradients are the costly part) ──
  const NEBULA = isMobile ? [] : [
    { bx: 0.50, by: 0.35, r: 260, ph: 0,   sp: 0.08, col: [212, 170, 45]  },
    { bx: 0.28, by: 0.62, r: 180, ph: 1.4, sp: 0.12, col: [80,  50, 160]  },
    { bx: 0.72, by: 0.55, r: 200, ph: 2.8, sp: 0.10, col: [27,  42,  90]  },
    { bx: 0.15, by: 0.25, r: 140, ph: 0.7, sp: 0.15, col: [212, 160, 30]  },
    { bx: 0.85, by: 0.30, r: 160, ph: 3.5, sp: 0.09, col: [60,  30, 130]  },
    { bx: 0.50, by: 0.78, r: 220, ph: 1.8, sp: 0.07, col: [27,  42,  74]  },
  ];

  // ── Shooting stars ──────────────────────────────────────────
  const shooters   = [];
  let nextShootAt  = rnd(4000, 9000);

  function spawnShooter(elapsed) {
    shooters.push({
      x:    rnd(0.05, 0.85),
      y:    rnd(0.03, 0.35),
      vx:   rnd(0.0035, 0.006),
      vy:   rnd(0.001, 0.0025),
      len:  rnd(90, 200),
      born: elapsed,
    });
  }

  // ── Mouse + scroll (depth parallax inputs) ──────────────────
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  let scrollNorm = 0;

  if (!isMobile) {
    window.addEventListener('mousemove', e => {
      tmx = (e.clientX / window.innerWidth  - 0.5) * 2;
      tmy = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  window.addEventListener('scroll', () => {
    scrollNorm = window.scrollY / H;
  }, { passive: true });

  // ── Render ──────────────────────────────────────────────────
  let startMs  = performance.now();
  let pausedAt = 0;
  let rafId    = null;

  function draw(now) {
    rafId = requestAnimationFrame(draw);

    const elapsed = now - startMs;
    const t = elapsed * 0.001;

    mx += (tmx - mx) * 0.04;
    my += (tmy - my) * 0.04;

    ctx.clearRect(0, 0, W, H);

    // ── Nebula layer ──────────────────────────────────────────
    for (const n of NEBULA) {
      const ox = Math.sin(t * n.sp + n.ph)        * 0.025 * W;
      const oy = Math.cos(t * n.sp + n.ph * 1.3)  * 0.018 * H;
      const px = n.bx * W + ox;
      const py = ((n.by + scrollNorm * 0.06) % 1) * H + oy;
      const a  = 0.06 + 0.03 * Math.sin(t * 0.35 + n.ph);

      const grd = ctx.createRadialGradient(px, py, 0, px, py, n.r);
      grd.addColorStop(0, `rgba(${n.col[0]},${n.col[1]},${n.col[2]},${a.toFixed(3)})`);
      grd.addColorStop(0.5, `rgba(${n.col[0]},${n.col[1]},${n.col[2]},${(a * 0.3).toFixed(3)})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(px, py, n.r, n.r * 0.65, t * 0.02 + n.ph, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Star layer — mouse sways X/Y, scroll drifts Y by depth ──
    for (const s of stars) {
      const twinkle  = 0.40 + 0.60 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      const px       = s.bx * W + mx * s.depth * 22;
      // wrap so stars recycle as the page scrolls — deeper stars drift more (3D feel)
      let py = (s.by - scrollNorm * s.depth * 0.22) % 1;
      if (py < 0) py += 1;
      py = py * H + my * s.depth * 14;
      const r        = s.baseR;
      const aStr     = twinkle.toFixed(3);
      const colStr   = `${s.r},${s.g},${s.b}`;

      // Soft glow for stars larger than 0.65px
      if (r > 0.65) {
        const glowR = r * 5;
        const grd   = ctx.createRadialGradient(px, py, 0, px, py, glowR);
        grd.addColorStop(0, `rgba(${colStr},${(twinkle * 0.35).toFixed(3)})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(px, py, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Core dot
      ctx.fillStyle = `rgba(${colStr},${aStr})`;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Shooting stars ────────────────────────────────────────
    if (elapsed > nextShootAt) {
      spawnShooter(elapsed);
      nextShootAt += rnd(5000, 12000);
    }

    for (let i = shooters.length - 1; i >= 0; i--) {
      const sh  = shooters[i];
      const age = (elapsed - sh.born) * 0.001;
      const a   = Math.max(0, 1 - age * 1.4);

      if (a <= 0) { shooters.splice(i, 1); continue; }

      const x1 = sh.x * W;
      const y1 = sh.y * H;
      sh.x += sh.vx;
      sh.y += sh.vy;
      const x2 = sh.x * W;
      const y2 = sh.y * H;

      const tlen = Math.min(sh.len, Math.hypot(x2 - x1, y2 - y1) * 60);
      const x0   = x2 - (x2 - x1) / Math.hypot(x2 - x1, y2 - y1) * tlen;
      const y0   = y2 - (y2 - y1) / Math.hypot(x2 - x1, y2 - y1) * tlen;

      const g = ctx.createLinearGradient(x0, y0, x2, y2);
      g.addColorStop(0, 'rgba(255,255,220,0)');
      g.addColorStop(0.7, `rgba(255,248,200,${(a * 0.6).toFixed(3)})`);
      g.addColorStop(1, `rgba(255,255,240,${a.toFixed(3)})`);

      ctx.save();
      ctx.strokeStyle = g;
      ctx.lineWidth   = 1.8;
      ctx.shadowColor = `rgba(255,240,160,${(a * 0.8).toFixed(2)})`;
      ctx.shadowBlur  = 4;
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function start() {
    if (!rafId) {
      if (pausedAt) { startMs += performance.now() - pausedAt; pausedAt = 0; }
      rafId = requestAnimationFrame(draw);
    }
  }

  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; pausedAt = performance.now(); }
  }

  // Pause when the tab is hidden — zero background CPU
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : start();
  });

  // ── Boot: wait for full load, then idle — protects LCP/TBT ──
  function boot() {
    start();
    // Fade in after 2 frames to avoid first-frame flash
    requestAnimationFrame(() => requestAnimationFrame(() => canvas.classList.add('gl-ready')));
  }

  if (document.readyState === 'complete') {
    ('requestIdleCallback' in window) ? requestIdleCallback(boot, { timeout: 1500 }) : setTimeout(boot, 200);
  } else {
    window.addEventListener('load', () => {
      ('requestIdleCallback' in window) ? requestIdleCallback(boot, { timeout: 1500 }) : setTimeout(boot, 200);
    }, { once: true });
  }

})();
