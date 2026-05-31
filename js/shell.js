/* ═══════════════════════════════════════════════════════════
   HELIX — SHELL ROUTER + LOGO + FX   js/shell.js

   · Two top-level views: research (modes traditional|nova) · docs
   · Hash grammar:  #research/traditional · #research/nova · #docs
   · Each view handed ?embed=1 → hides its own chrome + logo box
   · PERSISTENT animated logo: HELIX_GLITCH boots ONCE on the
     shell's #shell-logo-canvas and never reloads on view swap
   · FX panel drives the logo via the HELIX_GLITCH public API
   · postMessage bus: shell ⇄ active view
   Controller (this) ⇄ View (iframe) = MVC seam, no framework.
   ═══════════════════════════════════════════════════════════ */
(function(){
  "use strict";

  /* ── VIEW REGISTRY ── */
  const VIEWS = {
    research: {
      modes: {
        traditional: { src:'views/research-traditional.html', label:'RESEARCH · TRADITIONAL' },
        nova:        { src:'views/research-nova.html',        label:'RESEARCH · HELIX NOVA' },
      },
      defaultMode: 'traditional'
    },
    docs: { src:'views/documentation.html', label:'DOCUMENTATION' }
  };
  const DEFAULT_VIEW = 'research';

  const frame    = document.getElementById('view-frame');
  const veil     = document.getElementById('veil');
  const docbtn   = document.getElementById('docbtn');
  const modesEl  = document.getElementById('modes');
  const vtSwitch = document.getElementById('vt-switch');
  const statusEl = document.getElementById('status-view');

  let state = { view:null, mode:null };

  /* ── hash <-> state ── */
  function parseHash(){
    const raw = (location.hash||'').replace(/^#/,'').split('?')[0];
    const [v,m] = raw.split('/');
    if (v === 'docs') return { view:'docs', mode:null };
    if (v === 'research'){
      const mode = VIEWS.research.modes[m] ? m : VIEWS.research.defaultMode;
      return { view:'research', mode };
    }
    return { view:DEFAULT_VIEW, mode:VIEWS.research.defaultMode };
  }
  function writeHash(s){
    const h = s.view === 'research' ? ('research/'+s.mode) : 'docs';
    if (location.hash.replace(/^#/,'') !== h) location.hash = h;
  }
  function srcFor(s){
    return (s.view === 'research' ? VIEWS.research.modes[s.mode].src : VIEWS.docs.src) + '?embed=1';
  }
  function labelFor(s){
    return s.view === 'research' ? VIEWS.research.modes[s.mode].label : VIEWS.docs.label;
  }

  /* ── chrome sync ── */
  function syncChrome(s){
    const isResearch = s.view === 'research';
    [...modesEl.querySelectorAll('.vt-cell')].forEach(b =>{
      const on = isResearch && b.dataset.mode === s.mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    docbtn.classList.toggle('active', s.view === 'docs');
    docbtn.setAttribute('aria-selected', s.view === 'docs' ? 'true' : 'false');
    if (isResearch) vtSwitch.setAttribute('aria-checked', s.mode === 'nova' ? 'true' : 'false');
    statusEl.textContent = labelFor(s);
  }

  /* ── the swap ── */
  function apply(next, opts){
    opts = opts || {};
    const push = opts.push !== false;
    if (state.view===next.view && state.mode===next.mode) return;
    const prevSrc = state.view ? srcFor(state) : null;
    const nextSrc = srcFor(next);
    state = next;
    syncChrome(state);
    document.body.classList.toggle('view-docs', state.view === 'docs');   // light docs surface → shell drops the CRT overlay
    if (push) writeHash(state);
    if (nextSrc !== prevSrc){ veil.classList.add('on'); frame.src = nextSrc; }
  }
  frame.addEventListener('load', function(){ veil.classList.remove('on'); });

  /* ── interactions ── */
  docbtn.addEventListener('click', function(){ apply({view:'docs', mode:null}); });
  modesEl.addEventListener('click', function(e){
    const b = e.target.closest('.vt-cell'); if(!b) return;     // a hex always enters research
    apply({view:'research', mode:b.dataset.mode});
  });
  vtSwitch.addEventListener('click', function(){               // pill flips between the two views
    const cur = state.mode || VIEWS.research.defaultMode;
    apply({view:'research', mode: cur === 'nova' ? 'traditional' : 'nova'});
  });
  document.addEventListener('keydown', function(e){
    if(!e.altKey) return;
    if(e.key==='1'){ apply({view:'research', mode:state.mode||VIEWS.research.defaultMode}); e.preventDefault(); }
    if(e.key==='2'){ apply({view:'docs', mode:null}); e.preventDefault(); }
    if(e.key==='t' && state.view==='research'){ apply({view:'research', mode:'traditional'}); e.preventDefault(); }
    if(e.key==='n' && state.view==='research'){ apply({view:'research', mode:'nova'}); e.preventDefault(); }
  });
  window.addEventListener('hashchange', function(){ apply(parseHash(), {push:false}); });

  /* ── postMessage bus (shell ⇄ view) ── */
  window.addEventListener('message', function(ev){
    const m = ev.data; if(!m || m.helix!==true) return;
    if(m.type==='navigate' && VIEWS[m.view])
      apply(m.view==='research' ? {view:'research', mode:m.mode||VIEWS.research.defaultMode} : {view:'docs', mode:null});
    // research labels are owned by the router; only the docs view may post a
    // sub-section title (so a view can never clobber "RESEARCH · HELIX NOVA")
    if(m.type==='title' && m.text && state.view==='docs') statusEl.textContent = String(m.text).toUpperCase();
  });
  window.HELIX_SHELL = {
    send:function(msg){ try{ frame.contentWindow.postMessage(Object.assign({helix:true},msg),'*'); }catch(_){} },
    go: apply
  };

  /* ═══════════════════════════════════════════════════════════
     PERSISTENT LOGO + FX PANEL
     glitch.js auto-inits on 'glitch-canvas' inside main.html; here
     the SHELL owns the logo on its own canvas id, booted once.
     ═══════════════════════════════════════════════════════════ */
  const LOGO_IMAGES = ['assets/img/spiral_flavor.png','assets/img/helix_sleek.png','assets/img/helix_fusion_ha.png'];
  const LOGO_LABELS = ['SPIRAL','SLEEK','ABSTRACT'];

  function bootLogo(){
    if (!window.HELIX_GLITCH){ setTimeout(bootLogo, 80); return; }   // wait for glitch.js
    HELIX_GLITCH.init('shell-logo-canvas');
    if (HELIX_GLITCH.setAuto) HELIX_GLITCH.setAuto(true);            // match the active Auto button
    wireFxPanel();
  }

  function wireFxPanel(){
    const toggle = document.getElementById('fx-toggle');
    const panel  = document.getElementById('fx-panel');
    if (!toggle || !panel) return;

    toggle.addEventListener('click', function(){
      const open = panel.classList.toggle('open');
      toggle.classList.toggle('on', open);
    });
    // close on outside click
    document.addEventListener('click', function(e){
      if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== toggle){
        panel.classList.remove('open'); toggle.classList.remove('on');
      }
    });

    // logo image
    panel.querySelectorAll('[data-logo]').forEach(function(b){
      b.addEventListener('click', function(){
        const idx = +b.dataset.logo;
        HELIX_GLITCH.setImage(idx);
        panel.querySelectorAll('[data-logo]').forEach(function(x){ x.classList.toggle('active', +x.dataset.logo===idx); });
      });
    });
    // effect
    panel.querySelectorAll('[data-fx]').forEach(function(b){
      b.addEventListener('click', function(){
        HELIX_GLITCH.setEffect(b.dataset.fx);
        panel.querySelectorAll('[data-fx]').forEach(function(x){ x.classList.toggle('active', x.dataset.fx===b.dataset.fx); });
      });
    });
    // controls
    const trig = panel.querySelector('[data-act="trigger"]');
    const auto = panel.querySelector('[data-act="auto"]');
    const reset= panel.querySelector('[data-act="reset"]');
    if (trig)  trig.addEventListener('click', function(){ HELIX_GLITCH.triggerCurrent(); });
    if (auto)  auto.addEventListener('click', function(){
      const on = !auto.classList.contains('active'); auto.classList.toggle('active', on); HELIX_GLITCH.setAuto(on);
    });
    if (reset) reset.addEventListener('click', function(){ HELIX_GLITCH.reset(); });
  }

  /* ── boot ── */
  apply(parseHash(), {push:false});
  bootLogo();
})();
