/* v40.0 — Scroll3D Hero (lazy, boot-safe, loaded by index.html at idle).
   Adds a real WebGL medallion (Three.js, loaded from CDN) in the hero that
   spins gently and performs a scroll-driven reveal — rotating, shrinking and
   fading as the visitor scrolls past the hero, in the style of a product
   page "scroll video". Pure enhancement: if WebGL, the network, or motion
   preferences don't allow it, the existing CSS cube stays exactly as it was.
   Additive, fails silent, never blocks boot(). */
(function () {
  "use strict";
  if (window.__scroll3d) return;
  window.__scroll3d = 1;

  var THREE_CDN = "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";

  function reducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { return false; }
  }

  function isNarrow() {
    try {
      return !!(window.matchMedia && window.matchMedia("(max-width: 640px)").matches);
    } catch (e) { return false; }
  }

  function supportsWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  function boot() {
    try {
      if (reducedMotion() || isNarrow() || !supportsWebGL()) return;
      var hero = document.querySelector(".hero");
      var mount = document.getElementById("scroll3d");
      if (!hero || !mount || !("import" in window ? true : true)) { /* dynamic import checked below */ }
      if (!hero || !mount) return;

      import(/* webpackIgnore: true */ THREE_CDN)
        .then(function (THREE) { start(THREE, hero, mount); })
        .catch(function () { /* offline, blocked, or CDN unreachable — CSS cube remains visible */ });
    } catch (e) { /* fail silent */ }
  }

  function start(THREE, hero, mount) {
    try {
      var w = mount.clientWidth || 132, h = mount.clientHeight || 132;

      var renderer = new THREE.WebGLRenderer({ canvas: mount, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(w, h, false);

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
      camera.position.set(0, 0, 7);

      var key = new THREE.DirectionalLight(0xfff3d0, 1.5);
      key.position.set(3, 4, 5);
      scene.add(key);
      var rim = new THREE.DirectionalLight(0x8fb4ff, 0.55);
      rim.position.set(-4, -2, -3);
      scene.add(rim);
      scene.add(new THREE.AmbientLight(0x3a2c18, 0.75));

      /* A faceted gold medallion with an orbiting ring — a WebGL stand-in
         for the CSS cube, in the app's existing gold/navy palette. */
      var group = new THREE.Group();
      var gemMat = new THREE.MeshStandardMaterial({
        color: 0xc9a25f, metalness: 0.68, roughness: 0.24,
        emissive: 0x2b1d06, emissiveIntensity: 0.22
      });
      var gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.55, 0), gemMat);
      group.add(gem);

      var ringMat = new THREE.MeshStandardMaterial({ color: 0xe8c76a, metalness: 0.82, roughness: 0.18 });
      var ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.065, 16, 64), ringMat);
      ring.rotation.x = Math.PI / 2.15;
      group.add(ring);

      scene.add(group);

      var scrollT = 0, targetT = 0;

      function readScroll() {
        var rect = hero.getBoundingClientRect();
        var span = rect.height + window.innerHeight;
        var passed = window.innerHeight - rect.top;
        targetT = Math.max(0, Math.min(1, span > 0 ? passed / span : 0));
      }
      window.addEventListener("scroll", readScroll, { passive: true });
      readScroll();

      function onResize() {
        var w2 = mount.clientWidth || w, h2 = mount.clientHeight || h;
        renderer.setSize(w2, h2, false);
        camera.aspect = w2 / h2;
        camera.updateProjectionMatrix();
      }
      window.addEventListener("resize", onResize, { passive: true });

      var clock = new THREE.Clock();
      var raf = 0;

      function tick() {
        raf = requestAnimationFrame(tick);
        var dt = Math.min(0.05, clock.getDelta());
        scrollT += (targetT - scrollT) * 0.08;
        group.rotation.y += dt * 0.45 + scrollT * dt * 3.4;
        group.rotation.x = 0.35 + scrollT * 1.15;
        var scale = 1 - scrollT * 0.4;
        group.scale.setScalar(Math.max(0.5, scale));
        mount.style.opacity = String(Math.max(0, 1 - scrollT * 1.4));
        renderer.render(scene, camera);
      }
      raf = requestAnimationFrame(tick);

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
        else if (!raf) { clock.getDelta(); raf = requestAnimationFrame(tick); }
      });

      /* Swap in: fade the WebGL canvas up, fade the CSS cube out. */
      mount.style.opacity = "1";
      var cssCube = hero.querySelector(".cube");
      if (cssCube) {
        cssCube.style.transition = "opacity .5s ease";
        cssCube.style.opacity = "0";
        setTimeout(function () { cssCube.style.visibility = "hidden"; }, 550);
      }
    } catch (e) { /* fail silent — CSS cube remains as-is */ }
  }

  if ("requestIdleCallback" in window) {
    requestIdleCallback(boot, { timeout: 2500 });
  } else {
    setTimeout(boot, 900);
  }
})();
