/* ════════════════════════════════════════════
   HELIX GLITCH v3 — two independent effects
   'rgb'   : chromatic aberration + CRT roll (on image canvas)
   'laser' : laser trace + sparks (on overlay canvas, div border)
   Image + effect choices persist via sessionStorage.
════════════════════════════════════════════ */
const HELIX_GLITCH = window.HELIX_GLITCH = (function () {
  "use strict";

  const IMAGES = [
    'assets/img/spiral_flavor.png',
    'assets/img/helix_sleek.png',
    'assets/img/helix_fusion_ha.png'
  ];

  const DEFAULTS = {
    intensity: 16, channel: 'rg',
    rollSpeed: 3,  barHeight: 40,
    auto: true,    leftRight: false,
    imageIdx: 0,   effect: 'rgb'
  };

  let canvas, ctx, W, H;
  let etchCanvas = null, etchCtx = null, EW, EH;
  let chanA = null, chanB = null;
  let glitching = false;
  let autoMode  = false;
  let autoTimer = null, timerRaf = null;
  let rollRaf   = null;   // tracks scanline roll rAF
  let laserRaf  = null;   // tracks laser etch rAF
  let jitterIds = [];     // tracks jitter setTimeout IDs
  let cfg = { ...DEFAULTS };
  let img = new Image();

  /* ── SESSION STORAGE ── */
  function saveSession() {
    try { sessionStorage.setItem('helix_logo', cfg.imageIdx);
          sessionStorage.setItem('helix_fx',   cfg.effect); } catch(e) {}
  }
  function loadSession() {
    try {
      const l = sessionStorage.getItem('helix_logo');
      const f = sessionStorage.getItem('helix_fx');
      if (l !== null) cfg.imageIdx = parseInt(l);
      if (f !== null) cfg.effect   = f;
    } catch(e) {}
  }

  /* ── CHANNELS ── */
  function getChannelDef(m) {
    switch (m) {
      case 'rg': return { a:[255,0,0], b:[0,255,0],   roll:[0,220,80]  };
      case 'rb': return { a:[255,0,0], b:[0,0,255],   roll:[80,0,255]  };
      case 'gc': return { a:[0,255,0], b:[0,255,255], roll:[0,255,180] };
      default:   return { a:[255,0,0], b:[0,255,255], roll:[0,200,255] };
    }
  }
  function makeCC(src, rgb) {
    const t = document.createElement('canvas');
    t.width = W; t.height = H;
    const x = t.getContext('2d');
    x.drawImage(src, 0, 0, W, H);
    const d = x.getImageData(0, 0, W, H), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      p[i]   = p[i]   * rgb[0] / 255;
      p[i+1] = p[i+1] * rgb[1] / 255;
      p[i+2] = p[i+2] * rgb[2] / 255;
    }
    x.putImageData(d, 0, 0);
    return t;
  }
  function buildChannels() {
    if (!img.complete || !img.naturalWidth) return;
    const d = getChannelDef(cfg.channel);
    chanA = makeCC(img, d.a);
    chanB = makeCC(img, d.b);
  }
  function drawBase() {
    if (!ctx || !img.complete) return;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(img, 0, 0, W, H);
  }
  function drawGlitch(ax, ay, bx, by) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(chanA, ax, ay, W, H);
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(chanB, bx, by, W, H);
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(img, 0, 0, W, H);
  }

  /* ── EFFECT 1: RGB + CRT ROLL ── */
  function rollOnce(r, g, b, ppf, barH, done) {
    const snap = document.createElement('canvas');
    snap.width = W; snap.height = H;
    snap.getContext('2d').drawImage(canvas, 0, 0);
    let y = H + barH;
    function frame() {
      y -= ppf;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H); ctx.drawImage(snap, 0, 0);
      const ct = Math.max(0, Math.round(y));
      const cb = Math.min(H, Math.round(y + barH));
      if (cb > ct) {
        const bh = cb - ct;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(${r},${g},${b},0.18)`;
        ctx.fillRect(0, ct, W, bh);
        const nd = ctx.getImageData(0, ct, W, bh).data;
        for (let i = 0; i < nd.length; i += 4) {
          if (Math.random() < 0.28) {
            const v = Math.random();
            nd[i]   = Math.min(255, nd[i]   + v*r*0.35);
            nd[i+1] = Math.min(255, nd[i+1] + v*g*0.35);
            nd[i+2] = Math.min(255, nd[i+2] + v*b*0.35);
          }
        }
        const id2 = new ImageData(nd, W, bh);
        ctx.globalCompositeOperation = 'source-over';
        ctx.putImageData(id2, 0, ct);
        ctx.globalCompositeOperation = 'screen';
        const eg = ctx.createLinearGradient(0, ct, 0, ct + Math.min(3,bh));
        eg.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
        eg.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = eg; ctx.fillRect(0, ct, W, Math.min(3,bh));
        const wh = Math.min(barH*2, H-cb);
        if (wh > 0) {
          const wg = ctx.createLinearGradient(0, cb, 0, cb+wh);
          wg.addColorStop(0, `rgba(${r},${g},${b},0.08)`);
          wg.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = wg; ctx.fillRect(0, cb, W, wh);
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      if (y + barH > 0) rollRaf = requestAnimationFrame(frame);
      else { drawBase(); if (done) done(); }
    }
    rollRaf = requestAnimationFrame(frame);
  }
  function rollOnceH(r, g, b, ppf, barW, done) {
    const snap = document.createElement('canvas');
    snap.width = W; snap.height = H;
    snap.getContext('2d').drawImage(canvas, 0, 0);
    let x = -barW;
    function frame() {
      x += ppf;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H); ctx.drawImage(snap, 0, 0);
      const cl = Math.max(0, Math.round(x));
      const cr = Math.min(W, Math.round(x+barW));
      if (cr > cl) {
        const bw = cr-cl;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(${r},${g},${b},0.18)`;
        ctx.fillRect(cl, 0, bw, H);
        const nd = ctx.getImageData(cl, 0, bw, H).data;
        for (let i=0; i<nd.length; i+=4) {
          if (Math.random()<0.28) {
            const v=Math.random();
            nd[i]  =Math.min(255,nd[i]  +v*r*0.35);
            nd[i+1]=Math.min(255,nd[i+1]+v*g*0.35);
            nd[i+2]=Math.min(255,nd[i+2]+v*b*0.35);
          }
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.putImageData(new ImageData(nd, bw, H), cl, 0);
        ctx.globalCompositeOperation = 'screen';
        const eg = ctx.createLinearGradient(cl,0,cl+Math.min(3,bw),0);
        eg.addColorStop(0,`rgba(${r},${g},${b},0.55)`);
        eg.addColorStop(1,`rgba(${r},${g},${b},0)`);
        ctx.fillStyle=eg; ctx.fillRect(cl,0,Math.min(3,bw),H);
        const ww=Math.min(barW*2,W-cr);
        if (ww>0) {
          const wg=ctx.createLinearGradient(cr,0,cr+ww,0);
          wg.addColorStop(0,`rgba(${r},${g},${b},0.08)`);
          wg.addColorStop(1,`rgba(${r},${g},${b},0)`);
          ctx.fillStyle=wg; ctx.fillRect(cr,0,ww,H);
        }
        ctx.globalCompositeOperation='source-over';
      }
      if (x < W+barW) rollRaf = requestAnimationFrame(frame);
      else { drawBase(); if (done) done(); }
    }
    rollRaf = requestAnimationFrame(frame);
  }
  function rollScanline(done) {
    const d = getChannelDef(cfg.channel);
    const [r,g,b] = d.roll;
    const ppf = [1,1.5,2,3,4.5][cfg.rollSpeed-1];
    const fn  = cfg.leftRight ? rollOnceH : rollOnce;
    function pass(i) {
      if (i>=3) { if(done) done(); return; }
      fn(r,g,b,ppf,cfg.barHeight, ()=>setTimeout(()=>pass(i+1),100));
    }
    pass(0);
  }
  function triggerRGB() {
    if (glitching || !chanA) return;
    glitching = true;
    const px = cfg.intensity;
    const J = cfg.leftRight ? [
      {ax:-1,ay: px,    bx: 1,by:-px,    dur:50},
      {ax: 2,ay:-px*2,  bx:-2,by: px,    dur:40},
      {ax: 0,ay: px,    bx: 1,by:-px/2,  dur:30},
      {base:true,                         dur:20},
      {ax: 1,ay:-px,    bx:-1,by: px*1.5,dur:45},
      {ax:-2,ay: px/2,  bx: 2,by:-px,    dur:35},
      {ax: 0,ay:-px*1.5,bx: 0,by: px/2,  dur:25},
      {base:true,                         dur:10},
    ] : [
      {ax: px,   ay:-1,bx:-px,   by: 1,dur:50},
      {ax:-px*2, ay: 2,bx: px,   by:-2,dur:40},
      {ax: px,   ay: 0,bx:-px/2, by: 1,dur:30},
      {base:true,                      dur:20},
      {ax:-px,   ay: 1,bx: px*1.5,by:-1,dur:45},
      {ax: px/2, ay:-2,bx:-px,   by: 2,dur:35},
      {ax:-px*1.5,ay:0,bx: px/2, by: 0,dur:25},
      {base:true,                      dur:10},
    ];
    jitterIds = [];
    let t = 0;
    J.forEach(f => {
      const id = setTimeout(() => { f.base ? drawBase() : drawGlitch(f.ax,f.ay,f.bx,f.by); }, t);
      jitterIds.push(id);
      t += f.dur;
    });
    const rollId = setTimeout(() => rollScanline(() => { glitching = false; }), t + 30);
    jitterIds.push(rollId);
  }

  /* ── EFFECT 2: LASER ETCH on overlay canvas (div border) ── */
  function initEtchCanvas() {
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    if (etchCanvas) return; // already created
    etchCanvas = document.createElement('canvas');
    etchCanvas.style.cssText = [
      'position:absolute','inset:-1px',
      'pointer-events:none','z-index:10',
      'width:calc(100% + 2px)','height:calc(100% + 2px)'
    ].join(';');
    parent.appendChild(etchCanvas);
    // size in device pixels
    const r = window.devicePixelRatio || 1;
    EW = etchCanvas.offsetWidth  || parent.offsetWidth  || 182;
    EH = etchCanvas.offsetHeight || parent.offsetHeight || 182;
    etchCanvas.width  = Math.round(EW * r);
    etchCanvas.height = Math.round(EH * r);
    etchCtx = etchCanvas.getContext('2d');
    etchCtx.scale(r, r);
  }

  function clearEtch() {
    if (etchCtx) etchCtx.clearRect(0, 0, EW + 4, EH + 4);
  }

  function triggerLaser(done) {
    initEtchCanvas();
    if (!etchCtx) { if(done) done(); return; }

    const particles = [];
    const perim = 2*(EW+EH);
    const SPEED = 4, TRAIL = 55;
    let dist = 0, lastDist = 0;
    const corners = [0, EW, EW+EH, EW+EH+EW];

    function pos(d) {
      const p = ((d % perim) + perim) % perim;
      if (p < EW)         return {x:p,      y:0     };
      if (p < EW+EH)      return {x:EW,     y:p-EW  };
      if (p < EW+EH+EW)   return {x:EW-(p-EW-EH), y:EH};
      return                     {x:0,      y:EH-(p-EW-EH-EW)};
    }

    function sparks(x, y, n) {
      for (let i=0; i<n; i++) {
        const a = Math.random()*Math.PI*2;
        const s = 0.8 + Math.random()*3.5;
        // red / orange / warm-white palette
        const pick = Math.random();
        let r,g,b;
        if      (pick < 0.4) { r=255; g=30;  b=30;  }  // red
        else if (pick < 0.75){ r=255; g=110; b=0;   }  // orange
        else                  { r=255; g=220; b=180; }  // warm white
        particles.push({
          x,y, vx:Math.cos(a)*s, vy:Math.sin(a)*s,
          life:1, decay:0.028+Math.random()*0.022,
          r, g, b,
          sz:0.8+Math.random()*1.6
        });
      }
    }

    function frame() {
      dist += SPEED;
      corners.forEach(c=>{
        if (lastDist<=c && dist>c) {
          const p=pos(c); sparks(p.x,p.y,22);
        }
      });
      if (Math.random()<0.18) { const p=pos(dist); sparks(p.x,p.y,4); }
      lastDist = dist;

      clearEtch();
      const ex = etchCtx;

      // trail — red
      ex.globalCompositeOperation='source-over';
      for (let i=TRAIL; i>=0; i--) {
        const td=dist-i; if(td<0) continue;
        const p=pos(td);
        const al=(1-i/TRAIL)*0.9, sz=(1-i/TRAIL)*2.5;
        ex.fillStyle=`rgba(255,40,40,${al})`;
        ex.shadowBlur=(1-i/TRAIL)*16; ex.shadowColor='#ff2020';
        ex.beginPath(); ex.arc(p.x,p.y,sz,0,Math.PI*2); ex.fill();
      }

      // head — bright white-red
      const h=pos(dist);
      ex.shadowBlur=28; ex.shadowColor='#ff4040';
      ex.fillStyle='#ffffff';
      ex.beginPath(); ex.arc(h.x,h.y,3.5,0,Math.PI*2); ex.fill();
      // inner red core
      ex.shadowBlur=10; ex.shadowColor='#ff2020';
      ex.fillStyle='#ff6060';
      ex.beginPath(); ex.arc(h.x,h.y,1.8,0,Math.PI*2); ex.fill();
      ex.shadowBlur=0;

      // particles
      for (let i=particles.length-1; i>=0; i--) {
        const p=particles[i];
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.06; p.life-=p.decay;
        if (p.life<=0) { particles.splice(i,1); continue; }
        ex.fillStyle=`rgba(${p.r},${p.g},${p.b},${p.life})`;
        ex.shadowBlur=8; ex.shadowColor=`rgba(${p.r},${p.g},${p.b},0.8)`;
        ex.beginPath(); ex.arc(p.x,p.y,p.sz,0,Math.PI*2); ex.fill();
      }
      ex.shadowBlur=0;

      if (dist < perim+TRAIL || particles.length>0) {
        laserRaf = requestAnimationFrame(frame);
      } else {
        clearEtch();
        if (done) done();
      }
    }
    laserRaf = requestAnimationFrame(frame);
  }

  /* ── DISPATCH ── */
  function triggerCurrent() {
    if (cfg.effect==='laser') {
      if (glitching) return;
      glitching=true;
      triggerLaser(()=>{ glitching=false; });
    } else {
      triggerRGB();
    }
  }

  /* ── TIMER BAR ── */
  function updateTimer(start, dur) {
    const fill=document.getElementById('gc-timer-fill');
    if(!fill) return;
    function tick() {
      fill.style.width=(Math.min(1,(Date.now()-start)/dur)*100)+'%';
      if (Date.now()-start<dur) timerRaf=requestAnimationFrame(tick);
    }
    cancelAnimationFrame(timerRaf); tick();
  }
  function flashTimer() {
    const fill=document.getElementById('gc-timer-fill');
    if(!fill) return;
    fill.classList.add('flash'); fill.style.width='100%';
    setTimeout(()=>{ fill.classList.remove('flash'); fill.style.width='0%'; },300);
  }

  /* ── AUTO SCHEDULE ── */
  function scheduleNext() {
    if (!autoMode) return;
    const delay=3000+Math.random()*4000, start=Date.now();
    updateTimer(start,delay);
    autoTimer=setTimeout(()=>{
      flashTimer(); triggerCurrent(); scheduleNext();
    },delay);
  }
  /* ── HARD STOP — kills all in-flight animation immediately ── */
  function hardStop() {
    glitching = false;
    autoMode  = false;
    clearTimeout(autoTimer);
    cancelAnimationFrame(timerRaf);
    cancelAnimationFrame(rollRaf);
    cancelAnimationFrame(laserRaf);
    jitterIds.forEach(id => clearTimeout(id));
    jitterIds = [];
    rollRaf  = null;
    laserRaf = null;
  }

  function setAuto(on) {
    autoMode = on;
    clearTimeout(autoTimer);
    cancelAnimationFrame(timerRaf);
    const fill = document.getElementById('gc-timer-fill');
    if (fill) fill.style.width = '0%';
    if (autoMode) scheduleNext();
  }

  /* ══════════════════════════════════════
     NUCLEAR STATE CHANGE — every swap
     routes through here: clear, rebuild,
     restart with new image + effect.
  ══════════════════════════════════════ */
  function applyState(imageIdx, effectType) {
    // 1. Hard stop — cancels all in-flight rAF and timeouts
    hardStop();

    // 2. Clear both canvases immediately
    if (ctx) ctx.clearRect(0, 0, W, H);
    clearEtch();

    // 3. Apply state
    cfg.imageIdx = imageIdx;
    cfg.effect   = effectType;
    chanA = null;
    chanB = null;

    // 4. Save session
    try {
      sessionStorage.setItem('helix_logo', imageIdx);
      sessionStorage.setItem('helix_fx',   effectType);
    } catch(e) {}

    // 5. Sync effect UI
    ['gc-fx-rgb', 'gc-fx-laser'].forEach(id => {
      const b = document.getElementById(id);
      if (b) b.classList.toggle('active',
        id === 'gc-fx-rgb' ? effectType === 'rgb' : effectType === 'laser');
    });

    // 6. Sync logo UI
    [0, 1, 2].forEach(i => {
      const b = document.getElementById('gc-logo-' + i);
      if (b) b.classList.toggle('active', i === imageIdx);
    });

    // 7. Fresh image + restart — done flag prevents double-fire
    img = new Image();
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      buildChannels();
      drawBase();
      setAuto(true);
    };
    img.onload = go;
    img.src    = IMAGES[imageIdx];
    if (img.complete && img.naturalWidth) go();
  }

  /* convenience wrappers */
  function setImage(idx)    { applyState(idx,           cfg.effect);   }
  function setEffect(type)  { applyState(cfg.imageIdx,  type);         }

  function reset() {
    // wipe session, reset toggles, then applyState to defaults
    try {
      sessionStorage.removeItem('helix_logo');
      sessionStorage.removeItem('helix_fx');
    } catch(e) {}
    ['gc-auto-btn', 'gc-lr-btn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
    const fill = document.getElementById('gc-timer-fill');
    if (fill) fill.style.width = '0%';
    cfg = { ...DEFAULTS };
    applyState(DEFAULTS.imageIdx, DEFAULTS.effect);
  }


  /* ── PUBLIC API ── */
  function init(canvasId) {
    canvas=document.getElementById(canvasId);
    if(!canvas) return;
    ctx=canvas.getContext('2d', { willReadFrequently: true });
    W=canvas.width; H=canvas.height;

    loadSession(); // restore saved choices

    img.onload=()=>{ buildChannels(); drawBase(); setAuto(cfg.auto); };
    img.onerror=()=>console.error('HELIX_GLITCH: failed to load',img.src);
    img.src=IMAGES[cfg.imageIdx];

    canvas.addEventListener('click', triggerCurrent);

    // sync UI to restored session state
    setTimeout(()=>{
      setImage(cfg.imageIdx, false);
      setEffect(cfg.effect);
      initEtchCanvas();
    }, 100);
  }

  function setIntensity(px){ cfg.intensity=px; }
  function setChannel(m)   { cfg.channel=m; buildChannels(); }
  function setRollSpeed(n) { cfg.rollSpeed=n; }
  function setBarHeight(px){ cfg.barHeight=px; }
  function setLeftRight(on){ cfg.leftRight=on; }

  return {
    init, triggerCurrent,
    setImage, setEffect,
    setIntensity, setChannel,
    setRollSpeed, setBarHeight, setLeftRight,
    setAuto, reset
  };

})();
