/* v39.0 suite — zero-jump focus (preventScroll everywhere) + bugfix sweep:
   palette Papers labels, empty-quiz guards, curriculum bank-lock fix.
   Run: node quiz/_test_v39.js */
const fs = require("fs");
const zlib = require("zlib");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const PRO = fs.readFileSync("quiz/pro.js", "utf8");
const NOTESAPP = fs.readFileSync("quiz/notes_app.js", "utf8");
const CURRIC = fs.readFileSync("quiz/curriculum.js", "utf8");
const LABS = fs.readFileSync("labs.js", "utf8");
const EDU = fs.readFileSync("edu.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 260)); } };

(async () => {
  await run("source: zero bare .focus() in index.html (all preventScroll)", () => {
    const bare = (HTML.match(/\.focus\(\)/g) || []).length;
    if (bare !== 0) throw bare + " bare .focus() calls";
    const ps = (HTML.match(/\.focus\(\{preventScroll:!0\}\)/g) || []).length;
    if (ps < 7) throw "only " + ps + " preventScroll focus calls (expected 7)";
  });
  await run("source: pro.js + notes_app.js focus hardened (no unguarded bare)", () => {
    for (const [name, src] of [["pro.js", PRO], ["notes_app.js", NOTESAPP]]) {
      if (src.indexOf("focus({ preventScroll: true })") < 0) throw name + ": preventScroll focus missing";
      let i = -1;
      while ((i = src.indexOf(".focus()", i + 1)) >= 0) {
        if (src.slice(Math.max(0, i - 140), i).indexOf("preventScroll") < 0) throw name + ": unguarded bare .focus()";
      }
    }
  });
  await run("source: still exactly 2 window.scrollTo in index.html", () => {
    const all = (HTML.match(/window\.scrollTo\(/g) || []).length;
    if (all !== 2) throw "found " + all;
  });
  await run("source: empty-quiz guards (pick/nextQ/showResults/merits)", () => {
    if (HTML.indexOf("function pick(t){if(!state.quiz||!state.quiz.length)return;") < 0) throw "pick guard missing";
    if (HTML.indexOf("function nextQ(){if(!state.quiz||!state.quiz.length)return;") < 0) throw "nextQ guard missing";
    if (HTML.indexOf("Nothing to mark yet") < 0) throw "showResults guard missing";
    if (HTML.indexOf("(+lastResult.pct||0)/5") < 0) throw "merits NaN guard missing";
  });
  await run("source: bank-lock fix (tolerant guards + reinject + self-heal)", () => {
    if (HTML.indexOf("t.subj.length>=13") < 0) throw "index applyBank guard not tolerant";
    if (LABS.indexOf("q.subj.length >= 13") < 0) throw "labs guard not tolerant";
    if (EDU.indexOf("q.subj.length >= 13") < 0) throw "edu guard not tolerant";
    if (HTML.indexOf("__curicReinject") < 0) throw "boot reinject hook missing";
    if (CURRIC.indexOf("__curicReinject") < 0) throw "curriculum reinject missing";
    if (HTML.indexOf("bankTries=0,window.QUIZ_ERR=null") < 0) throw "boot self-heal missing";
  });
  await run("source: re-boot never clobbers a live paper", () => {
    if (HTML.indexOf("if(state.quiz&&state.quiz.length)") < 0) throw "live-boot guard missing";
    if (HTML.indexOf("window.__miOn") < 0) throw "mock-integrity re-init guard missing";
    if (HTML.indexOf("__bootCardDone") < 0) throw "first-boot-only setCard missing";
  });
  await run("source: palette Papers rows use real class/subject names", () => {
    if (PRO.indexOf('c.c + " · " + c.s') >= 0) throw "undefined-label rows still present";
    if (PRO.indexOf('c.class + " · " + sn') < 0) throw "fixed labels missing";
  });
  await run("sw.js: versioned (v39+)", () => {
    if (!/"-v(39|[4-9][0-9])"/.test(SW)) throw "NSS_V not versioned v39+";
  });
  await run("boot wire still <= 266240 B", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    console.log("   (wire " + w + " — headroom " + (266240 - w) + " B)");
  });

  /* -------- real Chrome -------- */
  let puppeteer = null;
  try { puppeteer = require("puppeteer"); } catch (e) {}
  if (!puppeteer) throw "puppeteer unavailable";
  const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"] });
  try {
    for (const v of [{ w: 375, h: 667 }, { w: 1280, h: 800 }]) {
      const p = await b.newPage();
      const errs = [];
      p.on("dialog", (d) => { try { d.dismiss(); } catch (e) {} });
      p.on("pageerror", (e) => errs.push(String(e.message || e).slice(0, 150)));
      p.on("console", (m) => {
        if (m.type() !== "error") return;
        const t = m.text() || "";
        if (/GSI_LOGGER|Failed to load resource|net::ERR/i.test(t)) return;
        errs.push("console: " + t.slice(0, 120));
      });
      await p.setViewport({ width: v.w, height: v.h });
      await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
      await p.waitForFunction(() => typeof CLASSES !== "undefined" && CLASSES.length > 0, { timeout: 20000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 700));
      await run("chrome " + v.w + ": focus/scroll tripwire — flows never scroll, all focus preventScroll", async () => {
        const m = await p.evaluate(async () => {
          const r = { focusBare: [], scrollTos: [], steps: [] };
          const OF = Element.prototype.focus;
          Element.prototype.focus = function (...a) {
            const o = a[0];
            if (!(o && typeof o === "object" && o.preventScroll === true)) {
              r.focusBare.push((this.id ? "#" + this.id : this.tagName) + ":" + JSON.stringify(a).slice(0, 40));
            }
            return OF.apply(this, a);
          };
          const OS = window.scrollTo.bind(window);
          window.scrollTo = function (...a) { r.scrollTos.push(JSON.stringify(a).slice(0, 60)); return OS.apply(this, a); };
          const sleep = (ms) => new Promise((x) => setTimeout(x, ms));
          const settleTo = async (y) => {
            OS(0, y);
            for (let i = 0; i < 25; i++) { await sleep(100); if (Math.abs(window.scrollY - y) < 5) break; }
            return window.scrollY;
          };
          try { const g = document.getElementById("guestName"); if (g) g.value = "Ada"; signUpGuest(); } catch (e) {}
          await sleep(400);
          document.querySelector("#classTabs .tab, #classTabs .chip, #classTabs button")?.click();
          await sleep(350);
          [...document.querySelectorAll("#subjectChips .chip, #subjectChips button")].find((x) => /Mathematics/.test(x.textContent))?.click();
          await sleep(350);
          const counts = document.querySelectorAll("#countBoxes .count");
          [...counts].find((x) => /\b10\b/.test(x.textContent))?.click();
          await sleep(350);
          r.scrollTos.length = 0; r.focusBare.length = 0;
          [...document.querySelectorAll("#step-length .btn-gold, #step-length .btn, #startBtn")].find((x) => /Commence|Start paper|Begin|Start quiz/i.test(x.textContent))?.click();
          await sleep(700);
          r.inQuiz = !!document.getElementById("quizCard") && !document.getElementById("quizCard").classList.contains("hidden");
          const yb = await settleTo(500);
          document.querySelector("#quizCard .opt")?.click();
          await sleep(350);
          r.yAns = window.scrollY;
          try { togglePalette(); } catch (e) {}
          await sleep(250);
          [...document.querySelectorAll("#palette .pal-n")].find((x) => x.textContent === "3")?.click();
          await sleep(400);
          r.yPal = window.scrollY;
          try { nextQ(); } catch (e) {}
          await sleep(400);
          r.yNext = window.scrollY; r.yb = yb;
          r.nScroll = r.scrollTos.length; r.nBare = r.focusBare.length;
          r.scrollSample = r.scrollTos.slice(0, 3); r.bareSample = r.focusBare.slice(0, 3);
          window.scrollTo = OS;
          Element.prototype.focus = OF;
          return r;
        });
        if (!m.inQuiz) throw "quiz did not start";
        if (m.nBare) throw m.nBare + " non-preventScroll focus calls: " + JSON.stringify(m.bareSample);
        if (m.nScroll) throw m.nScroll + " scrollTo calls during flows: " + JSON.stringify(m.scrollSample);
        for (const k of ["yAns", "yPal", "yNext"]) {
          if (Math.abs(m[k] - m.yb) > 8) throw "strict zero-jump violated at " + k + ": " + JSON.stringify({ yb: m.yb, [k]: m[k] });
        }
        if (errs.length) throw errs.length + " page errors: " + errs[0];
      });
      await run("chrome " + v.w + ": bank stays unlocked after curriculum augment + re-boot", async () => {
        await p.waitForFunction(() => !!window.__curicApi, { timeout: 60000 });
        const m = await p.evaluate(async () => {
          const sleep = (ms) => new Promise((x) => setTimeout(x, ms));
          const before = CLASSES.reduce((n, c) => n + c.questions.length, 0);
          for (let i = 0; i < 3; i++) { try { boot(); } catch (e) {} await sleep(300); }
          await sleep(800);
          const after = CLASSES.reduce((n, c) => n + c.questions.length, 0);
          let hist = 0;
          CLASSES.forEach((c) => c.questions.forEach((q) => { if (q.s === "History") hist++; }));
          return {
            before, after, hist, added: window.__curicApi.added,
            quizErr: String(window.QUIZ_ERR || ""),
            guardOk: (() => { try { return !!window.__guardVerify(); } catch (e) { return false; } })(),
            guardLock: document.body.classList.contains("guard-lock"),
            subj: QUIZ_RAW.subj.length
          };
        });
        if (m.quizErr) throw "QUIZ_ERR set: " + m.quizErr.slice(0, 80);
        if (!m.guardOk || m.guardLock) throw "integrity gate locked: " + JSON.stringify(m);
        if (m.subj < 13) throw "subjects lost: " + m.subj;
        if (m.after < m.before) throw "questions lost across re-boot: " + m.before + " -> " + m.after;
        if (!(m.added > 0)) throw "curriculum injected nothing";
        if (m.after !== 3900 + m.added) throw "curriculum questions missing from bank: total " + m.after + " (want " + (3900 + m.added) + ")";
        if (!(m.hist > 0)) throw "no History questions in bank after re-boot";
      });
      await run("chrome " + v.w + ": mid-quiz bank event never yanks the paper", async () => {
        const m = await p.evaluate(async () => {
          const sleep = (ms) => new Promise((x) => setTimeout(x, ms));
          resetToClass();
          await sleep(250);
          document.querySelector("#classTabs .tab, #classTabs .chip, #classTabs button")?.click();
          await sleep(250);
          [...document.querySelectorAll("#subjectChips .chip, #subjectChips button")].find((x) => /Mathematics/.test(x.textContent))?.click();
          await sleep(250);
          [...document.querySelectorAll("#step-length .btn-gold, #step-length .btn, #startBtn")].find((x) => /Commence|Start paper|Begin|Start quiz/i.test(x.textContent))?.click();
          await sleep(600);
          document.querySelector("#quizCard .opt")?.click();
          await sleep(300);
          const qlen = state.quiz.length, ans0 = state.answers[0];
          try { window.dispatchEvent(new Event("quizbank-updated")); } catch (e) {}
          try { boot(); } catch (e) {}
          await sleep(600);
          return {
            qlen, ans0,
            stillQuiz: !!document.getElementById("quizCard") && !document.getElementById("quizCard").classList.contains("hidden"),
            qlenAfter: state.quiz.length, ansAfter: state.answers[0]
          };
        });
        if (!m.stillQuiz) throw "paper yanked out of quizCard by bank event";
        if (m.qlenAfter !== m.qlen || m.ansAfter !== m.ans0) throw "quiz state damaged: " + JSON.stringify(m);
        await p.evaluate(() => { resetToClass(); });
      });
      await run("chrome " + v.w + ": mid-setup bank event preserves the step", async () => {
        const m = await p.evaluate(async () => {
          const sleep = (ms) => new Promise((x) => setTimeout(x, ms));
          resetToClass();
          await sleep(250);
          document.querySelector("#classTabs .tab, #classTabs .chip, #classTabs button")?.click();
          await sleep(250);
          [...document.querySelectorAll("#subjectChips .chip, #subjectChips button")][0]?.click();
          await sleep(250);
          const before = ["step-class", "step-subject", "step-length"].filter((id) => !document.getElementById(id).classList.contains("hidden"));
          try { window.dispatchEvent(new Event("quizbank-updated")); } catch (e) {}
          try { boot(); } catch (e) {}
          await sleep(500);
          const after = ["step-class", "step-subject", "step-length"].filter((id) => !document.getElementById(id).classList.contains("hidden"));
          return { before, after };
        });
        if (JSON.stringify(m.before) !== JSON.stringify(m.after)) throw "setup step yanked: " + JSON.stringify(m);
        if (m.after.length !== 1 || m.after[0] !== "step-length") throw "not on length step: " + JSON.stringify(m);
      });
      await run("chrome " + v.w + ": empty-quiz guards — no throw, no NaN, normal flow intact", async () => {
        const m = await p.evaluate(async () => {
          const sleep = (ms) => new Promise((x) => setTimeout(x, ms));
          const r = {};
          resetToClass();
          await sleep(300);
          try { pick(0); r.pickThrow = ""; } catch (e) { r.pickThrow = String(e.message || e).slice(0, 80); }
          try { nextQ(); r.nextThrow = ""; } catch (e) { r.nextThrow = String(e.message || e).slice(0, 80); }
          await sleep(400);
          r.resultShown = !!document.getElementById("resultCard") && !document.getElementById("resultCard").classList.contains("hidden");
          try { doSubmit(); r.subThrow = ""; } catch (e) { r.subThrow = String(e.message || e).slice(0, 80); }
          await sleep(500);
          r.ring = (document.getElementById("ringPct")?.textContent || "").trim().slice(0, 12);
          r.pills = [...document.querySelectorAll(".game-pill")].map((x) => x.textContent.trim().slice(0, 30));
          document.querySelector("#classTabs .tab, #classTabs .chip, #classTabs button")?.click();
          await sleep(300);
          [...document.querySelectorAll("#subjectChips .chip, #subjectChips button")].find((x) => /Mathematics/.test(x.textContent))?.click();
          await sleep(300);
          [...document.querySelectorAll("#step-length .btn-gold, #step-length .btn, #startBtn")].find((x) => /Commence|Start paper|Begin|Start quiz/i.test(x.textContent))?.click();
          await sleep(700);
          r.recovered = !!document.getElementById("quizCard") && !document.getElementById("quizCard").classList.contains("hidden") && state.quiz.length > 0;
          return r;
        });
        if (m.pickThrow) throw "pick threw: " + m.pickThrow;
        if (m.nextThrow) throw "nextQ threw: " + m.nextThrow;
        if (m.subThrow) throw "doSubmit threw: " + m.subThrow;
        if (m.resultShown) throw "empty quiz rendered results";
        if (/NaN/.test(m.ring) || m.pills.some((x) => /NaN/.test(x))) throw "NaN rendered: " + JSON.stringify({ ring: m.ring, pills: m.pills });
        if (!m.recovered) throw "normal paper flow broken after guards";
        if (errs.length) throw errs.length + " page errors: " + errs[0];
      });
      await run("chrome " + v.w + ": palette Papers rows show real names", async () => {
        await p.waitForFunction(() => !!window.__pro, { timeout: 45000 });
        const m = await p.evaluate(async () => {
          const sleep = (ms) => new Promise((x) => setTimeout(x, ms));
          try { __palOpen(); } catch (e) { return { opened: false }; }
          await sleep(500);
          const rows = [...document.querySelectorAll("#palList .pal-it")].map((x) => x.textContent.trim().replace(/\s+/g, " ").slice(0, 60));
          try { document.getElementById("palQ")?.remove(); } catch (e) {}
          return { opened: true, rows };
        });
        if (!m.opened) throw "palette did not open";
        if (!m.rows.length) throw "palette rendered no rows";
        const bad = m.rows.filter((x) => /undefined/.test(x));
        if (bad.length) throw "undefined rows: " + JSON.stringify(bad.slice(0, 2));
        if (!m.rows.some((x) => /SS[123] · /.test(x))) throw "no Papers rows visible: " + JSON.stringify(m.rows.slice(0, 4));
      });
      await p.close();
    }
  } finally { await b.close(); }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v39 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("suite crashed:", e); process.exit(2); });
