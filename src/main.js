import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ==========================================================================
   TUSHIT AUDI — HERO CANVAS ROTATION & SCROLL CONTROLLER
   ========================================================================== */

const TOTAL_FRAMES = 118;
const FRAME_PATH_PREFIX = '/assets/frames/frame_';
const FRAME_PATH_SUFFIX = '.png';

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
 * Asynchronously preload all 118 sequence frames with smooth 3-second progress curve
 */
function preloadAllFrames() {
  return new Promise((resolve) => {
    preloaderStartTime = Date.now();

    // Start background image loading
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFrameFilename(i);
      
      img.onload = () => {
        loadedImages[i] = img;
        imagesLoadedCount++;
      };

      img.onerror = () => {
        console.warn(`[Frame Preload] Failed to load frame ${i + 1}. Retrying...`);
        setTimeout(() => {
          img.src = getFrameFilename(i);
        }, 500);
      };
    }

    // Smooth UI progress loop (guarantees 3-second display)
    function updateProgressLoop() {
      const elapsed = Date.now() - preloaderStartTime;
      const timeFactor = Math.min(1, elapsed / MIN_PRELOADER_DURATION);
      const frameFactor = imagesLoadedCount / TOTAL_FRAMES;
      
      // Calculate realistic progress blending time and actual frame loading
      const currentCalculated = Math.floor(Math.min(timeFactor, frameFactor > 0 ? (timeFactor * 0.6 + frameFactor * 0.4) : timeFactor) * 100);
      
      if (currentCalculated > displayedPercent) {
        displayedPercent = currentCalculated;
      }

      const formattedPercent = String(displayedPercent).padStart(2, '0') + '%';
      if (preloaderBar) preloaderBar.style.width = `${displayedPercent}%`;
      if (preloaderPercent) preloaderPercent.textContent = formattedPercent;

      if (elapsed >= MIN_PRELOADER_DURATION && imagesLoadedCount >= TOTAL_FRAMES) {
        if (preloaderBar) preloaderBar.style.width = '100%';
        if (preloaderPercent) preloaderPercent.textContent = '100%';
        
        setTimeout(() => {
          onAllFramesLoaded();
          resolve();
        }, 150);
      } else {
        requestAnimationFrame(updateProgressLoop);
      }
    }

    requestAnimationFrame(updateProgressLoop);
  });
}

/**
 * Triggered once all 118 frame images have completed preloading and 3s duration elapsed
 */
function onAllFramesLoaded() {
  isPreloaded = true;
  isScrollLocked = true;

  // Force scroll position to top
  window.scrollTo(0, 0);
  targetProgressIndex = 0;
  currentProgressIndex = 0;

  // Initial canvas sizing & first frame render BEFORE preloader fade
  resizeCanvas();
  renderFrame(0);

  // Smoothly fade in hero canvas/video element
  const canvasWrapper = document.getElementById('hero-canvas-wrapper');
  if (canvasWrapper) {
    canvasWrapper.classList.add('is-loaded');
  }

  // Smoothly fade out preloader screen
  if (preloader) {
    preloader.classList.add('fade-out');
  }

  // Initial scroll calculation & skill reveals
  onScroll();

  // Bind scroll listeners & start render animation loop
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  
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

  startAnimationLoop();

  // Initialize GSAP ScrollTrigger animations across all sections
  initGSAPAnimations();

  // Release scroll lock after 350ms once preloader fade and scroll rest state complete
  setTimeout(() => {
    window.scrollTo(0, 0);
    targetProgressIndex = 0;
    currentProgressIndex = 0;
    isScrollLocked = false;
    ScrollTrigger.refresh();
  }, 350);
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

  capabilityItems.forEach((item) => {
    const threshold = parseFloat(item.dataset.threshold || '0');
    if (progress >= threshold) {
      item.classList.add('is-revealed');
    } else {
      item.classList.remove('is-revealed');
    }
  });
}

/**
 * 60fps render loop with smooth inertia lerping between scroll frame states
 */
function startAnimationLoop() {
  function loop() {
    // Lerp towards target frame for silky smooth motion
    const diff = targetProgressIndex - currentProgressIndex;
    
    if (Math.abs(diff) > 0.001) {
      currentProgressIndex += diff * 0.18;
      renderFrame(Math.min(TOTAL_FRAMES - 1, Math.max(0, currentProgressIndex)));
    } else {
      currentProgressIndex = targetProgressIndex;
    }

    // Continuously sync capability item highlight states with frame progress (60fps)
    const lerpedProgress = currentProgressIndex / (TOTAL_FRAMES - 1);
    updateSkillReveals(lerpedProgress);

    animationFrameId = requestAnimationFrame(loop);
  }

  loop();
}

/**
 * Draw specified frame index on hero canvas centered with contain aspect ratio
 */
function renderFrame(rawFrameIndex) {
  const frameIndex = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.floor(rawFrameIndex)));
  const img = loadedImages[frameIndex];

  if (!img || !img.complete) return;

  const width = window.innerWidth;
  const height = window.innerHeight;

  ctx.clearRect(0, 0, width, height);

  // Calculate image scale & positioning ("contain" fit with portrait prominence)
  const imgAspect = img.width / img.height;
  const viewportAspect = width / height;

  let drawW, drawH, drawX, drawY;

  const isMobile = width < 768;
  const scaleMultiplier = isMobile ? 1.0 : 1.15;

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
  // 1. Hero Canvas Rotation ScrollTrigger Easing
  if (heroScrollContainer) {
    ScrollTrigger.create({
      trigger: heroScrollContainer,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.3,
      onUpdate: (self) => {
        if (!isPreloaded || isScrollLocked) return;
        targetProgressIndex = self.progress * (TOTAL_FRAMES - 1);
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

// Initialize preloader sequence on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
  preloadAllFrames();
  initInteractiveTerminal();
  initStatCounters();
});
