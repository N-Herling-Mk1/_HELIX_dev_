/* ===========================================================
   FORGE INFO 698 — gantt.js
   Granular phase Gantt: phase-grouped spanning bars, milestone
   diamonds, a "today" marker, and a legend. Single contributor.
   Reads data/gantt.json. Drop-in for Gantt.render(el).
   =========================================================== */
const Gantt = (() => {

  // Course weekly Gantt-upload form (decoded from the QR code). Opens in a new window.
  const UPLOAD_URL = "https://uarizona.co1.qualtrics.com/jfe/form/SV_6FLtz2X1GPXvVuC?Q_CHL=qr";

  const PHASE = {
    "Intro":         { cls: "fg-intro",   group: "Intro / Planning" },
    "Planning":      { cls: "fg-intro",   group: "Intro / Planning" },
    "Design / Impl": { cls: "fg-design",  group: "Design / Implementation" },
    "Testing":       { cls: "fg-testing", group: "Testing" },
    "Write-up":      { cls: "fg-writeup", group: "Write-up" },
    "Deliverables":  { cls: "fg-deliver", group: "Deliverables" },
  };

  const LEGEND = [
    ["fg-intro",   "Intro / Planning"],
    ["fg-design",  "Design / Implementation"],
    ["fg-testing", "Testing"],
    ["fg-writeup", "Write-up"],
    ["fg-deliver", "Deliverables"],
  ];

  const STATUS_KEY = [
    ["is-planned",  "Planned"],
    ["is-progress", "In progress"],
    ["is-done",     "Done"],
  ];

  const STYLE = `
.forge-gantt { --fg-label: 240px; }
.forge-gantt .fg-legend,
.forge-gantt .fg-statuskey { display:flex; flex-wrap:wrap; gap:8px 18px; align-items:center; color:var(--color-text-muted,#5A7BA8); }
.forge-gantt .fg-legend { margin:10px 0 6px; font-size:0.82rem; }
.forge-gantt .fg-statuskey { margin:0 0 14px; font-size:0.78rem; }
.forge-gantt .fg-legend .li, .forge-gantt .fg-statuskey .li { display:inline-flex; align-items:center; gap:6px; }
.forge-gantt .fg-legend > i, .forge-gantt .fg-legend .li > i { width:14px; height:14px; border-radius:3px; display:inline-block; }
.forge-gantt .fg-scroll { overflow-x:auto; padding-bottom:4px; }
.forge-gantt .fg-chart { position:relative; min-width:calc(var(--fg-label) + (var(--fg-cols) * 46px)); }
.forge-gantt .fg-row { display:grid; grid-template-columns:var(--fg-label) 1fr; align-items:center; }
.forge-gantt .fg-row + .fg-row { border-top:1px solid var(--color-border,rgba(90,123,168,0.16)); }
.forge-gantt .fg-label { padding:5px 10px 5px 0; font-size:0.82rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.forge-gantt .fg-head .fg-label { font-weight:600; }
.forge-gantt .fg-grouphead .fg-label { font-weight:600; display:flex; align-items:center; gap:7px; }
.forge-gantt .fg-grouphead i { width:11px; height:11px; border-radius:3px; display:inline-block; flex:none; }
.forge-gantt .fg-track { position:relative; display:grid; grid-template-columns:repeat(var(--fg-cols), minmax(0,1fr)); height:26px; background-image:linear-gradient(to right, var(--color-border,rgba(90,123,168,0.16)) 1px, transparent 1px); background-size:calc(100% / var(--fg-cols)) 100%; }
.forge-gantt .fg-head .fg-track, .forge-gantt .fg-grouphead .fg-track { height:22px; background-image:none; }
.forge-gantt .fg-wk { text-align:center; font-size:0.72rem; color:var(--color-text-muted,#5A7BA8); align-self:center; }
.forge-gantt .fg-bar { align-self:center; height:15px; border-radius:4px; margin:0 2px; box-shadow:0 1px 2px rgba(0,0,0,0.15); }
.forge-gantt .fg-bar.is-planned { opacity:0.5; }
.forge-gantt .fg-bar.is-progress { outline:2px dashed var(--color-accent,#C67D3E); outline-offset:1px; }
.forge-gantt .fg-intro   { background:#8893a8; }
.forge-gantt .fg-design  { background:#5e9b86; }
.forge-gantt .fg-testing { background:#8f73c4; }
.forge-gantt .fg-writeup { background:#c79a3e; }
.forge-gantt .fg-deliver { background:#5ba56b; }
.forge-gantt .fg-ms { align-self:center; justify-self:center; width:14px; height:14px; background:var(--color-navy,#0F1F3D); transform:rotate(45deg); display:flex; align-items:center; justify-content:center; }
.forge-gantt .fg-ms b { transform:rotate(-45deg); color:#fff; font-size:0.6rem; font-weight:700; line-height:1; }
.forge-gantt .fg-today { position:absolute; top:0; bottom:0; width:11px; margin-left:-5px; z-index:5; cursor:help; background:linear-gradient(to right, transparent 5px, var(--color-accent,#C67D3E) 5px, var(--color-accent,#C67D3E) 7px, transparent 7px); }
.forge-gantt .fg-today::before { content:"Today"; position:absolute; top:0; left:9px; font-size:0.66rem; font-weight:600; color:var(--color-accent,#C67D3E); white-space:nowrap; pointer-events:none; }
.forge-gantt .fg-mskey { margin:8px 0 0; padding-left:1.2rem; font-size:0.82rem; color:var(--color-text-muted,#5A7BA8); }
.forge-gantt .fg-mskey li { margin:3px 0; }
.forge-gantt .gantt-meta { margin-top:14px; font-size:0.8rem; color:var(--color-text-muted,#5A7BA8); }
.forge-gantt .fg-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-top:1.4em; }
.forge-gantt .fg-header .fg-h2 { margin:0; }
.forge-gantt .fg-actions { display:flex; gap:10px; align-items:center; flex:none; }
.forge-gantt .fg-btn { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; font-family:var(--font-sans,system-ui,sans-serif); font-size:0.82rem; font-weight:500; line-height:1; border:1px solid var(--color-navy,#0F1F3D); border-radius:var(--radius,4px); background:#fff; color:var(--color-navy,#0F1F3D); text-decoration:none; cursor:pointer; transition:background .12s ease,color .12s ease,border-color .12s ease; }
.forge-gantt .fg-btn:hover { background:var(--color-bg-alt,#F4F6FA); border-color:var(--color-navy,#0F1F3D); }
.forge-gantt .fg-btn[disabled] { opacity:.55; cursor:progress; }
.forge-gantt .fg-btn-accent { background:var(--color-navy,#0F1F3D); color:#fff; }
.forge-gantt .fg-btn-accent:hover { background:var(--color-navy-mid,#2A4D7A); color:#fff; border-color:var(--color-navy-mid,#2A4D7A); }
.forge-gantt .fg-capture { background:var(--color-bg,#fff); }
.forge-gantt .fg-cap-title { font-family:var(--font-serif,Georgia,serif); color:var(--color-navy,#0F1F3D); font-size:1.05rem; margin:0 0 .5em; }
.forge-gantt .fg-cap-title .stamp { font-family:var(--font-sans,system-ui,sans-serif); font-size:0.82rem; color:var(--color-text-muted,#5C657A); }
.forge-gantt .fg-bar { cursor:pointer; }
.forge-gantt .fg-bar:hover { filter:brightness(1.08); outline:2px solid var(--color-navy,#0F1F3D); outline-offset:1px; }
.forge-gantt .fg-bar.is-selected { outline:2px solid var(--color-accent,#C67D3E); outline-offset:1px; box-shadow:0 0 0 3px rgba(198,125,62,0.25); }
.forge-gantt .fg-body { display:flex; gap:20px; align-items:flex-start; }
.forge-gantt .fg-body .fg-chart-col { flex:1 1 auto; min-width:0; }
.forge-gantt .fg-detail { flex:0 0 300px; align-self:stretch; border:1px solid var(--color-border,#D9DCE3); border-left:3px solid var(--color-accent,#C67D3E); border-radius:var(--radius,4px); background:var(--color-bg-alt,#F4F6FA); padding:14px 16px; position:sticky; top:16px; }
.forge-gantt .fg-detail h3 { margin:0 0 2px; font-size:1.05rem; color:var(--color-navy,#0F1F3D); }
.forge-gantt .fg-detail .fg-detail-sub { margin:0 0 12px; font-size:0.78rem; letter-spacing:0.08em; text-transform:uppercase; color:var(--color-accent,#C67D3E); font-weight:600; }
.forge-gantt .fg-detail .fg-hint { color:var(--color-text-muted,#5C657A); font-size:0.9rem; line-height:1.4; }
.forge-gantt table.fg-todo { width:100%; border-collapse:collapse; font-size:0.86rem; }
.forge-gantt table.fg-todo th { text-align:left; font-size:0.68rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--color-text-faint,#8C94A6); border-bottom:1px solid var(--color-border,#D9DCE3); padding:0 0 6px; font-weight:600; }
.forge-gantt table.fg-todo th.fg-st-col { text-align:right; }
.forge-gantt table.fg-todo td { padding:8px 0; border-bottom:1px solid var(--color-border-soft,#E8EAF0); vertical-align:top; color:var(--color-text,#1A2238); }
.forge-gantt table.fg-todo tr:last-child td { border-bottom:none; }
.forge-gantt table.fg-todo td.fg-st-col { text-align:right; white-space:nowrap; }
.forge-gantt .fg-pill { display:inline-block; padding:2px 9px; border-radius:999px; font-size:0.7rem; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; }
.forge-gantt .fg-pill.todo { background:var(--color-bg-muted,#EDF0F5); color:var(--color-text-muted,#5C657A); }
.forge-gantt .fg-pill.done { background:rgba(74,138,110,0.16); color:var(--color-success,#4A8A6E); }
.forge-gantt table.fg-todo tr.is-done td.fg-task-col { color:var(--color-text-muted,#5C657A); text-decoration:line-through; }
@media (max-width: 900px) {
  .forge-gantt .fg-body { flex-direction:column; }
  .forge-gantt .fg-detail { flex-basis:auto; width:100%; position:static; }
}
`;

  function injectStyle() {
    if (document.getElementById("forge-gantt-style")) return;
    const s = document.createElement("style");
    s.id = "forge-gantt-style";
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function row(extra) {
    const r = document.createElement("div");
    r.className = "fg-row" + (extra ? " " + extra : "");
    return r;
  }
  function labelCell(text) {
    const d = document.createElement("div");
    d.className = "fg-label";
    if (typeof text === "string") { d.textContent = text; d.title = text; }
    return d;
  }
  function trackCell() {
    const d = document.createElement("div");
    d.className = "fg-track";
    return d;
  }
  function statusClass(status) {
    return "is-" + (status || "planned").replace("in_progress", "progress");
  }

  function todayFraction(week0Start, numWeeks) {
    if (!week0Start) return null;
    const w0 = new Date(week0Start + "T00:00:00");
    if (isNaN(w0)) return null;
    const weeks = (Date.now() - w0.getTime()) / (1000 * 60 * 60 * 24 * 7);
    if (weeks < 0 || weeks > numWeeks) return null;
    return weeks;
  }

  function buildChart(data) {
    const tasks = data.tasks || [];
    let numWeeks = data.num_weeks;
    if (!numWeeks) {
      numWeeks = tasks.reduce((m, t) => Math.max(m, (t.end != null ? t.end : t.start) || 0), 0) + 1;
    }

    const chart = document.createElement("div");
    chart.className = "fg-chart";
    chart.style.setProperty("--fg-cols", numWeeks);

    // header row of week labels
    const head = row("fg-head");
    head.appendChild(labelCell("Phase / Task"));
    const headTrack = trackCell();
    for (let w = 0; w < numWeeks; w++) {
      const c = document.createElement("div");
      c.className = "fg-wk";
      c.textContent = "W" + w;
      headTrack.appendChild(c);
    }
    head.appendChild(headTrack);
    chart.appendChild(head);

    // group tasks by phase-group, preserving first-seen order
    const order = [];
    const groups = {};
    tasks.forEach(t => {
      const meta = PHASE[t.phase] || { cls: "", group: t.phase || "\u2014" };
      if (!groups[meta.group]) { groups[meta.group] = { cls: meta.cls, items: [] }; order.push(meta.group); }
      groups[meta.group].items.push(t);
    });

    order.forEach(gName => {
      const g = groups[gName];
      const gh = row("fg-grouphead");
      const gl = labelCell();
      const sw = document.createElement("i");
      sw.className = g.cls;
      const tx = document.createElement("span");
      tx.textContent = gName;
      gl.appendChild(sw); gl.appendChild(tx); gl.title = gName;
      gh.appendChild(gl);
      gh.appendChild(trackCell());
      chart.appendChild(gh);

      g.items.forEach(t => {
        const r = row();
        r.appendChild(labelCell(t.name));
        const tk = trackCell();
        const start = t.start || 0;
        const end = (t.end != null ? t.end : start);
        const bar = document.createElement("div");
        bar.className = "fg-bar " + (PHASE[t.phase] ? PHASE[t.phase].cls : "") + " " + statusClass(t.status);
        bar.style.gridColumn = (start + 1) + " / " + (end + 2);
        const span = (end === start) ? ("W" + start) : ("W" + start + "\u2013W" + end);
        bar.title = t.name + " (" + span + ") \u2014 click for week details";
        bar.dataset.week = String(start);
        bar.setAttribute("role", "button");
        bar.tabIndex = 0;
        tk.appendChild(bar);
        r.appendChild(tk);
        chart.appendChild(r);
      });
    });

    // milestones row
    const ms = data.milestones || [];
    if (ms.length) {
      const mr = row();
      mr.appendChild(labelCell("Milestones"));
      const mt = trackCell();
      ms.forEach((m, i) => {
        const d = document.createElement("div");
        d.className = "fg-ms";
        d.style.gridColumn = String(m.week + 1);
        d.title = "M" + (i + 1) + ": " + m.label + " (W" + m.week + ")";
        const b = document.createElement("b");
        b.textContent = String(i + 1);
        d.appendChild(b);
        mt.appendChild(d);
      });
      mr.appendChild(mt);
      chart.appendChild(mr);
    }

    // today marker (computed live from the real date, anchored to week0)
    const frac = todayFraction(data.week0_start, numWeeks);
    if (frac != null) {
      const tl = document.createElement("div");
      tl.className = "fg-today";
      tl.title = "Today \u2014 " + new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
      const ratio = frac / numWeeks;
      tl.style.left = "calc(var(--fg-label) + (100% - var(--fg-label)) * " + ratio + ")";
      chart.appendChild(tl);
    }

    return chart;
  }

  function buildLegend() {
    const wrap = document.createElement("div");
    wrap.className = "fg-legend";
    LEGEND.forEach(([cls, lab]) => {
      const li = document.createElement("span");
      li.className = "li";
      const i = document.createElement("i");
      i.className = cls;
      const t = document.createElement("span");
      t.textContent = lab;
      li.appendChild(i); li.appendChild(t);
      wrap.appendChild(li);
    });
    // milestone marker
    const mli = document.createElement("span");
    mli.className = "li";
    const md = document.createElement("span");
    md.style.width = "12px"; md.style.height = "12px"; md.style.display = "inline-block";
    md.style.background = "var(--color-navy,#0F1F3D)"; md.style.transform = "rotate(45deg)";
    const mt = document.createElement("span"); mt.textContent = "Milestone";
    mli.appendChild(md); mli.appendChild(mt);
    wrap.appendChild(mli);
    // today marker
    const tli = document.createElement("span");
    tli.className = "li";
    const tk = document.createElement("span");
    tk.style.width = "3px"; tk.style.height = "14px"; tk.style.display = "inline-block";
    tk.style.background = "var(--color-accent,#C67D3E)";
    const tt = document.createElement("span"); tt.textContent = "Today";
    tli.appendChild(tk); tli.appendChild(tt);
    wrap.appendChild(tli);
    return wrap;
  }

  function buildStatusKey() {
    const wrap = document.createElement("div");
    wrap.className = "fg-statuskey";
    const intro = document.createElement("span");
    intro.textContent = "Bar fill:";
    wrap.appendChild(intro);
    STATUS_KEY.forEach(([cls, lab]) => {
      const li = document.createElement("span");
      li.className = "li";
      const bar = document.createElement("span");
      bar.className = "fg-bar fg-design " + cls;
      bar.style.display = "inline-block"; bar.style.width = "26px"; bar.style.height = "13px";
      bar.style.margin = "0"; bar.style.borderRadius = "4px"; bar.style.boxShadow = "none";
      const t = document.createElement("span");
      t.textContent = lab;
      li.appendChild(bar); li.appendChild(t);
      wrap.appendChild(li);
    });
    return wrap;
  }

  function buildMsKey(data) {
    const ms = data.milestones || [];
    if (!ms.length) return null;
    const ol = document.createElement("ol");
    ol.className = "fg-mskey";
    ms.forEach(m => {
      const li = document.createElement("li");
      li.textContent = m.label + " \u2014 Week " + m.week;
      ol.appendChild(li);
    });
    return ol;
  }

  // Lazy-load html2canvas — only fetched the first time the user exports a PNG.
  function ensureHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("could not load the screenshot library (are you offline?)"));
      document.head.appendChild(s);
    });
  }

  // Rasterize the capture region to PNG and trigger a download. This is the file
  // that gets uploaded weekly via the QR-code form.
  async function downloadPng(capEl, btn) {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Rendering\u2026";
    const scroll = capEl.querySelector(".fg-scroll");
    const prevOverflow = scroll ? scroll.style.overflow : null;
    const prevWidth = capEl.style.width;
    // Hide the detail side-panel during capture — the weekly screenshot should be the chart alone.
    const detail = capEl.querySelector(".fg-detail");
    const prevDetailDisplay = detail ? detail.style.display : null;
    if (detail) detail.style.display = "none";
    try {
      await ensureHtml2Canvas();
      // Widen so the entire timeline is captured even when it normally scrolls.
      const chart = capEl.querySelector(".fg-chart");
      const needed = chart ? chart.scrollWidth : capEl.scrollWidth;
      const target = Math.max(capEl.clientWidth, needed) + 4;
      if (scroll) scroll.style.overflow = "visible";
      capEl.style.width = target + "px";

      let bg = getComputedStyle(document.body).backgroundColor;
      if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") bg = "#FFFFFF";

      const canvas = await window.html2canvas(capEl, {
        backgroundColor: bg,
        scale: 2,
        width: target,
        windowWidth: target,
        scrollX: 0,
        scrollY: -window.scrollY,
      });

      const stamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.download = "forge-gantt-" + stamp + ".png";
      a.href = canvas.toDataURL("image/png");
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert("Could not generate the PNG: " + (e && e.message ? e.message : e));
    } finally {
      if (scroll) scroll.style.overflow = prevOverflow;
      capEl.style.width = prevWidth;
      if (detail) detail.style.display = prevDetailDisplay;
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  // Build the right-hand detail panel container (starts with a hint).
  function buildDetailPanel() {
    const d = document.createElement("aside");
    d.className = "fg-detail";
    d.innerHTML = "<h3>Week details</h3>"
      + "<p class=\"fg-detail-sub\">Tasks &amp; status</p>"
      + "<p class=\"fg-hint\">Click any colored bar in the chart to see that week's task list here.</p>";
    return d;
  }

  // Render one week's task list (from weekly_todos.json) into the detail panel.
  function renderWeekDetail(panel, week, todos) {
    const wk = todos && todos.weeks ? todos.weeks[String(week)] : null;
    const head = "<h3>Week " + week + "</h3>"
      + "<p class=\"fg-detail-sub\">" + ((wk && wk.label) ? esc(wk.label) : "Tasks &amp; status") + "</p>";

    if (!wk || !Array.isArray(wk.tasks) || !wk.tasks.length) {
      panel.innerHTML = head
        + "<p class=\"fg-hint\">No tasks recorded for this week yet. "
        + "Add them to <code>data/weekly_todos.json</code> under week \"" + week + "\".</p>";
      return;
    }

    let rows = "";
    wk.tasks.forEach(t => {
      const done = (t.status || "").toLowerCase() === "done";
      rows += "<tr class=\"" + (done ? "is-done" : "") + "\">"
        + "<td class=\"fg-task-col\">" + esc(t.name || "") + "</td>"
        + "<td class=\"fg-st-col\"><span class=\"fg-pill " + (done ? "done" : "todo") + "\">"
        + (done ? "done" : "todo") + "</span></td>"
        + "</tr>";
    });
    panel.innerHTML = head
      + "<table class=\"fg-todo\"><thead><tr>"
      + "<th class=\"fg-task-col\">Task</th><th class=\"fg-st-col\">Status</th>"
      + "</tr></thead><tbody>" + rows + "</tbody></table>";
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  }

  async function render(container) {
    injectStyle();
    container.innerHTML = "";
    container.classList.add("forge-gantt");
    // Fallback for browsers without :has() — flag the main panel so it can go full-width.
    const mp = container.closest(".main-panel");
    if (mp) mp.classList.add("has-gantt");
    try {
      const data = await DataStore.fetchJSON("data/gantt.json");
      let todos = null;
      try { todos = await DataStore.fetchJSON("data/weekly_todos.json"); }
      catch (e) { todos = null; }  // panel still works, just shows the "add to JSON" hint

      // ---- header: title (left) + actions (right) -----------------------
      const header = document.createElement("div");
      header.className = "fg-header";
      const h2 = document.createElement("h2");
      h2.className = "fg-h2";
      h2.textContent = "Gantt Chart";
      const actions = document.createElement("div");
      actions.className = "fg-actions";
      const dlBtn = document.createElement("button");
      dlBtn.type = "button";
      dlBtn.className = "fg-btn";
      dlBtn.textContent = "\u2B07 Download PNG";
      dlBtn.title = "Save a PNG snapshot of the current Gantt chart (this is the file you upload weekly)";
      const upLink = document.createElement("a");
      upLink.className = "fg-btn fg-btn-accent";
      upLink.href = UPLOAD_URL;
      upLink.target = "_blank";
      upLink.rel = "noopener noreferrer";
      upLink.textContent = "Weekly upload \u2197";
      upLink.title = "Open the course weekly-upload form in a new window";
      actions.appendChild(dlBtn);
      actions.appendChild(upLink);
      header.appendChild(h2);
      header.appendChild(actions);
      container.appendChild(header);

      // ---- capture region: everything below is what the PNG export grabs --
      const cap = document.createElement("div");
      cap.id = "fg-capture";
      cap.className = "fg-capture";

      const capTitle = document.createElement("p");
      capTitle.className = "fg-cap-title";
      capTitle.innerHTML = "FORGE \u2014 Project Gantt "
        + "<span class=\"stamp\">snapshot "
        + new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        + "</span>";
      cap.appendChild(capTitle);

      const intro = document.createElement("p");
      intro.textContent = "Thirteen-week project schedule (single contributor). Week 0 anchor: "
        + (data.week0_start || "(not set \u2014 edit data/gantt.json)")
        + ". Bars span the weeks each task is active; diamonds mark milestones; the vertical line marks today.";
      cap.appendChild(intro);

      cap.appendChild(buildLegend());
      cap.appendChild(buildStatusKey());

      // two-column body: chart (left, in capture region) + detail panel (right)
      const body = document.createElement("div");
      body.className = "fg-body";

      const chartCol = document.createElement("div");
      chartCol.className = "fg-chart-col";
      const scroll = document.createElement("div");
      scroll.className = "fg-scroll";
      scroll.appendChild(buildChart(data));
      chartCol.appendChild(scroll);
      body.appendChild(chartCol);

      const detail = buildDetailPanel();
      body.appendChild(detail);

      cap.appendChild(body);

      // clicking (or Enter/Space on) a bar loads that week's task list
      function selectWeek(bar) {
        const wk = parseInt(bar.dataset.week, 10);
        chartCol.querySelectorAll(".fg-bar.is-selected").forEach(b => b.classList.remove("is-selected"));
        bar.classList.add("is-selected");
        renderWeekDetail(detail, wk, todos);
      }
      chartCol.querySelectorAll(".fg-bar").forEach(bar => {
        bar.addEventListener("click", () => selectWeek(bar));
        bar.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectWeek(bar); }
        });
      });

      const msKey = buildMsKey(data);
      if (msKey) {
        const h3 = document.createElement("h3");
        h3.textContent = "Milestones";
        cap.appendChild(h3);
        cap.appendChild(msKey);
      }

      const meta = document.createElement("div");
      meta.className = "gantt-meta";
      meta.innerHTML = "<strong>Last updated:</strong> " + (data.last_updated || "\u2014")
        + " &nbsp;|&nbsp; <strong>Source:</strong> <code>data/gantt.json</code>"
        + " &nbsp;|&nbsp; Update workflow: edit JSON, commit, push.";
      cap.appendChild(meta);

      container.appendChild(cap);

      // wire the screenshot/download action
      dlBtn.addEventListener("click", () => downloadPng(cap, dlBtn));

    } catch (err) {
      const notice = document.createElement("div");
      notice.className = "notice-error";
      notice.textContent = "Could not load Gantt data: " + err.message;
      container.appendChild(notice);
    }
  }

  return { render };
})();
