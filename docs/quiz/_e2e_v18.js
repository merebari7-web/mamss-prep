/* v18 E2E — real Chrome: computed-style verification of the Aurum graphics
   (glass plates, gold numerals, shimmer fills, chips, breathing ring) +
   small-width overflow probe. */
const puppeteer = require("puppeteer");
const path = require("path");

(async () => {
  const TARGET = process.env.E2E_URL || "file://" + path.resolve("index.html");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e.message).slice(0, 120)));
  page.on("console", m => { if (m.type() === "error" && !/GSI_LOGGER|given origin is not allowed/.test(m.text())) errs.push("console: " + m.text().slice(0, 120)); });

  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(TARGET, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(() => {
    const n = document.getElementById("gateName"), e = document.getElementById("gateEmail");
    if (n) n.value = "A B"; if (e) e.value = "a@b.c"; if (window.gateSignUp) gateSignUp();
  });
  await new Promise(r => setTimeout(r, 700));

  const shell = await page.evaluate(() => {
    const stat = document.querySelector(".stat");
    const toast = document.getElementById("toast");
    const hub = document.querySelector(".h-ring");
    return {
      statBg: stat ? getComputedStyle(stat).backgroundImage.slice(0, 60) : null,
      statBorder: stat ? getComputedStyle(stat).borderTopColor : null,
      statNum: stat ? getComputedStyle(stat.querySelector("b")).backgroundImage.slice(0, 50) : null,
      toastBorder: toast ? getComputedStyle(toast).borderTopColor : null,
      heroRing: hub ? getComputedStyle(hub).boxShadow.slice(0, 60) : null,
      kbHint: document.querySelector(".kb-hint") ? getComputedStyle(document.querySelector(".kb-hint")).backgroundColor : null,
    };
  });

  // arcade stats: KPI numerals + shimmer
  await page.evaluate(() => window.arc("open"));
  await new Promise(r => setTimeout(r, 1400));
  await page.evaluate(() => ARC.go("stats"));
  await new Promise(r => setTimeout(r, 500));
  const arc = await page.evaluate(() => {
    const kpi = document.querySelector(".arc-kpi b");
    const bar = document.querySelector(".arc-wbar i");
    const anim = bar ? getComputedStyle(bar, "::after").animationName : null;
    const pill = document.querySelector(".arc-pill");
    return {
      kpiNum: kpi ? getComputedStyle(kpi).backgroundImage.slice(0, 46) : null,
      kpiBorder: kpi ? getComputedStyle(kpi.closest(".arc-kpi")).borderTopColor : null,
      shimmer: anim, pillBorder: pill ? getComputedStyle(pill).borderTopColor : null,
    };
  });
  await page.evaluate(() => { try { ARC.close(); } catch (e) {} });

  // edu: question chips + selects
  await page.evaluate(() => window.edu("notes"));
  await new Promise(r => setTimeout(r, 1200));
  const edu = await page.evaluate(() => {
    const b = document.querySelector(".edu-qhead b");
    const sel = document.querySelector(".edu-sel");
    return {
      qChip: b ? getComputedStyle(b).backgroundImage.slice(0, 46) : null,
      selBorder: sel ? getComputedStyle(sel).borderTopColor : null,
    };
  });
  await page.evaluate(() => { try { EDU.close(); } catch (e) {} });

  // labs focus: breathing ring
  await page.evaluate(() => window.labs("focus"));
  await new Promise(r => setTimeout(r, 1300));
  const lx = await page.evaluate(() => {
    const ring = document.querySelector(".lx-focus-ring");
    return { breath: ring ? (getComputedStyle(ring).animationName || "") : null };
  });
  await page.evaluate(() => { try { LX.close(); } catch (e) {} });

  // small-width overflow probe
  function overflowProbe() {
    const dw = document.documentElement;
    const bad = [];
    if (dw.scrollWidth - dw.clientWidth > 1) bad.push("PAGE " + (dw.scrollWidth - dw.clientWidth) + "px");
    document.querySelectorAll("#aiGrid .ai-it, .stat, .arc-tile, .edu-card, .lx-modal").forEach(el => {
      if (el.scrollWidth > el.clientWidth + 2) bad.push((el.className || el.tagName) + " clip");
    });
    return bad;
  }
  let coachBad = [], arcBad = [];
  for (const w of [320, 360, 375]) {
    await page.setViewport({ width: w, height: 780, isMobile: true, hasTouch: true });
    await page.goto(TARGET, { waitUntil: "load", timeout: 60000 });
    await new Promise(r => setTimeout(r, 500));
    coachBad = coachBad.concat(await page.evaluate(overflowProbe));
    await page.evaluate(() => window.arc("open"));
    await new Promise(r => setTimeout(r, 1300));
    arcBad = arcBad.concat(await page.evaluate(overflowProbe));
  }

  console.log("shell:", JSON.stringify(shell));
  console.log("arc:", JSON.stringify(arc));
  console.log("edu:", JSON.stringify(edu));
  console.log("labs:", JSON.stringify(lx));
  console.log("small-width issues:", coachBad.concat(arcBad).length ? coachBad.concat(arcBad).join(" ; ") : "none");
  console.log("errors:", errs.length ? errs.join(" ; ") : "none");
  const ok = shell.statBg && /gradient/.test(shell.statBg) && shell.statNum && /gradient/.test(shell.statNum) &&
    arc.shimmer === "auFlow" && arc.kpiNum && /gradient/.test(arc.kpiNum) && edu.qChip && /gradient/.test(edu.qChip) &&
    edu.selBorder && /201, 162, 39|201,162,39/.test(edu.selBorder) && lx.breath === "lxBreath" &&
    coachBad.concat(arcBad).length === 0 && errs.length === 0;
  console.log(ok ? "\nE2E V18 OK" : "\nE2E V18 FAIL");
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error("e2e crashed:", e); process.exit(2); });
