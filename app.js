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
  const LOADER_MIN_MS = 2500;
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = () => window.innerWidth >= 1024 && matchMedia('(hover: hover)').matches;
  const isMobileDevice = window.innerWidth < 768;
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isSlowConn = !!(conn && (/^(slow-2g|2g|3g)$/.test(conn.effectiveType || '') || conn.saveData));
  const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2;
  const lowCores = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2;
  // Lite mode: drop continuous per-frame scroll effects (parallax + wheel transforms)
  // on weak/slow/data-saver clients so scrolling stays smooth on low-end Windows machines.
  const liteMode = prefersReducedMotion || isSlowConn || lowMemory || lowCores;

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
  let wheelCX = 0, wheelCY = 0; // mouse-driven offset (home hero only, desktop)
  const heroConstellation = document.getElementById('heroConstellation');
  const pages = document.querySelectorAll('[data-page]');
  const navLinks = document.querySelectorAll('.nav-link');

  // ===== INIT =====
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    document.body.classList.add('loading');
    if (liteMode) {
      document.body.classList.add('lite-mode');
      // Wheel stays visible but static and readable — no per-frame zone hit-test.
      if (heroWheel) document.body.dataset.wheelZone = 'dark';
    }
    runLoader();

    setupRouter();
    setupScrollEffects();
    setupRevealObserver();
    setupFaqAccordion();
    setupTabs();
    setupMobileMenu();
    setupSmoothLinks();
    setupCategoriesFilters();
    setupCounters();
    setupCursorGlow();
    setupCardTilt();
    setupMagneticButtons();
    setupWheelCursorTilt();
    setupWheelEnergize();
    setupHeroConstellation();
    setupFloatingOrbs();
    setupSpeakerCardFlip();
    setupAgendaTimeline();
    setupScrollToTop();

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

  // ===== AGENDA TIMELINE INTERACTIVITY =====
  function setupAgendaTimeline() {
    const timeline = document.querySelector('.timeline');
    if (!timeline) return;

    // 1. Accordion Expand/Collapse on click (Commented out for static list)
    /*
    timeline.addEventListener('click', function(e) {
      const header = e.target.closest('.timeline-header');
      const titleRow = e.target.closest('.timeline-title-row');
      const item = e.target.closest('.timeline-item');
      
      // If user clicked header, title-row, or toggle button, toggle expansion
      if (item && (header || titleRow || e.target.closest('.timeline-toggle'))) {
        item.classList.toggle('expanded');
      }
    });
    */

    // 2. Category filtering
    const filterContainer = document.querySelector('.agenda-filters');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', function(e) {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      // Update active state in buttons
      filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      const items = timeline.querySelectorAll('.timeline-item');

      items.forEach(item => {
        const cat = item.dataset.category;
        
        // Add a clean fade transition out/in
        item.style.opacity = '0';
        item.style.transform = 'scale(0.98)';
        
        setTimeout(() => {
          if (filter === 'all' || cat === filter) {
            item.style.display = 'flex';
            setTimeout(() => {
              item.style.opacity = '1';
              item.style.transform = 'translateY(0) scale(1)';
            }, 50);
          } else {
            item.style.display = 'none';
          }
        }, 200);
      });
    });
  }

  // ===== LOADER =====
  function runLoader() {
    if (!pageLoader) return;

    if (isMobileDevice || liteMode) { dismissLoader(); return; }

    const start = performance.now();

    function tick() {
      const elapsed = performance.now() - start;
      // Power-curve: fast ramp-up, smooth finish
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
    setTimeout(dismissLoader, 8000); // Safety net
  }

  function dismissLoader() {
    if (!pageLoader || pageLoader.classList.contains('hidden')) return;
    pageLoader.style.pointerEvents = 'none';
    pageLoader.classList.add('hidden');
    document.body.classList.remove('loading');
    setTimeout(() => { pageLoader.style.display = 'none'; }, 600);
  }

  // ===== ROUTER & SEO TITLE/META MANAGEMENT =====
  const pageMeta = {
    home: {
      title: "Astro+ महासंगम | Conclave, Awards & Expo 2026 | NBT Astro",
      desc: "India's premier forum for Vedic Sciences, Astrology & Conscious Living. Join 27 Award Categories, Conclave, Consultation Zone, Expo & Gurukulam - September 2026, Delhi NCR."
    },
    conclave: {
      title: "Conclave Sessions & Speakers | Astro+ महासंगम 2026 | NBT Astro",
      desc: "For the first time, India's best Astrologers, Vastu experts, Tarot readers, Numerologists and Palmists on one credible stage, panels, live sessions and keynotes on the questions that matter most."
    },
    awards: {
      title: "27 Vedic Science Awards & Categories | Astro+ महासंगम 2026 | NBT Astro",
      desc: "India's only transparent, jury-evaluated awards for practitioners of mystic sciences, audited and led by a globally recognised Knowledge and Process partner."
    },
    consultation: {
      title: "Consultation & Expo | Astro+ महासंगम 2026 | NBT Astro",
      desc: "One-on-one access to India's most credible practitioners, in person, plus India's most curated commercial marketplace for astrology and Vedic sciences."
    },
    fellowship: {
      title: "Antarix Gurukulam & Lineage Transmission | Astro+ महासंगम 2026 | NBT Astro",
      desc: "Reviving the sacred Guru-Shishya parampara. Connect directly with authentic Vedic masters for structured mentorship and lineage transmission."
    },
    categories: {
      title: "All Award Categories | Astro+ महासंगम 2026 | NBT Astro",
      desc: "Explore all 27 transparent, jury-evaluated award categories across 4 core segments."
    }
  };

  function setupRouter() {
    window.addEventListener('hashchange', handleRoute);
  }

  function handleRoute() {
    let hash = window.location.hash.replace('#', '') || 'home';
    if (hash === 'expo') hash = 'consultation'; // Legacy route: Expo merged into Consultation & Expo
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

    document.body.dataset.activePage = hash;

    navLinks.forEach(link => {
      const isActive = link.getAttribute('data-page') === hash;
      link.classList.toggle('active', isActive);
      if (link.getAttribute('role') === 'menuitem') {
        link.setAttribute('aria-current', isActive ? 'page' : 'false');
      }
    });

    // Dynamic SEO Title & OpenGraph update for SPA link sharing & previews
    const meta = pageMeta[hash] || pageMeta.home;
    document.title = meta.title;
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute('content', meta.desc);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', meta.title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', meta.desc);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', `https://timeslanguages.in/astro-mahasangam/#${hash === 'home' ? '' : hash}`);
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', meta.title);
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', meta.desc);

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

  // ===== SMOOTH LINKS & CTA INTERCEPTION =====
  function setupSmoothLinks() {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const href = link.getAttribute('href');
      const scrollTarget = link.getAttribute('data-scroll');

      // Intercept CTAs to open modal (unless they already have explicit onclick logic)
      if (link.classList.contains('btn') && window.openLeadModal && !link.hasAttribute('onclick')) {
        e.preventDefault();
        let preselectType = '';
        if (scrollTarget === 'nominate' || href === '#awards') preselectType = 'awards';
        else if (scrollTarget === 'tickets' || href === '#conclave') preselectType = 'conclave';
        else if (scrollTarget === 'consult-price-card' || href === '#consultation') preselectType = 'consultation';
        else if (scrollTarget === 'contact') preselectType = 'expo'; // Default generic
        window.openLeadModal(preselectType);
        return;
      }
      const hash = href.replace('#', '');
      const pageNames = Array.from(pages).map(p => p.getAttribute('data-page'));

      if (pageNames.includes(hash)) {
        e.preventDefault();
        const currentPage = window.location.hash.replace('#', '') || 'home';

        if (currentPage === hash) {
          // Already on the target page — scroll directly (no page switch, no double-scroll)
          const el = scrollTarget && document.getElementById(scrollTarget);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else {
          window.location.hash = hash;
          if (scrollTarget) {
            setTimeout(() => {
              const el = document.getElementById(scrollTarget);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 400);
          }
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
    let lastZoneCheck = 0;

    function update() {
      const scrollY = window.scrollY;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docH > 0 ? (scrollY / docH) * 100 : 0;

      if (scrollProgress) scrollProgress.style.width = pct + '%';

      if (navbar) navbar.classList.toggle('scrolled', scrollY > SCROLL_THRESHOLD);

      const scrollToTopBtn = document.getElementById('scrollToTop');
      if (scrollToTopBtn) {
        scrollToTopBtn.classList.toggle('visible', scrollY > window.innerHeight * 0.5);
      }

      if (floatingCta) {
        const show = scrollY > window.innerHeight * 0.6;
        floatingCta.classList.toggle('visible', show);
        floatingCta.style.display = show ? 'flex' : '';
      }

      // Hero parallax + wheel transform — skipped in lite mode (keeps low-end
      // Windows/slow clients at a smooth scroll; only the cheap progress bar + navbar run).
      if (!liteMode) {
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

        renderWheel(scrollY);
        // elementFromPoint is a synchronous hit-test — throttle it off the
        // per-frame path so it never stalls the scroll on slower GPUs.
        const nowT = performance.now();
        if (nowT - lastZoneCheck > 160) {
          lastZoneCheck = nowT;
          updateWheelZone();
        }
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

  // ===== ZODIAC WHEEL — site-wide scroll drift/rotation + section tint =====
  function renderWheel(scrollY) {
    if (!heroWheel) return;
    const drift = scrollY * 0.05;
    const rotate = scrollY * 0.015;
    heroWheel.style.transform =
      `translate(-50%, -50%) translate3d(${wheelCX}px, ${(wheelCY - drift).toFixed(1)}px, 0) rotate(${rotate.toFixed(2)}deg)`;
  }

  function updateWheelZone() {
    if (!heroWheel) return;
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    const zoneEl = el && el.closest('.hero, .page-hero, .section');
    let zone = 'dark';
    if (zoneEl && (zoneEl.classList.contains('hero') || zoneEl.classList.contains('page-hero'))) {
      zone = 'hero';
    }
    if (document.body.dataset.wheelZone !== zone) document.body.dataset.wheelZone = zone;
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
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () {
        const item = this.closest('.faq-item');
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item.open').forEach(o => {
          if (o !== item) {
            o.classList.remove('open');
            const qBtn = o.querySelector('.faq-question');
            if (qBtn) qBtn.setAttribute('aria-expanded', 'false');
          }
        });
        item.classList.toggle('open', !isOpen);
        this.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });
    });
  }

  // ===== SCROLL TO TOP =====
  function setupScrollToTop() {
    const btn = document.getElementById('scrollToTop');
    if (btn) {
      btn.addEventListener('click', function () {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }
  }

  // ===== TABS =====
  function setupTabs() {
    const tabGroups = document.querySelectorAll('.tabs');
    tabGroups.forEach(group => {
      group.setAttribute('role', 'tablist');
      const container = group.closest('.container') || group.parentElement;
      const buttons = group.querySelectorAll('.tab-btn');
      
      buttons.forEach(btn => {
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', btn.classList.contains('active') ? 'true' : 'false');
        btn.addEventListener('click', function () {
          const tabId = this.getAttribute('data-tab');
          
          buttons.forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
          });
          this.classList.add('active');
          this.setAttribute('aria-selected', 'true');
          
          container.querySelectorAll('.tab-content').forEach(content => {
            content.setAttribute('role', 'tabpanel');
            const isActive = content.getAttribute('data-tab-content') === tabId;
            content.classList.toggle('active', isActive);
            if (isActive) content.setAttribute('tabindex', '0');
          });
        });
      });
    });
  }

  // ===== CATEGORIES FILTERS & DASHBOARD =====
  window.navigateToCategoryFilter = function(filterName, event) {
    if (event && event.preventDefault) event.preventDefault();
    window.location.hash = 'categories';
    if (typeof handleRoute === 'function') handleRoute();

    const selectSegment = () => {
      const page = document.getElementById('pageCategories');
      if (!page) return;
      
      let targetSegCard = page.querySelector(`.segment-nav-card[data-segment="${filterName}"]`);
      if (!targetSegCard || filterName === 'all') {
        targetSegCard = page.querySelector(`.segment-nav-card[data-segment="practitioner"]`);
      }
      
      if (targetSegCard) {
        targetSegCard.click();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    selectSegment();
    setTimeout(selectSegment, 50);
    return false;
  };

  function setupCategoriesFilters() {
    const page = document.getElementById('pageCategories');
    if (!page) return;

    // 1. Segment Sidebar Navigation Cards
    const segmentNavCards = page.querySelectorAll('.segment-nav-card');
    const segmentPanels = page.querySelectorAll('.segment-panel');

    segmentNavCards.forEach(card => {
      card.addEventListener('click', function() {
        const targetSeg = this.getAttribute('data-segment');
        
        segmentNavCards.forEach(c => c.classList.remove('active'));
        this.classList.add('active');

        segmentPanels.forEach(panel => {
          if (panel.getAttribute('data-segment-panel') === targetSeg) {
            panel.classList.add('active');
          } else {
            panel.classList.remove('active');
          }
        });
      });
    });

    // 2. Category Accordions (Expand / Collapse)
    const accordionHeaders = page.querySelectorAll('.category-accordion-header');
    accordionHeaders.forEach(header => {
      header.addEventListener('click', function() {
        const parentCard = this.closest('.category-accordion-card');
        if (parentCard) {
          parentCard.classList.toggle('open');
        }
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
    hamburger.setAttribute('aria-expanded', 'true');
    mobileMenu.classList.add('open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    if (!hamburger) return;
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // ===== CURSOR GLOW (default system cursor stays; soft glow trails it) =====
  function setupCursorGlow() {
    if (prefersReducedMotion) return;
    if (!isDesktop()) return;
    if (!cursorGlow) return;

    let raf = null;
    let tx = 0, ty = 0, cx = 0, cy = 0;

    document.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!document.body.classList.contains('cursor-active')) {
        document.body.classList.add('cursor-active');
      }
      if (!raf) raf = requestAnimationFrame(animateCursor);
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      document.body.classList.remove('cursor-active');
    });

    function animateCursor() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursorGlow.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;

      if (Math.abs(tx - cx) > 0.3 || Math.abs(ty - cy) > 0.3) {
        raf = requestAnimationFrame(animateCursor);
      } else {
        raf = null;
      }
    }
  }

  // ===== CARD TILT + cursor-tracked highlight =====
  function setupCardTilt() {
    if (!isDesktop() || prefersReducedMotion) return;
    const tiltSelector = '.card, .speaker-card, .pricing-card, .routing-card, .step-card, .sponsor-tier, .jury-card, .consult-price-card';
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

  // ===== WHEEL CURSOR TILT (site-wide mouse reactivity) =====
  function setupWheelCursorTilt() {
    if (!heroWheel || prefersReducedMotion) return;

    let tx = 0, ty = 0, cx = 0, cy = 0;
    let raf = null;

    document.addEventListener('mousemove', (e) => {
      if (!isDesktop()) return;
      tx = (e.clientX / window.innerWidth - 0.5) * 20;
      ty = (e.clientY / window.innerHeight - 0.5) * 20;
      if (!raf) raf = requestAnimationFrame(animate);
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(animate);
    });

    function animate() {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      wheelCX = cx;
      wheelCY = cy;
      renderWheel(window.scrollY);
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
        raf = requestAnimationFrame(animate);
      } else {
        raf = null;
      }
    }
  }

  // ===== WHEEL HOVER-ENERGIZE (boosts glow/breathe while hovering interactive content) =====
  const WHEEL_ENERGIZE_SELECTOR = '.card, .btn, .routing-card, .pricing-card';

  function setupWheelEnergize() {
    if (!heroWheel || prefersReducedMotion) return;

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(WHEEL_ENERGIZE_SELECTOR)) {
        document.body.classList.add('wheel-energized');
      }
    });

    document.addEventListener('mouseout', (e) => {
      const leavingEnergized = e.target.closest(WHEEL_ENERGIZE_SELECTOR);
      const enteringEnergized = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(WHEEL_ENERGIZE_SELECTOR);
      if (leavingEnergized && !enteringEnergized) {
        document.body.classList.remove('wheel-energized');
      }
    });
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

  // ===== LEAD CAPTURE MODAL LOGIC =====
  const leadModal = document.getElementById('leadModal');
  const closeModalBtn = document.getElementById('closeModal');
  const leadTypeSelect = document.getElementById('leadType');
  const nomCategorySelect = document.getElementById('nomCategory');
  const guruRoleSelect = document.getElementById('guruRole');

  let modalOriginHash = '';

  window.openLeadModal = function(type = '', nomCat = '', nomTier = '') {
    if (!leadModal) return false;
    
    // Store current active page hash before modal opens
    modalOriginHash = window.location.hash || '#home';
    
    // Reset forms and hide all cond groups first
    const form = document.getElementById('leadForm');
    if (form) form.reset();
    document.querySelectorAll('.cond-group, .cond-subgroup').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.form-group.error').forEach(el => el.classList.remove('error'));
    
    // Set type if provided
    if (type && leadTypeSelect) {
      leadTypeSelect.value = type;
      const group = document.getElementById(`cond-${type}`);
      if (group) group.style.display = 'block';
    }
    
    // Setup nested conditionally if awards
    if (type === 'awards' && nomCat && nomCategorySelect) {
      nomCategorySelect.value = nomCat;
      const sub = document.getElementById(nomCat === 'individual' ? 'cond-awards-indiv' : 'cond-awards-biz');
      if (sub) sub.style.display = 'block';
      if (nomTier) {
        const tierSelect = document.getElementById('nomTier');
        if (tierSelect) tierSelect.value = nomTier;
      }
    }

    leadModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    return false; // Prevent default for anchor clicks
  };

  function closeLeadModal() {
    if (!leadModal) return;
    leadModal.classList.remove('active');
    document.body.style.overflow = '';

    // Restore user to their origin page if hash was modified
    if (modalOriginHash) {
      if (window.location.hash !== modalOriginHash) {
        window.location.hash = modalOriginHash;
        if (typeof handleRoute === 'function') handleRoute();
      }
    }
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeLeadModal);
  if (leadModal) {
    leadModal.addEventListener('click', (e) => {
      if (e.target === leadModal) closeLeadModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && leadModal && leadModal.classList.contains('active')) {
      closeLeadModal();
    }
  });

  // Conditional Logic Listeners
  if (leadTypeSelect) {
    leadTypeSelect.addEventListener('change', function(e) {
      document.querySelectorAll('.cond-group').forEach(el => el.style.display = 'none');
      const val = e.target.value;
      if (val) {
        const group = document.getElementById(`cond-${val}`);
        if (group) group.style.display = 'block';
      }
    });
  }

  if (nomCategorySelect) {
    nomCategorySelect.addEventListener('change', function(e) {
      const indiv = document.getElementById('cond-awards-indiv');
      const biz = document.getElementById('cond-awards-biz');
      if (indiv) indiv.style.display = 'none';
      if (biz) biz.style.display = 'none';
      const val = e.target.value;
      if (val === 'individual' && indiv) indiv.style.display = 'block';
      if (val === 'business' && biz) biz.style.display = 'block';
    });
  }

  if (guruRoleSelect) {
    guruRoleSelect.addEventListener('change', function(e) {
      const guru = document.getElementById('cond-guru-details');
      const shishya = document.getElementById('cond-shishya-details');
      if (guru) guru.style.display = 'none';
      if (shishya) shishya.style.display = 'none';
      const val = e.target.value;
      if (val === 'guru' && guru) guru.style.display = 'block';
      if (val === 'shishya' && shishya) shishya.style.display = 'block';
    });
  }

  // ===== FORM HANDLING =====
  window.handleFormSubmit = function (e) {
    e.preventDefault();
    const form = e.target;
    let isValid = true;

    // Only validate fields that are currently visible
    const visibleFields = Array.from(form.querySelectorAll('input, select, textarea')).filter(el => {
      return el.offsetWidth > 0 && el.offsetHeight > 0 && el.hasAttribute('required');
    });

    visibleFields.forEach(field => {
      const group = field.closest('.form-group');
      if (group) {
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
      }
    });

    if (isValid) {
      const submitBtn = form.querySelector('[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '✓ Request Submitted!';
      submitBtn.style.background = 'linear-gradient(135deg, #34D399, #10B981)';
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.style.background = '';
        submitBtn.disabled = false;
        closeLeadModal();
        form.reset();
      }, 2500);
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
