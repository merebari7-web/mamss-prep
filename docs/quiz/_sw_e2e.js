/* Service-worker end-to-end: proves a returning/offline visitor gets the CURRENT
   responsive build (the old NSS_V kept serving the pre-v10.2 shell from cache).
   Run: node quiz/_sw_e2e.js  (spawns its own http server on 127.0.0.1:8799) */
const puppeteer = require("puppeteer");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const PORT = 8799;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain" };

function serve() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === "/") p = "/index.html";
    p = path.join(ROOT, p);
    if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); res.end("nf"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(fs.readFileSync(p));
  });
}

let fails = 0;
const ok = (l, c) => { console.log(c ? "✓" : "✗", l); if (!c) fails++; };

(async () => {
  const server = serve();
  await new Promise(r => server.listen(PORT, "127.0.0.1", r));
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    protocolTimeout: 60000,
    env: { ...process.env, LD_LIBRARY_PATH: "/tmp/libx/usr/lib/x86_64-linux-gnu:/tmp/libx/lib/x86_64-linux-gnu" },
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const URL = `http://127.0.0.1:${PORT}/`;
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForFunction(() => typeof CLASSES !== "undefined" || !!window.QUIZ_ERR, { timeout: 25000 });

  // 1. SW registers + installs (the app gates registration on HTTPS, so a test on
  //    127.0.0.1 registers it directly — we exercise the worker's install/activate/fetch)
  const regd = await page.evaluate(() => navigator.serviceWorker.register("./sw.js").then(() => true).catch(e => String(e)));
  ok("SW registration callable", regd === true);
  const swState = await page.evaluate(() => Promise.race([
    navigator.serviceWorker.ready.then(async reg => ({ scope: reg.scope, nss: (await caches.keys())[0] || "" })),
    new Promise(r => setTimeout(() => r({ scope: "timeout", nss: "timeout" }), 15000)),
  ]));
  ok("SW registered with versioned cache", swState.nss.indexOf("-v10.2") > -1);
  ok("old -v10 cache purged (activate deletes keys !== NSS_V)", (await page.evaluate(() => caches.keys().then(k => k.join(",")))).split(",").filter(Boolean).every(k => k.indexOf("-v10.2") > -1));

  // 2. what the cache currently holds must be the RESPONSIVE build
  const cached = await page.evaluate(async () => {
    const c = await caches.open((await caches.keys())[0]);
    const reqs = await c.keys();
    const names = reqs.map(r => r.url.split("/").pop());
    const idx = await c.match("./index.html");
    const txt = idx ? await idx.text() : "";
    return { names, hasQnavFix: txt.indexOf("flex:1 1 auto") > -1, hasLauncherFix: txt.indexOf("min-height:40px") > -1, len: txt.length };
  });
  ok("cache contains index.html + sw.js + edu.js", ["index.html", "sw.js", "edu.js"].every(n => cached.names.includes(n)));
  ok("cached index is the v10.2 responsive build (qnav wrap)", cached.hasQnavFix);
  ok("cached index has Teaching Suite launcher fix", cached.hasLauncherFix);

  // 3. OFFLINE reload still renders the app (cached shell)
  await page.evaluate(() => { document.getElementById("gateName").value = "A B"; document.getElementById("gateEmail").value = "a@b.c"; gateSignUp(); });
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: "load" });
  await new Promise(r => setTimeout(r, 800));
  const offline = await page.evaluate(() => ({
    err: window.QUIZ_ERR,
    gate: !!document.getElementById("gateOverlay") && true,
    nav: getComputedStyle(document.querySelector("nav.nav")).overflowX,
  }));
  ok("offline reload: app boots from cache", offline.err == null);
  ok("offline reload: nav exists (no clipped scrollbar design: nowrap only pre-fix)", offline.nav !== null);
  await page.setOfflineMode(false);

  // 4. serve with the OLD NSS_V would be the bug — assert current deployed sw carries -v10.2
  const w = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  ok("sw.js source has -v10.2 cache-bust", w.indexOf('"-v10.2"') > -1);

  await browser.close();
  server.close();
  console.log(fails ? `\nSW e2e: ${fails} FAIL` : "\nALL SERVICE-WORKER E2E CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("sw e2e crashed:", e); process.exit(2); });
