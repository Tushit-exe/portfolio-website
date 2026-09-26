import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import createGlobe from 'cobe';

gsap.registerPlugin(ScrollTrigger);

/* ==========================================================================
   TUSHIT AUDI — HERO CANVAS ROTATION & SCROLL CONTROLLER
   ========================================================================== */

const TOTAL_FRAMES = 118;
const FRAME_PATH_PREFIX = '/assets/frames/frame_';
const FRAME_PATH_SUFFIX = '.webp';

// DOM Elements
const preloader = document.getElementById('preloader');
const preloaderBar = document.getElementById('preloader-bar');
const preloaderPercent = document.getElementById('preloader-percent');
const heroScrollContainer = document.getElementById('hero-scroll-container');
const canvas = document.getElementById('hero-canvas');
const ctx = canvas.getContext('2d');

// State Variables
const loadedImages = [];
let imagesLoadedCount = 0;
let currentProgressIndex = 0;
let targetProgressIndex = 0;
let animationFrameId = null;
let isPreloaded = false;
let isScrollLocked = true;

// Ensure browser scroll restoration is set to manual immediately
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}
if (window.location.hash) {
  window.history.replaceState(null, null, window.location.pathname);
}
window.scrollTo(0, 0);

const MIN_PRELOADER_DURATION = 3000; // 3 seconds minimum display time
let preloaderStartTime = Date.now();
let displayedPercent = 0;


/**
 * Format frame index with 3-digit padding (e.g. 1 -> 001, 12 -> 012)
 */
function getFrameFilename(index) {
  const paddedNumber = String(index + 1).padStart(3, '0');
  return `${FRAME_PATH_PREFIX}${paddedNumber}${FRAME_PATH_SUFFIX}`;
}

/**
 * Preload every hero frame before handing scroll control to the user.
 * Frames are small (WebP, ~14KB avg) so loading all 118 up front is fast
 * and guarantees the scrubber never lands on a not-yet-loaded frame
 * (which previously showed as a stutter/pop while scrolling the hero).
 * A hard safety timeout still lets the site continue on a very slow
 * connection rather than blocking forever.
 */
function preloadAllFrames() {
  return new Promise((resolve) => {
    let loadedCount = 0;
    let isResolved = false;

    const finish = () => {
      if (!isResolved) {
        isResolved = true;
        resolve();
      }
    };

    preloaderStartTime = Date.now();

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFrameFilename(i);
      img.onload = () => {
        loadedImages[i] = img;
        loadedCount++;
        imagesLoadedCount++;
        if (i === 0) {
          resizeCanvas();
          renderFrame(0);
        }
        if (loadedCount >= TOTAL_FRAMES) finish();
      };
      img.onerror = () => {
        loadedCount++;
        imagesLoadedCount++;
        if (loadedCount >= TOTAL_FRAMES) finish();
      };
    }

    // Safety net: never block interaction forever on a very slow connection
    setTimeout(finish, 8000);
  });
}

/**
 * Get exact target frame or fallback to nearest available preloaded frame
 */
function getClosestLoadedFrame(targetIndex) {
  const index = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.floor(targetIndex)));
  if (loadedImages[index] && loadedImages[index].complete) {
    return loadedImages[index];
  }

  for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
    const prev = index - offset;
    const next = index + offset;
    if (prev >= 0 && loadedImages[prev] && loadedImages[prev].complete) {
      return loadedImages[prev];
    }
    if (next < TOTAL_FRAMES && loadedImages[next] && loadedImages[next].complete) {
      return loadedImages[next];
    }
  }
  return null;
}

/**
 * Editorial Preloader Motion & Split Shutter Exit Engine
 */
/**
 * Core Animation Engine & Event Listeners
 */
function initCoreEngine() {
  window.addEventListener('resize', onResize);

  initGSAPAnimations();

  // Bind smooth anchor navigation for full-page sections
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}

/**
 * Multi-Language "Hello" Scale + Fade Preloader & Vertical Shutter Exit Engine
 */
function initPreloader() {
  const preloader = document.getElementById('preloader');
  const preloaderText = document.getElementById('preloader-text');
  if (!preloader || !preloaderText) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pre-set hero elements to hidden/scaled states so there is zero flash of hero before shutter reveal
  gsap.set('#hero-canvas-wrapper', { scale: 1.12, filter: 'brightness(0.85)' });
  gsap.set('.name-line', { yPercent: 100 });
  gsap.set(['.top-nav-bar', '.nav-status-badge', '.hero-action-group', '.capabilities-card'], { opacity: 0, y: 20 });

  // Handle reduced motion preference
  if (prefersReducedMotion) {
    if (preloaderText) preloaderText.textContent = '';
    preloader.remove();
    document.body.style.overflow = '';
    isPreloaded = true;
    isScrollLocked = false;
    gsap.set('#hero-canvas-wrapper', { scale: 1, filter: 'brightness(1)' });
    gsap.set('.name-line', { yPercent: 0 });
    gsap.set(['.top-nav-bar', '.nav-status-badge', '.hero-action-group', '.capabilities-card'], { opacity: 1, y: 0 });
    const canvasWrapper = document.getElementById('hero-canvas-wrapper');
    if (canvasWrapper) canvasWrapper.classList.add('is-loaded');
    preloadAllFrames().then(() => {
      resizeCanvas();
      renderFrame(0);
      onScroll();
    });
    return;
  }

  document.body.style.overflow = 'hidden';

  const languages = [
    "Hello",      // English
    "Hola",       // Spanish
    "Bonjour",    // French
    "नमस्ते",      // Hindi
    "ನಮಸ್ತೆ",      // Kannada
    "こんにちは"    // Japanese
  ];

  let currentLanguage = 0;
  const languageDuration = 320; // ms per language animation
  let finished = false;

  // Background frame preloading promise
  const criticalAssetsPromise = Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    preloadAllFrames()
  ]);

  function showNextLanguage() {
    if (finished) return;

    if (currentLanguage < languages.length) {
      preloaderText.textContent = languages[currentLanguage];
      // Force DOM reflow to restart CSS animation cleanly
      void preloaderText.offsetWidth;
      preloaderText.classList.add('active');
      currentLanguage++;

      setTimeout(() => {
        preloaderText.classList.remove('active');
        setTimeout(showNextLanguage, 20);
      }, languageDuration);
    } else {
      criticalAssetsPromise.then(() => triggerExitTimeline());
    }
  }

  function triggerExitTimeline() {
    if (finished) return;
    finished = true;

    isPreloaded = true;
    window.scrollTo(0, 0);
    resizeCanvas();
    renderFrame(0);

    const canvasWrapper = document.getElementById('hero-canvas-wrapper');
    if (canvasWrapper) canvasWrapper.classList.add('is-loaded');

    // Filter visible shutter slats based on viewport breakpoint
    const visibleSlats = Array.from(document.querySelectorAll('.preloader-slat')).filter(
      (slat) => getComputedStyle(slat).display !== 'none'
    );

    // Apply will-change for high performance during animation
    visibleSlats.forEach((slat) => (slat.style.willChange = 'transform'));

    // Master Exit GSAP Timeline
    const exitTl = gsap.timeline({
      delay: 0.25, // 1. Hold at 100% / final language for ~250ms
      onComplete: () => {
        document.body.style.overflow = '';
        isScrollLocked = false;
        visibleSlats.forEach((slat) => (slat.style.willChange = 'auto'));
        if (preloaderText) preloaderText.textContent = '';
        if (preloader) preloader.remove();
        onScroll();
        ScrollTrigger.refresh();
      }
    });

    // 2. Preloader content exits first: text slides up 40px & fades out (0.5s, power3.in)
    exitTl.to('.preloader-content', {
      y: -40,
      opacity: 0,
      duration: 0.5,
      ease: 'power3.in'
    }, 0);

    // 3. Shutter: Slats slide UP off-screen (yPercent: -100), 70ms stagger, 0.9s, expo.inOut
    // Starts 0.1s before content exit finishes (at t = 0.4s)
    exitTl.to(visibleSlats, {
      yPercent: -100,
      duration: 0.9,
      stagger: 0.07,
      ease: 'expo.inOut'
    }, 0.4);

    // 5. Hero enters as slats clear (starts at ~40% into shutter animation, i.e., t = 0.75s):
    // Hero photo scale 1.12 -> 1 & brightness lift 0.85 -> 1 over 1.4s, expo.out
    exitTl.to('#hero-canvas-wrapper', {
      scale: 1,
      filter: 'brightness(1)',
      duration: 1.4,
      ease: 'expo.out'
    }, 0.75);

    // "TUSHIT AUDI": each line slides up from behind mask (yPercent 100 -> 0, 0.9s, 60ms stagger, power4.out)
    exitTl.to('.name-line', {
      yPercent: 0,
      duration: 0.9,
      stagger: 0.06,
      ease: 'power4.out'
    }, 0.75);

    // Nav, availability badge, buttons & Capabilities list fade up (y 20 -> 0, 0.6s, 50ms stagger), starting 0.2s after name
    exitTl.to(['.top-nav-bar', '.nav-status-badge', '.hero-action-group', '.capabilities-card'], {
      y: 0,
      opacity: 1,
      duration: 0.6,
      stagger: 0.05,
      ease: 'power3.out'
    }, 0.95);
  }

  // Start preloader language animation
  showNextLanguage();
}

/**
 * Fit canvas element to window & device pixel ratio for sharp retina rendering
 */
function resizeCanvas() {
  if (!canvas) return;
  
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.scale(dpr, dpr);
  
  // Re-draw current frame on resize
  renderFrame(Math.round(currentProgressIndex));
}

function onResize() {
  resizeCanvas();
  ScrollTrigger.refresh();
}

/**
 * Map window scroll position to target frame index (0 to 117) & trigger skill reveals
 */
function onScroll() {
  if (!isPreloaded || !heroScrollContainer) return;

  if (isScrollLocked) {
    targetProgressIndex = 0;
    currentProgressIndex = 0;
    updateSkillReveals(0);
    return;
  }

  const currentY = window.scrollY || window.pageYOffset || 0;

  // Hard clamp top position: if scroll is at top, force progress to frame 0
  if (currentY <= 5) {
    targetProgressIndex = 0;
    updateSkillReveals(0);
    return;
  }

  const rect = heroScrollContainer.getBoundingClientRect();
  const scrollableDistance = heroScrollContainer.offsetHeight - window.innerHeight;
  
  if (scrollableDistance <= 0) return;

  // Calculate normalized scroll progress [0.0, 1.0]
  const currentScroll = Math.max(0, -rect.top);
  const progress = Math.min(1, Math.max(0, currentScroll / scrollableDistance));

  // Map progress to continuous frame index
  targetProgressIndex = progress * (TOTAL_FRAMES - 1);

  // Trigger one-way scroll reactive skill item reveals
  updateSkillReveals(progress);
}

/**
 * Reveal/hide capability items as scroll progress crosses thresholds (bidirectional 60fps sync)
 */
function updateSkillReveals(progress) {
  const capabilityItems = document.querySelectorAll('.capability-item, .skill-item');
  if (!capabilityItems.length) return;

  const isDesktop = window.innerWidth >= 1024;

  capabilityItems.forEach((item) => {
    if (isDesktop) {
      const threshold = parseFloat(item.getAttribute('data-threshold')) || 0;
      if (progress >= threshold) {
        item.classList.add('is-revealed');
      } else {
        item.classList.remove('is-revealed');
      }
    } else {
      item.classList.add('is-revealed');
    }
  });
}

/**
 * Draw specified frame index on hero canvas centered with contain aspect ratio
 */
function renderFrame(rawFrameIndex) {
  const img = getClosestLoadedFrame(rawFrameIndex);

  if (!img || !img.complete) return;

  const width = window.innerWidth;
  const height = window.innerHeight;

  ctx.clearRect(0, 0, width, height);

  // Calculate image scale & positioning ("contain" fit with portrait prominence)
  const imgAspect = img.width / img.height;
  const viewportAspect = width / height;

  let drawW, drawH, drawX, drawY;

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isUltraWide = width >= 1800;

  let scaleMultiplier = 1.12;
  if (isMobile) {
    scaleMultiplier = 0.95;
  } else if (isTablet) {
    scaleMultiplier = 1.05;
  } else if (isUltraWide) {
    scaleMultiplier = 1.25;
  }

  if (viewportAspect > imgAspect) {
    drawH = height * scaleMultiplier;
    drawW = drawH * imgAspect;
  } else {
    drawW = width * scaleMultiplier;
    drawH = drawW / imgAspect;
  }

  drawX = (width - drawW) / 2;
  drawY = (height - drawH) / 2;

  ctx.save();
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();
}

/* ==========================================================================
   GSAP SCROLLTRIGGER ANIMATIONS
   ========================================================================== */
function initGSAPAnimations() {
  // 1. Hero Canvas Rotation ScrollTrigger Easing & Explicit Pinning
  if (heroScrollContainer) {
    ScrollTrigger.create({
      trigger: heroScrollContainer,
      pin: '#hero-viewport',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.1,
      anticipatePin: 1,
      onUpdate: (self) => {
        if (!isPreloaded || isScrollLocked) return;
        currentProgressIndex = self.progress * (TOTAL_FRAMES - 1);
        renderFrame(currentProgressIndex);
        updateSkillReveals(self.progress);
      }
    });
  }

  // 2. Progressive non-destructive scroll reveals (elements stay visible by default)
  const animTargets = document.querySelectorAll('.service-item, .project-card, .about-terminal-wrapper');
  animTargets.forEach(el => {
    gsap.fromTo(el,
      { opacity: 0.3, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 92%',
          toggleActions: 'play none none none'
        }
      }
    );
  });

  // Stat cards subtle stagger pop without disrupting box alignment
  const statGrid = document.querySelector('.about-stats-grid');
  if (statGrid) {
    gsap.fromTo('.stat-card',
      { opacity: 0.4, y: 15 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: statGrid,
          start: 'top 92%',
          toggleActions: 'play none none none'
        }
      }
    );
  }

  ScrollTrigger.refresh();
}

/* ==========================================================================
   INTERACTIVE CLI TERMINAL & STAT COUNTERS
   ========================================================================== */
function initInteractiveTerminal() {
  const terminalInput = document.getElementById('terminal-input');
  const terminalBody = document.getElementById('terminal-body-output');
  const terminalCard = document.querySelector('.terminal-card');
  const chipBtns = document.querySelectorAll('.chip-btn');

  if (!terminalInput || !terminalBody) return;

  // Click card anywhere to focus input line
  if (terminalCard) {
    terminalCard.addEventListener('click', (e) => {
      // Don't override chip clicks
      if (!e.target.closest('.chip-btn')) {
        terminalInput.focus();
      }
    });
  }

  const COMMAND_RESPONSES = {
    help: [
      { text: '// Interactive Terminal Navigation:', type: 'comment' },
      { text: '  about     - What I do & how I build software', type: 'info' },
      { text: '  skills    - Detailed breakdown of web & automation skills', type: 'info' },
      { text: '  stack     - Tech stack ecosystem & active tools', type: 'info' },
      { text: '  n8n       - Active background automation workflows', type: 'info' },
      { text: '  clear     - Reset terminal screen', type: 'comment' }
    ],
    about: [
      { text: '// PROFILE & METHODOLOGY:', type: 'comment' },
      { text: '▶ WHAT I DO: Build high-performance web apps & automated workflows.', type: 'success' },
      { text: '▶ HOW I DO IT: Leverage AI-assisted rapid prototyping, modern web stacks, and n8n webhooks.', type: 'info' },
      { text: '▶ PHILOSOPHY: Focus strictly on shipping working software fast — 0% fluff, 100% execution.', type: 'str' }
    ],
    bio: [
      { text: '// PROFILE & METHODOLOGY:', type: 'comment' },
      { text: '▶ WHAT I DO: Build high-performance web apps & automated workflows.', type: 'success' },
      { text: '▶ HOW I DO IT: Leverage AI-assisted rapid prototyping, modern web stacks, and n8n webhooks.', type: 'info' },
      { text: '▶ PHILOSOPHY: Focus strictly on shipping working software fast — 0% fluff, 100% execution.', type: 'str' }
    ],
    skills: [
      { text: '// TECHNICAL CAPABILITIES:', type: 'comment' },
      { text: '⚡ Web Apps     : React, Next.js, Vite, Vanilla CSS, GSAP Animations', type: 'success' },
      { text: '⚡ Automation   : n8n Workflow Automation, Webhooks, REST APIs, Node.js', type: 'info' },
      { text: '⚡ AI Tools     : Gemini API, LLM Function Calling, Prompt Engineering', type: 'str' },
      { text: '⚡ Infrastructure: PostgreSQL, Docker, Git, Vercel, Supabase', type: 'flag' }
    ],
    stack: [
      { text: '// ACTIVE ECOSYSTEM STACK:', type: 'comment' },
      { text: '• Frontend    : React | Next.js | Vite | Tailwind / CSS', type: 'info' },
      { text: '• Automation  : n8n Self-Hosted | Webhook Listeners | Zapier', type: 'success' },
      { text: '• AI & Cloud  : Gemini 2.5 | Claude 3.5 | Docker | PostgreSQL', type: 'str' }
    ],
    n8n: [
      { text: '// ACTIVE N8N AUTOMATION ENGINE:', type: 'comment' },
      { text: '[WORKFLOW 01] AI Webhook Listener & Lead Qualifier   --> ACTIVE [24/7]', type: 'success' },
      { text: '[WORKFLOW 02] Automated Email & CRM Data Sync       --> ACTIVE [24/7]', type: 'success' },
      { text: '[WORKFLOW 03] Daily Automated Market Briefing Bot   --> SCHEDULED', type: 'info' }
    ]
  };

  function executeCommand(cmdRaw) {
    const cmd = cmdRaw.trim().toLowerCase();
    if (!cmd) return;

    // Create prompt echo line
    const echoLine = document.createElement('div');
    echoLine.className = 'term-line';
    echoLine.innerHTML = `<span class="term-prompt">$</span> <span class="term-cmd">${escapeHtml(cmd)}</span>`;
    
    // Insert echo line before input line
    const inputLine = terminalInput.closest('.term-input-line');
    terminalBody.insertBefore(echoLine, inputLine);

    if (cmd === 'clear') {
      const lines = terminalBody.querySelectorAll('.term-line:not(.term-input-line)');
      lines.forEach(line => line.remove());
      terminalInput.value = '';
      terminalBody.scrollTop = terminalBody.scrollHeight;
      return;
    }

    if (COMMAND_RESPONSES[cmd]) {
      COMMAND_RESPONSES[cmd].forEach(item => {
        const resLine = document.createElement('div');
        resLine.className = `term-line term-out term-${item.type}`;
        resLine.textContent = item.text;
        terminalBody.insertBefore(resLine, inputLine);
      });
    } else {
      const errLine = document.createElement('div');
      errLine.className = 'term-line term-out term-keyword';
      errLine.textContent = `zsh: command not found: ${cmd}. Type 'help' or click a chip above.`;
      terminalBody.insertBefore(errLine, inputLine);
    }

    terminalInput.value = '';
    
    // Auto-scroll terminal body to bottom
    setTimeout(() => {
      terminalBody.scrollTop = terminalBody.scrollHeight;
    }, 10);
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Handle Input Enter Key
  terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      executeCommand(terminalInput.value);
    }
  });

  // Handle Quick Chips Click
  chipBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cmd = btn.getAttribute('data-cmd');
      if (cmd) {
        executeCommand(cmd);
        terminalInput.focus();
      }
    });
  });
}

function initStatCounters() {
  const statCards = document.querySelectorAll('.stat-number');
  if (!statCards.length) return;

  let animated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        statCards.forEach(card => {
          const target = parseInt(card.getAttribute('data-target') || '0', 10);
          const originalText = card.textContent;
          const suffix = originalText.replace(/[0-9]/g, '');
          let current = 0;
          const duration = 1200;
          const step = Math.max(1, Math.floor(target / (duration / 16)));

          const timer = setInterval(() => {
            current += step;
            if (current >= target) {
              card.textContent = target + suffix;
              clearInterval(timer);
            } else {
              card.textContent = current + suffix;
            }
          }, 16);
        });
      }
    });
  }, { threshold: 0.2 });

  const aboutSection = document.getElementById('about');
  if (aboutSection) observer.observe(aboutSection);
}

/* ==========================================================================
   TOAST NOTIFICATION SYSTEM & UTILITIES (ITEMS 9, 11, 12, 13, 17)
   ========================================================================== */

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  
  const iconSVG = type === 'success'
    ? `<svg class="toast-icon-success" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg class="toast-icon-error" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  toast.innerHTML = `${iconSVG}<span>${message}</span>`;
  container.appendChild(toast);

  // Force DOM reflow to trigger CSS animation
  void toast.offsetWidth;
  toast.classList.add('is-visible');

  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function initCopyEmail() {
  const copyBtn = document.getElementById('btn-copy-email');
  if (!copyBtn) return;

  copyBtn.addEventListener('click', () => {
    const email = 'tushitaudi@gmail.com';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(() => {
        showToast('Email copied to clipboard! (tushitaudi@gmail.com)', 'success');
      }).catch(() => {
        showToast('Direct email: tushitaudi@gmail.com', 'success');
      });
    } else {
      showToast('Direct email: tushitaudi@gmail.com', 'success');
    }
  });
}

function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const closeBtn = document.getElementById('mobile-menu-close');
  const drawer = document.getElementById('mobile-menu-drawer');
  const drawerLinks = document.querySelectorAll('.mobile-drawer-link, .mobile-drawer-logo');

  if (!toggleBtn || !drawer) return;

  const openDrawer = () => {
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  drawerLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      closeDrawer();
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const targetEl = document.querySelector(href);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}

function initCopyrightYear() {
  const yearEl = document.getElementById('copyright-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

/* ==========================================================================
   CONTACT MODAL, FORM VALIDATION, SPAM PROTECTION & COOKIE BANNER
   ========================================================================== */

function initContactModal() {
  const openBtn = document.getElementById('btn-open-contact-modal');
  const modal = document.getElementById('contact-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const form = document.getElementById('contact-form');

  if (!openBtn || !modal || !form) return;

  const openModal = () => {
    modal.classList.add('is-active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modal.classList.remove('is-active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  // Close modal on background overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Client-side Validation & Spam Honeypot Handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // 1. Spam Honeypot Protection Check
    const hpField = document.getElementById('b_website_hp');
    if (hpField && hpField.value) {
      // Silent rejection for bots
      closeModal();
      form.reset();
      return;
    }

    const nameInput = document.getElementById('form-name');
    const emailInput = document.getElementById('form-email');
    const messageInput = document.getElementById('form-message');

    const nameErr = document.getElementById('name-error');
    const emailErr = document.getElementById('email-error');
    const messageErr = document.getElementById('message-error');

    let isValid = true;

    // Reset errors
    [nameInput, emailInput, messageInput].forEach(el => el && el.classList.remove('has-error'));
    if (nameErr) nameErr.textContent = '';
    if (emailErr) emailErr.textContent = '';
    if (messageErr) messageErr.textContent = '';

    // Validate Name
    if (!nameInput.value.trim()) {
      if (nameErr) nameErr.textContent = 'Please enter your name.';
      nameInput.classList.add('has-error');
      isValid = false;
    }

    // Validate Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.value.trim() || !emailRegex.test(emailInput.value.trim())) {
      if (emailErr) emailErr.textContent = 'Please enter a valid email address.';
      emailInput.classList.add('has-error');
      isValid = false;
    }

    // Validate Message
    if (!messageInput.value.trim() || messageInput.value.trim().length < 5) {
      if (messageErr) messageErr.textContent = 'Please provide details about your project (at least 5 chars).';
      messageInput.classList.add('has-error');
      isValid = false;
    }

    if (!isValid) return;

    // Direct mailto fallback or simulated instant submission
    const mailtoUrl = `mailto:tushitaudi@gmail.com?subject=Portfolio%20Inquiry%20from%20${encodeURIComponent(nameInput.value)}&body=${encodeURIComponent(messageInput.value)}`;
    window.location.href = mailtoUrl;

    showToast('Message prepared! Email client launched.', 'success');
    closeModal();
    form.reset();
  });
}

function initCookieBanner() {
  const banner = document.getElementById('cookie-banner');
  const acceptBtn = document.getElementById('btn-cookie-accept');
  const declineBtn = document.getElementById('btn-cookie-decline');

  if (!banner) return;

  const cookieChoice = localStorage.getItem('ta_cookie_consent');
  if (!cookieChoice) {
    setTimeout(() => {
      banner.classList.add('is-visible');
    }, 2000);
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      localStorage.setItem('ta_cookie_consent', 'accepted');
      banner.classList.remove('is-visible');
      showToast('Cookie preferences saved.', 'success');
    });
  }

  if (declineBtn) {
    declineBtn.addEventListener('click', () => {
      localStorage.setItem('ta_cookie_consent', 'declined');
      banner.classList.remove('is-visible');
      showToast('Non-essential analytics disabled.', 'success');
    });
  }
}

function initAnalytics() {
  if (navigator.doNotTrack === '1') return;
  const consent = localStorage.getItem('ta_cookie_consent');
  if (consent === 'declined') return;

  if (window.gtag) {
    window.gtag('event', 'page_view', { page_title: document.title });
  }
}

// Initialize preloader sequence on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
  initCoreEngine();
  initPreloader();
  initInteractiveTerminal();
  initStatCounters();
  initDottedGlobe();
  initAnalogClock();
  initProcessTimeline();
  initMobileMenu();
  initCopyEmail();
  initCopyrightYear();
  initContactModal();
  initCookieBanner();
  initAnalytics();
});

/* ==========================================================================
   HOW WE WORK — SCROLL-DRIVEN PROCESS TIMELINE ENGINE
   ========================================================================== */

function initProcessTimeline() {
  const wrapper = document.getElementById('process-timeline-wrapper');
  const trackPath = document.getElementById('process-track-path');
  const progressPath = document.getElementById('process-progress-path');
  const headGlow = document.getElementById('process-head-glow');
  const headDot = document.getElementById('process-head-dot');
  const ctaBlock = document.getElementById('process-cta-block');
  const stepItems = document.querySelectorAll('.process-step-item');

  if (!wrapper || !trackPath || !progressPath) return;

  function updatePathGeometry() {
    const wrapperRect = wrapper.getBoundingClientRect();
    const isDesktop = window.innerWidth >= 1024;
    const stepsCount = stepItems.length;
    if (stepsCount === 0) return 0;

    let pathD = '';

    if (!isDesktop) {
      // Mobile / Tablet: Straight line down left spine (x = 24px)
      const ctaRect = ctaBlock ? ctaBlock.getBoundingClientRect() : null;
      const endY = ctaRect ? (ctaRect.top - wrapperRect.top + 30) : wrapperRect.height;
      pathD = `M 24,0 L 24,${endY}`;
    } else {
      // Desktop: Smooth S-Curve through central spine (x = wrapperWidth / 2)
      const cx = wrapperRect.width / 2;
      const points = [{ x: cx, y: 0 }];

      stepItems.forEach((item, index) => {
        const nodeWrapper = item.querySelector('.process-node-wrapper');
        if (!nodeWrapper) return;
        const nodeRect = nodeWrapper.getBoundingClientRect();
        const ny = (nodeRect.top + nodeRect.height / 2) - wrapperRect.top;
        
        // Gentle S-curve offset swinging ±24px towards step cards
        const swingOffset = (index % 2 === 0) ? -24 : 24;
        points.push({ x: cx + swingOffset, y: ny });
      });

      const ctaRect = ctaBlock ? ctaBlock.getBoundingClientRect() : null;
      const ctaY = ctaRect ? (ctaRect.top - wrapperRect.top + 20) : wrapperRect.height;
      points.push({ x: cx, y: ctaY });

      // Generate smooth cubic bezier SVG path from control points
      pathD = `M ${points[0].x},${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cy1 = prev.y + (curr.y - prev.y) * 0.5;
        const cy2 = prev.y + (curr.y - prev.y) * 0.5;
        pathD += ` C ${prev.x},${cy1} ${curr.x},${cy2} ${curr.x},${curr.y}`;
      }
    }

    trackPath.setAttribute('d', pathD);
    progressPath.setAttribute('d', pathD);

    const pathLength = progressPath.getTotalLength();
    if (pathLength > 0) {
      progressPath.style.strokeDasharray = `${pathLength}`;
      progressPath.style.strokeDashoffset = `${pathLength}`;
    }

    return pathLength;
  }

  let totalPathLength = updatePathGeometry();

  // Reduced motion check
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    if (progressPath) progressPath.style.strokeDashoffset = '0';
    stepItems.forEach(item => item.classList.add('is-active', 'is-completed'));
    if (ctaBlock) ctaBlock.classList.add('is-revealed');
    return;
  }

  // Create ScrollTrigger timeline scrub
  ScrollTrigger.create({
    trigger: '#process-timeline-wrapper',
    start: 'top 65%',
    end: 'bottom 65%',
    scrub: 0.8,
    onUpdate: (self) => {
      const progress = self.progress;
      if (!totalPathLength || totalPathLength <= 0) {
        totalPathLength = progressPath.getTotalLength();
      }

      const currentLength = totalPathLength * progress;
      progressPath.style.strokeDashoffset = totalPathLength * (1 - progress);

      // Position leading tip dot & glow
      if (currentLength > 0 && currentLength <= totalPathLength) {
        try {
          const pt = progressPath.getPointAtLength(currentLength);
          headDot.setAttribute('cx', pt.x);
          headDot.setAttribute('cy', pt.y);
          headGlow.setAttribute('cx', pt.x);
          headGlow.setAttribute('cy', pt.y);
        } catch (err) {
          // Fallback if SVG point calculation interrupted during rapid resize
        }
      }

      // Sync step activation states & node rings
      stepItems.forEach((item, idx) => {
        const nodeWrapper = item.querySelector('.process-node-wrapper');
        if (!nodeWrapper) return;
        const nodeRect = nodeWrapper.getBoundingClientRect();
        const nodeCenterY = nodeRect.top + nodeRect.height / 2;
        const triggerY = window.innerHeight * 0.65;

        if (nodeCenterY <= triggerY) {
          item.classList.add('is-active', 'is-completed');
        } else {
          item.classList.remove('is-active', 'is-completed');
        }
      });

      // Reveal CTA block after step 5
      if (ctaBlock) {
        const ctaRect = ctaBlock.getBoundingClientRect();
        if (ctaRect.top <= window.innerHeight * 0.8) {
          ctaBlock.classList.add('is-revealed');
        } else {
          ctaBlock.classList.remove('is-revealed');
        }
      }
    }
  });

  // Debounced resize handler
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      totalPathLength = updatePathGeometry();
      ScrollTrigger.refresh();
    }, 150);
  });

  // Font loading recalculation
  if (document.fonts) {
    document.fonts.ready.then(() => {
      totalPathLength = updatePathGeometry();
      ScrollTrigger.refresh();
    });
  }
}

/* ==========================================================================
   BENTO WIDGET 1: 3D DOTTED GLOBE (COBE WEBGL ENGINE)
   ========================================================================== */

function initDottedGlobe() {
  const canvas = document.getElementById('bento-globe-canvas');
  const wrapper = document.querySelector('.bento-globe-wrapper');
  const container = document.querySelector('.bento-card-globe');
  if (!canvas || !wrapper) return;

  let phi = 1.35; // Start facing India / Hubballi
  let currentGlobe = null;
  let isDragging = false;
  let startX = 0;
  let dragVelocity = 0;
  let isIntersecting = true;
  let currentSize = 0;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getRenderSize() {
    const rect = wrapper.getBoundingClientRect();
    let size = rect.width;
    if (!size || size < 50) {
      size = container ? (container.offsetWidth * 1.15) : 320;
    }
    return Math.max(Math.round(size), 100);
  }

  function createOrUpdateGlobe() {
    const size = getRenderSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const renderWidth = Math.round(size * dpr);

    canvas.width = renderWidth;
    canvas.height = renderWidth;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.opacity = '1';

    if (currentGlobe) {
      currentSize = size;
      try {
        currentGlobe.update({
          width: renderWidth,
          height: renderWidth,
          phi: phi,
        });
      } catch (e) {
        console.warn('[cobe update fallback]', e);
      }
      return;
    }

    currentSize = size;

    try {
      currentGlobe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width: renderWidth,
        height: renderWidth,
        phi: phi,
        theta: 0.22,
        dark: 0,
        diffuse: 1.2,
        mapSamples: 16000,
        mapBrightness: 6,
        baseColor: [0.96, 0.96, 0.95],
        markerColor: [0.1, 0.1, 0.1],
        glowColor: [0.9, 0.9, 0.9],
        markers: []
      });
    } catch (err) {
      console.error('[cobe WebGL Error]', err);
    }
  }

  // Continuous animation loop for live rotation & drag inertia
  function tick() {
    if (isIntersecting && currentGlobe) {
      if (!isDragging && !prefersReducedMotion) {
        phi += 0.004 + dragVelocity;
        dragVelocity *= 0.92;
      }
      try {
        currentGlobe.update({ phi: phi });
      } catch (e) {
        // Ignore minor frame update glitches
      }
    }
    requestAnimationFrame(tick);
  }

  // Use ResizeObserver for responsive canvas updates
  if (window.ResizeObserver && wrapper) {
    const resizeObserver = new ResizeObserver(() => {
      if (isIntersecting) {
        createOrUpdateGlobe();
      }
    });
    resizeObserver.observe(wrapper);
  }

  // IntersectionObserver to pause rendering loop when offscreen
  const intersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isIntersecting = entry.isIntersecting;
      if (isIntersecting && !currentGlobe) {
        createOrUpdateGlobe();
      }
    });
  }, { threshold: 0.05 });

  if (container) intersectionObserver.observe(container);

  // Visibility state handling
  document.addEventListener('visibilitychange', () => {
    isIntersecting = !document.hidden;
  });

  // Pointer drag controls for inertia rotation
  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    startX = e.clientX;
    canvas.style.cursor = 'grabbing';
  });

  window.addEventListener('pointermove', (e) => {
    if (isDragging) {
      const delta = e.clientX - startX;
      startX = e.clientX;
      dragVelocity = delta * 0.005;
      phi += dragVelocity;
    }
  });

  window.addEventListener('pointerup', () => {
    if (isDragging) {
      isDragging = false;
      canvas.style.cursor = 'grab';
    }
  });

  // Initial rendering triggers and start continuous loop
  createOrUpdateGlobe();
  setTimeout(createOrUpdateGlobe, 100);
  setTimeout(createOrUpdateGlobe, 500);

  // Start rotation loop
  requestAnimationFrame(tick);
}

/* ==========================================================================
   BENTO WIDGET 2: LIVE SVG WATCH DIAL (HUBBALLI / IST)
   ========================================================================== */

function getKolkataTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    weekday: 'short',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const map = {};
  parts.forEach(p => map[p.type] = p.value);

  const hours = parseInt(map.hour, 10) % 24;
  const minutes = parseInt(map.minute, 10);
  const seconds = parseInt(map.second, 10);
  const ms = now.getMilliseconds();
  const day = parseInt(map.day, 10);
  const weekday = (map.weekday || '').toUpperCase();
  const month = parseInt(map.month, 10);
  const year = parseInt(map.year, 10);

  return { hours, minutes, seconds, ms, day, weekday, month, year };
}

function calculateMoonPhase(year, month, day) {
  let c = 0, e = 0, jd = 0, b = 0;
  if (month < 3) {
    year--;
    month += 12;
  }
  month++;
  c = 365.25 * year;
  e = 30.6 * month;
  jd = c + e + day - 694039.09;
  jd /= 29.5305882;
  b = parseInt(jd);
  jd -= b;
  return jd;
}

function initAnalogClock() {
  const container = document.getElementById('bento-clock-container');
  if (!container) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function updateClock() {
    const timeState = getKolkataTime();
    const moonPhase = calculateMoonPhase(timeState.year, timeState.month, timeState.day);

    const { hours, minutes, seconds, ms, day, weekday } = timeState;

    // Hand angles
    const hourAngle = ((hours % 12) + minutes / 60 + seconds / 3600) * 30;
    const minuteAngle = (minutes + seconds / 60) * 6;
    const secondAngle = prefersReducedMotion ? (seconds * 6) : ((seconds + ms / 1000) * 6);

    // 60 Minute Ticks
    let ticksSVG = '';
    for (let i = 0; i < 60; i++) {
      const angle = i * 6;
      const isFive = i % 5 === 0;
      const tickLength = isFive ? 10 : 5;
      const tickWidth = isFive ? 2 : 1;
      const strokeColor = isFive ? '#080808' : '#a1a1aa';
      ticksSVG += `<line x1="150" y1="${30 + (isFive ? 0 : 4)}" x2="150" y2="${30 + tickLength}" transform="rotate(${angle} 150 150)" stroke="${strokeColor}" stroke-width="${tickWidth}" stroke-linecap="round" />`;
    }

    // 12 Hour Indices
    let hourIndicesSVG = '';
    for (let i = 1; i <= 12; i++) {
      const angle = i * 30;
      if (i === 12) {
        hourIndicesSVG += `
          <rect x="144" y="44" width="4" height="16" rx="1" transform="rotate(0 150 150)" fill="#080808" />
          <rect x="152" y="44" width="4" height="16" rx="1" transform="rotate(0 150 150)" fill="#080808" />
        `;
      } else {
        hourIndicesSVG += `
          <polygon points="147.5,44 152.5,44 151.5,60 148.5,60" transform="rotate(${angle} 150 150)" fill="#080808" />
        `;
      }
    }

    // Monochrome Moon Sub-Dial Offset
    const moonOffset = (moonPhase - 0.5) * 12;

    const svgHTML = `
      <svg class="bento-clock-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <filter id="clock-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#000000" flood-opacity="0.12"/>
          </filter>
          
          <radialGradient id="dial-gradient" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="85%" stop-color="#f5f5f2"/>
            <stop offset="100%" stop-color="#e8e8e3"/>
          </radialGradient>

          <linearGradient id="bezel-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="50%" stop-color="#d4d4d8"/>
            <stop offset="100%" stop-color="#a1a1aa"/>
          </linearGradient>

          <linearGradient id="glass-glare" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
            <stop offset="40%" stop-color="#ffffff" stop-opacity="0.05"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </linearGradient>
        </defs>

        <!-- Layered Brushed-Metal Watch Bezel -->
        <circle cx="150" cy="150" r="144" fill="#d4d4d8"/>
        <circle cx="150" cy="150" r="142" fill="url(#bezel-gradient)"/>
        <circle cx="150" cy="150" r="136" fill="#e4e4e7"/>
        <circle cx="150" cy="150" r="134" fill="url(#dial-gradient)"/>
        <circle cx="150" cy="150" r="133" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.9"/>

        <!-- 60 Ticks -->
        ${ticksSVG}

        <!-- 12 Hour Indices -->
        ${hourIndicesSVG}

        <!-- Sub-dial at 9 o'clock: MONOCHROME MOON PHASE -->
        <g transform="translate(0, 0)">
          <circle cx="98" cy="150" r="24" fill="#e4e4e7" stroke="#d4d4d8" stroke-width="1"/>
          <circle cx="98" cy="150" r="22" fill="#27272a"/>
          <!-- Monochrome Moon Disc -->
          <circle cx="${98 + moonOffset}" cy="150" r="10" fill="#ffffff"/>
          <circle cx="${98 + moonOffset + 3}" cy="150" r="10" fill="#09090b" opacity="0.85"/>
          <text x="98" y="184" font-family="Inter, sans-serif" font-size="6.5" font-weight="800" letter-spacing="1.2" fill="#71717a" text-anchor="middle">MOON</text>
        </g>

        <!-- Date Window at 3 o'clock -->
        <g transform="translate(202, 137)">
          <rect x="0" y="0" width="36" height="26" rx="4" fill="#ffffff" stroke="#18181b" stroke-width="1.2"/>
          <text x="18" y="10" font-family="Inter, sans-serif" font-size="6.5" font-weight="800" letter-spacing="1" fill="#71717a" text-anchor="middle">${weekday}</text>
          <text x="18" y="21" font-family="Inter, sans-serif" font-size="11" font-weight="800" fill="#09090b" text-anchor="middle">${String(day).padStart(2, '0')}</text>
        </g>

        <!-- Timezone Label Below Center -->
        <text x="150" y="215" font-family="Inter, sans-serif" font-size="7.5" font-weight="800" letter-spacing="1.8" fill="#52525b" text-anchor="middle">IST</text>

        <!-- Hour Hand (Tapered Black with Light Center Line) -->
        <g transform="rotate(${hourAngle} 150 150)">
          <polygon points="146,155 147.5,75 150,68 152.5,75 154,155" fill="#09090b"/>
          <line x1="150" y1="80" x2="150" y2="148" stroke="#ffffff" stroke-width="1" stroke-opacity="0.7"/>
        </g>

        <!-- Minute Hand (Tapered Black with Light Center Line) -->
        <g transform="rotate(${minuteAngle} 150 150)">
          <polygon points="146.5,158 148,50 150,42 152,50 153.5,158" fill="#09090b"/>
          <line x1="150" y1="52" x2="150" y2="152" stroke="#ffffff" stroke-width="1" stroke-opacity="0.7"/>
        </g>

        <!-- Center Pin Cap -->
        <circle cx="150" cy="150" r="5" fill="#09090b"/>

        <!-- Seconds Hand (Continuous Sweep with Counterweight Tail) -->
        <g transform="rotate(${secondAngle} 150 150)">
          <line x1="150" y1="172" x2="150" y2="36" stroke="#09090b" stroke-width="1.2"/>
          <circle cx="150" cy="165" r="3.5" fill="#09090b"/>
          <circle cx="150" cy="150" r="2.5" fill="#ffffff"/>
        </g>

        <!-- Glassy Highlight Crescent -->
        <path d="M 40,110 A 134,134 0 0,1 230,50 A 134,134 0 0,0 40,110 Z" fill="url(#glass-glare)"/>
      </svg>
    `;

    container.innerHTML = svgHTML;
    requestAnimationFrame(updateClock);
  }

  updateClock();
  checkClockTextCollisions();
  window.addEventListener('resize', checkClockTextCollisions);
}

/**
 * Dev-only check: warns if the clock bounding circle intersects any text element's bounding box
 */
function checkClockTextCollisions() {
  const clockSvg = document.querySelector('.bento-clock-svg');
  if (!clockSvg) return;

  const clockRect = clockSvg.getBoundingClientRect();
  if (clockRect.width === 0 || clockRect.height === 0) return;

  const cx = clockRect.left + clockRect.width / 2;
  const cy = clockRect.top + clockRect.height / 2;
  const radius = clockRect.width / 2;

  const textElements = document.querySelectorAll('.bento-about-grid h1, .bento-about-grid h2, .bento-about-grid h3, .bento-about-grid p, .bento-about-grid span, .bento-about-grid a');

  textElements.forEach((el) => {
    if (clockSvg.contains(el)) return;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const closestX = Math.max(rect.left, Math.min(cx, rect.right));
    const closestY = Math.max(rect.top, Math.min(cy, rect.bottom));

    const distanceX = cx - closestX;
    const distanceY = cy - closestY;
    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

    if (distanceSquared < (radius * radius)) {
      console.warn('[Clock Collision Warning] Clock overlaps text element:', el, 'Text:', el.textContent.trim());
    }
  });
}

