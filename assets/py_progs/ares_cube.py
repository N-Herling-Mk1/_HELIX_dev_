#!/usr/bin/env python3
"""
ARES CUBE
─────────────────────────────────────────────────────────────────────
Isometric frequency plane  +  a rotating viridis cube floating above.

  Plane  — 2D viridis heatmap only (time scrolls rearward)

  Cube   — slow yaw rotation, fixed pitch tilt
           each face: FACE_G × FACE_G viridis frequency tiles
           u axis (left→right) = bass→treble on every face
           cube edges: icy cyan double-pass glow
           bass pulse breathes the cube scale

Usage :  python ares_cube.py [audio_file]
Deps  :  pip install PyQt6 sounddevice soundfile numpy
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
from PyQt6.QtGui     import QPainter, QColor, QPen, QBrush, QPolygonF

# ═════════════════════════════════════════════════════════════════════════════
#  Config
# ═════════════════════════════════════════════════════════════════════════════

DEFAULT_AUDIO   = r"assets\audio\muscle_car_power_up.wav"
WIN_W, WIN_H    = 820, 540

# ── Plane ─────────────────────────────────────────────────────────────────────
N_COLS          = 24
N_BANDS         = N_COLS // 2       # 12 unique freq bands (mirrored on plane)
N_SLICES        = 20                # time rows on plane

CAM_X           = WIN_W * 0.50
CAM_Y           = WIN_H * 0.84
FREQ_AXIS_X     = -0.50;  FREQ_AXIS_Y = -0.20
TIME_AXIS_X     =  0.50;  TIME_AXIS_Y = -0.20
FREQ_SPAN       = 340;    TIME_SPAN   = 210

# ── Cube ──────────────────────────────────────────────────────────────────────
CUBE_HS         = 72                # half-side in world units
YAW_SPEED       = 0.011             # radians per frame  (~40°/s at 60 fps)
PITCH           = 0.28              # fixed x-tilt (rad)  ≈ 16°
FACE_G          = 6                 # N×N viridis grid per face
PULSE_SCALE     = 0.20              # bass amplitude → scale multiplier
PULSE_DECAY     = 0.12              # pulse smoothing rate
CAM_DIST        = 520               # perspective focal distance

# cube screen centre — computed to align with the plane's visual midpoint
_pcx = CAM_X + 0.5*FREQ_SPAN*FREQ_AXIS_X + 0.5*TIME_SPAN*TIME_AXIS_X
_pcy = CAM_Y + 0.5*FREQ_SPAN*FREQ_AXIS_Y + 0.5*TIME_SPAN*TIME_AXIS_Y
CUBE_CX         = _pcx              # horizontally over the plane centre
CUBE_CY         = _pcy - 218       # floating above

# ── Edge glow ─────────────────────────────────────────────────────────────────
EDGE_BRIGHT     = QColor(200, 245, 255, 195)   # icy cyan core
EDGE_HALO       = QColor(160, 220, 255,  42)   # soft outer bloom
EDGE_W          = 1.5

# ── Audio ─────────────────────────────────────────────────────────────────────
FFT_SIZE        = 4096
HOP_SIZE        = 256
FREQ_LOW        = 40.0
FREQ_HIGH       = 12000.0
REFRESH_MS      = 16
NORM_DECAY      = 0.9995

# ═════════════════════════════════════════════════════════════════════════════
#  Viridis LUT  (512-entry, pre-baked)
# ═════════════════════════════════════════════════════════════════════════════

_VSTOPS = [
    (0.000, ( 68,   1,  84)), (0.125, ( 70,  50, 127)),
    (0.250, ( 54,  92, 141)), (0.375, ( 39, 127, 142)),
    (0.500, ( 31, 161, 135)), (0.625, ( 74, 194, 109)),
    (0.750, (159, 218,  58)), (1.000, (253, 231,  37)),
]

def _vraw(t):
    t = max(0., min(1., t))
    for i in range(len(_VSTOPS)-1):
        t0,c0=_VSTOPS[i]; t1,c1=_VSTOPS[i+1]
        if t0<=t<=t1:
            f=(t-t0)/(t1-t0)
            return (int(c0[0]+f*(c1[0]-c0[0])),
                    int(c0[1]+f*(c1[1]-c0[1])),
                    int(c0[2]+f*(c1[2]-c0[2])))
    return _VSTOPS[-1][1]

_VIR = [_vraw(i/511) for i in range(512)]
def vir(t): return _VIR[int(max(0., min(1., t)) * 511)]

# ═════════════════════════════════════════════════════════════════════════════
#  Frequency → column mapping  (radial: centre = bass, edges = treble)
# ═════════════════════════════════════════════════════════════════════════════

def _c2b(col):
    c = (N_COLS-1) / 2.
    return min(int(round(abs(col-c)/c*(N_BANDS-1))), N_BANDS-1)

COL_BAND = [_c2b(c) for c in range(N_COLS)]

# ═════════════════════════════════════════════════════════════════════════════
#  Plane projection  (isometric oblique)
# ═════════════════════════════════════════════════════════════════════════════

def pp(ci, si, h=0.):
    """Map (col_index, slice_index, height_px) → screen QPointF."""
    fx = ci / max(N_COLS   - 1, 1)
    tx = si / max(N_SLICES - 1, 1)
    return QPointF(
        CAM_X + fx*FREQ_SPAN*FREQ_AXIS_X + tx*TIME_SPAN*TIME_AXIS_X,
        CAM_Y + fx*FREQ_SPAN*FREQ_AXIS_Y + tx*TIME_SPAN*TIME_AXIS_Y - h)

# ═════════════════════════════════════════════════════════════════════════════
#  Cube geometry
# ═════════════════════════════════════════════════════════════════════════════

# Unit cube: v0-v3 = back (z=-1), v4-v7 = front (z=+1)
#   y+ = up  |  x+ = right  |  z+ = toward camera
_VB = np.array([
    [-1,-1,-1], [ 1,-1,-1], [ 1, 1,-1], [-1, 1,-1],   # back
    [-1,-1, 1], [ 1,-1, 1], [ 1, 1, 1], [-1, 1, 1],   # front
], dtype=np.float64)

# Faces: (TL, TR, BR, BL vertex indices, outward unit normal)
# Ordering is TL→TR→BR→BL when viewed from outside the face.
_FDEF = [
    (7, 6, 5, 4, ( 0,  0,  1)),   # front   z+
    (2, 3, 0, 1, ( 0,  0, -1)),   # back    z−
    (6, 2, 1, 5, ( 1,  0,  0)),   # right   x+
    (3, 7, 4, 0, (-1,  0,  0)),   # left    x−
    (3, 2, 6, 7, ( 0,  1,  0)),   # top     y+
    (4, 5, 1, 0, ( 0, -1,  0)),   # bottom  y−
]

# Simulated directional-light shade per face  (front=full, sides=mid, bottom=dark)
_SHADE = [1.00, 0.50, 0.78, 0.68, 0.90, 0.40]

# 12 edges (index pairs)
_EDGES = [
    (0,1),(1,2),(2,3),(3,0),          # back ring
    (4,5),(5,6),(6,7),(7,4),          # front ring
    (0,4),(1,5),(2,6),(3,7),          # depth connectors
]

def _Ry(t):
    c,s=math.cos(t),math.sin(t)
    return np.array([[c,0,s],[0,1,0],[-s,0,c]])

def _Rx(t):
    c,s=math.cos(t),math.sin(t)
    return np.array([[1,0,0],[0,c,-s],[0,s,c]])

def _cproj(v3, scale):
    """Perspective-project a unit-cube vertex → screen QPointF.
    Camera sits at z = +∞ looking in −z direction.
    z+ in world space = toward viewer."""
    x, y, z = v3 * scale
    d = max(CAM_DIST - z, 1.)
    return QPointF(CUBE_CX + CAM_DIST*x/d,
                   CUBE_CY - CAM_DIST*y/d)   # y+ world = up = screen y−

def _blerp(c4, u, v):
    """Bilinear interpolation on a projected quad.
    c4 = [TL, TR, BR, BL] as QPointF;  u,v ∈ [0,1]."""
    tl, tr, br, bl = c4
    def lp(a, b, t):
        return QPointF(a.x()+(b.x()-a.x())*t, a.y()+(b.y()-a.y())*t)
    return lp(lp(tl,tr,u), lp(bl,br,u), v)

# ═════════════════════════════════════════════════════════════════════════════
#  Audio engine
# ═════════════════════════════════════════════════════════════════════════════

class Sig(QObject):
    frame = pyqtSignal(object)
    done  = pyqtSignal()

class AudioEngine(threading.Thread):
    def __init__(self, fp, nb, sig):
        super().__init__(daemon=True)
        self.fp=fp; self.nb=nb; self.sig=sig; self._stop=False
        self._stream = None   # held so stop() can close it from outside

    def stop(self):
        """Request the engine to stop. Safe to call from any thread."""
        self._stop = True

    def run(self):
        try:
            try:
                audio, sr = sf.read(self.fp, always_2d=True)
            except Exception as e:
                print(f"[Audio] failed to read file: {e}")
                return   # finally block still emits done

            mono = audio.mean(axis=1).astype(np.float32)
            pk   = np.abs(mono).max()
            if pk > 1e-9: mono /= pk

            pos   = [0]
            edges = np.logspace(math.log10(FREQ_LOW),
                                math.log10(min(FREQ_HIGH, sr/2-1)),
                                self.nb+1)
            rmax  = [1e-9]

            def cb(outdata, frames, _t, status):
                chunk = mono[pos[0]:pos[0]+frames].copy()
                if len(chunk) < frames:
                    chunk = np.pad(chunk,(0,frames-len(chunk))); self._stop=True
                outdata[:,0] = chunk; pos[0] += frames

                spec  = np.abs(np.fft.rfft(chunk*np.hanning(len(chunk)), n=FFT_SIZE))
                freqs = np.fft.rfftfreq(FFT_SIZE, 1./sr)
                amps  = np.zeros(self.nb, dtype=np.float32)
                for i in range(self.nb):
                    mask=(freqs>=edges[i])&(freqs<edges[i+1])
                    if mask.any(): amps[i]=spec[mask].mean()
                rmax[0] = max(rmax[0]*NORM_DECAY, float(amps.max()))
                amps   /= rmax[0]
                self.sig.frame.emit(amps)

            try:
                with sd.OutputStream(samplerate=sr, channels=1,
                                     blocksize=HOP_SIZE, callback=cb) as self._stream:
                    while not self._stop:
                        sd.sleep(8)
            except Exception as e:
                print(f"[Audio] stream error: {e}")
            finally:
                self._stream = None

        except Exception as e:
            print(f"[Audio] unexpected error: {e}")
        finally:
            # Always signal done so the widget fades out cleanly
            try:
                self.sig.done.emit()
            except Exception:
                pass

# ═════════════════════════════════════════════════════════════════════════════
#  Main widget
# ═════════════════════════════════════════════════════════════════════════════

class AresCubeOverlay(QWidget):

    def __init__(self):
        super().__init__()
        self._amps    = np.zeros(N_BANDS, dtype=np.float32)
        self._hist    = deque([np.zeros(N_COLS, dtype=np.float32)
                               for _ in range(N_SLICES)], maxlen=N_SLICES)
        self._yaw     = 0.
        self._pulse   = 1.     # current cube scale (bass-driven)
        self._fading  = False
        self._opacity = 1.

        self.setWindowFlags(Qt.WindowType.FramelessWindowHint |
                            Qt.WindowType.WindowStaysOnTopHint |
                            Qt.WindowType.Tool)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setAttribute(Qt.WidgetAttribute.WA_NoSystemBackground)

        scr = QApplication.primaryScreen().geometry()
        self.setGeometry(scr.width()//2  - WIN_W//2,
                         scr.height()//2 - WIN_H//2, WIN_W, WIN_H)

        self._timer = QTimer(self)
        self._timer.timeout.connect(self._tick)
        self._timer.start(REFRESH_MS)

    # ─── Slots ────────────────────────────────────────────────────────────────

    def on_frame(self, amps):
        self._amps = amps
        row = np.array([amps[COL_BAND[c]] for c in range(N_COLS)], dtype=np.float32)
        self._hist.appendleft(row)

    def on_done(self):
        self._fading = True

    # ─── Tick ─────────────────────────────────────────────────────────────────

    def _tick(self):
        # Yaw animation
        self._yaw = (self._yaw + YAW_SPEED) % (2*math.pi)

        # Bass pulse on cube scale
        bass = float(self._amps[0]) if len(self._amps) else 0.
        ts   = 1. + bass * PULSE_SCALE
        self._pulse = self._pulse*(1-PULSE_DECAY) + ts*PULSE_DECAY

        if self._fading:
            self._pulse  = max(1., self._pulse - 0.02)
            self._opacity = max(0., self._opacity - 0.04)
            self.setWindowOpacity(self._opacity)
            if self._opacity <= 0.:
                self._timer.stop(); self.close(); QApplication.quit(); return

        self.update()

    # ─── Paint ────────────────────────────────────────────────────────────────

    def paintEvent(self, _):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)

        # Clear to fully transparent
        p.setCompositionMode(QPainter.CompositionMode.CompositionMode_Source)
        p.fillRect(self.rect(), QColor(0, 0, 0, 0))
        p.setCompositionMode(QPainter.CompositionMode.CompositionMode_SourceOver)

        hist = list(self._hist)

        # ─── Pass 1 : plane heatmap  (back → front) ───────────────────────
        for si in range(N_SLICES-2, -1, -1):
            row = hist[si] if si < len(hist) else np.zeros(N_COLS)
            for ci in range(N_COLS-1, -1, -1):
                amp  = float(row[ci])
                tl=pp(ci,si); tr=pp(ci+1,si); br=pp(ci+1,si+1); bl=pp(ci,si+1)
                if amp > 0.015:
                    rv,gv,bv = vir(amp**0.55); grey=62; blen=amp**0.4
                    fc = QColor(int(grey+(rv-grey)*blen), int(grey+(gv-grey)*blen),
                                int(grey+(bv-grey)*blen), int(180+amp*60))
                else:
                    fc = QColor(54, 56, 64, 168)
                p.setBrush(QBrush(fc))
                p.setPen(QPen(QColor(26,26,34,72), 0.4))
                p.drawPolygon(QPolygonF([tl,tr,br,bl]))

        # ─── Pass 2 : rotating cube ───────────────────────────────────────
        R     = _Rx(PITCH) @ _Ry(self._yaw)
        verts = _VB @ R.T                          # (8,3) rotated unit verts
        scale = CUBE_HS * self._pulse

        # Project all 8 vertices
        sv = [_cproj(verts[i], scale) for i in range(8)]

        # Back-face cull & depth sort
        visible = []
        for fi, (tl_i,tr_i,br_i,bl_i, n0) in enumerate(_FDEF):
            n_rot = np.array(n0, dtype=np.float64) @ R.T
            if n_rot[2] <= 0.: continue            # facing away from camera
            avg_z = (verts[tl_i][2]+verts[tr_i][2]+
                     verts[br_i][2]+verts[bl_i][2]) / 4.
            visible.append((avg_z, fi, tl_i, tr_i, br_i, bl_i))

        visible.sort()                             # ascending z → far first

        for _, fi, tl_i,tr_i,br_i,bl_i in visible:
            self._draw_face(p, [sv[tl_i],sv[tr_i],sv[br_i],sv[bl_i]], _SHADE[fi])

        # ─── Pass 3 : cube edge glow (double-pass bloom) ──────────────────
        p.setBrush(Qt.BrushStyle.NoBrush)
        # Outer bloom
        p.setPen(QPen(EDGE_HALO, EDGE_W*5,
                      Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap))
        for a,b in _EDGES: p.drawLine(sv[a], sv[b])
        # Bright core
        p.setPen(QPen(EDGE_BRIGHT, EDGE_W,
                      Qt.PenStyle.SolidLine, Qt.PenCapStyle.RoundCap))
        for a,b in _EDGES: p.drawLine(sv[a], sv[b])

        p.end()

    # ─── Face renderer ────────────────────────────────────────────────────────

    def _draw_face(self, p, c4, shade):
        """
        Draw one cube face as a FACE_G × FACE_G viridis frequency grid.
        c4 = [TL, TR, BR, BL]  as screen QPointF.
        u axis (gi, left→right) = bass→treble.
        v axis (gj, top→bottom) = subtle brightness ramp.
        """
        G    = FACE_G
        GmI  = max(G-1, 1)
        NbmI = N_BANDS - 1
        p.setPen(QPen(QColor(0,0,0,50), 0.25))

        for gi in range(G):
            # Map column → frequency band (spans full bass→treble range)
            band = min(round(gi/GmI * NbmI), NbmI)
            amp  = float(self._amps[band])

            for gj in range(G):
                u0=gi/G;  u1=(gi+1)/G
                v0=gj/G;  v1=(gj+1)/G
                v_fade = 1. - gj/G * 0.28     # top brighter, bottom dimmer

                if amp < 0.012:
                    rc,gc,bc = 36, 38, 52;  alpha = 158
                else:
                    rc,gc,bc = vir(amp**0.50)
                    alpha    = min(255, 210 + int(amp*38))

                rc = max(0,min(255,int(rc*shade*v_fade)))
                gc = max(0,min(255,int(gc*shade*v_fade)))
                bc = max(0,min(255,int(bc*shade*v_fade)))

                ptl=_blerp(c4,u0,v0); ptr=_blerp(c4,u1,v0)
                pbr=_blerp(c4,u1,v1); pbl=_blerp(c4,u0,v1)

                p.setBrush(QBrush(QColor(rc,gc,bc,alpha)))
                p.drawPolygon(QPolygonF([ptl,ptr,pbr,pbl]))

# ═════════════════════════════════════════════════════════════════════════════
#  Entry
# ═════════════════════════════════════════════════════════════════════════════

def main():
    filepath = sys.argv[1] if len(sys.argv)>1 else DEFAULT_AUDIO
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)

    overlay = AresCubeOverlay()
    signals = Sig()
    engine  = AudioEngine(filepath, N_BANDS, signals)

    signals.frame.connect(overlay.on_frame)
    signals.done.connect(overlay.on_done)

    # Stop the audio engine cleanly whenever the Qt app exits
    app.aboutToQuit.connect(engine.stop)

    print(f"[ARES CUBE]")
    print(f"  cube  : {FACE_G}×{FACE_G} viridis tiles · yaw {YAW_SPEED:.3f} r/f"
          f" · pitch {math.degrees(PITCH):.0f}° · pulse {PULSE_SCALE:.0%}")
    print(f"  plane : {N_COLS}×{N_SLICES} 2D heatmap only")
    print(f"  file  : {filepath}")

    try:
        overlay.show()
        engine.start()
        sys.exit(app.exec())
    except Exception as e:
        print(f"[ARES CUBE] fatal: {e}")
    finally:
        try:
            engine.stop()
        except Exception:
            pass

if __name__ == "__main__":
    main()
