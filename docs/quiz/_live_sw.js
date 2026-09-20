/* LIVE service-worker verification against the deployed site.
   Proves a returning/offline user receives the current release build (key derived from sw.js).
   Run: node quiz/_live_sw.js */
const puppeteer = require("puppeteer");
const URL = "https://merebari7-web.github.io/mamss-prep/";
let fails = 0;
const ok = (l, c) => { console.log(c ? "✓" : "✗", l); if (!c) fails++; };
(async () => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    protocolTimeout: 60000,
    env: { ...process.env, LD_LIBRARY_PATH: "/tmp/libx/usr/lib/x86_64-linux-gnu:/tmp/libx/lib/x86_64-linux-gnu" },
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForFunction(() => typeof CLASSES !== "undefined" || !!window.QUIZ_ERR, { timeout: 30000 });
  ok("live app boots", await page.evaluate(() => !window.QUIZ_ERR));

  const sw = await page.evaluate(() => Promise.race([
    navigator.serviceWorker.ready.then(async () => {
      const keys = await caches.keys();
      const c = await caches.open(keys[0]);
      const idx = await c.match("./index.html");
      return {
        key: keys[0] || "",
        names: (await c.keys()).map(r => r.url.split("/").pop()),
        idxRx: idx ? (await idx.text()).indexOf("flex:1 1 auto") > -1 : false,
      };
    }),
    new Promise(r => setTimeout(() => r({ key: "timeout" }), 25000)),
  ]));
  const ver = (require("fs").readFileSync("sw.js", "utf8").match(/const NSS_V = "[^"]*" \+ "(-v[0-9a-z.]+)"/) || [])[1];
  ok("live SW installs with " + ver + " cache key", sw.key.indexOf(ver) > -1);
  ok("live cache holds the responsive index (qnav wrap)", sw.idxRx === true);

  await page.evaluate(() => { document.getElementById("gateName").value = "A B"; document.getElementById("gateEmail").value = "a@b.c"; gateSignUp(); });
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: "load" });
  await new Promise(r => setTimeout(r, 1000));
  ok("live OFFLINE reload still boots the app", await page.evaluate(() => !window.QUIZ_ERR && !!document.getElementById("gateOverlay")));
  ok("live offline nav still wraps (overflow visible)", await page.evaluate(() => getComputedStyle(document.querySelector("nav.nav")).overflowX === "visible"));

  await browser.close();
  console.log(fails ? `\nLIVE SW: ${fails} FAIL` : "\nALL LIVE SERVICE-WORKER CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("live sw crashed:", e); process.exit(2); });
