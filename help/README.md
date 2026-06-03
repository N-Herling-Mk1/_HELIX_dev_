# HELIX — Help / Assistant Module

A self-contained help system mounted at the **shell** level (`app.html`) so its
modal overlays every view. Adds one button to the shell; everything else lives
under `help/`.

## What it is

A `[HELP]` button (next to `Documentation`) opens a modal with three panels:

```
┌─────────────────────────┬─────────────────────────┐
│  INFORMATION (terminal)  │   ASSISTANT (UI agent)   │
│  linux/windows console   │   rotating cube + speech │
├─────────────────────────┴─────────────────────────┤
│            HELP TOPICS  (scrollable buttons)        │
└─────────────────────────────────────────────────────┘
```

- **Top-left — terminal:** a console that types per-topic technical info.
- **Top-right — agent (PELAGIC):** a slowly rotating 3-D etched cube (motivated by the
  3-Space Cube Surface Etch) plus a typed-speech engine that "talks" about the
  selected topic.
- **Bottom — topics:** data-driven buttons; click one and the terminal + agent
  respond.

Voice is **not** wired yet, by design. The audio path is a plugin bus, so a
future TTS engine or voice-file player drops in without touching the UI.

## File layout

```
help/
├── README.md                       this file
├── css/
│   └── help.css                    modal + terminal + agent + topbar HELP button
├── data/
│   └── help-topics.json            topics: terminal lines + agent dialogue (+ future audio file)
├── js/
│   ├── audio-bus.js                plugin registry + shared AudioContext + reactive level()
│   ├── terminal.js                 the information console
│   ├── agent.js                    the faux UI agent (3D etched cube + typed speech)
│   └── help-modal.js               controller: builds DOM, loads topics, wires panels
└── plugins/
    └── audio/
        ├── README.md               how to write an audio plugin
        ├── silent-plugin.js        no-op reference (auto-registered default slot)
        └── beep-plugin.js          working blip synth demo (toggled by ♪)
```

## Shell hook (the only change outside `help/`)

In `app.html`:
- one `<button id="help-btn" class="docbtn helpbtn">Help</button>` in the topbar;
- `<link>` to `help/css/help.css`;
- the six `help/` scripts before `</body>`.

The shell router (`shell.js`) is untouched — the HELP button has its own id, so
the `#docbtn` handler never fires for it.

## Load order (matters)

`audio-bus.js` → `silent-plugin.js` → `beep-plugin.js` → `terminal.js` →
`agent.js` → `help-modal.js`. The bus must exist before plugins register; the
panels must exist before the controller instantiates them.

## Extending

- **Add a topic:** append an object to `topics[]` in `help-topics.json`
  (`id`, `label`, `icon`, `terminal[]`, `agent[]`, optional `audio`). No code change.
- **Add audio (voice / SFX):** write a plugin (see `plugins/audio/README.md`) and
  register it on `HelixAudioBus`. If it reports `level()`, the agent face reacts
  to real sound automatically.
- **Re-theme the agent:** `agent.setPalette('cyber'|'ember'|'void'|'matrix')`.

## Shortcuts

`Alt+H` toggles the modal · `Esc` closes it · click the backdrop to dismiss.
