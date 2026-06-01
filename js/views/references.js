/* ═══════════════════════════════════════════════════════════
   HELIX — REFERENCE SYSTEM   js/views/references.js

   JSON-driven citations, matching the gantt.json pattern:
   edit content/references.json, commit, push.

   • Inline:  <cite data-ref="jaynes1957"></cite>   → [1]
              <cite data-ref="kuntz2024,rospel2025"></cite> → [3, 4]
     Auto-numbered by array order in references.json; each marker
     links to the References panel.

   • List:    the references panel mounts <div id="refs-host"></div>;
              HelixRefs.renderList() fills it.

   Numbering is fixed by references.json order (append-only), so a
   given paper carries the same number on every panel.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var URL = "../content/references.json";
  var DATA = null;
  var INDEX = {};        // id -> { num, ref }
  var loading = null;

  function ensure() {
    if (DATA) return Promise.resolve(DATA);
    if (!loading) {
      loading = fetch(URL)
        .then(function (r) {
          if (!r.ok) throw new Error(r.status + " " + r.statusText);
          return r.json();
        })
        .then(function (j) {
          DATA = j;
          (j.refs || []).forEach(function (r, i) { INDEX[r.id] = { num: i + 1, ref: r }; });
          return j;
        });
    }
    return loading;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* turn every <cite data-ref="..."> in `root` into a numbered marker */
  function process(root) {
    if (!root) return;
    return ensure().then(function () {
      var tags = root.querySelectorAll("cite[data-ref]");
      [].forEach.call(tags, function (el) {
        if (el.dataset.done === "1") return;          // idempotent on re-visit
        var ids = el.getAttribute("data-ref").split(",").map(function (s) { return s.trim(); });
        var nums = [], missing = false;
        ids.forEach(function (id) {
          if (INDEX[id]) nums.push(INDEX[id].num);
          else missing = true;
        });
        if (missing || !nums.length) {
          el.className = "cite-missing";
          el.textContent = "[?]";
        } else {
          nums.sort(function (a, b) { return a - b; });
          el.className = "cite";
          el.innerHTML = '<a href="#references">[' + nums.join(", ") + "]</a>";
        }
        el.dataset.done = "1";
      });
    });
  }

  /* render the full numbered bibliography into `el` */
  function renderList(el) {
    if (!el) return;
    return ensure().then(function () {
      var refs = (DATA && DATA.refs) || [];
      if (!refs.length) { el.innerHTML = "<p class='doc-p'>No references yet.</p>"; return; }
      var html = '<ol class="ref-list">';
      refs.forEach(function (r, i) {
        var links = (r.links || []).map(function (l) {
          return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a>";
        }).join("");
        html +=
          '<li id="ref-' + esc(r.id) + '">' +
            '<span class="ref-num">[' + (i + 1) + "]</span>" +
            "<span>" +
              '<span class="ref-authors">' + esc(r.authors) + "</span> (" + esc(r.year) + "). " +
              '<span class="ref-title">' + esc(r.title) + ".</span> " +
              (r.venue ? '<span class="ref-venue">' + esc(r.venue) + ".</span>" : "") +
              (links ? '<div class="ref-links">' + links + "</div>" : "") +
            "</span>" +
          "</li>";
      });
      html += "</ol>";
      el.innerHTML = html;
    });
  }

  window.HelixRefs = { process: process, renderList: renderList, ensure: ensure };
})();
