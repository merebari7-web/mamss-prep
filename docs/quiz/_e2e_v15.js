/* v15 E2E smoke — real headless Chrome: curo fetches quiz/syllabus_data.js +
   quiz/curr_data.js, the Teaching Suite repaints into the term-by-term map. */
const puppeteer = require("puppeteer");
const path = require("path");

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(String(e.message).slice(0, 140)));
  page.on("console", m => { if (m.type() === "error" && !/GSI_LOGGER|given origin is not allowed/.test(m.text())) errs.push("console: " + m.text().slice(0, 140)); });
  await page.setViewport({ width: 1280, height: 900 });
  const TARGET = process.env.E2E_URL || "file://" + path.resolve("index.html");
  await page.goto(TARGET, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(() => {
    const n = document.getElementById("gateName"), e = document.getElementById("gateEmail");
    if (n) n.value = "A B"; if (e) e.value = "a@b.c";
    if (window.gateSignUp) gateSignUp();
  });
  await new Promise(r => setTimeout(r, 700));

  // open the Teaching Suite syllabus route — curo kicks in on first paint
  await page.evaluate(() => window.edu("syllabus"));
  // wait for data fetch + repaint (684 pills)
  let pills = 0;
  for (let i = 0; i < 40; i++) {
    pills = await page.evaluate(() => (document.getElementById("sylBody") || { querySelectorAll: () => [] }).querySelectorAll(".edu-pill").length);
    if (pills === 684) break;
    await new Promise(r => setTimeout(r, 250));
  }
  const data = await page.evaluate((p) => ({
    syll: !!(window.SYLL && Object.keys(window.SYLL).length === 19),
    curr: !!(window.CURR && Object.keys(window.CURR).length === 19),
    settled: !!window.__curSettled,
    cards: (document.getElementById("sylBody") || { querySelectorAll: () => [] }).querySelectorAll(".edu-grid3 > .edu-card").length,
    pills: p,
    termLabels: [...document.querySelectorAll("#sylBody .edu-sub > b")].slice(0, 6).map(b => b.textContent).join(","),
  }), pills);
  console.log("SYLL loaded:", data.syll, "| CURR loaded:", data.curr, "| settled:", data.settled);
  console.log("cards:", data.cards, "| pills:", data.pills, "| first terms:", data.termLabels);

  // notes route: pick a CURR topic on Mathematics and read the rendered note + evaluation
  const note = await page.evaluate(() => {
    window.edu("notes");
    const sub = document.getElementById("eduSub");
    sub.value = "Mathematics"; sub.dispatchEvent(new Event("change"));
    return new Promise(res => setTimeout(() => {
      const chips = [...document.querySelectorAll(".edu-chip")].map(x => x.textContent);
      const lesson = (document.getElementById("eduLesson") || { textContent: "" }).textContent;
      const work = (document.getElementById("eduWork") || { textContent: "" }).textContent;
      res({
        first: chips[0], chipCount: chips.length,
        obj: /Objectives/.test(lesson), facts: /Key points & facts/.test(lesson),
        qs: document.querySelectorAll("#eduWork .edu-qtext").length,
        sample: lesson.slice(0, 60),
      });
    }, 1500));
  });
  console.log("notes: first chip:", note.first, "| chips:", note.chipCount, "| objectives:", note.obj, "| facts:", note.facts, "| qblocks:", note.qs);

  // scheme route: 3 term cards with 12 weeks each on Mathematics
  const scheme = await page.evaluate(() => {
    window.edu("scheme");
    return new Promise(res => setTimeout(() => {
      const body = document.getElementById("schBody");
      res({
        cards: body ? body.querySelectorAll(".edu-grid3 > .edu-card").length : 0,
        weeks: body ? body.querySelectorAll(".edu-week").length : 0,
        w12: /Week 12/.test((body || { textContent: "" }).textContent),
      });
    }, 700));
  });
  console.log("scheme: term cards:", scheme.cards, "| week rows:", scheme.weeks, "| week 12:", scheme.w12);

  const ok = data.syll && data.curr && data.pills === 684 && data.cards === 19 &&
    note.first && note.obj && note.facts && note.qs >= 4 && scheme.cards === 3 && scheme.weeks === 36;
  console.log("errors:", errs.length ? errs.join(" ; ") : "none");
  console.log(ok && !errs.length ? "\nE2E V15 OK" : "\nE2E V15 FAIL");
  await browser.close();
  process.exit(ok && !errs.length ? 0 : 1);
})().catch(e => { console.error("e2e crashed:", e); process.exit(2); });
