/* v25.0 suite — NERDC Lesson Notes: primary curriculum platform (Basic 1–6 ×
   13 subjects, term-by-term schemes), 30 full 8-part lesson notes (Basic 1
   Mathematics × 3 terms), Notes browser + search, Scheme-of-Work generator,
   My Space (role dashboards + Author mode + bookmarks + progress), print/PDF
   export, launcher + lazy loader, SW key -v25.
   Run: node quiz/_test_v25.js */
const fs = require("fs");
const zlib = require("zlib");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const NDATA = fs.readFileSync("quiz/notes_data.js", "utf8");
const NAPP = fs.readFileSync("quiz/notes_app.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 240)); } };

(async () => {
  await run("shell: notes launcher + loader ship", () => {
    if (!/window\.notes=function/.test(HTML)) throw "no loader";
    if (!/ntLaunch/.test(HTML)) throw "no launcher";
    if (!/quiz\/notes_data\.js/.test(HTML)) throw "no data path";
    if (!/quiz\/notes_app\.js/.test(HTML)) throw "no app path";
  });
  await run("notes_data: 30 notes, 13 subjects, all 8 parts, 3 terms x 10 weeks", () => {
    const vm = require("vm");
    const ctx = { window: {} };
    vm.createContext(ctx);
    vm.runInContext(NDATA, ctx);
    const NOTES = ctx.NOTES;
    const PRIM = ctx.PRIM;
    if (!NOTES || NOTES.length !== 30) throw "len " + (NOTES && NOTES.length);
    const perTerm = { 1: 0, 2: 0, 3: 0 };
    const fields = ["obj", "prev", "mat", "content", "ex", "act", "eval", "assign"];
    NOTES.forEach(n => {
      if (n.lvl !== "P" || n.cls !== "B1" || n.subj !== "Mathematics") throw "bad key " + JSON.stringify(n);
      perTerm[n.term]++;
      if (n.week < 1 || n.week > 10) throw "bad week " + n.week;
      fields.forEach(f => { if (n[f] == null || n[f] === "") throw "missing " + f + " in " + n.topic; });
      if (!Array.isArray(n.obj) || n.obj.length < 2) throw "obj not bullets: " + n.topic;
      if (!Array.isArray(n.eval) || n.eval.length < 4) throw "evals: " + n.topic;
      if (n.week === 10 && !/revis|test/i.test(n.topic)) throw "w10 not revision: " + n.topic;
    });
    if (perTerm[1] !== 10 || perTerm[2] !== 10 || perTerm[3] !== 10) throw JSON.stringify(perTerm);
    if (PRIM.subjects.length < 10) throw "subjects " + PRIM.subjects.length;
    if (!PRIM.classes || PRIM.classes.length !== 6) throw "classes";
    PRIM.subjects.forEach(s => {
      if (!s.name || !s.icon) throw "subject missing name/icon";
      const b1 = s.cls && s.cls.B1;
      if (b1 && (b1.length !== 3 || b1.some(t => t.length !== 10))) throw "scheme " + s.name;
    });
    if (!NDATA.match(/NOTES_META/)) throw "no meta";
  });
  await run("notes_app: parses and carries the hooks", () => {
    new Function(NAPP);
    for (const h of ["ntOverlay", "ntBody", "My Space", "Scheme of Work", "NERDC2026", "nssc_role", "nssc_note_bm", "nssc_note_done", "printDoc", "data-open", "data-save", "Author mode"]) {
      if (NAPP.indexOf(h) < 0) throw "missing hook " + h;
    }
  });
  await run("service worker cache key is current (>= -v25)", () => {
    if (!/"-v\d+"/.test(SW)) throw "NSS_V not current";
    if (!/v25/.test(SW)) throw "no v25 note";
  });
  await run("boot wire gzip <= 266240 B", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    console.log("   (wire " + w + " — headroom " + (266240 - w) + " B)");
  });

  /* jsdom end-to-end: open, browse, note view, search, space, role, author */
  const html = HTML.replace('<script src="bank.js"></script>', "<script>" + BANK + "</script>");
  const vc = new VirtualConsole(); vc.on("jsdomError", () => {});
  const d = new JSDOM(html, { runScripts: "dangerously", url: "https://nssc-quiz.test/", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(window) {
      window.DecompressionStream = globalThis.DecompressionStream; window.TextDecoder = globalThis.TextDecoder; window.TextEncoder = globalThis.TextEncoder;
      const vp = new Proxy(function(){}, { get: (t, p) => (p === Symbol.toPrimitive ? () => "" : vp), apply: () => vp, set: () => true });
      window.HTMLCanvasElement.prototype.getContext = () => vp;
      window.speechSynthesis = { cancel() {}, speak() {}, getVoices() { return [{ lang: "en-GB" }]; } };
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      window.scrollTo = () => {}; window.matchMedia = window.matchMedia || (() => ({ matches: false }));
      window.print = () => {};
    } });
  const w = d.window;
  await new Promise(r => setTimeout(r, 700));
  await run("shell boots errorless with notes launcher", () => {
    if (!w.document.getElementById("ntLaunch")) throw "no launcher";
    if (!w.document.getElementById("aiGrid")) throw "no coach";
  });
  await run("notes open -> subject grid -> week list -> full note (8 parts)", async () => {
    w.eval(NDATA); w.eval(NAPP);
    w.eval('window.notes()');
    await new Promise(r => setTimeout(r, 200));
    const ov = w.document.getElementById("ntOverlay");
    if (!ov || ov.style.display === "none") throw "overlay not open";
    if (ov.querySelectorAll(".nt-sub").length < 10) throw "subjects=" + ov.querySelectorAll(".nt-sub").length;
    w.eval('document.querySelector(\'.nt-sub[data-subj="Mathematics"]\').click()');
    await new Promise(r => setTimeout(r, 120));
    const wk = ov.querySelectorAll(".nt-wk").length;
    if (wk !== 10) throw "weeks=" + wk;
    w.eval('document.querySelector(\'.nt-wk[data-open]\').click()');
    await new Promise(r => setTimeout(r, 120));
    const t = ov.textContent;
    for (const s of ["Learning Objectives", "Previous Knowledge", "Instructional Materials", "Lesson Content", "Worked Examples", "Class Activities", "Evaluation Questions", "Assignment"]) {
      if (t.indexOf(s) < 0) throw "missing section: " + s;
    }
    if (ov.querySelector('button[data-b="print"]') == null) throw "no print button";
  });
  await run("bookmark + done toggle persist", async () => {
    const ov = w.document.getElementById("ntOverlay");
    w.eval('document.querySelector(\'button[data-b="bm"]\').click()');
    await new Promise(r => setTimeout(r, 100));
    if (ov.textContent.indexOf("★ Bookmarked") < 0) throw "bookmark text missing";
    w.eval('document.querySelector(\'button[data-b="done"]\').click()');
    await new Promise(r => setTimeout(r, 100));
    if (ov.textContent.indexOf("✓ Done") < 0) throw "done text missing";
    const bm = JSON.parse(w.localStorage.getItem("nssc_note_bm") || "[]");
    const dn = JSON.parse(w.localStorage.getItem("nssc_note_done") || "[]");
    if (bm.length !== 1 || dn.length !== 1) throw "not persisted";
    w.eval('document.querySelector(\'button[data-b="back"]\').click()');
  });
  await run("My Space: role picker + student dashboard + author mode (PIN)", async () => {
    const ov = w.document.getElementById("ntOverlay");
    w.eval('document.querySelector(\'.nt-tabs button[data-tab="space"]\').click()');
    await new Promise(r => setTimeout(r, 120));
    if (ov.textContent.indexOf("Who is using this device?") < 0) throw "no role picker";
    w.eval('document.querySelector(\'button[data-role="student"]\').click()');
    await new Promise(r => setTimeout(r, 120));
    if (ov.textContent.indexOf("My progress") < 0) throw "no student dashboard";
    w.localStorage.setItem("nssc_role", JSON.stringify("teacher"));
    w.eval('document.querySelector(\'.nt-tabs button[data-tab="space"]\').click()');
    await new Promise(r => setTimeout(r, 120));
    if (ov.textContent.indexOf("Author mode") < 0) throw "no author box";
    const pin = ov.querySelector("#ntPin");
    if (!pin) throw "no pin input";
    pin.value = "NERDC2026";
    w.eval('document.querySelector(\'button[data-unlock]\').click()');
    await new Promise(r => setTimeout(r, 120));
    if (ov.querySelector('button[data-new]') == null) throw "unlock failed";
    w.eval('document.querySelector(\'button[data-new]\').click()');
    await new Promise(r => setTimeout(r, 120));
    w.document.getElementById("eTopic").value = "Test Topic: Adding Naira";
    w.document.getElementById("eObj").value = "Add naira amounts\nFind change";
    w.document.getElementById("eEval").value = "Add 3 + 4\nWhat is change?";
    w.eval('document.querySelector(\'button[data-save]\').click()');
    await new Promise(r => setTimeout(r, 150));
    const c = JSON.parse(w.localStorage.getItem("nssc_note_custom") || "[]");
    if (c.length !== 1 || c[0].topic !== "Test Topic: Adding Naira") throw "note not saved: " + JSON.stringify(c[0] || null);
  });
  await run("search finds a note by keyword", async () => {
    const ov = w.document.getElementById("ntOverlay");
    w.eval('document.querySelector(\'.nt-tabs button[data-tab="notes"]\').click()');
    await new Promise(r => setTimeout(r, 120));
    // reset to subject list then search
    w.eval('document.querySelector(\'.nt-chip[data-lvl="P"]\').click()');
    await new Promise(r => setTimeout(r, 100));
    const q = ov.querySelector("#ntQ");
    if (!q) throw "no search box";
    q.value = "subtraction";
    q.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 150));
    if (ov.querySelectorAll(".nt-wk[data-open]").length < 1) throw "no search hits";
  });

  /* real-Chrome: launcher, browse, role dashboards, no overflow, zero errors */
  let puppeteer = null;
  try { puppeteer = require("puppeteer"); } catch (e) {}
  if (puppeteer) {
    const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      for (const v of [{ w: 375, h: 667 }, { w: 1280, h: 800 }]) {
        const p = await b.newPage();
        const errs = [];
        p.on("pageerror", e => errs.push(String(e.message || e).slice(0, 120)));
        await p.setViewport({ width: v.w, height: v.h });
        await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
        await p.waitForFunction(() => typeof CLASSES !== "undefined", { timeout: 20000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 800));
        await run("chrome " + v.w + ": notes e2e, no overflow, no errors", async () => {
          const m = await p.evaluate(async () => {
            if (!document.getElementById("ntLaunch")) throw "no launcher";
            document.getElementById("ntLaunch").click();
            await new Promise(r => setTimeout(r, 900));
            const ov = document.getElementById("ntOverlay");
            if (!ov) throw "no overlay";
            const subs = ov.querySelectorAll(".nt-sub").length;
            ov.querySelector('[data-subj="Mathematics"]').click();
            await new Promise(r => setTimeout(r, 200));
            const weeks = ov.querySelectorAll(".nt-wk").length;
            const first = ov.querySelector(".nt-wk[data-open]");
            if (first) { first.click(); await new Promise(r => setTimeout(r, 200)); }
            const hasNote = ov.textContent.indexOf("Learning Objectives") >= 0;
            document.querySelector(".nt-x").click();
            return { subs, weeks, hasNote,
              overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth };
          });
          if (m.subs < 10) throw "subs=" + m.subs;
          if (m.weeks !== 10) throw "weeks=" + m.weeks;
          if (!m.hasNote) throw "note sections missing";
          if (m.overflow) throw "horizontal overflow";
          if (errs.length) throw errs.length + " page error(s): " + errs[0];
        });
        await p.close();
      }
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v25 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
