/* OFFLINE: service worker — after the first visit the whole app is cached, so
   it re-opens instantly and works with zero network (airplane mode).

   v43 "Ascension" rewrite. What changed and why:
   • Precache now covers the app shell (index.html, app.css, upgrade layer,
     bank.js, manifest, icons, 404). Previously only ./, index.html, sw.js and
     edu.js were precached. Each entry is added individually and with the
     DEFAULT cache mode, so files the page downloaded seconds earlier come
     straight from the HTTP cache instead of being fetched a second time.
   • Static assets are cache-first and are NOT re-fetched on every visit. A
     release bumps NSS_V; `activate` then drops the old cache and the new set is
     downloaded exactly once. The old worker was network-first for EVERYTHING,
     so a returning student re-downloaded ~390 KB on every single visit — on
     metered mobile data that is the difference between daily use and not.
     NSS_REVALIDATE_AFTER is a safety net if a release ever forgets to bump.
   • Navigations stay network-first (so new content arrives on the next visit)
     but RACE a 3.5 s timeout, so a hung connection falls back to the cached
     app instead of spinning forever.
   • Range requests (audio/video) are left to the browser.
   • skipWaiting() is no longer called on install. A waiting worker activates
     only when the page asks (postMessage 'SKIP_WAITING'), which keeps
     index.html and its JS/CSS on one single version — the old force-swap could
     mix a new worker with an old document mid-session.
   Bump NSS_V on every release. */
const NSS_V = "nssc-v20260922" + "-v45"; /* v45 — Check Result link (Mater Misericordiae results portal) in the site header */; /* v44 — Carry: cross-device sync codes (gzip+base64url of backupPayload, merge-on-import), App Centre + Study Hall entry */; /* v43 — Ascension: app-shell precache (no double download), cache-first assets keyed to the release version, timeout-raced navigations, range-request passthrough, user-confirmed updates, PING/version messaging, branded offline fallback */; /* v42 — question bank integrity fingerprint + guard-lock; 3D scroll hero */; /* v41 — zero-jump focus + bugfix sweep */; /* v40 — 3D scrollable website */; /* v39 — zero-jump focus + curriculum bank-lock fix */; /* v38 — no auto-scroll */; /* v37 — Find Everywhere + Video Studio Pro + AI Explainer Reels */; /* v36 — Curriculum Atlas */; /* v35 — Curriculum Expansion (27 subjects) + Holo 3D Lab */; /* v34 — AI Tutor + Scientific Calculator */; /* v33 — Holo 3D */; /* v32 — Aurum Gloss */; /* v31 — Study Studio */; /* v30 — Scholar Toolkit */; /* v29 — Pro Boost */; /* v28 — Apex HQ */; /* v27 — Pro Tools */; /* v26 — Aurum Design System */; /* v25 — NERDC Lesson Notes */; /* v24 — aurum polish layer */

/* Everything an early-aborted or offline visit needs. Relative to the worker scope. */
const NSS_CORE = [
  "./",
  "./app.css",
  "./upgrade.css",
  "./upgrade.js",
  "./bank.js",
  "./edu.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./404.html"
];

const NSS_NAV_TIMEOUT = 3500;                          /* ms before we serve the cached document */
const NSS_REVALIDATE_AFTER = 7 * 24 * 60 * 60 * 1000;  /* safety net if NSS_V is not bumped */

/* ------------------------------------------------------------------ helpers */
function isAsset(u) {
  return /\.(js|css|png|jpe?g|gif|svg|webp|ico|json|webmanifest|woff2?|zip|txt|xml)(\?|$)/i
    .test(u.pathname + u.search);
}

/* Stamp the moment a response entered the cache so it can be aged out later. */
function stamp(cache, req, res) {
  try {
    var h = new Headers(res.headers);
    h.set("x-nssc-cached", String(Date.now()));
    return res.blob().then(function (b) {
      return cache.put(req, new Response(b, {
        status: res.status, statusText: res.statusText, headers: h
      }));
    });
  } catch (err) {
    try { return cache.put(req, res); } catch (e2) { return Promise.resolve(); }
  }
}

function cachedAge(res) {
  try {
    var t = res.headers.get("x-nssc-cached");
    return t ? Date.now() - (+t) : null;
  } catch (err) { return null; }
}

/* Last-resort document: only reachable when the cache is empty AND the network
   is down. Keeps the learner on a branded page instead of a browser error. */
function offlinePage() {
  var html = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>MAMSS PREP — offline</title><style>' +
    'body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;text-align:center;' +
    'background:#faf3e8;color:#32373c;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    'b{display:block;font-size:2.6rem}h1{font-size:1.25rem;margin:.4rem 0}' +
    'p{color:#6f5b3e;max-width:34ch;margin:0 auto 1.2rem}' +
    'a{display:inline-block;padding:12px 20px;border-radius:12px;background:#002147;color:#fff;' +
    'text-decoration:none;font-weight:700}</style></head><body><div><b>📴</b>' +
    '<h1>You are offline and nothing is cached yet</h1>' +
    '<p>Connect once, open MAMSS PREP, and the whole app — every question and tool — ' +
    'is stored on this device for good.</p><a href="./">↻ Try again</a></div></body></html>';
  return new Response(html, {
    status: 503, statusText: "Offline",
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
}

/* ------------------------------------------------------------------ lifecycle */
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(NSS_V).then(function (c) {
      /* Fetch + stamp each entry individually: one missing file must never fail
         the whole install, and a stamped entry is served without revalidation. */
      return Promise.all(NSS_CORE.map(function (u) {
        var url = new URL(u, self.location).href;
        return fetch(url).then(function (res) {
          if (!res || !res.ok) throw new Error("HTTP " + (res && res.status));
          return stamp(c, new Request(url), res);
        }).catch(function (err) {
          console.warn("[sw " + NSS_V + "] precache skipped:", u, err && err.message);
        });
      }));
    })
  );
  /* NOTE: no skipWaiting() here on purpose — see the header comment. */
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== NSS_V) return caches.delete(k);
      }));
    })
      .then(function () { return self.clients.claim(); })
      .then(function () {
        return self.clients.matchAll({ type: "window" }).then(function (cs) {
          cs.forEach(function (c) {
            try { c.postMessage({ type: "sw-activated", version: NSS_V }); } catch (err) {}
          });
        });
      })
  );
});

self.addEventListener("message", function (e) {
  var d = e && e.data;
  if (!d) return;
  if (d === "SKIP_WAITING" || d.type === "SKIP_WAITING") self.skipWaiting();
  if (d === "PING" || d.type === "PING") {
    try {
      e.source && e.source.postMessage({
        type: "PONG", version: NSS_V, waiting: !!self.registration.waiting
      });
    } catch (err) {}
  }
});

/* ------------------------------------------------------------------ routing */
self.addEventListener("fetch", function (e) {
  var req = e.request, u;
  try { u = new URL(req.url); } catch (err) { return; }

  if (req.method !== "GET") return;
  if (u.origin !== location.origin) return;   /* never touch Google Identity etc. */
  if (req.headers.has("range")) return;       /* media: let the browser stream it */
  if (/\/sw\.js$/.test(u.pathname)) return;   /* the worker itself is always revalidated */

  var accept = req.headers.get("accept") || "";
  var wantsHtml = req.mode === "navigate" || (!isAsset(u) && accept.indexOf("text/html") > -1);

  /* ---------- navigations: network-first, raced against a timeout ---------- */
  if (wantsHtml) {
    e.respondWith((async function () {
      var net = fetch(req).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          var a = res.clone(), b = res.clone();     /* clone BEFORE putting: a body is single-use */
          caches.open(NSS_V).then(function (c) {
            stamp(c, req, a);
            if (u.pathname.indexOf("index.html") < 0) stamp(c, new Request("./index.html"), b);
          });
        }
        return res;
      });
      var timer = new Promise(function (res) {
        setTimeout(function () { res(null); }, NSS_NAV_TIMEOUT);
      });
      var out = await Promise.race([net, timer]);
      if (out) return out;
      var cached = await caches.match(req) || await caches.match("./index.html");
      return cached || net;               /* nothing cached: keep waiting on the network */
    })().catch(function () {
      return caches.match("./index.html").then(function (m) { return m || offlinePage(); });
    }));
    return;
  }

  /* ---------- assets: cache-first, refresh only when stale or missing ---------- */
  e.respondWith(
    caches.open(NSS_V).then(function (c) {
      return c.match(req).then(function (hit) {
        if (hit) {
          var age = cachedAge(hit);
          if (age === null || age < NSS_REVALIDATE_AFTER) return hit;   /* zero network */
        }
        return fetch(req).then(function (res) {
          if (res && res.ok && res.type === "basic") stamp(c, req, res.clone());
          return res;
        }).catch(function () {
          return hit || offlinePage();
        });
      });
    })
  );
});
