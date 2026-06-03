/* ═══════════════════════════════════════════════════════════
   HELIX HELP — MODAL CONTROLLER   help/js/help-modal.js

   Owns the HELP modal: builds its DOM once, loads topics from
   help/data/help-topics.json, and wires the three panels:
     · top-left  → HelixTerminal  (information console)
     · top-right → HelixAgent     (faux UI assistant face + speech)
     · bottom    → topic buttons  (scrollable; click → terminal+agent)

   Lives at the SHELL level so the modal overlays everything. The
   shell only needs: a #help-btn button, this CSS, and these scripts.

   Public:  HelixHelp.init()  ·  HelixHelp.open()  ·  HelixHelp.close()
   ═══════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var doc = global.document;
  var DATA_URL = "help/data/help-topics.json";

  // Minimal fallback so the modal still works if the JSON can't be fetched
  // (e.g. opened from file://). Mirrors the JSON shape.
  var FALLBACK = {
    agent: { name: "PELAGIC", boot: ["PELAGIC online.", "Pick a topic below and I'll walk you through it."] },
    topics: [
      { id: "getting-started", label: "Getting Started", icon: "◇",
        terminal: ["$ helix --about", "HELIX ... ONLINE", "two systems, one spine."],
        agent: ["Welcome to HELIX — a paper library and a research program sharing one backbone.",
                "Use the buttons below to ask me about any part of it."] }
    ]
  };

  var built = false, isOpen = false, audioOn = false, booting = false;
  var bootTimer = null;
  var BOOT_LOCK_MS = 8000;   // welcome plays alone; topic buttons stay hidden until this elapses
  var els = {}, term = null, agent = null, data = null, activeId = null;

  /* ── build the modal DOM (once) ── */
  function build() {
    if (built) return;
    var overlay = doc.createElement("div");
    overlay.className = "hm-overlay";
    overlay.id = "hm-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="hm-modal" role="dialog" aria-modal="true" aria-label="HELIX Help">' +
        '<div class="hm-head">' +
          '<div class="hm-title">H<span class="hm-dot">·</span>E<span class="hm-dot">·</span>L<span class="hm-dot">·</span>I<span class="hm-dot">·</span>X &nbsp;—&nbsp; HELP</div>' +
          '<div class="hm-head-sub">guide assistant</div>' +
          '<button class="hm-close" id="hm-close" aria-label="Close help">✕</button>' +
        '</div>' +
        '<div class="hm-grid">' +
          '<section class="hm-pane hm-term-pane" id="hm-term" aria-label="Information console"></section>' +
          '<section class="hm-pane hm-agent-pane">' +
            '<div class="ha-head">' +
              '<span class="ha-core-dot"></span>' +
              '<span class="ha-name" id="ha-name">PELAGIC</span>' +
              '<span class="ha-status" id="ha-status">IDLE</span>' +
              '<button class="ha-mute" id="ha-mute" title="Toggle blip synth (demo audio plugin)">♪ off</button>' +
            '</div>' +
            '<div class="ha-stage">' +
              '<div class="ha-scene" id="ha-scene"></div>' +
              '<div class="ha-speech" id="ha-speech" aria-live="polite"></div>' +
            '</div>' +
          '</section>' +
          '<section class="hm-topics" id="hm-topics" aria-label="Help topics"></section>' +
        '</div>' +
      '</div>';
    doc.body.appendChild(overlay);

    els.overlay = overlay;
    els.modal   = overlay.querySelector(".hm-modal");
    els.close   = overlay.querySelector("#hm-close");
    els.termEl  = overlay.querySelector("#hm-term");
    els.scene   = overlay.querySelector("#ha-scene");
    els.speech  = overlay.querySelector("#ha-speech");
    els.status  = overlay.querySelector("#ha-status");
    els.name    = overlay.querySelector("#ha-name");
    els.mute    = overlay.querySelector("#ha-mute");
    els.topics  = overlay.querySelector("#hm-topics");

    // instantiate panels
    term  = global.HelixTerminal ? global.HelixTerminal.create(els.termEl, { prompt: "helix@guide:~$" }) : null;
    agent = global.HelixAgent ? global.HelixAgent.create({
      sceneEl: els.scene, speechEl: els.speech, statusEl: els.status, palette: "cyber"
    }) : null;

    // wiring
    els.close.addEventListener("click", close);
    overlay.addEventListener("mousedown", function (e) { if (e.target === overlay) close(); });
    els.mute.addEventListener("click", toggleAudio);

    built = true;
  }

  /* ── topics ── */
  function renderTopics() {
    els.topics.innerHTML = "";
    (data.topics || []).forEach(function (t) {
      var b = doc.createElement("button");
      b.className = "hm-topic";
      b.dataset.id = t.id;
      b.innerHTML = '<span class="hm-topic-ico">' + (t.icon || "›") + "</span>" +
                    '<span class="hm-topic-lbl">' + escapeHtml(t.label) + "</span>";
      b.addEventListener("click", function () { selectTopic(t.id); });
      els.topics.appendChild(b);
    });
  }

  function selectTopic(id) {
    if (booting) return;                // ignore selections until the welcome finishes (buttons are hidden anyway)
    var t = (data.topics || []).filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    activeId = id;
    [].forEach.call(els.topics.querySelectorAll(".hm-topic"), function (b) {
      b.classList.toggle("active", b.dataset.id === id);
    });
    playVoice(t.audio);                 // wired topics play their clip; others play the beta clip
    if (term)  term.printTopic(t);
    if (agent) agent.speak(t.agent || []);
  }

  // play a named clip through the voice plugin (no-op if audio is off / file missing)
  function playVoice(file) {
    if (!audioOn || !file) return;
    var v = global.HelixVoicePlugin;
    if (v && v.play) v.play(file);
  }

  /* ── master audio: voice clips + blip synth together (the ♪ button) ── */
  function setAudio(on) {
    var bus = global.HelixAudioBus; if (!bus) return;
    audioOn = !!on;
    var beep = global.HelixBeepPlugin, voice = global.HelixVoicePlugin;
    if (audioOn) {
      bus.audioContext();                              // unlock (call within a user gesture)
      if (beep)  bus.register(beep);
      if (voice) bus.register(voice);
      if (els.mute) { els.mute.textContent = "♪ on"; els.mute.classList.add("on"); }
    } else {
      if (beep)  bus.unregister(beep.name);
      if (voice) { bus.unregister(voice.name); if (voice.stop) voice.stop(); }
      if (els.mute) { els.mute.textContent = "♪ off"; els.mute.classList.remove("on"); }
    }
  }
  function toggleAudio() { setAudio(!audioOn); }

  /* ── open / close ── */
  function open() {
    build();
    if (global.HelixAudioBus) global.HelixAudioBus.audioContext();  // unlock within the HELP-click gesture
    ensureData(function () {
      els.overlay.classList.add("show");
      els.overlay.setAttribute("aria-hidden", "false");
      isOpen = true;
      var ob = doc.getElementById("help-btn"); if (ob) ob.classList.add("active");
      if (agent) agent.start();
      if (term)  term.boot();
      setAudio(true);                                  // audio on by default when opening
      var greeting = (data.agent && data.agent.boot) || ["Online."];
      if (data.agent && data.agent.name && els.name) els.name.textContent = data.agent.name;

      // boot lock: hide the topic buttons and let the welcome clip play alone,
      // then pop the buttons in after BOOT_LOCK_MS.
      booting = true;
      activeId = null;
      if (els.topics) els.topics.classList.remove("revealed");
      if (bootTimer) clearTimeout(bootTimer);
      bootTimer = setTimeout(function () {
        booting = false;
        if (isOpen && els.topics) els.topics.classList.add("revealed");
      }, BOOT_LOCK_MS);

      playVoice(data.agent && data.agent.audio);       // welcome clip (pelagic_01_online) — plays alone
      if (agent) agent.speak(greeting);                // greeting types alongside; no auto topic during boot
    });
  }

  function close() {
    if (!built) return;
    els.overlay.classList.remove("show");
    els.overlay.setAttribute("aria-hidden", "true");
    isOpen = false;
    var cb = doc.getElementById("help-btn"); if (cb) cb.classList.remove("active");
    if (agent) { agent.interrupt(); agent.stop(); }
    if (global.HelixVoicePlugin && global.HelixVoicePlugin.stop) global.HelixVoicePlugin.stop();
    // reset the boot lock so the next open replays the welcome and re-hides the buttons
    if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
    booting = false;
    if (els.topics) els.topics.classList.remove("revealed");
  }

  function ensureData(cb) {
    if (data) return cb();
    if (!global.fetch) { data = FALLBACK; renderTopics(); return cb(); }
    global.fetch(DATA_URL + "?t=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (json) { data = json; renderTopics(); cb(); })
      .catch(function () { data = FALLBACK; renderTopics(); cb(); });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ── init: wire the shell HELP button + shortcuts ── */
  function init() {
    var btn = doc.getElementById("help-btn");
    if (btn) btn.addEventListener("click", function (e) { e.preventDefault(); isOpen ? close() : open(); });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) { close(); }
      if (e.altKey && (e.key === "h" || e.key === "H")) { e.preventDefault(); isOpen ? close() : open(); }
    });
  }

  global.HelixHelp = { init: init, open: open, close: close };

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
