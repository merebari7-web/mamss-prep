/* v39 bug-hunt smoke tour (real Chrome): walks every major flow, attributes
   pageerrors/console-errors to steps, walks leaf text for NaN/undefined.
   Run: node quiz/_bughunt39.js  (needs :8123 + puppeteer) */
const puppeteer = require("puppeteer");
const BASE = "http://127.0.0.1:8123/index.html";
const STEP = { cur: "boot", errs: [], cons: [] };
let fails = 0;
const ok = (l, c, extra) => {
  if (!c) { fails++; console.log("✗", l, extra ? "— " + extra : ""); }
  else console.log("✓", l);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"] });
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 800 });
  await p.on("dialog", (d) => { try { d.dismiss(); } catch (e) {} });
  p.on("pageerror", (e) => STEP.errs.push("[" + STEP.cur + "] " + String(e.message || e).slice(0, 180)));
  p.on("console", (m) => {
    const t = m.type();
    if (t === "log" && /^TOAST-ERR/.test(m.text())) console.log("  " + m.text().slice(0, 500));
    if (t === "log" && /^ERRSTACK/.test(m.text())) console.log("  " + m.text().slice(0, 700));
    if (t === "log" && /^QUIZERR-SET/.test(m.text())) console.log("  " + m.text().slice(0, 700));
    if (t === "error" || t === "warning") {
      const s = m.text().slice(0, 160);
      if (/favicon|fonts\.gstatic|accounts\.google|net::|Failed to load resource/i.test(s)) return;
      STEP.cons.push("[" + STEP.cur + "/" + t + "] " + s);
    }
  });
  const step = (name) => { STEP.cur = name; console.log("\n── " + name + " ──"); };

  const dirt = async () => {
    await sleep(1200);
    const d = await ev(() => {
      const out = [];
      const ring = document.getElementById("ringPct");
      if (ring && /NaN/.test(ring.textContent || "")) out.push("ring=" + ring.textContent.trim().slice(0, 12));
      document.querySelectorAll(".game-pill").forEach((x) => { if (/NaN/.test(x.textContent || "")) out.push("pill=" + x.textContent.trim().slice(0, 34)); });
      document.querySelectorAll("body span, body div").forEach((el) => {
        if (!el.children.length && /Cannot read|Uncaught/.test(el.textContent || "")) {
          let chain = "", n = el;
          for (let d = 0; d < 4 && n && n !== document.body; d++) { chain = (n.id ? "#" + n.id : (n.className ? "." + String(n.className).split(" ")[0] : n.tagName)) + ">" + chain; n = n.parentElement; }
          out.push("errspan=" + chain + " :: " + el.textContent.trim().slice(0, 160));
        }
      });
      return out.slice(0, 5);
    }).catch(() => ["eval-fail"]);
    if (d.length) console.log("  DIRT@" + STEP.cur + ":", JSON.stringify(d));
  };

  const doSetup = async () => {
    await ev(() => {
      const c1 = document.querySelector("#classTabs .tab, #classTabs .chip, #classTabs button");
      if (c1) c1.click();
    });
    await sleep(400);
    await ev(() => {
      const chips = [...document.querySelectorAll("#subjectChips .chip, #subjectChips button")];
      const m = chips.find((x) => /Mathematics/.test(x.textContent)) || chips[0];
      if (m) m.click();
    });
    await sleep(400);
    await ev(() => {
      const counts = document.querySelectorAll("#countBoxes .count");
      const c10 = [...counts].find((x) => /\\b10\\b/.test(x.textContent)) || counts[0];
      if (c10) c10.click();
    });
    await sleep(400);
    await ev(() => {
      const starts = document.querySelectorAll("#step-length .btn-gold, #step-length .btn, #startBtn");
      const go = [...starts].find((x) => /Commence|Start paper|Begin|Start quiz/i.test(x.textContent));
      if (go) go.click();
    });
    await sleep(700);
  };

  const ev = (fn, ...a) => p.evaluate(fn, ...a);
  const errsSince = (mark) => STEP.errs.slice(mark);

  /* ---------- 0. boot + idle modules ---------- */
  step("boot");
  let m0 = STEP.errs.length;
  await p.goto(BASE, { waitUntil: "load", timeout: 60000 });
  await p.waitForFunction(() => typeof CLASSES !== "undefined" && CLASSES.length > 0, { timeout: 30000 });
  await ev(() => {
    try {
      let v = window.QUIZ_ERR;
      Object.defineProperty(window, "QUIZ_ERR", {
        configurable: true,
        get() { return v; },
        set(x) {
          v = x;
          try { console.log("QUIZERR-SET @" + new Date().toISOString().slice(14, 23) + " :: " + String(x).slice(0, 90) + " :: " + new Error("x").stack.replace(/\s+/g, " ").slice(0, 500)); } catch (e) {}
        }
      });
    } catch (e) {}
  });
  const idleWant = ["__pro", "__holo", "__ai", "__atlas", "__calc", "__reels", "__tk", "__st", "__boost", "__apex", "__polish"];
  const idleMiss = await ev((want) => new Promise((res) => {
    const t0 = Date.now();
    const tick = () => {
      const miss = want.filter((k) => !window[k]);
      if (!miss.length || Date.now() - t0 > 45000) res(miss); else setTimeout(tick, 500);
    };
    tick();
  }), idleWant);
  ok("idle modules loaded", idleMiss.length === 0, idleMiss.join(","));
  await ev(() => {
    try {
      const orig = window.toast;
      window.toast = function (msg, icon) {
        if (/Error|Cannot read|NaN|undefined/.test(String(msg))) {
          try { console.log("TOAST-ERR @" + new Date().toISOString().slice(14, 23) + ": " + String(msg).slice(0, 140) + " :: " + new Error("x").stack.split("\n").slice(1, 5).join(" <- ").slice(0, 300)); } catch (e) {}
        }
        return orig.apply(this, arguments);
      };
      window.addEventListener("error", (e) => {
        try { console.log("ERRSTACK cp=" + (window.__cp || "?") + " :: " + (((e.error && e.error.stack) || e.message || "?") + "").replace(/\s+/g, " ").slice(0, 600)); } catch (x) {}
      });
    } catch (e) {}
  });
  await sleep(1500);
  ok("no boot errors", errsSince(m0).length === 0, errsSince(m0).join(" | "));
  await dirt();

  /* ---------- 1. guest signup ---------- */
  step("signup");
  m0 = STEP.errs.length;
  await ev(() => { document.getElementById("guestName").value = "Ada"; signUpGuest(); });
  await sleep(800);
  ok("account created", await ev(() => !!document.getElementById("setupCard") || !!document.body.textContent.match(/Ada/)), "");
  ok("no signup errors", errsSince(m0).length === 0, errsSince(m0).join(" | "));
  await dirt();

  /* ---------- 2. full paper ---------- */
  step("paper");
  m0 = STEP.errs.length;
  await doSetup();
  await p.waitForFunction('!!document.getElementById("quizCard") && !document.getElementById("quizCard").classList.contains("hidden")', { timeout: 15000 });
  ok("paper starts", true);
  // answer all 10
  for (let q = 0; q < 10; q++) {
    await ev((qq) => {
      const vis = (el) => el && el.getBoundingClientRect().width > 0;
      const opts = [...document.querySelectorAll("#quizCard .opt")].filter(vis);
      if (opts[0] && !document.querySelector("#quizCard .opt.picked")) opts[0].click();
      if (qq === 1) toggleFlag();
      if (qq === 2) toggleBookmark();
    }, q).catch(() => {});
    await sleep(250);
    const last = await ev(() => {
      const s = document.getElementById("submitBtn"), n = document.getElementById("nextBtn");
      const vis = (el) => el && !el.classList.contains("hidden") && el.getBoundingClientRect().width > 0;
      if (vis(s)) return "submit";
      if (vis(n)) { n.click(); return "next"; }
      return "?";
    });
    await sleep(350);
    if (last === "submit") break;
  }
  const submitted = await ev(() => { maybeSubmit(); return true; });
  await sleep(600);
  await ev(() => { try { doSubmit(); } catch (e) {} });
  await sleep(1200);
  const resVisible = await ev(() => !!document.getElementById("resultCard") && !document.getElementById("resultCard").classList.contains("hidden"));
  ok("submit → results", resVisible);
  ok("no paper errors", errsSince(m0).length === 0, errsSince(m0).join(" | "));
  await dirt();

  /* ---------- 3. review ---------- */
  step("review");
  m0 = STEP.errs.length;
  await ev(() => { showReview(); });
  await sleep(700);
  await ev(() => { ["all", "wrong", "flagged", "bookmarked"].forEach((f) => { try { setReviewFilter(f); } catch (e) {} }); });
  await sleep(400);
  await ev(() => { closeOverlay(); });
  await sleep(400);
  ok("review filters cycle", true);
  ok("no review errors", errsSince(m0).length === 0, errsSince(m0).join(" | "));
  await dirt();

  /* ---------- 4. library ---------- */
  step("library");
  m0 = STEP.errs.length;
  await ev(() => { openLibrary(); });
  await sleep(600);
  await ev(() => {
    const q = document.getElementById("libQ");
    if (q) { q.value = "osmosis"; q.dispatchEvent(new Event("input", { bubbles: true })); }
  });
  await sleep(700);
  await ev(() => {
    const q = document.getElementById("libQ");
    if (q) { q.value = "zzzznope"; q.dispatchEvent(new Event("input", { bubbles: true })); }
  });
  await sleep(700);
  await ev(() => { try { practiceLibrary(); } catch (e) {} });
  await sleep(800);
  await ev(() => { try { closeLibrary(); } catch (e) {} try { quitQuiz(); } catch (e) {} });
  await sleep(400);
  ok("library search + empty + drill", true);
  ok("no library errors", errsSince(m0).length === 0, errsSince(m0).join(" | "));
  await dirt();

  /* ---------- 5. HQ ---------- */
  step("hq");
  m0 = STEP.errs.length;
  await ev(() => { openHQ(); });
  await sleep(900);
  const hqKids = await ev(() => (document.getElementById("hqOverlay")?.textContent || "").length);
  ok("HQ renders", hqKids > 200, "chars=" + hqKids);
  await ev(() => { closeHQ(); });
  await sleep(300);
  ok("no HQ errors", errsSince(m0).length === 0, errsSince(m0).join(" | "));
  await dirt();

  /* ---------- 6. labs ---------- */
  step("labs");
  m0 = STEP.errs.length;
  await ev(() => { labs("formulas"); });
  await p.waitForFunction("!!window.LX && !!LX.ready", { timeout: 20000 }).catch(() => {});
  await sleep(800);
  await ev(() => { labs("map"); });
  await sleep(800);
  await ev(() => { try { closeLab(); } catch (e) {} });
  await sleep(300);
  ok("labs formulas+map", await ev(() => !!window.LX));
  ok("no labs errors", errsSince(m0).length === 0, errsSince(m0).join(" | "));
  await dirt();

  /* ---------- 7. notes ---------- */
  step("notes");
  m0 = STEP.errs.length;
  await ev(() => { notes(); });
  await p.waitForFunction("!!window.NT", { timeout: 20000 }).catch(() => {});
  await sleep(900);
  const ntOpen = await ev(() => !!window.NT && !!document.querySelector("#ntOverlay:not([style*='none'])"));
  ok("notes open", ntOpen);
  await ev(() => { try { NT.close(); } catch (e) {} });
  await sleep(300);
  ok("no notes errors", errsSince(m0).length === 0, errsSince(m0).join(" | "));
  await dirt();

  /* ---------- 8. edu ---------- */
  step("edu");
  m0 = STEP.errs.length;
  await ev(() => { edu("open"); });
  await p.waitForFunction("!!window.EDU && !!EDU.ready", { timeout: 25000 }).catch(() => {});
  await sleep(900);
  await ev(() => { try { EDU.go("notes"); } catch (e) {} });
  await sleep(600);
  await ev(() => { try { EDU.go("cbt"); } catch (e) {} });
  await sleep(600);
  await ev(() => { try { eduClose(); } catch (e) {} });
  await sleep(300);
  ok("edu open+tabs", await ev(() => !!window.EDU));
  ok("no edu errors", errsSince(m0).length === 0, errsSince(m0).join(" | "));
  await dirt();

  /* ---------- 9. arcade ---------- */
  step("arcade");
  m0 = STEP.errs.length;
  await ev(() => { arc("open"); });
  await p.waitForFunction("!!window.ARC && !!ARC.ready", { timeout: 25000 }).catch(() => {});
  await sleep(900);
  const arcRoutes = ["hub", "term", "rapid", "cards", "memo", "ladder", "utme", "essay", "stats", "videos"];
  for (const t of arcRoutes) {
    const before = STEP.errs.length;
    await ev((tt) => { try { ARC.go(tt); } catch (e) { window.__actErr = "[" + tt + "] " + String(e.message || e).slice(0, 120); } }, t).catch(() => {});
    await sleep(900);
    const ae = await ev(() => { const e = window.__actErr || ""; window.__actErr = ""; return e; });
    if (ae) STEP.errs.push("[arcade-sync] " + ae);
    const fresh = STEP.errs.slice(before);
    if (fresh.length) console.log("  ! route", t, "→", fresh.join(" | ").slice(0, 220));
    await dirt();
  }
  await ev(() => { try { ARC.go("hub"); } catch (e) {} try { closeOverlay(); } catch (e) {} });
  await sleep(300);
  ok("arcade tabs visited", true);
  ok("no arcade errors", errsSince(m0).length === 0, errsSince(m0).join(" | "));
  await dirt();

  /* ---------- 10. lazy modules ---------- */
  step("modules");
  m0 = STEP.errs.length;
  await ev(() => { try { __holo.open("mol"); } catch (e) {} });
  await sleep(800);
  await ev(() => { try { __holo.open("surf"); } catch (e) {} });
  await sleep(800);
  await ev(() => { try { __holo.open("orb"); } catch (e) {} });
  await sleep(800);
  await ev(() => { try { __holo.close(); } catch (e) {} });
  await ev(() => { try { __calcApi.open(); ["AC", "2", "+", "3", "*", "4", "="].forEach((k) => __calcApi.press(k)); } catch (e) {} });
  await sleep(500);
  const calcVal = await ev(() => { try { return "ans=" + __calcApi.state.ans + " expr=" + __calcApi.state.expr; } catch (e) { return "ERR:" + e.message; } });
  await ev(() => { try { __calcApi.press("AC"); } catch (e) {} try { ["1", "/", "0", "="].forEach((k) => __calcApi.press(k)); } catch (e) {} });
  await sleep(400);
  const calcZero = await ev(() => { try { return "ans=" + __calcApi.state.ans + " expr=" + (__calcApi.state.expr || "").slice(0, 30); } catch (e) { return "ERR:" + e.message; } });
  await ev(() => { try { __calcApi.close(); } catch (e) {} });
  console.log("  calc 2+3*4:", calcVal, "| 1/0:", calcZero);
  ok("calc arithmetic", /ans=14\b/.test(calcVal), calcVal);
  await ev(() => { try { __aiApi.open(); } catch (e) {} });
  await sleep(600);
  await ev(() => {
    try {
      const inp = document.getElementById("aiIn");
      if (inp) { inp.value = "photosynthesis"; inp.dispatchEvent(new Event("input", { bubbles: true })); }
      document.getElementById("aiGo")?.click();
    } catch (e) {}
  });
  await sleep(1200);
  const aiReply = await ev(() => { try { return (document.getElementById("aiOv")?.textContent || "").replace(/\s+/g, " ").slice(-160); } catch (e) { return "ERR:" + e.message; } });
  console.log("  ai tail:", aiReply);
  await ev(() => { try { __aiApi.close(); } catch (e) {} });
  ok("ai answers", /photosynth/i.test(aiReply) && aiReply.length > 60, aiReply.slice(0, 80));
  await ev(() => { try { __atlasApi.open(); } catch (e) {} });
  await sleep(700);
  await ev(() => { try { __atlasApi.surprise(); } catch (e) {} });
  await sleep(600);
  await ev(() => { try { __atlasApi.close(); } catch (e) {} try { quitQuiz(); } catch (e) {} });
  await ev(() => { try { __reelsApi.open(); __reelsApi.play(); } catch (e) {} });
  await sleep(2500);
  await ev(() => { try { __reelsApi.pause(); __reelsApi.close(); } catch (e) {} });
  ok("no module errors", errsSince(m0).length === 0, errsSince(m0).join(" | "));
  await dirt();

  /* ---------- 11. palette actions sweep ---------- */
  step("palette");
  m0 = STEP.errs.length;
  const closer = () => {
    ["closeOverlay", "closeHQ", "closeLibrary", "closeHelp", "closeStats", "closeWheel", "closeLab", "eduClose"].forEach((f) => { try { window[f](); } catch (e) {} });
    try { __holo.close(); } catch (e) {}
    try { __aiApi.close(); } catch (e) {}
    try { __atlasApi.close(); } catch (e) {}
    try { __reelsApi.close(); } catch (e) {}
    try { __calcApi.close(); } catch (e) {}
    try { NT.close(); } catch (e) {}
    try { quitQuiz(); } catch (e) {}
    try { var zb = [...document.querySelectorAll("#zenOv button")].find((x) => /end|close|stop|✕/i.test(x.textContent)); if (zb) zb.click(); } catch (e) {}
    try { document.querySelectorAll(".ovl,.overlay,.modal").forEach((o) => { o.classList.add("hidden"); }); } catch (e) {}
  };
  await ev(() => { try { __palOpen(); } catch (e) {} });
  await sleep(500);
  const queries = ["", "zen", "tool", "note", "math", "chem", "phys", "bio", "eng", "econ", "go", "exam", "pract", "drill", "video", "mind"];
  const seen = [];
  for (const q of queries) {
    const rows = await ev((qq) => {
      try {
        if (!document.getElementById("palQ")) __palOpen();
        const inp = document.getElementById("palIn");
        inp.value = qq; inp.dispatchEvent(new Event("input", { bubbles: true }));
        return [...document.querySelectorAll("#palList .pal-it")].map((b) => b.textContent.trim().slice(0, 40).replace(/\s+/g, " "));
      } catch (e) { return []; }
    }, q).catch(() => []);
    await sleep(350);
    for (let i = 0; i < rows.length && seen.length < 46; i++) {
      const label = rows[i];
      if (seen.includes(q + "|" + label)) continue;
      seen.push(q + "|" + label);
      const before = STEP.errs.length;
      await ev((qq, idx) => {
        try {
          if (!document.getElementById("palQ")) __palOpen();
          const inp = document.getElementById("palIn");
          inp.value = qq; inp.dispatchEvent(new Event("input", { bubbles: true }));
          const b = [...document.querySelectorAll("#palList .pal-it")][idx];
          if (b) b.click();
        } catch (e) { window.__actErr = String(e.message || e).slice(0, 120); }
      }, q, i).catch(() => {});
      await sleep(750);
      const ae2 = await ev(() => { const e = window.__actErr || ""; window.__actErr = ""; return e; });
      if (ae2) STEP.errs.push("[palette-sync] " + label + " " + ae2);
      const fresh = STEP.errs.slice(before).filter((x) => !/^\[palette-sync\]/.test(x));
      if (fresh.length) console.log("  !", JSON.stringify(label), "→", fresh.join(" | ").slice(0, 220));
      await ev(closer).catch(() => {});
      await sleep(250);
    }
    await ev(() => { try { document.getElementById("palQ")?.remove(); } catch (e) {} }).catch(() => {});
  }
  console.log("  palette rows clicked:", seen.length);
  const actions = seen;
  await ev(() => { window.print = function () { window.__printStub = (window.__printStub || 0) + 1; }; });
  await ev(closer).catch(() => {});
  ok("palette sweep done", true);
  ok("no palette errors", errsSince(m0).length === 0, errsSince(m0).slice(0, 6).join(" | "));
  await dirt();

  /* ---------- 12. toggles ---------- */
  step("toggles");
  m0 = STEP.errs.length;
  await ev(() => {
    ["nightToggle", "cycleFont", "cycleType", "toggleMotion"].forEach((f) => {
      try { window[f](); window[f](); } catch (e) {}
    });
    try { document.getElementById("sndBtn")?.click(); document.getElementById("sndBtn")?.click(); } catch (e) {}
    try { document.getElementById("focusBtn")?.click(); document.getElementById("focusBtn")?.click(); } catch (e) {}
  });
  await sleep(500);
  ok("no toggle errors", errsSince(m0).length === 0, errsSince(m0).join(" | "));
  await dirt();

  /* ---------- 13. NaN/undefined walk ---------- */
  step("textwalk");
  const cp = async (label, fn) => {
    await ev((l) => { window.__cp = l; }, label); await fn(); await sleep(450);
    const snap = await ev(() => {
      try {
        const stepVis = ["step-class", "step-subject", "step-length", "quizCard", "resultCard", "reviewCard"].filter((id) => { const e = document.getElementById(id); return e && !e.classList.contains("hidden"); });
        const starts = [...document.querySelectorAll("#step-length .btn-gold, #step-length .btn, #startBtn")].map((x) => ((x.getBoundingClientRect().width > 0) ? "[V]" : "[H]") + (x.textContent || "").trim().replace(/\s+/g, " ").slice(0, 26));
        return JSON.stringify({
          card: stepVis,
          qlen: (typeof state !== "undefined" && state.quiz) ? state.quiz.length : -9,
          idx: (typeof state !== "undefined") ? state.idx : -9,
          cls: (typeof state !== "undefined") ? state.cls : "?",
          subj: (typeof state !== "undefined") ? state.subject : "?",
          count: (typeof state !== "undefined") ? state.count : "?",
          starts: starts,
          guardLock: document.body.classList.contains("guard-lock"),
          guardOk: (() => { try { return window.__guardVerify ? !!window.__guardVerify() : "n/a"; } catch (e) { return "threw"; } })(),
          quizErr: String(window.QUIZ_ERR || "").slice(0, 60),
          toast: (document.getElementById("toast")?.textContent || "").trim().slice(0, 80)
        });
      } catch (e) { return "snap-err"; }
    }).catch(() => "ev-err");
    console.log("  @" + label, snap);
    await dirt();
  };
  await cp("reset", async () => { await ev(() => { resetToClass(); }); });
  const walk = () => {
    const hits = [];
    document.querySelectorAll("body *").forEach((el) => {
      if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) || el.children.length) return;
      const t = el.textContent || "";
      if (/NaN|undefined|Infinity|\[object Object\]/.test(t)) {
        const id = el.id ? "#" + el.id : (el.className ? "." + String(el.className).split(" ")[0] : el.tagName);
        hits.push(id + ":" + t.trim().slice(0, 40));
      }
    });
    return hits.slice(0, 8);
  };
  console.log("  setup:", JSON.stringify(await ev(walk)));
  await cp("t-class", async () => { await ev(() => { document.querySelector("#classTabs .tab, #classTabs .chip, #classTabs button")?.click(); }); });
  await cp("t-chip", async () => { await ev(() => { const cs = [...document.querySelectorAll("#subjectChips .chip, #subjectChips button")]; (cs.find((x) => /Mathematics/.test(x.textContent)) || cs[0])?.click(); }); });
  await cp("t-count", async () => { await ev(() => { const cs = document.querySelectorAll("#countBoxes .count"); [...cs].find((x) => /\b10\b/.test(x.textContent))?.click(); }); });
  await cp("t-go", async () => { await ev(() => { [...document.querySelectorAll("#step-length .btn-gold, #step-length .btn, #startBtn")].find((x) => /Commence|Start paper|Begin|Start quiz/i.test(x.textContent))?.click(); }); });
  await cp("t-ans1", async () => { await ev(() => { document.querySelector("#quizCard .opt")?.click(); }); });
  await cp("t-next1", async () => { await ev(() => { nextQ(); }); });
  await cp("t-next2", async () => { await ev(() => { nextQ(); }); });
  console.log("  paper:", JSON.stringify(await ev(walk)));
  await ev(() => { openHQ(); });
  await sleep(800);
  console.log("  hq:", JSON.stringify(await ev(walk)));
  await ev(() => { closeHQ(); quitQuiz(); });
  await sleep(300);
  ok("textwalk done", true);

  /* ---------- 14. persistence + corrupt storage ---------- */
  step("persist");
  m0 = STEP.errs.length;
  await p.reload({ waitUntil: "load", timeout: 60000 });
  await p.waitForFunction(() => typeof CLASSES !== "undefined" && CLASSES.length > 0, { timeout: 30000 });
  await sleep(1200);
  ok("reload clean", errsSince(m0).length === 0, errsSince(m0).join(" | "));
  m0 = STEP.errs.length;
  await ev(() => {
    ["nssc_acc", "nssc_user", "nssc_marks", "nssc_xp_a", "nssc_session", "nssc_theme", "nssc_mistakes"].forEach((k) => {
      try { localStorage.setItem(k, '{"broken'); } catch (e) {}
    });
  });
  await p.reload({ waitUntil: "load", timeout: 60000 });
  await p.waitForFunction(() => typeof CLASSES !== "undefined" && CLASSES.length > 0, { timeout: 30000 });
  await sleep(1500);
  ok("corrupt-storage boot", await ev(() => (typeof CLASSES !== "undefined") && CLASSES.length > 0));
  ok("no corrupt-boot errors", errsSince(m0).length === 0, errsSince(m0).join(" | "));
  await dirt();

  console.log("\n==== console warnings/errors (" + STEP.cons.length + ") ====");
  [...new Set(STEP.cons)].slice(0, 15).forEach((c) => console.log(" ", c));
  console.log("\n==== RESULT: " + (fails ? fails + " FAILURES" : "ALL CLEAN") + " ====");
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
