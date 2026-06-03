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
      // manifest added articles → rebuild the search index on next search
      searchIndex = null;
      // re-render if a sector/tab was selected before manifest arrived
      if (activeSector && activeTab) {
        const s = HELIX_SECTORS.find(x => x.letter === activeSector);
        if (s) renderContent(s, activeTab);
        updateNavCounts(activeTab);
      }
      // if the search panel is open, refresh results with the new data
      if (searchPanel && searchPanel.style.display !== "none") runSearch();
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

  /* search panel elements */
  const searchPanel    = document.getElementById("search-panel");
  const searchInput     = document.getElementById("search-input");
  const searchClear     = document.getElementById("search-clear");
  const searchCategory  = document.getElementById("search-category");
  const searchField     = document.getElementById("search-field");
  const searchResults   = document.getElementById("search-results");
  const searchMeta      = document.getElementById("search-meta");
  const subtabSearch    = document.getElementById("subtab-search");

  let activeSector = null;
  let activeTab    = null;
  let pageMode     = false;   // true when viewer is showing a static page (about/etc)
  let viewerOrigin = null;    // 'search' when the viewer was opened from a search result

  /* ── EMPTY STATE SWITCHING ── */
  function showEmptyState(state) {
    if (panelEmpty) panelEmpty.style.display = "flex";
    hide(articleList);
    hide(viewerPanel);
    hide(searchPanel);
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
    hide(searchPanel);
    if (subtabSearch) subtabSearch.classList.remove("active");
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
        // VIEW → article home page (abstract/landing). DOWNLOAD → direct PDF.
        // Both open at the source in a new tab: reliable, no cross-origin fetch.
        viewBtn.addEventListener("click", () => window.open(art.url || art.pdf, "_blank", "noopener"));
        card.querySelector(".btn-dl-ref").addEventListener("click", () => window.open(art.pdf || art.url, "_blank", "noopener"));
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
    } else {
      // re-light the correct tab (e.g. when coming back from SEARCH)
      subtabs.forEach(t => t.classList.toggle("active", t.dataset.tab === activeTab));
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
    hide(searchPanel);
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
    // returned from a search result → restore the search panel
    if (viewerOrigin === "search") { viewerOrigin = null; openSearch(); return; }
    viewerOrigin = null;
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
    viewerOrigin = null;
    subtabs.forEach(t => t.classList.remove("active"));
    if (navAbout) navAbout.classList.add("active");
    hide(panelEmpty);
    hide(articleList);
    hide(searchPanel);
    show(viewerPanel);
    if (viewerTitle) viewerTitle.textContent = "ABOUT — H·E·L·I·X";
    if (viewerDl)    viewerDl.style.display = "none";
    if (viewerGrain) viewerGrain.classList.remove("active");
    if (viewerBack)  { viewerBack.style.color = ""; viewerBack.style.borderColor = ""; }
    if (viewerFrame) viewerFrame.src = "about.html";
  }

  function openGoals() {
    pageMode = true;
    viewerOrigin = null;
    subtabs.forEach(t => t.classList.toggle("active", t.dataset.tab === "goals"));
    if (navAbout) navAbout.classList.remove("active");
    hide(panelEmpty);
    hide(articleList);
    hide(searchPanel);
    show(viewerPanel);
    if (viewerTitle) viewerTitle.textContent = "PROJECT GOALS — H·E·L·I·X";
    if (viewerDl)    viewerDl.style.display = "none";
    if (viewerGrain) viewerGrain.classList.remove("active");
    if (viewerBack)  { viewerBack.style.color = ""; viewerBack.style.borderColor = ""; }
    if (viewerFrame) viewerFrame.src = "goals.html";
  }

  function openBlog() {
    window.open("blog.html", "_blank");
  }

  /* ── SEARCH ── */
  // Flat, de-duplicated index across all sectors. The same article object can
  // live in several sectors (manifest merge pushes by reference), so we collect
  // every sector letter an article belongs to.
  let searchIndex = null;
  const SECTOR_COLOR = {};
  const SECTOR_GLOW  = {};
  HELIX_SECTORS.forEach(s => { SECTOR_COLOR[s.letter] = s.color; SECTOR_GLOW[s.letter] = s.glow; });

  function buildSearchIndex() {
    const byKey = new Map();
    HELIX_SECTORS.forEach(s => {
      (s.articles || []).forEach(a => {
        const key = a.id || a.title;
        let rec = byKey.get(key);
        if (!rec) { rec = { art: a, sectors: [] }; byKey.set(key, rec); }
        if (!rec.sectors.includes(s.letter)) rec.sectors.push(s.letter);
      });
    });
    return [...byKey.values()];
  }

  // Does a record match the query under the chosen field scope?
  function matchesQuery(rec, q, field) {
    if (!q) return true;
    const a = rec.art;
    let hay;
    if (field === "author")       hay = [a.authors];
    else if (field === "subject") hay = [a.title, (a.tags || []).join(" ")];
    else                          hay = [a.title, a.authors, a.year, (a.tags || []).join(" "), a.abstract, a.venue];
    return hay.filter(Boolean).join(" \u0001 ").toLowerCase().includes(q);
  }

  function runSearch() {
    if (!searchResults) return;
    if (!searchIndex) searchIndex = buildSearchIndex();

    const q     = (searchInput && searchInput.value || "").trim().toLowerCase();
    const cat   = (searchCategory && searchCategory.value) || "ALL";
    const field = (searchField && searchField.value) || "all";

    if (searchClear) searchClear.classList.toggle("show", !!q);

    let rows = searchIndex;
    if (cat !== "ALL") rows = rows.filter(r => r.sectors.includes(cat));
    rows = rows.filter(r => matchesQuery(r, q, field));

    // status line
    if (searchMeta) {
      const fieldLabel = { all: "ALL TEXT", subject: "SUBJECT", author: "AUTHOR" }[field];
      const scope = cat === "ALL" ? "ALL SECTORS" : (cat + " · " + (HELIX_SECTORS.find(s => s.letter === cat) || {}).word);
      searchMeta.innerHTML =
        `<span class="sm-count">${rows.length}</span> RESULT${rows.length !== 1 ? "S" : ""}` +
        ` · ${scope} · ${fieldLabel}`;
    }

    searchResults.innerHTML = "";
    if (!rows.length) {
      searchResults.innerHTML = `<div class="search-empty">NO MATCHES — ADJUST QUERY OR FILTERS</div>`;
      return;
    }

    rows.forEach((rec, i) => {
      const a     = rec.art;
      const isRef = !!(a.url || a.pdf);   // reference = external (links); else local file
      const sec   = HELIX_SECTORS.find(s => s.letter === rec.sectors[0]) || null;

      const row = document.createElement("div");
      row.className = "search-result-row";
      row.style.animationDelay = `${Math.min(i * 0.04, 0.4)}s`;

      // [Article]
      const titleHtml =
        `<div class="sr-title" role="button" tabindex="0">${esc(a.title)}` +
        (a.authors ? `<span class="sr-authors">${esc(a.authors)}${a.year ? " · " + esc(a.year) : ""}</span>` : "") +
        `</div>`;

      // [Category] — one badge per sector the article lives in
      const badges = rec.sectors.map(letter => {
        const c = SECTOR_COLOR[letter] || "var(--cyan)";
        return `<span class="sr-cat-badge" style="color:${c};border-color:${c};box-shadow:0 0 8px ${c}55;">${letter}</span>`;
      }).join("");

      row.innerHTML =
        titleHtml +
        `<div class="sr-cat" title="${esc(rec.sectors.join(" · "))}">${badges}</div>` +
        `<div class="sr-links">` +
          `<a class="sr-link sr-link-view" data-act="view"><span>◉</span> VIEW</a>` +
          `<a class="sr-link sr-link-dl" data-act="dl"><span>↓</span> DOWNLOAD</a>` +
        `</div>`;

      const titleEl = row.querySelector(".sr-title");
      const viewEl  = row.querySelector('[data-act="view"]');
      const dlEl    = row.querySelector('[data-act="dl"]');

      if (isRef) {
        // external: View → landing page, Download → direct PDF (both new tab)
        viewEl.href = a.url || a.pdf; viewEl.target = "_blank"; viewEl.rel = "noopener";
        dlEl.href   = a.pdf || a.url; dlEl.target   = "_blank"; dlEl.rel   = "noopener";
        const openHome = () => window.open(a.url || a.pdf, "_blank", "noopener");
        titleEl.addEventListener("click", openHome);
        titleEl.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openHome(); } });
      } else {
        // local file: View → in-app viewer (return to search on BACK); Download → direct
        const openLocal = () => { viewerOrigin = "search"; openViewer(a.file, a.title, sec); };
        viewEl.addEventListener("click", e => { e.preventDefault(); openLocal(); });
        titleEl.addEventListener("click", openLocal);
        titleEl.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLocal(); } });
        dlEl.href = a.file || "#";
        dlEl.setAttribute("download", sanitizeName(a.title) + ".pdf");
      }

      searchResults.appendChild(row);
    });
  }

  function openSearch() {
    pageMode = false;
    viewerOrigin = null;
    subtabs.forEach(t => t.classList.toggle("active", t.dataset.tab === "search"));
    if (navAbout) navAbout.classList.remove("active");
    hide(panelEmpty);
    hide(articleList);
    hide(viewerPanel);
    if (searchPanel) searchPanel.style.display = "flex";
    runSearch();
    if (searchInput) { try { searchInput.focus(); } catch (e) {} }
  }

  /* ── EVENTS ── */
  if (viewerBack) {
    viewerBack.addEventListener("click", () => {
      const fromSearch = (viewerOrigin === "search");
      closeViewer();
      if (!fromSearch && !pageMode && activeSector) {
        const s = HELIX_SECTORS.find(x => x.letter === activeSector);
        if (s) renderContent(s, activeTab);
      }
    });
  }

  /* ── NAV BUTTON EVENTS ── */
  if (navAbout) navAbout.addEventListener("click", openAbout);
  if (navBlog)  navBlog.addEventListener("click",  openBlog);

  /* ── SEARCH PANEL EVENTS ── */
  if (searchInput)    searchInput.addEventListener("input", runSearch);
  if (searchCategory) searchCategory.addEventListener("change", runSearch);
  if (searchField)    searchField.addEventListener("change", runSearch);
  if (searchClear)    searchClear.addEventListener("click", () => {
    if (searchInput) { searchInput.value = ""; searchInput.focus(); }
    runSearch();
  });
  if (searchInput) searchInput.addEventListener("keydown", e => {
    if (e.key === "Escape") { searchInput.value = ""; runSearch(); }
  });

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
      // SEARCH is a cross-sector tool page (not per-sector content)
      if (tab.dataset.tab === "search") { openSearch(); return; }
      // GOALS is a high-level project overview page (not per-sector content)
      if (tab.dataset.tab === "goals") { openGoals(); return; }
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
