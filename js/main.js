/* ════════════════════════════════════════════
   HELIX — MAIN HUB LOGIC
   main.js
════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ── BULK_DB MANIFEST LOADING ── */
  // Fetches assets/bulk_db/manifest.json and merges each component into the
  // matching sector's articles array. Works on both localhost (Flask serves
  // it as a static file) and on GitHub Pages (committed manifest is served
  // directly). Non-blocking — if it fails, we just keep whatever articles.js
  // already has.
  let manifestLoaded = false;
  async function loadManifest() {
    try {
      const r = await fetch('assets/bulk_db/manifest.json?t=' + Date.now());
      if (!r.ok) return;
      const m = await r.json();
      mergeManifestIntoSectors(m.components || []);
      manifestLoaded = true;
      // re-render if a sector/tab was selected before manifest arrived
      if (activeSector && activeTab) {
        const s = HELIX_SECTORS.find(x => x.letter === activeSector);
        if (s) renderContent(s, activeTab);
        updateNavCounts(activeTab);
      }
    } catch (e) { /* silent — manifest optional */ }
  }
  function mergeManifestIntoSectors(components) {
    for (const c of components) {
      const article = {
        id:       c.id,
        title:    c.name || c.filename || '(untitled)',
        authors:  c.authors || '',
        year:     c.year || (c.added ? c.added.slice(0, 4) : ''),
        tags:     c.tags || [],
        abstract: c.description || '',
        file:     c.path,
        status:   'published'
      };
      for (const letter of (c.sectors || [])) {
        const sec = HELIX_SECTORS.find(x => x.letter === letter);
        if (sec) {
          sec.articles = sec.articles || [];
          sec.articles.push(article);
        }
      }
    }
  }

  /* ── ELEMENTS ── */
  const sectorBtns    = document.querySelectorAll(".sector-btn");
  const subtabs       = document.querySelectorAll(".subtab");
  const articleList   = document.getElementById("article-list");
  const viewerPanel   = document.getElementById("viewer-panel");
  const viewerFrame   = document.getElementById("viewer-frame");
  const viewerGrain   = document.getElementById("viewer-grain");
  const viewerBack    = document.getElementById("viewer-back");
  const viewerTitle   = document.getElementById("viewer-doc-title");
  const viewerDl      = document.getElementById("viewer-dl");
  const panelEmpty    = document.getElementById("panel-empty");
  const emptyMsg1     = document.getElementById("empty-msg-1");
  const emptyMsg2     = document.getElementById("empty-msg-2");
  const contentLetter = document.getElementById("content-sector-letter");
  const contentName   = document.getElementById("content-sector-name");
  const navAbout      = document.getElementById("navbtn-about");
  const navBlog       = document.getElementById("navbtn-blog");

  let activeSector = null;
  let activeTab    = null;
  let pageMode     = false;   // true when viewer is showing a static page (about/etc)

  /* ── EMPTY STATE SWITCHING ── */
  function showEmptyState(state) {
    if (panelEmpty) panelEmpty.style.display = "flex";
    hide(articleList);
    hide(viewerPanel);
    if (emptyMsg1) emptyMsg1.classList.toggle("hidden", state !== 1);
    if (emptyMsg2) emptyMsg2.classList.toggle("hidden", state !== 2);
  }

  function applySectorTheme(s) {
    document.documentElement.style.setProperty("--sector-color", s.color);
    document.documentElement.style.setProperty("--sector-glow",  s.glow);
    document.documentElement.style.setProperty("--sector-ghost", s.ghost);
  }

  /* ── HELPERS ── */
  function show(el) { if (el) el.style.display = "flex"; }
  function hide(el) { if (el) el.style.display = "none"; }
  function updateNavCounts(tab) {
    sectorBtns.forEach(btn => {
      const s  = HELIX_SECTORS.find(x => x.letter === btn.dataset.sector);
      const el = btn.querySelector(".btn-count");
      if (!s || !el) return;
      const map   = { articles: s.articles, notes: s.notes, goals: s.goals };
      const arr   = map[tab] || [];
      const label = { articles:"ARTICLE", notes:"NOTE", goals:"GOAL" }[tab] || "";
      el.textContent = arr.length + " " + label + (arr.length !== 1 ? "S" : "");
    });
  }

  /* ── RENDER ── */
  function showContent() {
    hide(panelEmpty);
    hide(viewerPanel);
    articleList.innerHTML = "";
    show(articleList);
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function renderArticles(s) {
    showContent();
    const items = s.articles || [];
    if (!items.length) { articleList.innerHTML = `<div class="panel-empty" style="opacity:1;flex:1"><div class="empty-label">NO ARTICLES YET</div></div>`; return; }
    items.forEach((art, i) => {
      const isRef = !!(art.url || art.pdf);   // reference = external paper/book (has links)
      const card = document.createElement("div");
      card.className = "article-card" + (isRef ? " article-card-ref" : "");
      card.style.animationDelay = `${i * 0.06}s`;

      let status;
      if (isRef)                       status = `<span class="card-status ref">REFERENCE&nbsp;↗</span>`;
      else if (art.status === "draft") status = `<span style="color:var(--text-faint);font-size:12px;letter-spacing:.15em">DRAFT</span>`;
      else                             status = `<span style="color:var(--green-dim);font-size:12px">PUBLISHED</span>`;

      const tags  = (art.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join("");
      const venue = art.venue ? `<div class="card-venue">${esc(art.venue)}</div>` : "";

      // VIEW: reference → open landing URL in a new tab. draft → open local file in viewer.
      // DOWNLOAD: reference → fetch pdf into viewer (+ browser download). draft → direct local download.
      const actions = isRef
        ? `<button class="btn-view"><span>◉</span> VIEW</button>
           <button class="btn-dl btn-dl-ref"><span>↓</span> DOWNLOAD</button>`
        : `<button class="btn-view"><span>◉</span> VIEW</button>
           <a class="btn-dl" href="${esc(art.file)}" download="${esc(art.title)}.pdf"><span>↓</span> DOWNLOAD</a>`;

      card.innerHTML = `
        <div class="card-index">[${String(i+1).padStart(2,"0")}]</div>
        <div class="card-body">
          <div class="card-title">${esc(art.title)}</div>
          ${venue}
          <div class="card-meta"><span>${esc(art.authors)}</span><span>${esc(art.year)}</span>${status}</div>
          <div class="card-meta" style="margin-top:4px">${tags}</div>
          <div class="card-abstract">${esc(art.abstract)}</div>
        </div>
        <div class="card-actions">${actions}</div>`;

      const viewBtn = card.querySelector(".btn-view");
      if (isRef) {
        viewBtn.addEventListener("click", () => {
          const target = art.url || art.pdf;
          window.open(target, "_blank", "noopener");
        });
        card.querySelector(".btn-dl-ref").addEventListener("click", () => {
          downloadAndView(art, s);
        });
      } else {
        viewBtn.addEventListener("click", () => openViewer(art.file, art.title, s));
      }
      articleList.appendChild(card);
    });
  }

  function renderNotes(s) {
    showContent();
    const items = s.notes || [];
    if (!items.length) { articleList.innerHTML = `<div class="panel-empty" style="opacity:1;flex:1"><div class="empty-label">NO NOTES YET</div></div>`; return; }
    items.forEach((note, i) => {
      const card = document.createElement("div");
      card.className = "note-card";
      card.style.animationDelay = `${i * 0.06}s`;
      card.innerHTML = `<div class="note-date">${note.date}</div><div class="note-text">${note.text}</div>`;
      articleList.appendChild(card);
    });
  }

  function renderGoals(s) {
    showContent();
    const items = s.goals || [];
    if (!items.length) { articleList.innerHTML = `<div class="panel-empty" style="opacity:1;flex:1"><div class="empty-label">NO GOALS YET</div></div>`; return; }
    items.forEach((goal, i) => {
      const card = document.createElement("div");
      card.className = "goal-card";
      card.style.animationDelay = `${i * 0.06}s`;
      card.innerHTML = `
        <div class="goal-status ${goal.done?"done":""}"></div>
        <div class="goal-body">
          <div class="goal-title">${goal.title}</div>
          <div class="goal-desc">${goal.desc}</div>
        </div>
        <div class="goal-priority">${goal.priority}</div>`;
      articleList.appendChild(card);
    });
  }

  function renderContent(s, tab) {
    if (tab === "articles") renderArticles(s);
    else if (tab === "notes")    renderNotes(s);
    else if (tab === "goals")    renderGoals(s);
  }

  /* ── SELECT SECTOR ── */
  function selectSector(s) {
    activeSector = s.letter;

    sectorBtns.forEach(b => b.classList.remove("active"));
    document.querySelector(`.sector-btn[data-sector="${s.letter}"]`)?.classList.add("active");

    applySectorTheme(s);
    if (contentLetter) contentLetter.textContent = s.letter;
    if (contentName)   contentName.textContent   = s.word;

    // first click auto-activates articles tab
    if (!activeTab) {
      activeTab = "articles";
      subtabs.forEach(t => t.classList.toggle("active", t.dataset.tab === "articles"));
      updateNavCounts("articles");
    }

    renderContent(s, activeTab);
  }

  /* ── VIEWER ── */
  let currentBlobUrl = null;          // object URL for the fetched PDF (revoked on close/replace)

  function sanitizeName(t) {
    return String(t || "document").replace(/[^\w\-]+/g, "_").slice(0, 80);
  }

  function revokeBlob() {
    if (currentBlobUrl) { try { URL.revokeObjectURL(currentBlobUrl); } catch (e) {} currentBlobUrl = null; }
  }

  // Set the grain overlay's three text rows (loading / error states).
  function setGrain(code, label, sub) {
    if (!viewerGrain) return;
    const c = viewerGrain.querySelector(".viewer-error-code");
    const l = viewerGrain.querySelector(".viewer-error-label");
    const s = viewerGrain.querySelector(".viewer-error-sub");
    if (c) c.textContent = code;
    if (l) l.textContent = label;
    if (s) s.innerHTML   = sub;
  }

  function frameShell(s) {
    hide(articleList);
    show(viewerPanel);
    if (viewerBack) {
      viewerBack.style.color       = s ? s.color : "";
      viewerBack.style.borderColor = s ? s.color : "";
    }
  }

  // Point the iframe at a source. localCheck=true scans same-origin body for 404/Cannot GET.
  function loadIntoFrame(src, localCheck) {
    if (!viewerFrame) return;
    if (viewerGrain) viewerGrain.classList.remove("active");
    viewerFrame.src = src;
    viewerFrame.onload = () => {
      if (!localCheck) return;        // cross-origin / blob — can't (and needn't) introspect
      try {
        const body = viewerFrame.contentDocument?.body?.innerText || "";
        if (body.includes("Cannot GET") || body.includes("404")) {
          setGrain("404", "FILE NOT FOUND", "PDF has not been uploaded yet");
          if (viewerGrain) viewerGrain.classList.add("active");
        }
      } catch (e) { /* cross-origin: assume rendered */ }
    };
  }

  // DRAFT articles — local file straight into the viewer.
  function openViewer(file, title, s) {
    revokeBlob();
    frameShell(s);
    if (viewerTitle) viewerTitle.textContent = title;
    if (viewerDl) {
      viewerDl.style.display = "";
      viewerDl.href = file; viewerDl.download = title + ".pdf";
      viewerDl.target = ""; viewerDl.removeAttribute("rel");
      viewerDl.textContent = "↓ DOWNLOAD";
    }
    loadIntoFrame(file, true);
  }

  // REFERENCE articles — fetch the external PDF, show it in the viewer, offer a browser download.
  async function downloadAndView(art, s) {
    revokeBlob();
    frameShell(s);
    if (viewerTitle) viewerTitle.textContent = art.title;
    if (viewerFrame) viewerFrame.src = "about:blank";

    // Download button is wired immediately to the direct link, so it works even if fetch is blocked.
    if (viewerDl) {
      viewerDl.style.display = "";
      viewerDl.href = art.pdf || art.url;
      viewerDl.download = sanitizeName(art.title) + ".pdf";
      viewerDl.target = "_blank"; viewerDl.rel = "noopener";
      viewerDl.textContent = "↓ DOWNLOAD";
    }

    // Loading state
    setGrain("···", "FETCHING PDF", "retrieving the external document");
    if (viewerGrain) viewerGrain.classList.add("active");

    try {
      const resp = await fetch(art.pdf, { mode: "cors" });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const blob = await resp.blob();
      currentBlobUrl = URL.createObjectURL(blob);
      loadIntoFrame(currentBlobUrl, false);                 // inline view from memory
      if (viewerDl) {                                       // browser download from the same blob
        viewerDl.href = currentBlobUrl;
        viewerDl.download = sanitizeName(art.title) + ".pdf";
        viewerDl.target = ""; viewerDl.removeAttribute("rel");
      }
    } catch (err) {
      // CORS / network block — best-effort inline embed of the remote PDF, with a clear escape hatch.
      loadIntoFrame(art.pdf, false);
      setGrain("↗", "OPEN EXTERNALLY",
        `Inline embedding may be blocked by the source.<br>` +
        `Use <b>↓ DOWNLOAD</b> (top-right) or ` +
        `<a href="${art.pdf}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">open the PDF&nbsp;↗</a>`);
      // give the embed a moment; if it paints, the user sees it under a dismissible note
      setTimeout(() => { if (viewerGrain) viewerGrain.classList.remove("active"); }, 1400);
    }
  }

  function closeViewer() {
    hide(viewerPanel);
    revokeBlob();
    if (viewerFrame) viewerFrame.src = "";
    if (viewerGrain) viewerGrain.classList.remove("active");
    if (viewerDl)    {                              // restore download button to default
      viewerDl.style.display = "";
      viewerDl.target = ""; viewerDl.removeAttribute("rel");
      viewerDl.textContent = "↓ DOWNLOAD";
    }
    if (navAbout)    navAbout.classList.remove("active");
    pageMode = false;
    // restore correct content area
    if (activeSector) {
      show(articleList);
    } else {
      showEmptyState(1);
    }
  }

  /* ── PAGE NAVIGATION ── */
  function openAbout() {
    pageMode = true;
    subtabs.forEach(t => t.classList.remove("active"));
    if (navAbout) navAbout.classList.add("active");
    hide(panelEmpty);
    hide(articleList);
    show(viewerPanel);
    if (viewerTitle) viewerTitle.textContent = "ABOUT — H·E·L·I·X";
    if (viewerDl)    viewerDl.style.display = "none";
    if (viewerGrain) viewerGrain.classList.remove("active");
    if (viewerBack)  { viewerBack.style.color = ""; viewerBack.style.borderColor = ""; }
    if (viewerFrame) viewerFrame.src = "about.html";
  }

  function openBlog() {
    window.open("blog.html", "_blank");
  }

  /* ── EVENTS ── */
  if (viewerBack) {
    viewerBack.addEventListener("click", () => {
      closeViewer();
      if (!pageMode && activeSector) {
        const s = HELIX_SECTORS.find(x => x.letter === activeSector);
        if (s) renderContent(s, activeTab);
      }
    });
  }

  /* ── NAV BUTTON EVENTS ── */
  if (navAbout) navAbout.addEventListener("click", openAbout);
  if (navBlog)  navBlog.addEventListener("click",  openBlog);

  sectorBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const s = HELIX_SECTORS.find(x => x.letter === btn.dataset.sector);
      if (s) selectSector(s);
    });
  });

  /* ── WIRE EMPTY STATE SECTOR LIST — clickable shortcut ── */
  document.querySelectorAll(".empty-sector-item").forEach(item => {
    item.addEventListener("click", () => {
      const s = HELIX_SECTORS.find(x => x.letter === item.dataset.sector);
      if (s) selectSector(s);
    });
  });

  subtabs.forEach(tab => {
    tab.addEventListener("click", () => {
      activeTab = tab.dataset.tab;
      subtabs.forEach(t => t.classList.toggle("active", t === tab));
      updateNavCounts(activeTab);
      if (activeSector) {
        const s = HELIX_SECTORS.find(x => x.letter === activeSector);
        if (s) renderContent(s, activeTab);
      } else {
        // tab pressed but no sector yet — show state 2
        showEmptyState(2);
      }
    });
  });

  /* ── PARTICLES ── */
  const canvas = document.getElementById("bg-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let W, H, pts;
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    const mkP    = () => ({ x:Math.random()*W, y:Math.random()*H, vx:(Math.random()-.5)*.18, vy:(Math.random()-.5)*.18, r:Math.random()*1.2+.3, a:Math.random()*.25+.06, c:Math.random()>.85?"#ff6a00":"#00e5ff" });
    const spawn  = () => { pts = Array.from({length:55}, mkP); };
    const draw   = () => {
      ctx.clearRect(0,0,W,H);
      for (const p of pts) {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0;
        ctx.save(); ctx.globalAlpha=p.a; ctx.fillStyle=p.c;
        ctx.shadowBlur=8; ctx.shadowColor=p.c;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.restore();
      }
      requestAnimationFrame(draw);
    };
    resize(); spawn(); draw();
    window.addEventListener("resize", ()=>{ resize(); spawn(); });
  }

  /* ── KICK OFF MANIFEST LOAD ── */
  loadManifest();

})();
