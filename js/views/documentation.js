/* ═══════════════════════════════════════════════════════════
   HELIX — DOCUMENTATION PANEL ROUTER   js/views/documentation.js

   Mini-shell controller (the FORGE pattern, one level down inside
   the shell's iframe). Nav click → fetch content/panels/<id>.html
   → inject into #panel-host → run per-panel hooks. Manages its OWN
   hash (#overview, #gantt…), independent of the shell's #docs.

   Panel files live at  ../content/panels/<id>.html
   (this page is /views/documentation.html, so '../' reaches root).
   ═══════════════════════════════════════════════════════════ */
(function(){
  "use strict";

  const BASE    = "../content/panels/";
  const DEFAULT = "home";

  const host  = document.getElementById("panel-host");
  const nav   = document.getElementById("nav");
  const links = [].slice.call(nav.querySelectorAll(".nav-item[data-sec]"));
  const VALID = links.map(function(a){ return a.dataset.sec; });
  const cache = {};   // per-session panel-HTML cache → instant re-visits

  function setActive(id){
    links.forEach(function(a){ a.classList.toggle("active", a.dataset.sec === id); });
  }

  /* per-panel init hooks (the only one with live JS is the Gantt) */
  function runHooks(id){
    if (id === "gantt" && window.HelixGantt){
      var el = document.getElementById("gantt-host");
      if (el) HelixGantt.render(el);
    }
  }

  async function load(id, push){
    if (VALID.indexOf(id) === -1) id = DEFAULT;
    setActive(id);
    host.classList.add("loading");
    host.style.opacity = "0";
    try{
      var html = cache[id];
      if (html == null){
        var r = await fetch(BASE + id + ".html");
        if (!r.ok) throw new Error(r.status + " " + r.statusText);
        html = await r.text();
        cache[id] = html;
      }
      host.innerHTML = html;
      host.scrollTop = 0;
      runHooks(id);
    }catch(e){
      host.innerHTML = "<div class='panel-error'>Could not load panel <code>" + id + "</code>"
                     + "<span>" + (e && e.message ? e.message : e) + "</span></div>";
    }finally{
      host.classList.remove("loading");
      requestAnimationFrame(function(){ host.style.opacity = "1"; });
    }
    if (push && ("#" + id) !== location.hash) location.hash = id;
    if (window.HELIX_VIEW) HELIX_VIEW.toShell({ type:"title", text:"DOCS · " + id.toUpperCase() });
  }

  /* nav clicks (delegated) */
  nav.addEventListener("click", function(e){
    var a = e.target.closest(".nav-item[data-sec]");
    if (!a) return;                      // future items / external links fall through
    e.preventDefault();
    load(a.dataset.sec, true);
  });

  /* hash routing — deep-linkable panels within the doc view */
  window.addEventListener("hashchange", function(){
    load((location.hash || "").replace(/^#/, "") || DEFAULT, false);
  });

  /* boot */
  load((location.hash || "").replace(/^#/, "") || DEFAULT, false);
})();
