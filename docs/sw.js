/* Cache names are scoped: other GitHub Pages projects share this origin.
   Bump the release on changes to the app shell or its runtime assets. */
const NSS_SCOPE = new URL(self.registration.scope).pathname;
const NSS_V = "nssc-v20260923" + "-v51" + ":" + NSS_SCOPE;
const NSS_CORE = ["./index.html", "./bank.js", "./ui/study.css", "./ui/study.js?v=46", "./ui/atelier.css?v=46", "./ui/atelier.js?v=46", "./ui/favicon.svg"];
const NSS_OPTIONAL = [
  "./ui/assets/atelier-560.webp", "./ui/assets/atelier-1000.webp", "./ui/assets/dm-regular.woff2", "./ui/assets/dm-semibold.woff2", "./ui/assets/caslon-display.woff2",
  "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "./notices.js", "./ui/school.js", "./codes.js", "./upgrade.js", "./upgrade.css", "./labs.js", "./edu.js", "./arcade.js", "./ui/legacy.css",
  "./quiz/holo.js",
  "./quiz/ai.js", "./quiz/calc.js", "./quiz/curriculum.js", "./quiz/atlas.js",
  "./quiz/reels.js", "./quiz/notes_data.js", "./quiz/notes_app.js",
  "./quiz/syllabus_data.js", "./quiz/curr_data.js"
];
const localURL = path => new URL(path, self.registration.scope).href;

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

self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(NSS_SCOPE) || url.pathname === localURL("./sw.js").replace(url.origin, "")) return;
  const navigation = request.mode === "navigate";
  event.respondWith((async () => {
    const cache = await caches.open(NSS_V);
    const cached = async () => await cache.match(request) || (navigation ? await cache.match(localURL("./index.html")) : null);
    try {
      const response = await fetch(request);
      if (response.ok && response.status === 200) {
        const copy = response.clone();
        // Keep the worker alive until the write finishes; quota errors are harmless.
        event.waitUntil(cache.put(request, copy).catch(() => {}));
      }
      if (response.status >= 500) return await cached() || response;
      return response;
    } catch (_) {
      // Never return HTML for a missing script, image, font, or JSON file.
      return await cached() || Response.error();
    }
  })());
});
