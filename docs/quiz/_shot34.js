/* v34 screenshots — Scientific Calculator + AI Study Tutor (real Chrome).
   Gate handled: #guestName="Ada" + signUpGuest(). */
const fs = require("fs");
const puppeteer = require("puppeteer");
(async () => {
  const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const v of [{ w: 375, h: 740 }, { w: 1280, h: 860 }]) {
    const p = await b.newPage();
    await p.setViewport({ width: v.w, height: v.h });
    await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
    await p.waitForFunction(() => typeof CLASSES !== "undefined", { timeout: 20000 }).catch(() => {});
    try {
      await p.evaluate(() => { const g = document.getElementById("guestName"); if (g) g.value = "Ada"; });
      await p.evaluate(() => { if (typeof signUpGuest === "function") signUpGuest(); });
    } catch (e) {}
    const t0 = Date.now();
    await p.waitForFunction(() => window.__calcApi && window.__aiApi, { timeout: 20000 });
    console.log(`view ${v.w}: v34 modules loaded in ${Date.now() - t0} ms`);
    await new Promise(r => setTimeout(r, 600));

    /* calculator */
    await p.evaluate(() => { document.getElementById("calcLaunch").scrollIntoView({ block: "center" }); });
    await new Promise(r => setTimeout(r, 300));
    await p.evaluate(() => { window.__calcApi.open(); });
    await new Promise(r => setTimeout(r, 350));
    await p.evaluate(() => {
      const kk = k => Array.prototype.forEach.call(document.querySelectorAll('.ca-k[data-k="' + k + '"]'), x => x.click());
      kk("AC"); kk("sin("); kk("("); kk("3"); kk("0"); kk(")"); kk("+"); kk("1"); kk("0"); kk("×"); kk("2"); kk("^"); kk("3"); kk("=");
    });
    await new Promise(r => setTimeout(r, 300));
    await p.screenshot({ path: `/tmp/v34_calc_${v.w}.png` });
    await p.evaluate(() => { window.__calcApi.close(); });
    await new Promise(r => setTimeout(r, 150));

    /* AI tutor */
    await p.evaluate(() => { document.getElementById("aiLaunch").scrollIntoView({ block: "center" }); });
    await new Promise(r => setTimeout(r, 200));
    await p.evaluate(() => { window.__aiApi.open("ask"); });
    await new Promise(r => setTimeout(r, 350));
    await p.evaluate(() => {
      document.getElementById("aiIn").value = "What is photosynthesis?";
      document.getElementById("aiGo").click();
    });
    await new Promise(r => setTimeout(r, 1300));
    await p.screenshot({ path: `/tmp/v34_ai_${v.w}.png` });
    await p.evaluate(() => { window.__aiApi.close(); });
    await new Promise(r => setTimeout(r, 150));

    /* insights tab */
    await p.evaluate(() => { window.__aiApi.open("insights"); });
    await new Promise(r => setTimeout(r, 400));
    await p.screenshot({ path: `/tmp/v34_ins_${v.w}.png` });
    await p.evaluate(() => { window.__aiApi.close(); });
    await p.close();
  }
  await b.close();
  for (const f of ["v34_calc_375", "v34_calc_1280", "v34_ai_375", "v34_ai_1280", "v34_ins_1280"]) {
    fs.copyFileSync(`/tmp/${f}.png`, `${f}.png`);
    console.log("wrote", `${f}.png`);
  }
})().catch(e => { console.error(e); process.exit(1); });
