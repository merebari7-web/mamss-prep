const puppeteer = require("puppeteer");
const path = require("path");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const p = await b.newPage();
  // quiet console noise
  p.on("pageerror", () => {});
  p.on("console", () => {});
  const log = [];
  const snap = async (name, wait = 700) => {
    await sleep(wait);
    await p.screenshot({ path: "/tmp/v28_" + name + ".png" });
    log.push("ok " + name);
  };
  const tryEval = async (label, fn) => {
    try { await p.evaluate(fn); log.push("ev " + label); }
    catch (e) { log.push("ERR ev " + label + ": " + String(e).slice(0, 90)); }
  };
  await p.setViewport({ width: 1280, height: 800 });
  await p.goto("file://" + path.resolve("index.html"), { waitUntil: "load" });
  await p.waitForFunction(() => typeof CLASSES !== "undefined", { timeout: 25000 }).catch(() => {});
  await sleep(800);
  // sign up as a test user
  await tryEval("signup", () => {
    const n = document.getElementById("gateName"), e = document.getElementById("gateEmail");
    if (n && e) { n.value = "Amina Test"; e.value = "amina28@test.ng"; gateSignUp(); }
  });
  await sleep(1800);
  await snap("01_home_hero");
  await tryEval("scroll560", () => window.scrollTo(0, 620));
  await snap("02_home_mid");
  await tryEval("scroll1400", () => window.scrollTo(0, 1500));
  await snap("03_home_deep");
  await tryEval("scroll2500", () => window.scrollTo(0, 2600));
  await snap("04_home_bottom");
  await tryEval("top", () => window.scrollTo(0, 0));
  await sleep(400);

  // overlays (shell)
  await tryEval("stats", () => openStats && openStats());
  await snap("05_stats");
  await tryEval("closeStats", () => closeStats && closeStats());
  await tryEval("hq", () => openHQ && openHQ());
  await snap("06_progressHQ");
  await tryEval("closeHQ", () => closeHQ && closeHQ());
  await tryEval("lib", () => openLibrary && openLibrary());
  await snap("07_library");
  await tryEval("closeLibrary", () => closeLibrary && closeLibrary());
  await tryEval("help", () => document.getElementById("helpBtn").click());
  await snap("08_help");
  await tryEval("closeHelp", () => closeHelp && closeHelp());

  // lazy surfaces
  await tryEval("arcade", () => document.getElementById("arcLaunch").click());
  await snap("09_arcade");
  await tryEval("arcadeClose", () => { const o = document.querySelector(".overlay:not(.hidden)"); if (o && window.arcadeClose) arcadeClose(); });
  await tryEval("edu", () => eduOpen && eduOpen());
  await snap("10_edu_suite");
  await tryEval("eduClose", () => eduClose && eduClose());
  await tryEval("notes", () => { const b = document.getElementById("ntLaunch"); if (b) b.click(); });
  await snap("11_notes");
  await tryEval("notesClose", () => window.notesX && notesX());
  await tryEval("wheel", () => openWheel && openWheel());
  await snap("12_wheel");
  await tryEval("closeWheel", () => closeWheel && closeWheel());
  await tryEval("calendar", () => cdOpen && cdOpen());
  await snap("13_calendar");
  await tryEval("cdClose", () => cdClose && cdClose());
  await tryEval("palette", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
  });
  await snap("14_palette");
  await tryEval("palClose", () => { const x = document.querySelector(".pal-q .x, #palX"); if (x) x.click(); });
  await tryEval("zen", () => { if (window.zenOpen) zenOpen(); });
  await snap("15_zen");
  await tryEval("zenReset", () => { const z = document.getElementById("zenReset"); if (z) z.click(); });
  await tryEval("zenClose", () => { const z = document.querySelector(".zen-x, #zenX"); if (z) z.click(); });

  // quiz flow: pick class tab SS1 + start
  await tryEval("quiz", () => {
    const tabs = document.querySelectorAll(".clstab");
    if (tabs && tabs.length) tabs[0].click();
    startBtn && startBtn.click();
  });
  await sleep(900);
  await snap("16_quiz_question");
  await tryEval("answer", () => { const o = document.querySelectorAll(".opt"); if (o && o[1]) o[1].click(); });
  await sleep(300);
  await tryEval("submit", () => submitBtn && submitBtn.click());
  await sleep(600);
  await snap("17_result");

  // mobile pass
  await p.setViewport({ width: 375, height: 700 });
  await tryEval("quit", () => quitQuiz && quitQuiz());
  await tryEval("top", () => window.scrollTo(0, 0));
  await sleep(400);
  await snap("18_mob_hero");
  await tryEval("scroll900", () => window.scrollTo(0, 900));
  await snap("19_mob_tiles");
  await tryEval("palette", () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })));
  await snap("20_mob_palette");

  await b.close();
  console.log(log.join("\n"));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
