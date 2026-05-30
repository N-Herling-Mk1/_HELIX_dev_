"""
HELIX Tray Launcher — helix_start_server.py  (arc-button mk2)
Lives in: _HELIX_/assets/py_progs/
"""
import sys, os, subprocess, webbrowser, math, traceback, time, logging, threading
from pathlib import Path

try:
    from PyQt6.QtWidgets import (
        QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
        QLabel, QSystemTrayIcon, QMenu, QPushButton, QMessageBox
    )
    from PyQt6.QtCore  import Qt, QThread, pyqtSignal, QTimer, QRectF, QPointF, QEvent
    from PyQt6.QtGui   import (
        QColor, QFont, QIcon, QPixmap, QPainter, QPen, QBrush,
        QAction, QLinearGradient, QPolygonF
    )
except ImportError as e:
    try:
        import tkinter, tkinter.messagebox
        tkinter.Tk().withdraw()
        tkinter.messagebox.showerror("HELIX", f"pip install pyqt6\n{e}")
    except Exception: pass
    print(f"pip install pyqt6\n{e}"); sys.exit(1)

# ── paths ─────────────────────────────────────────────────────────────────────
try:
    ROOT      = Path(__file__).parent       # …/assets/py_progs
    REPO_ROOT = ROOT.parent.parent          # …/_HELIX_
except Exception:
    ROOT = REPO_ROOT = Path.cwd()

ASSETS    = REPO_ROOT / "assets"
IMG       = ASSETS    / "img"
AUDIO_DIR = ASSETS    / "audio"
BAT_FILE      = REPO_ROOT / "bat" / "run_helix.bat"
KILL_BAT_FILE = REPO_ROOT / "bat" / "kill_helix.bat"
ARES_CUBE     = ROOT  / "ares_cube.py"

CTRL_URL  = "http://localhost:5000/control"
PING_URL  = "http://localhost:5000/ping"
PORT      = 5000

# ── audio sequences ───────────────────────────────────────────────────────────
AUDIO_WAIT = True

FIRE_SEQUENCE = [
    AUDIO_DIR / "hazel_startup.wav",
    AUDIO_DIR / "muscle_car_power_up.wav",
]
KILL_SEQUENCE = [
    AUDIO_DIR / "hazel_kill.wav",
    AUDIO_DIR / "end_tone.wav",
]

# ── logging ───────────────────────────────────────────────────────────────────
LOG_FILE = REPO_ROOT / "data" / "helix_launcher.log"

def _setup_log():
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    from logging.handlers import RotatingFileHandler
    fmt = logging.Formatter(
        fmt="%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S")
    fh = RotatingFileHandler(str(LOG_FILE), maxBytes=100_000, backupCount=5, encoding="utf-8")
    fh.setFormatter(fmt)
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    root = logging.getLogger()
    root.setLevel(logging.DEBUG)
    root.addHandler(fh)
    root.addHandler(sh)

def log(msg, level="info"):
    try:    getattr(logging, level)(msg)
    except: print(msg)

def log_exc(ctx=""):
    try:    logging.error(f"{ctx}\n{traceback.format_exc()}" if ctx else traceback.format_exc())
    except: print(traceback.format_exc())

_setup_log()
log(f"--- HELIX launcher started  ROOT={ROOT}  REPO={REPO_ROOT} ---")

import faulthandler as _fh
_FAULT_LOG = REPO_ROOT / "data" / "helix_fault.log"
try:
    _FAULT_LOG.parent.mkdir(parents=True, exist_ok=True)
    _fh.enable(file=open(str(_FAULT_LOG), "w"), all_threads=True)
    log(f"[diag] faulthandler → {_FAULT_LOG}")
except Exception as _e:
    log(f"[diag] faulthandler setup failed: {_e}", "warning")

# ── global crash hooks ────────────────────────────────────────────────────────
def _excepthook(exc_type, exc_value, exc_tb):
    msg = "".join(traceback.format_exception(exc_type, exc_value, exc_tb))
    log(f"[CRASH] main thread:\n{msg}", "critical")
    try:
        if QApplication.instance():
            QMessageBox.critical(None, "HELIX Crash", msg[:2000])
    except: pass

def _thread_excepthook(args):
    msg = "".join(traceback.format_exception(
        args.exc_type, args.exc_value, args.exc_traceback))
    log(f"[CRASH] thread ({args.thread}):\n{msg}", "critical")

sys.excepthook          = _excepthook
threading.excepthook    = _thread_excepthook

# ── Windows flag helper ───────────────────────────────────────────────────────
WIN_HIDE = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0

# ═════════════════════════════════════════════════════════════════════════════
#  PID REGISTRY
# ═════════════════════════════════════════════════════════════════════════════

import json as _json
import signal as _signal

_PID_FILE = REPO_ROOT / "data" / "helix_pids.json"

class PidRegistry:
    _pids: dict

    def __init__(self):
        self._pids = {}
        self._load()
        self._kill_orphans()

    def _load(self):
        try:
            if _PID_FILE.exists():
                self._pids = _json.loads(_PID_FILE.read_text(encoding="utf-8"))
                log(f"[pids] loaded {len(self._pids)} PID(s) from disk")
        except Exception:
            self._pids = {}

    def _save(self):
        try:
            _PID_FILE.parent.mkdir(parents=True, exist_ok=True)
            _PID_FILE.write_text(_json.dumps(self._pids, indent=2), encoding="utf-8")
        except Exception:
            log_exc("[pids] save failed")

    def _kill_orphans(self):
        if not self._pids:
            return
        log(f"[pids] killing {len(self._pids)} orphaned PID(s) from previous session")
        for pid_str, label in list(self._pids.items()):
            self._kill_pid(int(pid_str), label)
        self._pids.clear()
        self._save()

    def _kill_pid(self, pid: int, label: str = ""):
        try:
            import psutil
            p = psutil.Process(pid)
            p.terminate()
            p.wait(timeout=3)
            log(f"[pids] terminated PID={pid} ({label})")
        except Exception:
            try:
                if sys.platform == "win32":
                    subprocess.run(
                        ["taskkill", "/PID", str(pid), "/F"],
                        capture_output=True, creationflags=WIN_HIDE)
                else:
                    os.kill(pid, _signal.SIGTERM)
                log(f"[pids] taskkill PID={pid} ({label})")
            except Exception:
                log(f"[pids] could not kill PID={pid} ({label}) — may already be gone")

    def register(self, proc: subprocess.Popen, label: str = "") -> subprocess.Popen:
        self._pids[str(proc.pid)] = label
        self._save()
        log(f"[pids] registered PID={proc.pid} ({label})")
        return proc

    def release(self, proc: subprocess.Popen):
        key = str(proc.pid)
        if key in self._pids:
            del self._pids[key]
            self._save()
            log(f"[pids] released PID={proc.pid}")

    def kill_all(self):
        log(f"[pids] kill_all — {len(self._pids)} PID(s)")
        for pid_str, label in list(self._pids.items()):
            self._kill_pid(int(pid_str), label)
        self._pids.clear()
        self._save()

_pid_registry: PidRegistry | None = None

def get_registry() -> PidRegistry:
    global _pid_registry
    if _pid_registry is None:
        _pid_registry = PidRegistry()
    return _pid_registry

# ═════════════════════════════════════════════════════════════════════════════
#  AUDIO SEQUENCE THREAD
# ═════════════════════════════════════════════════════════════════════════════

class AudioSequenceThread(QThread):
    done = pyqtSignal()

    def __init__(self, files, parent=None):
        super().__init__(parent)
        self._files = [Path(f) for f in files]

    def run(self):
        log(f"[audio] sequence start  wait={AUDIO_WAIT}  n={len(self._files)}")
        try:
            for i, wav in enumerate(self._files):
                log(f"[audio] [{i+1}/{len(self._files)}] {wav.name}")
                if not ARES_CUBE.exists():
                    log(f"[audio] ares_cube.py not found: {ARES_CUBE}", "error"); continue
                if not wav.exists():
                    log(f"[audio] wav not found: {wav}", "warning"); continue
                try:
                    proc = subprocess.Popen(
                        [sys.executable, str(ARES_CUBE), str(wav)],
                        cwd=str(ROOT), env=os.environ.copy()
                    )
                    get_registry().register(proc, f"ares_cube:{wav.name}")
                    log(f"[audio] PID={proc.pid} spawned")
                    if AUDIO_WAIT:
                        try:
                            proc.wait(timeout=120)
                            log(f"[audio] PID={proc.pid} exited rc={proc.returncode}")
                        except subprocess.TimeoutExpired:
                            log(f"[audio] PID={proc.pid} timeout, killing", "warning")
                            proc.kill()
                        get_registry().release(proc)
                        if i < len(self._files) - 1:
                            time.sleep(0.4)
                    else:
                        if i < len(self._files) - 1:
                            time.sleep(3.0)
                except Exception:
                    log_exc(f"[audio] spawn {wav.name}")
        except Exception:
            log_exc("[audio] run crashed")
        log("[audio] sequence done")
        self.done.emit()

def run_audio_sequence(files):
    t = AudioSequenceThread(files)
    t.finished.connect(t.deleteLater)
    t.done.connect(lambda: log("[audio] thread cleaned up"))
    t.start()
    return t

# ═════════════════════════════════════════════════════════════════════════════
#  BAT THREAD
# ═════════════════════════════════════════════════════════════════════════════

class BatThread(QThread):
    log_line  = pyqtSignal(str)
    finished_ = pyqtSignal(bool)

    def run(self):
        try:
            log(f"[bat] launching {BAT_FILE}")
            subprocess.Popen(
                ["cmd.exe", "/c", str(BAT_FILE)],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                cwd=str(REPO_ROOT), creationflags=WIN_HIDE
            )
            self.log_line.emit("[SYS] waiting for :5000 ...")
            alive = self._ping(retries=30, delay=0.7)
            msg = "[OK] server live." if alive else "[ERR] timed out on :5000"
            self.log_line.emit(msg); log(f"[bat] {msg}")
            self.finished_.emit(alive)
        except Exception:
            log_exc("[bat] BatThread crashed")
            self.log_line.emit("[ERR] see helix_launcher.log")
            self.finished_.emit(False)

    def _ping(self, retries=30, delay=0.7):
        import urllib.request
        for _ in range(retries):
            try:
                urllib.request.urlopen(PING_URL, timeout=1); return True
            except Exception:
                time.sleep(delay)
        return False

# ═════════════════════════════════════════════════════════════════════════════
#  PING THREAD
# ═════════════════════════════════════════════════════════════════════════════

class PingThread(QThread):
    up   = pyqtSignal()
    down = pyqtSignal()

    def __init__(self, url, once=True, interval=5.0, parent=None):
        super().__init__(parent)
        self._url      = url
        self._once     = once
        self._interval = interval
        self._active   = True

    def stop(self):
        self._active = False

    def run(self):
        import urllib.request
        try:
            while self._active:
                try:
                    urllib.request.urlopen(self._url, timeout=2)
                    if self._active: self.up.emit()
                except Exception:
                    if self._active: self.down.emit()
                if self._once or not self._active:
                    break
                steps = max(1, int(self._interval * 10))
                for _ in range(steps):
                    if not self._active: break
                    time.sleep(0.1)
        except Exception:
            log_exc("[ping] thread crashed")

# ═════════════════════════════════════════════════════════════════════════════
#  COLOURS + CONSTANTS
# ═════════════════════════════════════════════════════════════════════════════

C = {
    "bg":"#020c14", "bg2":"#060f1a", "border2":"#1a3a55", "dim":"#1e4060",
    "text":"#c8dce8", "text2":"#4a6880",
    "cyan":"#00e5ff", "ok":"#00ff41", "err":"#ff2255", "warn":"#ff6a00",
}

INFO_LINES = [
    ("WHAT IS THIS?",                 "cyan"),
    ("HELIX Backend Helper launches", "text"),
    ("your local Flask server and",   "text"),
    ("opens the control panel in",    "text"),
    ("your browser.",                 "text"),
    ("", "text"),
    ("STEP 1", "ok"),   ("Click  FIRE IT UP.", "text"),
    ("", "text"),
    ("STEP 2", "ok"),   ("Server starts automatically.", "text"),
    ("", "text"),
    ("STEP 3", "ok"),   ("Click OPEN to launch the", "text"),
    ("control panel in your browser.", "text"),
    ("", "text"),
    ("STEP 4", "ok"),   ("Click button again to KILL.", "text"),
    ("", "text"),
    ("TRAY ICON", "warn"), ("X closes to tray.", "text"),
    ("Right-click tray icon to quit.","text"),
]

# ═════════════════════════════════════════════════════════════════════════════
#  ICON FACTORY
# ═════════════════════════════════════════════════════════════════════════════

def make_icon(active=False):
    try:
        ico = IMG / "helix_64.ico"
        if ico.exists(): return QIcon(str(ico))
    except Exception: pass
    try:
        px  = QPixmap(32, 32); px.fill(Qt.GlobalColor.transparent)
        p   = QPainter(px); p.setRenderHint(QPainter.RenderHint.Antialiasing)
        col = QColor(C["ok"] if active else C["cyan"])
        p.setPen(QPen(col, 1.5)); p.setBrush(QBrush(Qt.GlobalColor.transparent))
        pts = [QPointF(16 + 13*math.cos(math.radians(60*i-30)),
                       16 + 13*math.sin(math.radians(60*i-30))) for i in range(6)]
        p.drawPolygon(QPolygonF(pts))
        p.setPen(QPen(col, 2))
        p.drawLine(11,10,11,22); p.drawLine(21,10,21,22); p.drawLine(11,16,21,16)
        p.end(); return QIcon(px)
    except Exception: return QIcon()

# ═════════════════════════════════════════════════════════════════════════════
#  STATUS DOT  — state-aware colours
# ═════════════════════════════════════════════════════════════════════════════

class StatusDot(QWidget):
    _STATE_COLS = {
        "off":      "#661525",
        "starting": "#ff6a00",
        "live":     "#00ff41",
        "killing":  "#ff2255",
    }

    def __init__(self, parent=None):
        super().__init__(parent)
        self._state = "off"
        self._ph    = 0.0
        self.setFixedSize(12, 12)
        t = QTimer(self); t.timeout.connect(self._tick); t.start(50)

    def set_state(self, s: str):
        self._state = s; self.update()

    def set_live(self, v: bool):          # backward-compat shim
        self.set_state("live" if v else "off")

    def _tick(self):
        self._ph = (self._ph + 0.08) % (2*math.pi); self.update()

    def paintEvent(self, _):
        try:
            p = QPainter(self); p.setRenderHint(QPainter.RenderHint.Antialiasing)
            col  = QColor(self._STATE_COLS.get(self._state, C["err"]))
            pulm = 0.5 + 0.5*math.sin(self._ph)
            g = QColor(col); g.setAlphaF(0.25 * pulm)
            p.setPen(Qt.PenStyle.NoPen); p.setBrush(QBrush(g))
            p.drawEllipse(0, 0, 12, 12)
            g2 = QColor(col); g2.setAlphaF(0.55 + 0.45*pulm)
            p.setBrush(QBrush(g2)); p.drawEllipse(2, 2, 8, 8)
            p.end()
        except Exception: pass

# ═════════════════════════════════════════════════════════════════════════════
#  POWER BUTTON  — two-arc, 4-state animated button
# ═════════════════════════════════════════════════════════════════════════════

class PowerButton(QPushButton):
    """
    Single animated power button.
    States: "off" | "starting" | "live" | "killing"
    Click is suppressed during transitional states (starting / killing).
    """

    _STATE = {
        "off":     {"col":(145,16,36),  "sym":(165,20,44),  "glow":0.26,"spd":0.18,"symA":0.36,"pulse":True },
        "starting":{"col":(255,108,0),  "sym":(255,148,20), "glow":0.88,"spd":2.60,"symA":0.78,"pulse":False},
        "live":    {"col":(0,229,255),  "sym":(0,255,65),   "glow":1.05,"spd":0.92,"symA":0.94,"pulse":False},
        "killing": {"col":(255,26,75),  "sym":(255,26,75),  "glow":1.18,"spd":3.10,"symA":0.88,"pulse":False},
    }
    _STABLE = {"off", "live"}

    def __init__(self, parent=None):
        super().__init__(parent)
        self._state      = "off"
        self._hover      = False
        self._hoverT     = 0.0
        self._pulseA     = 0.0
        self._clickFlash = 0.0
        self._rippleR    = 0.0
        self._rippleA    = 0.0

        d = self._STATE["off"]
        self._aC  = list(map(float, d["col"]))
        self._aSC = list(map(float, d["sym"]))
        self._aG  = float(d["glow"])
        self._aSpd= float(d["spd"])
        self._aA  = float(d["symA"])

        # outer arc: r=44, 82% coverage, 14 ticks
        # inner arc: r=34, 22% coverage  (short dash)
        self._arcs = [
            {"r":44.0,"lw":1.1, "spd":0.0055,"dir": 1,"cov":0.82,"ticks":14,"tl":5.0,"ph":0.00},
            {"r":34.0,"lw":0.85,"spd":0.0130,"dir":-1,"cov":0.22,"ticks": 0,"tl":0.0,"ph":1.45},
        ]

        self.setFixedSize(158, 158)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setFlat(True)
        self.setStyleSheet("background:transparent;border:none;")
        self.setAttribute(Qt.WidgetAttribute.WA_Hover, True)

        self._timer = QTimer(self)
        self._timer.timeout.connect(self._tick)
        self._timer.start(28)       # ~36 fps

    # ── public API ────────────────────────────────────────────────────────────
    def set_state(self, s: str):
        self._state = s
        if s in self._STABLE:
            self.setCursor(Qt.CursorShape.PointingHandCursor)
        else:
            self.setCursor(Qt.CursorShape.ForbiddenCursor)
        self.update()

    # ── animation tick ────────────────────────────────────────────────────────
    def _tick(self):
        d = self._STATE[self._state]
        r = 0.048

        def _lv(a, b): return a + (b-a)*r
        def _li(a, b): return [a[i]+(b[i]-a[i])*r for i in range(3)]

        self._aC   = _li(self._aC,  list(map(float, d["col"])))
        self._aSC  = _li(self._aSC, list(map(float, d["sym"])))
        self._aG   = _lv(self._aG,  d["glow"])
        self._aSpd = _lv(self._aSpd, d["spd"])
        self._aA   = _lv(self._aA,  d["symA"])

        self._hoverT     += 0.09 if self._hover else -0.09
        self._hoverT      = max(0.0, min(1.0, self._hoverT))
        self._clickFlash  = max(0.0, self._clickFlash - 0.065)
        self._pulseA     += 0.020 if d["pulse"] else 0.038

        if self._rippleA > 0:
            self._rippleR += 2.4
            self._rippleA  = max(0.0, self._rippleA - 0.030)

        spd = self._aSpd * (1.0 + self._hoverT * 1.65)
        for arc in self._arcs:
            arc["ph"] += arc["spd"] * arc["dir"] * spd

        self.update()

    # ── input ─────────────────────────────────────────────────────────────────
    def event(self, e):
        if e.type() == QEvent.Type.HoverEnter:  self._hover = True;  self.update()
        if e.type() == QEvent.Type.HoverLeave:  self._hover = False; self.update()
        return super().event(e)

    def mousePressEvent(self, e):
        if self._state not in self._STABLE:
            return                          # swallow click during transitions
        self._clickFlash = 1.0
        self._rippleR    = 0.0
        self._rippleA    = 0.75
        super().mousePressEvent(e)

    def mouseReleaseEvent(self, e):
        if self._state not in self._STABLE:
            return
        super().mouseReleaseEvent(e)

    # ── paint ─────────────────────────────────────────────────────────────────
    def paintEvent(self, _):
        try:
            p = QPainter(self)
            p.setRenderHint(QPainter.RenderHint.Antialiasing)
            w, h = self.width(), self.height()
            cx, cy = w / 2.0, h / 2.0

            d          = self._STATE[self._state]
            rc         = self._aC
            sc         = self._aSC
            gw         = self._aG
            sA         = self._aA
            hoverT     = self._hoverT
            clickFlash = self._clickFlash
            pulseA     = self._pulseA
            rippleR    = self._rippleR
            rippleA    = self._rippleA

            def qc(rgb, a):
                c = QColor(int(rgb[0]), int(rgb[1]), int(rgb[2]))
                c.setAlphaF(max(0.0, min(1.0, float(a))))
                return c

            # ── ambient glow ──────────────────────────────────────────────
            gs = gw * (0.85 + hoverT*0.65 + clickFlash*0.45)
            p.setPen(Qt.PenStyle.NoPen)
            for r_g, da in [(50, 0.012), (45, 0.024), (40, 0.044)]:
                p.setBrush(QBrush(qc(rc, da*gs)))
                p.drawEllipse(QPointF(cx, cy), float(r_g), float(r_g))

            # ── two arcs ──────────────────────────────────────────────────
            for i, arc in enumerate(self._arcs):
                r   = arc["r"]; lw  = arc["lw"]
                ph  = arc["ph"]; cov = arc["cov"]
                ticks = arc["ticks"]; tl = arc["tl"]
                outer = (i == 0)

                if outer and d["pulse"]:
                    arcA = 0.16 + 0.24*(0.5 + 0.5*math.sin(pulseA))
                else:
                    arcA = 0.42 + hoverT*0.38 + gw*0.14 + clickFlash*0.18
                if i == 1:
                    arcA -= 0.07

                line_w = lw + hoverT*0.30 + clickFlash*0.25

                pen = QPen(qc(rc, arcA))
                pen.setWidthF(line_w)
                pen.setCapStyle(Qt.PenCapStyle.RoundCap)
                p.setPen(pen)
                p.setBrush(Qt.BrushStyle.NoBrush)

                # Convert canvas-style arc (0=right, CW) to Qt (0=right, CCW, 1/16°)
                start_qt = int(-math.degrees(ph) * 16)
                span_qt  = int(-cov * 360.0 * 16)
                rect = QRectF(cx - r, cy - r, r*2, r*2)
                p.drawArc(rect, start_qt, span_qt)

                # End-cap dots on partial arcs
                if cov < 0.98:
                    dot_r = line_w * 0.75
                    p.setPen(Qt.PenStyle.NoPen)
                    p.setBrush(QBrush(qc(rc, arcA)))
                    for angle in [ph, ph + cov * math.tau]:
                        p.drawEllipse(
                            QPointF(cx + r*math.cos(angle), cy + r*math.sin(angle)),
                            dot_r, dot_r)

                # Tick marks (outer arc only)
                if ticks > 0:
                    if outer and d["pulse"]:
                        tA = 0.09 + 0.07*(0.5 + 0.5*math.sin(pulseA))
                    else:
                        tA = 0.22 + hoverT*0.16
                    tp = QPen(qc(rc, tA)); tp.setWidthF(0.75)
                    p.setPen(tp)
                    for t in range(ticks):
                        ta = ph + (math.tau / ticks) * t
                        co = math.cos(ta); si = math.sin(ta)
                        p.drawLine(
                            QPointF(cx + (r - tl/2)*co, cy + (r - tl/2)*si),
                            QPointF(cx + (r + tl/2)*co, cy + (r + tl/2)*si))

            # ── click ripple ──────────────────────────────────────────────
            if rippleA > 0.01:
                rp = QPen(qc(rc, rippleA)); rp.setWidthF(1.1)
                p.setPen(rp); p.setBrush(Qt.BrushStyle.NoBrush)
                p.drawEllipse(QPointF(cx, cy), rippleR, rippleR)

            # ── power symbol ──────────────────────────────────────────────
            sym_r  = 19.0
            sym_lw = 3.2
            gap    = math.pi * 0.195           # gap half-width in radians
            gap_d  = math.degrees(gap)

            sym_rect = QRectF(cx - sym_r, cy - sym_r, sym_r*2, sym_r*2)
            sym_start_qt = int((90.0 + gap_d) * 16)
            sym_span_qt  = int((360.0 - 2.0*gap_d) * 16)

            # Soft glow behind symbol — concentric passes
            for extra, ga in [(8, 0.15), (4, 0.22)]:
                gpen = QPen(qc(sc, (sA*0.18*gw + hoverT*0.05) * ga))
                gpen.setWidthF(sym_lw + extra)
                gpen.setCapStyle(Qt.PenCapStyle.RoundCap)
                p.setPen(gpen); p.setBrush(Qt.BrushStyle.NoBrush)
                p.drawArc(sym_rect, sym_start_qt, sym_span_qt)

            # Symbol arc
            sAlpha = sA + hoverT*0.05 + clickFlash*0.08
            sp = QPen(qc(sc, sAlpha)); sp.setWidthF(sym_lw)
            sp.setCapStyle(Qt.PenCapStyle.RoundCap)
            p.setPen(sp); p.setBrush(Qt.BrushStyle.NoBrush)
            p.drawArc(sym_rect, sym_start_qt, sym_span_qt)

            # Vertical stem
            p.drawLine(
                QPointF(cx, cy - sym_r*0.30),
                QPointF(cx, cy - sym_r - sym_lw*0.25))

            # ── crosshair ─────────────────────────────────────────────────
            xp = QPen(qc(rc, 0.28 + hoverT*0.16 + gw*0.08)); xp.setWidthF(0.8)
            p.setPen(xp)
            for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
                p.drawLine(QPointF(cx+dx*4,  cy+dy*4),
                           QPointF(cx+dx*10, cy+dy*10))

            # ── center dot ────────────────────────────────────────────────
            p.setPen(Qt.PenStyle.NoPen)
            p.setBrush(QBrush(qc(sc, sA*0.85 + hoverT*0.10)))
            p.drawEllipse(QPointF(cx, cy), 2.0, 2.0)

            p.end()
        except Exception:
            log_exc("[PowerButton] paintEvent")

# ═════════════════════════════════════════════════════════════════════════════
#  MAIN WINDOW
# ═════════════════════════════════════════════════════════════════════════════

# Banner images per launcher state
_BANNER_IMAGES = {
    "off":      "soc_media_tag.png",
    "starting": "fire_up_process.png",
    "live":     "soc_media_tag.png",
    "killing":  "kill_process.png",
}

# Status label text per launcher state
_STATE_LABELS = {
    "off":     ("OFFLINE",    C["err"]),
    "starting":("STARTING...",C["warn"]),
    "live":    ("LIVE",       C["ok"]),
    "killing": ("KILLING...", C["err"]),
}

class HelixLauncher(QMainWindow):

    def __init__(self):
        super().__init__()
        self._running      = False
        self._tray         = None
        self._bat_thread   = None
        self._audio_thread = None
        self._poll_worker  = None

        try:
            self.setWindowTitle("H·E·L·I·X  Backend")
            self.setFixedSize(660, 540)
            self.setWindowFlags(Qt.WindowType.Window | Qt.WindowType.WindowCloseButtonHint)
            self.setStyleSheet(f"QMainWindow{{background:{C['bg']};}} QWidget{{background:transparent;}}")
            ico = IMG / "helix_64.ico"
            if ico.exists(): self.setWindowIcon(QIcon(str(ico)))
        except Exception: log_exc("[init] window setup")

        try:    self._build_ui()
        except: log_exc("[init] _build_ui")
        try:    self._build_tray()
        except: log_exc("[init] _build_tray")

        QTimer.singleShot(600, self._startup_check)

    # ── background paint ──────────────────────────────────────────────────────
    def paintEvent(self, _):
        try:
            p = QPainter(self); p.setRenderHint(QPainter.RenderHint.Antialiasing)
            w, h = self.width(), self.height()
            grad = QLinearGradient(0,0,0,h)
            grad.setColorAt(0, QColor(C["bg"])); grad.setColorAt(1, QColor("#010810"))
            p.fillRect(0,0,w,h,grad)
            dc = QColor(C["cyan"]); dc.setAlphaF(.03); p.setPen(QPen(dc,1.5))
            for gx in range(0,w,30):
                for gy in range(0,h,30): p.drawPoint(gx,gy)
            cc = QColor(C["cyan"]); cc.setAlphaF(.18); p.setPen(QPen(cc,1)); s=22
            for x,y,dx,dy in [(0,0,1,1),(w,0,-1,1),(0,h,1,-1),(w,h,-1,-1)]:
                p.drawLine(x,y+dy*7,x,y+dy*(s+7)); p.drawLine(x+dx*7,y,x+dx*(s+7),y)
            p.setPen(QPen(QColor(C["border2"]),1)); p.drawLine(320,20,320,h-20)
            bc = QColor(C["cyan"]); bc.setAlphaF(.08); p.fillRect(0,h-2,w,2,bc)
            p.end()
        except Exception: pass

    # ── UI layout ─────────────────────────────────────────────────────────────
    def _build_ui(self):
        root  = QWidget(); self.setCentralWidget(root)
        outer = QHBoxLayout(root); outer.setContentsMargins(0,0,0,0); outer.setSpacing(0)

        # ── LEFT PANEL ──────────────────────────────────────────────────────
        left = QVBoxLayout(); left.setContentsMargins(20,18,20,16); left.setSpacing(0)
        left.setAlignment(Qt.AlignmentFlag.AlignHCenter)

        # Banner image — swaps per state
        self._banner_lbl = QLabel()
        self._banner_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._banner_lbl.setFixedSize(280, 164)
        self._banner_lbl.setStyleSheet(
            f"font-family:'Orbitron';font-size:18px;font-weight:900;color:{C['cyan']};")
        left.addWidget(self._banner_lbl, 0, Qt.AlignmentFlag.AlignHCenter)
        left.addSpacing(8)

        # Status row: dot + label
        sr = QHBoxLayout(); sr.setContentsMargins(0,0,0,0); sr.setSpacing(6)
        self._dot = StatusDot()
        self._status_lbl = QLabel("CHECKING...")
        self._status_lbl.setStyleSheet(
            f"font-family:'Courier New';font-size:10px;letter-spacing:3px;color:{C['text2']};")
        sr.addStretch(); sr.addWidget(self._dot); sr.addSpacing(5)
        sr.addWidget(self._status_lbl); sr.addStretch()
        left.addLayout(sr)
        left.addSpacing(10)

        # Power button
        self._power_btn = PowerButton()
        if not BAT_FILE.exists():
            self._power_btn.set_state("off")
        self._power_btn.clicked.connect(self._on_power_click)
        left.addWidget(self._power_btn, 0, Qt.AlignmentFlag.AlignHCenter)
        left.addSpacing(6)

        # "OPEN CONTROL PANEL" link — only visible when LIVE
        self._open_lnk = QLabel("▶  OPEN CONTROL PANEL")
        self._open_lnk.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._open_lnk.setStyleSheet(
            f"font-family:'Courier New';font-size:9px;letter-spacing:2px;"
            f"color:{C['ok']};text-decoration:underline;")
        self._open_lnk.setCursor(Qt.CursorShape.PointingHandCursor)
        self._open_lnk.mousePressEvent = lambda _: self._open_control()
        self._open_lnk.setVisible(False)
        left.addWidget(self._open_lnk, 0, Qt.AlignmentFlag.AlignHCenter)
        left.addSpacing(6)

        # Version — 3 lines, centered both axes
        ver = QLabel("v2.1\nN.HERLING\nUA ATLAS")
        ver.setStyleSheet(
            f"font-family:'Courier New';font-size:13px;letter-spacing:2px;color:#ffffff;")
        ver.setAlignment(Qt.AlignmentFlag.AlignHCenter | Qt.AlignmentFlag.AlignVCenter)
        ver.setFixedHeight(56)
        left.addWidget(ver)
        left.addStretch()

        lw = QWidget(); lw.setFixedWidth(320); lw.setLayout(left)
        outer.addWidget(lw)

        # ── RIGHT PANEL ─────────────────────────────────────────────────────
        right = QVBoxLayout(); right.setContentsMargins(20,20,16,16); right.setSpacing(3)
        hdr = QLabel("HOW  IT  WORKS")
        hdr.setStyleSheet(
            f"font-family:'Orbitron';font-size:10px;font-weight:700;"
            f"letter-spacing:4px;color:{C['cyan']};margin-bottom:6px;")
        right.addWidget(hdr); right.addSpacing(4)
        for text, ck in INFO_LINES:
            lbl = QLabel(text)
            lbl.setStyleSheet(
                f"font-family:'Courier New';font-size:11px;"
                f"letter-spacing:{'3px' if ck in ('cyan','ok','warn') else '1px'};"
                f"color:{C.get(ck, C['text'])};")
            right.addWidget(lbl)
        right.addStretch()
        rw = QWidget(); rw.setLayout(right); outer.addWidget(rw, 1)

        # Load initial banner (off state)
        self._update_banner("off")

    # ── banner helpers ────────────────────────────────────────────────────────
    def _update_banner(self, state: str):
        """Swap banner image based on launcher state."""
        img_name = _BANNER_IMAGES.get(state, "soc_media_tag.png")
        path = IMG / img_name
        try:
            if path.exists():
                px = QPixmap(str(path))
                if not px.isNull():
                    px = px.scaled(280, 164,
                                   Qt.AspectRatioMode.KeepAspectRatio,
                                   Qt.TransformationMode.SmoothTransformation)
                    self._banner_lbl.setPixmap(px)
                    self._banner_lbl.setText("")
                    return
        except Exception:
            log_exc("[banner] update failed")
        self._banner_lbl.setPixmap(QPixmap())
        self._banner_lbl.setText("H·E·L·I·X")

    # ── central state applier ─────────────────────────────────────────────────
    def _apply_state(self, state: str, override_text: str = ""):
        """Update power button, dot, banner, status label, and tray icon atomically."""
        try:
            label, col = _STATE_LABELS.get(state, ("OFFLINE", C["err"]))
            text = override_text or label
            live = (state == "live")

            self._power_btn.set_state(state)
            self._dot.set_state(state)
            self._update_banner(state)
            self._status_lbl.setStyleSheet(
                f"font-family:'Courier New';font-size:10px;letter-spacing:3px;color:{col};")
            self._status_lbl.setText(text)
            self._open_lnk.setVisible(live)
            if self._tray:
                self._tray.setIcon(make_icon(live))
        except Exception:
            log_exc("[apply_state]")

    # ── tray ──────────────────────────────────────────────────────────────────
    def _build_tray(self):
        self._tray = QSystemTrayIcon(make_icon(False), self)
        self._tray.setToolTip("HELIX Backend")
        menu = QMenu()
        for lbl, fn in [("Show", self.show), (None, None),
                        ("Open Control Panel", self._open_control),
                        (None, None), ("Quit", self._quit)]:
            if lbl is None: menu.addSeparator()
            else:
                a = QAction(lbl, self); a.triggered.connect(fn); menu.addAction(a)
        self._tray.setContextMenu(menu)
        self._tray.activated.connect(
            lambda r: self.show() if r == QSystemTrayIcon.ActivationReason.DoubleClick else None)
        self._tray.show()

    # ── startup state check ───────────────────────────────────────────────────
    def _startup_check(self):
        self._apply_state("off", "CHECKING...")
        w = PingThread(PING_URL, once=True, parent=self)
        w.finished.connect(w.deleteLater)
        w.up.connect(lambda: self._go_live("ALREADY LIVE"))
        w.down.connect(lambda: self._apply_state("off", "OFFLINE"))
        w.start()

    # ── go live ───────────────────────────────────────────────────────────────
    def _go_live(self, msg="LIVE"):
        try:
            if self._running: return
            self._running = True
            self._apply_state("live", msg)
            self._start_poll()
        except Exception:
            log_exc("[go_live]")

    # ── poll ──────────────────────────────────────────────────────────────────
    def _start_poll(self):
        try:
            if self._poll_worker is not None:
                self._poll_worker.stop()
                self._poll_worker = None
            w = PingThread(PING_URL, once=False, interval=5.0, parent=self)
            w.finished.connect(w.deleteLater)
            w.up.connect(self._on_ping_up)
            w.down.connect(self._on_ping_down)
            w.start()
            self._poll_worker = w
        except Exception:
            log_exc("[start_poll]")

    def _on_ping_up(self):
        if not self._running:
            self._go_live()

    def _on_ping_down(self):
        try:
            if not self._running: return
            self._running = False
            self._apply_state("off", "SERVER STOPPED")
            if self._poll_worker:
                self._poll_worker.stop()
                self._poll_worker = None
        except Exception:
            log_exc("[on_ping_down]")

    # ── power button click dispatch ───────────────────────────────────────────
    def _on_power_click(self):
        """Route click based on running state."""
        try:
            if self._running:
                self._kill_server()
            else:
                self._on_fire()
        except Exception:
            log_exc("[on_power_click]")

    # ── fire action ───────────────────────────────────────────────────────────
    def _on_fire(self):
        try:
            if self._running:
                self._open_control(); return
            if not BAT_FILE.exists():
                log(f"[fire] BAT not found: {BAT_FILE}", "error")
                self._apply_state("off", "BAT NOT FOUND"); return
            log("[fire] FIRE pressed")
            self._apply_state("starting", "STARTING...")
            # Snapshot existing console windows BEFORE spawning so we can
            # identify and move the new shell window afterwards.
            self._console_snapshot = self._get_console_hwnds()
            self._audio_thread = run_audio_sequence(FIRE_SEQUENCE)
            self._bat_thread = BatThread(self)
            self._bat_thread.finished.connect(self._bat_thread.deleteLater)
            self._bat_thread.log_line.connect(lambda l: log(l))
            self._bat_thread.finished_.connect(self._on_bat_finished)
            self._bat_thread.start()
            get_registry()
            # 1. Move new shell window to top-left (500ms — after it has appeared)
            # 2. Raise launcher above it (700ms — after the move)
            # ares_cube spawned first so it naturally stays on top of both.
            QTimer.singleShot(500, self._reposition_new_shell)
            QTimer.singleShot(700, self._raise_window)
        except Exception:
            log_exc("[on_fire]")

    # ── z-order / window position helpers ────────────────────────────────────
    def _get_console_hwnds(self) -> set:
        """Return HWNDs of all currently visible ConsoleWindowClass windows."""
        if sys.platform != "win32":
            return set()
        try:
            import ctypes, ctypes.wintypes
            hwnds: set = set()
            WNDENUMPROC = ctypes.WINFUNCTYPE(
                ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
            def _cb(hwnd, _):
                if ctypes.windll.user32.IsWindowVisible(hwnd):
                    buf = ctypes.create_unicode_buffer(256)
                    ctypes.windll.user32.GetClassNameW(hwnd, buf, 256)
                    if buf.value == "ConsoleWindowClass":
                        hwnds.add(hwnd)
                return True
            ctypes.windll.user32.EnumWindows(WNDENUMPROC(_cb), 0)
            log(f"[win] found {len(hwnds)} console window(s)")
            return hwnds
        except Exception:
            log_exc("[get_console_hwnds]")
            return set()

    def _reposition_new_shell(self):
        """Find console windows that appeared since the snapshot and move them
        to (0, 0) top-left — keeps the shell visible but out of our way."""
        if sys.platform != "win32":
            return
        try:
            import ctypes
            SWP_NOSIZE   = 0x0001
            SWP_NOZORDER = 0x0004
            current  = self._get_console_hwnds()
            snapshot = getattr(self, '_console_snapshot', set())
            new_hwnds = current - snapshot
            if new_hwnds:
                for hwnd in new_hwnds:
                    ctypes.windll.user32.SetWindowPos(
                        hwnd, None, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOZORDER)
                    log(f"[win] shell hwnd={hwnd} repositioned to (0,0)")
            else:
                log("[win] no new console windows found to reposition")
        except Exception:
            log_exc("[reposition_new_shell]")

    def _raise_window(self):
        try:
            # Move launcher to top-right of primary screen
            screen = QApplication.primaryScreen().geometry()
            self.move(screen.width() - self.width() - 10, 10)
            
            self.raise_()
            self.activateWindow()
            if sys.platform == "win32":
                import ctypes
                hwnd = int(self.winId())
                u32  = ctypes.windll.user32
                u32.SetForegroundWindow(hwnd)
                u32.BringWindowToTop(hwnd)
                log("[win] launcher moved to top-right and raised")
        except Exception:
            log_exc("[raise_window]")

    def _on_bat_finished(self, success):
        try:
            log(f"[bat] finished success={success}")
            if success:
                self._go_live("LIVE")
                QTimer.singleShot(1000, self._open_control)
            else:
                self._apply_state("off", "FAILED — check bat/log")
        except Exception:
            log_exc("[on_bat_finished]")

    # ── kill action ───────────────────────────────────────────────────────────
    def _kill_server(self):
        try:
            log("[kill] KILL pressed")
            # Set UI immediately — all blocking ops go to a daemon thread
            # so the killing banner actually renders before anything freezes.
            self._running = False
            if self._poll_worker:
                self._poll_worker.stop(); self._poll_worker = None
            self._apply_state("killing", "KILLING...")
            self._audio_thread = run_audio_sequence(KILL_SEQUENCE)

            def _do_kill():
                # 1. Kill all tracked subprocesses
                get_registry().kill_all()

                # 2. Graceful shutdown via API  (blocks up to 2s — keep off main thread)
                try:
                    import urllib.request
                    urllib.request.urlopen(
                        f"http://localhost:{PORT}/api/shutdown", timeout=2)
                    log("[kill] /api/shutdown OK")
                except Exception:
                    log("[kill] /api/shutdown no response")

                # 3. Kill by PID file
                _spid_file = REPO_ROOT / "data" / "server.pid"
                try:
                    if _spid_file.exists():
                        _spid = int(_spid_file.read_text().strip())
                        subprocess.run(["taskkill", "/PID", str(_spid), "/F"],
                                       capture_output=True, creationflags=WIN_HIDE)
                        _spid_file.unlink(missing_ok=True)
                        log(f"[kill] taskkill server PID={_spid}")
                except Exception: log_exc("[kill] PID file kill")

                # 4. Fallback: kill bat
                try:
                    if KILL_BAT_FILE.exists():
                        subprocess.Popen(["cmd.exe", "/c", str(KILL_BAT_FILE)],
                                         creationflags=WIN_HIDE, cwd=str(REPO_ROOT))
                        log("[kill] kill bat spawned")
                except Exception: log_exc("[kill] bat spawn")

            threading.Thread(target=_do_kill, daemon=True).start()

            # Let the killing animation breathe, then go offline
            QTimer.singleShot(1600, lambda: self._apply_state("off", "STOPPED"))

        except Exception:
            log_exc("[kill_server]")

    # ── open browser ──────────────────────────────────────────────────────────
    def _open_control(self):
        def _go():
            try:
                webbrowser.open(CTRL_URL, new=1); log(f"[browser] {CTRL_URL}")
            except Exception: log_exc("[browser]")
        threading.Thread(target=_go, daemon=True).start()

    # ── quit ──────────────────────────────────────────────────────────────────
    def _quit(self):
        try:
            get_registry().kill_all()
            if self._poll_worker: self._poll_worker.stop()
            if self._tray: self._tray.hide()
        except Exception: pass
        QApplication.quit()

    def closeEvent(self, e):
        e.ignore(); self.hide()
        if self._tray:
            self._tray.showMessage("HELIX", "Running in tray — right-click to quit.",
                                   QSystemTrayIcon.MessageIcon.Information, 2000)

# ═════════════════════════════════════════════════════════════════════════════
#  ENTRY
# ═════════════════════════════════════════════════════════════════════════════

def main():
    try:
        get_registry()
        log("--- Qt app starting ---")
        app = QApplication(sys.argv)
        app.setQuitOnLastWindowClosed(False)
        app.setApplicationName("HELIX")
        app.setWindowIcon(make_icon())
        win = HelixLauncher(); win.show()
        code = app.exec()
        log(f"--- Qt app exited code={code} ---")
        sys.exit(code)
    except Exception:
        log_exc("[main] fatal")
        try: QMessageBox.critical(None, "HELIX Fatal", traceback.format_exc()[:2000])
        except: pass
        sys.exit(1)

if __name__ == "__main__":
    main()
