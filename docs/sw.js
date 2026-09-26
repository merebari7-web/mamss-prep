/* Cache names are scoped: other GitHub Pages projects share this origin.
   Bump the release on changes to the app shell or its runtime assets. */
const NSS_SCOPE = new URL(self.registration.scope).pathname;
const NSS_V = "nssc-v20260923" + "-v68" + ":" + NSS_SCOPE;
const NSS_CORE = ["./index.html", "./bank.js", "./ui/study.css", "./ui/study.js?v=46", "./ui/atelier.css?v=46", "./ui/atelier.js?v=46", "./ui/favicon.svg"];
const NSS_OPTIONAL = [
  "./ui/assets/atelier-560.webp", "./ui/assets/atelier-1000.webp", "./ui/assets/dm-regular.woff2", "./ui/assets/dm-semibold.woff2", "./ui/assets/caslon-display.woff2",
  "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./why.html", "./social-preview.png",
  "./notices.js", "./ui/school.js", "./ui/progress-up.js", "./codes.js", "./upgrade.js", "./cbt.js", "./sync.js", "./upgrade.css", "./exclusive.js", "./labs.js", "./edu.js", "./arcade.js", "./ui/legacy.css",
  "./quiz/holo.js",
  "./quiz/ai.js", "./quiz/calc.js", "./quiz/curriculum.js", "./quiz/atlas.js",
  "./quiz/reels.js", "./quiz/notes_data.js", "./quiz/notes_app.js",
  "./quiz/syllabus_data.js", "./quiz/curr_data.js"
];
const localURL = path => new URL(path, self.registration.scope).href;
/* v63: how long a navigation waits for the network before trusting cache. */
const NAV_TIMEOUT_MS = 2500;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(NSS_V);
    // A first visit must cache the bank, even if it was fetched before SW control.
    await cache.addAll(NSS_CORE.map(path => new Request(localURL(path))));
    // A missing optional module must not prevent the core app working offline.
    await Promise.all(NSS_OPTIONAL.map(path => cache.add(localURL(path)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key === NSS_V || !key.startsWith("nssc-v")) continue;
      if (key.endsWith(":" + NSS_SCOPE)) await caches.delete(key);
      else if (!key.includes(":")) {
        // Migrate pre-v43 unscoped caches only when they contain OUR shell.
        const old = await caches.open(key);
        let removed=false;
        for (const request of await old.keys()) {
          const url=new URL(request.url);
          if(url.origin===self.location.origin&&url.pathname.startsWith(NSS_SCOPE)){await old.delete(request);removed=true;}
        }
        if(removed&&!(await old.keys()).length)await caches.delete(key);
      }
    }
    await self.clients.claim();
  })());
});

/* v63 "Anywhere" fetch strategy:
   • navigations  — race the network against the cached shell with a short
     timeout: fresh when online, instant (not broken) when offline or on a
     half-dead connection;
   • other GETs   — stale-while-revalidate: serve the cached copy at once,
     refresh it in the background, so a flaky 3G line never stalls a paper;
   • anything the cache lacks while offline — Response.error for assets
     (never fake HTML for a script), cached shell for navigations.        */
self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(NSS_SCOPE) || url.pathname === localURL("./sw.js").replace(url.origin, "")) return;
  const navigation = request.mode === "navigate";
  event.respondWith((async () => {
    const cache = await caches.open(NSS_V);
    const cached = async () => await cache.match(request) || (navigation ? await cache.match(localURL("./index.html")) : null);
    const remember = response => {
      if (response && response.ok && response.status === 200) {
        const copy = response.clone();
        // Keep the worker alive until the write finishes; quota errors are harmless.
        event.waitUntil(cache.put(request, copy).catch(() => {}));
      }
    };
    if (!navigation) {
      const hit = await cache.match(request);
      // Revalidate in the background either way; the page never waits for it.
      event.waitUntil((async () => {
        try { const fresh = await fetch(request); remember(fresh); } catch (_) {}
      })());
      if (hit) return hit;
      try {
        const response = await fetch(request);
        remember(response);
        return response;
      } catch (_) {
        return Response.error();
      }
    }
    // navigation: race network vs cache with a timeout
    try {
      const net = fetch(request).then(r => {
        if (!r.ok) throw new Error("http-" + r.status);
        remember(r);
        return r;
      });
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("nav-timeout")), NAV_TIMEOUT_MS));
      return await Promise.race([net, timeout]);
    } catch (_) {
      return await cached() || Response.error();
    }
  })());
});
