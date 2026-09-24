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
  function pickers(bodyId, onpick, label) {
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
    onpick(b);
  }

  /* ============================================= 1. ORAL EXAMINER == */
  var oral = { s: null, t: null, rounds: [], i: 0, scores: [], rec: null, t0: 0, words: 0 };
  function openMpOral() {
    var o = overlay("mpOralOverlay", "🎤 Oral Examiner",
      "World-first: the app asks your oral questions aloud, listens, and marks your spoken answer against the mark points. Headphones recommended.");
    o.classList.remove("hidden");
    pickers("mpOralOverlayBody", function () {
      $("mpOralOverlayBodyGo").innerHTML = '<button class="btn btn-primary" id="mpOralStart" type="button">Begin the oral round</button>' +
        '<p class="mp-ex-note">3 questions per round · microphone optional (typed answers accepted) · everything stays on this device.</p>';
      $("mpOralStart").onclick = startOral;
    }, "Choose a subject and topic for the oral");
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
  function openMpPalace() {
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
    }, "Choose the topic to turn into a palace");
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
    $("mpPalaceOverlayBody").innerHTML =
      '<p class="mp-ex-q"><b>Palace complete — ' + key + '</b></p>' +
      '<p class="mp-ex-fb ' + (avg >= 65 ? "good" : avg >= 40 ? "mid" : "bad") + '">Recall score <b>' + avg + '%</b> across ' + pal.rooms.length + " rooms.</p>" +
      '<p class="mp-ex-note">' + (avg < 70 ? "Re-walk tomorrow — spacing is what makes the palace stick." : "Examiner-grade recall. Re-walk in 3 days to keep it.") + '</p>' +
      '<button class="btn btn-primary" id="mpPalAgain" type="button">Build another palace</button>';
    $("mpPalAgain").onclick = openMpPalace;
    T("Palace saved — recall " + avg + "%", "🏛️");
  }

  window.openMpOral = openMpOral;
  window.openMpPalace = openMpPalace;
  window.MP_EXCLUSIVE = { coverage: coverage, pointsOf: pointsOf, palaceOf: palaceOf, topics: topicsList, ready: true };
  try { document.dispatchEvent(new CustomEvent("mpExclusiveReady")); } catch (e) {}
})();
