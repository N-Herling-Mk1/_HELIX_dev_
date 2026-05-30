#!/usr/bin/env python3
"""
ARES Surface — Radial Frequency Bell
──────────────────────────────────────
Frequency mapped radially on the X axis:
  centre column  → lowest  freq (bass)
  mid columns    → mid     freq
  outer edges    → highest freq (treble)

Bass peaks in the middle → natural bell / Gaussian shape.

Usage:  python surface.py [audio_file]
Deps:   pip install PyQt6 sounddevice soundfile numpy
"""

import sys, math, threading
from collections import deque
import numpy as np

try:
    import soundfile as sf
    import sounddevice as sd
except ImportError:
    print("pip install sounddevice soundfile numpy"); sys.exit(1)

from PyQt6.QtWidgets import QApplication, QWidget
from PyQt6.QtCore    import Qt, QTimer, QPointF, pyqtSignal, QObject
from PyQt6.QtGui     import (QPainter, QColor, QPen, QBrush, QPolygonF)

# ─── Config ───────────────────────────────────────────────────────────────────

DEFAULT_AUDIO = r"assets\audio\muscle_car_power_up.wav"

WIN_W, WIN_H  = 720, 420
N_COLS        = 22          # display columns (symmetric, even number)
N_BANDS       = N_COLS // 2 # unique freq bands (half, mirrored)
N_SLICES      = 22          # time depth
MAX_H         = 140
FFT_SIZE      = 4096
HOP_SIZE      = 256
FREQ_LOW      = 40.0
FREQ_HIGH     = 12000.0
REFRESH_MS    = 16
NORM_DECAY    = 0.9995

# Projection — zoomed out, more face-on
CAM_ORIGIN_X  = WIN_W * 0.50
CAM_ORIGIN_Y  = WIN_H * 0.84
FREQ_AXIS_X   = -0.52
FREQ_AXIS_Y   = -0.26
TIME_AXIS_X   =  0.52
TIME_AXIS_Y   = -0.26
FREQ_SPAN     = 360          # wider — shows full bell
TIME_SPAN     = 230
AMP_AXIS_Y    = -1.0

# Viridis
VIRIDIS = [
    (0.000, ( 68,   1,  84)),
    (0.125, ( 70,  50, 127)),
    (0.250, ( 54,  92, 141)),
    (0.375, ( 39, 127, 142)),
    (0.500, ( 31, 161, 135)),
    (0.625, ( 74, 194, 109)),
    (0.750, (159, 218,  58)),
    (1.000, (253, 231,  37)),
]

def viridis(t: float) -> tuple:
    t = max(0.0, min(1.0, t))
    for i in range(len(VIRIDIS) - 1):
        t0, c0 = VIRIDIS[i]; t1, c1 = VIRIDIS[i+1]
        if t0 <= t <= t1:
            f = (t-t0)/(t1-t0)
            return (int(c0[0]+f*(c1[0]-c0[0])),
                    int(c0[1]+f*(c1[1]-c0[1])),
                    int(c0[2]+f*(c1[2]-c0[2])))
    return VIRIDIS[-1][1]

_VIR = [viridis(i/511) for i in range(512)]

def vir(t: float) -> QColor:
    r, g, b = _VIR[int(max(0.0, min(1.0, t)) * 511)]
    return QColor(r, g, b)

# ─── Frequency mapping ────────────────────────────────────────────────────────

def col_to_band(col: int) -> int:
    """
    Map display column → frequency band index.
    col=0 (left edge)   → band N_BANDS-1 (highest freq)
    col=N_COLS//2-1     → band 0          (lowest freq, centre-left)
    col=N_COLS//2       → band 0          (lowest freq, centre-right)
    col=N_COLS-1 (right)→ band N_BANDS-1  (highest freq)
    """
    centre = (N_COLS - 1) / 2.0
    dist   = abs(col - centre)                      # 0 at centre, max at edges
    band   = int(round(dist / (centre) * (N_BANDS - 1)))
    return min(band, N_BANDS - 1)

# Pre-bake column→band mapping
COL_BAND = [col_to_band(c) for c in range(N_COLS)]

# ─── Projection ───────────────────────────────────────────────────────────────

def proj(ci: int, si: int, amp: float) -> QPointF:
    fx = ci / max(N_COLS   - 1, 1)
    tx = si / max(N_SLICES - 1, 1)
    sx = (CAM_ORIGIN_X
          + fx * FREQ_SPAN * FREQ_AXIS_X
          + tx * TIME_SPAN * TIME_AXIS_X)
    sy = (CAM_ORIGIN_Y
          + fx * FREQ_SPAN * FREQ_AXIS_Y
          + tx * TIME_SPAN * TIME_AXIS_Y
          + amp * MAX_H    * AMP_AXIS_Y)
    return QPointF(sx, sy)

def proj_floor(ci: int, si: int) -> QPointF:
    return proj(ci, si, 0.0)

# ─── Audio ────────────────────────────────────────────────────────────────────

class AudioSignals(QObject):
    frame_ready   = pyqtSignal(object)
    playback_done = pyqtSignal()

class AudioEngine(threading.Thread):
    def __init__(self, filepath, n_bands, signals):
        super().__init__(daemon=True)
        self.filepath = filepath
        self.n_bands  = n_bands
        self.signals  = signals
        self._done    = False

    def run(self):
        try:
            audio, sr = sf.read(self.filepath, always_2d=True)
        except Exception as e:
            print(f"[AudioEngine] {e}"); self.signals.playback_done.emit(); return

        mono = audio.mean(axis=1).astype(np.float32)
        pk   = np.abs(mono).max()
        if pk > 1e-9: mono /= pk

        pos   = [0]
        edges = np.logspace(math.log10(FREQ_LOW),
                            math.log10(min(FREQ_HIGH, sr/2-1)),
                            self.n_bands + 1)
        rmax  = [1e-4]

        def cb(outdata, frames, _t, _s):
            chunk = mono[pos[0]: pos[0]+frames]
            if len(chunk) < frames:
                chunk = np.pad(chunk, (0, frames-len(chunk)))
                self._done = True
            outdata[:, 0] = chunk
            pos[0] += frames

            spec  = np.abs(np.fft.rfft(chunk * np.hanning(len(chunk)), n=FFT_SIZE))
            freqs = np.fft.rfftfreq(FFT_SIZE, 1.0/sr)
            amps  = np.zeros(self.n_bands, dtype=np.float32)
            for i in range(self.n_bands):
                mask = (freqs >= edges[i]) & (freqs < edges[i+1])
                if mask.any(): amps[i] = spec[mask].mean()

            rmax[0] = max(rmax[0] * NORM_DECAY, float(amps.max()))
            amps   /= rmax[0]
            self.signals.frame_ready.emit(amps)

        with sd.OutputStream(samplerate=sr, channels=1,
                             blocksize=HOP_SIZE, callback=cb):
            while not self._done: sd.sleep(8)
        self.signals.playback_done.emit()

# ─── Widget ───────────────────────────────────────────────────────────────────

class SurfaceOverlay(QWidget):

    def __init__(self):
        super().__init__()

        # Each stored frame is a (N_COLS,) array — mirrored from N_BANDS
        self._mesh = deque(
            [np.zeros(N_COLS, dtype=np.float32) for _ in range(N_SLICES)],
            maxlen=N_SLICES)

        self._fading  = False
        self._opacity = 1.0

        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint |
            Qt.WindowType.Tool)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setAttribute(Qt.WidgetAttribute.WA_NoSystemBackground)

        scr = QApplication.primaryScreen().geometry()
        self.setGeometry(
            scr.width()//2  - WIN_W//2,
            scr.height()//2 - WIN_H//2,
            WIN_W, WIN_H)

        self._timer = QTimer(self)
        self._timer.timeout.connect(self._tick)
        self._timer.start(REFRESH_MS)

    def on_frame(self, band_amps: np.ndarray):
        # Mirror bands onto N_COLS: centre=low, edges=high
        row = np.array([band_amps[COL_BAND[c]] for c in range(N_COLS)],
                       dtype=np.float32)
        self._mesh.appendleft(row)

    def on_done(self):
        self._fading = True

    def _tick(self):
        if self._fading:
            self._opacity = max(0.0, self._opacity - 0.035)
            self.setWindowOpacity(self._opacity)
            if self._opacity <= 0.0:
                self._timer.stop(); self.close(); QApplication.quit(); return
        self.update()

    def paintEvent(self, _):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)

        p.setCompositionMode(QPainter.CompositionMode.CompositionMode_Source)
        p.fillRect(self.rect(), QColor(0, 0, 0, 0))
        p.setCompositionMode(QPainter.CompositionMode.CompositionMode_SourceOver)

        slices = list(self._mesh)

        # ── Draw columns back-to-front ────────────────────────────────────
        for si in range(N_SLICES - 1, -1, -1):
            row = slices[si] if si < len(slices) else np.zeros(N_COLS)

            for ci in range(N_COLS - 1, -1, -1):
                amp = float(row[ci])
                if amp < 0.005: continue

                ci2 = ci + 1

                # 8 corners of the bar
                fbl = proj_floor(ci,  si)
                fbr = proj_floor(ci2, si)
                bbl = proj_floor(ci,  si + 1)
                bbr = proj_floor(ci2, si + 1)
                ftl = proj(ci,  si,     amp)
                ftr = proj(ci2, si,     amp)
                btl = proj(ci,  si + 1, amp)
                btr = proj(ci2, si + 1, amp)

                base_c = vir(amp ** 0.52)
                r, g, b = base_c.red(), base_c.green(), base_c.blue()
                depth_a = int(200 + (si / max(N_SLICES-1,1)) * 50)

                # Top face — full viridis color
                top_c = QColor(r, g, b, depth_a)
                p.setBrush(QBrush(top_c))
                p.setPen(QPen(QColor(0, 0, 0, 100), 0.6))
                p.drawPolygon(QPolygonF([ftl, ftr, btr, btl]))

                # Front face — 65% brightness
                fr_c = QColor(int(r*0.65), int(g*0.65), int(b*0.65), depth_a)
                p.setBrush(QBrush(fr_c))
                p.drawPolygon(QPolygonF([fbl, fbr, ftr, ftl]))

                # Right side face — 45% brightness
                rs_c = QColor(int(r*0.45), int(g*0.45), int(b*0.45), depth_a)
                p.setBrush(QBrush(rs_c))
                p.drawPolygon(QPolygonF([fbr, bbr, btr, ftr]))

        p.end()

# ─── Entry ────────────────────────────────────────────────────────────────────

def main():
    filepath = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_AUDIO
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)

    overlay = SurfaceOverlay()
    signals = AudioSignals()
    engine  = AudioEngine(filepath, N_BANDS, signals)

    signals.frame_ready.connect(overlay.on_frame)
    signals.playback_done.connect(overlay.on_done)

    print(f"[ARES Surface]  {N_COLS} cols (mirrored) × {N_SLICES} slices")
    print(f"                centre=bass  edges=treble  → bell shape")
    print(f"                File: {filepath}")

    overlay.show(); engine.start(); sys.exit(app.exec())

if __name__ == "__main__":
    main()
