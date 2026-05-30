# HELIX — View Shell Redesign (branch: redesign/website)

Multi-view iframe shell. One thin shell owns persistent chrome + the
animated logo; each view is a standalone page mounted in a single iframe
(the separation-of-concerns boundary). Controller (shell) ⇄ View (iframe)
= MVC seam, no framework.

## Structure (merge into the existing repo)
    app.html                     Shell markup: topbar · switcher · logo cell · FX panel · iframe
    css/
      core.css                   Shared :root tokens + reset
      shell.css                  Shell chrome + persistent logo cell + FX panel
      views/view-shell.css       Shared "iframe shape": logo box · rail · content + embed rules
    js/
      glitch.js                  (existing repo file — shell loads it; do NOT overwrite)
      shell.js                   Router · hash · postMessage bus · logo boot · FX wiring
      views/embed.js             ?embed=1 → hide own chrome, neutralize inner glitch loop
      views/gantt.reference.js   Original FORGE gantt.js (reference)
    content/
      gantt.json · weekly_todos.json
    views/
      research-traditional.html  Port of main.html (embed-aware)
      research-nova.html         Radial array (scaffold; awaiting nav.html import)
      documentation.html         Overview + FORGE-mirrored Gantt

## The persistent logo (Option B)
The animated logo (glitch.js) lives in the SHELL — `#shell-logo-canvas`,
booted once by shell.js — so it never reloads on view swap. The FX panel
(⚡ FX in the topbar) drives it via the HELIX_GLITCH API:
setImage / setEffect / setAuto / triggerCurrent / reset. Each view hides
its own logo box in embed mode (keeping the footprint) so the shell's
logo sits exactly over it. The Traditional port's auto-init on
'glitch-canvas' is neutralized by embed.js so only one loop ever runs.

## Views & routes
RESEARCH (Traditional ⇄ HELIX NOVA, toggled in-panel, same docs) · DOCUMENTATION
    #research/traditional   #research/nova   #docs
Keyboard: Alt+1 Research · Alt+2 Docs · Alt+t Traditional · Alt+n NOVA

## Run
Serve from repo root (relative iframe src + assets need a server):
    python3 -m http.server   →  http://localhost:8000/app.html
GitHub Pages: works as-is.

## To finish
- documentation.html: flip embedded JSON → fetch('content/*.json')
- research-nova.html: drop ported _INFO_698_A_ radial code at IMPORT ZONE
- confirm assets/img logo PNGs exist (spiral_flavor / helix_sleek / helix_fusion_ha)
