/* v20 desktop probe — AI Coach "Suggested for you" on PC widths. */
const puppeteer = require("puppeteer");
const path = require("path");
(async () => {
  const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const p = await b.newPage();
  const vps = [
    { w: 1024, h: 768, name: "pc-1024" },
    { w: 1280, h: 800, name: "pc-1280" },
    { w: 1440, h: 900, name: "pc-1440" },
    { w: 1920, h: 1080, name: "pc-1920" },
    { w: 2560, h: 1440, name: "pc-2560" },
  ];
  for (const v of vps) {
    await p.setViewport({ width: v.w, height: v.h });
    await p.goto("file://" + path.resolve("index.html"), { waitUntil: "load" });
    await p.waitForFunction(() => typeof CLASSES !== "undefined", { timeout: 20000 }).catch(() => {});
    await p.evaluate(() => {
      document.getElementById("gateName").value = "A B";
      document.getElementById("gateEmail").value = "a@b.c";
      gateSignUp();
    });
    await new Promise(r => setTimeout(r, 900));
    const m = await p.evaluate(() => {
      const g = document.getElementById("aiGrid");
      const card = document.getElementById("aiCoach");
      const it = [...g.querySelectorAll(".ai-it")];
      const emH = it.map(x => { const e = x.querySelector("em"); return e ? Math.round(e.getBoundingClientRect().height) : 0; });
      const btnW = it.map(x => { const b = x.querySelector(".ai-go"); return b ? Math.round(b.getBoundingClientRect().width) : 0; });
      const mainMin = Math.min(...it.map(x => { const m = x.querySelector(".ai-main"); return m ? Math.round(m.getBoundingClientRect().width) : 1e9; }));
      const overflow = it.filter(x => x.scrollWidth > x.clientWidth + 2).map(x => x.className.split(" ")[0]);
      const cols = getComputedStyle(g).gridTemplateColumns.split(" ").length;
      let textClip = 0;
      it.forEach(x => x.querySelectorAll("b,small,em,.ai-go").forEach(t => { if (t.scrollWidth > t.clientWidth + 2) textClip++; }));
      return {
        cols,
        cards: it.length,
        cardW: it.map(x => Math.round(x.getBoundingClientRect().width)),
        emH, btnW, mainMin,
        overflow,
        textClip,
        coachW: card ? Math.round(card.getBoundingClientRect().width) : 0,
        wrapW: document.getElementById("main") ? Math.round(document.getElementById("main").getBoundingClientRect().width) : 0,
      };
    });
    console.log(v.name, JSON.stringify(m));
    if (v.name === "pc-1280" || v.name === "pc-1920") {
      await p.evaluate(() => { const el = document.getElementById("aiCoach"); if (el) el.scrollIntoView(); });
      await new Promise(r => setTimeout(r, 500));
      await p.screenshot({ path: "quiz/_shot_" + v.name + ".png", fullPage: false });
    }
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
