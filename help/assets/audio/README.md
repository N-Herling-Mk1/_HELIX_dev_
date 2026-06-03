# HELIX Help — Voice Clips

Drop PELAGIC's voice clips **in this folder** (`help/assets/audio/`). The
controller plays them by filename; the names below are wired in
`help/data/help-topics.json` (the `audio` field on each topic, and
`agent.audio` for the intro).

## Files expected here

| File                          | Plays when…                                   |
|-------------------------------|-----------------------------------------------|
| `pelagic_01_online.wav`       | the Help modal opens (intro / greeting)       |
| `pelagic_04_getstarted.wav`   | the **Getting Started** topic is selected     |
| `pelagic_05_sectors.wav`      | the **The H·E·L·I·X Sectors** topic is selected |
| `pelagic_03_beta.wav`         | any **not-yet-wired** topic (Searching, View & Download, Documentation, About Me, Voice & Audio) |

`.wav` is what's wired now; `.mp3`/`.ogg` also work — just match the filename
in `help-topics.json`.

## How playback works

- The `♪` button in the agent header is the master audio switch (on by default
  when the modal opens — opening is the user gesture browsers require).
- Selecting a topic plays that topic's `audio` clip through an `AnalyserNode`;
  the cube's **edges** react to the clip's **delta-RMS** (dynamics).
- The typed text + blip synth still run alongside the clip.
- Missing files fail silently — text and blips still work, just no voice.

## Wiring a new topic to its own clip

1. Record the clip and drop the `.wav` here.
2. In `help-topics.json`, set that topic's `"audio"` to the filename
   (replacing `pelagic_03_beta.wav`).

That's it — no code change.
