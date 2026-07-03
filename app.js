/* ============================================
   Astro+ महासंगम — Application Logic v2
   Router, Loader, Parallax, Tilt, Scroll FX
   ============================================ */

(function () {
  'use strict';

  // ===== CONFIG =====
  const SCROLL_THRESHOLD = 60;
  const REVEAL_THRESHOLD = 0.12;
  const COUNTER_DURATION = 2000;
  const TILT_MAX = 8;
  const LOADER_MIN_MS = 2400;
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = () => window.innerWidth >= 1024 && matchMedia('(hover: hover)').matches;
  const isMobileDevice = window.innerWidth < 768;
  const isSlowConn = (() => {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return c && /^(slow-2g|2g|3g)$/.test(c.effectiveType);
  })();

  // ===== DOM REFS =====
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const floatingCta = document.getElementById('floatingCta');
  const pageLoader = document.getElementById('pageLoader');
  const loaderFill = document.getElementById('loaderFill');
  const loaderPercent = document.getElementById('loaderPercent');
  const scrollProgress = document.getElementById('scrollProgress');
  const cursorGlow = document.getElementById('cursorGlow');
  const heroWheel = document.getElementById('heroWheel');
  const heroConstellation = document.getElementById('heroConstellation');
  const pages = document.querySelectorAll('[data-page]');
  const navLinks = document.querySelectorAll('.nav-link');

  // ===== INIT =====
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    document.body.classList.add('loading');
    runLoader();

    setupRouter();
    setupScrollEffects();
    setupRevealObserver();
    setupFaqAccordion();
    setupTabs();
    setupMobileMenu();
    setupSmoothLinks();
    setupCounters();
    setupCursorGlow();
    setupCardTilt();
    setupButtonRipple();
    setupMagneticButtons();
    setupHeroParallax();
    setupHeroConstellation();
    setupTimelineDraw();
    setupFloatingOrbs();
    setupSpeakerCardFlip();

    handleRoute();
  }

  // ===== SPEAKER CARD FLIP (touch / click for non-hover devices) =====
  function setupSpeakerCardFlip() {
    // On touch-only devices hover doesn't fire — use click to toggle .flipped
    // On pointer devices the CSS :hover handles it, but click also works as a toggle
    document.addEventListener('click', function (e) {
      const card = e.target.closest('.speaker-card');
      if (!card || !card.querySelector('.speaker-card-inner')) return;

      // If a hover device, let CSS handle it unless it's a real click intent
      if (matchMedia('(hover: hover)').matches) return;

      card.classList.toggle('flipped');

      // Auto-unflip after 3.5 s on touch so it doesn't stay stuck
      if (card.classList.contains('flipped')) {
        clearTimeout(card._flipTimer);
        card._flipTimer = setTimeout(() => card.classList.remove('flipped'), 3500);
      }
    });
  }

  // ===== LOADER =====
  function runLoader() {
    if (!pageLoader) return;

    if (isMobileDevice || isSlowConn) { dismissLoader(); return; }

    const start = performance.now();

    function tick() {
      const elapsed = performance.now() - start;
      // Power-curve: fast ramp-up, smooth finish — no artificial stalling at 99%
      const t = Math.min(1, elapsed / LOADER_MIN_MS);
      const progress = Math.round(Math.pow(t, 0.65) * 100);
      if (loaderFill) loaderFill.style.width = progress + '%';
      if (loaderPercent) loaderPercent.textContent = progress;

      if (t < 1 || document.readyState !== 'complete') {
        requestAnimationFrame(tick);
      } else {
        if (loaderFill) loaderFill.style.width = '100%';
        if (loaderPercent) loaderPercent.textContent = 100;
        setTimeout(dismissLoader, 80);
      }
    }

    requestAnimationFrame(tick);
    setTimeout(dismissLoader, 6000); // Safety net
  }

  function dismissLoader() {
    if (!pageLoader || pageLoader.classList.contains('hidden')) return;
    pageLoader.style.pointerEvents = 'none';
    pageLoader.classList.add('hidden');
    document.body.classList.remove('loading');
    setTimeout(() => { pageLoader.style.display = 'none'; }, 500);
  }

  // ===== ROUTER =====
  function setupRouter() {
    window.addEventListener('hashchange', handleRoute);
  }

  function handleRoute() {
    let hash = window.location.hash.replace('#', '') || 'home';
    const pageNames = Array.from(pages).map(p => p.getAttribute('data-page'));
    if (!pageNames.includes(hash)) hash = 'home';

    const outgoing = document.querySelector('.page.active');
    if (outgoing && outgoing.getAttribute('data-page') !== hash) {
      outgoing.classList.add('exiting');
      setTimeout(() => outgoing.classList.remove('exiting'), 350);
    }

    pages.forEach(page => {
      page.classList.toggle('active', page.getAttribute('data-page') === hash);
    });

    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-page') === hash);
    });

    window.scrollTo({ top: 0, behavior: 'instant' });
    closeMobileMenu();
    setTimeout(reobserveReveals, 100);
  }

  window.navigateTo = function (page, anchor) {
    window.location.hash = page;
    if (anchor) {
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  };

  // ===== SMOOTH LINKS =====
  function setupSmoothLinks() {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const href = link.getAttribute('href');
      const scrollTarget = link.getAttribute('data-scroll');
      const hash = href.replace('#', '');
      const pageNames = Array.from(pages).map(p => p.getAttribute('data-page'));

      if (pageNames.includes(hash)) {
        e.preventDefault();
        if (window.location.hash === '#' + hash) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.location.hash = hash;
        }

        if (scrollTarget) {
          setTimeout(() => {
            const el = document.getElementById(scrollTarget);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 400);
        }
      } else if (document.getElementById(hash)) {
        // Anchor within current page
        e.preventDefault();
        const el = document.getElementById(hash);
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // ===== SCROLL EFFECTS =====
  function setupScrollEffects() {
    let ticking = false;

    function update() {
      const scrollY = window.scrollY;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docH > 0 ? (scrollY / docH) * 100 : 0;

      if (scrollProgress) scrollProgress.style.width = pct + '%';

      if (navbar) navbar.classList.toggle('scrolled', scrollY > SCROLL_THRESHOLD);

      if (floatingCta) {
        const show = scrollY > window.innerHeight * 0.6 && window.innerWidth <= 1023;
        floatingCta.classList.toggle('visible', show);
        floatingCta.style.display = show ? 'flex' : '';
      }

      // Hero parallax via transform
      if (!prefersReducedMotion) {
        document.querySelectorAll('[data-parallax]').forEach(el => {
          const speed = parseFloat(el.getAttribute('data-parallax')) || 0.2;
          const rect = el.getBoundingClientRect();
          const inView = rect.bottom > 0 && rect.top < window.innerHeight;
          if (inView) {
            const y = scrollY * speed;
            const baseTransform = el.dataset.baseTransform || '';
            el.style.transform = `${baseTransform} translate3d(0, ${y}px, 0)`;
          }
        });
      }

      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  // ===== REVEAL ON SCROLL =====
  let revealObserver;

  function setupRevealObserver() {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: REVEAL_THRESHOLD, rootMargin: '0px 0px -40px 0px' }
    );

    observeReveals();
  }

  function observeReveals() {
    document.querySelectorAll('.reveal:not(.visible), .reveal-stagger:not(.visible)').forEach(el => {
      revealObserver.observe(el);
    });
  }

  function reobserveReveals() {
    const activePage = document.querySelector('.page.active');
    if (activePage) {
      activePage.querySelectorAll('.reveal:not(.visible), .reveal-stagger:not(.visible)').forEach(el => {
        revealObserver.observe(el);
      });
    }
  }

  // ===== ANIMATED COUNTERS =====
  function setupCounters() {
    const counters = document.querySelectorAll('.stat-number[data-count]');
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            const item = entry.target.closest('.stat-item');
            if (item) setTimeout(() => item.classList.add('counted'), 200);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach(c => counterObserver.observe(c));
  }

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-count'));
    const suffix = el.textContent.includes('+') ? '+' : '';
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / COUNTER_DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      el.textContent = current.toLocaleString('en-IN') + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  // ===== FAQ =====
  function setupFaqAccordion() {
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', function () {
        const item = this.closest('.faq-item');
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item.open').forEach(o => {
          if (o !== item) o.classList.remove('open');
        });
        item.classList.toggle('open', !isOpen);
      });
    });
  }

  // ===== TABS =====
  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const tabId = this.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.toggle('active', content.getAttribute('data-tab-content') === tabId);
        });
      });
    });
  }

  // ===== MOBILE MENU =====
  function setupMobileMenu() {
    if (!hamburger) return;
    hamburger.addEventListener('click', function () {
      this.classList.contains('open') ? closeMobileMenu() : openMobileMenu();
    });
    document.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });
  }

  function openMobileMenu() {
    if (!hamburger) return;
    hamburger.classList.add('open');
    mobileMenu.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    if (!hamburger) return;
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ===== CURSOR GLOW =====
  function setupCursorGlow() {
    if (!cursorGlow || prefersReducedMotion) return;
    if (!isDesktop()) return;

    let raf = null;
    let tx = 0, ty = 0, cx = 0, cy = 0;

    document.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!document.body.classList.contains('cursor-active')) {
        document.body.classList.add('cursor-active');
      }
      if (!raf) raf = requestAnimationFrame(animateGlow);
    });

    document.addEventListener('mouseleave', () => {
      document.body.classList.remove('cursor-active');
    });

    function animateGlow() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursorGlow.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) {
        raf = requestAnimationFrame(animateGlow);
      } else {
        raf = null;
      }
    }
  }

  // ===== CARD TILT + cursor-tracked highlight =====
  function setupCardTilt() {
    if (!isDesktop() || prefersReducedMotion) return;
    const tiltSelector = '.card, .card-cream, .speaker-card, .chief-guest-card, .pricing-card, .routing-card, .step-card, .sponsor-tier, .jury-card, .consult-price-card';
    document.querySelectorAll(tiltSelector).forEach(card => {
      let raf = null;
      let targetRx = 0, targetRy = 0;
      let rx = 0, ry = 0;
      let rect = null, cx = 0, cy = 0;

      card.addEventListener('mouseenter', () => {
        rect = card.getBoundingClientRect();
        cx = rect.width / 2;
        cy = rect.height / 2;
      });

      card.addEventListener('mousemove', (e) => {
        if (!rect) {
          rect = card.getBoundingClientRect();
          cx = rect.width / 2;
          cy = rect.height / 2;
        }
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        card.style.setProperty('--mx', mx + 'px');
        card.style.setProperty('--my', my + 'px');

        targetRy = ((mx - cx) / cx) * TILT_MAX;
        targetRx = -((my - cy) / cy) * TILT_MAX;
        if (!raf) raf = requestAnimationFrame(animate);
      });

      card.addEventListener('mouseleave', () => {
        rect = null;
        targetRx = 0;
        targetRy = 0;
        if (!raf) raf = requestAnimationFrame(animate);
      });

      function animate() {
        rx += (targetRx - rx) * 0.18;
        ry += (targetRy - ry) * 0.18;
        if (Math.abs(rx) < 0.05 && Math.abs(ry) < 0.05 && targetRx === 0 && targetRy === 0) {
          card.style.transform = '';
          raf = null;
          return;
        }
        card.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-6px)`;
        raf = requestAnimationFrame(animate);
      }
    });
  }

  // ===== BUTTON RIPPLE =====
  function setupButtonRipple() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn) return;
      if (prefersReducedMotion) return;

      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 700);
    });
  }

  // ===== MAGNETIC BUTTON PHYSICS =====
  function setupMagneticButtons() {
    if (prefersReducedMotion || !isDesktop()) return;
    document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
      let rect = null, cx = 0, cy = 0;
      btn.addEventListener('mouseenter', () => {
        rect = btn.getBoundingClientRect();
        cx = rect.left + rect.width / 2;
        cy = rect.top + rect.height / 2;
      });
      btn.addEventListener('mousemove', (e) => {
        if (!rect) return;
        const x = e.clientX - cx;
        const y = e.clientY - cy;
        btn.style.transform = `translate3d(${x * 0.25}px, ${y * 0.25}px, 0) scale(1.03)`;
      });
      btn.addEventListener('mouseleave', () => {
        rect = null;
        btn.style.transform = '';
      });
    });
  }

  // ===== HERO PARALLAX (mouse-tilt on wheel) =====
  function setupHeroParallax() {
    if (!heroWheel || prefersReducedMotion) return;

    const hero = document.getElementById('hero');
    if (!hero) return;

    let tx = 0, ty = 0, cx = 0, cy = 0;
    let raf = null;
    let rect = null;

    hero.addEventListener('mouseenter', () => {
      rect = hero.getBoundingClientRect();
    });

    hero.addEventListener('mousemove', (e) => {
      if (!isDesktop()) return;
      if (!rect) rect = hero.getBoundingClientRect();
      tx = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
      ty = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
      if (!raf) raf = requestAnimationFrame(animate);
    });

    hero.addEventListener('mouseleave', () => {
      rect = null;
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(animate);
    });

    function animate() {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      heroWheel.style.transform = `translate(-50%, -50%) translate3d(${cx}px, ${cy}px, 0)`;
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
        raf = requestAnimationFrame(animate);
      } else {
        raf = null;
      }
    }
  }

  // ===== HERO CONSTELLATION =====
  function setupHeroConstellation() {
    if (!heroConstellation || prefersReducedMotion) return;
    if (window.innerWidth < 768) return;

    const ctx = heroConstellation.getContext('2d');
    let stars = [];
    let lines = [];
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w, h;

    function resize() {
      const parent = heroConstellation.parentElement;
      w = parent.clientWidth;
      h = parent.clientHeight;
      heroConstellation.width = w * dpr;
      heroConstellation.height = h * dpr;
      heroConstellation.style.width = w + 'px';
      heroConstellation.style.height = h + 'px';
      ctx.scale(dpr, dpr);
      seed();
    }

    function seed() {
      stars = [];
      lines = [];
      const count = Math.min(30, Math.max(14, Math.floor(w * h / 30000)));
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.85,
          r: Math.random() * 1.2 + 0.4,
          tw: Math.random() * Math.PI * 2,
          tws: 0.01 + Math.random() * 0.02
        });
      }
      const maxDist = Math.min(w, h) * 0.18;
      for (let i = 0; i < stars.length; i++) {
        let closest = -1;
        let closestD = Infinity;
        for (let j = i + 1; j < stars.length; j++) {
          const d = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
          if (d < maxDist && d < closestD) { closestD = d; closest = j; }
        }
        if (closest !== -1) lines.push([i, closest, closestD]);
      }
    }

    let startT = performance.now();
    let pausedAt = 0;
    let rafId = null;

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      const elapsed = (t - startT) / 1000;
      const drawProgress = Math.min(1, elapsed / 1.6);

      ctx.lineWidth = 0.5;
      lines.forEach((ln, i) => {
        const a = stars[ln[0]];
        const b = stars[ln[1]];
        const localStart = (i / lines.length) * 0.7;
        const p = Math.max(0, Math.min(1, (drawProgress - localStart) / 0.3));
        if (p <= 0) return;
        const ex = a.x + (b.x - a.x) * p;
        const ey = a.y + (b.y - a.y) * p;
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, 'rgba(212,175,55,0.35)');
        grad.addColorStop(1, 'rgba(212,175,55,0.15)');
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      });

      stars.forEach(s => {
        s.tw += s.tws;
        const a = 0.55 + Math.sin(s.tw) * 0.35;
        ctx.fillStyle = `rgba(240, 208, 96, ${a * Math.min(1, drawProgress + 0.3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      rafId = requestAnimationFrame(draw);
    }

    // Pause the loop when the hero scrolls off-screen
    const heroEl = document.getElementById('hero');
    if (heroEl) {
      new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            if (!rafId) {
              if (pausedAt) { startT += performance.now() - pausedAt; pausedAt = 0; }
              rafId = requestAnimationFrame(draw);
            }
          } else {
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; pausedAt = performance.now(); }
          }
        });
      }, { threshold: 0.01 }).observe(heroEl);
    } else {
      rafId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      resize();
    });

    setTimeout(() => heroConstellation.classList.add('lit'), 400);
  }

  // ===== TIMELINE DRAW-IN =====
  function setupTimelineDraw() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('.timeline').forEach(t => observer.observe(t));
  }

  // ===== FORM HANDLING =====
  window.handleFormSubmit = function (e) {
    e.preventDefault();
    const form = e.target;
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
      const group = field.closest('.form-group');
      if (!field.value.trim()) {
        group.classList.add('error');
        isValid = false;
      } else {
        group.classList.remove('error');
      }
      if (field.type === 'email' && field.value.trim()) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!re.test(field.value.trim())) {
          group.classList.add('error');
          isValid = false;
        }
      }
    });

    if (isValid) {
      const submitBtn = form.querySelector('[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '✓ Message Sent!';
      submitBtn.style.background = 'linear-gradient(135deg, #34D399, #10B981)';
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.style.background = '';
        submitBtn.disabled = false;
        form.reset();
      }, 3000);
    }

    return false;
  };

  document.addEventListener('input', function (e) {
    const group = e.target.closest('.form-group');
    if (group && group.classList.contains('error')) {
      group.classList.remove('error');
    }
  });

  // ===== FLOATING ORBS (ambient depth layer for hero) =====
  function setupFloatingOrbs() {
    if (prefersReducedMotion || !isDesktop()) return;
    const hero = document.getElementById('hero');
    if (!hero) return;

    const orbData = [
      { size: 320, x: 15, y: 20, dur: 18, delay: 0, opacity: 0.06 },
      { size: 200, x: 75, y: 60, dur: 24, delay: 4, opacity: 0.05 },
      { size: 260, x: 50, y: 80, dur: 20, delay: 8, opacity: 0.04 },
      { size: 180, x: 85, y: 15, dur: 22, delay: 2, opacity: 0.07 }
    ];

    orbData.forEach(o => {
      const orb = document.createElement('div');
      orb.className = 'hero-orb';
      orb.style.cssText = `
        position: absolute;
        width: ${o.size}px;
        height: ${o.size}px;
        left: ${o.x}%;
        top: ${o.y}%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background: radial-gradient(circle, rgba(212,175,55,${o.opacity * 3}), rgba(27,42,74,${o.opacity}) 40%, transparent 70%);
        filter: blur(${o.size * 0.18}px);
        pointer-events: none;
        z-index: 0;
        animation: heroOrbFloat ${o.dur}s ease-in-out ${o.delay}s infinite alternate;
        will-change: transform;
      `;
      hero.insertBefore(orb, hero.firstChild);
    });
  }

})();
