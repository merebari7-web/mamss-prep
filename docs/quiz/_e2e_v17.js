/* v17 E2E — real headless Chrome responsiveness probe of the AI Coach at tiny
   widths + Arcade / Teaching Suite overflow checks. */
const puppeteer = require("puppeteer");
const path = require("path");

function overflowProbe() {
  const dw = document.documentElement;
  const bad = [];
  if (dw.scrollWidth - dw.clientWidth > 1) bad.push("PAGE " + (dw.scrollWidth - dw.clientWidth) + "px");
  const ai = document.getElementById("aiGrid");
  if (ai) {
    const items = ai.querySelectorAll(".ai-it");
    items.forEach((it, i) => {
      if (it.scrollWidth > it.clientWidth + 2) bad.push("ai-it" + i + " clip " + (it.scrollWidth - it.clientWidth) + "px");
      const r = it.getBoundingClientRect();
      if (r.right > innerWidth + 2 || r.left < -2) bad.push("ai-it" + i + " offscreen");
    });
  }
  const body = document.getElementById("arcBody");
  if (body) {
    body.querySelectorAll("*").forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.right > innerWidth + 2 && r.left < innerWidth) bad.push("arc " + (el.id || el.className || el.tagName).slice(0, 24) + " r=" + Math.round(r.right));
    });
    const modal = document.getElementById("arcModal");
    if (modal && modal.scrollWidth > modal.clientWidth + 2) bad.push("arcModal clip");
  }
  return bad;
}

(async () => {
  const TARGET = process.env.E2E_URL || "file://" + path.resolve("index.html");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e.message).slice(0, 120)));
  page.on("console", m => { if (m.type() === "error" && !/GSI_LOGGER|given origin is not allowed/.test(m.text())) errs.push("console: " + m.text().slice(0, 120)); });

  async function coachAt(width) {
    await page.setViewport({ width, height: 780, isMobile: width <= 800, hasTouch: width <= 800 });
    await page.goto(TARGET, { waitUntil: "load", timeout: 60000 });
    await page.evaluate(() => {
      const n = document.getElementById("gateName"), e = document.getElementById("gateEmail");
      if (n) n.value = "A B"; if (e) e.value = "a@b.c";
      if (window.gateSignUp) gateSignUp();
    });
    await new Promise(r => setTimeout(r, 600));
    return page.evaluate(() => {
      try {
        window.aiIdeas = function () {
          return [
            { ico: "🎯", txt: "Mock exam is due", sub: "English Language · 100 questions · 45 minutes · SS3", why: "because your last English paper was 12 days ago and 3 of your weakest topics appear in this paper", btn: "Sit paper", fn: "void 0" },
            { ico: "📖", txt: "Revise your weakest topic — a deliberately very long suggestion title to prove wrapping", sub: "Physics · Waves — Sound & Light combined revision drill", why: "because 60% of your recent misses land in this topic group and it is the fastest way to raise accuracy", btn: "Start drill", fn: "void 0" },
            { ico: "⚡", txt: "Daily streak", sub: "3 days strong — keep it alive today", why: "because streaks build habits on study days", btn: "Go", fn: "void 0" },
          ];
        };
        AI.rot = 0; renderAi();
      } catch (e) { return "render failed: " + e.message; }
      const grid = document.getElementById("aiGrid");
      return { items: grid ? grid.querySelectorAll(".ai-it").length : 0, cols: grid ? getComputedStyle(grid).gridTemplateColumns : "" };
    });
  }

  const results = {};
  for (const w of [320, 360, 375, 414]) results[w] = await coachAt(w);
  const coachBad = await page.evaluate(overflowProbe);
  console.log("coach items/cols:", Object.entries(results).map(([w, r]) => w + ":" + (r.items || 0) + "/" + String(r.cols).slice(0, 30)).join(" | "));

  await page.setViewport({ width: 375, height: 780, isMobile: true, hasTouch: true });
  await page.evaluate(() => window.arc("open"));
  await new Promise(r => setTimeout(r, 1400));
  await page.evaluate(() => ARC.go("utme"));
  await new Promise(r => setTimeout(r, 400));
  const arcBad = await page.evaluate(overflowProbe);

  await page.setViewport({ width: 1280, height: 900, isMobile: false, hasTouch: false });
  await page.evaluate(() => { try { ARC.close(); } catch (e) {} window.scrollTo(0, 0); });
  await new Promise(r => setTimeout(r, 500));
  const desktop = await page.evaluate(() => ({ page: document.documentElement.scrollWidth - document.documentElement.clientWidth, tiles: document.querySelectorAll("#aiGrid .ai-it").length }));

  console.log("coach overflow:", coachBad.length ? coachBad.join(" ; ") : "none");
  console.log("arcade overflow@375:", arcBad.length ? arcBad.join(" ; ") : "none");
  console.log("desktop overflow:", desktop.page + "px | coach items:", desktop.tiles);
  console.log("errors:", errs.length ? errs.join(" ; ") : "none");
  const ok = coachBad.length === 0 && arcBad.length === 0 && desktop.page <= 1 && Object.values(results).every(r => r && r.items === 3) && errs.length === 0;
  console.log(ok ? "\nE2E V17 OK" : "\nE2E V17 FAIL");
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error("e2e crashed:", e); process.exit(2); });
