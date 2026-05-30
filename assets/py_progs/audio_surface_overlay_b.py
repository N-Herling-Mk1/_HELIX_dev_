#!/usr/bin/env python3
"""
ARES MK3
─────────
Grey isometric floor plane with:
  • 2D frequency heatmap painted onto the plane surface
    (X = frequency radial, Z = time, color = amplitude viridis)
  • 3D columns rising from the centre bass zone only

Usage:  python mk_3.py [audio_file]
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

DEFAULT_AUDIO  = r"assets\audio\muscle_car_power_up.wav"

WIN_W, WIN_H   = 720, 440
N_COLS         = 24          # freq columns on plane (even, mirrored)
N_BANDS        = N_COLS // 2
N_SLICES       = 20          # time rows on plane
MAX_H          = 160         # max 3D column height px
COL_DEPTH_PX   = 0.95        # fraction of one time-row depth per column
FFT_SIZE       = 4096
HOP_SIZE       = 256
FREQ_LOW       = 40.0
FREQ_HIGH      = 12000.0
REFRESH_MS     = 16
NORM_DECAY     = 0.9995

# How many centre columns get 3D treatment (bass zone)
CENTRE_3D_COLS = 8           # must be even

# Bounce
RISE_SPEED     = 0.70
FALL_SPEED     = 0.16

# Camera
CAM_X          = WIN_W * 0.50
CAM_Y          = WIN_H * 0.75
FREQ_AXIS_X    = -0.54
FREQ_AXIS_Y    = -0.24
TIME_AXIS_X    =  0.54
TIME_AXIS_Y    = -0.24
FREQ_SPAN      = 380
TIME_SPAN      = 240

# ─── Color palettes ───────────────────────────────────────────────────────────

_VIRIDIS_STOPS = [
    (0.000, ( 68,   1,  84)),
    (0.125, ( 70,  50, 127)),
    (0.250, ( 54,  92, 141)),
    (0.375, ( 39, 127, 142)),
    (0.500, ( 31, 161, 135)),
    (0.625, ( 74, 194, 109)),
    (0.750, (159, 218,  58)),
    (1.000, (253, 231,  37)),
]

def _viridis_raw(t: float) -> tuple:
    t = max(0.0, min(1.0, t))
    for i in range(len(_VIRIDIS_STOPS) - 1):
        t0, c0 = _VIRIDIS_STOPS[i]; t1, c1 = _VIRIDIS_STOPS[i+1]
        if t0 <= t <= t1:
            f = (t-t0)/(t1-t0)
            return (int(c0[0]+f*(c1[0]-c0[0])),
                    int(c0[1]+f*(c1[1]-c0[1])),
                    int(c0[2]+f*(c1[2]-c0[2])))
    return _VIRIDIS_STOPS[-1][1]

_VIR = [_viridis_raw(i/511) for i in range(512)]
def vir(t: float) -> tuple:
    return _VIR[int(max(0.0, min(1.0, t)) * 511)]

# ─── Frequency mapping ────────────────────────────────────────────────────────

def col_to_band(col: int) -> int:
    centre = (N_COLS - 1) / 2.0
    dist   = abs(col - centre)
    return min(int(round(dist / centre * (N_BANDS - 1))), N_BANDS - 1)

COL_BAND = [col_to_band(c) for c in range(N_COLS)]

# Centre columns that get 3D treatment
_half3d  = CENTRE_3D_COLS // 2
_centre  = N_COLS // 2
IS_3D    = [abs(c - _centre + 0.5) < _half3d for c in range(N_COLS)]

# ─── Projection ───────────────────────────────────────────────────────────────

def proj(ci: float, si: float, amp_px: float = 0.0) -> QPointF:
    fx = ci / max(N_COLS - 1, 1)
    tx = si / max(N_SLICES - 1, 1)
    sx = CAM_X + fx * FREQ_SPAN * FREQ_AXIS_X + tx * TIME_SPAN * TIME_AXIS_X
    sy = (CAM_Y
          + fx * FREQ_SPAN * FREQ_AXIS_Y
          + tx * TIME_SPAN * TIME_AXIS_Y
          - amp_px)
    return QPointF(sx, sy)

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
            outdata[:, 0] = chunk; pos[0] += frames

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

class MK3Overlay(QWidget):

    def __init__(self):
        super().__init__()

        self._band_amps = np.zeros(N_BANDS, dtype=np.float32)
        self._displayed = np.zeros(N_COLS,  dtype=np.float32)

        # Heatmap history for the plane (newest = slice 0)
        self._history   = deque(
            [np.zeros(N_COLS, dtype=np.float32) for _ in range(N_SLICES)],
            maxlen=N_SLICES)

        self._fading    = False
        self._opacity   = 1.0

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

    def on_frame(self, amps: np.ndarray):
        self._band_amps = amps
        row = np.array([amps[COL_BAND[c]] for c in range(N_COLS)],
                       dtype=np.float32)
        self._history.appendleft(row)

    def on_done(self):
        self._fading = True

    def _tick(self):
        target = np.array([self._band_amps[COL_BAND[c]] for c in range(N_COLS)],
                          dtype=np.float32)
        rising = target > self._displayed
        self._displayed = np.where(
            rising,
            self._displayed * (1-RISE_SPEED) + target * RISE_SPEED,
            self._displayed * (1-FALL_SPEED)  + target * FALL_SPEED)

        if self._fading:
            self._displayed *= 0.90
            self._opacity    = max(0.0, self._opacity - 0.04)
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

        slices = list(self._history)

        # ── Pass 1: grey floor plane + 2D heatmap (back to front) ────────
        for si in range(N_SLICES - 2, -1, -1):
            row = slices[si] if si < len(slices) else np.zeros(N_COLS)

            for ci in range(N_COLS - 1, -1, -1):
                amp  = float(row[ci])
                ci2  = ci + 1

                tl = proj(ci,  si)
                tr = proj(ci2, si)
                br = proj(ci2, si + 1)
                bl = proj(ci,  si + 1)

                if amp > 0.015:
                    # Viridis cell tinted onto grey plane
                    r, g, b = vir(amp ** 0.55)
                    # Blend toward grey as amp drops
                    grey  = 62
                    blend = amp ** 0.4
                    cr    = int(grey + (r - grey) * blend)
                    cg    = int(grey + (g - grey) * blend)
                    cb_   = int(grey + (b - grey) * blend)
                    cell_a = int(180 + amp * 60)
                    fc    = QColor(cr, cg, cb_, cell_a)
                else:
                    # Pure grey
                    fc = QColor(58, 58, 62, 170)

                p.setBrush(QBrush(fc))
                p.setPen(QPen(QColor(30, 30, 32, 80), 0.4))
                p.drawPolygon(QPolygonF([tl, tr, br, bl]))

        # ── Pass 2: 3D columns rising from centre (back-to-front) ─────────
        # Only draw at slice 0 (current frame) — static plane, moving heights
        si = 0
        for ci in range(N_COLS - 1, -1, -1):
            if not IS_3D[ci]: continue

            amp    = float(self._displayed[ci])
            amp_px = amp * MAX_H
            if amp_px < 1.0: continue

            r, g, b = vir(amp ** 0.52)

            fbl = proj(ci,     si,     0)
            fbr = proj(ci + 1, si,     0)
            ftl = proj(ci,     si,     amp_px)
            ftr = proj(ci + 1, si,     amp_px)
            bbl = proj(ci,     si + 1, 0)
            bbr = proj(ci + 1, si + 1, 0)
            btl = proj(ci,     si + 1, amp_px)
            btr = proj(ci + 1, si + 1, amp_px)

            outline = QPen(QColor(0, 0, 0, 100), 0.6)

            # Top face
            p.setBrush(QBrush(QColor(r, g, b, 240)))
            p.setPen(outline)
            p.drawPolygon(QPolygonF([ftl, ftr, btr, btl]))

            # Front face — 68%
            p.setBrush(QBrush(QColor(int(r*.68), int(g*.68), int(b*.68), 240)))
            p.drawPolygon(QPolygonF([fbl, fbr, ftr, ftl]))

            # Right side — 45%
            p.setBrush(QBrush(QColor(int(r*.45), int(g*.45), int(b*.45), 240)))
            p.drawPolygon(QPolygonF([fbr, bbr, btr, ftr]))

        p.end()

# ─── Entry ────────────────────────────────────────────────────────────────────

def main():
    filepath = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_AUDIO
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)

    overlay = MK3Overlay()
    signals = AudioSignals()
    engine  = AudioEngine(filepath, N_BANDS, signals)

    signals.frame_ready.connect(overlay.on_frame)
    signals.playback_done.connect(overlay.on_done)

    print(f"[ARES MK3]  grey plane + 2D heatmap + centre 3D columns")
    print(f"            plane: {N_COLS}×{N_SLICES} cells · 3D zone: {CENTRE_3D_COLS} cols")
    print(f"            File: {filepath}")

    overlay.show(); engine.start(); sys.exit(app.exec())

if __name__ == "__main__":
    main()
