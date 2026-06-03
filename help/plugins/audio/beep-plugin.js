/* ═══════════════════════════════════════════════════════════
   HELIX HELP — BLIP SYNTH PLUGIN   help/plugins/audio/beep-plugin.js

   A working demo of the plugin seam, with ZERO external files: it
   synthesizes a short blip per typed glyph via WebAudio and exposes
   a decaying envelope through level(), so the agent face reacts to
   *real* audio output rather than the synthetic typing envelope.

   This is the proof-of-concept for "add audio effects later":
   a future voice-file or TTS plugin follows the same shape — emit
   sound on speech events, report level() — and lights up the same
   reactive face with no UI changes.

   Toggled on/off by the ♪ button in the agent header. NOT registered
   by default (audio stays silent until the user opts in via a click,
   which also satisfies the browser's autoplay gesture requirement).
   ═══════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var BeepPlugin = {
    name: "beep",
    bus: null,
    envAtBump: 0,
    bumpTime: 0,
    decay: 7,        // per-second envelope decay
    enabled: true,

    init: function (bus) {
      this.bus = bus;
      this.envAtBump = 0;
      this.bumpTime = this._now();
    },

    _now: function () {
      return (global.performance && global.performance.now) ? global.performance.now() : Date.now();
    },

    onChar: function (ch, idx) {
      if (!this.bus) return;
      var ac = this.bus.audioContext();
      // envelope bump (drives level()) regardless of whether audio is available
      var isSpace = /\s/.test(ch);
      this.envAtBump = Math.min(1, this.level() + (isSpace ? 0.15 : 0.7));
      this.bumpTime = this._now();
      if (!ac || isSpace) return;

      // short square blip; pitch wanders a little per glyph
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.type = "square";
      o.frequency.value = 240 + (idx % 7) * 28 + Math.random() * 40;
      var t = ac.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(g); g.connect(ac.destination);
      o.start(t);
      o.stop(t + 0.08);
    },

    // decaying envelope → reactive level the agent reads
    level: function () {
      var dt = (this._now() - this.bumpTime) / 1000;
      var v = this.envAtBump * Math.exp(-dt * this.decay);
      return v < 0 ? 0 : (v > 1 ? 1 : v);
    },

    stop: function () { this.envAtBump = 0; }
  };

  global.HelixBeepPlugin = BeepPlugin;
  // intentionally NOT auto-registered — the ♪ toggle registers it on a click
})(window);
