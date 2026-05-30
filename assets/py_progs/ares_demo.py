#!/usr/bin/env python3
"""
ARES DEMO RUNNER
────────────────
Plays all four ARES frequency visualizer variants in sequence,
with a 3-second pause between each.

Usage:  python ares_demo.py [audio_file]

Variants (in order):
  1. audio_surface_overlay_b.py  — Grey plane + heatmap + centre 3D columns (front-anchored)
  2. audio_surface_overlay.py    — MK3: 3D columns at Z-midpoint, heatmap radiates outward
  3. audio_surface_overlay_2.py  — Radial bell surface (full scrolling mesh)
  4. audio_surface_overlay_3.py  — Static plane bounce mode + peak hold markers
"""

import sys
import subprocess
import time
from pathlib import Path

# ─── Sequence ─────────────────────────────────────────────────────────────────

VARIANTS = [
    ("audio_surface_overlay_b.py",  "Grey Plane + Heatmap + Centre 3D Columns"),
    ("audio_surface_overlay.py",    "MK3: Z-Centre 3D + Bidirectional Heatmap"),
    ("audio_surface_overlay_2.py",  "Radial Bell Surface (Scrolling Mesh)"),
    ("audio_surface_overlay_3.py",  "Static Bounce Plane + Peak Hold Markers"),
]

DELAY_BETWEEN = 3   # seconds between variants

# ─── Helpers ──────────────────────────────────────────────────────────────────

CYAN   = "\033[96m"
YELLOW = "\033[93m"
GREEN  = "\033[92m"
DIM    = "\033[2m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def banner(text, color=CYAN):
    bar = "─" * 60
    print(f"\n{color}{bar}")
    print(f"  {BOLD}{text}{RESET}{color}")
    print(f"{bar}{RESET}")

def countdown(n):
    for i in range(n, 0, -1):
        print(f"  {DIM}Next variant in {i}...{RESET}", end="\r", flush=True)
        time.sleep(1)
    print(" " * 40, end="\r")   # clear line

# ─── Entry ────────────────────────────────────────────────────────────────────

def main():
    audio_arg  = sys.argv[1] if len(sys.argv) > 1 else None
    script_dir = Path(__file__).parent.resolve()
    python     = sys.executable

    banner("ARES DEMO RUNNER", CYAN)
    print(f"  Variants : {len(VARIANTS)}")
    print(f"  Audio    : {audio_arg or '(using each script default)'}")
    print(f"  Delay    : {DELAY_BETWEEN}s between variants")

    for idx, (script_name, label) in enumerate(VARIANTS, start=1):
        script_path = script_dir / script_name

        if not script_path.exists():
            print(f"\n{YELLOW}  [{idx}/{len(VARIANTS)}] SKIP — not found: {script_name}{RESET}")
            continue

        banner(f"[{idx}/{len(VARIANTS)}]  {label}", CYAN)
        print(f"  {DIM}Script : {script_name}{RESET}")

        cmd = [python, str(script_path)]
        if audio_arg:
            cmd.append(audio_arg)

        try:
            subprocess.run(cmd, check=False)
        except KeyboardInterrupt:
            print(f"\n{YELLOW}  Interrupted — stopping demo.{RESET}")
            sys.exit(0)
        except Exception as e:
            print(f"\n{YELLOW}  Error running {script_name}: {e}{RESET}")

        if idx < len(VARIANTS):
            print(f"\n{GREEN}  Done.{RESET}")
            countdown(DELAY_BETWEEN)

    banner("DEMO COMPLETE", GREEN)
    print(f"  All {len(VARIANTS)} variants finished.\n")

if __name__ == "__main__":
    main()
