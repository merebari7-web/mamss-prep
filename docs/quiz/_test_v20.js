/* v20.0 suite — AI Coach "Suggested for you" desktop-responsive: from 1024px
   the suggestion grid must switch to a generous 2-column layout with the
   action button centred and never squeezed (was 3 narrow ~290px columns that
   collapsed the text column to ~44px). Run: node quiz/_test_v20.js */
const fs = require("fs");
const zlib = require("zlib");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 220)); } };

(async () => {
  await run("shell: v20 desktop coach block ships", () => {
    if (!/id="v20ui"/.test(HTML)) throw "no v20ui style";
    if (!/@media\(min-width:1024px\)[\s\S]{0,120}ai-grid\{grid-template-columns:repeat\(auto-fit,minmax\(420px,1fr\)\)/.test(HTML)) throw "desktop grid rule missing";
    if (!/@media\(min-width:1024px\)[\s\S]{0,200}\.ai-it \.ai-go\{flex:none;white-space:nowrap/.test(HTML)) throw "button rule missing";
  });
  await run("service worker cache key bumped to -v20", () => {
    if (!/"-v(20|[2-9][0-9])"/.test(SW)) throw "NSS_V not -v20";
  });
  await run("boot wire gzip <= 266240 B", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    console.log("   (wire " + w + " — headroom " + (266240 - w) + " B)");
  });

  /* real-Chrome desktop assertions */
  let puppeteer = null;
  try { puppeteer = require("puppeteer"); } catch (e) {}
  if (!puppeteer) { console.log("SKIP: puppeteer unavailable"); console.log(fails ? fails + " FAIL" : "ALL v20 CHECKS PASSED"); process.exit(fails ? 1 : 0); }
  const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    for (const v of [{ w: 1280, h: 800 }, { w: 1920, h: 1080 }]) {
      const p = await b.newPage();
      await p.setViewport({ width: v.w, height: v.h });
      await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
      await p.waitForFunction(() => typeof CLASSES !== "undefined", { timeout: 20000 }).catch(() => {});
      await p.evaluate(() => { document.getElementById("gateName").value = "A B"; document.getElementById("gateEmail").value = "a@b.c"; gateSignUp(); });
      await new Promise(r => setTimeout(r, 900));
      await run("chrome " + v.w + ": coach uses 2-column grid", async () => {
        const cols = await p.evaluate(() => getComputedStyle(document.getElementById("aiGrid")).gridTemplateColumns.split(" ").length);
        if (cols !== 2) throw "cols=" + cols;
      });
      await run("chrome " + v.w + ": card text column is spacious (>=150px)", async () => {
        const minW = await p.evaluate(() => {
          const it = [...document.querySelectorAll("#aiGrid .ai-it .ai-main")];
          return Math.min(...it.map(m => Math.round(m.getBoundingClientRect().width)));
        });
        if (minW < 150) throw "main min width " + minW;
      });
      await run("chrome " + v.w + ": action buttons full size, no clipping", async () => {
        const clip = await p.evaluate(() => {
          let n = 0;
          document.querySelectorAll("#aiGrid .ai-it .ai-go").forEach(btn => { if (btn.scrollWidth > btn.clientWidth + 2) n++; });
          return n;
        });
        if (clip) throw clip + " clipped buttons";
      });
      await run("chrome " + v.w + ": no horizontal document overflow", async () => {
        const sw = await p.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
        if (sw > v.w) throw "scrollWidth " + sw;
      });
      await p.close();
    }
  } finally { await b.close(); }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v20 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
