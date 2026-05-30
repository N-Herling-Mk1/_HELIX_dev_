"""
HELIX Backend Helper — helix_gui.py
────────────────────────────────────────────────────────────
PyQt6 system-tray app that manages the local Flask server.
Requires PyQt6 (already installed for TRON Ares RAM Monitor).

    pip install pyqt6 flask flask-cors anthropic

Run:
    python helix_gui.py
────────────────────────────────────────────────────────────
"""

import sys, os, subprocess, webbrowser
from pathlib import Path
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QLineEdit, QTextEdit, QSystemTrayIcon,
    QMenu, QFrame, QGraphicsDropShadowEffect
)
from PyQt6.QtCore  import Qt, QThread, pyqtSignal, QTimer, QPoint, QSize
from PyQt6.QtGui   import QColor, QFont, QIcon, QPixmap, QPainter, QPen, QBrush, QAction

# ── paths ────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).parent
SERVER_PY  = ROOT / "helix_server.py"
EDITOR_URL = ROOT / "editor.html"
ENV_FILE   = ROOT / ".env"
PORT       = 5000

# ── colour palette ───────────────────────────────────────────────────────────
C = {
    "bg":      "#050508",
    "bg2":     "#0a0a12",
    "bg3":     "#0d0d18",
    "border":  "#1a1a2e",
    "border2": "#252540",
    "dim":     "#3a3a5a",
    "text":    "#c8c8e8",
    "text2":   "#606080",
    "accent":  "#00e5ff",
    "ok":      "#00ff41",
    "err":     "#ff2255",
    "warn":    "#ff6a00",
}

STYLESHEET = f"""
QWidget {{
    background: {C['bg']};
    color: {C['text']};
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
}}
QMainWindow {{
    background: {C['bg']};
}}
QFrame#card {{
    background: {C['bg2']};
    border: 1px solid {C['border2']};
}}
QLineEdit {{
    background: {C['bg3']};
    border: 1px solid {C['border2']};
    color: {C['text']};
    padding: 6px 10px;
    selection-background-color: {C['accent']};
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
}}
QLineEdit:focus {{
    border: 1px solid {C['accent']};
}}
QTextEdit {{
    background: {C['bg3']};
    border: 1px solid {C['border']};
    color: {C['accent']};
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    padding: 6px;
}}
QScrollBar:vertical {{
    background: {C['bg2']};
    width: 6px;
    border: none;
}}
QScrollBar::handle:vertical {{
    background: {C['dim']};
    border-radius: 3px;
}}
QMenu {{
    background: {C['bg2']};
    border: 1px solid {C['border2']};
    color: {C['text']};
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    padding: 4px;
}}
QMenu::item:selected {{
    background: {C['border2']};
    color: {C['accent']};
}}
QMenu::separator {{
    height: 1px;
    background: {C['border2']};
    margin: 4px 0;
}}
"""

# ── tray icon (drawn programmatically — no asset needed) ──────────────────────
def make_tray_icon(active: bool) -> QIcon:
    px = QPixmap(32, 32)
    px.fill(Qt.GlobalColor.transparent)
    p  = QPainter(px)
    p.setRenderHint(QPainter.RenderHint.Antialiasing)
    col = QColor(C["ok"] if active else C["err"])
    p.setPen(QPen(col, 2))
    p.setBrush(QBrush(Qt.GlobalColor.transparent))
    # hexagon
    import math
    cx, cy, r = 16, 16, 13
    pts = [(cx + r*math.cos(math.radians(60*i - 30)),
            cy + r*math.sin(math.radians(60*i - 30))) for i in range(6)]
    from PyQt6.QtGui import QPolygonF
    from PyQt6.QtCore import QPointF
    poly = QPolygonF([QPointF(x, y) for x, y in pts])
    p.drawPolygon(poly)
    # inner H
    p.setPen(QPen(col, 2))
    p.drawLine(11, 10, 11, 22)
    p.drawLine(21, 10, 21, 22)
    p.drawLine(11, 16, 21, 16)
    p.end()
    return QIcon(px)


# ── server thread ─────────────────────────────────────────────────────────────
class ServerThread(QThread):
    log_line  = pyqtSignal(str)
    started_  = pyqtSignal()
    stopped_  = pyqtSignal()

    def __init__(self, env: dict):
        super().__init__()
        self.env  = env
        self._proc = None

    def run(self):
        merged = {**os.environ, **self.env}
        self._proc = subprocess.Popen(
            [sys.executable, str(SERVER_PY)],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            env=merged,
            cwd=str(ROOT),
        )
        self.started_.emit()
        for line in self._proc.stdout:
            self.log_line.emit(line.rstrip())
        self._proc.wait()
        self.stopped_.emit()

    def stop(self):
        if self._proc and self._proc.poll() is None:
            self._proc.terminate()
            self._proc.wait(timeout=3)


# ── styled button factory ─────────────────────────────────────────────────────
def make_btn(text: str, color: str = C["accent"], danger: bool = False) -> QPushButton:
    btn = QPushButton(text)
    bg  = "transparent"
    btn.setStyleSheet(f"""
        QPushButton {{
            background: {bg};
            border: 1px solid {color};
            color: {color};
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            letter-spacing: 2px;
            padding: 7px 18px;
        }}
        QPushButton:hover {{
            background: {color}22;
        }}
        QPushButton:pressed {{
            background: {color}44;
        }}
        QPushButton:disabled {{
            border-color: {C['dim']};
            color: {C['dim']};
        }}
    """)
    return btn


# ── label helpers ─────────────────────────────────────────────────────────────
def make_label(text: str, color: str = C["text2"], size: int = 11,
               spacing: str = "2px") -> QLabel:
    lbl = QLabel(text)
    lbl.setStyleSheet(
        f"color:{color}; font-size:{size}px; letter-spacing:{spacing}; background:transparent;"
    )
    return lbl


# ── main window ───────────────────────────────────────────────────────────────
class HelixHelper(QMainWindow):

    def __init__(self):
        super().__init__()
        self._thread: ServerThread | None = None
        self._running = False
        self._load_env()
        self._build_ui()
        self._build_tray()
        self.setWindowTitle("HELIX — Backend Helper")
        self.setFixedSize(520, 660)
        self.setWindowFlags(Qt.WindowType.Window | Qt.WindowType.WindowCloseButtonHint)
        # close → hide to tray
        self.closeEvent = lambda e: (e.ignore(), self.hide())

    # ── env persistence ───────────────────────────────────────────────────────
    def _load_env(self):
        self._api_key = ""
        if ENV_FILE.exists():
            for line in ENV_FILE.read_text().splitlines():
                if line.startswith("ANTHROPIC_API_KEY="):
                    self._api_key = line.split("=", 1)[1].strip()

    def _save_env(self):
        key = self._key_input.text().strip()
        ENV_FILE.write_text(f"ANTHROPIC_API_KEY={key}\n")
        self._api_key = key
        self._log(f"[ENV] API key saved to {ENV_FILE.name}")

    # ── UI ────────────────────────────────────────────────────────────────────
    def _build_ui(self):
        self.setStyleSheet(STYLESHEET)
        root = QWidget(); self.setCentralWidget(root)
        vbox = QVBoxLayout(root); vbox.setContentsMargins(20, 20, 20, 20); vbox.setSpacing(14)

        # header
        title = make_label("HELIX  BACKEND  HELPER", C["accent"], 13, "5px")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        sub   = make_label("LOCAL SERVER MANAGER", C["text2"], 10, "4px")
        sub.setAlignment(Qt.AlignmentFlag.AlignCenter)
        vbox.addWidget(title); vbox.addWidget(sub)

        # divider
        vbox.addWidget(self._divider())

        # status card
        card = QFrame(); card.setObjectName("card")
        cl   = QVBoxLayout(card); cl.setContentsMargins(16, 14, 16, 14); cl.setSpacing(10)

        row1 = QHBoxLayout()
        self._dot   = QLabel("●"); self._dot.setStyleSheet(f"color:{C['err']}; font-size:16px; background:transparent;")
        self._status= make_label("OFFLINE", C["err"], 11, "3px")
        self._port  = make_label(f"PORT {PORT}", C["text2"], 10, "2px")
        row1.addWidget(self._dot); row1.addWidget(self._status); row1.addStretch(); row1.addWidget(self._port)
        cl.addLayout(row1)

        row2 = QHBoxLayout(); row2.setSpacing(10)
        self._btn_start = make_btn("▶  START SERVER", C["ok"])
        self._btn_stop  = make_btn("■  STOP", C["err"])
        self._btn_stop.setEnabled(False)
        self._btn_start.clicked.connect(self._start_server)
        self._btn_stop.clicked.connect(self._stop_server)
        row2.addWidget(self._btn_start); row2.addWidget(self._btn_stop)
        cl.addLayout(row2)

        self._btn_open = make_btn("⬡  OPEN EDITOR IN BROWSER", C["accent"])
        self._btn_open.setEnabled(False)
        self._btn_open.clicked.connect(self._open_editor)
        cl.addWidget(self._btn_open)

        vbox.addWidget(card)

        # api key card
        card2 = QFrame(); card2.setObjectName("card")
        cl2   = QVBoxLayout(card2); cl2.setContentsMargins(16, 14, 16, 14); cl2.setSpacing(8)
        cl2.addWidget(make_label("ANTHROPIC API KEY", C["text2"], 10, "3px"))

        krow = QHBoxLayout(); krow.setSpacing(8)
        self._key_input = QLineEdit(self._api_key)
        self._key_input.setPlaceholderText("sk-ant-...")
        self._key_input.setEchoMode(QLineEdit.EchoMode.Password)
        self._key_input.setMinimumHeight(32)
        btn_show = make_btn("SHOW", C["dim"])
        btn_show.setFixedWidth(60)
        btn_show.setCheckable(True)
        btn_show.toggled.connect(
            lambda on: self._key_input.setEchoMode(
                QLineEdit.EchoMode.Normal if on else QLineEdit.EchoMode.Password
            )
        )
        btn_save = make_btn("SAVE", C["accent2"])
        btn_save.setFixedWidth(64)
        btn_save.clicked.connect(self._save_env)
        krow.addWidget(self._key_input); krow.addWidget(btn_show); krow.addWidget(btn_save)
        cl2.addLayout(krow)
        cl2.addWidget(make_label("Saved to .env in repo root  ·  never committed if .env is in .gitignore", C["dim"], 10, "0px"))
        vbox.addWidget(card2)

        # log panel
        vbox.addWidget(make_label("SERVER LOG", C["text2"], 10, "3px"))
        self._log_box = QTextEdit()
        self._log_box.setReadOnly(True)
        self._log_box.setMinimumHeight(180)
        vbox.addWidget(self._log_box)

        # bottom
        brow = QHBoxLayout()
        btn_clr = make_btn("CLEAR LOG", C["dim"])
        btn_clr.clicked.connect(self._log_box.clear)
        btn_gi  = make_btn(".GITIGNORE CHECK", C["warn"])
        btn_gi.clicked.connect(self._check_gitignore)
        brow.addWidget(btn_clr); brow.addWidget(btn_gi); brow.addStretch()
        vbox.addLayout(brow)

        self._log("HELIX Backend Helper ready.")
        self._log(f"Server script: {SERVER_PY}")
        if not self._api_key:
            self._log("[WARN] No API key found — AI tagging will be disabled.")

    def _divider(self):
        line = QFrame(); line.setFrameShape(QFrame.Shape.HLine)
        line.setStyleSheet(f"color:{C['border2']}; background:{C['border2']}; border:none; max-height:1px;")
        return line

    # ── tray ──────────────────────────────────────────────────────────────────
    def _build_tray(self):
        self._tray = QSystemTrayIcon(make_tray_icon(False), self)
        self._tray.setToolTip("HELIX Backend Helper")

        menu = QMenu()
        act_show  = QAction("Show Window", self); act_show.triggered.connect(self.show)
        act_start = QAction("Start Server", self); act_start.triggered.connect(self._start_server)
        act_stop  = QAction("Stop Server",  self); act_stop.triggered.connect(self._stop_server)
        act_open  = QAction("Open Editor",  self); act_open.triggered.connect(self._open_editor)
        act_quit  = QAction("Quit",         self); act_quit.triggered.connect(self._quit)
        menu.addAction(act_show)
        menu.addSeparator()
        menu.addAction(act_start); menu.addAction(act_stop); menu.addAction(act_open)
        menu.addSeparator()
        menu.addAction(act_quit)
        self._tray.setContextMenu(menu)
        self._tray.activated.connect(lambda r: self.show() if r == QSystemTrayIcon.ActivationReason.DoubleClick else None)
        self._tray.show()

    # ── server control ────────────────────────────────────────────────────────
    def _start_server(self):
        if self._running: return
        key = self._key_input.text().strip()
        env = {"ANTHROPIC_API_KEY": key} if key else {}
        self._thread = ServerThread(env)
        self._thread.log_line.connect(self._log)
        self._thread.started_.connect(self._on_started)
        self._thread.stopped_.connect(self._on_stopped)
        self._thread.start()
        self._log("[SYS] Spawning helix_server.py ...")

    def _stop_server(self):
        if self._thread:
            self._log("[SYS] Sending terminate signal ...")
            self._thread.stop()

    def _on_started(self):
        self._running = True
        self._set_status(True)
        self._log(f"[SYS] Server live → http://localhost:{PORT}")
        # auto-open editor after brief delay
        QTimer.singleShot(1200, lambda: (
            self._open_editor() if not self._btn_open.isEnabled() else None
        ))

    def _on_stopped(self):
        self._running = False
        self._set_status(False)
        self._log("[SYS] Server stopped.")

    def _set_status(self, live: bool):
        col  = C["ok"] if live else C["err"]
        text = "LIVE" if live else "OFFLINE"
        self._dot.setStyleSheet(f"color:{col}; font-size:16px; background:transparent;")
        self._status.setStyleSheet(f"color:{col}; font-size:11px; letter-spacing:3px; background:transparent;")
        self._status.setText(text)
        self._btn_start.setEnabled(not live)
        self._btn_stop.setEnabled(live)
        self._btn_open.setEnabled(live)
        self._tray.setIcon(make_tray_icon(live))
        self._tray.setToolTip(f"HELIX — Server {text}")

    def _open_editor(self):
        url = f"http://localhost:{PORT}/editor"
        # fallback: open editor.html directly as file
        if EDITOR_URL.exists():
            webbrowser.open(EDITOR_URL.as_uri())
        else:
            webbrowser.open(url)

    # ── .gitignore check ──────────────────────────────────────────────────────
    def _check_gitignore(self):
        gi = ROOT / ".gitignore"
        if not gi.exists():
            self._log("[WARN] .gitignore not found! Create one and add .env")
            return
        content = gi.read_text()
        if ".env" in content:
            self._log("[OK]  .gitignore contains .env — API key is safe.")
        else:
            self._log("[WARN] .env is NOT in .gitignore — API key at risk!")
            self._log("       Adding .env to .gitignore now ...")
            with open(gi, "a") as f:
                f.write("\n# HELIX local secrets\n.env\n")
            self._log("[OK]  .env added to .gitignore.")

    # ── log ───────────────────────────────────────────────────────────────────
    def _log(self, line: str):
        self._log_box.append(line)
        sb = self._log_box.verticalScrollBar()
        sb.setValue(sb.maximum())

    # ── quit ──────────────────────────────────────────────────────────────────
    def _quit(self):
        if self._running:
            self._thread.stop()
        self._tray.hide()
        QApplication.quit()


# ── entry point ───────────────────────────────────────────────────────────────
def main():
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)   # keep alive in tray
    app.setApplicationName("HELIX Backend Helper")

    if not SERVER_PY.exists():
        from PyQt6.QtWidgets import QMessageBox
        QMessageBox.critical(None, "HELIX", f"helix_server.py not found at:\n{SERVER_PY}")
        sys.exit(1)

    win = HelixHelper()
    win.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
