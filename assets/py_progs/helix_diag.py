"""
HELIX Diagnostic — helix_diag.py
Run this from _HELIX_/assets/py_progs/ in a cmd window:
    python helix_diag.py

It checks every path, import, and audio file, then exits.
Copy-paste the output when reporting issues.
"""
import sys, os, subprocess, traceback
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT  = SCRIPT_DIR.parent.parent

SEP = "─" * 60

def ok(msg):  print(f"  [OK]   {msg}")
def warn(msg):print(f"  [WARN] {msg}")
def err(msg): print(f"  [ERR]  {msg}")

print(SEP)
print("  HELIX DIAGNOSTIC")
print(SEP)

# ── Python ────────────────────────────────────────────────────────────────────
print("\n[1] Python")
ok(f"version  : {sys.version}")
ok(f"exe      : {sys.executable}")
ok(f"platform : {sys.platform}")

# ── Paths ─────────────────────────────────────────────────────────────────────
print(f"\n[2] Paths")
ok(f"SCRIPT_DIR : {SCRIPT_DIR}")
ok(f"REPO_ROOT  : {REPO_ROOT}")

paths = {
    "bat/run_helix.bat":          REPO_ROOT / "bat" / "run_helix.bat",
    "bat/kill_helix.bat":         REPO_ROOT / "bat" / "kill_helix.bat",
    "control.html":               REPO_ROOT / "control.html",
    "main.html":                  REPO_ROOT / "main.html",
    "editor.html":                REPO_ROOT / "editor.html",
    "assets/py_progs/ares_cube.py":     SCRIPT_DIR / "ares_cube.py",
    "assets/py_progs/helix_server.py":  SCRIPT_DIR / "helix_server.py",
    "assets/img/ (dir)":          REPO_ROOT / "assets" / "img",
    "data/ (dir)":                REPO_ROOT / "data",
}
for label, p in paths.items():
    if p.exists(): ok(f"{label}")
    else:          err(f"{label}  ← NOT FOUND  ({p})")

# ── Audio files ───────────────────────────────────────────────────────────────
print(f"\n[3] Audio files")
audio_dir = REPO_ROOT / "assets" / "audio"
if audio_dir.exists():
    wavs = sorted(audio_dir.glob("*.wav"))
    ok(f"audio dir found — {len(wavs)} wav(s)")
    for w in wavs:
        ok(f"  {w.name}  ({w.stat().st_size // 1024} KB)")
else:
    err(f"audio dir not found: {audio_dir}")

for label, name in [
    ("FIRE seq 1", "hazel_startup.wav"),
    ("FIRE seq 2", "muscle_car_power_up.wav"),
    ("KILL seq 1", "hazel_kill.wav"),
    ("KILL seq 2", "end_tone.wav"),
]:
    p = audio_dir / name
    if p.exists(): ok(f"{label}: {name}")
    else:          err(f"{label}: {name}  ← MISSING")

# ── Imports ───────────────────────────────────────────────────────────────────
print(f"\n[4] Python imports")
imports = [
    ("PyQt6.QtWidgets", "PyQt6"),
    ("flask",           "flask"),
    ("flask_cors",      "flask-cors"),
    ("flask_socketio",  "flask-socketio"),
    ("sounddevice",     "sounddevice"),
    ("soundfile",       "soundfile"),
    ("numpy",           "numpy"),
]
for mod, pkg in imports:
    try:
        __import__(mod)
        ok(f"{mod}")
    except ImportError:
        err(f"{mod}  ← pip install {pkg}")
    except Exception as e:
        warn(f"{mod}  ← {e}")

# winpty (optional)
try:
    import winpty
    ok("winpty (optional — terminal feature)")
except ImportError:
    warn("winpty not installed — terminal in control panel won't work")
    warn("      fix: pip install pywinpty")

# ── Port 5000 ─────────────────────────────────────────────────────────────────
print(f"\n[5] Port 5000")
try:
    import urllib.request
    urllib.request.urlopen("http://localhost:5000/ping", timeout=1)
    ok("localhost:5000 is RESPONDING (server already running)")
except Exception:
    ok("localhost:5000 not responding (server not running — expected)")

# ── bat file contents ─────────────────────────────────────────────────────────
print(f"\n[6] Bat file contents")
for bat in [REPO_ROOT/"bat"/"run_helix.bat", REPO_ROOT/"bat"/"kill_helix.bat"]:
    if bat.exists():
        ok(f"{bat.name}:")
        for line in bat.read_text(encoding="utf-8", errors="replace").splitlines():
            print(f"         {line}")
    else:
        err(f"{bat.name} not found")

# ── helix_server.py ROOT check ────────────────────────────────────────────────
print(f"\n[7] helix_server.py ROOT check")
srv = SCRIPT_DIR / "helix_server.py"
if srv.exists():
    txt = srv.read_text(encoding="utf-8", errors="replace")
    if "SCRIPT_DIR.parent.parent" in txt or "parent.parent" in txt:
        ok("ROOT points to REPO_ROOT (correct)")
    elif "Path(__file__).parent\n" in txt or "= Path(__file__).parent\r" in txt:
        err("ROOT = Path(__file__).parent  ← WRONG (points to py_progs, not _HELIX_)")
        err("      Fix: ROOT = Path(__file__).parent.parent.parent")
    else:
        warn("ROOT definition not recognised — check manually")
else:
    err("helix_server.py not found")

# ── crash logs ────────────────────────────────────────────────────────────────
print(f"\n[8] Crash logs")
for logname in ["helix_launcher.log", "helix_fault.log"]:
    lp = REPO_ROOT / "data" / logname
    if lp.exists() and lp.stat().st_size > 0:
        warn(f"{logname} exists ({lp.stat().st_size} bytes) — last 20 lines:")
        lines = lp.read_text(encoding="utf-8", errors="replace").splitlines()
        for line in lines[-20:]:
            print(f"    {line}")
    else:
        ok(f"{logname} — empty or not yet created")

print(f"\n{SEP}")
print("  Done. Copy everything above and paste it into the chat.")
print(SEP)
