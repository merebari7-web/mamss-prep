/* v33.0 — Holo 3D Lab (lazy, boot-safe, loaded by polish.js at idle).
   Adds: 🧬 3D Molecule Viewer (orbit/zoom/auto-rotate, CPK colours, single/
   double/triple bonds, 8 classic molecules), 📈 3D Surface Plotter
   (interactive z=f(x,y) graphs — waves, saddle, bowl, cone, ripple, dome),
   🪐 Orbital Solar System (8 planets, correct relative periods, Saturn's
   ring, speed + labels controls). Pure canvas 2D — no WebGL, works offline.
   Additive, fails silent. */
(function () {
  "use strict";
  if (window.__holo) return;
  window.__holo = 1;

  var K = "nssc_holo";

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------------- data ---------------- */
  var EL = {
    H: { c: "#eef0f5", r: 0.34, n: "Hydrogen" },
    C: { c: "#3d4148", r: 0.62, n: "Carbon" },
    N: { c: "#3f6ff0", r: 0.58, n: "Nitrogen" },
    O: { c: "#e04646", r: 0.56, n: "Oxygen" },
    Cl: { c: "#2fae4e", r: 0.62, n: "Chlorine" },
    Na: { c: "#b06ad6", r: 0.58, n: "Sodium" },
    S: { c: "#e8c33f", r: 0.7, n: "Sulphur" },
    Cl: { c: "#2fbf4f", r: 0.72, n: "Chlorine" }
  };
  var MOLS = [
    { n: "Water", f: "H₂O", a: [["O", 0, 0, 0], ["H", 0.76, 0.59, 0], ["H", -0.76, 0.59, 0]], b: [[0, 1, 1], [0, 2, 1]] },
    { n: "Carbon dioxide", f: "CO₂", a: [["C", 0, 0, 0], ["O", 1.16, 0, 0], ["O", -1.16, 0, 0]], b: [[0, 1, 2], [0, 2, 2]] },
    { n: "Ammonia", f: "NH₃", a: [["N", 0, 0.12, 0], ["H", 0, -0.41, 0.87], ["H", 0.75, -0.41, -0.43], ["H", -0.75, -0.41, -0.43]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
    { n: "Methane", f: "CH₄", a: [["C", 0, 0, 0], ["H", 0.63, 0.63, 0.63], ["H", -0.63, -0.63, 0.63], ["H", -0.63, 0.63, -0.63], ["H", 0.63, -0.63, -0.63]], b: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
    { n: "Oxygen", f: "O₂", a: [["O", 0.6, 0, 0], ["O", -0.6, 0, 0]], b: [[0, 1, 2]] },
    { n: "Nitrogen", f: "N₂", a: [["N", 0.55, 0, 0], ["N", -0.55, 0, 0]], b: [[0, 1, 3]] },
    { n: "Hydrogen", f: "H₂", a: [["H", 0.37, 0, 0], ["H", -0.37, 0, 0]], b: [[0, 1, 1]] },
    { n: "Ethanol", f: "C₂H₅OH", a: [["C", 0, 0, 0], ["C", 1.45, 0, 0], ["O", 2.75, 0.35, 0], ["H", -0.75, 0, 0.9], ["H", 0.5, 0.95, 0.6], ["H", 0.5, -0.95, -0.6], ["H", 1.95, 0.9, -0.5], ["H", 1.5, -0.9, 0.6], ["H", 3.45, 1.15, 0.1]], b: [[0, 1, 1], [0, 3, 1], [0, 4, 1], [0, 5, 1], [1, 2, 1], [1, 6, 1], [1, 7, 1], [2, 8, 1]] },
    { n: "Sodium chloride", f: "NaCl", a: (function () {
      var out = [];
      for (var ix = -1; ix <= 1; ix++) for (var iy = -1; iy <= 1; iy++) for (var iz = 0; iz <= 1; iz++) {
        var par = (Math.abs(ix) + Math.abs(iy) + iz) % 2;
        out.push([par ? "Cl" : "Na", ix * 1.0, iy * 1.0, iz * 1.0 - 0.5]);
      }
      return out;
    })(), b: (function () {
      var out = [], pts = [];
      for (var ix = -1; ix <= 1; ix++) for (var iy = -1; iy <= 1; iy++) for (var iz = 0; iz <= 1; iz++) pts.push([ix, iy, iz]);
      for (var i = 0; i < pts.length; i++) for (var j = i + 1; j < pts.length; j++) {
        var d = Math.abs(pts[i][0] - pts[j][0]) + Math.abs(pts[i][1] - pts[j][1]) + Math.abs(pts[i][2] - pts[j][2]);
        if (d === 1) out.push([i, j, 1]);
      }
      return out;
    })() },
    { n: "Benzene", f: "C₆H₆", a: (function () {
      var out = [], i;
      for (i = 0; i < 6; i++) { var a = i * Math.PI / 3; out.push(["C", 1.39 * Math.cos(a), 0, 1.39 * Math.sin(a)]); }
      for (i = 0; i < 6; i++) { var a2 = i * Math.PI / 3 + Math.PI / 6; out.push(["H", 2.5 * Math.cos(a2), 0, 2.5 * Math.sin(a2)]); }
      return out;
    })(), b: (function () {
      var out = [], i;
      for (i = 0; i < 6; i++) { out.push([i, (i + 1) % 6, 1.5]); out.push([i, 6 + i, 1]); }
      return out;
    })() }
  ];
  var SURFS = [
    { n: "Rolling Waves", h: 205, f: function (x, y) { return 1.7 * Math.sin(1.5 * x) * Math.cos(1.5 * y); } },
    { n: "Saddle Point", h: 265, f: function (x, y) { return (x * x - y * y) / 3.4; } },
    { n: "Golden Bowl", h: 42, f: function (x, y) { return (x * x + y * y) / 3.4 - 0.7; } },
    { n: "Cone", h: 160, f: function (x, y) { return 0.95 * Math.sqrt(x * x + y * y + 0.01) - 1.5; } },
    { n: "Ripple Rings", h: 330, f: function (x, y) { var r = Math.sqrt(x * x + y * y); return 2.6 * Math.sin(2.8 * r) / (0.6 + r); } },
    { n: "Sky Dome", h: 96, f: function (x, y) { return Math.sqrt(Math.max(0, 3.4 * 3.4 - x * x - y * y)) / 2.4 - 0.4; } },
    { n: "Wind over Waves", h: 210, f: function (x, y) { return 0.9 * Math.sin(2.4 * x + 0.8 * y) + 0.6 * Math.cos(2.0 * y - 0.5 * x); } },
    { n: "Twin Peaks", h: 232, f: function (x, y) { return 2.9 * Math.exp(-0.42 * (x * x + y * y)) - 2.1 * Math.exp(-0.5 * ((x - 1.35) * (x - 1.35) + (y + 1.1) * (y + 1.1))) - 0.5; } }
  ];
  var PLANETS = [
    { n: "Mercury", r: 0.11, o: 2.3, p: 3.1, c: "#b9977f", ph: 0.4 },
    { n: "Venus", r: 0.19, o: 3.15, p: 5.4, c: "#e8c46a", ph: 2.1 },
    { n: "Earth", r: 0.21, o: 4.1, p: 8.7, c: "#4f9ff0", ph: 4.2 },
    { n: "Mars", r: 0.15, o: 5.05, p: 13.7, c: "#e07b4f", ph: 5.5 },
    { n: "Jupiter", r: 0.44, o: 6.5, p: 23.2, c: "#d9a066", ph: 1.2 },
    { n: "Saturn", r: 0.37, o: 7.8, p: 32.1, c: "#e6cf8a", ph: 3.3, ring: 0.58 },
    { n: "Uranus", r: 0.27, o: 9.1, p: 48, c: "#8fd0d9", ph: 0.9 },
    { n: "Neptune", r: 0.26, o: 10.2, p: 60, c: "#5f7fe0", ph: 2.6, i: "Windiest world — supersonic winds over 2,000 km/h; 165 Earth-years per orbit." }
  ];
  var MOON = { n: "Moon", r: 0.058, o: 4.42, p: 0.7, c: "#c3c9d4" };
  var INFOS = {
    Mercury: "Smallest planet, no moons; a year lasts just 88 Earth-days.",
    Venus: "Hottest planet (about 465 °C) — a runaway greenhouse of CO₂, spinning backwards.",
    Earth: "Our home — the only known world with liquid-water oceans and life.",
    Mars: "The red planet — rusted dust, the tallest volcano (Olympus Mons) and ancient riverbeds.",
    Jupiter: "The giant — 1,300 Earths fit inside; the Great Red Spot is a storm 350+ years old.",
    Saturn: "The ringed beauty — rings of ice and rock 280,000 km wide yet only about 10 m thick.",
    Uranus: "An ice giant tipped on its side, spinning at 98° to its orbit.",
    Neptune: "Windiest world — supersonic winds over 2,000 km/h; 165 Earth-years per orbit.",
    Moon: "Earth's only natural satellite — 384,400 km away and always shows us one face."
  };

  var TAB = "mol";
  var M = { yaw: 0.7, pitch: 0.32, zoom: 1, auto: true, idx: 0 };
  var S = { yaw: 0.7, pitch: 0.55, zoom: 1, auto: true, idx: 0 };
  var O = { auto: true, speed: 1.4, labels: true, t: 0, zoom: 1 };
  var on = false, raf = 0, lastT = 0, rm = false;

  var CSS =
    "html.holo .ho-ov{position:fixed;inset:0;z-index:129;background:rgba(8,10,20,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:14px}" +
    "html.holo .ho-box{width:min(760px,100%);max-height:94dvh;overflow:auto;border-radius:20px;background:var(--card-solid,#fdf8ec);border:1px solid rgba(220,184,95,.5);box-shadow:0 40px 90px -30px rgba(0,0,0,.8);padding:14px;color:var(--ink,#20302a)}" +
    "html.holo .ho-h{display:flex;align-items:center;gap:8px;font-size:1.02rem;font-weight:800;margin-bottom:2px}" +
    "html.holo .ho-x{margin-left:auto;border:0;background:transparent;color:var(--mut,#8a7a5c);font-size:1rem;cursor:pointer;padding:4px 8px;border-radius:8px}" +
    "html.holo .ho-x:hover{background:rgba(0,0,0,.06)}" +
    "html.holo .ho-sub{font-size:.7rem;color:var(--mut,#8a7a5c);margin-bottom:10px}" +
    "html.holo .ho-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px}" +
    "html.holo .ho-tab{border:1px solid var(--card-border,#cbb386);background:transparent;border-radius:99px;padding:6px 13px;font-size:.72rem;font-weight:800;cursor:pointer;color:var(--ink,#20302a);font-family:inherit;transition:all .15s}" +
    "html.holo .ho-tab.on{background:linear-gradient(135deg,#f0dca6,#c9a25f);color:#241a05;border-color:transparent}" +
    "html.holo .ho-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;min-height:30px}" +
    "html.holo .ho-chip{border:1px solid var(--card-border,#cbb386);background:var(--opt-bg,#fdf8ec);border-radius:99px;padding:5px 11px;font-size:.68rem;font-weight:700;cursor:pointer;color:var(--ink,#20302a);font-family:inherit}" +
    "html.holo .ho-chip.on{background:var(--opt-hover,rgba(201,162,39,.14));border-color:#c9a25f}" +
    "html.holo .ho-cvwrap{position:relative;border:1px solid var(--card-border,#d8cbab);border-radius:16px;overflow:hidden;background:radial-gradient(120% 90% at 50% 0%,#131b30 0%,#0a0f1e 70%)}" +
    "html.holo .ho-cv{display:block;width:100%;height:min(52dvh,440px);min-height:260px;touch-action:none;cursor:grab}" +
    "html.holo .ho-cv:active{cursor:grabbing}" +
    "html.holo .ho-hint{position:absolute;left:10px;bottom:8px;font-size:.6rem;color:rgba(244,227,178,.55);letter-spacing:.04em;pointer-events:none}" +
    "html.holo .ho-ctl{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:9px}" +
    "html.holo .ho-btn{border:1px solid var(--card-border,#cbb386);background:var(--opt-bg,#fdf8ec);border-radius:99px;padding:6px 12px;font-size:.72rem;font-weight:800;cursor:pointer;color:var(--ink,#20302a);font-family:inherit}" +
    "html.holo .ho-btn.on{background:linear-gradient(135deg,#f0dca6,#c9a25f);color:#241a05;border-color:transparent}" +
    "html.holo .ho-btn.sq{min-width:34px;padding:6px 9px}" +
    "html.holo .ho-spd{display:flex;align-items:center;gap:8px;font-size:.7rem;color:var(--mut,#8a7a5c)}" +
    "html.holo .ho-spd input{flex:1;min-width:110px;accent-color:#c9a25f}" +
    "html.holo .ho-info{font-size:.72rem;color:var(--mut,#8a7a5c);margin-top:6px;text-align:center;padding:5px 8px;border-radius:9px;transition:background .3s,border-color .3s;border:1px solid transparent}" +
    "html.holo .ho-info.on{color:var(--ink,#20302a);background:rgba(201,162,39,.16);border-color:#c9a25f}" +
    "html.holo .ho-f{position:absolute;top:10px;left:12px;font-size:.74rem;font-weight:800;color:#f4e3b2;letter-spacing:.05em;text-shadow:0 2px 8px rgba(0,0,0,.6)}" +
    "@media (max-width:640px){html.holo .ho-cv{height:min(48dvh,380px)}html.holo .ho-chip{padding:4px 9px;font-size:.64rem}}" +
    "@media (prefers-reduced-motion:no-preference){html.holo .ho-cvwrap::after{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(90% 60% at 50% -10%,rgba(220,184,95,.12),transparent 60%)}}";

  function css() { if (!document.getElementById("hoCss")) { var s = document.createElement("style"); s.id = "hoCss"; s.textContent = CSS; document.head.appendChild(s); } }

  /* ---------------- helpers ---------------- */
  function hx(c) { c = c.replace("#", ""); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }
  function mix(c1, c2, t) { var a = hx(c1), b = hx(c2), o = []; for (var i = 0; i < 3; i++) o[i] = Math.round(a[i] + (b[i] - a[i]) * t); return "rgb(" + o.join(",") + ")"; }
  function sh(c, amt) { var a = hx(c); var o = []; for (var i = 0; i < 3; i++) o[i] = Math.round(clamp(a[i] + amt, 0, 255)); return "rgb(" + o.join(",") + ")"; }

  function fit() {
    var cv = $("hoCv");
    if (!cv) return null;
    var r = cv.getBoundingClientRect();
    var w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h) return null;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    var x = cv.getContext("2d");
    if (x && x.setTransform) { try { x.setTransform(dpr, 0, 0, dpr, 0, 0); } catch (e) {} }
    return { x: x, w: w, h: h };
  }

  /* rotate + project; returns [sx, sy, depth, k] */
  function prj(p, cam) {
    var ca = Math.cos(cam.yaw), sa = Math.sin(cam.yaw);
    var cb = Math.cos(cam.pitch), sb = Math.sin(cam.pitch);
    var x1 = p[0] * ca + p[2] * sa, z1 = -p[0] * sa + p[2] * ca;
    var y1 = p[1] * cb - z1 * sb, z2 = p[1] * sb + z1 * cb;
    return [x1, y1, z2];
  }

  /* ---------------- molecules ---------------- */
  var molMax = 2, molCent = [0, 0, 0];
  function molNorm() {
    var m = MOLS[M.idx], i, cx = 0, cy = 0, cz = 0;
    for (i = 0; i < m.a.length; i++) { cx += m.a[i][1]; cy += m.a[i][2]; cz += m.a[i][3]; }
    cx /= m.a.length || 1; cy /= m.a.length || 1; cz /= m.a.length || 1;
    var mx = 0.9;
    for (i = 0; i < m.a.length; i++) {
      var dx = m.a[i][1] - cx, dy = m.a[i][2] - cy, dz = m.a[i][3] - cz;
      mx = Math.max(mx, Math.sqrt(dx * dx + dy * dy + dz * dz));
    }
    molMax = mx; molCent = [cx, cy, cz];
    return m;
  }
  function molPaint(env) {
    var x = env.x, W = env.w, H = env.h;
    var m = molNorm();
    x.clearRect(0, 0, W, H);
    var R0 = (Math.min(W, H) / molMax) * 0.40 * M.zoom;
    var cx = W / 2, cy = H / 2;
    var P = [], i, j;
    for (i = 0; i < m.a.length; i++) {
      var q = prj([(m.a[i][1] - molCent[0]) / molMax, (m.a[i][2] - molCent[1]) / molMax, (m.a[i][3] - molCent[2]) / molMax], M);
      var k = 8 / (8 - q[2]);
      P.push([cx + q[0] * k * R0, cy - q[1] * k * R0, q[2], k, i]);
    }
    var bonds = [];
    for (i = 0; i < m.b.length; i++) {
      var b = m.b[i], A = P[b[0]], B = P[b[1]];
      bonds.push({ A: A, B: B, o: b[2], d: (A[2] + B[2]) / 2 });
    }
    bonds.sort(function (u, v) { return v.d - u.d; });
    for (i = 0; i < bonds.length; i++) {
      var bd = bonds[i], A = bd.A, B = bd.B;
      var elA = EL[m.a[bd.A[4]][0]], elB = EL[m.a[bd.B[4]][0]];
      var col = mix(elA.c, elB.c, 0.5);
      var wd = (1.7 + 0.9 * (1 - (bd.d + 1) / 2)) * A[3];
      var dx = B[0] - A[0], dy = B[1] - A[1];
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var px = -dy / len, py = dx / len;
      var off = 1.9 * ((A[3] + B[3]) / 2);
      var lines = bd.o >= 3 ? [-off, 0, off] : bd.o >= 2 ? [-off * 0.8, off * 0.8] : [0];
      for (j = 0; j < lines.length; j++) {
        x.beginPath();
        x.moveTo(A[0] + px * lines[j] * 2, A[1] + py * lines[j] * 2);
        x.lineTo(B[0] + px * lines[j] * 2, B[1] + py * lines[j] * 2);
        x.lineWidth = wd * (bd.o >= 2 && bd.o !== 1.5 ? 0.8 : 1);
        x.strokeStyle = sh(col, bd.o >= 2 ? -14 : -24);
        x.globalAlpha = bd.o === 1.5 ? 0.6 : clamp(0.55 + (1 - (bd.d + 1) / 2) * 0.45, 0.5, 1);
        x.stroke();
      }
      x.globalAlpha = 1;
    }
    P.sort(function (u, v) { return v[2] - u[2]; });
    for (i = 0; i < P.length; i++) {
      var at = P[i], el = EL[m.a[at[4]][0]];
      var r = el.r * at[3] * R0 * 1.35;
      var g = x.createRadialGradient(at[0] - r * 0.35, at[1] - r * 0.42, r * 0.12, at[0], at[1], r);
      g.addColorStop(0, sh(el.c, 70));
      g.addColorStop(0.65, el.c);
      g.addColorStop(1, sh(el.c, -46));
      x.beginPath();
      x.arc(at[0], at[1], r, 0, 6.2832);
      x.fillStyle = g;
      x.fill();
      x.lineWidth = 1;
      x.strokeStyle = "rgba(0,0,0,.35)";
      x.stroke();
      if (m.a.length <= 6) {
        x.fillStyle = "#fff";
        x.font = "700 " + Math.max(9, r * 0.75) + "px system-ui,sans-serif";
        x.textAlign = "center";
        x.fillText(m.a[at[4]][0], at[0], at[1] + r * 0.27);
      }
    }
    var f = $("hoMola");
    if (f) f.textContent = m.n + " · " + m.f;
  }

  /* ---------------- surfaces ---------------- */
  var SN = 26;
  function surfPaint(env) {
    var x = env.x, W = env.w, H = env.h;
    x.clearRect(0, 0, W, H);
    var sf = SURFS[S.idx];
    var R0 = Math.min(W, H) * 0.37 * S.zoom;
    var cx = W / 2, cy = H / 2 - 8;
    var i, j;
    var gx = [], zs = [];
    for (i = 0; i <= SN; i++) {
      gx[i] = [];
      for (j = 0; j <= SN; j++) {
        var vx = -3 + 6 * i / SN, vy = -3 + 6 * j / SN;
        var vz = sf.f(vx, vy);
        var q = prj([vx, vz, vy], S);
        var k = 8 / (8 - q[2]);
        gx[i][j] = [cx + q[0] * k * R0, cy - q[1] * k * R0, q[2], k, vz];
        zs.push(vz);
      }
    }
    var zmin = Math.min.apply(null, zs), zmax = Math.max.apply(null, zs);
    var quads = [];
    for (i = 0; i < SN; i++) for (j = 0; j < SN; j++) {
      var a = gx[i][j], b2 = gx[i + 1][j], c2 = gx[i + 1][j + 1], d2 = gx[i][j + 1];
      quads.push({ P: [a, b2, c2, d2], d: (a[2] + b2[2] + c2[2] + d2[2]) / 4, z: (a[4] + c2[4]) / 2 });
    }
    quads.sort(function (u, v) { return u.d - v.d; });
    for (i = 0; i < quads.length; i++) {
      var qd = quads[i];
      var l = clamp(30 + ((qd.z - zmin) / (zmax - zmin || 1)) * 26, 28, 62);
      x.beginPath();
      x.moveTo(qd.P[0][0], qd.P[0][1]);
      x.lineTo(qd.P[1][0], qd.P[1][1]);
      x.lineTo(qd.P[2][0], qd.P[2][1]);
      x.lineTo(qd.P[3][0], qd.P[3][1]);
      x.closePath();
      x.fillStyle = "hsl(" + sf.h + ",52%," + l + "%)";
      x.fill();
      x.strokeStyle = "hsla(" + sf.h + ",55%," + (l - 8) + "%,.5)";
      x.lineWidth = 0.6;
      x.stroke();
    }
    axes(x, W, H, cx, cy, R0, S);
    var fsx = $("hoMola");
    if (fsx) fsx.textContent = sf.n;  /* v33.0: surface label (was leaking the molecule label) */
  }
  function axes(x, W, H, cx, cy, R0, cam) {
    var i, pts;
    x.font = "700 10px system-ui,sans-serif";
    x.textAlign = "center";
    var L = [[-3.1, 0, 0, "X"], [0, -3.1, 0, "Y"], [0, 0, -3.1, "Z"]];
    for (i = 0; i < L.length; i++) {
      var q = prj([L[i][0], L[i][1], L[i][2]], cam);
      var k = 8 / (8 - q[2]);
      x.beginPath();
      x.moveTo(cx, cy);
      x.lineTo(cx + q[0] * k * R0, cy - q[1] * k * R0);
      x.strokeStyle = "rgba(244,227,178,.35)";
      x.lineWidth = 1;
      x.stroke();
      x.fillStyle = "rgba(244,227,178,.6)";
      x.fillText(L[i][3], cx + q[0] * k * R0 * 1.12, cy - q[1] * k * R0 * 1.12 + 3);
    }
  }

  /* ---------------- orbits ---------------- */
  function solPaint(env) {
    var x = env.x, W = env.w, H = env.h;
    x.clearRect(0, 0, W, H);
    var R0 = Math.min(W, H) * 0.46 * O.zoom / 10.6; /* fit Neptune's orbit (10.2 u) inside the canvas */
    var cx = W / 2, cy = H / 2 + 6;
    var i, j;
    function P3(x2, y2, z2) {
      var q = prj([x2, y2, z2], { yaw: 0.55, pitch: 0.42 });
      var F = 16; /* focal long enough that (F - z) never passes 0 for orbits up to 10.2 */
      var k = F / (F - q[2]);
      return [cx + q[0] * k * R0, cy - q[1] * k * R0, k];
    }
    // orbits
    for (i = 0; i < PLANETS.length; i++) {
      var pl = PLANETS[i];
      x.beginPath();
      for (j = 0; j <= 72; j++) {
        var a = j / 72 * 6.2832;
        var s = P3(pl.o * Math.cos(a), 0, pl.o * Math.sin(a));
        if (j === 0) x.moveTo(s[0], s[1]); else x.lineTo(s[0], s[1]);
      }
      x.strokeStyle = "rgba(244,227,178,.14)";
      x.lineWidth = 1;
      x.stroke();
    }
    // sun
    var sun = P3(0, 0, 0);
    var rr = R0 * 10.6; /* visual sun radius restored after scaling */
    var sg = x.createRadialGradient(sun[0], sun[1], 2, sun[0], sun[1], rr);
    sg.addColorStop(0, "rgba(255,226,150,.9)");
    sg.addColorStop(0.25, "rgba(255,190,80,.55)");
    sg.addColorStop(1, "rgba(255,180,60,0)");
    x.beginPath();
    x.arc(sun[0], sun[1], rr, 0, 6.2832);
    x.fillStyle = sg;
    x.fill();
    x.beginPath();
    x.arc(sun[0], sun[1], rr * 0.28, 0, 6.2832);
    x.fillStyle = "#ffd980";
    x.fill();
    // planets (sorted near -> far so nearer drawn last)
    var draw = [];
    for (i = 0; i < PLANETS.length; i++) {
      var pl2 = PLANETS[i];
      var ang = pl2.ph + O.t * 6.2832 / pl2.p;
      var px = pl2.o * Math.cos(ang), pz = pl2.o * Math.sin(ang);
      var s2 = P3(px, 0, pz);
      draw.push({ pl: pl2, s: s2, d: s2[2] });
    }
    var earth = null;
    for (i = 0; i < draw.length; i++) if (draw[i].pl.n === "Earth") { earth = draw[i].s; break; }
    if (earth) {
      var mang = O.t * 6.2832 / MOON.p;
      draw.push({ pl: MOON, s: [earth[0] + Math.cos(mang) * 0.62 * R0, earth[1] - Math.sin(mang) * 0.30 * R0, earth[2]], d: earth[2] + 0.001 });
    }
    draw.sort(function (u, v) { return u.d - v.d; });
    var fo = $("hoMola");
    if (fo) fo.textContent = "8 planets · 1 moon · true relative periods";
    window.__hoHit = [];
    for (i = 0; i < draw.length; i++) {
      var d = draw[i], pl3 = d.pl, s3 = d.s;
      var pr = pl3.r * R0 * 2.1 * s3[2];
      if (pl3.ring) {
        x.beginPath();
        x.ellipse(s3[0], s3[1], pr * 2.3, pr * 0.62, -0.5, 0, 6.2832);
        x.strokeStyle = "rgba(230,207,138,.55)";
        x.lineWidth = Math.max(2, pr * 0.42);
        x.stroke();
      }
      var pg = x.createRadialGradient(s3[0] - pr * 0.3, s3[1] - pr * 0.35, pr * 0.1, s3[0], s3[1], pr);
      pg.addColorStop(0, sh(pl3.c, 60));
      pg.addColorStop(1, sh(pl3.c, -50));
      x.beginPath();
      x.arc(s3[0], s3[1], pr, 0, 6.2832);
      x.fillStyle = pg;
      x.fill();
      if (O.labels) {
        x.font = "700 10px system-ui,sans-serif";
        x.textAlign = "center";
        x.fillStyle = "rgba(244,227,178,.8)";
        x.fillText(pl3.n, s3[0], s3[1] + pr + 12);
      }
      try { window.__hoHit.push({ n: pl3.n, x: s3[0], y: s3[1], r: Math.max(15, pr + 11) }); } catch (e2) {}
    }
  }
  function hoInfo(n) {
    var el = $("hoInfo");
    if (!el) return;
    el.textContent = "🪐 " + n + " — " + (INFOS[n] || "Tap a world to learn about it.");
    el.classList.add("on");
    clearTimeout(hoInfo.t);
    hoInfo.t = setTimeout(function () { el.classList.remove("on"); }, 7000);
  }
  function bindTap() {
    var cv = $("hoCv");
    if (!cv) return;
    var dx0 = 0, dy0 = 0;
    cv.addEventListener("pointerdown", function (e) { dx0 = e.clientX; dy0 = e.clientY; });
    cv.addEventListener("pointerup", function (e) {
      if (TAB !== "orb") return;
      if (Math.abs((e.clientX || 0) - dx0) > 9 || Math.abs((e.clientY || 0) - dy0) > 9) return;
      var r = cv.getBoundingClientRect();
      var X = (e.clientX || 0) - r.left, Y = (e.clientY || 0) - r.top;
      var hit = null;
      var arr = window.__hoHit || [];
      for (var i = arr.length - 1; i >= 0; i--) {
        var h = arr[i];
        if (Math.abs(h.x - X) < h.r && Math.abs(h.y - Y) < h.r) { hit = h; break; }
      }
      if (hit) hoInfo(hit.n);
    });
  }

  /* ---------------- loop ---------------- */
  function loop(ts) {
    if (!on) return;
    var dt = lastT ? ts - lastT : 16;
    lastT = ts;
    if (TAB === "mol" && M.auto) M.yaw += dt * 0.00022;
    if (TAB === "surf" && S.auto) S.yaw += dt * 0.0002;
    if (TAB === "orb") O.t += dt * 0.01 * O.speed;
    var env = fit();
    if (env && env.x) {
      try {
        if (TAB === "mol") molPaint(env);
        else if (TAB === "surf") surfPaint(env);
        else solPaint(env);
      } catch (e) { try { window.__holoErr = String(e && e.stack || e); } catch (e2) {} }
    }
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf) { on = true; lastT = 0; raf = requestAnimationFrame(loop); } }
  function stop() { on = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  /* ---------------- controls ---------------- */
  function chipRow() {
    var row = $("hoChips");
    if (!row) return;
    var list = TAB === "mol" ? MOLS.map(function (m, i) { return { n: m.n, i: i }; })
      : TAB === "surf" ? SURFS.map(function (m, i) { return { n: m.n, i: i }; }) : [];
    if (TAB === "orb") { row.innerHTML = ""; return; }
    row.innerHTML = list.map(function (m) {
      return '<button type="button" class="ho-chip' + (m.i === (TAB === "mol" ? M.idx : S.idx) ? " on" : "") + '" data-i="' + m.i + '">' + esc(m.n) + "</button>";
    }).join("");
    Array.prototype.forEach.call(row.querySelectorAll(".ho-chip"), function (b) {
      b.onclick = function () {
        var i = +b.getAttribute("data-i");
        if (TAB === "mol") { M.idx = i; } else { S.idx = i; }
        chipRow(); ctlRow();
      };
    });
  }
  function ctlRow() {
    var c = $("hoCtl");
    if (!c) return;
    var base = '<button type="button" class="ho-btn sq" data-act="out" aria-label="Zoom out">−</button>' +
      '<button type="button" class="ho-btn sq" data-act="in" aria-label="Zoom in">+</button>' +
      '<button type="button" class="ho-btn sq" data-act="reset" aria-label="Reset view">⤾</button>' +
      '<button type="button" class="ho-btn' + ((TAB === "orb" ? O.auto : TAB === "mol" ? M.auto : S.auto) ? " on" : "") + '" data-act="auto">⟳ Auto</button>' +
      '<button type="button" class="ho-btn" data-act="snap" title="Save this scene as an image">💾 PNG</button>';
    if (TAB === "orb") {
      c.innerHTML = '<span class="ho-spd">🐢 <input type="range" id="hoSpd" min="0.25" max="8" step="0.25" value="' + O.speed + '" aria-label="Orbit speed"> 🐇</span>' +
        '<button type="button" class="ho-btn' + (O.labels ? " on" : "") + '" data-act="lbl">🏷 Labels</button>' + base;
      var sp = $("hoSpd");
      if (sp && !sp.dataset.w) { sp.dataset.w = 1; sp.oninput = function () { O.speed = parseFloat(sp.value) || 1; }; }
    } else {
      c.innerHTML = base;
    }
    Array.prototype.forEach.call(c.querySelectorAll(".ho-btn"), function (b) {
      b.onclick = function () {
        var act = b.getAttribute("data-act");
        var cam = TAB === "orb" ? null : TAB === "mol" ? M : S;
        if (act === "out" && cam) cam.zoom = clamp(cam.zoom / 1.18, 0.35, 4);
        if (act === "in" && cam) cam.zoom = clamp(cam.zoom * 1.18, 0.35, 4);
        if (act === "reset" && cam) { cam.yaw = 0.7; cam.pitch = TAB === "mol" ? 0.32 : 0.55; cam.zoom = 1; if (TAB === "mol") M.auto = true; if (TAB === "surf") S.auto = true; }
        if (act === "auto") { if (TAB === "orb") O.auto = !O.auto; else if (TAB === "mol") M.auto = !M.auto; else S.auto = !S.auto; }
        if (act === "lbl") O.labels = !O.labels;
        if (act === "snap") {
          try {
            var cv2 = $("hoCv");
            var nm = (TAB === "mol" ? (MOLS[M.idx] || {}).n : TAB === "surf" ? (SURFS[S.idx] || {}).n : "solar-system") || "holo";
            var a = document.createElement("a");
            a.download = "aurum-" + String(nm).replace(/\s+/g, "-").toLowerCase() + ".png";
            a.href = cv2.toDataURL("image/png");
            document.body.appendChild(a); a.click(); a.remove();
            if (TAB === "orb") hoInfo("Saved the solar system as an image — check your downloads.");
          } catch (e3) {}
        }
        chipRow(); ctlRow();
      };
    });
  }
  function setTab(t) {
    TAB = t;
    Array.prototype.forEach.call(document.querySelectorAll(".ho-tab"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-t") === t);
    });
    chipRow(); ctlRow();
    var ti = $("hoTop");
    if (ti) ti.textContent = t === "mol" ? "🧬 3D Molecule Viewer" : t === "surf" ? "📈 3D Graph Studio" : "🪐 Orbital Solar System";
    var sub = $("hoSub");
    if (sub) sub.textContent = t === "mol" ? "Drag to orbit · scroll to zoom · ten molecules & crystals" : t === "surf" ? "Drag to orbit · pick a surface — pure Maths, no calculator needed" : "Drag to orbit · tap any world to meet it · true relative periods";
  }

  function open(tab) {
    css();
    var ov = $("hoOv");
    if (ov) { setTab(tab || "mol"); ov.style.display = "flex"; start(); return; }
    ov = document.createElement("div");
    ov.id = "hoOv";
    ov.className = "ho-ov";
    ov.setAttribute("aria-label", "Holo 3D Lab");
    ov.innerHTML =
      '<div class="ho-box" role="dialog" aria-label="Holo 3D Lab">' +
        '<div class="ho-h"><span id="hoTop">🧬 3D Molecule Viewer</span><button class="ho-x" id="hoX" aria-label="Close">✕</button></div>' +
        '<div class="ho-sub" id="hoSub"></div>' +
        '<div class="ho-tabs">' +
          '<button type="button" class="ho-tab on" data-t="mol">🧬 Molecules</button>' +
          '<button type="button" class="ho-tab" data-t="surf">📈 Surfaces</button>' +
          '<button type="button" class="ho-tab" data-t="orb">🪐 Orbits</button>' +
        "</div>" +
        '<div class="ho-chips" id="hoChips"></div>' +
        '<div class="ho-cvwrap"><canvas class="ho-cv" id="hoCv" aria-label="3D canvas"></canvas><div class="ho-f" id="hoMola"></div><div class="ho-hint">drag · scroll · enjoy</div></div>' +
        '<div class="ho-ctl" id="hoCtl"></div>' +
        '<div class="ho-info" id="hoInfo">🪐 Solar system: tap any world to meet it · every model is drawn live in your browser</div>' +
      "</div>";
    document.body.appendChild(ov);
    $("hoX").onclick = close;
    Array.prototype.forEach.call(ov.querySelectorAll(".ho-tab"), function (b) {
      b.onclick = function () { setTab(b.getAttribute("data-t")); };
    });
    bindTap();
    var cv = $("hoCv");
    var pts = null, lx = 0, ly = 0;
    cv.addEventListener("pointerdown", function (e) {
      try { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); } catch (e2) {}
      pts = {}; pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      lx = e.clientX; ly = e.clientY;
    }, { passive: true });
    window.addEventListener("pointermove", function (e) {
      if (!pts || !pts[e.pointerId]) { return; }
      var cam = TAB === "orb" ? null : TAB === "mol" ? M : S;
      if (cam) {
        cam.yaw += (e.clientX - lx) * 0.008;
        cam.pitch = clamp(cam.pitch + (e.clientY - ly) * 0.008, -1.35, 1.35);
      } else {
        O.t += (e.clientX - lx) * 0.004;
      }
      lx = e.clientX; ly = e.clientY;
    }, { passive: true });
    var up = function () { pts = null; };
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
    cv.addEventListener("wheel", function (e) {
      var cam = TAB === "orb" ? null : TAB === "mol" ? M : S;
      if (cam) cam.zoom = clamp(cam.zoom * (e.deltaY < 0 ? 1.08 : 0.93), 0.35, 4);
      e.preventDefault();
    }, { passive: false });
    ov.onclick = function (e) { if (e.target === ov) close(); };
    setTab(tab || "mol");
    start();
  }
  function close() {
    var ov = $("hoOv");
    stop();
    if (ov) { try { ov.remove(); } catch (e) {} }
  }

  /* ---------------- chips + palette ---------------- */
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
    var grp = document.createElement("div");
    grp.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:8px";
    grp.appendChild(mk("holoLaunch", "🌐", "Holo 3D Lab", "molecules · surfaces · orbits", function () { open("mol"); }));
    if (w) w.insertBefore(grp, w.lastChild);
    else {
      var box = document.createElement("div");
      box.id = "holoChips";
      box.appendChild(grp);
      host.insertBefore(box, host.querySelector(".stats"));
    }
  }
  function hooks() {
    var h = function (add) {
      add("Tools", "🧬", "Holo 3D — Molecules", "Orbit water, methane, benzene and more", function () { open("mol"); });
      add("Tools", "📈", "Holo 3D — Surfaces", "Interactive 3D maths graphs", function () { open("surf"); });
      add("Tools", "🪐", "Holo 3D — Orbits", "Solar system with true relative periods", function () { open("orb"); });
    };
    if (window.__proPalHooks && window.__proPalHooks.push) window.__proPalHooks.push(h);
    else window.__proPalHooks = [h];
  }

  function boot() {
    css();
    try { document.documentElement.classList.add("holo"); } catch (e) {}
    try { rm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; if (rm) { M.auto = false; S.auto = false; O.auto = false; } } catch (e) {}
    try { chips(); } catch (e) {}
    try { hooks(); } catch (e) {}
    try {
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") close();
      });
    } catch (e) {}
    window.__holo = { M: M, S: S, O: O, counts: { mol: MOLS.length, surf: SURFS.length, orb: PLANETS.length }, open: open, close: close };
    window.__hoInfo = hoInfo;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
