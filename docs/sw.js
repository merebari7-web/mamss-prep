/* OFFLINE: service worker — after the first visit the whole app is cached, so
   it re-opens instantly and works with zero network (airplane mode). While
   online the network is tried first so updates arrive on the next visit.
   Bump NSS_V on every release. */
const NSS_V = "nssc-v20260907" + "-v42"; /* v40 — 3D scrollable website: lazy scroll-driven depth journey (hero stage layers + cards glide through 3D as you scroll, gold depth rail); small-layers-only compositor safety, reduced-motion off-switch */; /* v39 — zero-jump focus (every .focus() passes preventScroll) + bugfix sweep: palette Papers rows show real class/subject names, empty-quiz guards (no throw, no NaN), curriculum bank-lock fixed (tolerant guards + question reinject + self-heal) */; /* v38 — No auto-scroll: the last automatic scroll-to-top (setup-step card switch) is removed; the page never moves unless the learner taps Back-to-top, dock or palette navigation */; /* v37 — Find Everywhere (nav Find button opening the palette) + Video Studio Pro (search, class filter, thumbnails, watched tracking, up-next, AI Reels banner) + AI Explainer Reels: lazy quiz/reels.js auto-builds captioned voiceover video lessons for all 27 subjects x SS1-SS3 with transport, script, fullscreen and WebM export */; /* v36 — Curriculum Atlas: lazy quiz/atlas.js (27-subject explorer, topic drills, scheme of work, share) + AI curriculum brain + one-shot topic tagging of the lazy bank; polish chip glow + nav shadow */; /* v35 — Curriculum Expansion + Holo 3D Lab upgrade: lazy quiz/curriculum.js (27 subjects, 4,275 questions, CURR/SYLL for every subject) loads at idle; the 3D Lab gains ethanol + salt-crystal molecules, two new surfaces, Earth's Moon, tap-a-world facts and PNG export */; /* v34 — AI Tutor + Scientific Calculator: lazy quiz/ai.js (offline knowledge-engine tutor + live insights + optional BYO Gemini/OpenAI key) and quiz/calc.js (full scientific calculator, safe parser) loaded at idle by the polish module */; /* v33 — Holo 3D: lazy quiz/holo.js (interactive 3D molecule viewer, 3D surface plotter for maths, orbital solar-system model — orbit/zoom/auto-rotate, canvas 2D, no WebGL) loaded at idle by the polish module */; /* v32 — Aurum Gloss: polish.js graphics pass (toast gold countdown bar + spring pop, hero-badge rotating aurora ring, glass top-sheen on every card/modal/chip, gold focus glow on all inputs, dock active pill, heatmap hover pop, XP-bar glow, stat-icon bob) */; /* v31 — Study Studio: lazy quiz/studio.js (mind map studio, unit & rate converter, theme studio accents, daily word+quote spark, hero comets, palette entries) loaded at idle by the polish module */; /* v30 — Scholar Toolkit: lazy quiz/toolkit.js (periodic table explorer + element detective quiz, formula vault with search/bookmarks, scroll progress bar, overlay entrance + option stagger motion) loaded at idle by the polish module */; /* v29 — Pro Boost (merged over Apex HQ): lazy quiz/boost.js (Math Sprint arcade, WebAudio Soundscapes, 3D tile tilt + glare, gold aura rings, palette entries) loaded at idle by the polish module */; /* v28 — Apex HQ: lazy quiz/aura.js (trophy room gallery + exam sprint plan generator, dock pill, palette entries) loaded at idle by the pro module */; /* v27 — Pro Tools: lazy quiz/pro.js (command palette Ctrl+K, WAEC/NECO/JAMB countdowns, Zen focus timer with chime + notifications + study heatmap, personalised greeting, daily study tips, button ripple) loaded at idle by the polish module */; /* v26 — Aurum Design System: lazy polish.js now upgrades every surface (hero chip with date/term/streak, stat icons, nav glass, option/card/tile hovers, modal blur, toast frame, focus rings) and adds back-to-top + scroll reveal */; /* v25 — NERDC Lesson Notes: Primary (Basic 1-6) + Secondary curriculum module, full 8-part lesson notes, scheme-of-work generator, role dashboards and author mode (lazy quiz/notes_data.js + notes_app.js) */; /* v24 — aurum polish layer: lazy quiz/polish.js (hero shimmer, gold particle field, glass stat plates, gold-edged cards, shine-swept CTAs, gold scrollbar) added to the app */; /* v23 — library cleanup: the Mater Notes feature (floating launcher, lazy module and the PDF archive) has been removed from the site and the cache key bumped so clients purge the old entries */; /* v20 — AI Coach suggested-for-you desktop layout: generous 2-column grid >=1024px with centred, never-squeezed action buttons */; /* v19 — all-device responsiveness: 280px plan-grid fix, hero3d decor containment, iOS zoom-on-focus fix (16px touch inputs), landscape-phone modals, safe-area padding, ultra-wide layout, 21-viewport audit. */; /* v18 — Aurum first-class upgrade: glass hero stat plates + gold numerals, premium toast/keycap chips, launcher pulse ring, liquid-gold progress shimmer, gold question chips, breathing focus ring, ambient aurum glows. Bump per release (runtime cache key). */
const NSS_CORE = ["./", "./index.html", "./sw.js", "./edu.js"];
/* labs.js is NOT in NSS_CORE on purpose: the runtime fetch handler below caches
   it the first time it is requested online, so an offline first-visit install
   (which must never fail) stays independent of it. */

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(NSS_V).then(function (c) {
    return c.addAll(NSS_CORE);
  }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      if (k !== NSS_V) return caches.delete(k);
    }));
  }).then(function () {
    return self.clients.claim();
  }));
});

self.addEventListener("fetch", function (e) {
  var u;
  try { u = new URL(e.request.url); } catch (err) { return; }
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  if (u.pathname.slice(-6) === "/sw.js") return;              // always re-checked by the browser
  e.respondWith(
    fetch(e.request).then(function (res) {
      if (res && res.ok) {
        var cl = res.clone();
        caches.open(NSS_V).then(function (c) { c.put(e.request, cl); });
      }
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (m) {
        return m || caches.match("./index.html");             // any offline navigation still loads the app
      });
    })
  );
});
