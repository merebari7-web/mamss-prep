const puppeteer = require("puppeteer");
(async () => {
  const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb"] });
  const shot = async (w, h, tab, chip, file) => {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
    await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
    await p.waitForFunction(() => document.getElementById("holoLaunch") !== null, { timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 900));
    // dismiss the account gate via guest sign-up so the lab is visible
    await p.evaluate(() => {
      const g = document.getElementById("gateOverlay");
      if (g && !g.classList.contains("hidden")) {
        const gn = document.getElementById("guestName");
        if (gn) gn.value = "Ada";
        window.signUpGuest && window.signUpGuest();
      }
    });
    await p.waitForFunction(() => { const g = document.getElementById("gateOverlay"); return !g || g.classList.contains("hidden") || g.style.display === "none"; }, { timeout: 8000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 400));
    await p.click("#holoLaunch");
    await new Promise(r => setTimeout(r, 300));
    if (tab) { await p.evaluate(t => Array.prototype.forEach.call(document.querySelectorAll(".ho-tab"), x => { if (x.getAttribute("data-t") === t) x.click(); }), tab); }
    if (chip !== null) { await p.evaluate(i => { const c = document.querySelectorAll(".ho-chip"); if (c[i]) c[i].click(); }, chip); }
    await new Promise(r => setTimeout(r, 1600));
    await p.screenshot({ path: file });
    await p.close();
  };
  await shot(1280, 800, null, 3, "/tmp/holo_desk_mol.png");
  await shot(1280, 800, "surf", 4, "/tmp/holo_desk_surf.png");
  await shot(375, 667, "orb", null, "/tmp/holo_mob_orb.png");
  await b.close();
})();
