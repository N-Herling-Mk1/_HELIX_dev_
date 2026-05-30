/* ════════════════════════════════════════════
   HELIX — TOPBAR MODULE
   topbar.js

   Owns:
   · Slow shimmer sweep across topbar
   · One-shot laser border when shimmer crosses a button
   · Energy level toggle (0 → 1 → 3 → 0)
   · Glitch AUTO toggle helper
   · BE/FE backend polling (localhost only)
════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── ENERGY LEVEL TOGGLE ── */
  const energyBtn  = document.getElementById('energy-btn');
  const energyNum  = document.getElementById('energy-level-num');
  const CYCLE      = [0, 1, 2];

  /* Elements BELOW the header that get hidden when energy panel is active */
  const contentNormal = [
    document.getElementById('panel-empty'),
    document.getElementById('article-list'),
    document.getElementById('viewer-panel')
  ];
  /* Tabs to disable */
  const subtabs     = document.querySelectorAll('.subtab');
  /* Sector rail buttons to disable */
  const sectorBtns  = document.querySelectorAll('.sector-btn');
  /* Nav buttons (ABOUT / BLOG) to disable */
  const navBtns     = document.querySelectorAll('.navbtn');

  const ep1 = document.getElementById('energy-panel-1');
  const ep2 = document.getElementById('energy-panel-2');

  function showEnergyLevel(level) {
    const energyActive = level !== 0;

    /* hide/show normal below-header content */
    contentNormal.forEach(el => {
      if (el) el.style.display = energyActive ? 'none' : '';
    });

    /* show correct energy panel */
    if (ep1) ep1.style.display = level === 1 ? 'flex' : 'none';
    if (ep2) ep2.style.display = level === 2 ? 'flex' : 'none';

    /* disable/enable subtab buttons */
    subtabs.forEach(btn => {
      btn.disabled = energyActive;
      btn.style.opacity = energyActive ? '0.35' : '';
      btn.style.cursor  = energyActive ? 'not-allowed' : '';
    });

    /* disable/enable H-E-L-I-X sector rail buttons */
    sectorBtns.forEach(btn => {
      btn.disabled = energyActive;
      btn.style.opacity      = energyActive ? '0.35' : '';
      btn.style.cursor       = energyActive ? 'not-allowed' : '';
      btn.style.pointerEvents = energyActive ? 'none' : '';
    });

    /* disable/enable ABOUT / BLOG nav buttons */
    navBtns.forEach(btn => {
      btn.disabled = energyActive;
      btn.style.opacity      = energyActive ? '0.35' : '';
      btn.style.cursor       = energyActive ? 'not-allowed' : '';
      btn.style.pointerEvents = energyActive ? 'none' : '';
    });
  }

  energyBtn.addEventListener('click', () => {
    const cur  = parseInt(energyBtn.dataset.level);
    const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
    energyBtn.dataset.level = next;
    energyNum.textContent   = next;
    showEnergyLevel(next);
  });

  /* Close button — always returns to level 0, no cycling */
  window.closeEnergyPanel = function () {
    energyBtn.dataset.level = 0;
    energyNum.textContent   = 0;
    showEnergyLevel(0);
  };

  /* ── GLITCH HELPERS ── */
  window.gcToggleAuto = function () {
    const btn = document.getElementById('gc-auto-btn');
    if (!btn) return;
    const on = !btn.classList.contains('active');
    btn.classList.toggle('active', on);
    if (window.HELIX_GLITCH) HELIX_GLITCH.setAuto(on);
  };

  window.gcSetLogo = function (idx) {
    const IMAGES = [
      'assets/img/spiral_flavor.png',
      'assets/img/helix_sleek.png',
      'assets/img/helix_fusion_ha.png'
    ];
    const LABELS = ['SPIRAL','SLEEK','ABSTRACT'];
    if (window.HELIX_GLITCH) HELIX_GLITCH.setImage(idx);
    [0,1,2].forEach(i => {
      const b = document.getElementById('gc-logo-'+i);
      if (b) b.classList.toggle('active', i===idx);
    });
    const pi = document.getElementById('ep-preview-img');
    const pl = document.getElementById('ep-preview-label');
    if (pi) pi.src = IMAGES[idx];
    if (pl) pl.textContent = LABELS[idx];
  };

  window.gcSetFx = function (type) {
    if (window.HELIX_GLITCH) HELIX_GLITCH.setEffect(type);
    const rb = document.getElementById('gc-fx-rgb');
    const lb = document.getElementById('gc-fx-laser');
    if (rb) rb.classList.toggle('active', type === 'rgb');
    if (lb) lb.classList.toggle('active', type === 'laser');
  };

  /* ── GLITCH INIT ── */
  if (window.HELIX_GLITCH) HELIX_GLITCH.init('glitch-canvas');

  /* ── SYSTEM CLOCK ── */
  (function tickClock() {
    const timeEl = document.getElementById('ep-clock-time');
    const dateEl = document.getElementById('ep-clock-date');
    const tzEl   = document.getElementById('ep-clock-tz');
    if (!timeEl) { setTimeout(tickClock, 200); return; }

    const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN',
                    'JUL','AUG','SEP','OCT','NOV','DEC'];

    function pad(n) { return String(n).padStart(2,'0'); }

    function tick() {
      const now = new Date();
      timeEl.textContent =
        pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
      dateEl.textContent =
        DAYS[now.getDay()] + ' ' + pad(now.getDate()) + ' ' + MONTHS[now.getMonth()] + ' ' + now.getFullYear();
      const off   = -now.getTimezoneOffset();
      const sign  = off >= 0 ? '+' : '-';
      const absOff = Math.abs(off);
      if (tzEl) tzEl.textContent =
        'UTC' + sign + pad(Math.floor(absOff/60)) + ':' + pad(absOff%60);
      setTimeout(tick, 1000);
    }
    tick();
  })();

  /* ── BE/FE POLLING (localhost only) ── */
  if (['localhost', '127.0.0.1'].includes(location.hostname)) {
    const beLed   = document.getElementById('ep-be-led');
    const beBtn   = document.getElementById('ep-be-btn');
    const beLedWrap = document.getElementById('ep-be-led-wrap');
    const feLed   = document.getElementById('ep-fe-led');
    const feLedWrap = document.getElementById('ep-fe-led-wrap');
    const beTimer = document.getElementById('ep-be-timer');
    const feTimer = document.getElementById('ep-fe-timer');

    let beLastPoll = Date.now();
    let feLastPoll = Date.now();

    function fmtTime(ms) {
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      return String(m).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0');
    }

    /* update timers every second */
    setInterval(() => {
      if (beTimer) beTimer.textContent = fmtTime(Date.now() - beLastPoll);
      if (feTimer) feTimer.textContent = fmtTime(Date.now() - feLastPoll);
    }, 1000);

    async function poll() {
      let live = false;
      try {
        const r = await fetch('http://localhost:5000/health',
          { signal: AbortSignal.timeout(800) });
        live = r.ok;
      } catch (_) {}

      beLastPoll = Date.now();
      feLastPoll = Date.now();

      if (beLed)   beLed.textContent = live ? '1' : '0';
      if (beBtn)   beBtn.classList.toggle('live', live);
      if (beLedWrap) beLedWrap.classList.toggle('live', live);
      if (feLed)   feLed.textContent = live ? '0' : '1';
      if (feLedWrap) feLedWrap.classList.toggle('live', live);
    }
    poll();
    setInterval(poll, 3000);
  }

  /* ══════════════════════════════════════════
     TOPBAR SHIMMER + LASER BORDER ON CROSSING
  ══════════════════════════════════════════ */

  /* Buttons that get the laser treatment */
  const LASER_TARGETS = ['energy-btn', 'topbar-back-link'];

  /* Inject shimmer canvas behind topbar content */
  const topbar   = document.querySelector('.topbar');
  const shimmerC = document.createElement('canvas');
  shimmerC.id    = 'topbar-shimmer-canvas';
  shimmerC.style.cssText = `
    position:absolute; top:0; left:0; width:100%; height:100%;
    pointer-events:none; z-index:0;
  `;
  topbar.insertBefore(shimmerC, topbar.firstChild);

  /* Make topbar children sit above canvas */
  ['.topbar-left','.topbar-center-wrap','.topbar-right'].forEach(sel => {
    const el = topbar.querySelector(sel);
    if (el) el.style.position = 'relative', el.style.zIndex = '1';
  });

  /* ── Laser border: inject SVG overlay per button ── */
  function injectLaserOverlay(btn) {
    if (btn.querySelector('.laser-overlay')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('laser-overlay');
    svg.style.cssText = `
      position:absolute; inset:0; width:100%; height:100%;
      pointer-events:none; overflow:visible; z-index:2;
    `;
    svg.innerHTML = `
      <rect class="laser-rect" x="0.5" y="0.5"
        width="calc(100% - 1px)" height="calc(100% - 1px)"
        rx="0" ry="0"
        fill="none" stroke="var(--cyan)" stroke-width="1.5"
        stroke-dasharray="0 9999"
        style="filter:drop-shadow(0 0 4px var(--cyan)) drop-shadow(0 0 10px var(--cyan))"
      />`;
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(svg);
  }

  function fireLaser(btn) {
    const rect = btn.querySelector('.laser-rect');
    if (!rect) return;
    /* measure perimeter */
    const W = btn.offsetWidth;
    const H = btn.offsetHeight;
    const perimeter = 2 * (W + H);

    rect.setAttribute('width',  W - 1);
    rect.setAttribute('height', H - 1);

    /* reset */
    rect.style.transition = 'none';
    rect.setAttribute('stroke-dasharray',  `0 ${perimeter}`);
    rect.setAttribute('stroke-dashoffset', '0');

    /* force reflow */
    rect.getBoundingClientRect();

    /* animate: draw full border in 600ms, then fade */
    rect.style.transition = 'stroke-dasharray 0.55s linear, opacity 0.3s ease 0.55s';
    rect.setAttribute('stroke-dasharray', `${perimeter} 0`);
    rect.style.opacity = '1';

    setTimeout(() => {
      rect.style.opacity = '0';
      setTimeout(() => {
        rect.style.transition = 'none';
        rect.setAttribute('stroke-dasharray', `0 ${perimeter}`);
        rect.style.opacity = '1';
      }, 320);
    }, 560);
  }

  /* ── Shimmer sweep ── */
  /* measure start position — right edge of NAV HUB label */
  function getStartX() {
    const label = document.querySelector('.topbar-label');
    if (!label) return 0;
    const tr = topbar.getBoundingClientRect();
    const lr = label.getBoundingClientRect();
    return lr.right - tr.left;
  }

  let shimW = 0, shimH = 0;
  const SHIMMER_WIDTH  = 200;   // px wide
  const SHIMMER_SPEED  = 0.28;  // px per ms
  const SHIMMER_PAUSE  = 3200;  // ms between sweeps
  const SHIMMER_COLOR  = 'rgba(0,229,255,';
  const SHIMMER_TILT   = 0;     // vertical

  function resizeShimmer() {
    shimW = shimmerC.width  = topbar.offsetWidth;
    shimH = shimmerC.height = topbar.offsetHeight;
  }
  resizeShimmer();
  window.addEventListener('resize', resizeShimmer);

  /* track which buttons have been fired this sweep */
  let firedThisSweep = new Set();

  function checkCrossings(x) {
    LASER_TARGETS.forEach(id => {
      if (firedThisSweep.has(id)) return;
      const btn = document.getElementById(id);
      if (!btn) return;
      const br    = btn.getBoundingClientRect();
      const tr    = topbar.getBoundingClientRect();
      const btnCX = br.left - tr.left + br.width / 2; // center x relative to topbar
      /* fire when shimmer centre crosses button centre */
      if (x + SHIMMER_WIDTH / 2 >= btnCX && x <= btnCX + br.width / 2) {
        firedThisSweep.add(id);
        fireLaser(btn);
      }
    });
  }

  /* Inject overlays */
  function setupTargets() {
    LASER_TARGETS.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) injectLaserOverlay(btn);
    });
  }
  setupTargets();

  /* Main sweep loop */
  let sweepX    = getStartX() - SHIMMER_WIDTH;
  let lastTime  = null;
  let sweeping  = true;
  let pauseTimer = null;

  function shimmerLoop(ts) {
    if (!lastTime) lastTime = ts;
    const dt = ts - lastTime;
    lastTime = ts;

    if (sweeping) {
      sweepX += SHIMMER_SPEED * dt;
      checkCrossings(sweepX);

      /* draw tilted shimmer as parallelogram */
      const ctx = shimmerC.getContext('2d');
      ctx.clearRect(0, 0, shimW, shimH);
      ctx.save();

      /* clip to topbar bounds */
      ctx.beginPath();
      ctx.rect(0, 0, shimW, shimH);
      ctx.clip();

      /* parallelogram: top edge leads, bottom edge trails by SHIMMER_TILT */
      const x0 = sweepX;
      const x1 = sweepX + SHIMMER_WIDTH;
      const t  = SHIMMER_TILT;

      /* build horizontal gradient along the sweep direction */
      const gradX = Math.max(0, x0 - t);
      const grad  = ctx.createLinearGradient(gradX, 0, gradX + SHIMMER_WIDTH + t, 0);
      grad.addColorStop(0,    SHIMMER_COLOR + '0)');
      grad.addColorStop(0.25, SHIMMER_COLOR + '0.15)');
      grad.addColorStop(0.5,  SHIMMER_COLOR + '0.55)');
      grad.addColorStop(0.75, SHIMMER_COLOR + '0.15)');
      grad.addColorStop(1,    SHIMMER_COLOR + '0)');
      ctx.fillStyle = grad;

      /* draw tilted shape: top-left, top-right, bottom-right(+tilt), bottom-left(+tilt) */
      ctx.beginPath();
      ctx.moveTo(x0,         0);
      ctx.lineTo(x1,         0);
      ctx.lineTo(x1 + t,     shimH);
      ctx.lineTo(x0 + t,     shimH);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      if (sweepX > shimW + SHIMMER_WIDTH) {
        /* end of sweep — pause then restart */
        sweeping = false;
        firedThisSweep.clear();
        shimmerC.getContext('2d').clearRect(0, 0, shimW, shimH);
        pauseTimer = setTimeout(() => {
          sweepX   = getStartX() - SHIMMER_WIDTH;
          sweeping = true;
          lastTime = null;
        }, SHIMMER_PAUSE);
      }
    }

    requestAnimationFrame(shimmerLoop);
  }

  requestAnimationFrame(shimmerLoop);

})();
