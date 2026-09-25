/* =====================================================================
   MAMSS PREP v47 — WORLD-FIRST STUDIO (exclusive.js)
   Two features that, to the best of our prior-art search, no other study
   website ships:

   1. ORAL EXAMINER  — the app speaks WAEC-style oral questions with the
      device's own voice, listens through the microphone (Web Speech API),
      and marks the spoken answer against the topic's mark points:
      coverage %, speaking pace, filler words. Typed fallback when a
      browser has no speech recognition (or a classroom has no mic).

   2. MEMORY PALACE  — the method of loci, automated: any topic is turned
      into a guided walk through the student's own school (gate → corridor
      → classroom → lab → library → chapel → field → staff room), each
      room holding one mark point as a vivid image; the walk ends in a
      recall test scored per room.

   Everything runs client-side, offline-tolerant, and logs to localStorage
   only. Loaded lazily by upgrade.js when the studio is first opened.
   ===================================================================== */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var st = (typeof store !== "undefined") ? store : {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var T = (typeof toast === "function") ? toast : function () {};

  /* ------------------------------------------------ shared scoring -- */
  var STOP = ("the a an and or of in on to for with is are was were be been being it its as at by from that this these those " +
    "you your we our they their he she his her not no yes do does did done have has had will would can could should may might " +
    "than then so such into onto over under about after before between during each every all any some more most other others").split(" ");
  function contentWords(t) {
    return String(t || "").toLowerCase().replace(/[^a-z0-9\s±√²³-]/g, " ").split(/\s+/)
      .filter(function (w) { return w.length > 3 && STOP.indexOf(w) === -1; });
  }
  function coverage(answer, point) {
    var need = contentWords(point);
    var relaxed = !need.length;
    if (relaxed) {
      /* formula-style point ("x = (-b ± √(b²-4ac))/2a"): match on short tokens */
      need = String(point || "").toLowerCase().replace(/[^a-z0-9\s±√²³-]/g, " ").split(/\s+/)
        .filter(function (w) { return w.length > 1 && STOP.indexOf(w) === -1; });
      if (!need.length) {
        var na = String(answer || "").toLowerCase().replace(/\s+/g, "");
        var np = String(point || "").toLowerCase().replace(/\s+/g, "");
        return { pct: np && na === np ? 100 : 0, missed: [] };
      }
    }
    var aw = (relaxed
      ? String(answer || "").toLowerCase().replace(/[^a-z0-9\s±√²³-]/g, " ").split(/\s+/).filter(function (w) { return w.length > 1; })
      : contentWords(answer)).map(function (w) { return w.slice(0, 6); });
    var hit = 0, missed = [];
    need.forEach(function (w) {
      var k = w.slice(0, 6);
      if (aw.indexOf(k) > -1) hit++; else missed.push(w);
    });
    return { pct: Math.round(100 * hit / need.length), missed: missed.slice(0, 6) };
  }
  function pointsOf(subject, topic) {
    try {
      var bank = (typeof RNOTES !== "undefined") ? RNOTES : null;
      if (!bank || !bank[subject] || !bank[subject][topic]) return [];
      return String(bank[subject][topic]).split(/(?<=[.!?])\s+/).filter(function (s) { return s.length > 12; }).slice(0, 8);
    } catch (e) { return []; }
  }
  function topicsList() {
    var out = [];
    try {
      var bank = (typeof RNOTES !== "undefined") ? RNOTES : {};
      Object.keys(bank).forEach(function (s) { Object.keys(bank[s]).forEach(function (t) { out.push([s, t]); }); });
    } catch (e) {}
    return out;
  }

  /* ------------------------------------------------------- speech -- */
  function speak(text, onend) {
    try {
      if (!("speechSynthesis" in window)) { onend && onend(); return; }
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 0.98; u.onend = function () { onend && onend(); }; u.onerror = function () { onend && onend(); };
      window.speechSynthesis.speak(u);
    } catch (e) { onend && onend(); }
  }
  function recogniser() {
    var R = window.SpeechRecognition || window.webkitSpeechRecognition;
    return R ? new R() : null;
  }

  /* ---------------------------------------------- overlay skeleton -- */
  function overlay(id, title, sub) {
    var o = $(id);
    if (o) return o;
    o = document.createElement("div");
    o.id = id; o.className = "overlay hidden mp-exclusive";
    o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-label", title);
    o.innerHTML = '<div class="modal mp-ex-modal" style="position:relative;max-width:640px;width:94%;max-height:92vh;overflow:auto">' +
      '<button class="icon-btn x" type="button" data-mpclose="' + id + '" style="position:absolute;top:10px;right:10px" aria-label="Close">✕</button>' +
      '<h3 style="margin:0 34px 2px 0">' + title + '</h3>' +
      '<p class="mp-ex-sub">' + sub + '</p>' +
      '<div id="' + id + 'Body"></div></div>';
    o.addEventListener("click", function (e) {
      if (e.target === o || (e.target.dataset && e.target.dataset.mpclose)) o.classList.add("hidden");
    });
    document.body.appendChild(o);
    return o;
  }
  function pickers(bodyId, onpick, label, preset) {
    var list = topicsList();
    var b = $(bodyId);
    if (!b || !list.length) { if (b) b.innerHTML = '<p>No notes library on this device.</p>'; return; }
    var subs = [];
    list.forEach(function (p) { if (subs.indexOf(p[0]) === -1) subs.push(p[0]); });
    b.innerHTML =
      '<label class="mp-ex-lab">' + label + '</label>' +
      '<select id="' + bodyId + 'Sub" class="input">' + subs.map(function (s) { return '<option>' + s + '</option>'; }).join("") + '</select>' +
      '<select id="' + bodyId + 'Top" class="input" style="margin-top:8px"></select>' +
      '<div id="' + bodyId + 'Go" style="margin-top:12px"></div>';
    var fill = function () {
      var s = $(bodyId + "Sub").value;
      $(bodyId + "Top").innerHTML = list.filter(function (p) { return p[0] === s; })
        .map(function (p) { return '<option>' + p[1] + '</option>'; }).join("");
    };
    $(bodyId + "Sub").addEventListener("change", fill); fill();
    if (preset && preset[0]) {
      $(bodyId + "Sub").value = preset[0]; fill();
      if (preset[1]) $(bodyId + "Top").value = preset[1];
    }
    onpick(b);
  }

  /* ============================================= 1. ORAL EXAMINER == */
  var oral = { s: null, t: null, rounds: [], i: 0, scores: [], rec: null, t0: 0, words: 0 };
  function openMpOral(preset) {
    var o = overlay("mpOralOverlay", "🎤 Oral Examiner",
      "World-first: the app asks your oral questions aloud, listens, and marks your spoken answer against the mark points. Headphones recommended.");
    o.classList.remove("hidden");
    pickers("mpOralOverlayBody", function () {
      $("mpOralOverlayBodyGo").innerHTML = '<button class="btn btn-primary" id="mpOralStart" type="button">Begin the oral round</button>' +
        '<p class="mp-ex-note">3 questions per round · microphone optional (typed answers accepted) · everything stays on this device.</p>';
      $("mpOralStart").onclick = startOral;
    }, "Choose a subject and topic for the oral", preset);
  }
  function oralQuestion(point) {
    /* blank the longest content word: "state what ____ is/does" */
    var ws = contentWords(point);
    if (!ws.length) return { q: "Explain: " + point, point: point };
    var key = ws.sort(function (a, b) { return b.length - a.length; })[0];
    var q = point.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "＿＿＿");
    return { q: "Complete and explain: “" + q + "”", point: point };
  }
  function startOral() {
    oral.s = $("mpOralOverlayBodySub").value; oral.t = $("mpOralOverlayBodyTop").value;
    var pts = pointsOf(oral.s, oral.t);
    if (pts.length < 2) { T("Not enough mark points for that topic yet", "⚠️"); return; }
    oral.rounds = pts.slice(0, 3).map(oralQuestion);
    oral.i = 0; oral.scores = [];
    nextOral();
  }
  function nextOral() {
    if (oral.i >= oral.rounds.length) return endOral();
    var r = oral.rounds[oral.i];
    var b = $("mpOralOverlayBody");
    b.innerHTML =
      '<p class="mp-ex-q"><b>Question ' + (oral.i + 1) + ' of ' + oral.rounds.length + '</b><br>' + r.q + '</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-gold" id="mpOralSpeak" type="button">🔊 Hear it again</button>' +
      '<button class="btn btn-primary" id="mpOralMic" type="button">🎙️ Answer by voice</button>' +
      '<button class="btn btn-ghost" id="mpOralType" type="button">⌨️ Type instead</button></div>' +
      '<div id="mpOralLive" class="mp-ex-live" aria-live="polite"></div>' +
      '<textarea id="mpOralAns" class="input" rows="3" placeholder="Your answer appears here (or type it)…" style="margin-top:10px"></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-primary" id="mpOralSubmit" type="button">Submit answer ✓</button>' +
      '<span id="mpOralMeta" class="mp-ex-note"></span></div>';
    $("mpOralSpeak").onclick = function () { speak(r.q); };
    $("mpOralMic").onclick = startMic;
    $("mpOralType").onclick = function () { $("mpOralAns").focus(); };
    $("mpOralSubmit").onclick = submitOral;
    speak(r.q);
    oral.t0 = Date.now(); oral.words = 0;
  }
  function startMic() {
    var rec = recogniser();
    var live = $("mpOralLive");
    if (!rec) { live.textContent = "This browser has no speech recognition — type your answer instead (Chrome on Android/Windows/Mac has it)."; return; }
    try {
      rec.lang = "en-NG"; rec.interimResults = true; rec.continuous = true;
      var final = "";
      rec.onresult = function (e) {
        var interim = "";
        for (var i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
          else interim += e.results[i][0].transcript;
        }
        $("mpOralAns").value = (final + interim).trim();
      };
      rec.onerror = function (e) { live.textContent = "Microphone problem (" + e.error + ") — you can type instead."; };
      rec.onend = function () { live.textContent = final ? "Heard you — check the text and submit." : "No speech heard — try again or type."; };
      rec.start();
      oral.rec = rec;
      live.textContent = "Listening… speak your answer as if before the examiner.";
    } catch (e) { live.textContent = "Could not start the microphone — type instead."; }
  }
  function submitOral() {
    var ans = $("mpOralAns").value || "";
    var secs = Math.max(1, Math.round((Date.now() - oral.t0) / 1000));
    var wc = contentWords(ans).length + String(ans).trim().split(/\s+/).filter(Boolean).length;
    var wpm = Math.round((String(ans).trim().split(/\s+/).filter(Boolean).length / secs) * 60);
    var fillers = (ans.toLowerCase().match(/\b(um|uh|er|like|sort of|kind of)\b/g) || []).length;
    var cov = coverage(ans, oral.rounds[oral.i].point);
    oral.scores.push(cov.pct);
    var fb = '<p class="mp-ex-fb ' + (cov.pct >= 65 ? "good" : cov.pct >= 40 ? "mid" : "bad") + '">' +
      'Coverage <b>' + cov.pct + '%</b> · pace ' + (wpm || 0) + ' wpm · fillers ' + fillers +
      (cov.missed.length ? '<br>Missed mark-point words: ' + cov.missed.join(", ") : "<br>Every mark-point word landed. Examiner's nod. ✓") + '</p>';
    var b = $("mpOralOverlayBody");
    b.insertAdjacentHTML("beforeend", fb);
    speak(cov.pct >= 65 ? "Good answer." : "Review the missed points and try the next one.");
    var log = st.get("nssc_oral", []);
    log.unshift({ d: new Date().toLocaleDateString(), s: oral.s, t: oral.t, pct: cov.pct, wpm: wpm || 0, fillers: fillers });
    st.set("nssc_oral", log.slice(0, 60));
    recordStudyEvent("oral", oral.s, oral.t, cov.pct);
    oral.i++;
    setTimeout(nextOral, 1600);
  }
  function endOral() {
    var avg = Math.round(oral.scores.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, oral.scores.length));
    $("mpOralOverlayBody").innerHTML =
      '<p class="mp-ex-q"><b>Oral complete — ' + oral.s + ', ' + oral.t + '</b></p>' +
      '<p class="mp-ex-fb ' + (avg >= 65 ? "good" : avg >= 40 ? "mid" : "bad") + '">Round average <b>' + avg + '%</b> (' + oral.scores.join("%, ") + '%)</p>' +
      '<p class="mp-ex-note">Logged to this device. Scores of 65%+ across rounds are examiner-standard.</p>' +
      '<button class="btn btn-primary" id="mpOralAgain" type="button">Another round</button>';
    $("mpOralAgain").onclick = openMpOral;
    T("Oral round saved — average " + avg + "%", "🎤");
  }

  /* ============================================= 2. MEMORY PALACE == */
  var ROOMS = ["the school gate", "the main corridor", "your classroom", "the science lab", "the library", "the chapel", "the sports field", "the staff room"];
  var TWIST = ["written in giant glowing letters on", "painted in gold paint across", "carved deep into", "spell out in waec-blue ink on", "burning quietly (fireproof, of course) on", "built from chalk blocks beside", "projected by a floating projector above", "sung on a loop by a parrot perched on"];
  var pal = { s: null, t: null, rooms: [], i: 0, scores: [] };
  function palaceOf(subject, topic) {
    var pts = pointsOf(subject, topic);
    return pts.map(function (p, i) {
      var ws = contentWords(p);
      var key = ws.length ? ws.sort(function (a, b) { return b.length - a.length; })[0] : "the answer";
      return { room: ROOMS[i % ROOMS.length], twist: TWIST[i % TWIST.length], key: key, point: p };
    });
  }
  function openMpPalace(preset) {
    var o = overlay("mpPalaceOverlay", "🏛️ Memory Palace",
      "World-first: any topic becomes a walk through your own school — one vivid image per room, then a recall test. The method of loci, automated.");
    o.classList.remove("hidden");
    pickers("mpPalaceOverlayBody", function () {
      var saved = st.get("nssc_palaces", {});
      var hist = Object.keys(saved).slice(0, 3).map(function (k) {
        return '<span class="mp-ex-note">· ' + k + ": " + saved[k].pct + "% (" + saved[k].at + ")</span>";
      }).join(" ");
      $("mpPalaceOverlayBodyGo").innerHTML = '<button class="btn btn-primary" id="mpPalBuild" type="button">Build my palace</button> ' +
        '<button class="btn btn-ghost" id="mpPalHist" type="button">Saved palaces</button>' +
        '<div id="mpPalHistOut" class="mp-ex-note" style="margin-top:8px">' + (hist || "") + '</div>';
      $("mpPalBuild").onclick = startPalace;
      $("mpPalHist").onclick = function () {
        var s = st.get("nssc_palaces", {});
        $("mpPalHistOut").innerHTML = Object.keys(s).length ? Object.keys(s).map(function (k) {
          return "<b>" + k + "</b> → " + s[k].pct + "% on " + s[k].at;
        }).join("<br>") : "No palaces built on this device yet.";
      };
    }, "Choose the topic to turn into a palace", preset);
  }
  function startPalace() {
    pal.s = $("mpPalaceOverlayBodySub").value; pal.t = $("mpPalaceOverlayBodyTop").value;
    pal.rooms = palaceOf(pal.s, pal.t);
    if (pal.rooms.length < 3) { T("That topic needs more mark points for a palace", "⚠️"); return; }
    pal.i = 0; pal.scores = [];
    walkPalace();
  }
  function walkPalace() {
    if (pal.i >= pal.rooms.length) return recallPalace(0);
    var r = pal.rooms[pal.i];
    var img = "In " + r.room + ", imagine “" + r.key + "” " + r.twist + " " + r.room + ".";
    $("mpPalaceOverlayBody").innerHTML =
      '<p class="mp-ex-q"><b>Room ' + (pal.i + 1) + " of " + pal.rooms.length + " — " + r.room + '</b></p>' +
      '<p class="mp-ex-img">' + img + '</p>' +
      '<p class="mp-ex-note">The image hides a mark point: <i>' + r.point + '</i></p>' +
      '<div style="display:flex;gap:8px"><button class="btn btn-gold" id="mpPalSpeak" type="button">🔊 Hear the room</button>' +
      '<button class="btn btn-primary" id="mpPalNext" type="button">' + (pal.i === pal.rooms.length - 1 ? "Start the recall test →" : "Walk on →") + '</button></div>';
    $("mpPalSpeak").onclick = function () { speak(img + " The point: " + r.point); };
    $("mpPalNext").onclick = function () { pal.i++; walkPalace(); };
    speak(img);
  }
  function recallPalace(i) {
    if (i >= pal.rooms.length) return endPalace();
    var r = pal.rooms[i];
    $("mpPalaceOverlayBody").innerHTML =
      '<p class="mp-ex-q"><b>Recall ' + (i + 1) + " of " + pal.rooms.length + '</b><br>What was written in ' + r.room + '? (the image was: “' + r.key + "” " + r.twist + " " + r.room + ')</p>' +
      '<textarea id="mpPalAns" class="input" rows="3" placeholder="Write the mark point as you remember it…"></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-primary" id="mpPalSubmit" type="button">Check my recall ✓</button>' +
      '<button class="btn btn-ghost" id="mpPalSkip" type="button">Show me</button></div><div id="mpPalFb"></div>';
    $("mpPalSubmit").onclick = function () { gradeRecall(i, $("mpPalAns").value); };
    $("mpPalSkip").onclick = function () { gradeRecall(i, "", true); };
    $("mpPalAns").focus();
  }
  function gradeRecall(i, ans, shown) {
    var cov = shown ? { pct: 0, missed: [] } : coverage(ans, pal.rooms[i].point);
    pal.scores.push(cov.pct);
    $("mpPalFb").innerHTML = '<p class="mp-ex-fb ' + (cov.pct >= 65 ? "good" : cov.pct >= 40 ? "mid" : "bad") + '">' +
      (shown ? "The point was: " : "Recall " + cov.pct + "% · ") + '<i>' + pal.rooms[i].point + "</i></p>";
    setTimeout(function () { recallPalace(i + 1); }, shown ? 2200 : 1500);
  }
  function endPalace() {
    var avg = Math.round(pal.scores.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, pal.scores.length));
    var key = pal.s + " · " + pal.t;
    var s = st.get("nssc_palaces", {});
    s[key] = { pct: avg, at: new Date().toLocaleDateString(), rooms: pal.rooms.length };
    st.set("nssc_palaces", s);
    recordStudyEvent("palace", pal.s, pal.t, avg);
    $("mpPalaceOverlayBody").innerHTML =
      '<p class="mp-ex-q"><b>Palace complete — ' + key + '</b></p>' +
      '<p class="mp-ex-fb ' + (avg >= 65 ? "good" : avg >= 40 ? "mid" : "bad") + '">Recall score <b>' + avg + '%</b> across ' + pal.rooms.length + " rooms.</p>" +
      '<p class="mp-ex-note">' + (avg < 70 ? "Re-walk tomorrow — spacing is what makes the palace stick." : "Examiner-grade recall. Re-walk in 3 days to keep it.") + '</p>' +
      '<button class="btn btn-primary" id="mpPalAgain" type="button">Build another palace</button>';
    $("mpPalAgain").onclick = openMpPalace;
    T("Palace saved — recall " + avg + "%", "🏛️");
  }

  /* ===================================== 3. FORGETTING-CURVE AUTOPILOT == */
  var AKEY = "nssc_autopilot", EKEY = "nssc_auto_events";
  var STAGES = [1, 3, 7, 14, 30];                        /* Ebbinghaus review intervals, days */
  var STAGE_NAME = ["New", "Learning", "Solid", "Strong", "Mastered"];
  function esc(x) {
    return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function autoState() { return st.get(AKEY, {}) || {}; }
  function recordStudyEvent(kind, s, t, pct, when) {
    try {
      var at = when || Date.now();
      var ev = st.get(EKEY, []); ev.unshift({ k: kind, s: s, t: t, pct: Math.round(pct), at: at });
      st.set(EKEY, ev.slice(0, 200));
      var a = autoState(), key = s + " · " + t, e = a[key] || { stage: 0, rev: 0 };
      if (pct >= 65) e.stage = Math.min(STAGES.length - 1, e.stage + 1);
      else if (pct < 40) e.stage = 0;                    /* 40–64 holds the stage */
      e.rev++; e.pct = Math.round(pct); e.at = at; e.k = kind;
      e.due = at + STAGES[e.stage] * 86400000;
      a[key] = e; st.set(AKEY, a);
    } catch (e2) {}
  }
  function seedAutopilot() {
    /* one-time import: oral logs and palace results already on this device count */
    var a = autoState();
    if (a.__seeded) return;
    (st.get("nssc_oral", []) || []).forEach(function (r) {
      recordStudyEvent("oral", r.s, r.t, r.pct || 0, Date.parse(r.d) || Date.now());
    });
    var pals = st.get("nssc_palaces", {}) || {};
    Object.keys(pals).forEach(function (k) {
      var v = pals[k] || {}, parts = k.split(" · ");
      if (parts.length === 2) recordStudyEvent("palace", parts[0], parts[1], v.pct || 0, Date.parse(v.at) || Date.now());
    });
    a = autoState(); a.__seeded = true; st.set(AKEY, a);
  }
  function toolFor(stage) {
    return stage <= 1 ? ["palace", "🏛️", "Walk the palace"]
      : stage === 2 ? ["arena", "🏟️", "Blurt it"]
      : ["oral", "🎤", "Face the examiner"];
  }
  function daysLabel(due) {
    var d = Math.ceil((due - Date.now()) / 86400000);
    return d <= 0 ? "today" : d === 1 ? "tomorrow" : "in " + d + " days";
  }
  function openMpAutopilot() {
    seedAutopilot();
    var o = overlay("mpAutoOverlay", "📈 Forgetting-Curve Autopilot",
      "World-first combination: every oral answer, palace walk and blurt you finish feeds an Ebbinghaus schedule (1·3·7·14·30 days) that tells you exactly what to review today. Computed on your device — no account, no server.");
    o.classList.remove("hidden");
    var a = autoState(), now = Date.now();
    var endToday = new Date(); endToday.setHours(23, 59, 59, 999);
    var keys = Object.keys(a).filter(function (k) { return k !== "__seeded" && a[k] && a[k].due; });
    var due = [], soon = [];
    keys.forEach(function (k) {
      if (a[k].due <= endToday.getTime()) due.push(k);
      else if (a[k].due <= now + 7 * 86400000) soon.push(k);
    });
    due.sort(function (x, y) { return a[x].due - a[y].due; });
    soon.sort(function (x, y) { return a[x].due - a[y].due; });
    var revs = (st.get(EKEY, []) || []).length;
    /* the curve itself: retention decays, each review bumps it, decay slows */
    var stops = [0, 1, 3, 7, 14, 30], r = 100, prevD = 0, pl = [], bumps = [];
    stops.forEach(function (d, i) {
      if (i === 0) { pl.push([0, 100]); return; }
      var decay = Math.max(15, r * Math.exp(-(d - prevD) / (1.2 + i * 1.1)));
      pl.push([d, decay]);
      r = Math.min(100, decay + 28 + i * 5);
      pl.push([d, r]); bumps.push([d, r]);
      prevD = d;
    });
    var X = function (d) { return 8 + d * 8.6; }, Y = function (v) { return 96 - v * 0.82; };
    var curve = '<svg class="mp-ex-curve" viewBox="0 0 276 112" role="img" aria-label="The forgetting curve: retention falls after each review, and every review makes the fall slower">' +
      '<polyline fill="none" stroke="#c9a25f" stroke-width="2.5" stroke-linejoin="round" points="' +
      pl.map(function (q) { return X(q[0]).toFixed(1) + "," + Y(q[1]).toFixed(1); }).join(" ") + '"/>' +
      bumps.map(function (q) { return '<circle cx="' + X(q[0]).toFixed(1) + '" cy="' + Y(q[1]).toFixed(1) + '" r="3" fill="#0f6b4f"/>'; }).join("") +
      stops.slice(1).map(function (d) { return '<text x="' + X(d).toFixed(1) + '" y="110" font-size="9" text-anchor="middle" fill="#6b6b6b">' + d + "d</text>"; }).join("") +
      '</svg>';
    var dueHtml = due.length ? due.map(function (k) {
      var e = a[k], tool = toolFor(e.stage);
      return '<div class="mp-ex-due"><span><b>' + esc(k) + '</b><br><span class="mp-ex-chip">' + STAGE_NAME[e.stage] +
        '</span> <span class="mp-ex-note">last ' + e.pct + '% · review #' + e.rev + '</span></span>' +
        '<button class="btn btn-gold" type="button" data-tool="' + tool[0] + '" data-key="' + esc(k) + '">' + tool[1] + " " + tool[2] + "</button></div>";
    }).join("") : '<p class="mp-ex-note" id="mpAutoEmpty">Nothing is due today. The schedule updates itself every time you finish an oral, a palace walk or a blurt.</p>';
    var soonHtml = soon.length ? '<p class="mp-ex-lab">📅 Next 7 days</p>' + soon.map(function (k) {
      return '<span class="mp-ex-note">' + esc(k) + " — " + daysLabel(a[k].due) + " (" + STAGE_NAME[a[k].stage] + ")</span><br>";
    }).join("") : "";
    $("mpAutoOverlayBody").innerHTML =
      '<p class="mp-ex-q" id="mpAutoStats"><b>' + keys.length + " topics tracked · " + due.length + " due today · " + revs + " reviews logged</b></p>" +
      curve +
      '<p class="mp-ex-lab">⏰ Due today</p><div id="mpAutoDue">' + dueHtml + "</div>" + soonHtml +
      (keys.length ? "" : '<button class="btn btn-primary" id="mpAutoStart" type="button" style="margin-top:10px">🏟️ Do your first blurt</button>');
    [].forEach.call($("mpAutoOverlayBody").querySelectorAll("[data-tool]"), function (btn) {
      btn.onclick = function () {
        var parts = String(btn.getAttribute("data-key") || "").split(" · "), tool = btn.getAttribute("data-tool");
        o.classList.add("hidden");
        (tool === "palace" ? openMpPalace : tool === "arena" ? openMpArena : openMpOral)(parts);
      };
    });
    if ($("mpAutoStart")) $("mpAutoStart").onclick = function () { o.classList.add("hidden"); openMpArena(); };
  }

  /* ============================================= 4. RECALL ARENA ====== */
  var ar = { s: null, t: null, pts: [], timer: null };
  function openMpArena(preset) {
    var o = overlay("mpArenaOverlay", "🏟️ Recall Arena",
      "World-first blurting: study the mark points for 30 seconds, the app hides everything, you write down all you remember — then it diffs your blurt against every mark point and hands you the misses, different-colour-pen style.");
    o.classList.remove("hidden");
    pickers("mpArenaOverlayBody", function () {
      $("mpArenaOverlayBodyGo").innerHTML = '<button class="btn btn-primary" id="mpArenaStart" type="button">Enter the arena</button>' +
        '<p class="mp-ex-note">30-second study phase · one blind blurt · instant mark-point diff · feeds your Forgetting-Curve Autopilot. All on this device.</p>';
      $("mpArenaStart").onclick = startArena;
    }, "Pick the topic to blurt", preset);
  }
  function stopCount() { if (ar.timer) { clearInterval(ar.timer); ar.timer = null; } }
  function startArena() {
    if ($("mpArenaOverlayBodySub")) {                    /* fresh entry: read the pickers */
      ar.s = $("mpArenaOverlayBodySub").value; ar.t = $("mpArenaOverlayBodyTop").value;
      ar.pts = pointsOf(ar.s, ar.t);
      if (ar.pts.length < 2) { T("Not enough mark points for that topic yet", "⚠️"); return; }
    }
    if (!ar.pts.length) return;                          /* "blurt again": reuse ar.s/ar.t/ar.pts */
    $("mpArenaOverlayBody").innerHTML =
      '<p class="mp-ex-q"><b>Step 1 — study the mark points</b> <span id="mpArenaCount" class="mp-ex-chip">30s</span></p>' +
      '<ol class="mp-ex-ul">' + ar.pts.map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") + "</ol>" +
      '<button class="btn btn-primary" id="mpArenaBlurt" type="button">I\'ve memorised it — hide & blurt →</button>';
    $("mpArenaBlurt").onclick = function () { stopCount(); blurtPhase(); };
    var left = 30;
    stopCount();
    ar.timer = setInterval(function () {
      left--;
      var c = $("mpArenaCount");
      if (!c) { stopCount(); return; }
      c.textContent = left + "s";
      if (left <= 0) { stopCount(); blurtPhase(); }
    }, 1000);
  }
  function blurtPhase() {
    $("mpArenaOverlayBody").innerHTML =
      "<p class=\"mp-ex-q\"><b>Step 2 — blurt!</b> Everything you remember from " + esc(ar.t) +
      '. Definitions, steps, examples, formulas. Do not peek.</p>' +
      '<textarea id="mpArenaIn" class="input" rows="8" placeholder="Write it all here…"></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-primary" id="mpArenaSubmit" type="button">Mark my blurt ✓</button></div>';
    $("mpArenaIn").focus();
    $("mpArenaSubmit").onclick = scoreArena;
  }
  function scoreArena() {
    var ans = $("mpArenaIn").value || "";
    var hits = [], misses = [], total = 0;
    ar.pts.forEach(function (q) {
      var c = coverage(ans, q);
      total += c.pct;
      (c.pct >= 65 ? hits : misses).push({ p: q, c: c });
    });
    var overall = Math.round(total / ar.pts.length);
    var key = ar.s + " · " + ar.t;
    var sav = st.get("nssc_arena", {}), prev = sav[key] || { best: 0, rounds: 0 };
    sav[key] = { best: Math.max(prev.best || 0, overall), last: overall, at: new Date().toLocaleDateString(), rounds: (prev.rounds || 0) + 1 };
    st.set("nssc_arena", sav);
    recordStudyEvent("arena", ar.s, ar.t, overall);
    $("mpArenaOverlayBody").innerHTML =
      "<p class=\"mp-ex-q\"><b>Blurt marked — " + esc(key) + "</b></p>" +
      '<p class="mp-ex-fb ' + (overall >= 65 ? "good" : overall >= 40 ? "mid" : "bad") + '" id="mpArenaScore">Recall <b>' + overall +
      "%</b> · " + hits.length + " of " + ar.pts.length + " mark points landed" +
      (overall > (prev.best || 0) ? " · <b>new personal best!</b>" : (prev.best ? " · best " + prev.best + "%" : "")) + "</p>" +
      (hits.length ? '<p class="mp-ex-lab">✔ Landed</p><ul class="mp-ex-ul">' + hits.map(function (h) { return "<li>" + esc(h.p) + "</li>"; }).join("") + "</ul>" : "") +
      (misses.length ? '<p class="mp-ex-lab">✘ The pen-colour step — relearn these</p><ul class="mp-ex-ul mp-ex-miss" id="mpArenaMisses">' +
        misses.map(function (m) {
          return "<li>" + esc(m.p) + (m.c.missed.length ? ' <span class="mp-ex-note">(missing: ' + esc(m.c.missed.join(", ")) + ")</span>" : "") + "</li>";
        }).join("") + "</ul>" : "") +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary" id="mpArenaAgain" type="button">Blurt again — same topic</button>' +
      '<button class="btn btn-ghost" id="mpArenaNew" type="button">Pick another topic</button></div>';
    $("mpArenaAgain").onclick = startArena;
    $("mpArenaNew").onclick = function () { openMpArena(); };
    T("Blurt saved — recall " + overall + "%", "🏟️");
  }

  /* ========================================= 5. EXAM COMMAND CENTER == */
  var XKEY = "nssc_exam", PLKEY = "nssc_plan";
  function openMpCommand() {
    var o = overlay("mpCmdOverlay", "🧭 Exam Command Center",
      "World-class study logistics, on-device: set your exam date and the app turns your own forgetting data into a day-by-day plan — mastery heatmap, weak topics first, Ebbinghaus re-reviews built in. Printable, offline, no account.");
    o.classList.remove("hidden");
    renderCmd();
  }
  function daysTo(dateStr) { return Math.ceil((new Date(dateStr + "T00:00:00").getTime() - Date.now()) / 86400000); }
  function subjStats() {
    var ev = st.get("nssc_auto_events", []) || [], out = {};
    ev.forEach(function (e) {
      var o = out[e.s] || (out[e.s] = { sum: 0, n: 0 });
      o.sum += e.pct; o.n++;
    });
    return out;
  }
  function heatClass(avg, n) { return !n ? "hm-none" : avg < 40 ? "hm-bad" : avg < 65 ? "hm-mid" : "hm-good"; }
  function renderCmd() {
    var b = $("mpCmdOverlayBody"), ex = st.get(XKEY, null);
    if (!ex || !ex.date) {
      b.innerHTML =
        '<label class="mp-ex-lab" for="mpCmdType">Which exam are you preparing for?</label>' +
        '<select id="mpCmdType" class="input"><option>WAEC</option><option>NECO</option><option>NABTEB</option><option>School mock</option><option>Custom</option></select>' +
        '<label class="mp-ex-lab" for="mpCmdDate">Exam date</label>' +
        '<input id="mpCmdDate" class="input" type="date">' +
        '<button class="btn btn-primary" id="mpCmdSave" type="button" style="margin-top:12px">Set my countdown →</button>' +
        '<p class="mp-ex-note">Everything is computed and stored on this device — nothing is uploaded anywhere.</p>';
      $("mpCmdSave").onclick = function () {
        var d = $("mpCmdDate").value;
        if (!d) { T("Pick your exam date first", "⚠️"); return; }
        st.set(XKEY, { type: $("mpCmdType").value, date: d, at: Date.now() });
        st.del(PLKEY);
        renderCmd();
      };
      return;
    }
    var left = daysTo(ex.date);
    var stats = subjStats(), a = autoState();
    var bank = (typeof RNOTES !== "undefined") ? RNOTES : {};
    var subjects = Object.keys(bank);
    var heat = subjects.map(function (sb) {
      var o = stats[sb] || { sum: 0, n: 0 }, avg = o.n ? Math.round(o.sum / o.n) : 0;
      return '<button type="button" class="mp-hm ' + heatClass(avg, o.n) + '" data-subj="' + esc(sb) + '">' +
        "<b>" + esc(sb) + "</b><span>" + (o.n ? avg + "% · " + o.n + " review" + (o.n > 1 ? "s" : "") : "no data yet") + "</span></button>";
    }).join("");
    var plan = st.get(PLKEY, null);
    var planHtml = plan && plan.for === ex.date ? renderPlan(plan) :
      '<button class="btn btn-primary" id="mpCmdPlan" type="button">⚡ Generate my day-by-day plan</button>' +
      '<p class="mp-ex-note">Weights every topic by your heatmap and autopilot stage: weak and untouched first, each studied topic re-reviewed at +1, +3 and +7 days.</p>';
    b.innerHTML =
      '<div class="mp-cmd-count" id="mpCmdDays">' +
      (left > 0 ? "<b>" + left + "</b> day" + (left === 1 ? "" : "s") + " to " + esc(ex.type) + " · " + esc(ex.date)
        : esc(ex.type) + " was on " + esc(ex.date) + " — set a new date below") + "</div>" +
      '<p class="mp-ex-lab">🔥 Mastery heatmap (tap a subject for its topics)</p>' +
      '<div class="mp-hm-grid" id="mpCmdHeat">' + heat + '</div><div id="mpCmdSub"></div>' +
      '<p class="mp-ex-lab">🗓️ Your plan</p><div id="mpCmdPlanOut">' + planHtml + "</div>" +
      '<div class="mp-no-print" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
      '<button class="btn btn-ghost" id="mpCmdPrint" type="button">🖨️ Print plan</button>' +
      '<button class="btn btn-ghost" id="mpCmdCopy" type="button">📋 Copy plan</button>' +
      '<button class="btn btn-ghost" id="mpCmdReset" type="button">Change exam / date</button></div>';
    if ($("mpCmdPlan")) $("mpCmdPlan").onclick = function () { genPlan(ex); renderCmd(); };
    [].forEach.call(b.querySelectorAll("[data-subj]"), function (btn) {
      btn.onclick = function () {
        var sb = btn.getAttribute("data-subj"), tops = Object.keys(bank[sb] || {});
        $("mpCmdSub").innerHTML = '<div class="mp-ex-due"><span><b>' + esc(sb) + " — " + tops.length + " topics</b><br>" +
          '<span class="mp-ex-note">' + tops.map(function (t) {
            var e = a[sb + " · " + t];
            return esc(t) + (e ? " (" + e.pct + "%, " + STAGE_NAME[e.stage] + ")" : " (unstudied)");
          }).join(" · ") + "</span></span></div>";
      };
    });
    $("mpCmdReset").onclick = function () { st.del(XKEY); st.del(PLKEY); renderCmd(); };
    $("mpCmdPrint").onclick = function () {
      document.body.classList.add("mp-printing");
      var done = function () { document.body.classList.remove("mp-printing"); window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      window.print();
    };
    $("mpCmdCopy").onclick = function () {
      var txt = planText(st.get(PLKEY, null), ex);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { T("Plan copied", "📋"); }, function () { T("Copy blocked — use Print instead", "⚠️"); });
        else T("Copy not available here — use Print instead", "⚠️");
      } catch (e) { T("Copy not available here — use Print instead", "⚠️"); }
    };
    if (plan && plan.for === ex.date) {
      var more = $("mpCmdMore");
      if (more) more.onclick = function () { more.previousCount = (more.previousCount || 7); renderPlanInto(plan, more.previousCount + 14); more.remove(); };
    }
  }
  function genPlan(ex) {
    var a = autoState(), bank = (typeof RNOTES !== "undefined") ? RNOTES : {};
    var left = Math.max(1, daysTo(ex.date));
    var queue = [];
    Object.keys(bank).forEach(function (sb) {
      Object.keys(bank[sb]).forEach(function (t) {
        var e = a[sb + " · " + t];
        var pri = !e ? 3 : (e.pct < 40 || e.stage <= 1) ? 3 : e.pct < 65 ? 2 : 1;
        queue.push({ s: sb, t: t, pri: pri, stage: e ? e.stage : 0, known: !!e });
      });
    });
    /* weakest known first, then untouched, then middling, then mastered */
    queue.sort(function (x, y) {
      return y.pri - x.pri || (y.known ? 1 : 0) - (x.known ? 1 : 0) || x.s.localeCompare(y.s) || x.t.localeCompare(y.t);
    });
    var horizon = Math.min(left, 90), perDay = 4;
    var days = [];
    for (var d = 0; d < horizon; d++) days.push([]);
    var qi = 0, day = 0;
    while (qi < queue.length && day < horizon) {
      var load = 0;
      while (qi < queue.length && load < perDay) {
        var item = queue[qi++];
        days[day].push({ s: item.s, t: item.t, mode: "new", tool: toolFor(item.stage)[0] });
        [1, 3, 7].forEach(function (gap) {
          if (day + gap < horizon) days[day + gap].push({ s: item.s, t: item.t, mode: "review", tool: toolFor(Math.min(4, item.stage + 1))[0] });
        });
        load++;
      }
      day++;
    }
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    var plan = { for: ex.date, madeAt: Date.now(), days: days.map(function (items, i) {
      var dt = new Date(t0.getTime() + i * 86400000);
      return { date: dt.toISOString().slice(0, 10), items: items };
    }).filter(function (d2) { return d2.items.length; }) };
    st.set(PLKEY, plan);
    T("Plan generated — " + plan.days.length + " study days", "🧭");
  }
  function renderPlan(plan) {
    var head = plan.days.slice(0, 7), rest = plan.days.length - head.length;
    var html = head.map(planDayHtml).join("");
    if (rest > 0) html += '<button class="btn btn-ghost" id="mpCmdMore" type="button">Show more days (' + rest + " left)</button>";
    return html;
  }
  function renderPlanInto(plan, n) {
    var out = $("mpCmdPlanOut");
    if (out) out.innerHTML = plan.days.slice(0, n).map(planDayHtml).join("") +
      (plan.days.length > n ? '<button class="btn btn-ghost" id="mpCmdMore" type="button">Show more days (' + (plan.days.length - n) + " left)</button>" : "");
  }
  function planDayHtml(d) {
    var news = d.items.filter(function (i) { return i.mode === "new"; });
    var revs = d.items.filter(function (i) { return i.mode === "review"; });
    return '<div class="mp-plan-day"><b>' + d.date + "</b><span>" +
      (news.length ? "🆕 " + news.map(function (i) { return esc(i.s + ": " + i.t); }).join(" · ") : "") +
      (news.length && revs.length ? "<br>" : "") +
      (revs.length ? "🔁 " + revs.map(function (i) { return esc(i.s + ": " + i.t); }).join(" · ") : "") +
      "</span></div>";
  }
  function planText(plan, ex) {
    if (!plan) return "No plan yet — generate one in the Exam Command Center.";
    return "MAMSS PREP study plan for " + ex.type + " on " + ex.date + "\n" +
      plan.days.map(function (d) {
        return d.date + ": " + d.items.map(function (i) { return (i.mode === "new" ? "[new] " : "[review] ") + i.s + " — " + i.t; }).join("; ");
      }).join("\n");
  }

  window.openMpOral = openMpOral;
  window.openMpPalace = openMpPalace;
  window.openMpArena = openMpArena;
  window.openMpAutopilot = openMpAutopilot;
  window.openMpCommand = openMpCommand;
  window.MP_EXCLUSIVE = { coverage: coverage, pointsOf: pointsOf, palaceOf: palaceOf, topics: topicsList, recordStudyEvent: recordStudyEvent, autoState: autoState, STAGES: STAGES, ready: true };
  try { document.dispatchEvent(new CustomEvent("mpExclusiveReady")); } catch (e) {}
})();
