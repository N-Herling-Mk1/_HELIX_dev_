"""
HELIX Tray Launcher — helix_start_server.py
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
# ares_cube auto-exits via QApplication.quit() after audio + fade, so
# AUDIO_WAIT=True (wait for each process to exit before starting the next)
# ensures PortAudio is fully released between files.
AUDIO_WAIT = True

FIRE_SEQUENCE = [
    AUDIO_DIR / "hazel_startup.wav",
    AUDIO_DIR / "muscle_car_power_up.wav",
]
KILL_SEQUENCE = [
    AUDIO_DIR / "hazel_kill.wav",
    AUDIO_DIR / "end_tone.wav",      # fallback: end_tone.wav exists; kill_it.wav does not
]

# ── logging ───────────────────────────────────────────────────────────────────
LOG_FILE = REPO_ROOT / "data" / "helix_launcher.log"

def _setup_log():
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    from logging.handlers import RotatingFileHandler
    fmt = logging.Formatter(
        fmt="%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S")
    # 5 files × 100 KB = 500 KB max on disk
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

# faulthandler: catches segfaults / access violations that Python can't catch
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
#  PID REGISTRY — track every spawned subprocess so orphans can be killed
# ═════════════════════════════════════════════════════════════════════════════

import json as _json
import signal as _signal

_PID_FILE = REPO_ROOT / "data" / "helix_pids.json"

class PidRegistry:
    """
    Writes spawned PIDs to disk immediately.
    On startup: kills any PIDs left over from a previous crashed session.
    On kill_all: terminates every tracked PID.
    """
    _pids: dict  # {str(pid): label}

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
            # psutil not available — fall back to os.kill / taskkill
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
        """Register a Popen object. Returns the same proc for chaining."""
        self._pids[str(proc.pid)] = label
        self._save()
        log(f"[pids] registered PID={proc.pid} ({label})")
        return proc

    def release(self, proc: subprocess.Popen):
        """Call when a process exits cleanly — removes it from the registry."""
        key = str(proc.pid)
        if key in self._pids:
            del self._pids[key]
            self._save()
            log(f"[pids] released PID={proc.pid}")

    def kill_all(self):
        """Kill every tracked process — called by kill button and on quit."""
        log(f"[pids] kill_all — {len(self._pids)} PID(s)")
        for pid_str, label in list(self._pids.items()):
            self._kill_pid(int(pid_str), label)
        self._pids.clear()
        self._save()

# Singleton — created once at startup
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
    """Runs ares_cube.py for each wav in order inside a background thread."""
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
                        # NO CREATE_NO_WINDOW — ares_cube is a visual/audio app
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
    t.finished.connect(t.deleteLater)   # let Qt manage C++ cleanup
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
#  PING THREAD  (never blocks the Qt main thread)
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
    ("STEP 2", "ok"),   ("Browser opens automatically.", "text"),
    ("", "text"),
    ("STEP 3", "ok"),   ("Use the control panel to open", "text"),
    ("the editor, view the site,",    "text"),
    ("and manage content.",           "text"),
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
        cx = cy = r = 16, 16, 13
        pts = [QPointF(16 + 13*math.cos(math.radians(60*i-30)),
                       16 + 13*math.sin(math.radians(60*i-30))) for i in range(6)]
        p.drawPolygon(QPolygonF(pts))
        p.setPen(QPen(col, 2))
        p.drawLine(11,10,11,22); p.drawLine(21,10,21,22); p.drawLine(11,16,21,16)
        p.end(); return QIcon(px)
    except Exception: return QIcon()

# ═════════════════════════════════════════════════════════════════════════════
#  FIRE BUTTON
# ═════════════════════════════════════════════════════════════════════════════

class FireButton(QPushButton):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._hover = self._press = False
        self._phase = 0.0; self._state = "idle"; self._radius = 58.0
        self.setFixedSize(180, 180)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setFlat(True)
        self.setStyleSheet("background:transparent;border:none;color:transparent;")
        self.setAttribute(Qt.WidgetAttribute.WA_Hover, True)
        t = QTimer(self); t.timeout.connect(self._tick); t.start(30)

    def set_state(self, s): self._state = s; self.update()

    def _tick(self):
        self._phase = (self._phase + 0.06) % (2*math.pi)
        tgt = 64.0 if (self._hover or self._state == "running") else 58.0
        self._radius += (tgt - self._radius) * 0.12
        self.update()

    def event(self, e):
        if e.type() == QEvent.Type.HoverEnter:  self._hover = True;  self.update()
        if e.type() == QEvent.Type.HoverLeave:  self._hover = False; self.update()
        return super().event(e)

    def mousePressEvent(self, e):   self._press = True;  self.update(); super().mousePressEvent(e)
    def mouseReleaseEvent(self, e): self._press = False; self.update(); super().mouseReleaseEvent(e)

    def paintEvent(self, _):
        try:
            p = QPainter(self); p.setRenderHint(QPainter.RenderHint.Antialiasing)
            w, h = self.width(), self.height(); cx, cy = w/2, h/2
            pulse = 0.5 + 0.5*math.sin(self._phase)
            mr    = self._radius; poff = -2 if self._press else 0
            COLS  = {"idle":C["cyan"],"running":C["warn"],"live":C["ok"],"failed":C["err"]}
            col   = QColor(COLS.get(self._state, C["cyan"]))
            # glow
            p.setPen(Qt.PenStyle.NoPen)
            for rr, ba in [(mr+18,.03),(mr+10,.06),(mr+4,.10)]:
                gc=QColor(col); gc.setAlphaF(ba*(0.5+0.5*pulse)*(1.4 if self._hover else 1))
                p.setBrush(gc); p.drawEllipse(QPointF(cx, cy+poff), rr, rr)
            # body
            fc=QColor(col); fc.setAlphaF(.20 if self._press else (.12 if self._hover else .07)); p.setBrush(fc)
            bc=QColor(col); bc.setAlphaF(.9 if self._hover else .5)
            p.setPen(QPen(bc, 2.0 if self._hover else 1.4))
            p.drawEllipse(QPointF(cx, cy+poff), mr, mr)
            # arcs
            if self._state == "running":
                ac=QColor(col); ac.setAlphaF(.85)
                p.setPen(QPen(ac,2.5,Qt.PenStyle.SolidLine,Qt.PenCapStyle.RoundCap))
                p.setBrush(Qt.BrushStyle.NoBrush)
                fast=int(self._phase*(180/math.pi)*16*3.5)%(360*16); rr=int(mr+10)
                p.drawArc(int(cx-rr),int(cy-rr),rr*2,rr*2,fast,220*16)
            if self._state == "live":
                lc=QColor(col); lc.setAlphaF(.15+.18*pulse)
                p.setPen(QPen(lc,1.2)); p.setBrush(Qt.BrushStyle.NoBrush)
                p.drawEllipse(QPointF(cx,cy),mr+8,mr+8)
            # label
            labels = {"live":("LIVE  ✓","click to open"),"running":("STARTING","please wait"),
                      "failed":("FAILED","check log")}
            lbl, sub = labels.get(self._state, ("FIRE IT UP!",""))
            tc=QColor(col if self._hover else C["text"])
            f=QFont("Orbitron",10 if len(lbl)>8 else 11); f.setBold(True)
            f.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing,1.5)
            p.setFont(f); p.setPen(tc)
            p.drawText(QRectF(0,cy-(8 if sub else 6)+poff,w,22),Qt.AlignmentFlag.AlignCenter,lbl)
            if sub:
                f2=QFont("Courier New",8); f2.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing,1.5)
                sc=QColor(col); sc.setAlphaF(.55 if self._hover else .35)
                p.setFont(f2); p.setPen(sc)
                p.drawText(QRectF(0,cy+7+poff,w,14),Qt.AlignmentFlag.AlignCenter,sub)
            p.end()
        except Exception: pass

# ═════════════════════════════════════════════════════════════════════════════
#  STATUS DOT
# ═════════════════════════════════════════════════════════════════════════════

class StatusDot(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent); self._live=False; self._ph=0.; self.setFixedSize(12,12)
        t=QTimer(self); t.timeout.connect(self._tick); t.start(50)
    def _tick(self): self._ph=(self._ph+.08)%(2*math.pi); self.update()
    def set_live(self,v): self._live=v; self.update()
    def paintEvent(self,_):
        try:
            p=QPainter(self); p.setRenderHint(QPainter.RenderHint.Antialiasing)
            col=QColor(C["ok"] if self._live else C["err"])
            g=QColor(col); g.setAlphaF(.25*(0.5+0.5*math.sin(self._ph)))
            p.setPen(Qt.PenStyle.NoPen); p.setBrush(g); p.drawEllipse(0,0,12,12)
            p.setBrush(col); p.drawEllipse(2,2,8,8); p.end()
        except Exception: pass

# ═════════════════════════════════════════════════════════════════════════════
#  KILL BUTTON
# ═════════════════════════════════════════════════════════════════════════════

class KillButton(QPushButton):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._hover=self._press=self._active=False; self._ph=0.; self._px=None
        self.setFixedSize(100,100); self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setFlat(True); self.setStyleSheet("background:transparent;border:none;")
        self.setAttribute(Qt.WidgetAttribute.WA_Hover, True)
        try:
            ip=IMG/"kill_process.png"
            if ip.exists():
                px=QPixmap(str(ip))
                if not px.isNull():
                    self._px=px.scaled(80,80,Qt.AspectRatioMode.KeepAspectRatio,
                                       Qt.TransformationMode.SmoothTransformation)
        except Exception: pass
        t=QTimer(self); t.timeout.connect(self._tick); t.start(40)

    def set_active(self,v): self._active=v; self.update()
    def _tick(self): self._ph=(self._ph+.07)%(2*math.pi); self.update()
    def event(self,e):
        if e.type()==QEvent.Type.HoverEnter:  self._hover=True;  self.update()
        if e.type()==QEvent.Type.HoverLeave:  self._hover=False; self.update()
        return super().event(e)
    def mousePressEvent(self,e):
        if self._active: self._press=True; self.update(); super().mousePressEvent(e)
    def mouseReleaseEvent(self,e):
        self._press=False; self.update()
        if self._active: super().mouseReleaseEvent(e)
    def paintEvent(self,_):
        try:
            p=QPainter(self); p.setRenderHint(QPainter.RenderHint.Antialiasing)
            w,h=self.width(),self.height(); cx,cy=w/2,h/2
            pulse=0.5+0.5*math.sin(self._ph)
            if self._px:
                ox=(w-self._px.width())//2; oy=(h-self._px.height())//2
                op=.18 if not self._active else (.75 if self._press else (1.0 if self._hover else .65))
                p.setOpacity(op); p.drawPixmap(ox,oy,self._px); p.setOpacity(1.0)
            else:
                col=QColor(C["err"] if self._active else C["dim"])
                fc=QColor(col); fc.setAlphaF(.08); p.setBrush(fc)
                bc=QColor(col); bc.setAlphaF(.5 if self._active else .2)
                p.setPen(QPen(bc,1.5)); p.drawEllipse(QPointF(cx,cy),38,38)
            if self._active and self._hover:
                gc=QColor(C["err"]); gc.setAlphaF(.20+.12*pulse)
                p.setPen(QPen(gc,2.0)); p.setBrush(Qt.BrushStyle.NoBrush)
                p.drawEllipse(QPointF(cx,cy),48,48)
            lc=QColor(C["err"] if self._active else C["dim"])
            lc.setAlphaF(.9 if self._active else .4)
            f=QFont("Courier New",7); f.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing,2)
            p.setFont(f); p.setPen(lc)
            p.drawText(QRectF(0,h-14,w,14),Qt.AlignmentFlag.AlignCenter,"KILL")
            p.end()
        except Exception: pass

# ═════════════════════════════════════════════════════════════════════════════
#  MAIN WINDOW
# ═════════════════════════════════════════════════════════════════════════════

class HelixLauncher(QMainWindow):

    def __init__(self):
        super().__init__()
        self._running    = False
        self._tray       = None
        self._bat_thread = None
        self._audio_thread = None
        self._poll_worker  = None

        try:
            self.setWindowTitle("H·E·L·I·X  Backend")
            self.setFixedSize(660, 440)
            self.setWindowFlags(Qt.WindowType.Window | Qt.WindowType.WindowCloseButtonHint)
            self.setStyleSheet(f"QMainWindow{{background:{C['bg']};}} QWidget{{background:transparent;}}")
            ico = IMG / "helix_64.ico"
            if ico.exists(): self.setWindowIcon(QIcon(str(ico)))
        except Exception: log_exc("[init] window setup")

        try:    self._build_ui()
        except: log_exc("[init] _build_ui")
        try:    self._build_tray()
        except: log_exc("[init] _build_tray")

        # Startup ping: delay 600ms so window is fully painted first
        QTimer.singleShot(600, self._startup_check)

    # ── background ────────────────────────────────────────────────────────────
    def paintEvent(self, _):
        try:
            p=QPainter(self); p.setRenderHint(QPainter.RenderHint.Antialiasing)
            w,h=self.width(),self.height()
            grad=QLinearGradient(0,0,0,h)
            grad.setColorAt(0,QColor(C["bg"])); grad.setColorAt(1,QColor("#010810"))
            p.fillRect(0,0,w,h,grad)
            dc=QColor(C["cyan"]); dc.setAlphaF(.03); p.setPen(QPen(dc,1.5))
            for gx in range(0,w,30):
                for gy in range(0,h,30): p.drawPoint(gx,gy)
            cc=QColor(C["cyan"]); cc.setAlphaF(.18); p.setPen(QPen(cc,1)); s=22
            for x,y,dx,dy in [(0,0,1,1),(w,0,-1,1),(0,h,1,-1),(w,h,-1,-1)]:
                p.drawLine(x,y+dy*7,x,y+dy*(s+7)); p.drawLine(x+dx*7,y,x+dx*(s+7),y)
            p.setPen(QPen(QColor(C["border2"]),1)); p.drawLine(320,20,320,h-20)
            bc=QColor(C["cyan"]); bc.setAlphaF(.08); p.fillRect(0,h-2,w,2,bc)
            p.end()
        except Exception: pass

    # ── UI ────────────────────────────────────────────────────────────────────
    def _build_ui(self):
        root  = QWidget(); self.setCentralWidget(root)
        outer = QHBoxLayout(root); outer.setContentsMargins(0,0,0,0); outer.setSpacing(0)

        # LEFT
        left = QVBoxLayout(); left.setContentsMargins(20,20,20,16); left.setSpacing(0)
        left.setAlignment(Qt.AlignmentFlag.AlignHCenter)

        logo_lbl = QLabel(); logo_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        logo_lbl.setFixedWidth(240)
        try:
            lp = IMG / "Soc_media_tag.png"
            if lp.exists():
                px = QPixmap(str(lp))
                if not px.isNull():
                    px = px.scaledToWidth(200, Qt.TransformationMode.SmoothTransformation)
                    logo_lbl.setPixmap(px); logo_lbl.setFixedHeight(px.height())
        except Exception:
            logo_lbl.setText("H·E·L·I·X")
            logo_lbl.setStyleSheet(f"font-family:'Orbitron';font-size:18px;font-weight:900;color:{C['cyan']};")
        left.addWidget(logo_lbl, 0, Qt.AlignmentFlag.AlignHCenter)
        left.addSpacing(10)

        sr = QHBoxLayout(); sr.setContentsMargins(0,0,0,0); sr.setSpacing(6)
        self._dot = StatusDot()
        self._status_lbl = QLabel("CHECKING...")
        self._status_lbl.setStyleSheet(
            f"font-family:'Courier New';font-size:10px;letter-spacing:3px;color:{C['text2']};")
        sr.addStretch(); sr.addWidget(self._dot); sr.addSpacing(5)
        sr.addWidget(self._status_lbl); sr.addStretch()
        left.addLayout(sr); left.addSpacing(12)

        self._fire_btn = FireButton()
        if not BAT_FILE.exists(): self._fire_btn.set_state("failed")
        self._fire_btn.clicked.connect(self._on_fire)
        left.addWidget(self._fire_btn, 0, Qt.AlignmentFlag.AlignHCenter)
        left.addSpacing(8)

        self._kill_btn = KillButton()
        self._kill_btn.set_active(False)
        self._kill_btn.clicked.connect(self._kill_server)
        left.addWidget(self._kill_btn, 0, Qt.AlignmentFlag.AlignHCenter)
        left.addSpacing(4)

        if not BAT_FILE.exists():
            wl = QLabel("⚠  bat/run_helix.bat not found")
            wl.setAlignment(Qt.AlignmentFlag.AlignCenter)
            wl.setStyleSheet(f"font-family:'Courier New';font-size:9px;color:{C['warn']};")
            left.addWidget(wl)

        ver = QLabel("v2.0  ·  N.HERLING  ·  UA ATLAS")
        ver.setStyleSheet(f"font-family:'Courier New';font-size:9px;letter-spacing:2px;color:{C['dim']};")
        ver.setAlignment(Qt.AlignmentFlag.AlignCenter)
        left.addWidget(ver); left.addStretch()

        lw = QWidget(); lw.setFixedWidth(320); lw.setLayout(left)
        outer.addWidget(lw)

        # RIGHT
        right = QVBoxLayout(); right.setContentsMargins(20,20,16,16); right.setSpacing(4)
        hdr = QLabel("HOW  IT  WORKS")
        hdr.setStyleSheet(
            f"font-family:'Orbitron';font-size:10px;font-weight:700;"
            f"letter-spacing:4px;color:{C['cyan']};margin-bottom:6px;")
        right.addWidget(hdr); right.addSpacing(4)
        for text, ck in INFO_LINES:
            lbl = QLabel(text)
            lbl.setStyleSheet(
                f"font-family:'Courier New';font-size:9px;"
                f"letter-spacing:{'3px' if ck in ('cyan','ok','warn') else '1px'};"
                f"color:{C.get(ck, C['text'])};")
            right.addWidget(lbl)
        right.addStretch()
        rw = QWidget(); rw.setLayout(right); outer.addWidget(rw, 1)

    # ── tray ──────────────────────────────────────────────────────────────────
    def _build_tray(self):
        self._tray = QSystemTrayIcon(make_icon(False), self)
        self._tray.setToolTip("HELIX Backend")
        menu = QMenu()
        for lbl, fn in [("Show",self.show),(None,None),
                        ("Open Control Panel",self._open_control),(None,None),("Quit",self._quit)]:
            if lbl is None: menu.addSeparator()
            else:
                a = QAction(lbl, self); a.triggered.connect(fn); menu.addAction(a)
        self._tray.setContextMenu(menu)
        self._tray.activated.connect(
            lambda r: self.show() if r==QSystemTrayIcon.ActivationReason.DoubleClick else None)
        self._tray.show()

    # ── state ─────────────────────────────────────────────────────────────────
    def _startup_check(self):
        w = PingThread(PING_URL, once=True, parent=self)
        w.finished.connect(w.deleteLater)
        w.up.connect(lambda: self._go_live("ALREADY LIVE"))
        w.down.connect(lambda: self._set_status(False, "OFFLINE"))
        w.start()

    def _go_live(self, msg="LIVE"):
        try:
            if self._running: return   # already live — don't double-trigger
            self._running = True
            self._fire_btn.set_state("live")
            self._set_status(True, msg)
            if self._tray: self._tray.setIcon(make_icon(True))
            self._kill_btn.set_active(True)
            self._start_poll()
        except Exception:
            log_exc("[go_live]")

    def _start_poll(self):
        try:
            # Stop and discard any existing poll worker cleanly
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
            self._fire_btn.set_state("idle")
            self._set_status(False, "SERVER STOPPED")
            if self._tray: self._tray.setIcon(make_icon(False))
            self._kill_btn.set_active(False)
            if self._poll_worker:
                self._poll_worker.stop()
                self._poll_worker = None
        except Exception:
            log_exc("[on_ping_down]")

    def _set_status(self, live, text=""):
        try:
            col = C["ok"] if live else (C["err"] if text not in ("CHECKING...","OFFLINE") else C["text2"])
            self._dot.set_live(live)
            self._status_lbl.setStyleSheet(
                f"font-family:'Courier New';font-size:10px;letter-spacing:3px;color:{col};")
            self._status_lbl.setText(text or ("LIVE" if live else "OFFLINE"))
        except Exception:
            log_exc("[set_status]")

    # ── actions ───────────────────────────────────────────────────────────────
    def _on_fire(self):
        try:
            if self._running:
                self._open_control(); return
            if not BAT_FILE.exists():
                log(f"[fire] BAT not found: {BAT_FILE}", "error")
                self._set_status(False, "BAT NOT FOUND"); return
            log("[fire] FIRE pressed")
            self._fire_btn.set_state("running")
            self._set_status(False, "STARTING...")
            # Start audio sequence
            self._audio_thread = run_audio_sequence(FIRE_SEQUENCE)
            # Start server
            self._bat_thread = BatThread(self)
            self._bat_thread.finished.connect(self._bat_thread.deleteLater)
            self._bat_thread.log_line.connect(lambda l: log(l))
            self._bat_thread.finished_.connect(self._on_bat_finished)
            self._bat_thread.start()
            # Registry is initialised at startup; orphan cleanup already done.
            # Server PID is tracked inside helix_server.py itself (see below).
            get_registry()   # ensure registry exists
        except Exception:
            log_exc("[on_fire]")

    def _on_bat_finished(self, success):
        try:
            log(f"[bat] finished success={success}")
            if success:
                self._go_live("LIVE")
                # Delay browser open 1s so event loop settles after _go_live
                QTimer.singleShot(1000, self._open_control)
            else:
                self._fire_btn.set_state("failed")
                self._set_status(False, "FAILED — check bat/log")
        except Exception:
            log_exc("[on_bat_finished]")

    def _kill_server(self):
        try:
            log("[kill] KILL pressed")
            # Kill all tracked subprocesses (ares_cube instances, etc.)
            get_registry().kill_all()
            self._audio_thread = run_audio_sequence(KILL_SEQUENCE)
            # 1. Graceful shutdown via API
            try:
                import urllib.request
                urllib.request.urlopen(f"http://localhost:{PORT}/api/shutdown", timeout=2)
                log("[kill] /api/shutdown OK")
            except Exception:
                log("[kill] /api/shutdown no response")
            # 2. Kill by PID file (precise — won't hit the launcher)
            _spid_file = REPO_ROOT / "data" / "server.pid"
            try:
                if _spid_file.exists():
                    _spid = int(_spid_file.read_text().strip())
                    subprocess.run(["taskkill", "/PID", str(_spid), "/F"],
                                   capture_output=True, creationflags=WIN_HIDE)
                    _spid_file.unlink(missing_ok=True)
                    log(f"[kill] taskkill server PID={_spid}")
            except Exception: log_exc("[kill] PID file kill")
            # 3. Fallback: kill bat (now safe — uses LISTENING filter)
            try:
                if KILL_BAT_FILE.exists():
                    subprocess.Popen(["cmd.exe","/c",str(KILL_BAT_FILE)],
                                     creationflags=WIN_HIDE, cwd=str(REPO_ROOT))
                    log("[kill] kill bat spawned")
            except Exception: log_exc("[kill] bat spawn")
            self._running = False
            self._fire_btn.set_state("idle")
            self._set_status(False, "STOPPED")
            self._kill_btn.set_active(False)
            if self._tray: self._tray.setIcon(make_icon(False))
            if self._poll_worker:
                self._poll_worker.stop(); self._poll_worker = None
        except Exception:
            log_exc("[kill_server]")

    def _open_control(self):
        def _go():
            try:
                webbrowser.open(CTRL_URL); log(f"[browser] {CTRL_URL}")
            except Exception: log_exc("[browser]")
        threading.Thread(target=_go, daemon=True).start()

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
        # Boot registry first — kills any orphans from a previous crash
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
