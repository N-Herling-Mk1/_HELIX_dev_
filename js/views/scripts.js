/* ═══════════════════════════════════════════════════════════
   HELIX — SCRIPTS INDEX   js/views/scripts.js

   Renders the Python-Scripts panel as scannable cards from
   content/scripts.json. Metadata + jump/download links only
   (FORGE-style); source is not inlined.

   Edit content/scripts.json, commit, push.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var URL = "../content/scripts.json";
  var DATA = null, loading = null;

  function ensure() {
    if (DATA) return Promise.resolve(DATA);
    if (!loading) {
      loading = fetch(URL)
        .then(function (r) { if (!r.ok) throw new Error(r.status + " " + r.statusText); return r.json(); })
        .then(function (j) { DATA = j; return j; });
    }
    return loading;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function row(label, value) {
    if (!value) return "";
    return '<div class="sc-row"><span class="sc-row-k">' + esc(label) + "</span>" +
           '<span class="sc-row-v">' + esc(value) + "</span></div>";
  }

  function renderList(el) {
    if (!el) return;
    return ensure().then(function () {
      var base = (DATA && DATA.base) || "../assets/py_scripts/";
      var scripts = (DATA && DATA.scripts) || [];
      if (!scripts.length) { el.innerHTML = "<p class='doc-p'>No scripts indexed yet.</p>"; return; }

      var html = '<div class="sc-grid">';
      scripts.forEach(function (s) {
        var href = base + s.file;
        var st = (s.status || "").toLowerCase();
        html +=
          '<div class="sc-card">' +
            '<div class="sc-head">' +
              '<div>' +
                (s.tag ? '<div class="sc-tag">' + esc(s.tag) + "</div>" : "") +
                '<h3 class="sc-title">' + esc(s.title) + "</h3>" +
                '<div class="sc-file">' + esc(s.file) + "</div>" +
              "</div>" +
              '<span class="sc-status sc-' + esc(st || "wip") + '">' + esc(s.status || "wip") + "</span>" +
            "</div>" +
            (s.purpose ? '<p class="sc-purpose">' + esc(s.purpose) + "</p>" : "") +
            '<div class="sc-meta">' +
              row("Metric", s.metric) +
              row("Graph", s.graph) +
              row("Go / no-go", s.pass) +
              row("Needs", s.needs) +
            "</div>" +
            '<div class="sc-links">' +
              '<a href="' + esc(href) + '" target="_blank" rel="noopener">View source ↗</a>' +
              '<a href="' + esc(href) + '" download>Download</a>' +
            "</div>" +
          "</div>";
      });
      html += "</div>";
      el.innerHTML = html;
    });
  }

  window.HelixScripts = { renderList: renderList, ensure: ensure };
})();
