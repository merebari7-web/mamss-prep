/* Responsive layout audit v14 — headless Chrome, multiple viewports.
   Run: node quiz/_audit_rwd.js  (expects repo root with index.html + bank.js + labs.js + edu.js) */
const puppeteer = require("puppeteer");
const path = require("path");

const VIEWPORTS = [
  { name: "phone-sm-320", w: 320, h: 568 },
  { name: "phone-360", w: 360, h: 640 },
  { name: "phone-375", w: 375, h: 667 },
  { name: "phone-390", w: 390, h: 844 },
  { name: "phone-393", w: 393, h: 852 },
  { name: "phone-412", w: 412, h: 915 },
  { name: "phone-430", w: 430, h: 932 },
  { name: "phone-landscape", w: 667, h: 375 },
  { name: "tablet-768", w: 768, h: 1024 },
  { name: "tablet-1024", w: 1024, h: 768 },
  { name: "laptop-1280", w: 1280, h: 800 },
  { name: "desktop-1440", w: 1440, h: 900 },
];
const URL = "file://" + path.resolve("index.html");
const ISSUES = [];

function audit(page) {
  return page.evaluate(() => {
    const out = [];
    const vw = window.innerWidth;
    const dw = document.documentElement;
    if (dw.scrollWidth - dw.clientWidth > 1) out.push(`PAGE-H-OVERFLOW ${dw.scrollWidth - dw.clientWidth}px`);
    const intentional = el => { const cs = getComputedStyle(el); return /auto|scroll/.test(cs.overflowX) && el.scrollWidth <= Math.max(window.innerWidth * 1.6, 700); };
    const decor = el => el.closest("#aurora,#heroSun,#heroFx,#confetti,#curtain,.blob,.rays,.facade,.watermark,#readBar,.cube-scene") || /^I$/.test(el.tagName);
    const inScroller = el => { for (let p = el; p && p !== document.body; p = p.parentElement) { if (intentional(p)) return true; } return false; };
    document.querySelectorAll("body *").forEach(el => {
      if (intentional(el) || inScroller(el) || decor(el)) return; // designed scroller (and its children) / decor
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      if (cs.pointerEvents === "none" && !el.onclick && !el.getAttribute("onclick")) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.right > vw + 2 && r.left < vw)
        out.push(`OFFSCREEN ${el.tagName.toLowerCase()}${el.id ? "#" + el.id : "." + String(el.className).split(" ")[0]} r=${Math.round(r.right)}`);
      if (r.left < -2 && r.right > 0) out.push(`OFFSCREEN-L ${el.tagName.toLowerCase()}#${el.id} l=${Math.round(r.left)}`);
      if (/auto|scroll/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2)
        out.push(`SCROLLER ${el.id || el.className || el.tagName} (${el.scrollWidth - el.clientWidth}px)`);
      if (/hidden/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2 && !el.classList.contains("hero"))
        out.push(`CLIP ${el.id || el.className || el.tagName} (${el.scrollWidth - el.clientWidth}px)`);
      if (el.children.length === 0 && el.scrollHeight > el.clientHeight + 4 && /hidden/.test(cs.overflowY))
        out.push(`TXT-CLIP ${el.id || el.className || el.tagName}`);
    });
    if (vw <= 800) {
      const tiny = [];
      document.querySelectorAll("button, a, [role=button], .tab, .chip, .opt, .mp, .hd-btn").forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.height < 36 && r.width < 36) tiny.push(`#${el.id || String(el.className).split(" ")[0]} ${Math.round(r.width)}x${Math.round(r.height)}`);
      });
      if (tiny.length > 10) out.push("TINY-TARGETS " + tiny.slice(0, 10).join(" | "));
      else if (tiny.length) out.push("TINY-TARGETS " + tiny.join(" | "));
    }
    return out;
  });
}

async function snap(page, state, vp) {
  await new Promise(r => setTimeout(r, 350));
  const res = await audit(page);
  if (res.length) ISSUES.push(`${vp.name} :: ${state} :: ${res.slice(0, 6).join(" ; ")}`);
}

(async () => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    env: { ...process.env, LD_LIBRARY_PATH: "/tmp/libx/usr/lib/x86_64-linux-gnu:/tmp/libx/lib/x86_64-linux-gnu" },
  });
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1, isMobile: vp.w <= 800, hasTouch: vp.w <= 800 });
    await page.goto(URL, { waitUntil: "load" });
    try { await page.waitForFunction(() => typeof CLASSES !== "undefined" || !!window.QUIZ_ERR, { timeout: 20000 }); }
    catch (e) { console.log(vp.name, "bank wait timeout"); }
    await snap(page, "gate", vp);
    await page.evaluate(() => {
      document.getElementById("gateName").value = "Audit User";
      document.getElementById("gateEmail").value = "audit@test.dev";
      gateSignUp();
    });
    await snap(page, "home", vp);
    for (const lab of ["records", "planner", "quizme", "blitz", "focus"]) {
      try { await page.evaluate((l) => window.labs(l), lab); await snap(page, "lab-" + lab, vp); } catch (e) { console.log(vp.name, lab, "open failed"); }
    }
    await page.evaluate(() => { try { LX.close(); } catch (e) {} });
    await page.evaluate(() => {
      state.cls = 1; state.subject = "Mathematics"; state.count = 5;
      const q = document.getElementById("examToggle"); if (q) q.checked = false;
      startQuiz();
    });
    await snap(page, "quiz", vp);
    // Teaching Suite (lazy edu.js)
    try {
      await page.evaluate(() => window.edu("notes"));
      await page.waitForFunction(() => !!window.EDU && !!window.EDU.ready, { timeout: 20000 });
      await snap(page, "edu-notes", vp);
      for (const v of ["cbt", "scheme", "syllabus", "marks"]) {
        try { await page.evaluate((x) => EDU.go(x), v); await snap(page, "edu-" + v, vp); } catch (e) {}
      }
    } catch (e) { console.log(vp.name, "edu open failed:", String(e).slice(0, 60)); }
    // Study Arcade (lazy arcade.js)
    try {
      await page.evaluate(() => window.arc ? window.arc("open") : null);
      await page.waitForFunction(() => !!window.ARC && !!window.ARC.ready, { timeout: 20000 });
      await snap(page, "arc-home", vp);
      await page.evaluate(() => ARC.go("utme"));
      await snap(page, "arc-utme-pick", vp);
      await page.evaluate(() => { try { ARC.utmeStart({ subjects: ["English Language", "Mathematics", "Physics", "Chemistry"] }); } catch (e) {} });
      await snap(page, "arc-utme-q", vp);
      await page.evaluate(() => { try { ARC.go("cards", { subj: "French" }); } catch (e) {} });
      await snap(page, "arc-cards", vp);
      await page.evaluate(() => { try { ARC.calcToggle(); } catch (e) {} });
      await snap(page, "arc-utme-calc", vp);
      await page.evaluate(() => { try { ARC.calcToggle(); } catch (e) {} });
      await page.evaluate(() => ARC.go("essay"));
      await snap(page, "arc-essay", vp);
      await page.evaluate(() => { try { ARC.go("utme"); ARC.utmePreset("Science"); } catch (e) {} });
      await snap(page, "arc-utme-preset", vp);
      await page.evaluate(() => ARC.go("stats"));
      await snap(page, "arc-stats", vp);
      await page.evaluate(() => { try { ARC.essayReveal(); } catch (e) {} });
      await snap(page, "arc-essay-reveal", vp);
      await page.evaluate(() => ARC.go("videos"));
      await snap(page, "arc-videos", vp);
    } catch (e) { console.log(vp.name, "arc open failed:", String(e).slice(0, 60)); }
    await page.close();
  }
  await browser.close();
  console.log(`\n== RESPONSIVE AUDIT v14: ${ISSUES.length} issue(s) across ${VIEWPORTS.length} viewports ==`);
  const byVp = {};
  for (const i of ISSUES) { const k = i.split(" :: ")[0]; byVp[k] = (byVp[k] || 0) + 1; }
  console.log(JSON.stringify(byVp));
  for (const i of ISSUES.slice(0, 30)) console.log(" -", i);
})().catch(e => { console.error("audit crashed:", e); process.exit(2); });
