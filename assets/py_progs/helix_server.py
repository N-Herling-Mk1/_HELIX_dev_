"""
HELIX Server — helix_server.py
"""
import sys, json, os, subprocess, threading, re, time
from pathlib import Path

try:
    from flask import Flask, send_from_directory, jsonify, request, abort
    from flask_cors import CORS
    from flask_socketio import SocketIO, emit
except ImportError as e:
    pkg = "flask-socketio" if "socketio" in str(e) else           "flask-cors" if "cors" in str(e) else "flask"
    print(f"[ERR] Missing: {pkg}")
    print(f"[FIX] pip install flask flask-cors flask-socketio")
    sys.exit(1)

try:
    import winpty as _winpty
    HAS_PTY = True
except ImportError:
    HAS_PTY = False

SCRIPT_DIR = Path(__file__).parent          # …/assets/py_progs
ROOT       = SCRIPT_DIR.parent.parent       # …/_HELIX_
DATA_FILE  = ROOT / "data" / "helix_data.json"
PREFS_FILE = ROOT / "data" / "user_prefs.json"
DOCS_DIR   = ROOT / "docs"
BULK_DB_DIR      = ROOT / "assets" / "bulk_db"
BULK_DB_MANIFEST = BULK_DB_DIR / "manifest.json"
BULK_DB_ALLOWED  = {"pdf", "docx", "pptx", "xlsx", "csv", "json", "md"}

# Write PID file so kill_helix.bat and the launcher can kill us precisely
_PID_FILE = ROOT / "data" / "server.pid"
try:
    _PID_FILE.parent.mkdir(parents=True, exist_ok=True)
    _PID_FILE.write_text(str(os.getpid()))
    print(f"[HELIX] server PID={os.getpid()}")
except Exception as _e:
    print(f"[HELIX] PID file warning: {_e}")

import atexit as _atexit
@_atexit.register
def _cleanup_pid():
    try: _PID_FILE.unlink(missing_ok=True)
    except Exception: pass

app = Flask(__name__, static_folder=str(ROOT))
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024   # 100 MB upload cap
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

DEFAULT_PREFS = {
    "terminal": {
        "shell":     "cmd.exe",
        "font_size": 13,
        "height":    220,
    }
}

def load_prefs():
    try:
        if PREFS_FILE.exists():
            return json.loads(PREFS_FILE.read_text(encoding="utf-8"))
    except Exception: pass
    return DEFAULT_PREFS.copy()

def save_prefs(data):
    PREFS_FILE.parent.mkdir(parents=True, exist_ok=True)
    PREFS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")

def load_db():
    try:
        if DATA_FILE.exists():
            return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception: pass
    return {s:{"articles":[],"notes":[],"goals":[]} for s in "HELIX"}

def save_db(data):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    _regen_articles_js(data)

def _regen_articles_js(data):
    try:
        lines = ["// AUTO-GENERATED\nconst ARTICLES = {\n"]
        for s in "HELIX":
            d = data.get(s, {})
            lines.append(f"  {s}: {{\n")
            for tab in ("articles","notes","goals"):
                lines.append(f"    {tab}: [\n")
                for item in d.get(tab,[]):
                    lines.append("      "+json.dumps(item)+",\n")
                lines.append("    ],\n")
            lines.append("  },\n")
        lines.append("};\n")
        js = ROOT/"js"/"articles.js"
        if js.parent.exists():
            js.write_text("".join(lines), encoding="utf-8")
    except Exception as e:
        print(f"[WARN] articles.js: {e}")

# ── routes ────────────────────────────────────────────────────────────────────
@app.route("/ping")
def ping(): return jsonify({"status":"ok","helix":True})

@app.route("/")
def index():
    f = ROOT/"main.html"
    return send_from_directory(str(ROOT),"main.html") if f.exists()         else jsonify({"status":"ok"})

@app.route("/editor")
def editor():
    f = ROOT/"editor.html"
    return send_from_directory(str(ROOT),"editor.html") if f.exists()         else ("editor.html not found",404)

@app.route("/control")
def control():
    f = ROOT/"control.html"
    return send_from_directory(str(ROOT),"control.html") if f.exists()         else ("control.html not found",404)

@app.route("/<path:filename>")
def static_files(filename):
    t = ROOT/filename
    if t.exists() and t.is_file():
        return send_from_directory(str(ROOT), filename)
    abort(404)

@app.route("/api/data", methods=["GET"])
def get_data(): return jsonify({"data":load_db()})

@app.route("/api/data", methods=["POST"])
def post_data():
    d = request.get_json()
    if not d or "data" not in d: return jsonify({"error":"missing data"}),400
    save_db(d["data"]); return jsonify({"status":"saved"})

@app.route("/api/prefs", methods=["GET"])
def get_prefs(): return jsonify({"prefs":load_prefs()})

@app.route("/api/prefs", methods=["POST"])
def post_prefs():
    d = request.get_json()
    if not d or "prefs" not in d: return jsonify({"error":"missing prefs"}),400
    save_prefs(d["prefs"]); return jsonify({"status":"saved"})

@app.route("/api/upload", methods=["POST"])
def upload_pdf():
    sm={"h":"hep","e":"epistemic","l":"learning","i":"intelligent","x":"exploration"}
    sector=request.form.get("sector","h").lower()
    folder=DOCS_DIR/sm.get(sector,sector); folder.mkdir(parents=True,exist_ok=True)
    f=request.files.get("file")
    if not f or not f.filename.endswith(".pdf"):
        return jsonify({"error":"PDF required"}),400
    name=os.path.basename(f.filename); f.save(str(folder/name))
    rel=str((folder/name).relative_to(ROOT)).replace("\\","/")
    return jsonify({"status":"uploaded","path":rel,"filename":name})

@app.route("/api/cmd", methods=["POST"])
def run_cmd():
    d=request.get_json(); cmd=d.get("cmd",""); output=""
    try:
        if cmd=="pip_install":
            pkgs=["flask","flask-cors","flask-socketio","pywinpty"]
            r=subprocess.run(
                [sys.executable,"-m","pip","install","--quiet","--exists-action","i"]+pkgs,
                capture_output=True,text=True,timeout=60)
            output=r.stdout+r.stderr
        elif cmd=="gitignore_check":
            gi=ROOT/".gitignore"
            if not gi.exists(): output="[WARN] .gitignore not found"
            elif ".env" in gi.read_text(): output="[OK] .gitignore contains .env"
            else:
                with open(gi,"a") as f: f.write("\n.env\n")
                output="[OK] Added .env to .gitignore"
        else: return jsonify({"error":f"unknown: {cmd}"}),400
        return jsonify({"status":"ok","output":output})
    except Exception as e: return jsonify({"error":str(e),"output":output})

# ── bulk_db: local backend component uploader ────────────────────────────────
def _now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

def _safe_filename(name: str) -> str:
    # strip directory parts, replace unsafe chars, cap length
    name = os.path.basename(name or "")
    name = re.sub(r'[^A-Za-z0-9._-]', '_', name)
    return name[:120] or "unnamed"

def _next_bulk_id(components):
    nums = []
    for c in components:
        m = re.match(r'^bd-(\d+)$', c.get("id",""))
        if m: nums.append(int(m.group(1)))
    n = (max(nums) + 1) if nums else 1
    return f"bd-{n:04d}"

def load_bulk_manifest():
    try:
        if BULK_DB_MANIFEST.exists():
            return json.loads(BULK_DB_MANIFEST.read_text(encoding="utf-8"))
    except Exception: pass
    return {"version": 1, "updated": "", "components": []}

def save_bulk_manifest(m):
    BULK_DB_DIR.mkdir(parents=True, exist_ok=True)
    m["updated"] = _now_iso()
    BULK_DB_MANIFEST.write_text(
        json.dumps(m, indent=2, ensure_ascii=False), encoding="utf-8")

@app.route("/api/bulk_db/list", methods=["GET"])
def bulk_list():
    return jsonify(load_bulk_manifest())

@app.route("/api/bulk_db/upload", methods=["POST"])
def bulk_upload():
    f = request.files.get("file")
    if not f or not f.filename:
        return jsonify({"error": "file required"}), 400
    ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else ""
    if ext not in BULK_DB_ALLOWED:
        return jsonify({"error": f"type '.{ext}' not allowed",
                        "allowed": sorted(BULK_DB_ALLOWED)}), 400

    # form metadata
    name        = (request.form.get("name") or "").strip() or f.filename
    description = (request.form.get("description") or "").strip()
    sectors_raw = request.form.get("sectors") or ""   # comma-sep "H,E"
    sectors     = [s.strip().upper() for s in sectors_raw.split(",")
                   if s.strip().upper() in set("HELIX")]
    tags_raw    = request.form.get("tags") or ""
    tags        = [t.strip() for t in tags_raw.split(",") if t.strip()]

    # save file, resolve name collisions
    BULK_DB_DIR.mkdir(parents=True, exist_ok=True)
    safe = _safe_filename(f.filename)
    dest = BULK_DB_DIR / safe
    if dest.exists():
        stem, suffix = Path(safe).stem, Path(safe).suffix
        i = 1
        while (BULK_DB_DIR / f"{stem}_{i}{suffix}").exists():
            i += 1
        dest = BULK_DB_DIR / f"{stem}_{i}{suffix}"
        safe = dest.name
    f.save(str(dest))

    # append manifest
    m = load_bulk_manifest()
    comp = {
        "id":          _next_bulk_id(m["components"]),
        "name":        name,
        "filename":    safe,
        "path":        f"assets/bulk_db/{safe}",
        "type":        ext,
        "size_bytes":  dest.stat().st_size,
        "sectors":     sectors,
        "tags":        tags,
        "description": description,
        "added":       _now_iso(),
    }
    m["components"].append(comp)
    save_bulk_manifest(m)
    return jsonify({"status": "ok", "component": comp})

@app.route("/api/bulk_db/<comp_id>", methods=["DELETE"])
def bulk_delete(comp_id):
    m = load_bulk_manifest()
    target = next((c for c in m["components"] if c.get("id") == comp_id), None)
    if not target:
        return jsonify({"error": "not found"}), 404
    # remove file from disk
    try: (ROOT / target["path"]).unlink(missing_ok=True)
    except Exception: pass
    # remove from manifest
    m["components"] = [c for c in m["components"] if c.get("id") != comp_id]
    save_bulk_manifest(m)
    return jsonify({"status": "ok", "deleted": comp_id})

# ── terminal ──────────────────────────────────────────────────────────────────
_sessions = {}

def _stream_pty(sid, pty_proc):
    try:
        while True:
            try:
                data = pty_proc.read(1024)
                if data: socketio.emit("term_output",{"data":data},to=sid)
            except EOFError: break
            except Exception: break
    except Exception: pass
    socketio.emit("term_output",
        {"data":"\r\n\x1b[33m[exited]\x1b[0m\r\n"},to=sid)

def _stream_pipe(sid, proc):
    try:
        while True:
            chunk=proc.stdout.read(1)
            if not chunk: break
            if isinstance(chunk,bytes):
                chunk=chunk.decode("utf-8",errors="replace")
            socketio.emit("term_output",{"data":chunk},to=sid)
        proc.wait()
    except Exception as e:
        socketio.emit("term_output",{"data":f"\r\n[error: {e}]\r\n"},to=sid)
    socketio.emit("term_output",
        {"data":"\r\n\x1b[33m[exited]\x1b[0m\r\n"},to=sid)

@socketio.on("connect")
def on_connect():
    sid=request.sid; cwd=str(ROOT)
    prefs=load_prefs(); shell=prefs.get("terminal",{}).get("shell","cmd.exe")
    try:
        if HAS_PTY and sys.platform=="win32":
            pty=_winpty.PtyProcess.spawn(shell,cwd=cwd,dimensions=(24,220))
            t=threading.Thread(target=_stream_pty,args=(sid,pty),daemon=True); t.start()
            _sessions[sid]={"type":"pty","proc":pty,"thread":t}
            # set custom prompt: [folder]>
            pty.write("PROMPT=[$P]$G \r\n")
        else:
            flags=subprocess.CREATE_NO_WINDOW if sys.platform=="win32" else 0
            proc=subprocess.Popen(
                shell,stdin=subprocess.PIPE,stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,bufsize=0,cwd=cwd,
                creationflags=flags if sys.platform=="win32" else 0)
            t=threading.Thread(target=_stream_pipe,args=(sid,proc),daemon=True); t.start()
            _sessions[sid]={"type":"pipe","proc":proc,"thread":t}
            proc.stdin.write(b"PROMPT=[$P]$G \r\n"); proc.stdin.flush()
        emit("term_output",{"data":f"\x1b[2m  {cwd}\x1b[0m\r\n"})
    except Exception as e:
        emit("term_output",{"data":f"\x1b[31m[ERR] {e}\x1b[0m\r\n"})

@socketio.on("disconnect")
def on_disconnect():
    sid=request.sid; sess=_sessions.pop(sid,None)
    if not sess: return
    try: sess["proc"].terminate()
    except Exception: pass

@socketio.on("term_input")
def on_term_input(data):
    sid=request.sid; sess=_sessions.get(sid)
    if not sess: return
    text=data.get("data","")
    try:
        if sess["type"]=="pty":
            sess["proc"].write(text)
        else:
            sess["proc"].stdin.write(text.encode("utf-8",errors="replace"))
            sess["proc"].stdin.flush()
    except Exception as e:
        emit("term_output",{"data":f"\x1b[31m[ERR] {e}\x1b[0m\r\n"})

@socketio.on("term_resize")
def on_term_resize(data):
    sid=request.sid; sess=_sessions.get(sid)
    if not sess: return
    try:
        if sess["type"]=="pty":
            sess["proc"].setwinsize(data.get("rows",24),data.get("cols",220))
    except Exception: pass

@app.route("/api/shutdown", methods=["GET","POST"])
def shutdown():
    import threading, os
    def _stop():
        import time; time.sleep(0.3)
        os._exit(0)
    threading.Thread(target=_stop, daemon=True).start()
    return jsonify({"status":"shutting down"})

if __name__=="__main__":
    print(f"[HELIX] Server → http://localhost:5000")
    socketio.run(app,host="127.0.0.1",port=5000,debug=False,use_reloader=False)
