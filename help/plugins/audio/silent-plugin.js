/* ═══════════════════════════════════════════════════════════
   HELIX HELP — SILENT PLUGIN   help/plugins/audio/silent-plugin.js

   The reference / template audio plugin. It does nothing audible —
   it exists to (a) document the plugin contract and (b) prove the
   registration path. Copy this file to start a real audio plugin
   (e.g. a TTS voice, or voice-file playback). When your plugin can
   measure a real output level, implement level() so the agent face
   reacts to actual sound instead of the synthetic typing envelope.

   Auto-registered at load as the always-present "default" slot.
   ═══════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var SilentPlugin = {
    name: "silent",

    init: function (bus) { this.bus = bus; /* grab shared bus if needed */ },

    onSpeakStart: function (topic) { /* agent began speaking */ },
    onChar:       function (ch, idx) { /* per glyph — blip here */ },
    onSpeakEnd:   function (topic) { /* agent finished */ },

    // Return 0..1 if you can measure real audio; omit/return 0 otherwise.
    level: function () { return 0; },

    stop: function () { /* release any nodes/timers */ }
  };

  global.HelixSilentPlugin = SilentPlugin;
  if (global.HelixAudioBus) global.HelixAudioBus.register(SilentPlugin);
})(window);
