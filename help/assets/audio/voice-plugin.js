/* ═══════════════════════════════════════════════════════════
   HELIX HELP — VOICE PLUGIN   help/plugins/audio/voice-plugin.js

   Plays PELAGIC's recorded voice clips and routes them through an
   AnalyserNode so the cube edges react to the REAL waveform via
   delta-RMS (the "best effect"). One clip plays at a time.

   Files live in:  help/assets/audio/<file>.wav
   The controller decides which file to play per topic (from each
   topic's `audio` field in help-topics.json) and calls play(file).

   Missing files fail silently — the text still types and the blip
   synth still chatters, so the UI never breaks if a clip isn't there.

   API used by the controller:
     HelixVoicePlugin.play(fileName)   // start a clip (stops any current)
     HelixVoicePlugin.stop()           // halt playback
   Bus hook the agent reads:
     level()  // 0..1 delta-RMS of the playing clip
   ═══════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var VoicePlugin = {
    name: "voice",
    base: "help/assets/audio/",
    bus: null,
    analyser: null,
    buf: null,
    cache: {},          // filename -> decoded AudioBuffer
    source: null,
    playing: false,
    delta: null,

    init: function (bus) {
      this.bus = bus;
      this.delta = bus.createDeltaTracker ? bus.createDeltaTracker() : null;
    },

    _ensureAnalyser: function () {
      var ac = this.bus && this.bus.audioContext();
      if (!ac) return null;
      if (!this.analyser) {
        this.analyser = ac.createAnalyser();
        this.analyser.fftSize = 1024;
        this.analyser.connect(ac.destination);
        this.buf = new Float32Array(this.analyser.fftSize);
      }
      return ac;
    },

    play: function (file) {
      var self = this;
      if (!file) return;
      var ac = this._ensureAnalyser();
      if (!ac) return;
      this.stop();

      function start(buffer) {
        if (!buffer) return;
        var src = ac.createBufferSource();
        src.buffer = buffer;
        src.connect(self.analyser);
        src.onended = function () {
          if (self.source === src) { self.playing = false; self.source = null; if (self.delta) self.delta.reset(); }
        };
        try { src.start(0); } catch (e) { return; }
        self.source = src;
        self.playing = true;
      }

      if (this.cache[file]) { start(this.cache[file]); return; }
      if (!global.fetch) return;
      global.fetch(this.base + file)
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (ab) { return ac.decodeAudioData(ab); })
        .then(function (buffer) { self.cache[file] = buffer; start(buffer); })
        .catch(function () { /* missing/undecodable clip — stay silent */ });
    },

    // delta-RMS of the live waveform → drives the cube edges
    level: function () {
      if (!this.playing || !this.analyser || !this.buf) return 0;
      try { this.analyser.getFloatTimeDomainData(this.buf); } catch (e) { return 0; }
      var sum = 0, n = this.buf.length;
      for (var i = 0; i < n; i++) { var v = this.buf[i]; sum += v * v; }
      var rms = Math.sqrt(sum / n);
      return this.delta ? this.delta.push(rms) : Math.min(rms * 4, 1);
    },

    stop: function () {
      if (this.source) {
        try { this.source.stop(); } catch (e) {}
        try { this.source.disconnect(); } catch (e) {}
        this.source = null;
      }
      this.playing = false;
      if (this.delta) this.delta.reset();
    }
  };

  global.HelixVoicePlugin = VoicePlugin;
  // registered by the controller when audio is enabled (needs a user gesture)
})(window);
