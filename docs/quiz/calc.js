/* v34.0 — Scientific Calculator (lazy, boot-safe, loaded by polish.js at idle).
   Full scientific calculator for WAEC/NECO/JAMB: parentheses, ^ , %, !,
   sin/cos/tan (deg·rad), ln, log, √, x², xʸ, π, e, Ans, memory M+/M−/MR/MC,
   live result preview, tap-to-reuse history, keyboard support, implicit
   multiplication. Safe bespoke parser (shunting-yard) — no eval. Additive,
   fails silent. */
(function () {
  "use strict";
  if (window.__calc) return;
  window.__calc = 1;

  var C = { expr: "", deg: true, ans: 0, mem: 0, hist: [] };
  var LOCK = 0;

  function $(id) { return document.getElementById(id); }
  function ls(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var CSS =
    "html.calc .ca-ov{position:fixed;inset:0;z-index:130;background:rgba(8,10,20,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:14px}" +
    "html.calc .ca-box{width:min(360px,100%);max-height:94dvh;overflow:auto;border-radius:22px;background:var(--card-solid,#fdf8ec);border:1px solid rgba(220,184,95,.55);box-shadow:0 46px 100px -34px rgba(0,0,0,.85);padding:14px;color:var(--ink,#20302a)}" +
    "html.calc .ca-h{display:flex;align-items:center;gap:8px;font-size:.95rem;font-weight:800;margin-bottom:8px}" +
    "html.calc .ca-x{margin-left:auto;border:0;background:transparent;color:var(--mut,#8a7a5c);font-size:1rem;cursor:pointer;padding:4px 8px;border-radius:8px}" +
    "html.calc .ca-x:hover{background:rgba(0,0,0,.06)}" +
    "html.calc .ca-flag{font-size:.6rem;font-weight:900;letter-spacing:.08em;border:1px solid var(--card-border,#cbb386);border-radius:99px;padding:3px 8px;color:var(--mut,#8a7a5c);cursor:pointer}" +
    "html.calc .ca-scr{background:var(--panel,#f5efdf);border:1px solid var(--card-border,#e0d3b2);border-radius:14px;padding:9px 12px;text-align:right;margin-bottom:8px;min-height:66px;display:flex;flex-direction:column;justify-content:flex-end}" +
    "html.calc .ca-exp{font-size:.88rem;color:var(--mut,#8a7a5c);min-height:20px;overflow-x:auto;white-space:nowrap;font-family:ui-monospace,Menlo,Consolas,monospace}" +
    "html.calc .ca-res{font-size:1.7rem;font-weight:900;line-height:1.15;color:var(--ink,#20302a);overflow-x:auto;white-space:nowrap;font-family:ui-monospace,Menlo,Consolas,monospace}" +
    "html.calc .ca-res.err{color:#b3261e;font-size:1.1rem}" +
    "html.calc .ca-hist{display:flex;gap:6px;overflow-x:auto;padding:2px 1px 8px}" +
    "html.calc .ca-hi{flex:none;border:1px solid var(--card-border,#e0d3b2);background:var(--opt-bg,#fdf8ec);border-radius:99px;padding:3px 9px;font-size:.62rem;color:var(--ink-2,#4a5877);cursor:pointer;font-family:inherit}" +
    "html.calc .ca-hi b{color:#8a5f24}" +
    "html.calc .ca-pad{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.ca-ex{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:6px 0 0}.ca-ex .ca-k{font-size:12px;padding:9px 4px}" +
    "html.calc .ca-k{border:1px solid var(--card-border,#d5c9a8);background:var(--opt-bg,#fdf8ec);border-radius:12px;padding:11px 2px;font-size:.84rem;font-weight:800;cursor:pointer;color:var(--ink,#20302a);font-family:inherit;transition:transform .12s,background .12s,filter .12s;min-height:40px}" +
    "html.calc .ca-k:hover{background:var(--opt-hover,rgba(201,162,39,.12))}" +
    "html.calc .ca-k:active{transform:scale(.94)}" +
    "html.calc .ca-k.fn{font-size:.7rem;color:var(--ink-2,#4a5877);font-weight:700}" +
    "html.calc .ca-k.op{background:linear-gradient(135deg,#f6ead2,#ecd9a8);border-color:#c9a25f;color:#5b3d09}" +
    "html.calc .ca-k.gold{background:linear-gradient(135deg,#eccf8e,#c9a25f);border-color:transparent;color:#241a05}" +
    "html.calc .ca-k.mem{border-style:dashed}" +
    "html.calc .ca-note{font-size:.6rem;color:var(--mut,#8a7a5c);text-align:center;margin-top:8px}" +
    "@media (max-width:380px){html.calc .ca-k{padding:9px 2px;font-size:.78rem;min-height:37px}}";

  function css() { if (!document.getElementById("caCss")) { var s = document.createElement("style"); s.id = "caCss"; s.textContent = CSS; document.head.appendChild(s); } }

  /* ---------------- tokenizer ---------------- */
  var FUNCS = { sin: 1, cos: 1, tan: 1, ln: 1, log: 1, sqrt: 1, abs: 1 };

  function tokenize(s) {
    var out = [], i = 0;
    while (i < s.length) {
      var ch = s[i];
      if (ch === " " || ch === "\u00a0") { i++; continue; }
      if (/[0-9.]/.test(ch)) {
        var j = i, dot = 0;
        while (j < s.length && (/[0-9.]/.test(s[j]))) { if (s[j] === ".") dot++; j++; }
        if (dot > 1) throw "bad number";
        var num = parseFloat(s.slice(i, j));
        if (!isFinite(num)) throw "bad number";
        out.push({ t: "n", v: num });
        i = j; continue;
      }
      if (/[a-zA-Z]/.test(ch)) {
        var j2 = i;
        while (j2 < s.length && /[a-zA-Z]/.test(s[j2])) j2++;
        var id = s.slice(i, j2).toLowerCase();
        if (id === "pi") out.push({ t: "n", v: Math.PI });
        else if (id === "e") out.push({ t: "n", v: Math.E });
        else if (id === "ans") out.push({ t: "n", v: C.ans });
        else if (id === "deg" || id === "rad") { }
        else if (FUNCS[id]) out.push({ t: "f", v: id });
        else throw "unknown " + id;
        i = j2; continue;
      }
      if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "^" || ch === "(" || ch === ")" || ch === "!" || ch === "%") {
        out.push({ t: ch });
        i++; continue;
      }
      throw "char " + ch;
    }
    // insert implicit multiplication: n or ) or ! or % followed by n, ( or f
    var merged = [];
    for (var k = 0; k < out.length; k++) {
      var tok = out[k];
      var prev = merged[merged.length - 1];
      if (prev && (prev.t === "n" || prev.t === ")" || prev.t === "!" || prev.t === "%") &&
          (tok.t === "n" || tok.t === "(" || tok.t === "f")) {
        merged.push({ t: "*" });
      }
      merged.push(tok);
    }
    return merged;
  }

  /* ---------------- shunting-yard -> RPN ---------------- */
  var PREC = { "+": 1, "-": 1, "*": 2, "/": 2, "u-": 4, "u+": 4, "^": 4, "!": 5, "%": 5 };
  var RIGHT = { "^": 1, "u-": 1, "u+": 1 };

  function toRPN(toks) {
    var out = [], stack = [];
    var prev = null;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t.t === "n") { out.push(t); }
      else if (t.t === "f") { stack.push(t); }
      else if (t.t === "(") { stack.push(t); }
      else if (t.t === ")") {
        while (stack.length && stack[stack.length - 1].t !== "(") out.push(stack.pop());
        if (!stack.length) throw "paren";
        stack.pop();
        if (stack.length && stack[stack.length - 1].t === "f") out.push(stack.pop());
      }
      else if (t.t === "!" || t.t === "%") { out.push(t); }
      else {
        var op = t.t;
        // unary minus/plus
        if (op === "-" || op === "+") {
          var prevIsVal = prev && (prev.t === "n" || prev.t === ")" || prev.t === "!" || prev.t === "%");
          if (!prevIsVal) op = op === "-" ? "u-" : "u+";
        }
        while (stack.length) {
          var top = stack[stack.length - 1];
          if (top.t === "(") break;
          if (top.t === "f") break;
          var pc = PREC[top.t] || 0, oc = PREC[op] || 0;
          if (pc > oc || (pc === oc && !RIGHT[op])) out.push(stack.pop());
          else break;
        }
        stack.push({ t: op });
      }
      prev = t;
    }
    while (stack.length) { var q = stack.pop(); if (q.t === "(") throw "paren"; out.push(q); }
    return out;
  }

  function applyF(f, x) {
    if (f === "sqrt") return Math.sqrt(x);
    if (f === "abs") return Math.abs(x);
    if (f === "ln") return Math.log(x);
    if (f === "log") return Math.log10(x);
    var r = x * (C.deg ? Math.PI / 180 : 1);
    if (f === "sin") return Math.sin(r);
    if (f === "cos") return Math.cos(r);
    if (f === "tan") return Math.tan(r);
    throw "fn";
  }

  function evalRPN(rpn) {
    var st = [];
    for (var i = 0; i < rpn.length; i++) {
      var t = rpn[i];
      if (t.t === "n") { st.push(t.v); continue; }
      if (t.t === "f") { var a = st.pop(); if (a === undefined) throw "args"; st.push(applyF(t.v, a)); continue; }
      if (t.t === "!") {
        var v = st.pop();
        if (v === undefined || v < 0 || v !== Math.floor(v) || v > 170) throw "fact";
        var r = 1; for (var k2 = 2; k2 <= v; k2++) r *= k2;
        st.push(r); continue;
      }
      if (t.t === "%") { var v2 = st.pop(); st.push((v2 === undefined ? 0 : v2) / 100); continue; }
      if (t.t === "u-") { st.push(-(st.pop() || 0)); continue; }
      if (t.t === "u+") { st.push(st.pop() || 0); continue; }
      var b = st.pop(), a2 = st.pop();
      if (a2 === undefined || b === undefined) throw "args";
      if (t.t === "+") st.push(a2 + b);
      else if (t.t === "-") st.push(a2 - b);
      else if (t.t === "*") st.push(a2 * b);
      else if (t.t === "/") st.push(a2 / b);
      else if (t.t === "^") st.push(Math.pow(a2, b));
      else throw "op";
    }
    if (st.length !== 1) throw "stack";
    return st[0];
  }

  function compute(s) {
    if (!s || !s.trim()) return null;
    try {
      var r = evalRPN(toRPN(tokenize(s)));
      return isFinite(r) ? r : NaN;
    } catch (e) { return NaN; }
  }

  function fmt(v) {
    if (!isFinite(v)) return "Error";
    if (v === 0) return "0";
    var a = Math.abs(v);
    if (a >= 1e12 || a < 1e-9) { var e = v.toExponential(8); return e.replace(/\.?0+e/, "e"); }
    var s = String(Number(v.toPrecision(12)));
    return s;
  }

  /* ---------------- state ---------------- */
  function paint() {
    $("caExp").textContent = C.expr || "0";
    var r = compute(C.expr);
    var res = $("caRes");
    if (r === null) { res.textContent = "…"; res.classList.remove("err"); }
    else if (isNaN(r)) { res.textContent = "Error"; res.classList.add("err"); }
    else { res.textContent = fmt(r); res.classList.remove("err"); }
    var flag = $("caFlag");
    if (flag) flag.textContent = C.deg ? "DEG" : "RAD";
    var hist = $("caHist");
    if (hist) {
      hist.innerHTML = C.hist.slice(-6).map(function (h, i) {
        return '<button type="button" class="ca-hi" data-i="' + i + '" title="Tap to reuse">' + esc(String(h[0]).slice(0, 22)) + " <b>=</b> " + esc(h[1]) + "</button>";
      }).join("");
      Array.prototype.forEach.call(hist.querySelectorAll(".ca-hi"), function (b) {
        b.onclick = function () {
          var h = C.hist[+b.getAttribute("data-i")];
          if (h) { C.expr = h[1]; paint(); }
        };
      });
    }
  }

  function press(k) {
    if (LOCK) return;
    if (k === "AC") { C.expr = ""; }
    else if (k === "back") { C.expr = C.expr.slice(0, -1); }
    else if (k === "=") { commit(); return; }
    else if (k === "deg") { C.deg = !C.deg; }
    else if (k === "ans") { C.expr = (C.expr || "") + "Ans"; }
    else if (k === "m+") { var r0 = compute(C.expr); if (r0 !== null && !isNaN(r0)) C.mem += r0; }
    else if (k === "m-") { var r1 = compute(C.expr); if (r1 !== null && !isNaN(r1)) C.mem -= r1; }
    else if (k === "mr") { C.expr = (C.expr || "") + String(C.mem); }
    else if (k === "mc") { C.mem = 0; }
    else if (k === "1/x") { C.expr = "1/(" + (C.expr || "0") + ")"; }
    else if (k === "x2") { C.expr = (C.expr || "") + "^2"; }
    else if (k === "pow") { C.expr = (C.expr || "") + "^"; }
    else {
      if (k === "(" && /\($/.test(C.expr)) { paint(); return; }
      var map = { "×": "*", "÷": "/", "−": "-" };
      C.expr = (C.expr || "") + (map[k] || k);
    }
    paint();
  }

  function commit() {
    var r = compute(C.expr);
    if (r === null || isNaN(r)) {
      var res = $("caRes");
      res.textContent = "Error";
      res.classList.add("err");
      return;
    }
    C.ans = r;
    var s = fmt(r);
    if (C.expr.trim()) C.hist.push([C.expr.trim(), s]);
    C.expr = s;
    lss("nssc_calc_hist", C.hist.slice(-20));
    paint();
  }

  /* ---------------- keyboard ---------------- */
  function key(e) {
    if (!document.getElementById("caOv")) return;
    var k = e.key;
    if (k === "Enter" || k === "=") { press("="); e.preventDefault(); }
    else if (k === "Backspace") { press("back"); e.preventDefault(); }
    else if (k === "Escape") { close(); }
    else if (/^[0-9.]$/.test(k)) { press(k); }
    else if (k === "+" || k === "-" || k === "*" || k === "/" || k === "^" || k === "(" || k === ")" || k === "%") { press(k); e.preventDefault(); }
    else if (k === "!") { press("!"); e.preventDefault(); }
    else if (k === "Delete") { press("AC"); e.preventDefault(); }
  }

  /* ---------------- open/close ---------------- */
  function open() {
    css();
    document.documentElement.classList.add("calc");
    var ov = $("caOv");
    if (ov) { ov.style.display = "flex"; paint(); return; }
    ov = document.createElement("div");
    ov.id = "caOv";
    ov.className = "ca-ov";
    ov.setAttribute("aria-label", "Scientific Calculator");
    var rows = [
      ["AC", "ac"], ["⌫", "ac"], ["(", "fn"], [")", "fn"], ["÷", "op"],
      ["sin", "fn"], ["cos", "fn"], ["tan", "fn"], ["ln", "fn"], ["log", "fn"],
      ["7", ""], ["8", ""], ["9", ""], ["%", "fn"], ["×", "op"],
      ["4", ""], ["5", ""], ["6", ""], ["√", "fn"], ["−", "op"],
      ["1", ""], ["2", ""], ["3", ""], ["x²", "fn"], ["+", "op"],
      ["0", ""], [".", ""], ["xʸ", "fn"], ["!", "fn"], ["=", "gold"]
    ];
    var pad = rows.map(function (r) {
      var label = r[0], cls = r[1];
      var dk = label;
      if (label === "√") dk = "sqrt(";
      else if (label === "x²") dk = "x2";
      else if (label === "xʸ") dk = "pow";
      else if (label === "%") dk = "%";
      else if (label === "AC" || label === "⌫") dk = label === "AC" ? "AC" : "back";
      else if (label === "÷") dk = "÷";
      else if (label === "×") dk = "×";
      else if (label === "−") dk = "−";
      else if (label === "sin" || label === "cos" || label === "tan" || label === "ln" || label === "log") dk = label + "(";
      return '<button type="button" class="ca-k ' + cls + '" data-k="' + dk + '">' + label + "</button>";
    }).join("");
    var ex =
      '<button type="button" class="ca-k fn" data-k="ans" title="Last answer">Ans</button>' +
      '<button type="button" class="ca-k fn" data-k="π">π</button>' +
      '<button type="button" class="ca-k fn" data-k="e">e</button>' +
      '<button type="button" class="ca-k mem" data-k="m+" title="Add to memory">M+</button>' +
      '<button type="button" class="ca-k mem" data-k="m-" title="Subtract from memory">M−</button>' +
      '<button type="button" class="ca-k mem" data-k="mr" title="Recall memory">MR</button>' +
      '<button type="button" class="ca-k mem" data-k="mc" title="Clear memory">MC</button>';
    ov.innerHTML =
      '<div class="ca-box" role="dialog" aria-label="Scientific Calculator">' +
        '<div class="ca-h"><span>🧮 Scientific Calculator</span><button type="button" class="ca-flag" id="caFlag" title="Toggle angle mode">DEG</button><button class="ca-x" id="caX" aria-label="Close">✕</button></div>' +
        '<div class="ca-scr"><div class="ca-exp" id="caExp">0</div><div class="ca-res" id="caRes">…</div></div>' +
        '<div class="ca-hist" id="caHist"></div>' +
        '<div class="ca-pad">' + pad + "</div>" +
        '<div class="ca-ex">' + ex + "</div>" +
        '<div class="ca-note">Keyboard ready · Enter =, Backspace edits, Esc closes · π and e type as pi / e</div>' +
      "</div>";
    document.body.appendChild(ov);
    $("caX").onclick = close;
    $("caFlag").onclick = function () { press("deg"); };
    Array.prototype.forEach.call(ov.querySelectorAll(".ca-k"), function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-k");
        if (k === "π") press("pi");
        else if (k === "e") press("e");
        else press(k);
      });
    });
    ov.onclick = function (e) { if (e.target === ov) close(); };
    C.hist = ls("nssc_calc_hist", []) || [];
    C.expr = "";
    lock();
    paint();
  }
  function lock() { LOCK = 0; }
  function close() {
    var ov = $("caOv");
    if (ov) { try { ov.remove(); } catch (e) {} }
  }

  /* ---------------- boot ---------------- */
  function boot() {
    css();
    try { document.documentElement.classList.add("calc"); } catch (e) {}
    try { document.addEventListener("keydown", key); } catch (e) {}
    try { hooks(); } catch (e) {}
    try { chips(); } catch (e) {}
    window.__calcApi = { press: press, compute: compute, state: C, open: open, close: close };
  }
  function chips() {
    var w = document.getElementById("examChip");
    var host = w ? null : document.querySelector(".hero-copy");
    if (!w && !host) return;
    function mk(id, emo, t, sub, fn) {
      var b = document.createElement("button");
      b.type = "button"; b.id = id;
      b.className = "ex-tile bt-chip";
      b.innerHTML = emo + " <span>" + t + "<small>" + sub + "</small></span>";
      b.addEventListener("click", fn);
      return b;
    }
    var b = mk("calcLaunch", "🧮", "Calculator", "Scientific · WAEC/JAMB ready", function () { open(); });
    if (w) w.insertBefore(b, w.lastChild);
    else {
      var grp = document.createElement("div");
      grp.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:8px";
      grp.appendChild(b);
      host.insertBefore(grp, host.querySelector(".stats"));
    }
  }
  function hooks() {
    var h = function (add) {
      add("Tools", "🧮", "Scientific Calculator", "Full scientific — trig, logs, powers, memory", function () { open(); });
    };
    if (window.__proPalHooks && window.__proPalHooks.push) window.__proPalHooks.push(h);
    else window.__proPalHooks = [h];
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
