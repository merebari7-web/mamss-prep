/* MAMSS Prep workspace. Existing quiz/progress keys remain authoritative. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const icon = (name) =>
    '<svg class="ico" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const safe = (value) =>
    String(value == null ? "" : value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const titles = {
    overview: "Overview",
    practice: "Practice",
    progress: "My progress",
    tools: "Study toolkit",
  };
  let current = "overview",
    grade = Math.max(0, Math.min(2, Number(store.get("study_grade", 0)) || 0));
  let ready,
    cssPromise,
    notifyTimer,
    modalReturn = null,
    navigating = false;
  const loads = new Map();
  const tools = [
    [
      "Learn & understand",
      "notes",
      "book",
      "mint",
      "Lesson notes",
      "Clear explanations, worked examples, and lesson plans.",
      "Primary & secondary",
    ],
    [
      "Learn & understand",
      "tutor",
      "spark",
      "lavender",
      "Study tutor",
      "Ask a question. Get a starting point for understanding.",
      "On-device first · optional online AI",
    ],
    [
      "Learn & understand",
      "atlas",
      "globe",
      "blue",
      "Curriculum atlas",
      "Explore subjects, topics, and the road ahead.",
      "SS1–SS3",
    ],
    [
      "Learn & understand",
      "reels",
      "book",
      "peach",
      "Explainer reels",
      "Captioned, narrated explanations for a different perspective.",
      "Voice availability varies by device",
    ],
    [
      "Practise & remember",
      "flash",
      "book",
      "mint",
      "Flashcards",
      "Flip, recall, repeat. Turn small sessions into lasting knowledge.",
      "Active recall",
    ],
    [
      "Practise & remember",
      "rapid",
      "bolt",
      "peach",
      "Rapid fire",
      "Short question sprints to sharpen your recall.",
      "30–90 second sessions",
    ],
    [
      "Practise & remember",
      "reviews",
      "check",
      "lavender",
      "Mistake review",
      "Revisit the questions you missed, when they are due.",
      "Spaced repetition",
    ],
    [
      "Practise & remember",
      "spell",
      "book",
      "blue",
      "Spelling practice",
      "Type your answer and strengthen your vocabulary.",
      "Write it to remember it",
    ],
    [
      "Practise & remember",
      "blitz",
      "spark",
      "sand",
      "Recall blitz",
      "Try to recall the answer before seeing the options.",
      "Retrieval practice",
    ],
    [
      "Practise & remember",
      "quizme",
      "book",
      "mint",
      "Quiz a friend",
      "Two players. One device. Learn a little together.",
      "Pass-and-play",
    ],
    [
      "Prepare & focus",
      "mock",
      "clock",
      "peach",
      "Mock examination",
      "A timed paper with marking at the end. Practise the real thing.",
      "Exam simulation",
    ],
    [
      "Prepare & focus",
      "focus",
      "clock",
      "mint",
      "Focus timer",
      "Give one subject your undivided attention.",
      "Pomodoro sessions",
    ],
    [
      "Prepare & focus",
      "planner",
      "calendar",
      "lavender",
      "Revision planner",
      "Make a manageable plan for the days before your exam.",
      "Plan, practise, review",
    ],
    [
      "Prepare & focus",
      "cbt",
      "tools",
      "blue",
      "Computer-based test",
      "Candidate registration, question palette, and a result slip.",
      "CBT practice",
    ],
    [
      "Explore & create",
      "calc",
      "math",
      "mint",
      "Scientific calculator",
      "A thoughtful space for numbers, expressions, and answers.",
      "Scientific functions",
    ],
    [
      "Explore & create",
      "s3",
      "tools",
      "lavender",
      "3D shape lab",
      "Rotate solids and explore volume and surface area.",
      "Interactive geometry",
    ],
    [
      "Explore & create",
      "holo",
      "globe",
      "blue",
      "Science visualiser",
      "Explore molecules, mathematical surfaces, and the solar system.",
      "Interactive models",
    ],
    [
      "Explore & create",
      "arcade",
      "bolt",
      "peach",
      "Study arcade",
      "Curriculum-based games for a refreshing change of pace.",
      "Learn through play",
    ],
    [
      "Reflect & keep",
      "report",
      "chart",
      "mint",
      "Report card",
      "A printable view of your learning for you or a teacher.",
      "Print or save as PDF",
    ],
    [
      "Reflect & keep",
      "map",
      "grid",
      "blue",
      "Mastery map",
      "See strengths, spot gaps, and choose what to practise next.",
      "Topic-level insight",
    ],
    [
      "Reflect & keep",
      "records",
      "check",
      "sand",
      "Personal records",
      "Celebrate the best papers and milestones you earned.",
      "Your achievements",
    ],
    [
      "Reflect & keep",
      "backup",
      "shield",
      "lavender",
      "Backup & restore",
      "Keep a copy of your progress or move it to another device.",
      "A file you control",
    ],
  ];
  function notify(text) {
    clearTimeout(notifyTimer);
    $("studyAnnounce").textContent = text;
    notifyTimer = setTimeout(() => ($("studyAnnounce").textContent = ""), 4500);
  }
  function legacy() {
    if (cssPromise) return cssPromise;
    cssPromise = new Promise((resolve, reject) => {
      const link = $("legacyStyles");
      if (link.dataset.ready) {
        resolve();
        return;
      }
      link.onload = () => {
        link.dataset.ready = "1";
        resolve();
      };
      link.onerror = () => {
        cssPromise = null;
        link.removeAttribute("href");
        reject(
          new Error(
            "The study interface could not load. Please try again online.",
          ),
        );
      };
      link.href = "ui/legacy.css";
    });
    return cssPromise;
  }
  function bank() {
    if (typeof CLASSES !== "undefined" && CLASSES.length)
      return Promise.resolve();
    if (ready) return ready;
    ready = new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener("quizbank-updated", check);
      };
      function check() {
        if (window.QUIZ_ERR) {
          cleanup();
          ready = null;
          reject(
            new Error(
              "The question bank did not load. Reconnect and reload this page.",
            ),
          );
        } else if (typeof CLASSES !== "undefined" && CLASSES.length) {
          cleanup();
          resolve();
        }
      }
      const timer = setTimeout(() => {
        cleanup();
        ready = null;
        reject(
          new Error(
            "The question bank is taking longer than usual. Please reload while online.",
          ),
        );
      }, 20000);
      window.addEventListener("quizbank-updated", check);
      check();
    });
    return ready;
  }
  function load(src) {
    if (loads.has(src)) return loads.get(src);
    const pending = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        s.remove();
        loads.delete(src);
        reject(
          new Error("This tool needs a download. Reconnect and try again."),
        );
      };
      document.head.appendChild(s);
    });
    loads.set(src, pending);
    return pending;
  }
  async function curriculum() {
    await bank();
    await load("quiz/curriculum.js");
    if (!window.__curicApi)
      await new Promise((resolve) => setTimeout(resolve, 300));
  }
  async function actionBusy(button, fn) {
    if (button && button.disabled) return;
    if (button) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    }
    try {
      await fn();
    } catch (error) {
      notify(error.message || "Something did not load. Please try again.");
      console.warn("Study tool:", error.message);
    } finally {
      if (button) {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    }
  }
  function menu(open) {
    const wasOpen = $("sidebar").classList.contains("open");
    $("sidebar").classList.toggle("open", open);
    $("navShade").hidden = !open;
    $("menuButton").setAttribute("aria-expanded", String(open));
    $("sidebar").inert = innerWidth <= 800 && !open;
    const covered = open && innerWidth <= 800;
    document.querySelector(".study-body").inert = covered;
    if ($("studioDock")) $("studioDock").inert = covered;
    document.documentElement.classList.toggle("studio-menu-open", covered);
    if (open) $("sidebar").querySelector("a").focus({ preventScroll: true });
    else if (wasOpen) $("menuButton").focus({ preventScroll: true });
  }
  function closeSettings() {
    $("shortcutDialog").hidden = true;
  }
  function show(view, updateURL = true, focus = true) {
    if (!titles[view]) view = "overview";
    current = view;
    document.body.dataset.view = view;
    Object.keys(titles).forEach(
      (key) =>
        ($("view" + key[0].toUpperCase() + key.slice(1)).hidden = key !== view),
    );
    document.querySelectorAll(".study-nav [data-view]").forEach((link) => {
      const active = link.dataset.view === view;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    $("viewCrumb").textContent = titles[view];
    document.title =
      view === "overview"
        ? "MAMSS PREP"
        : titles[view] + " · MAMSS Prep";
    menu(false);
    window.dispatchEvent(new CustomEvent("study:view", { detail: view }));
    if (updateURL && location.hash !== "#" + view)
      history.pushState(null, "", "#" + view);
    if (view === "overview") render();
    if (view === "progress") renderProgress();
    if (focus) {
      $("workspace").focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }
  async function navigate(view, updateURL = true) {
    if (navigating) return;
    navigating = true;
    try {
      if (view === "practice") {
        await Promise.all([legacy(), curriculum()]);
        if (!state.quiz.length) {
          state.cls = null;
          state.subject = null;
          renderClasses();
          setCard("class");
        }
      }
      show(view, updateURL);
    } finally {
      navigating = false;
    }
  }
  function card(type) {
    if (type !== "class" || current === "practice") {
      legacy().catch((e) => notify(e.message));
      show("practice", true, false);
    }
    const map = {
      class: "1. Choose your class",
      subject: "2. Choose a subject",
      length: "3. Make this session yours",
      quiz: "Your practice session",
      result: "Session complete",
      review: "Review & understand",
    };
    $("practiceCrumb").textContent = map[type] || "Your practice session";
    if (type === "result") {
      ["stratWrap", "rsShareBtn", "rsNotesBtn"].forEach((id) => {
        const el = $(id);
        if (el) $("sessionDetailBody").appendChild(el);
      });
      $("sessionDetails").open = false;
      render();
    }
    if (type === "quiz" || type === "result" || type === "review")
      requestAnimationFrame(() => {
        const el = $(
          type === "quiz"
            ? "qText"
            : type === "result"
              ? "resultTitle"
              : "reviewCard",
        );
        if (el) {
          el.setAttribute("tabindex", "-1");
          el.focus({ preventScroll: true });
        }
      });
  }
  async function startSubject(subject) {
    await Promise.all([legacy(), curriculum()]);
    state.cls = grade;
    state.subject = subject;
    state.count = 10;
    renderSubjects();
    renderCounts();
    setCard("length");
    show("practice");
    $("practiceCrumb").textContent =
      CLASSES[grade].class + " / " + subject + " / Session settings";
  }
  async function library(query) {
    closeSettings();
    await Promise.all([legacy(), curriculum()]);
    openLibrary();
    if (query != null) {
      $("libQ").value = query;
      renderLibrary();
    }
    modalReturn = document.activeElement;
    setTimeout(() => $("libQ").focus({ preventScroll: true }), 30);
  }
  async function tool(id) {
    closeSettings();
    menu(false);
    await Promise.all([legacy(), bank()]);
    if (["notes", "cbt", "atlas", "tutor", "reels", "mock"].includes(id))
      await curriculum();
    if (["cbt", "atlas", "tutor", "reels"].includes(id))
      await Promise.all([
        load("quiz/syllabus_data.js"),
        load("quiz/curr_data.js"),
      ]);
    if (
      [
        "flash",
        "rapid",
        "spell",
        "s3",
        "mock",
        "backup",
        "report",
        "map",
      ].includes(id)
    )
      return openLab(id);
    if (["focus", "planner", "blitz", "quizme", "records"].includes(id))
      return labs(id);
    if (id === "reviews") {
      startReviews();
      return;
    }
    if (id === "notes") {
      notes();
      return;
    }
    if (id === "cbt") {
      edu("cbt");
      return;
    }
    if (id === "arcade") {
      arc("open");
      return;
    }
    const modules = {
      calc: ["quiz/calc.js", "__calcApi"],
      tutor: ["quiz/ai.js", "__aiApi"],
      atlas: ["quiz/atlas.js", "__atlasApi"],
      holo: ["quiz/holo.js", "__holo"],
      reels: ["quiz/reels.js", "__reelsApi"],
    };
    const mod = modules[id];
    if (!mod) throw new Error("This tool is unavailable.");
    await load(mod[0]);
    const api = window[mod[1]];
    if (!api || typeof api.open !== "function") {
      loads.delete(mod[0]);
      throw new Error(
        "This tool could not start. Please reload and try again.",
      );
    }
    api.open();
  }
  async function profile() {
    closeSettings();
    menu(false);
    await legacy();
    modalReturn = document.activeElement;
    if (user) {
      openAccount();
      return;
    }
    $("gateOverlay").classList.remove("hidden");
    $("gateName").focus({ preventScroll: true });
  }
  function closeProfile() {
    const wasOpen = !$("gateOverlay").classList.contains("hidden");
    $("gateOverlay").classList.add("hidden");
    if (wasOpen && modalReturn && modalReturn.focus)
      modalReturn.focus({ preventScroll: true });
  }
  async function googleSignIn() {
    window.__wantGoogle = true;
    await load("https://accounts.google.com/gsi/client");
    if (!window.google || !google.accounts)
      throw new Error(
        "Google sign-in is unavailable. A local profile works without it.",
      );
    renderGoogleBtn();
  }
  function render() {
    const name = user && user.name ? user.name.trim().split(/\s+/)[0] : "";
    $("studyAvatar").textContent = (name || "S").slice(0, 1).toUpperCase();
    $("profileButton").setAttribute(
      "aria-label",
      name ? "Open profile for " + name : "Create an optional study profile",
    );
    $("welcomeEyebrow").textContent = name
      ? "WELCOME BACK, " + name.toUpperCase()
      : "MATER MISERICORDIAE SECONDARY SCHOOL";
    $("todayDate").textContent = new Intl.DateTimeFormat("en-NG", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date());
    const history = attempts();
    const today = dstr(new Date()),
      days = store.get(qdayKey(), {}) || {},
      count = Math.max(0, Number(days[today]) || 0),
      target = goalTarget();
    $("todayCount").textContent = count;
    $("goalLabel").textContent = "/ " + target + " goal";
    $("goalMini").setAttribute(
      "d",
      "M2 22h" + Math.round(66 * Math.min(1, count / target)),
    );
    const streak = streakDays();
    $("streakCount").textContent = streak;
    $("streakNote").textContent = streak ? "Keep it growing" : "Start today";
    $("papersCount").textContent = history.length;
    const valid = history.filter(
      (p) => Number.isFinite(Number(p.pct)) && p.pct != null,
    );
    $("averageCount").textContent = valid.length
      ? Math.round(
          valid.reduce(
            (sum, p) => sum + Math.max(0, Math.min(100, Number(p.pct))),
            0,
          ) / valid.length,
        ) + "%"
      : "—";
    $("averageNote").textContent = valid.length
      ? "all papers"
      : "Your first awaits";
    const daily = dailyRecs()[today];
    $("dailyStatus").textContent = daily
      ? "Today’s best: " + (Number(daily.pct) || 0) + "% · Try again anytime"
      : "A new challenge, every day";
    const saved = readSession();
    $("studyResume").hidden = !saved;
    if (saved)
      $("studyResumeLabel").textContent =
        "SS" +
        (saved.cls + 1) +
        " · " +
        (saved.subject || "Mixed subjects") +
        " · " +
        saved.answers.filter((a) => a !== undefined).length +
        " of " +
        saved.quiz.length +
        " answered";
    let week = "",
      total = 0;
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const qty = Math.max(0, Number(days[dstr(day)]) || 0);
      total += qty;
      week +=
        '<div class="week-day' +
        (i === 0 ? " today" : "") +
        (qty ? " done" : "") +
        '" aria-label="' +
        safe(
          day.toLocaleDateString("en-NG", {
            weekday: "long",
            day: "numeric",
            month: "short",
          }),
        ) +
        ": " +
        qty +
        ' questions"><span>' +
        day.toLocaleDateString("en-NG", { weekday: "short" }) +
        '</span><span class="day-dot">' +
        (qty ? icon("check") : day.getDate()) +
        "</span></div>";
    }
    $("weekDays").innerHTML = week;
    $("weekTotal").textContent = total + " questions";
    document.querySelectorAll("[data-grade]").forEach((b) => {
      const active = +b.dataset.grade === grade;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    document
      .querySelectorAll(".subject-level")
      .forEach((el) => (el.textContent = "SS" + (grade + 1)));
    if (current === "progress") renderProgress();
    if (window.ATELIER) ATELIER.refresh();
  }
  function renderProgress() {
    const data = attempts()
      .filter((p) => p && Number.isFinite(Number(p.pct)))
      .slice(0, 200);
    if (!data.length) {
      $("progressContent").innerHTML =
        '<div class="progress-empty">' +
        icon("leaf") +
        '<h2>This is where your growth begins.</h2><p>Complete your first paper to see your scores, celebrate your strengths, and discover what to practise next. No made-up numbers. Just your progress.</p><button class="study-button primary" data-action="practice">Start your first session' +
        icon("arrow") +
        '</button></div><div class="progress-links"><button class="study-button secondary" data-tool="backup">Restore a backup</button><button class="study-button secondary" data-action="profile">Your local profile</button></div>';
      return;
    }
    const avg = Math.round(
        data.reduce(
          (n, p) => n + Math.max(0, Math.min(100, Number(p.pct) || 0)),
          0,
        ) / data.length,
      ),
      best = Math.max(
        ...data.map((p) => Math.max(0, Math.min(100, Number(p.pct) || 0))),
      );
    const questions = data.reduce(
      (n, p) => n + Math.max(0, Number(p.total) || 0),
      0,
    );
    const recent = data.slice(0, 8).reverse();
    $("progressContent").innerHTML =
      '<div class="progress-hero"><article class="progress-card"><p class="eyebrow">YOUR PRACTICE, IN PERSPECTIVE</p><h2>Every session adds up.</h2><div class="progress-summary"><div><strong>' +
      data.length +
      "</strong><span>Papers completed</span></div><div><strong>" +
      avg +
      "%</strong><span>Average score</span></div><div><strong>" +
      best +
      "%</strong><span>Personal best</span></div></div><p>" +
      questions.toLocaleString() +
      ' questions across your recorded papers. Keep showing up.</p></article><article class="progress-card"><p class="eyebrow">YOUR MOST RECENT PAPERS</p><h2>Keep building your confidence.</h2><div class="score-trend" role="img" aria-label="Recent scores, oldest to newest: ' +
      recent.map((p) => Number(p.pct) || 0).join(", ") +
      ' percent">' +
      recent
        .map(
          (p) =>
            '<div class="trend-bar" style="height:' +
            Math.max(3, Math.min(100, Number(p.pct) || 0)) +
            '%"><strong>' +
            Math.round(Number(p.pct) || 0) +
            "%</strong></div>",
        )
        .join("") +
      '</div></article></div><div class="history-table"><h2>Your recent sessions</h2><div class="history-scroll"><table><thead><tr><th scope="col">Paper</th><th scope="col">Class</th><th scope="col">Date</th><th scope="col">Score</th><th scope="col">Time</th></tr></thead><tbody>' +
      data
        .slice(0, 20)
        .map(
          (p) =>
            "<tr><td>" +
            safe(p.daily ? "Daily challenge" : p.subj || "Mixed subjects") +
            "</td><td>" +
            safe(p.cls || "—") +
            "</td><td>" +
            safe(
              p.tms
                ? new Date(p.tms).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                  })
                : p.d || "—",
            ) +
            '</td><td><span class="score-tag">' +
            Math.round(Number(p.pct) || 0) +
            "%</span></td><td>" +
            fmtT(Math.max(0, Number(p.t) || 0)) +
            "</td></tr>",
        )
        .join("") +
      '</tbody></table></div></div><div class="progress-links"><button class="study-button secondary" data-action="analytics">Detailed analytics</button><button class="study-button secondary" data-action="export">Export results</button><button class="study-button secondary" data-tool="report">Printable report</button><button class="study-button secondary" data-tool="backup">Back up progress</button></div>';
  }
  function renderTools(query = "") {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const group =
      document.querySelector('[data-tool-group][aria-pressed="true"]')?.dataset
        .toolGroup || "all";
    const matches = tools.filter(
      (row) =>
        (group === "all" || row[0] === group) &&
        terms.every((term) => row.join(" ").toLowerCase().includes(term)),
    );
    const groups = [...new Set(matches.map((t) => t[0]))];
    $("toolsContent").innerHTML = groups
      .map(
        (group) =>
          '<section class="tool-group"><h2>' +
          safe(group) +
          '</h2><div class="tools-grid">' +
          matches
            .filter((t) => t[0] === group)
            .map(
              (t) =>
                '<article class="tool-card"><button class="tool-open" data-tool="' +
                t[1] +
                '"><span class="subject-icon ' +
                t[3] +
                '">' +
                icon(t[2]) +
                '</span><span class="tool-copy"><strong>' +
                safe(t[4]) +
                '</strong><span class="tool-description">' +
                safe(t[5]) +
                "</span><small>" +
                safe(t[6]) +
                '</small></span></button><button class="pin-tool" data-pin-tool="' +
                t[1] +
                '" aria-label="Pin ' +
                safe(t[4]) +
                ' to quick tools" aria-pressed="false">☆</button></article>',
            )
            .join("") +
          "</div></section>",
      )
      .join("");
    if ($("toolCount"))
      $("toolCount").textContent =
        matches.length +
        " " +
        (matches.length === 1 ? "tool" : "tools") +
        (group === "all" ? " available" : " for " + group.toLowerCase());
    if (window.ATELIER) ATELIER.syncPins();
    $("toolsEmpty").hidden = !!matches.length;
  }
  function connection() {
    $("connectionDot").classList.toggle("offline", !navigator.onLine);
    $("connectionText").textContent = navigator.onLine
      ? "Your progress stays on this device"
      : "You’re offline. Keep learning.";
  }
  async function action(name) {
    if (titles[name]) return navigate(name);
    if (name === "daily") {
      await Promise.all([legacy(), curriculum()]);
      startDaily();
      show("practice");
      return;
    }
    if (name === "resume") {
      await Promise.all([legacy(), curriculum()]);
      openResume();
      show("practice");
      return;
    }
    if (name === "reset") {
      resetToClass();
      show("practice");
      return;
    }
    if (name === "library") return library();
    if (name === "theme") {
      applyTheme(
        document.documentElement.dataset.theme === "dark" ? "light" : "dark",
      );
      return;
    }
    if (name === "profile") return profile();
    if (name === "closeProfile") return closeProfile();
    if (name === "google") return googleSignIn();
    if (name === "settings") {
      $("shortcutDialog").hidden = false;
      modalReturn = document.activeElement;
      $("shortcutDialog")
        .querySelector("button")
        .focus({ preventScroll: true });
      return;
    }
    if (name === "closeSettings") {
      closeSettings();
      if (modalReturn) modalReturn.focus({ preventScroll: true });
      return;
    }
    if (name === "accessibility") {
      closeSettings();
      await legacy();
      a11yOpen();
      return;
    }
    if (name === "analytics") {
      await legacy();
      openHQ();
      return;
    }
    if (name === "export") {
      exportCSV();
      return;
    }
  }
  // Keep focus inside open dialogs, including legacy/lazy tools, without changing their logic.
  function visibleDialog() {
    const candidates = [
      ...document.querySelectorAll('[role="dialog"],.overlay'),
    ].filter(
      (el) =>
        !el.hidden &&
        !el.classList.contains("hidden") &&
        getComputedStyle(el).display !== "none" &&
        el.getBoundingClientRect().width,
    );
    return (
      candidates[candidates.length - 1] ||
      ($("sidebar").classList.contains("open") ? $("sidebar") : null)
    );
  }
  function wire() {
    document.addEventListener("click", (e) => {
      const nav = e.target.closest(".study-nav [data-view]");
      if (nav) {
        e.preventDefault();
        return actionBusy(null, () => navigate(nav.dataset.view));
      }
      const b = e.target.closest(
        "[data-action],[data-tool],[data-subject],[data-grade]",
      );
      if (!b) return;
      if (b.tagName === "A") e.preventDefault();
      if (b.dataset.grade != null) {
        grade = +b.dataset.grade;
        store.set("study_grade", grade);
        render();
        return;
      }
      actionBusy(b, () =>
        b.dataset.action
          ? action(b.dataset.action)
          : b.dataset.tool
            ? tool(b.dataset.tool)
            : startSubject(b.dataset.subject),
      );
    });
    $("menuButton").addEventListener("click", () =>
      menu(!$("sidebar").classList.contains("open")),
    );
    $("navShade").addEventListener("click", () => menu(false));
    $("quickSearch").addEventListener("submit", (e) => {
      e.preventDefault();
      actionBusy(null, () => library($("quickQuery").value));
    });
    $("quickSearch").addEventListener("click", (e) => {
      if (innerWidth <= 600) {
        e.preventDefault();
        actionBusy(null, () => library());
      }
    });
    $("toolSearch").addEventListener("input", (e) =>
      renderTools(e.target.value),
    );
    $("shortcutDialog").addEventListener("click", (e) => {
      if (e.target === $("shortcutDialog")) closeSettings();
    });
    $("gateOverlay").addEventListener("click", (e) => {
      if (e.target === $("gateOverlay")) closeProfile();
    });
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.target.closest?.("dialog.atelier-dialog")) return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          actionBusy(null, () => library());
          return;
        }
        if (e.key === "Escape") {
          menu(false);
          closeSettings();
          closeProfile();
          if (typeof closeOverlay === "function") closeOverlay();
          if (typeof closeLab === "function") closeLab();
        }
        if (
          (e.key === "Enter" || e.key === " ") &&
          e.target.matches('.lib-item[role="button"]')
        ) {
          e.preventDefault();
          libToggle(e.target);
        }
        if (e.key === "Tab") {
          const dialog = visibleDialog();
          if (!dialog) return;
          const items = [
            ...dialog.querySelectorAll(
              'button,a[href],input,select,textarea,[tabindex="0"]',
            ),
          ].filter(
            (el) =>
              !el.disabled &&
              el.getBoundingClientRect().width &&
              getComputedStyle(el).visibility !== "hidden",
          );
          if (!items.length) return;
          const first = items[0],
            last = items[items.length - 1];
          if (
            e.shiftKey &&
            (document.activeElement === first ||
              !dialog.contains(document.activeElement))
          ) {
            e.preventDefault();
            last.focus({ preventScroll: true });
          } else if (
            !e.shiftKey &&
            (document.activeElement === last ||
              !dialog.contains(document.activeElement))
          ) {
            e.preventDefault();
            first.focus({ preventScroll: true });
          }
        }
      },
      true,
    );
    window.addEventListener("popstate", () =>
      actionBusy(null, () =>
        navigate(location.hash.slice(1) || "overview", false),
      ),
    );
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    window.addEventListener("quizbank-updated", () => {
      render();
    });
    window.addEventListener("storage", () => render());
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) render();
    });
    document.querySelectorAll(".overlay").forEach((el) => {
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      if (!el.hasAttribute("aria-label"))
        el.setAttribute(
          "aria-label",
          (el.querySelector("h3") || {}).textContent || "Study tool",
        );
    });
  }
  window.STUDY = {
    tools,
    renderTools,
    startSubject,
    menu,
    get grade() {
      return grade;
    },
    setGrade(v) {
      grade = Math.max(0, Math.min(2, Number(v) || 0));
      store.set("study_grade", grade);
      render();
    },
    show,
    navigate,
    card,
    render,
    tool,
    profile,
    legacy,
    bank,
    load,
    curriculum,
    notify,
    closeProfile,
    library,
  };
  function init() {
    wire();
    render();
    renderTools();
    connection();
    menu(false);
    window
      .matchMedia("(max-width:800px)")
      .addEventListener("change", () => menu(false));
    const route = location.hash.slice(1);
    if (route && titles[route] && route !== "overview")
      actionBusy(null, () => navigate(route, false));
    else show("overview", false, false);
    // No compulsory account, no downloaded decoration, no background tool execution.
    document.body.classList.remove("gated");
    document.body.style.overflow = "";
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
