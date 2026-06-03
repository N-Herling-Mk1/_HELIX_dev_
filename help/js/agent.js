/* ═══════════════════════════════════════════════════════════
   HELIX HELP — FAUX UI AGENT (PELAGIC)   help/js/agent.js

   A front-end "assistant" prototype. Two parts:
     1. A reactive FACE — a slowly rotating 3-D etched cube (CSS 3D,
        ported from the 3-Space Cube Surface Etch). Each face is an
        etch surface; the cube's EDGES flare with HelixAudioBus.level().
        Driven by the typing envelope today; by real audio (delta-RMS)
        when a voice plugin is registered — see HelixAudioBus.createDeltaTracker.
     2. A typed SPEECH engine — types dialogue char-by-char into the
        speech element, bumping the synthetic envelope and firing
        HelixAudioBus.char() per glyph so any audio plugin can blip.

   API:
     var a = HelixAgent.create({ sceneEl, speechEl, statusEl, palette });
     a.start();                  // build cube + begin render loop
     a.boot(lines);              // greeting
     a.speak(lines, onDone);     // type an array of strings
     a.interrupt();              // stop current speech
     a.setPalette(name);         // cyber | ember | void | matrix
     a.stop();                   // halt render loop
   ═══════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var SIZE = 167;          // cube edge in px (another +10% from 152; must match .ha-face size in help.css)
  var HALF = SIZE / 2;
  var PROJTOP_RATIO = 1.451; // sim-derived: topmost projected point sits ~1.451*HALF*fit above cube center
  var TOP_MARGIN = 12;       // px the cube top must stay below the panel top

  var PALETTES = {
    cyber:  { edge: "#00e5ff", colors: ["#00e5ff", "#00aaff", "#00ffaa", "#7fdfff"] },
    ember:  { edge: "#ff6a00", colors: ["#ff6a00", "#ff8800", "#ffaa00", "#ff5500"] },
    void:   { edge: "#b044ff", colors: ["#b044ff", "#8800ff", "#cc00ff", "#aa66ff"] },
    matrix: { edge: "#00ff41", colors: ["#00ff41", "#00dd33", "#00ff77", "#33ff88"] }
  };

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  /* ── one etched line with a travelling light (from the cube) ── */
  function Etch(w, h, horizontal, palette) {
    this.h = horizontal;
    this.len = Math.random() * (horizontal ? w : h) * 0.45 + 30;
    this.wd = Math.random() * 2.2 + 0.8;
    if (horizontal) { this.x = Math.random() * (w - this.len); this.y = Math.random() * h; }
    else            { this.x = Math.random() * w; this.y = Math.random() * (h - this.len); }
    this.lp = Math.random();
    this.ls = (Math.random() * 0.013 + 0.004) * (Math.random() > 0.5 ? 1 : -1);
    this.ll = Math.random() * 0.35 + 0.12;
    this.color = palette.colors[(Math.random() * palette.colors.length) | 0];
    this.phase = Math.random() * Math.PI * 2;
    this.pspeed = Math.random() * 0.06 + 0.02;
  }
  Etch.prototype.recolor = function (palette) { this.color = palette.colors[(Math.random() * palette.colors.length) | 0]; };
  Etch.prototype.update = function (palette, speed) {
    this.lp += this.ls * (1 + speed * 2.2);
    this.phase += this.pspeed;
    if (this.lp > 1 + this.ll) { this.lp = -this.ll; if (Math.random() > 0.6) this.recolor(palette); }
    if (this.lp < -this.ll)    { this.lp = 1 + this.ll; if (Math.random() > 0.6) this.recolor(palette); }
  };
  Etch.prototype.draw = function (ctx, level) {
    var pulse = (Math.sin(this.phase) + 1) / 2 * 0.4 + 0.3 + level * 0.4;
    ctx.strokeStyle = "rgba(18,22,30,0.5)";
    ctx.lineWidth = this.wd + 2; ctx.lineCap = "round";
    ctx.beginPath();
    if (this.h) { ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + this.len, this.y); }
    else        { ctx.moveTo(this.x, this.y); ctx.lineTo(this.x, this.y + this.len); }
    ctx.stroke();

    var s = Math.max(0, this.lp - this.ll), e = Math.min(1, this.lp);
    if (e <= s) return;
    var rgb = hexToRgb(this.color), a = pulse * 0.9;
    var grad = this.h
      ? ctx.createLinearGradient(this.x + s * this.len, this.y, this.x + e * this.len, this.y)
      : ctx.createLinearGradient(this.x, this.y + s * this.len, this.x, this.y + e * this.len);
    grad.addColorStop(0,    "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0)");
    grad.addColorStop(0.35, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + a + ")");
    grad.addColorStop(0.65, "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + a + ")");
    grad.addColorStop(1,    "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + ",0)");
    ctx.strokeStyle = grad; ctx.lineWidth = this.wd; ctx.lineCap = "round";
    ctx.save();
    ctx.shadowColor = this.color; ctx.shadowBlur = (8 + level * 22) * pulse;
    ctx.beginPath();
    if (this.h) { ctx.moveTo(this.x + s * this.len, this.y); ctx.lineTo(this.x + e * this.len, this.y); }
    else        { ctx.moveTo(this.x, this.y + s * this.len); ctx.lineTo(this.x, this.y + e * this.len); }
    ctx.stroke();
    ctx.restore();
  };

  /* ── one cube face: a canvas full of etches ── */
  function Face(el, palette) {
    this.el = el;
    this.canvas = el.querySelector("canvas");
    this.canvas.width = SIZE; this.canvas.height = SIZE;
    this.ctx = this.canvas.getContext("2d");
    this.etches = [];
    var n = 22 + (Math.random() * 16 | 0);
    for (var i = 0; i < n; i++) this.etches.push(new Etch(SIZE, SIZE, Math.random() > 0.5, palette));
  }
  Face.prototype.update = function (palette, speed) { for (var i = 0; i < this.etches.length; i++) this.etches[i].update(palette, speed); };
  Face.prototype.recolor = function (palette) { for (var i = 0; i < this.etches.length; i++) this.etches[i].recolor(palette); };
  Face.prototype.draw = function (level) {
    var c = this.ctx; if (!c) return;
    c.clearRect(0, 0, SIZE, SIZE);
    c.fillStyle = "#000"; c.fillRect(0, 0, SIZE, SIZE);
    for (var i = 0; i < this.etches.length; i++) this.etches[i].draw(c, level);
  };

  /* ── the agent ── */
  function Agent(opts) {
    this.sceneEl  = opts.sceneEl || null;
    this.speechEl = opts.speechEl || null;
    this.statusEl = opts.statusEl || null;
    this.palette  = PALETTES[opts.palette] || PALETTES.cyber;
    this.faces    = [];
    this.cube     = null;
    this.built    = false;
    this.raf      = null;
    this.spin     = 0;
    this.spinSpeed = 0.13;     // deg/frame → slow tumble (~8°/s)
    this.tilt     = -16;
    this.fit      = 1;
    this.centerFrac = 0.40;    // desired cube center as a fraction of stage height (moved up; clamped safe in _frame)
    this.stageH   = 360;       // measured each resize
    this.baseGlow = 0.16;      // idle edge glow so the cube is always visible
    this.gen      = 0;
    this.speaking = false;
    this.charDelay = 16;
    this.lineGap   = 360;
  }

  Agent.prototype._build = function () {
    if (this.built || !this.sceneEl) return;
    function face(cls) { return '<div class="ha-face ' + cls + '"><canvas></canvas></div>'; }
    this.sceneEl.innerHTML =
      '<div class="ha-cube">' +
        face("front") + face("back") + face("right") + face("left") + face("top") + face("bottom") +
      '</div>';
    this.cube = this.sceneEl.querySelector(".ha-cube");
    var self = this;
    this.faces = [].map.call(this.sceneEl.querySelectorAll(".ha-face"), function (el) { return new Face(el, self.palette); });
    this.built = true;
    this._resize();
  };

  Agent.prototype._resize = function () {
    if (!this.sceneEl) return;
    var w = this.sceneEl.clientWidth || 360, h = this.sceneEl.clientHeight || 360;
    this.stageH = h;
    this.fit = Math.max(0.45, Math.min(1.0, Math.min(w, h) / (SIZE * 1.85)));
  };

  /* edge glow — layered border + box-shadow on each face (ported applyGlow) */
  Agent.prototype._applyGlow = function (g) {
    var rgb = hexToRgb(this.palette.edge);
    var rgba = function (a) { return "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + a.toFixed(2) + ")"; };
    var shadow = (g < 0.01) ? "none" : [
      "inset 0 0 " + Math.round(10 * g) + "px " + Math.round(2 * g) + "px " + rgba(g * 0.9),
      "inset 0 0 " + Math.round(22 * g) + "px " + Math.round(3 * g) + "px " + rgba(g * 0.55),
      "0 0 " + Math.round(8 * g)  + "px " + Math.round(2 * g) + "px " + rgba(g * 0.85),
      "0 0 " + Math.round(18 * g) + "px " + Math.round(4 * g) + "px " + rgba(g * 0.5),
      "0 0 " + Math.round(36 * g) + "px " + Math.round(7 * g) + "px " + rgba(g * 0.3)
    ].join(",");
    var border = rgba(0.3 + g * 0.7);
    for (var i = 0; i < this.faces.length; i++) {
      this.faces[i].el.style.borderColor = border;
      this.faces[i].el.style.boxShadow = shadow;
    }
  };

  Agent.prototype.setPalette = function (name) {
    if (!PALETTES[name]) return this;
    this.palette = PALETTES[name];
    for (var i = 0; i < this.faces.length; i++) this.faces[i].recolor(this.palette);
    return this;
  };

  Agent.prototype.setStatus = function (txt) { if (this.statusEl) this.statusEl.textContent = txt; return this; };

  Agent.prototype.start = function () {
    this._build();
    if (this.raf) return this;
    var self = this;
    this._onResize = function () { self._resize(); };
    global.addEventListener("resize", this._onResize);
    var loop = function () { self._frame(); self.raf = global.requestAnimationFrame(loop); };
    this.raf = global.requestAnimationFrame(loop);
    return this;
  };

  Agent.prototype.stop = function () {
    if (this.raf) { global.cancelAnimationFrame(this.raf); this.raf = null; }
    if (this._onResize) { global.removeEventListener("resize", this._onResize); this._onResize = null; }
    return this;
  };

  Agent.prototype._frame = function () {
    if (!this.cube) return;
    this.spin += this.spinSpeed;
    if (global.HelixAudioBus) global.HelixAudioBus.decaySynthetic(0.90);
    var level = global.HelixAudioBus ? global.HelixAudioBus.level() : 0;

    // slow rotation only — the cube does NOT change size with audio.
    // translateY seats the cube higher in the panel (centerFrac of stage height),
    // but a dynamic clamp keeps its projected top from clipping out the top on any panel size.
    var projTop = PROJTOP_RATIO * HALF * this.fit;            // px the cube top extends above its center
    var centerPx = Math.max(this.centerFrac * this.stageH, projTop + TOP_MARGIN);
    var ty = centerPx - this.stageH / 2;
    this.cube.style.transform =
      "translateY(" + ty.toFixed(1) + "px) " +
      "rotateX(" + this.tilt + "deg) rotateY(" + this.spin + "deg) rotateZ(" + (this.spin * 0.06) + "deg) " +
      "scale(" + this.fit.toFixed(3) + ")";

    // ONLY the edges respond to the level/RMS (delta-RMS when a voice plugin feeds it)
    this._applyGlow(this.baseGlow + level * (1 - this.baseGlow));

    for (var i = 0; i < this.faces.length; i++) { this.faces[i].update(this.palette, level); this.faces[i].draw(level); }
  };

  /* ── speech ── */
  Agent.prototype._renderLine = function () {
    if (!this.speechEl) return null;
    var row = global.document.createElement("div");
    row.className = "ha-line";
    this.speechEl.appendChild(row);
    this.speechEl.scrollTop = this.speechEl.scrollHeight;
    return row;
  };
  Agent.prototype.clearSpeech = function () { if (this.speechEl) this.speechEl.innerHTML = ""; return this; };
  Agent.prototype.interrupt = function () { this.gen++; this.speaking = false; this.setStatus("IDLE"); return this; };

  Agent.prototype.speak = function (lines, onDone) {
    var self = this;
    this.interrupt();
    var myGen = ++this.gen;
    this.clearSpeech();
    this.speaking = true;
    this.setStatus("SPEAKING");
    if (global.HelixAudioBus) global.HelixAudioBus.speakStart(lines);

    var li = 0, ci = 0, row = null, charCount = 0;
    function step() {
      if (myGen !== self.gen) return;
      if (li >= lines.length) {
        self.speaking = false; self.setStatus("IDLE");
        if (global.HelixAudioBus) global.HelixAudioBus.speakEnd(lines);
        if (typeof onDone === "function") onDone();
        return;
      }
      var text = lines[li];
      if (ci === 0) row = self._renderLine();
      if (ci < text.length) {
        var ch = text.charAt(ci);
        if (row) row.textContent += ch;
        if (self.speechEl) self.speechEl.scrollTop = self.speechEl.scrollHeight;
        if (global.HelixAudioBus) {
          global.HelixAudioBus.bumpSynthetic(/\s/.test(ch) ? 0.12 : 0.55);
          global.HelixAudioBus.char(ch, charCount++);
        }
        ci++;
        global.setTimeout(step, self.charDelay + (/[.,!?]/.test(ch) ? 140 : 0));
      } else {
        li++; ci = 0;
        global.setTimeout(step, self.lineGap);
      }
    }
    step();
    return this;
  };

  Agent.prototype.boot = function (lines) { return this.speak(lines || ["Online."]); };

  global.HelixAgent = {
    palettes: PALETTES,
    SIZE: SIZE,
    create: function (opts) { return new Agent(opts || {}); }
  };
})(window);
