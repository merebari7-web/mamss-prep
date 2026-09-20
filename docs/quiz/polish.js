/* v42.0 — Apple design language, continued (lazy, boot-safe). Applies the Apple look (lazy, boot-safe). Loaded by the existing tiny
   async loader in index.html; appends a scoped stylesheet (html.polished) and
   a decoration layer. Upgrades EVERY surface: hero (shimmer, particles, live
   date/term/streak chip, numbered stat icons), nav glass, buttons, cards in
   the grid, quiz options, teaching-suite tiles, arcade tiles, library rows,
   modals (backdrop blur), toasts, focus rings, and adds three features:
   back-to-top button, scroll-reveal stagger, hero today-chip. Everything is
   additive and fails silent; missing file = app renders exactly as before. */
(function () {
  "use strict";
  if (window.__polish) return;
  window.__polish = 1;

  var CSS =
    "html.polished{--pf-g:#dcb85f;--pf-g2:#f4e3b2;--pf-ga:rgba(220,184,95,.32);--pf-soft:rgba(220,184,95,.13)}" +
    "html.polished ::selection{background:rgba(220,184,95,.42);color:#241a06}" +
    "html.polished ::-webkit-scrollbar{width:11px;height:11px}" +
    "html.polished ::-webkit-scrollbar-track{background:transparent}" +
    "html.polished ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#dcb85f,#8a6d1f);border-radius:99px;border:2.5px solid transparent;background-clip:padding-box}" +
    /* --- hero effect layer (v24 core, retained) --- */
    "html.polished #polishFx{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}" +
    "html.polished .hero-copy{position:relative;z-index:2}" +
    "html.polished #polishFx i{position:absolute;z-index:0;display:block;background:var(--pf-g);border-radius:50%;opacity:0;box-shadow:0 0 14px 3px var(--pf-soft);animation:pfSpark var(--pd,7s) ease-in-out var(--pl,0s) infinite}" +
    "html.polished #polishFx .pf-halo{left:50%;top:30%;width:min(880px,94%);height:min(370px,66%);transform:translate(-50%,-50%);background:radial-gradient(50% 50% at 50% 50%,var(--pf-soft),transparent 68%);filter:blur(10px);box-shadow:none;border-radius:50%;opacity:.9;animation:pfBreathe 8s ease-in-out infinite}" +
    "html.polished #polishFx .pf-s1{left:7%;top:20%;width:5px;height:5px;--pd:7s;--pl:0s}" +
    "html.polished #polishFx .pf-s2{left:15%;top:58%;width:4px;height:4px;--pd:9s;--pl:.8s}" +
    "html.polished #polishFx .pf-s3{left:24%;top:34%;width:6px;height:6px;--pd:8s;--pl:1.6s}" +
    "html.polished #polishFx .pf-s4{left:33%;top:70%;width:4px;height:4px;--pd:10s;--pl:2.4s}" +
    "html.polished #polishFx .pf-s5{left:44%;top:16%;width:5px;height:5px;--pd:7.5s;--pl:1.1s}" +
    "html.polished #polishFx .pf-s6{left:55%;top:64%;width:4px;height:4px;--pd:8.6s;--pl:3s}" +
    "html.polished #polishFx .pf-s7{left:64%;top:26%;width:6px;height:6px;--pd:9.4s;--pl:.4s}" +
    "html.polished #polishFx .pf-s8{left:74%;top:52%;width:4px;height:4px;--pd:7.8s;--pl:2s}" +
    "html.polished #polishFx .pf-s9{left:83%;top:18%;width:5px;height:5px;--pd:8.2s;--pl:1.4s}" +
    "html.polished #polishFx .pf-s10{left:91%;top:44%;width:4px;height:4px;--pd:9.6s;--pl:.6s}" +
    /* --- v26: hero today-chip + stat icons --- */
    "html.polished .hero-chip{display:inline-flex;align-items:center;gap:7px;margin-top:12px;padding:8px 14px;border-radius:999px;border:1px solid rgba(244,227,178,.35);background:rgba(255,255,255,.07);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-size:.78rem;font-weight:700;letter-spacing:.02em;color:#f6ead2;box-shadow:0 10px 26px -16px rgba(0,0,0,.6)}" +
    "html.polished .hero-chip b{color:#eecf7e}" +
    "html.polished .hero-chip .hr-dot{width:6px;height:6px;border-radius:50%;background:#5fbf7a;box-shadow:0 0 8px #5fbf7a}" +
    "html.polished .stat b::before{margin-right:5px;font-size:.72em;opacity:.9;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))}" +
    "html.polished .stat:nth-of-type(1) b::before{content:'\\1F4DD '}" +
    "html.polished .stat:nth-of-type(2) b::before{content:'\\1F4DA '}" +
    "html.polished .stat:nth-of-type(3) b::before{content:'\\1F3AF '}" +
    "html.polished .stat:nth-of-type(4) b::before{content:'\\1F3EB '}" +
    "html.polished .stat:nth-of-type(5) b::before{content:'\\1F4A1 '}" +
    "html.polished .stat:nth-of-type(6) b::before{content:'\\1F4C4 '}" +
    /* --- v26: nav + brand glass --- */
    "html.polished .nav{border-bottom:1px solid rgba(220,184,95,.14);background:rgba(255,255,255,.05)}" +
    "html.polished .brand .logo{box-shadow:0 8px 22px -10px rgba(220,184,95,.65)}" +
        "html.polished .icon-btn{border-radius:12px}" +
    "html.polished .hd-btn{border-radius:14px}" +
    "html.polished .hd-btn.on{box-shadow:inset 0 0 0 1px rgba(220,184,95,.35),0 8px 20px -12px rgba(220,184,95,.55)}" +
    "html.polished .home-dock{border-color:var(--pf-ga);box-shadow:0 -8px 34px -20px rgba(0,0,0,.5)}" +
    /* --- v26: components --- */
    "html.polished .stat{box-shadow:inset 0 0 0 1px var(--pf-ga),0 16px 34px -20px rgba(0,0,0,.55);transition:transform .25s,box-shadow .25s}" +
    "html.polished .stat:hover{transform:translateY(-3px);box-shadow:inset 0 0 0 1px rgba(220,184,95,.55),0 22px 44px -22px rgba(0,0,0,.6)}" +
    "html.polished .stat b{display:inline-block;animation:pfRise .7s cubic-bezier(.2,.7,.3,1.15) .1s both}" +
    "html.polished .card{transition:border-color .25s,box-shadow .25s}" +
    "html.polished .card:hover{border-color:var(--pf-ga);box-shadow:0 22px 52px -24px rgba(15,20,45,.5)}" +
    "html.polished .btn:active{transform:translateY(1px) scale(.99)}" +
    "html.polished .btn-primary{box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 12px 30px -12px rgba(140,100,30,.6);transition:transform .2s,box-shadow .2s}" +
    "html.polished .btn-primary:hover{transform:translateY(-2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 18px 38px -14px rgba(140,100,30,.7)}" +
    "html.polished .btn-ghost:hover{border-color:var(--pf-ga)}" +
    "html.polished .ai-go{position:relative;overflow:clip}" +
    "html.polished .ai-go::after{content:'';position:absolute;top:0;left:0;width:55%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-18deg) translateX(-190%);animation:pfShineA 5s ease-in-out infinite;pointer-events:none}" +
    "html.polished .hero .flourish{filter:drop-shadow(0 0 10px rgba(220,184,95,.25))}" +
    "html.polished .hero .fl-dia{animation:pfDia 5s ease-in-out infinite;transform-origin:center;transform-box:fill-box}" +
    /* --- v26: quiz + teaching surfaces --- */
    "html.polished .opt{transition:transform .18s,border-color .2s,box-shadow .25s,background .2s}" +
    "html.polished .opt:hover{transform:translateY(-1px);border-color:var(--gold)}" +
    "html.polished .opt.correct{box-shadow:0 0 0 3px rgba(0,135,81,.22)}" +
    "html.polished .qnav .btn{border-radius:12px}" +
    "html.polished .timer{color:var(--green-d,#8a5f24);font-weight:800}" +
    "html.polished .tab,.html.polished .chip{border-radius:12px}" +
    "html.polished .lab-tile:hover{transform:translateY(-3px);box-shadow:0 18px 36px -18px rgba(20,35,70,.45);border-color:var(--gold)}" +
    "html.polished .lab-tile{transition:transform .2s,border-color .2s,box-shadow .2s}" +
    "html.polished .sv-tile{transition:transform .2s,border-color .2s,box-shadow .2s}" +
    "html.polished .sv-tile:hover{transform:translateY(-2px);border-color:var(--gold);box-shadow:0 14px 30px -16px rgba(20,35,70,.4)}" +
    "html.polished .g-tile{transition:transform .2s,border-color .2s,box-shadow .2s}" +
    "html.polished .g-tile:hover{transform:translateY(-3px);border-color:var(--gold);box-shadow:0 20px 40px -20px rgba(20,35,70,.5)}" +
    "html.polished .lib-item{transition:background .2s,padding-left .2s}" +
    "html.polished .lib-item:hover{background:rgba(201,162,39,.07);padding-left:16px}" +
    "html.polished .hq-chip:hover{transform:translateY(-2px)}" +
    "html.polished .hq-chip{transition:transform .2s}" +
    "html.polished .edu-sec{border-left:3px solid rgba(201,162,39,.4)}" +
    /* --- v26: overlays, modals, toast --- */
    "html.polished #labOverlay,html.polished #eduOverlay,html.polished #libraryOverlay,html.polished #hqOverlay,html.polished #historyOverlay,html.polished #statsOverlay,html.polished #helpOverlay,html.polished #wheelOverlay,html.polished #certOverlay,html.polished #levelOverlay,html.polished #submitCheckOverlay,html.polished #accountOverlay{backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}" +
    "html.polished .modal{border:1px solid rgba(220,184,95,.28)}" +
    "html.polished #toast{border:1px solid rgba(220,184,95,.5);border-radius:999px;box-shadow:0 18px 44px -18px rgba(0,0,0,.55)}" +
    /* --- v26: new features --- */
    "html.polished .back-top{position:fixed;right:14px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:96;width:44px;height:44px;border-radius:50%;border:1px solid rgba(220,184,95,.5);background:linear-gradient(160deg,#241a06,#3a2a0e);color:#f4e3b2;font-size:1.1rem;font-weight:900;cursor:pointer;box-shadow:0 14px 34px -14px rgba(0,0,0,.6);opacity:0;pointer-events:none;transform:translateY(14px);transition:opacity .3s,transform .3s;font-family:inherit}" +
    "html.polished .back-top.show{opacity:1;pointer-events:auto;transform:none}" +
    "html.polished .back-top:hover{border-color:#eecf7e;transform:translateY(-2px)}" +
    "html.polished .rv{opacity:0;transform:translateY(16px)}" +
    "html.polished .rv.rv-in{opacity:1;transform:none;transition:opacity .55s ease,transform .55s cubic-bezier(.22,1,.36,1)}" +
    "html.polished :focus-visible{outline:2px solid #c9a227;outline-offset:2px}" +
    "@media (prefers-reduced-motion:no-preference){" +
    "html.polished .hero h1{background:linear-gradient(100deg,#fff 0%,#fff 18%,var(--pf-g2) 36%,#eecf7e 50%,var(--pf-g2) 64%,#fff 82%,#fff 100%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;animation:pfSheen 11s linear infinite}" +
    "@keyframes pfSheen{0%{background-position:0% 0}100%{background-position:-220% 0}}" +
    "html.polished .hero h1 .h1-sub{-webkit-text-fill-color:currentColor;color:var(--pf-g2)}" +
    "@keyframes pfSpark{0%,100%{opacity:0;transform:scale(.4)}10%{opacity:.95;transform:scale(1)}24%{opacity:.28;transform:scale(.75)}38%{opacity:.85;transform:scale(.6)}54%{opacity:.12;transform:scale(.9)}70%{opacity:.8;transform:scale(1.08)}86%{opacity:.25}}" +
    "@keyframes pfBreathe{0%,100%{opacity:.55;transform:translate(-50%,-50%) scale(1)}50%{opacity:.95;transform:translate(-50%,-50%) scale(1.12)}}" +
    "@keyframes pfRise{0%{opacity:.2;transform:translateY(8px) scale(.94)}100%{opacity:1;transform:none}}" +
    "@keyframes pfShineA{0%,55%{transform:skewX(-18deg) translateX(-190%)}85%,100%{transform:skewX(-18deg) translateX(260%)}}" +
    "@keyframes pfDia{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.28);opacity:1}}" +
    "}" +
    "@media (max-width:640px){html.polished #polishFx .pf-halo{width:132%;top:24%}html.polished .hero-chip{padding:6px 11px;font-size:.7rem}}" +
    /* --- v28: section underline draw, cursor spotlight, light remaster, hour ambience --- */
    "html.polished .step{position:relative;padding-bottom:12px}" +
    "html.polished .step::after{content:'';position:absolute;left:2px;bottom:0;width:74px;height:3px;border-radius:99px;background:linear-gradient(90deg,var(--pf-g),rgba(220,184,95,0));animation:pfDraw 1s cubic-bezier(.2,.7,.3,1) .2s both}" +
    "@keyframes pfDraw{from{transform:scaleX(0)}to{transform:scaleX(1)}}" +
    "html.polished .stat,html.polished .lib-item,html.polished .notes-card{background-image:radial-gradient(210px circle at var(--px,50%) var(--py,38%),rgba(220,184,95,.15),transparent 62%)}" +
    "html.polished[data-aura-hour=hour-m] .pf-halo{filter:hue-rotate(-6deg) saturate(1.12) blur(10px)}" +
    "html.polished[data-aura-hour=hour-a] .pf-halo{filter:hue-rotate(-9deg) blur(10px)}" +
    "html.polished[data-aura-hour=hour-e] .pf-halo{filter:hue-rotate(14deg) saturate(1.2) blur(10px)}" +
    "html.polished[data-aura-hour=hour-n] .pf-halo{filter:hue-rotate(28deg) saturate(.9) blur(10px)}" +
    "html.polished[data-theme=light] .stat{background:linear-gradient(165deg,#fffdf8,#f6ecd4);border-color:rgba(190,150,70,.4);box-shadow:inset 0 0 0 1px rgba(255,255,255,.75),0 18px 40px -26px rgba(150,110,40,.45)}" +
    "html.polished[data-theme=light] .stat span{color:#8a6a30}" +
    "html.polished[data-theme=light] .hero-chip{border-color:rgba(190,150,70,.38);background:rgba(255,252,244,.78)}" +
    "html.polished[data-theme=light] .step::after{background:linear-gradient(90deg,#c9a227,rgba(201,162,39,0))}" +
    "@media print{html.polished #polishFx,html.polished .back-top,html.polished .hero-chip{display:none!important}}" +
    /* --- v32 Aurum Gloss: glass sheen on every card/modal/chip --- */
    "html.polished .card,html.polished .notes-card,html.polished .bo-box,html.polished .tk-box,html.polished .st-box,html.polished .apex-box,html.polished .zen-box,html.polished .pal-box{background-image:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0) 56px),radial-gradient(340px circle at 90% -12%,var(--pf-soft),transparent 62%)}" +
    "html.polished .ex-tile,html.polished .bt-chip{background-image:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,0) 42px)}" +
    /* --- v32: hero badge aurora ring --- */
    "html.polished .hero-badge{position:relative}" +
    "html.polished .hero-badge::before{content:'';position:absolute;inset:-2px;border-radius:999px;background:conic-gradient(from 0deg,transparent 0deg,rgba(238,207,126,.95) 76deg,rgba(140,110,40,.85) 148deg,transparent 220deg,transparent 360deg);z-index:-1;filter:blur(3px);opacity:.85}" +
    /* --- v32: inputs + selects gold focus glow --- */
    "html.polished input:not([type=checkbox]):not([type=radio]):not([type=range]),html.polished select,html.polished textarea{transition:border-color .2s,box-shadow .2s}" +
    "html.polished input:not([type=checkbox]):not([type=radio]):not([type=range]):hover,html.polished select:hover,html.polished textarea:hover{border-color:var(--gold,#c9a227)}" +
    "html.polished input:not([type=checkbox]):not([type=radio]):not([type=range]):focus,html.polished select:focus,html.polished textarea:focus{border-color:#c9a227;box-shadow:0 0 0 3px var(--pf-soft)}" +
    /* --- v32: dock active pill + heatmap pop + tool buttons --- */
    "html.polished .hm-c{transition:transform .15s,box-shadow .15s}" +
    "html.polished .hm-c:hover{transform:scale(1.3);box-shadow:0 0 0 1px rgba(220,184,95,.4),0 4px 10px -4px rgba(0,0,0,.4);z-index:2}" +
    "html.polished .bo-btn:not(.alt),html.polished .tk-btn:not(.alt),html.polished .st-btn.on{transition:transform .18s,filter .18s,box-shadow .18s}" +
    "html.polished .bo-btn:not(.alt):hover,html.polished .tk-btn:not(.alt):hover,html.polished .st-btn.on:hover{transform:translateY(-1px);filter:brightness(1.05);box-shadow:0 10px 22px -10px rgba(140,100,30,.55)}" +
    /* --- v32: toast pill countdown bar + spring pop --- */
    "html.polished #toast{overflow:hidden}" +
    "html.polished #pfToastBar{position:absolute;left:16px;right:16px;bottom:5px;height:3px;border-radius:99px;background:linear-gradient(90deg,var(--pf-g2,#f4e3b2),var(--pf-g,#dcb85f));transform-origin:left;animation:pfToastBar 3.2s linear forwards;pointer-events:none}" +
    /* --- v32: motion (reduced-motion aware) --- */
    "@media (prefers-reduced-motion:no-preference){" +
    "@keyframes pfToastBar{from{transform:scaleX(1)}to{transform:scaleX(0)}}" +
    "html.polished .hero-badge::before{animation:pfRingSpin 6.5s linear infinite}" +
    "@keyframes pfRingSpin{to{transform:rotate(360deg)}}" +
    "@media (min-width:641px){html.polished #toast.show{animation:pfToastPop .38s cubic-bezier(.2,.85,.3,1.2)}@keyframes pfToastPop{0%{transform:translateX(-50%) translateY(14px) scale(.96)}60%{transform:translateX(-50%) translateY(-2px) scale(1.015)}100%{transform:translateX(-50%) translateY(0) scale(1)}}}" +
    "@media (max-width:640px){html.polished #toast.show{animation:pfToastPopM .38s cubic-bezier(.2,.85,.3,1.2)}@keyframes pfToastPopM{0%{transform:translateY(14px) scale(.96)}60%{transform:translateY(-2px) scale(1.015)}100%{transform:translateY(0) scale(1)}}}" +
    "html.polished .stat b{animation:pfRise .7s cubic-bezier(.2,.7,.3,1.15) .1s both,pfBob 5.5s ease-in-out 1.5s infinite}" +
    "@keyframes pfBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}" +
    "html.polished #xpFill{animation:pfGlow 3.4s ease-in-out infinite}" +
    "@keyframes pfGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.14) saturate(1.1)}}" +
    "}" +
    "@media (max-width:640px){html.polished #pfToastBar{left:10px;right:10px;bottom:4px}}" +
    /* --- v36 Atlas Shine: launcher-chip glow + nav scroll shadow --- */
    "html.polished .ex-tile,html.polished .bt-chip{transition:transform .2s,border-color .2s,box-shadow .2s}" +
    "html.polished .ex-tile:hover,html.polished .bt-chip:hover{transform:translateY(-2px);border-color:var(--pf-g,#dcb85f);box-shadow:0 14px 30px -14px rgba(140,100,30,.55),0 0 0 1px var(--pf-soft)}" +
    "html.polished .ex-tile:active,html.polished .bt-chip:active{transform:translateY(0) scale(.98)}" +
    "html.polished.pf-scrolled .nav{box-shadow:0 10px 30px -18px rgba(0,0,0,.45)}" +
    "@media (prefers-reduced-motion:reduce){html.polished .ex-tile:hover,html.polished .bt-chip:hover{transform:none}}" +
    /* --- v37 Find button: nav glow + teach pulse --- */
    "html.polished #findBtn{box-shadow:0 0 0 1px var(--pf-ga),0 8px 20px -10px rgba(220,184,95,.7)}" +
    "@media (prefers-reduced-motion:no-preference){html.polished #findBtn{animation:pfFindPulse 3.2s ease-in-out 2}@keyframes pfFindPulse{0%,100%{box-shadow:0 0 0 1px var(--pf-ga)}50%{box-shadow:0 0 0 6px rgba(220,184,95,.3)}}}" +
    /* --- v40 3D scroll journey: depth elements + depth rail --- */
    "html.polished .s3d-el{will-change:transform}" +
    "html.polished #s3dRail{position:fixed;right:10px;top:50%;transform:translateY(-50%);z-index:60;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none}" +
    "html.polished #s3dRail .s3d-track{width:5px;height:130px;border-radius:99px;background:rgba(220,184,95,.16);position:relative;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(220,184,95,.25)}" +
    "html.polished #s3dRail .s3d-fill{position:absolute;inset:0;border-radius:99px;background:linear-gradient(0deg,#8a6d1f,#eecf7e);transform-origin:50% 100%;transform:scaleY(0)}" +
    "html.polished #s3dRail .s3d-lab{font-size:.6rem;font-weight:800;color:#a8842f;letter-spacing:.04em;text-shadow:0 1px 0 rgba(255,255,255,.5)}" +
    "@media (max-width:899px){html.polished #s3dRail{display:none}}" +
    "html.rmotion #s3dRail{display:none!important}" +
    "html.rmotion .s3d-el{transform:none!important}";

  /* v40 — 3D scroll journey: hero stage layers + cards glide through depth as you scroll.
     Per-element perspective() transforms only (never on ancestors, so fixed
     overlays/nav/dock are untouched); rAF-throttled; self-disables under
     reduced motion. Exposes window.__s3d = { on, n }. */
  function scroll3d() {
    if (window.__s3d) return;
    var api = window.__s3d = { on: false, n: 0 };
    /* Small layers only: giant containers (.hero, #step-class) stay flat for
       compositor safety + readability; their inner layers + small cards fly. */
    var SEL = ".hero [data-depth],#step-subject,#step-length,#main .card,#gameDash,#labGrid,#planCard,#aiGrid,#cdBanner";
    var rail = null, fill = null, lab = null;
    try {
      rail = document.createElement("div");
      rail.id = "s3dRail";
      rail.setAttribute("aria-hidden", "true");
      rail.innerHTML = '<div class="s3d-track"><div class="s3d-fill" id="s3dFill"></div></div><div class="s3d-lab" id="s3dLab">3D</div>';
      document.body.appendChild(rail);
      fill = document.getElementById("s3dFill");
      lab = document.getElementById("s3dLab");
    } catch (e) { rail = null; }
    var els = [];
    function collect() {
      els = [];
      try {
        var q = document.querySelectorAll(SEL);
        for (var i = 0; i < q.length; i++) {
          if (q[i].id === "polishFx") continue;
          q[i].classList.add("s3d-el");
          els.push(q[i]);
        }
      } catch (e) {}
      api.n = els.length;
      lastY = -1;
    }
    function motionOK() {
      try {
        if (document.documentElement.classList.contains("rmotion")) return false;
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
      } catch (e) {}
      return true;
    }
    var ticking = false, lastY = -1;
    function frame() {
      ticking = false;
      if (api.freeze) return;
      var on = motionOK();
      api.on = on;
      try {
        if (rail) rail.style.display = on ? "" : "none";
        if (!on) {
          for (var i = 0; i < els.length; i++) {
            if (els[i]._s3d) { els[i]._s3d = 0; els[i].style.transform = ""; }
          }
          lastY = -1;
          return;
        }
        var y = window.scrollY || document.documentElement.scrollTop || 0;
        var vh = window.innerHeight || 800;
        var doc = Math.max(document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0) - vh;
        var prog = doc > 0 ? Math.min(1, Math.max(0, y / doc)) : 0;
        if (fill) fill.style.transform = "scaleY(" + prog.toFixed(3) + ")";
        if (lab) { var pc = Math.round(prog * 100); if (lab._p !== pc) { lab._p = pc; lab.textContent = pc + "%"; } }
        if (y === lastY) return;
        lastY = y;
        var heroEl = null, heroProg = 0;
        try {
          heroEl = document.querySelector(".hero");
          if (heroEl) {
            var hr = heroEl.getBoundingClientRect();
            if (hr.height > 0) heroProg = Math.max(0, Math.min(1.2, -hr.top / (hr.height * 0.9)));
          }
        } catch (e) {}
        for (var j = 0; j < els.length; j++) {
          var el = els[j];
          if (!el.isConnected) continue;
          var r = el.getBoundingClientRect();
          var depth = 0;
          try { depth = parseFloat(el.getAttribute("data-depth") || "0") || 0; } catch (e) {}
          if (r.height < 4 || r.height > 800 || r.bottom < -200 || r.top > vh + 200) {
            if (el._s3d) { el._s3d = 0; el.style.transform = ""; }
            continue;
          }
          if (depth > 0 && heroEl) {
            /* hero stage layer: drift + sink with scroll, scaled by depth */
            var dy = depth * 70 * heroProg;
            var dz = -depth * 80 * heroProg;
            var rx = -3 * depth * heroProg;
            el.style.transform = "perspective(1100px) translateY(" + dy.toFixed(1) + "px) translateZ(" + dz.toFixed(1) + "px) rotateX(" + rx.toFixed(2) + "deg)";
          } else {
            var p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh * 0.55)));
            var tilt = -5 * p;
            var z = -60 * Math.abs(p);
            var sc = 1 - 0.025 * Math.abs(p);
            el.style.transform = "perspective(1100px) rotateX(" + tilt.toFixed(2) + "deg) translateZ(" + z.toFixed(1) + "px) scale(" + sc.toFixed(3) + ")";
          }
          el._s3d = 1;
        }
      } catch (e) {}
    }
    function kick() { if (!ticking) { ticking = true; if ("requestAnimationFrame" in window) requestAnimationFrame(frame); else setTimeout(frame, 16); } }
    try {
      collect();
      window.addEventListener("scroll", kick, { passive: true });
      window.addEventListener("resize", kick, { passive: true });
      if ("MutationObserver" in window) {
        var mT = 0;
        var mo = new MutationObserver(function () {
          var n = Date.now();
          if (n - mT > 600) { mT = n; collect(); kick(); }
        });
        try { mo.observe(document.getElementById("main") || document.body, { childList: true, subtree: true }); } catch (e) {}
      }
      try { api.kick = kick; } catch (e) {}
      kick();
    } catch (e) {}
  }

  /* v41 — Apple design language (lazy, additive, boot-safe). Scoped to
     html.apple: SF system type, Apple neutrals, black keynote hero with a
     marketing-gradient headline, frosted-glass global nav, pill buttons and
     18px cards, Apple-ID-style gate, full dark-mode set. Never touches the
     boot wire (index.html byte-identical) and never scrolls or focuses. */
  var APPLECSS =
    "html.apple.apple:not(.st-acc-emerald):not(.st-acc-rose):not(.st-acc-sapphire):not(.st-acc-violet){--green:#0071e3;--green-2:#2997ff;--green-d:#0058b6;--green-l:#e9f2fd;--gold:#b98a45;--gold-l:#f6ead2;--gold-d:#8a5f24;--ring:#d2d2d7}" +
    "html.apple.apple{--red:#d70015;--red-l:#fdebed;--bg:#f5f5f7;--bg-2:#e8e8ed;--card:#fff;--card-solid:#fff;--card-border:#e3e3e8;--ink:#1d1d1f;--ink-2:#424245;--mut:#6e6e73;--shadow:0 4px 24px -10px rgba(0,0,0,.14);--shadow-sm:0 2px 10px -4px rgba(0,0,0,.10);--hero-grad:#000;--hero-ink:#f5f5f7;--chip-bg:#fff;--chip-border:#d2d2d7;--opt-bg:#fff;--opt-border:#d2d2d7;--opt-hover:rgba(0,113,227,.06);--bar-track:#e8e8ed;--panel:#f5f5f7}" +
    "html.apple.apple body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','SF Pro Display','Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}" +
    "html.apple.apple h1{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue',Helvetica,Arial,sans-serif}" +
    "html.apple.apple h1,html.apple.apple h2,html.apple.apple h3{letter-spacing:-.015em}" +
    "html.apple.apple .btn,html.apple.apple h2.step{text-transform:none;letter-spacing:0}" +
    "html.apple.apple a{color:#0066cc}" +
    "html.apple.apple a:hover{text-decoration:underline}" +
    "html.apple.apple .hero{background:#000;color:#f5f5f7;padding:0 20px 72px}" +
    "html.apple.apple .hero .hero-deco,html.apple.apple .hero .hero-rule,html.apple.apple .watermark,html.apple.apple body::before{display:none!important}" +
    "html.apple.apple .hero .blob,html.apple.apple .hero .rays,html.apple.apple .hero .cube-scene,html.apple.apple .hero .facade,html.apple.apple .hero #heroSun,html.apple.apple .hero #heroFx,html.apple.apple .hero .hero-net,html.apple.apple .hero .flourish,html.apple.apple .hero .h-orb,html.apple.apple .hero .h-ring,html.apple.apple .hero::after,html.apple.apple #polishFx,html.apple.apple #aurora{visibility:hidden!important}" +
    "html.apple.apple .nav{background:rgba(22,22,23,.72);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.14);max-width:none;margin:0 -20px 0;padding:10px 20px;color:#f5f5f7}" +
    "html.apple.apple .brand{color:#f5f5f7}" +
    "html.apple.apple .brand small{color:#a1a1a6}" +
    "html.apple.apple .nav .icon-btn{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);color:#f5f5f7;border-radius:50%}" +
    "html.apple.apple .nav .hud{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);border-radius:980px}" +
    "html.apple.apple .acct-btn{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);border-radius:980px;color:#f5f5f7}" +
    "html.apple.apple .xp-track{background:rgba(255,255,255,.22)}" +
    "html.apple.apple .hero-copy{padding-top:60px}" +
    "html.apple.apple .hero-badge{display:inline-block;font-size:11px;font-weight:600;letter-spacing:.14em;color:#a1a1a6;border:1px solid rgba(255,255,255,.24);border-radius:980px;padding:7px 18px;background:transparent}" +
    "html.apple.apple .hero-badge .dot{background:#2997ff;box-shadow:0 0 12px #2997ff}" +
    "html.apple.apple .hero-chip{color:#1d1d1f}" +
    "html.apple.apple .hero h1{font-size:clamp(2.6rem,7vw,4.6rem);font-weight:700;letter-spacing:-.025em;line-height:1.04;background:linear-gradient(92deg,#2997ff 0%,#a259ff 48%,#ff6482 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}" +
    "html.apple.apple .hero .h1-sub{display:block;font-style:normal;font-size:clamp(1rem,2.4vw,1.3rem);font-weight:400;letter-spacing:-.01em;color:#a1a1a6;-webkit-text-fill-color:#a1a1a6;margin-top:14px;line-height:1.45}" +
    "html.apple.apple .hero p.tag{color:#a1a1a6;font-size:17px;line-height:1.5;max-width:660px}" +
    "html.apple.apple .stats{gap:6px 8px;margin-top:34px}" +
    "html.apple.apple .stat{background:transparent;border:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;padding:8px 16px}" +
    "html.apple.apple .stat b{font-size:1.9rem;font-weight:700;background:none;-webkit-text-fill-color:#f5f5f7;color:#f5f5f7;filter:none}" +
    "html.apple.apple .stat span{color:#86868b;font-size:.68rem}" +
    "html.apple.apple #appleNav{position:sticky;top:0;z-index:80;background:rgba(251,251,253,.8);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border-bottom:1px solid rgba(0,0,0,.08)}" +
    "html.apple.apple #appleNav .an-in{max-width:1024px;margin:0 auto;display:flex;align-items:center;gap:2px;height:44px;padding:0 14px;overflow-x:auto;scrollbar-width:none}" +
    "html.apple.apple #appleNav .an-in::-webkit-scrollbar{display:none}" +
    "html.apple.apple #appleNav a{flex:none;color:#1d1d1f;opacity:.8;font-size:12px;font-weight:400;text-decoration:none;padding:8px 11px;border-radius:8px;white-space:nowrap}" +
    "html.apple.apple #appleNav a:hover{opacity:1;text-decoration:none}" +
    "html.apple.apple #appleNav .an-brand{font-weight:700;font-size:13px;opacity:1;display:flex;align-items:center;gap:7px}" +
    "@media(max-width:640px){html.apple.apple #appleNav .an-opt{display:none}}" +
    "html.apple.apple .card,html.apple.apple .ai-card,html.apple.apple .hq-sec,html.apple.apple .modal{background-color:#fff;background-image:linear-gradient(180deg,#ffffff,#fbfbfd);border:1px solid #e4e4e9;border-radius:18px;box-shadow:0 4px 24px -12px rgba(0,0,0,.12)}" +
    "html.apple.apple .card::before,html.apple.apple .card::after{display:none}" +
    "html.apple.apple .overlay{background:rgba(0,0,0,.4);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}" +
    "html.apple.apple .btn,html.apple.apple .btn-mini,html.apple.apple .edu-btn,html.apple.apple .arc-btn,html.apple.apple .cal-btn{border-radius:980px;font-weight:600}" +
    "html.apple.apple .btn-primary{background:var(--green);border-color:transparent;color:#fff;box-shadow:none}" +
    "html.apple.apple .btn-primary:hover{background:var(--green-2);box-shadow:0 8px 22px -8px rgba(0,113,227,.55)}" +
    "html.apple.apple .btn-gold{background:#0071e3;border-color:transparent;color:#fff;box-shadow:none}" +
    "html.apple.apple .ai-go{background:var(--green);border-color:transparent;color:#fff;border-radius:980px;box-shadow:none}" +
    "html.apple.apple .ai-go:hover{background:var(--green-2)}" +
    "html.apple.apple .btn-ghost{background:#fff;border:1px solid #d2d2d7;color:var(--green);box-shadow:none}" +
    "html.apple.apple .chip,html.apple.apple .tab,html.apple.apple .count,html.apple.apple .opt,html.apple.apple .s3-opt,html.apple.apple .map-chip,html.apple.apple .mp{background:#fff;border:1px solid #d2d2d7;border-radius:14px}" +
    "html.apple.apple .opt:hover,html.apple.apple .chip:hover,html.apple.apple .tab:hover,html.apple.apple .count:hover{border-color:var(--green)}" +
    "html.apple.apple .chip.active,html.apple.apple .tab.active,html.apple.apple .count.active{border-color:var(--green);background:var(--green-l);box-shadow:inset 0 0 0 1px var(--green)}" +
    "html.apple.apple .opt .letter{background:#e8e8ed;color:#1d1d1f;box-shadow:none}" +
    "html.apple.apple .opt.sel{border-color:var(--green);background:var(--green-l)}" +
    "html.apple.apple .opt.correct{border-color:#1a7f37;background:#edf7f0;box-shadow:inset 0 0 0 1px #1a7f37}" +
    "html.apple.apple .opt.correct .letter{background:#1a7f37;color:#fff;box-shadow:none}" +
    "html.apple.apple .opt.wrong{border-color:#d70015;background:#fdebed;animation:none}" +
    "html.apple.apple .opt.wrong .letter{background:#d70015;color:#fff}" +
    "html.apple.apple .pal-n.cur{box-shadow:inset 0 0 0 2px var(--green)}" +
    "html.apple.apple .map-chip.m-hi,html.apple.apple .mp.m-hi{background:#e6f4ea;border-color:#1a7f37;color:#1a7f37}" +
    "html.apple.apple .map-chip.m-mid,html.apple.apple .mp.m-mid{background:#fef6e0;border-color:#b7791f;color:#8a5f24}" +
    "html.apple.apple .map-chip.m-lo,html.apple.apple .mp.m-lo{background:#fdebed;border-color:#d70015;color:#d70015}" +
    "html.apple.apple .input,html.apple.apple select,html.apple.apple textarea{background:#fff;border:1px solid #d2d2d7;border-radius:12px}" +
    "html.apple.apple .input:focus,html.apple.apple select:focus,html.apple.apple textarea:focus{border-color:var(--green);box-shadow:0 0 0 4px rgba(0,113,227,.15);outline:none}" +
    "html.apple.apple .home-dock{background:rgba(118,118,128,.12);border:0;border-radius:980px;box-shadow:none;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);padding:3px;max-width:max-content;margin:14px auto}" +
    "html.apple.apple .hd-btn{background:transparent;border:0;border-radius:980px;color:#1d1d1f}" +
    "html.apple.apple .hd-btn.on{background:#fff;color:#1d1d1f;box-shadow:0 2px 8px rgba(0,0,0,.14)}" +
    "html.apple.apple .edu-launcher,html.apple.apple .arc-launcher{background:#fff;border:1px solid rgba(0,0,0,.08);color:#1d1d1f;box-shadow:0 8px 24px -12px rgba(0,0,0,.25)}" +
    "html.apple.apple #toast{background:rgba(29,29,31,.94);border:0;color:#f5f5f7;box-shadow:0 12px 32px rgba(0,0,0,.35)}" +
    "html.apple.apple #toast b{color:#fff}" +
    "html.apple.apple #backTop{background:#fff;color:var(--green);border:1px solid rgba(0,0,0,.08);box-shadow:0 8px 24px -8px rgba(0,0,0,.25)}" +
    "html.apple.apple #s3dRail .s3d-track{background:rgba(0,113,227,.14);box-shadow:inset 0 0 0 1px rgba(0,113,227,.25)}" +
    "html.apple.apple #s3dRail .s3d-fill{background:linear-gradient(0deg,#0058b6,#2997ff)}" +
    "html.apple.apple #s3dRail .s3d-lab{color:#0066cc;text-shadow:none}" +
    "html.apple.apple footer{background:#f5f5f7;border-top:1px solid #d2d2d7;margin:24px 0 0;padding:22px 16px 44px;font-size:12px;color:#6e6e73}" +
    "html.apple.apple footer b{color:#1d1d1f;font-weight:600}" +
    "html.apple.apple .endrule{display:none}" +
    "html.apple.apple .foot-links button{background:none;border:0;color:#424245;font-size:12px;font-weight:400;box-shadow:none}" +
    "html.apple.apple .foot-links button:hover{color:#1d1d1f;text-decoration:underline}" +
    "html.apple.apple .lm::after{content:' ›'}" +
    "html.apple.apple #gateOverlay{background:#f5f5f7;color:#1d1d1f}" +
    "html.apple.apple #gateOverlay::before{display:none}" +
    "html.apple.apple .gate-card{background:#fff;border:1px solid #e4e4e9;border-radius:18px;box-shadow:0 16px 48px -20px rgba(0,0,0,.2);color:#1d1d1f}" +
    "html.apple.apple .gate-brand,html.apple.apple .gate-welcome{color:#1d1d1f}" +
    "html.apple.apple .gate-note,html.apple.apple .gate-lock,html.apple.apple .gate-gsi,html.apple.apple .gate-card small{color:#6e6e73}" +
    "html.apple.apple .gate-cta{width:100%;margin-top:6px}" +
    "html.apple.apple table{border-color:#e5e5ea}" +
    "html.apple.apple th{color:#6e6e73}" +
    "html.apple.apple .rep-tbl th,html.apple.apple .rep-tbl td{border-color:#e9e9ee}" +
    "html.apple.apple .progress{background:#e8e8ed}" +
    "html.apple.apple .timer.low{background:#fdebed;color:#d70015}" +
    "html.apple.apple[data-theme='dark']:not(.st-acc-emerald):not(.st-acc-rose):not(.st-acc-sapphire):not(.st-acc-violet){--green:#2997ff;--green-2:#53a9ff;--green-d:#2997ff;--green-l:rgba(41,151,255,.16)}" +
    "html.apple.apple[data-theme='dark']{--bg:#000;--bg-2:#161617;--card:#1d1d1f;--card-solid:#1d1d1f;--card-border:rgba(255,255,255,.14);--ink:#f5f5f7;--ink-2:#a1a1a6;--mut:#86868b;--red:#ff6961;--red-l:rgba(255,69,58,.18);--chip-bg:#1d1d1f;--chip-border:rgba(255,255,255,.2);--opt-bg:#1d1d1f;--opt-border:rgba(255,255,255,.2);--opt-hover:rgba(41,151,255,.12);--bar-track:#2c2c2e;--panel:#161617;--shadow:0 8px 28px -12px rgba(0,0,0,.7);--shadow-sm:0 4px 14px -6px rgba(0,0,0,.6)}" +
    "html.apple.apple[data-theme='dark'] .card,html.apple.apple[data-theme='dark'] .ai-card,html.apple.apple[data-theme='dark'] .hq-sec,html.apple.apple[data-theme='dark'] .modal{background-color:#1d1d1f;background-image:linear-gradient(180deg,#1d1d1f,#19191b);border-color:rgba(255,255,255,.14)}" +
    "html.apple.apple[data-theme='dark'] .chip,html.apple.apple[data-theme='dark'] .tab,html.apple.apple[data-theme='dark'] .count,html.apple.apple[data-theme='dark'] .opt,html.apple.apple[data-theme='dark'] .s3-opt{background:#1d1d1f;border-color:rgba(255,255,255,.2)}" +
    "html.apple.apple[data-theme='dark'] .input,html.apple.apple[data-theme='dark'] select,html.apple.apple[data-theme='dark'] textarea{background:#1d1d1f;border-color:rgba(255,255,255,.2);color:#f5f5f7}" +
    "html.apple.apple[data-theme='dark'] #appleNav{background:rgba(22,22,23,.72);border-color:rgba(255,255,255,.12)}" +
    "html.apple.apple[data-theme='dark'] #appleNav a{color:#f5f5f7}" +
    "html.apple.apple[data-theme='dark'] footer{background:#161617;border-color:rgba(255,255,255,.12)}" +
    "html.apple.apple[data-theme='dark'] footer b{color:#f5f5f7}" +
    "html.apple.apple[data-theme='dark'] .foot-links button{color:#a1a1a6}" +
    "html.apple.apple[data-theme='dark'] #gateOverlay{background:#000}" +
    "html.apple.apple[data-theme='dark'] .gate-card{background:#1d1d1f;border-color:rgba(255,255,255,.14);color:#f5f5f7}" +
    "html.apple.apple[data-theme='dark'] .gate-brand,html.apple.apple[data-theme='dark'] .gate-welcome{color:#f5f5f7}" +
    "html.apple.apple[data-theme='dark'] .btn-ghost{background:#1d1d1f;border-color:rgba(255,255,255,.2);color:var(--green)}" +
    "html.apple.apple[data-theme='dark'] .home-dock{background:rgba(118,118,128,.24)}" +
    "html.apple.apple[data-theme='dark'] .hd-btn{color:#f5f5f7}" +
    "html.apple.apple[data-theme='dark'] .hd-btn.on{background:#2c2c2e;color:#fff}" +
    "html.apple.apple[data-theme='dark'] .opt .letter{background:#2c2c2e;color:#f5f5f7}" +
    "html.apple.apple[data-theme='dark'] .edu-launcher,html.apple.apple[data-theme='dark'] .arc-launcher{background:#1d1d1f;border-color:rgba(255,255,255,.14);color:#f5f5f7}" +
    "html.apple.apple body::after,html.apple.apple .hero-badge::before,html.apple.apple .hero h1::after,html.apple.apple .flourish::before,html.apple.apple .flourish::after,html.apple.apple .hero-net::before,html.apple.apple .hero-net::after{display:none!important}" +
    "html.apple.apple .hero-chip .gr{color:inherit}" +
    "html.apple.apple #examChip{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}" +
    "html.apple.apple .ex-tile{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:14px;color:#f5f5f7;box-shadow:none}" +
    "html.apple.apple .ex-tile small{color:#a1a1a6}" +
    "html.apple.apple .ex-tile b,html.apple.apple .ex-tile strong{color:#fff}" +
    "html.apple.apple .luxe-frame{display:none!important}" +
    "html.apple.apple #gateOverlay .gate-brand h1{color:#1d1d1f}" +
    "html.apple.apple input:focus-visible,html.apple.apple select:focus-visible,html.apple.apple textarea:focus-visible{outline-color:var(--green)}" +
    "html.apple.apple .explain{background:#f5f5f7;border-left:5px solid var(--green)}" +
    "html.apple.apple .explain b.ok-c,html.apple.apple .o-ok,html.apple.apple .spell-fb.ok{color:#1a7f37}" +
    "html.apple.apple h2.step{color:#1d1d1f}" +
    "html.apple.apple[data-theme='dark'] #gateOverlay .gate-brand h1{color:#f5f5f7}" +
    "html.apple.apple[data-theme='dark'] .explain{background:rgba(255,255,255,.06);border-left-color:var(--green)}" +
    "html.apple.apple[data-theme='dark'] .explain b.ok-c,html.apple.apple[data-theme='dark'] .o-ok,html.apple.apple[data-theme='dark'] .spell-fb.ok{color:#30d158}" +
    "html.apple.apple[data-theme='dark'] h2.step{color:#f5f5f7}" +
    "html.apple.apple h2.step::before{content:\"❖\"}" +
    "html.apple.apple[data-theme='dark'] .hero-chip{color:#f5f5f7}" +
    "html.apple.apple footer::before{display:none}" +
    "html.apple.apple[data-theme='dark'] .m-hi,html.apple.apple[data-theme='dark'] .map-chip.m-hi,html.apple.apple[data-theme='dark'] .mp.m-hi{background:rgba(48,209,88,.14);border-color:rgba(48,209,88,.55);color:#30d158}" +
    "html.apple.apple[data-theme='dark'] .m-mid,html.apple.apple[data-theme='dark'] .map-chip.m-mid,html.apple.apple[data-theme='dark'] .mp.m-mid{background:rgba(255,214,10,.12);border-color:rgba(255,214,10,.5);color:#ffd60a}" +
    "html.apple.apple[data-theme='dark'] .m-lo,html.apple.apple[data-theme='dark'] .map-chip.m-lo,html.apple.apple[data-theme='dark'] .mp.m-lo{background:rgba(255,69,58,.14);border-color:rgba(255,69,58,.55);color:#ff6961}" +
    "html.apple.apple h2,html.apple.apple h3,html.apple.apple h4,html.apple.apple .opt,html.apple.apple .qtext,html.apple.apple .review .rq,html.apple.apple .review .rex,html.apple.apple .qmedal,html.apple.apple .mascot .m-bubble,html.apple.apple .explain,html.apple.apple .rep-card,html.apple.apple .grade,html.apple.apple .tab .cls,html.apple.apple .cert-ribbon,html.apple.apple .card h3,html.apple.apple .modal h3,html.apple.apple #curtain .ct-name{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','SF Pro Display','Helvetica Neue',Helvetica,Arial,sans-serif}" +
    "html.apple.apple .hq-sec h4,html.apple.apple .edu-sec h4,html.apple.apple .rep-sec h4,html.apple.apple .ps-notes h3,html.apple.apple .cert-ribbon{color:#6e6e73}" +
    "html.apple.apple .rep-sec h4{border-color:#e5e5ea}" +
    "html.apple.apple .ps-notes h3{border-color:#d2d2d7}" +
    "html.apple.apple .rep-head{border-color:#d2d2d7}" +
    "html.apple.apple .arc-tab.on,html.apple.apple .arc-chip.on,html.apple.apple .edu-chip.on,html.apple.apple .nt-tab.on,html.apple.apple .nt-chip.on{background:var(--green);border-color:var(--green);color:#fff;box-shadow:none}" +
    "html.apple.apple .arc-head h3,html.apple.apple .nt-pp{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','SF Pro Display','Helvetica Neue',Helvetica,Arial,sans-serif}" +
    "html.apple.apple ::selection{background:#0071e3;color:#fff}" +
    "html.apple.apple ::-webkit-scrollbar-thumb{background:#c7c7cc;border:2px solid transparent;background-clip:padding-box;border-radius:99px}" +
    "html.apple.apple .btn:active,html.apple.apple .opt:active,html.apple.apple .chip:active{transform:scale(.97)}" +
    "html.apple.apple .card:hover,html.apple.apple .ai-card:hover{box-shadow:0 8px 32px -12px rgba(0,0,0,.18)}" +
    "html.apple.apple #appleCtas{display:flex;gap:20px;align-items:center;justify-content:center;margin-top:28px;flex-wrap:wrap}" +
    "html.apple.apple #appleCtas .ac-go{background:#0071e3;color:#fff;border:0;border-radius:980px;padding:12px 30px;font-size:17px;font-weight:600;cursor:pointer;font-family:inherit}" +
    "html.apple.apple #appleCtas .ac-go:hover{background:#0077ed}" +
    "html.apple.apple #appleCtas .ac-more{color:#2997ff;font-size:19px;text-decoration:none;white-space:nowrap}" +
    "html.apple.apple #appleCtas .ac-more:hover{text-decoration:underline}" +
    "html.apple.apple #appleCtas .ac-more::after{content:' ›'}" +
    "html.apple.apple #applePromo{background:#fff;border-bottom:1px solid #e5e5ea;color:#1d1d1f;font-size:13px;text-align:center;padding:12px 16px}" +
    "html.apple.apple #applePromo b{font-weight:700}" +
    "html.apple.apple #applePromo a{color:#0066cc;text-decoration:none;white-space:nowrap;margin-left:10px}" +
    "html.apple.apple #applePromo a:hover{text-decoration:underline}" +
    "html.apple.apple #applePromo a::after{content:' ›'}" +
    "html.apple.apple[data-theme='dark'] #applePromo{background:#161617;border-color:rgba(255,255,255,.12);color:#f5f5f7}" +
    "html.apple.apple .rep-doc,html.apple.apple .rep-stat small,html.apple.apple .rep-note{color:#6e6e73}" +
    "html.apple.apple .rep-card{background:#fff;border-color:#e4e4e9}" +
    "html.apple.apple .rep-stat{border-color:#e4e4e9}" +
    "html.apple.apple .edu-sel{border-color:#d2d2d7;background:#fff}" +
    "html.apple.apple .edu-q{border-left-color:rgba(0,113,227,.45)}" +
    "html.apple.apple .edu-pill{background:rgba(0,113,227,.08);border-color:rgba(0,113,227,.3)}" +
    "html.apple.apple .edu-head{background:#fff;border-color:#e5e5ea}" +
    "html.apple.apple[data-theme='dark'] .edu-sel{background:#1d1d1f;border-color:rgba(255,255,255,.2)}" +
    "html.apple.apple[data-theme='dark'] .edu-head{background:transparent;border-color:rgba(255,255,255,.12)}" +
    "html.apple.apple[data-theme='dark'] .rep-card{background:#1d1d1f;border-color:rgba(255,255,255,.14)}" +
    "html.apple.apple[data-theme='dark'] .rep-stat{border-color:rgba(255,255,255,.14)}" +
    "html.apple.apple.rmotion *,html.apple.apple.rmotion *::before,html.apple.apple.rmotion *::after{transition:none!important}";

  function appleNav() {
    try {
      if (document.getElementById("appleNav")) return;
      var nav = document.createElement("nav");
      nav.id = "appleNav";
      nav.setAttribute("aria-label", "Site");
      var dock = function (k) { return "try{document.querySelector('[data-hd=\"" + k + "\"]').click()}catch(e){}return false"; };
      nav.innerHTML =
        '<div class="an-in">' +
        '<a class="an-brand" href="#" onclick="try{window.scrollTo(0,0)}catch(e){}return false" aria-label="Back to top">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5.4 C9.8 4.2 6.8 4 4.5 4.8 V18.4 C6.8 17.6 9.8 17.8 12 19 C14.2 17.8 17.2 17.6 19.5 18.4 V4.8 C17.2 4 14.2 4.2 12 5.4 Z"/><path d="M12 5.4 V19"/></svg>Study</a>' +
        '<a href="#" onclick="' + dock("practice") + '">Practice</a>' +
        '<a href="#" onclick="' + dock("coach") + '">AI Coach</a>' +
        '<a href="#" onclick="' + dock("lab") + '">Study Hall</a>' +
        '<a href="#" onclick="' + dock("hq") + '">HQ</a>' +
        '<a class="an-opt" href="#" onclick="try{arc(\'open\')}catch(e){}return false">Arcade</a>' +
        '<a class="an-opt" href="#" onclick="try{notes()}catch(e){}return false">Notes</a>' +
        '<a class="an-opt" href="#" onclick="try{edu(\'open\')}catch(e){}return false">Teaching</a>' +
        '<a href="#" id="appleAcct" onclick="try{openAccount()}catch(e){}return false">Sign in</a>' +
        "</div>";
      document.body.insertBefore(nav, document.body.firstChild);
      var sync = function () {
        try {
          var a = document.getElementById("appleAcct");
          var n = document.getElementById("acctName");
          if (a && n && n.textContent && n.textContent.trim() && n.textContent.trim() !== "Sign in") a.textContent = n.textContent.trim().split(" ")[0];
        } catch (e) {}
      };
      setTimeout(sync, 2500);
      setTimeout(sync, 8000);
    } catch (e) {}
  }

  function appleCtas() {
    try {
      if (document.getElementById("appleCtas")) return;
      var tag = document.querySelector(".hero p.tag");
      if (!tag || !tag.parentNode) return;
      var d = document.createElement("div");
      d.id = "appleCtas";
      d.innerHTML = '<button type="button" class="ac-go">Start practicing</button><a href="#" class="ac-more">Explore the Study Hall</a>';
      if (d.children[0]) d.children[0].addEventListener("click", function () { try { document.querySelector('[data-hd="practice"]').click(); } catch (e) {} });
      if (d.children[1]) d.children[1].addEventListener("click", function (e) { try { e.preventDefault(); } catch (x) {} try { document.querySelector('[data-hd="lab"]').click(); } catch (x) {} });
      tag.parentNode.insertBefore(d, tag.nextSibling);
    } catch (e) {}
  }

  function applePromo() {
    try {
      if (document.getElementById("applePromo")) return;
      var hero = document.querySelector("header.hero");
      if (!hero || !hero.parentNode) return;
      var d = document.createElement("div");
      d.id = "applePromo";
      d.innerHTML = "<span>Exam-Room Labs — Records Hall, Exam Planner, Recall Blitz, Quiz Me.</span><a href=\"#\">Open the Study Hall</a>";
      var a = d.querySelector("a");
      if (a) a.addEventListener("click", function (e) { try { e.preventDefault(); } catch (x) {} try { document.querySelector('[data-hd="lab"]').click(); } catch (x) {} });
      hero.parentNode.insertBefore(d, hero);
    } catch (e) {}
  }

  function appleTheme() {
    try {
      if (!document.getElementById("appleCss")) {
        var st = document.createElement("style");
        st.id = "appleCss";
        st.textContent = APPLECSS;
        document.head.appendChild(st);
      }
      if (!document.documentElement.classList.contains("apple")) {
        document.documentElement.classList.add("apple");
      }
      appleNav();
      appleCtas();
      applePromo();
    } catch (e) {}
  }

  function apply() {
    try {
      if (!document.getElementById("polishCss")) {
        var st = document.createElement("style");
        st.id = "polishCss";
        st.textContent = CSS;
        document.head.appendChild(st);
      }
      if (!document.documentElement.classList.contains("polished")) {
        document.documentElement.classList.add("polished");
      }
      appleTheme();
      heroLayer();
      heroChip();
      backTop();
      reveal();
      spotlight();
      countUp();
      hourAmb();
      dockFix();
      navShadow();
      findBtn();
      scroll3d();
      setTimeout(function () { try { countUp(); } catch (e) {} }, 1400);
    try { toastBar(); } catch (e) {}
    } catch (e) { /* decorative only — never break the app */ }
  }

  /* v28 — cursor spotlight (fine pointers, honours reduced motion) */
  function spotlight() {
    try {
      if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      document.addEventListener("pointermove", function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var el = t.closest(".stat,.lib-item,.notes-card");
        if (!el) return;
        var r = el.getBoundingClientRect();
        if (!r.width) return;
        el.style.setProperty("--px", (e.clientX - r.left) + "px");
        el.style.setProperty("--py", (e.clientY - r.top) + "px");
      }, { passive: true });
    } catch (e) {}
  }

  /* v28 — count-up for hero stat numerals */
  function countUp() {
    try {
      if (!("requestAnimationFrame" in window)) return;
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      var els = document.querySelectorAll(".stat b");
      if (!els.length) return;
      Array.prototype.forEach.call(els, function (el) {
        if (el.getAttribute("data-cn")) return;
        var txt = (el.textContent || "").trim();
        var m = txt.match(/^([\d,]+)(.*)$/);
        if (!m) return;
        var target = parseFloat(m[1].replace(/,/g, ""));
        var suf = m[2] || "";
        if (!isFinite(target) || target > 1e7) return;
        el.setAttribute("data-cn", "1");
        var t0 = 0, DUR = 800;
        function step(ts) {
          if (!t0) t0 = ts;
          var k = Math.min(1, (ts - t0) / DUR);
          k = 1 - Math.pow(1 - k, 3);
          el.textContent = Math.round(target * k).toLocaleString("en") + suf;
          if (k < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    } catch (e) {}
  }

  /* v28 — home dock repair: the shell never invokes its own scroll/click
     binder (checked live: AI.bound stays false), so the dock stays hidden
     and its buttons are dead. This is an additive, idempotent controller. */
  function dockFix() {
    try {
      var d = document.getElementById("homeDock");
      if (!d || window.__dockFix) return;
      window.__dockFix = 1;
      var onScroll = function () {
        var y = window.scrollY || document.documentElement.scrollTop || 0;
        d.classList.toggle("show", y > 240);
        var at = function (id) { var el = document.getElementById(id); return el ? el.getBoundingClientRect().top : 1e9; };
        var n = "home";
        if (at("aiCoach") < 170) n = "coach";
        if (at("step-class") < 150) n = "practice";
        if (at("labGrid") < 150) n = "lab";
        Array.prototype.forEach.call(d.querySelectorAll(".hd-btn"), function (b) {
          b.classList.toggle("on", b.getAttribute("data-hd") === n);
        });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      if (!d.dataset.pfNav) {
        d.dataset.pfNav = "1";
        Array.prototype.forEach.call(d.querySelectorAll(".hd-btn"), function (b) {
          var hd = b.getAttribute("data-hd");
          if (!hd) return;
          b.addEventListener("click", function () {
            if (hd === "hq") { if (typeof openHQ === "function") openHQ(); return; }
            var s = null;
            if (hd === "coach") s = document.getElementById("aiCoach");
            else if (hd === "practice") s = document.getElementById("step-class");
            else if (hd === "lab") s = document.getElementById("labGrid");
            var n2 = hd === "home" ? 0 : (s ? Math.max(0, s.getBoundingClientRect().top + (window.scrollY || document.documentElement.scrollTop || 0) - 84) : 0);
            try { window.scrollTo({ top: n2, behavior: "smooth" }); } catch (e) { window.scrollTo(0, n2); }
          });
        });
      }
    } catch (e) {}
  }

  /* v28 — time-of-day ambience on the hero glow */
  function hourAmb() {
    try {
      var h = new Date().getHours();
      var k = h >= 5 && h < 12 ? "hour-m" : h >= 12 && h < 17 ? "hour-a" : h >= 17 && h < 21 ? "hour-e" : "hour-n";
      document.documentElement.setAttribute("data-aura-hour", k);
    } catch (e) {}
  }

  /* v37 — visible Find button in the nav (opens the Ctrl+K palette).
     If Pro Tools have not idle-loaded yet, fetch them on demand. */
  function findOpen() {
    try {
      if (typeof window.__palOpen === "function") { window.__palOpen(); return; }
      if (!document.getElementById("proScript") && !window.__pro) {
        var s = document.createElement("script");
        s.id = "proScript"; s.src = "quiz/pro.js"; s.async = !0;
        document.head.appendChild(s);
      }
      if (typeof toast === "function") { try { toast("Search is loading\u2026", "\uD83D\uDD0E"); } catch (e) {} }
      var n = 0;
      var iv = setInterval(function () {
        n++;
        try { if (typeof window.__palOpen === "function") { clearInterval(iv); window.__palOpen(); } } catch (e) {}
        if (n > 40) clearInterval(iv);
      }, 150);
    } catch (e) {}
  }
  function findBtn() {
    try {
      if (document.getElementById("findBtn")) return;
      var nav = document.querySelector(".nav");
      if (!nav) return;
      var b = document.createElement("button");
      b.id = "findBtn";
      b.type = "button";
      b.className = "icon-btn";
      b.title = "Find anything (Ctrl+K)";
      b.setAttribute("aria-label", "Find anything");
      b.textContent = "\uD83D\uDD0E";
      b.addEventListener("click", findOpen);
      var first = nav.querySelector(".icon-btn");
      if (first) nav.insertBefore(b, first);
      else nav.appendChild(b);
      try { window.__findOpen = findOpen; } catch (e) {}
    } catch (e) {}
  }

  /* v36 — shadow under the nav once the page scrolls */
  function navShadow() {
    try {
      if (window.__pfNav) return;
      window.__pfNav = 1;
      var onScroll = function () {
        var y = window.scrollY || document.documentElement.scrollTop || 0;
        document.documentElement.classList.toggle("pf-scrolled", y > 8);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    } catch (e) {}
  }

  function heroLayer() {
    var hero = document.querySelector(".hero");
    if (hero && !document.getElementById("polishFx")) {
      var fx = document.createElement("div");
      fx.id = "polishFx";
      fx.setAttribute("aria-hidden", "true");
      fx.innerHTML = '<i class="pf-halo"></i><i class="pf-s1"></i><i class="pf-s2"></i><i class="pf-s3"></i><i class="pf-s4"></i><i class="pf-s5"></i><i class="pf-s6"></i><i class="pf-s7"></i><i class="pf-s8"></i><i class="pf-s9"></i><i class="pf-s10"></i>';
      hero.insertBefore(fx, hero.firstChild);
    }
  }

  function heroChip() {
    var hero = document.querySelector(".hero-badge");
    if (!hero || document.getElementById("heroChip")) return;
    var chip = document.createElement("div");
    chip.id = "heroChip";
    chip.className = "hero-chip";
    chip.setAttribute("aria-hidden", "true");
    var d = new Date();
    var m = d.getMonth() + 1;
    var term = m >= 9 ? "First Term" : (m <= 4 ? "Second Term" : (m <= 7 ? "Third Term" : "In Vacation"));
    var dateTxt = d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    var streak = "";
    try { if (typeof streakDays === "function") { var s = streakDays(); if (s > 0) streak = ' · <b>🔥 ' + s + '-day streak</b>'; } } catch (e) {}
    chip.innerHTML = '<span class="hr-dot"></span> ' + dateTxt + " · " + term + streak;
    hero.parentNode.insertBefore(chip, hero.nextSibling);
  }

  /* v32 — gold countdown bar + restart hook for the toast pill */
  function toastBar() {
    var t = document.getElementById("toast");
    if (!t || window.__pfToast) return;
    window.__pfToast = 1;
    var bar = function () {
      var b = document.getElementById("pfToastBar");
      if (!b || !b.isConnected) {
        b = document.createElement("i");
        b.id = "pfToastBar";
        t.appendChild(b);
      }
      b.style.animation = "none";
      void b.offsetWidth;
      b.style.animation = "";
    };
    bar();
    try {
      new MutationObserver(function () {
        if (t.classList.contains("show")) bar();
      }).observe(t, { attributes: true, attributeFilter: ["class"] });
    } catch (e) {}
  }

  function backTop() {
    if (document.getElementById("backTop")) return;
    var b = document.createElement("button");
    b.id = "backTop";
    b.className = "back-top";
    b.type = "button";
    b.title = "Back to top";
    b.setAttribute("aria-label", "Back to top");
    b.innerHTML = "\u2191";
    b.addEventListener("click", function () {
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); }
    });
    document.body.appendChild(b);
    var onScroll = function () {
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      if (y > 480) b.classList.add("show"); else b.classList.remove("show");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function reveal() {
    if (!("IntersectionObserver" in window)) return;
    var rm = false;
    try { rm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    if (rm) return;
    var els = document.querySelectorAll(".card,.stat,.ai-it,.lab-tile,.sv-tile,.g-tile,.lib-item,.edu-sec,.hq-chip");
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add("rv-in");
        io.unobserve(el);
        setTimeout(function () {
          el.classList.remove("rv", "rv-in");
          el.style.transitionDelay = "";
        }, 900);
      });
    }, { threshold: 0.06, rootMargin: "0px 0px -36px 0px" });
    Array.prototype.forEach.call(els, function (el, i) {
      el.classList.add("rv");
      el.style.transitionDelay = ((i % 6) * 55) + "ms";
      io.observe(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
  /* v27 — load the Pro Tools module (command palette, exam countdowns, zen
     focus, heatmap) at idle so it never competes with boot. */
  try {
    var pr = function () {
      if (window.__pro || document.getElementById("proScript")) return;
      var s2 = document.createElement("script");
      s2.id = "proScript";
      s2.src = "quiz/pro.js";
      s2.async = !0;
      s2.onerror = function () { try { s2.remove(); } catch (e) {} };
      document.head.appendChild(s2);
    };
    if ("requestIdleCallback" in window) { window.requestIdleCallback(pr, { timeout: 4000 }); }
    else { setTimeout(pr, 1400); }
  } catch (e) {}
  /* v29 — load the Pro Boost module (Math Sprint, Soundscapes, 3D tilt,
     gold aura rings) at idle too, so it never competes with boot. */
  try {
    var br = function () {
      if (window.__boost || document.getElementById("boostScript")) return;
      var s4 = document.createElement("script");
      s4.id = "boostScript";
      s4.src = "quiz/boost.js";
      s4.async = !0;
      s4.onerror = function () { try { s4.remove(); } catch (e) {} };
      document.head.appendChild(s4);
    };
    if ("requestIdleCallback" in window) { window.requestIdleCallback(br, { timeout: 5000 }); }
    else { setTimeout(br, 1700); }
  } catch (e) {}
  /* v30 — load the Scholar Toolkit (periodic table, formula vault, scroll
     progress, motion) at idle too, so it never competes with boot. */
  try {
    var tr = function () {
      if (window.__tk || document.getElementById("tkScript")) return;
      var s5 = document.createElement("script");
      s5.id = "tkScript";
      s5.src = "quiz/toolkit.js";
      s5.async = !0;
      s5.onerror = function () { try { s5.remove(); } catch (e) {} };
      document.head.appendChild(s5);
    };
    if ("requestIdleCallback" in window) { window.requestIdleCallback(tr, { timeout: 6000 }); }
    else { setTimeout(tr, 2000); }
  } catch (e) {}
  /* v31 — load the Study Studio module (mind map, converter, theme studio,
     daily spark, comets) at idle too, so it never competes with boot. */
  try {
    var sr = function () {
      if (window.__st || document.getElementById("stScript")) return;
      var s6 = document.createElement("script");
      s6.id = "stScript";
      s6.src = "quiz/studio.js";
      s6.async = !0;
      s6.onerror = function () { try { s6.remove(); } catch (e) {} };
      document.head.appendChild(s6);
    };
    if ("requestIdleCallback" in window) { window.requestIdleCallback(sr, { timeout: 7000 }); }
    else { setTimeout(sr, 2300); }
  } catch (e) {}
  /* v33 — load the Holo 3D Lab (molecule viewer, surface plotter, orbits) at
     idle too, so it never competes with boot. */
  try {
    var hr = function () {
      if (window.__holo || document.getElementById("holoScript")) return;
      var s7 = document.createElement("script");
      s7.id = "holoScript";
      s7.src = "quiz/holo.js";
      s7.async = !0;
      s7.onerror = function () { try { s7.remove(); } catch (e) {} };
      document.head.appendChild(s7);
    };
    if ("requestIdleCallback" in window) { window.requestIdleCallback(hr, { timeout: 8000 }); }
    else { setTimeout(hr, 2600); }
  } catch (e) {}
  /* v34 — load the Scientific Calculator + AI Study Tutor at idle too, so
     they never compete with boot. */
  try {
    var cr = function () {
      if (window.__calc || document.getElementById("calcScript")) return;
      var s8 = document.createElement("script");
      s8.id = "calcScript";
      s8.src = "quiz/calc.js";
      s8.async = !0;
      s8.onerror = function () { try { s8.remove(); } catch (e) {} };
      document.head.appendChild(s8);
    };
    var ar = function () {
      if (window.__ai || document.getElementById("aiScript")) return;
      var s9 = document.createElement("script");
      s9.id = "aiScript";
      s9.src = "quiz/ai.js";
      s9.async = !0;
      s9.onerror = function () { try { s9.remove(); } catch (e) {} };
      document.head.appendChild(s9);
    };
    var qr = function () {
      if (window.__curicApi || document.getElementById("curicScript")) return;
      var s0 = document.createElement("script");
      s0.id = "curicScript";
      s0.src = "quiz/curriculum.js";
      s0.async = !0;
      s0.onerror = function () { try { s0.remove(); } catch (e) {} };
      document.head.appendChild(s0);
    };
    if ("requestIdleCallback" in window) { window.requestIdleCallback(cr, { timeout: 9000 }); window.requestIdleCallback(ar, { timeout: 9500 }); window.requestIdleCallback(qr, { timeout: 10000 }); }
    else { setTimeout(cr, 2900); setTimeout(ar, 3200); setTimeout(qr, 3600); }
  } catch (e) {}
  /* v36 — load the Curriculum Atlas (subject/topic explorer + drills) at
     idle too, so it never competes with boot. */
  try {
    var lr = function () {
      if (window.__atlas || document.getElementById("atlasScript")) return;
      var sL = document.createElement("script");
      sL.id = "atlasScript";
      sL.src = "quiz/atlas.js";
      sL.async = !0;
      sL.onerror = function () { try { sL.remove(); } catch (e) {} };
      document.head.appendChild(sL);
    };
    if ("requestIdleCallback" in window) { window.requestIdleCallback(lr, { timeout: 10500 }); }
    else { setTimeout(lr, 3900); }
  } catch (e) {}
  /* v37 — load the AI Explainer Reels (auto-generated video lessons for
     every subject x class) at idle too, so it never competes with boot. */
  try {
    var rr = function () {
      if (window.__reels || document.getElementById("reelsScript")) return;
      var sR = document.createElement("script");
      sR.id = "reelsScript";
      sR.src = "quiz/reels.js";
      sR.async = !0;
      sR.onerror = function () { try { sR.remove(); } catch (e) {} };
      document.head.appendChild(sR);
    };
    if ("requestIdleCallback" in window) { window.requestIdleCallback(rr, { timeout: 11000 }); }
    else { setTimeout(rr, 4200); }
  } catch (e) {}
})();
