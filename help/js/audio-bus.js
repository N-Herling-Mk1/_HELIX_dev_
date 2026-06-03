/* ═══════════════════════════════════════════════════════════
   HELIX HELP — AUDIO BUS   help/js/audio-bus.js

   The seam for adding voice / sound effects later WITHOUT touching
   the agent UI. The agent reads ONE signal — HelixAudioBus.level()
   (0..1) — to drive its reactive face. Today that signal comes from
   a synthetic typing envelope. A registered plugin can override it
   with a real audio level (RMS), so a future TTS or voice-file
   plugin lights up the exact same visual.

   ── PLUGIN CONTRACT ──
   A plugin is a plain object. All hooks are optional except `name`:
     {
       name: "my-plugin",
       init(bus)            // once, on register; `bus` is this API
       onSpeakStart(topic)  // agent begins speaking a topic
       onChar(ch, idx)      // each typed character (good for blips)
       onSpeakEnd(topic)    // agent finished
       level()              // return 0..1 real audio level (optional);
                            //   if present, max'd with the synthetic level
       stop()               // on unregister / panel close
     }
   Register:   HelixAudioBus.register(myPlugin)
   Unregister: HelixAudioBus.unregister(myPlugin)  // or by name string

   Shared WebAudio context: HelixAudioBus.audioContext()  — lazily
   created on first use so we never spin one up until audio is wanted.
   ═══════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var plugins   = [];
  var synthetic = 0;       // 0..1 envelope driven by the typing agent
  var actx      = null;    // shared AudioContext (lazy)

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  function safe(fn) { try { return fn(); } catch (e) { /* a plugin must never break the bus */ } }

  var bus = {
    /* ── lifecycle ── */
    register: function (plugin) {
      if (!plugin || !plugin.name) return this;
      if (this.has(plugin.name)) return this;
      plugins.push(plugin);
      if (plugin.init) safe(function () { plugin.init(bus); });
      return this;
    },
    unregister: function (which) {
      var name = (typeof which === "string") ? which : (which && which.name);
      for (var i = plugins.length - 1; i >= 0; i--) {
        if (plugins[i].name === name) {
          var p = plugins[i];
          if (p.stop) safe(function () { p.stop(); });
          plugins.splice(i, 1);
        }
      }
      return this;
    },
    has:  function (name) { return plugins.some(function (p) { return p.name === name; }); },
    list: function ()     { return plugins.map(function (p) { return p.name; }); },

    /* ── shared audio context (lazy) ── */
    audioContext: function () {
      if (!actx) {
        var AC = global.AudioContext || global.webkitAudioContext;
        if (AC) safe(function () { actx = new AC(); });
      }
      if (actx && actx.state === "suspended") safe(function () { actx.resume(); });
      return actx;
    },

    /* ── synthetic envelope (typing agent owns this) ── */
    setSynthetic:   function (v) { synthetic = clamp01(v); return this; },
    bumpSynthetic:  function (v) { synthetic = clamp01(synthetic + v); return this; },
    decaySynthetic: function (k) { synthetic *= (k == null ? 0.86 : k); return this; },

    /* ── the one signal the agent renders ── */
    level: function () {
      var lv = synthetic;
      for (var i = 0; i < plugins.length; i++) {
        var p = plugins[i];
        if (p.level) {
          var v = safe(function () { return p.level(); }) || 0;
          if (v > lv) lv = v;
        }
      }
      return clamp01(lv);
    },

    /* ── broadcast speech events to plugins ── */
    speakStart: function (topic) { plugins.forEach(function (p) { if (p.onSpeakStart) safe(function () { p.onSpeakStart(topic); }); }); },
    char:       function (ch, i) { plugins.forEach(function (p) { if (p.onChar)       safe(function () { p.onChar(ch, i); }); }); },
    speakEnd:   function (topic) { plugins.forEach(function (p) { if (p.onSpeakEnd)    safe(function () { p.onSpeakEnd(topic); }); }); },

    /* ── delta-RMS tracker (the "best effect" for real audio) ──
       Ported from the etch cube's delta mode: tracks a running baseline,
       takes the positive deviation (new energy), smooths it, and self-
       normalizes against an adaptive peak — so transients pop and
       sustained levels fade. A voice plugin computes raw RMS from its
       AnalyserNode, pushes it through, and returns the 0..1 result from
       level(). The agent's cube edges then flare to dynamics, not volume.

         var d = HelixAudioBus.createDeltaTracker();
         // in your plugin's level():  return d.push(currentRMS);
    */
    createDeltaTracker: function (opts) {
      opts = opts || {};
      var baselineSpeed = opts.baselineSpeed != null ? opts.baselineSpeed : 0.012;
      var sensitivity   = opts.sensitivity   != null ? opts.sensitivity   : 3;
      var smoothing     = opts.smoothing     != null ? opts.smoothing     : 0.7;
      var baseline = 0, smoothed = 0, peak = 0.01;
      return {
        push: function (rms) {
          baseline = baseline * (1 - baselineSpeed) + rms * baselineSpeed;
          var d = Math.max(0, rms - baseline) * sensitivity;
          smoothed = smoothed * smoothing + d * (1 - smoothing);
          if (smoothed > peak) { peak += (smoothed - peak) * 0.12; }      // fast attack
          else { peak *= 0.997; peak = Math.max(0.002, peak); }           // slow decay
          return peak > 0.002 ? Math.min(smoothed / peak, 1) : 0;
        },
        reset: function () { baseline = 0; smoothed = 0; peak = 0.01; }
      };
    }
  };

  global.HelixAudioBus = bus;
})(window);
