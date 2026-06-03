/* ═══════════════════════════════════════════════════════════
   HELIX HELP — TERMINAL   help/js/terminal.js

   The top-left "information" panel, styled like a Linux/Windows
   console. Prints a boot sequence, then per-topic technical info
   as typed log lines with a blinking cursor. Purely visual / DOM —
   no audio coupling (the agent on the right does the "talking").

   API:
     var term = HelixTerminal.create(rootEl, { prompt });
     term.boot();                 // one-time boot banner
     term.printTopic(topic);      // type a topic's `terminal` lines
     term.clear();
   ═══════════════════════════════════════════════════════════ */
(function (global) {
  "use strict";

  var doc = global.document;

  function Terminal(root, opts) {
    opts = opts || {};
    this.root = root;
    this.prompt = opts.prompt || "helix@guide:~$";
    this.lineDelay = opts.lineDelay || 70;
    this.gen = 0;
    this._build();
  }

  Terminal.prototype._build = function () {
    this.root.classList.add("ht-term");
    this.root.innerHTML =
      '<div class="ht-bar">' +
        '<span class="ht-dot r"></span><span class="ht-dot y"></span><span class="ht-dot g"></span>' +
        '<span class="ht-title">information — tty/helix</span>' +
      '</div>' +
      '<div class="ht-body" id="ht-body"></div>';
    this.body = this.root.querySelector("#ht-body");
  };

  Terminal.prototype.clear = function () { this.gen++; if (this.body) this.body.innerHTML = ""; return this; };

  Terminal.prototype._row = function (cls) {
    var r = doc.createElement("div");
    r.className = "ht-row" + (cls ? " " + cls : "");
    this.body.appendChild(r);
    this.body.scrollTop = this.body.scrollHeight;
    return r;
  };

  // type one block of lines (array of strings), with a trailing cursor
  Terminal.prototype._typeLines = function (lines) {
    var self = this, myGen = ++this.gen, i = 0;
    function next() {
      if (myGen !== self.gen) return;
      if (i >= lines.length) { self._cursor(); return; }
      var raw = lines[i++];
      var isCmd = /^\$\s/.test(raw) || /\$$/.test(self.prompt) && /^\$/.test(raw);
      var row = self._row(isCmd ? "cmd" : "out");
      if (isCmd) {
        row.innerHTML = '<span class="ht-prompt">' + self._esc(self.prompt) + '</span> ' +
                        '<span class="ht-cmd">' + self._esc(raw.replace(/^\$\s?/, "")) + '</span>';
      } else {
        row.textContent = raw;
      }
      global.setTimeout(next, self.lineDelay);
    }
    next();
    return this;
  };

  Terminal.prototype._cursor = function () {
    var r = this._row("cursor-row");
    r.innerHTML = '<span class="ht-prompt">' + this._esc(this.prompt) + '</span> <span class="ht-cursor">▋</span>';
  };

  Terminal.prototype._esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  Terminal.prototype.boot = function () {
    this.clear();
    return this._typeLines([
      "$ helix init --module help",
      "booting guide subsystem ......... OK",
      "audio bus ....................... READY",
      "agent (PELAGIC) .................. ONLINE",
      "select a topic below to query the system."
    ]);
  };

  Terminal.prototype.printTopic = function (topic) {
    this.clear();
    var lines = (topic && topic.terminal) ? topic.terminal.slice() : ["$ helix --help", "no data."];
    return this._typeLines(lines);
  };

  global.HelixTerminal = {
    create: function (root, opts) { return new Terminal(root, opts || {}); }
  };
})(window);
