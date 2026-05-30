#!/usr/bin/env python3
"""
ARES Surface MK — Static Plane Spectrum
─────────────────────────────────────────
Single static plane of 3D columns.
Height bounces with frequency amplitude in real time.
No time scrolling — pure instantaneous spectrum.

Radial freq mapping:
  centre columns → bass
  outer columns  → treble

Usage:  python surface_mk.py [audio_file]
Deps:   pip install PyQt6 sounddevice soundfile numpy
"""

import sys, math, threading
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

WIN_W, WIN_H  = 680, 360
N_COLS        = 24          # display columns (symmetric, even)
N_BANDS       = N_COLS // 2 # unique freq bands (mirrored)
MAX_H         = 180         # max column height px
COL_DEPTH     = 38          # depth of each column (3D box depth)
FFT_SIZE      = 4096
HOP_SIZE      = 256
FREQ_LOW      = 40.0
FREQ_HIGH     = 12000.0
REFRESH_MS    = 16
NORM_DECAY    = 0.9995

# Bounce physics
RISE_SPEED    = 0.72        # how fast columns rise  (lerp factor)
FALL_SPEED    = 0.18        # how fast columns fall
PEAK_HOLD     = 18          # frames to hold peak marker
PEAK_FALL     = 0.96        # peak marker decay per frame

# Camera — single-plane isometric, viewed from front-right-above
CAM_X         = WIN_W * 0.50
CAM_Y         = WIN_H * 0.78
FREQ_AXIS_X   = -0.54
FREQ_AXIS_Y   = -0.24
FREQ_SPAN     = 400
DEPTH_AXIS_X  =  0.42
DEPTH_AXIS_Y  = -0.18

# Viridis
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

def _viridis(t: float) -> tuple:
    t = max(0.0, min(1.0, t))
    for i in range(len(_VIRIDIS_STOPS) - 1):
        t0, c0 = _VIRIDIS_STOPS[i]; t1, c1 = _VIRIDIS_STOPS[i+1]
        if t0 <= t <= t1:
            f = (t-t0)/(t1-t0)
            return (int(c0[0]+f*(c1[0]-c0[0])),
                    int(c0[1]+f*(c1[1]-c0[1])),
                    int(c0[2]+f*(c1[2]-c0[2])))
    return _VIRIDIS_STOPS[-1][1]

_VIR = [_viridis(i/511) for i in range(512)]
def vir(t: float) -> tuple:
    return _VIR[int(max(0.0, min(1.0, t)) * 511)]

# ─── Frequency mapping (radial) ───────────────────────────────────────────────

def col_to_band(col: int) -> int:
    centre = (N_COLS - 1) / 2.0
    dist   = abs(col - centre)
    return min(int(round(dist / centre * (N_BANDS - 1))), N_BANDS - 1)

COL_BAND = [col_to_band(c) for c in range(N_COLS)]

# ─── Projection ───────────────────────────────────────────────────────────────

def proj(ci: int, depth: float, amp_px: float) -> QPointF:
    """
    ci      : column index [0, N_COLS-1]
    depth   : 0=front face, 1=back face of column
    amp_px  : height in pixels
    """
    fx = ci / max(N_COLS - 1, 1)
    sx = (CAM_X
          + fx      * FREQ_SPAN   * FREQ_AXIS_X
          + depth   * COL_DEPTH   * DEPTH_AXIS_X)
    sy = (CAM_Y
          + fx      * FREQ_SPAN   * FREQ_AXIS_Y
          + depth   * COL_DEPTH   * DEPTH_AXIS_Y
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

class MKOverlay(QWidget):

    def __init__(self):
        super().__init__()

        self._band_amps  = np.zeros(N_BANDS, dtype=np.float32)
        self._displayed  = np.zeros(N_COLS,  dtype=np.float32)  # smoothed heights
        self._peaks      = np.zeros(N_COLS,  dtype=np.float32)  # peak hold values
        self._peak_timer = np.zeros(N_COLS,  dtype=np.int32)    # peak hold countdown

        self._fading     = False
        self._opacity    = 1.0

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

    def on_done(self):
        self._fading = True

    def _tick(self):
        # Build target heights from mirrored band mapping
        target = np.array([self._band_amps[COL_BAND[c]]
                           for c in range(N_COLS)], dtype=np.float32)

        # Asymmetric rise/fall smoothing
        rising = target > self._displayed
        self._displayed = np.where(
            rising,
            self._displayed * (1 - RISE_SPEED) + target * RISE_SPEED,
            self._displayed * (1 - FALL_SPEED)  + target * FALL_SPEED,
        )

        # Peak hold markers
        for c in range(N_COLS):
            if self._displayed[c] >= self._peaks[c]:
                self._peaks[c]      = self._displayed[c]
                self._peak_timer[c] = PEAK_HOLD
            else:
                if self._peak_timer[c] > 0:
                    self._peak_timer[c] -= 1
                else:
                    self._peaks[c] *= PEAK_FALL

        if self._fading:
            self._displayed *= 0.90
            self._peaks     *= 0.90
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

        # ── Floor grid ───────────────────────────────────────────────────
        fp = QPen(QColor(60, 60, 80, 55), 0.5)
        p.setPen(fp)
        for ci in range(N_COLS):
            p.drawLine(proj(ci, 0, 0), proj(ci, 1, 0))
        for d in [0.0, 1.0]:
            p.drawLine(proj(0, d, 0), proj(N_COLS-1, d, 0))

        # ── 3D columns right-to-left (painter's order) ───────────────────
        for ci in range(N_COLS - 1, -1, -1):
            amp    = float(self._displayed[ci])
            amp_px = amp * MAX_H
            if amp_px < 0.5:
                amp_px = 0.5   # always show a tiny stub

            r, g, b = vir(amp ** 0.52)

            # 8 corners — front/back × left/right × top/bottom
            fbl = proj(ci,     0, 0)
            fbr = proj(ci + 1, 0, 0)
            ftl = proj(ci,     0, amp_px)
            ftr = proj(ci + 1, 0, amp_px)
            bbl = proj(ci,     1, 0)
            bbr = proj(ci + 1, 1, 0)
            btl = proj(ci,     1, amp_px)
            btr = proj(ci + 1, 1, amp_px)

            outline = QPen(QColor(0, 0, 0, 110), 0.6)

            # Top face — full viridis
            tc = QColor(r, g, b, 235)
            p.setBrush(QBrush(tc))
            p.setPen(outline)
            p.drawPolygon(QPolygonF([ftl, ftr, btr, btl]))

            # Front face — 68% brightness
            fc = QColor(int(r*.68), int(g*.68), int(b*.68), 235)
            p.setBrush(QBrush(fc))
            p.drawPolygon(QPolygonF([fbl, fbr, ftr, ftl]))

            # Right side face — 45% brightness
            sc = QColor(int(r*.45), int(g*.45), int(b*.45), 235)
            p.setBrush(QBrush(sc))
            p.drawPolygon(QPolygonF([fbr, bbr, btr, ftr]))

            # Peak hold marker — bright thin slab on top
            pk_px = float(self._peaks[ci]) * MAX_H
            if pk_px > amp_px + 2:
                pr, pg, pb = vir(float(self._peaks[ci]) ** 0.52)
                pk_c = QColor(pr, pg, pb, 210)
                ptl = proj(ci,     0, pk_px)
                ptr = proj(ci + 1, 0, pk_px)
                pbl = proj(ci,     1, pk_px)
                pbr = proj(ci + 1, 1, pk_px)
                p.setBrush(QBrush(pk_c))
                p.setPen(QPen(QColor(255, 255, 255, 80), 0.5))
                p.drawPolygon(QPolygonF([ptl, ptr, pbr, pbl]))

        p.end()

# ─── Entry ────────────────────────────────────────────────────────────────────

def main():
    filepath = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_AUDIO
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)

    overlay  = MKOverlay()
    signals  = AudioSignals()
    engine   = AudioEngine(filepath, N_BANDS, signals)

    signals.frame_ready.connect(overlay.on_frame)
    signals.playback_done.connect(overlay.on_done)

    print(f"[ARES MK]  {N_COLS} columns · static plane · bounce mode")
    print(f"           centre=bass  edges=treble  viridis height")
    print(f"           File: {filepath}")

    overlay.show(); engine.start(); sys.exit(app.exec())

if __name__ == "__main__":
    main()
