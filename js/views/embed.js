/* ═══════════════════════════════════════════════════════════
   HELIX — EMBED HELPER   js/views/embed.js
   Loaded by every view. When running inside the app.html shell
   (?embed=1) it:
     · marks <html class="is-embedded"> → view-shell.css hides the
       view's own topbar AND its logo box (the shell owns the logo)
     · NEUTRALIZES any #glitch-canvas so a view's own auto-init
       (e.g. topbar.js in the Traditional port) finds nothing and
       no second animation loop runs — the shell owns the one loop
     · exposes window.HELIX_VIEW.toShell({type,...}) (title/ready/navigate)
   Runs synchronously, before the view's other scripts, so the
   canvas rename lands before topbar.js calls HELIX_GLITCH.init().
   ═══════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  var embedded = new URLSearchParams(location.search).get('embed') === '1';

  if (embedded){
    document.documentElement.classList.add('is-embedded');
    // kill the inner glitch canvas so the shell's logo is the only one running
    var gc = document.getElementById('glitch-canvas');
    if (gc) gc.id = 'glitch-canvas--shell-owned';
  }

  function toShell(msg){
    if (!embedded) return;
    try { parent.postMessage(Object.assign({helix:true}, msg), '*'); } catch(_){}
  }
  window.addEventListener('message', function(ev){
    var m = ev.data; if(!m || m.helix !== true) return;
    if (m.type === 'theme' && m.sector) document.documentElement.dataset.sector = m.sector;
    if (typeof window.onShellMessage === 'function') window.onShellMessage(m);
  });

  window.HELIX_VIEW = { embedded: embedded, toShell: toShell };
  document.addEventListener('DOMContentLoaded', function(){ toShell({type:'ready'}); });
})();
