# HELIX Help — Audio Plugins

The agent's reactive face is driven by **one signal**: `HelixAudioBus.level()`
(a number in `0..1`). Today that signal is a synthetic envelope produced while
the agent types. An audio plugin can produce real sound on speech events and,
optionally, report a real `level()` that the bus maxes in — so the same face
reacts to actual audio with **no UI changes**.

## Plugin contract

A plugin is a plain object. Only `name` is required; every hook is optional.

```js
window.MyVoicePlugin = {
  name: "my-voice",

  init(bus) {            // called once on register; `bus` is HelixAudioBus
    this.bus = bus;
  },

  onSpeakStart(topic) {  // agent began speaking (topic = the spoken lines)
    // e.g. start TTS / begin loading a voice file
  },

  onChar(ch, idx) {      // each typed glyph — good for blips / visemes
  },

  onSpeakEnd(topic) {    // agent finished
  },

  level() {              // OPTIONAL: return 0..1 real output level (RMS).
    return 0;            // If present, it's max'd with the synthetic envelope.
  },

  stop() {               // on unregister / panel close — release nodes/timers
  }
};
```

## Registering

```js
HelixAudioBus.register(window.MyVoicePlugin);     // turn on
HelixAudioBus.unregister("my-voice");             // turn off (by name or object)
HelixAudioBus.has("my-voice");                    // bool
HelixAudioBus.list();                             // ["silent", ...]
```

Auto-register on load by ending your file with
`if (window.HelixAudioBus) window.HelixAudioBus.register(MyVoicePlugin);`
(see `silent-plugin.js`), **or** register on a user gesture (see how the ♪ button
registers `beep-plugin.js` in `help-modal.js`). Browsers require a user gesture
before audio can play, so gesture-based registration is the safe default for
anything that makes sound.

## Shared AudioContext

Don't create your own — ask the bus, so everything shares one context and it's
only created when audio is actually wanted:

```js
const ac = this.bus.audioContext();   // lazily created; resumed if suspended
```

## Reference implementations

- **`silent-plugin.js`** — the no-op template. Copy it to start.
- **`beep-plugin.js`** — a working WebAudio blip synth with zero external files.
  It bumps a decaying envelope on each glyph and exposes it via `level()`, so the
  agent face reacts to genuinely-produced audio. This is the proof-of-concept for
  "add audio effects later."

## Roadmap notes (voice files)

`help-topics.json` already carries an `audio` filename per topic (e.g.
`"audio": "search.mp3"`). A future voice-file plugin would, on `onSpeakStart`,
fetch/play `help/assets/audio/<file>` through the shared context, route it via an
`AnalyserNode`, and return its RMS from `level()`. Drop the files under
`help/assets/audio/` and register the plugin — nothing else changes.

## Delta-RMS (the agent's preferred edge effect)

The cube edges look best driven by **delta-RMS** — the change from a
running baseline, so transients pop and steady tones fade. The bus ships
the exact math from the etch-cube reference:

```js
const d = HelixAudioBus.createDeltaTracker();   // {push(rms)->0..1, reset()}
// inside your plugin:
level() { return d.push(this.currentRMS); }     // feed AnalyserNode RMS
```

`createDeltaTracker({ baselineSpeed, sensitivity, smoothing })` lets you
tune baseline lag and gain; defaults match the cube's delta mode.
