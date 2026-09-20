/* v37.0 suite — Find button + Video Studio Pro + AI Explainer Reels.
   Run: node quiz/_test_v37.js */
const fs = require("fs");
const zlib = require("zlib");
const { JSDOM, VirtualConsole } = require("jsdom");
const HTML = fs.readFileSync("index.html", "utf8");
const BANK = fs.readFileSync("bank.js", "utf8");
const SW = fs.readFileSync("sw.js", "utf8");
const POLISH = fs.readFileSync("quiz/polish.js", "utf8");
const PRO = fs.readFileSync("quiz/pro.js", "utf8");
const REELS = fs.readFileSync("quiz/reels.js", "utf8");
const ARC = fs.readFileSync("arcade.js", "utf8");
const CURIC = fs.readFileSync("quiz/curriculum.js", "utf8");
let fails = 0;
const run = async (label, fn) => { try { await fn(); console.log("PASS:", label); } catch (e) { fails++; console.log("FAIL:", label, "->", String(e && e.message || e).slice(0, 260)); } };

function seedWindow(window) {
  window.DecompressionStream = globalThis.DecompressionStream; window.TextDecoder = globalThis.TextDecoder; window.TextEncoder = globalThis.TextEncoder;
  const vp = new Proxy(function(){}, { get: (t, p) => (p === Symbol.toPrimitive ? () => "" : vp), apply: () => vp, set: () => true });
  window.HTMLCanvasElement.prototype.getContext = () => vp;
  window.speechSynthesis = { cancel() {}, speak() {}, getVoices() { return [{ lang: "en-GB" }]; } };
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.scrollTo = () => {}; window.matchMedia = window.matchMedia || (() => ({ matches: false }));
  window.Notification = function () {}; window.Notification.permission = "default";
  window.AudioContext = function () { this.currentTime = 0; this.sampleRate = 44100; this.state = "running";
    this.createOscillator = () => ({ connect() {}, start() {}, stop() {}, frequency: { value: 0 } });
    this.createGain = () => ({ connect() {}, disconnect() {}, gain: { value: 0, setTargetAtTime() {} } });
    this.createBiquadFilter = () => ({ connect() {}, disconnect() {}, type: "", frequency: { value: 0 } });
    this.destination = {}; this.resume = () => {}; };
  window.fetch = () => Promise.reject(new Error("no net"));
}

(async () => {
  await run("reels.js: parses + carries the reels engine", () => {
    new Function(REELS);
    for (const h of ["__reelsApi", "reelsLaunch", "captureStream", "MediaRecorder", "speechSynthesis", "version: 37", "prefers-reduced-motion", "reOv", "__proPalHooks", "Surprise", "requestFullscreen", "aria-live"]) {
      if (REELS.indexOf(h) < 0) throw "missing " + h;
    }
  });
  await run("polish.js + pro.js: Find button + palette opener", () => {
    new Function(POLISH); new Function(PRO);
    for (const h of ["quiz/reels.js", "reelsScript", "findBtn", "__findOpen", "findOpen", "timeout: 11000", "#findBtn"]) {
      if (POLISH.indexOf(h) < 0) throw "polish missing " + h;
    }
    if (PRO.indexOf("window.__palOpen = palOpen") < 0) throw "pro missing __palOpen expose";
    if (HTML.indexOf('id="libBtn"') < 0) throw "nav anchor libBtn gone";
  });
  await run("arcade.js: Studio Pro (search, class filter, thumbs, seen, reels banner)", () => {
    new Function(ARC);
    for (const h of ["vidSearch", "vidCls", "arc-vidth", "arc-reelban", "nssc_vidseen_a", "arc-upnext", "__reelsApi", "vidSeen", "mqdefault.jpg"]) {
      if (ARC.indexOf(h) < 0) throw "missing " + h;
    }
  });
  await run("sw.js: -v37 + reels note; live list covers reels", () => {
    if (!/"-v\d+"/.test(SW)) throw "NSS_V not versioned";
    if (SW.indexOf("quiz/reels.js") < 0) throw "sw note missing";
    const vl = fs.readFileSync("quiz/_verify_live.js", "utf8");
    if (vl.indexOf("quiz/reels.js") < 0) throw "_verify_live missing reels";
  });
  await run("boot wire still <= 266240 B (index.html + bank.js untouched)", () => {
    const w = zlib.gzipSync(HTML, { level: 9 }).length + zlib.gzipSync(BANK, { level: 9 }).length;
    if (w > 266240) throw "wire " + w;
    console.log("   (wire " + w + " — headroom " + (266240 - w) + " B)");
  });

  /* -------- jsdom full app -------- */
  const html = HTML.replace('<script src="bank.js"></script>', "<script>" + BANK + "</script>");
  const vc = new VirtualConsole(); vc.on("jsdomError", () => {});
  const d = new JSDOM(html, { runScripts: "dangerously", url: "https://nssc-quiz.test/", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse: seedWindow });
  const w = d.window;
  w.eval(CURIC);
  await new Promise(r => setTimeout(r, 900));
  w.eval(REELS);
  await new Promise(r => setTimeout(r, 300));
  await run("reels: all 27 subjects x SS1-SS3 build (81 reels, >=3 scenes each)", () => {
    const R = w.__reelsApi;
    if (!R || R.version !== 37) throw "no __reelsApi v37";
    if (R.subjects().length !== 27) throw "subjects=" + R.subjects().length;
    let n = 0, min = 99;
    for (const s of R.subjects()) for (let c = 0; c < 3; c++) {
      const b = R.build(s, c, null);
      n++;
      if (!b.scenes || b.scenes.length < 3) throw "thin reel " + s + " SS" + (c + 1);
      if (b.scenes[0].k !== "title" || b.scenes[b.scenes.length - 1].k !== "outro") throw "frame " + s;
      min = Math.min(min, b.scenes.length);
    }
    if (n !== 81) throw "n=" + n;
    console.log("   (81 reels, min scenes " + min + ")");
    const ph = R.build("Physics", 1, null);
    if (!ph.scenes.some(x => x.k === "quiz") || ph.total < 20) throw "physics reel weak";
    const one = R.build("History", 0, "Colonial Rule in Nigeria");
    if (one.scenes.length !== 4 || one.topic !== "Colonial Rule in Nigeria") throw "single-topic reel";
  });
  await run("reels UI (jsdom): picker, player, transport, script, record, close", () => {
    const R = w.__reelsApi, doc = w.document;
    R.open("Physics", 1);
    if (!doc.getElementById("reOv")) throw "overlay missing";
    const cv = doc.getElementById("reCv");
    if (!cv || cv.width !== 960 || cv.height !== 540) throw "canvas";
    if (doc.getElementById("reSubj").options.length !== 27) throw "subject options";
    if (doc.querySelectorAll("#reCls [data-c]").length !== 3) throw "class chips";
    if (!doc.getElementById("reSur")) throw "surprise btn";
    const n0 = R.state().scenes;
    if (doc.querySelectorAll(".re-dot").length !== n0) throw "dots";
    if (doc.querySelectorAll(".re-srow").length !== n0) throw "script rows";
    R.play();
    if (!R.state().playing) throw "play failed";
    R.pause();
    if (R.state().playing) throw "pause failed";
    doc.getElementById("reSpeed").click();
    if (doc.getElementById("reSpeed").textContent.indexOf("1.5") < 0) throw "speed cycle";
    const vt = doc.getElementById("reVoice").textContent;
    doc.getElementById("reVoice").click();
    if (doc.getElementById("reVoice").textContent === vt) throw "voice toggle";
    doc.querySelectorAll(".re-srow")[2].click();
    if (R.state().si !== 2) throw "script jump";
    doc.querySelectorAll(".re-dot")[0].click();
    if (R.state().si !== 0) throw "dot jump";
    doc.getElementById("reRec").click(); /* unsupported here -> honest toast path */
    const t0 = doc.querySelectorAll("#reTopics .re-chip").length;
    if (t0 < 2) throw "topic chips";
    doc.querySelectorAll("#reTopics .re-chip")[1].click();
    if (R.state().scenes >= n0) throw "topic filter did not narrow";
    R.close();
    if (doc.getElementById("reOv")) throw "close failed";
    if (!w.__proPalHooks.some(f => String(f).indexOf("Reels") >= 0)) throw "palette hook";
  });
  w.eval(ARC);
  await run("studio pro (jsdom): banner, search, class filter, thumbs, watched, up-next", () => {
    const doc = w.document;
    w.eval('ARC.go("videos")');
    if (doc.querySelectorAll("#vidList .arc-vid").length !== 4) throw "vids != 4";
    if (!doc.querySelector(".arc-reelban")) throw "reels banner missing";
    if (!doc.getElementById("vidSearch") || doc.querySelectorAll("#vidCls .arc-chip").length !== 4) throw "search/class UI";
    if (doc.querySelectorAll(".arc-vidth").length !== 4) throw "thumbs";
    if (!/Watched 0 of 4/.test(doc.getElementById("vidSeen").textContent)) throw "seen line";
    const sq = doc.getElementById("vidSearch");
    sq.value = "math"; sq.dispatchEvent(new w.Event("input", { bubbles: true }));
    if (doc.querySelectorAll("#vidList .arc-vid").length !== 1) throw "search math";
    sq.value = "zzzqqq"; sq.dispatchEvent(new w.Event("input", { bubbles: true }));
    if (doc.querySelectorAll("#vidList .arc-vid").length !== 0) throw "empty search";
    sq.value = ""; sq.dispatchEvent(new w.Event("input", { bubbles: true }));
    const clsBtns = doc.querySelectorAll("#vidCls .arc-chip");
    Array.prototype.find.call(clsBtns, b => b.textContent === "SS3").click();
    if (doc.querySelectorAll("#vidList .arc-vid").length !== 4) throw "SS3 filter";
    Array.prototype.find.call(clsBtns, b => b.textContent === "SS1").click();
    if (doc.querySelectorAll("#vidList .arc-vid").length !== 0) throw "SS1 filter";
    Array.prototype.find.call(clsBtns, b => b.textContent === "All classes").click();
    w.eval('ARC.watch("U_cHam0p4UE")');
    if (!doc.querySelector("#vidList iframe")) throw "player iframe";
    if (!doc.querySelector(".arc-upnext")) throw "up-next button";
    if (!doc.querySelector(".arc-seen")) throw "seen badge";
    if (!/Watched 1 of 4/.test(doc.getElementById("vidSeen").textContent)) throw "seen count";
  });
  w.eval(POLISH);
  await new Promise(r => setTimeout(r, 300));
  await run("find button (jsdom): nav button opens the palette", () => {
    const doc = w.document;
    const fb = doc.getElementById("findBtn");
    if (!fb) throw "findBtn not injected";
    if (typeof w.__findOpen !== "function") throw "no __findOpen";
    w.eval(PRO);
    w.__findOpen();
    const pal = doc.getElementById("palQ");
    if (!pal || pal.style.display === "none") throw "palette did not open";
    w.eval("document.getElementById('palIn').value = 'reel'");
    w.eval("document.getElementById('palIn').dispatchEvent(new Event('input', {bubbles:true}))");
    if (!/Reel/i.test(doc.getElementById("palList").textContent)) throw "palette search";
    doc.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });

  /* -------- real Chrome -------- */
  let puppeteer = null;
  try { puppeteer = require("puppeteer"); } catch (e) {}
  if (puppeteer) {
    const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      for (const v of [{ w: 375, h: 667 }, { w: 1280, h: 800 }]) {
        const p = await b.newPage();
        const errs = [];
        p.on("pageerror", e => errs.push(String(e.message || e).slice(0, 150)));
        p.on("console", m => { if (m.type() !== "error") return; const t = m.text() || ""; if (/GSI_LOGGER|Failed to load resource|net::ERR/i.test(t)) return; errs.push("console: " + t.slice(0, 120)); });
        await p.setViewport({ width: v.w, height: v.h });
        await p.goto("file://" + process.cwd() + "/index.html", { waitUntil: "load" });
        await p.waitForFunction(() => window.__reelsApi && window.__atlasApi && window.__aiApi, { timeout: 40000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 800));
        await run("chrome " + v.w + ": find, studio pro, reels build+play+paint", async () => {
          const m = await p.evaluate(async () => {
            const r = {};
            r.api = !!(window.__reelsApi && window.__palOpen && window.__findOpen);
            if (!r.api) return r;
            /* FIND */
            const fb = document.getElementById("findBtn");
            r.findBtn = !!fb && !!fb.closest(".nav");
            if (fb) fb.click();
            await new Promise(r2 => setTimeout(r2, 400));
            const pal = document.getElementById("palQ");
            r.palOpen = !!pal && pal.style.display !== "none";
            const pi = document.getElementById("palIn");
            if (pi) { pi.value = "reel"; pi.dispatchEvent(new Event("input", { bubbles: true })); }
            await new Promise(r2 => setTimeout(r2, 300));
            r.palFinds = /Reel/i.test((document.getElementById("palList") || {}).textContent || "");
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
            await new Promise(r2 => setTimeout(r2, 200));
            /* STUDIO (loads arcade.js on demand) */
            try {
              const al = document.getElementById("arcLaunch");
              if (al) al.click();
              await new Promise(r2 => setTimeout(r2, 2500));
            } catch (e) {}
            r.arc = !!(window.ARC && window.ARC.ready);
            if (r.arc) {
              ARC.go("videos");
              await new Promise(r2 => setTimeout(r2, 300));
              r.vids = document.querySelectorAll("#vidList .arc-vid").length;
              r.banner = !!document.querySelector(".arc-reelban");
              r.thumbs = document.querySelectorAll(".arc-vidth").length;
              const sq = document.getElementById("vidSearch");
              if (sq) { sq.value = "math"; sq.dispatchEvent(new Event("input", { bubbles: true })); }
              await new Promise(r2 => setTimeout(r2, 200));
              r.search = document.querySelectorAll("#vidList .arc-vid").length;
              if (sq) { sq.value = ""; sq.dispatchEvent(new Event("input", { bubbles: true })); }
              await new Promise(r2 => setTimeout(r2, 200));
              const first = document.querySelector("#vidList .arc-vid .arc-play");
              if (first) first.click();
              await new Promise(r2 => setTimeout(r2, 400));
              const fr = document.querySelector("#vidList iframe");
              r.player = !!fr && /youtube-nocookie/.test(fr.src);
              r.upnext = !!document.querySelector(".arc-upnext");
              r.seen = !!document.querySelector(".arc-seen");
              ARC.close();
            }
            /* REELS: every subject x class builds */
            let n = 0, min = 99;
            for (const s of window.__reelsApi.subjects()) for (let c = 0; c < 3; c++) {
              const bb = window.__reelsApi.build(s, c, null);
              n++; min = Math.min(min, bb.scenes.length);
            }
            r.reels = n; r.minSc = min;
            /* REELS UI */
            const chip = document.getElementById("reelsLaunch");
            r.chip = !!chip;
            if (chip) chip.click();
            await new Promise(r2 => setTimeout(r2, 400));
            r.open = !!document.getElementById("reOv");
            const cv = document.getElementById("reCv");
            const px = (c) => {
              try {
                const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
                let k = 0;
                for (let i = 3; i < d.length; i += 97) if (d[i] > 0) k++;
                return k;
              } catch (e) { return -1; }
            };
            r.poster = cv ? px(cv) : -1;
            const pb = document.getElementById("rePlay");
            if (pb) pb.click();
            await new Promise(r2 => setTimeout(r2, 1400));
            r.playing = window.__reelsApi.state().playing;
            await new Promise(r2 => setTimeout(r2, 3200)); /* title scene is 3.5s: must auto-advance */
            r.autoSi = window.__reelsApi.state().si;
            r.p1 = window.__reelsApi.prog();
            await new Promise(r2 => setTimeout(r2, 1200));
            r.p2 = window.__reelsApi.state().si === r.autoSi ? window.__reelsApi.prog() : 9;
            r.playPx = cv ? px(cv) : -1;
            const nx = document.getElementById("reNext");
            const si0 = window.__reelsApi.state().si;
            if (nx) nx.click();
            await new Promise(r2 => setTimeout(r2, 400));
            r.advanced = window.__reelsApi.state().si === si0 + 1;
            const rows = document.querySelectorAll(".re-srow");
            if (rows.length > 2) rows[2].click();
            await new Promise(r2 => setTimeout(r2, 300));
            r.jumped = window.__reelsApi.state().si === 2;
            const sp = document.getElementById("reSpeed");
            if (sp) sp.click();
            r.speed = (document.getElementById("reSpeed") || {}).textContent || "";
            const rc = document.getElementById("reRec");
            let recErr = null;
            try {
              if (rc) rc.click();
              await new Promise(r2 => setTimeout(r2, 900));
              const rc2 = document.getElementById("reRec");
              if (rc2 && /Stop/.test(rc2.textContent)) rc2.click();
              await new Promise(r2 => setTimeout(r2, 400));
            } catch (e) { recErr = String(e); }
            r.recErr = recErr;
            r.recBtn = (document.getElementById("reRec") || {}).textContent || "";
            r.recent = /Recent/.test((document.getElementById("reRecent") || {}).textContent || "");
            window.__reelsApi.close();
            r.overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth;
            return r;
          });
          if (!m.api) throw "idle modules missing: " + JSON.stringify(m);
          if (!m.findBtn) throw "findBtn not in nav";
          if (!m.palOpen) throw "palette did not open from Find";
          if (!m.palFinds) throw "palette cannot find reels";
          if (!m.arc) throw "arcade did not load";
          if (m.vids !== 4) throw "studio vids " + m.vids;
          if (!m.banner || m.thumbs !== 4) throw "studio pro UI " + JSON.stringify({ banner: m.banner, thumbs: m.thumbs });
          if (m.search !== 1) throw "studio search -> " + m.search;
          if (!m.player || !m.upnext || !m.seen) throw "studio play " + JSON.stringify({ player: m.player, upnext: m.upnext, seen: m.seen });
          if (m.reels !== 81 || m.minSc < 3) throw "reels " + JSON.stringify({ n: m.reels, min: m.minSc });
          if (!m.chip || !m.open) throw "reels UI " + JSON.stringify({ chip: m.chip, open: m.open });
          if (!(m.poster > 200)) throw "poster not painted: " + m.poster;
          if (!m.playing || !(m.playPx > 200)) throw "playback " + JSON.stringify({ playing: m.playing, px: m.playPx });
          if (!(m.autoSi >= 1)) throw "no auto-advance (clock frozen): si=" + m.autoSi;
          if (!(m.p2 > m.p1)) throw "loop stalled after advance: " + JSON.stringify({ p1: m.p1, p2: m.p2 });
          if (!m.advanced || !m.jumped) throw "transport " + JSON.stringify({ advanced: m.advanced, jumped: m.jumped });
          if (!/1\.5/.test(m.speed)) throw "speed " + m.speed;
          if (m.recErr) throw "record threw: " + m.recErr;
          if (!/Record/.test(m.recBtn)) throw "record btn " + m.recBtn;
          if (!m.recent) throw "recent missing";
          if (m.overflow) throw "horizontal overflow";
          if (errs.length) throw errs.length + " errors: " + errs[0];
        });
        await p.close();
      }
    } finally { await b.close(); }
  }

  console.log(fails ? "\n" + fails + " FAIL" : "\nALL v37 CHECKS PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("suite crashed:", e); process.exit(2); });
