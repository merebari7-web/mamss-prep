/* v45 studio enhancements. The original question, answer and progress engine is unchanged. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const icon = (name) =>
    '<svg class="ico" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const safe = (value) =>
    String(value).replace(
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
  let commands = [],
    matches = [],
    active = -1;
  const defaultPins = ["notes", "flash", "focus"];
  const pinsKey = () => "study_pins_v1_" + uid();
  function pins() {
    const raw = store.get(pinsKey(), null);
    return Array.isArray(raw)
      ? [
          ...new Set(raw.filter((id) => STUDY.tools.some((t) => t[1] === id))),
        ].slice(0, 6)
      : defaultPins.slice();
  }
  function syncPins() {
    const selected = pins();
    document.querySelectorAll("[data-pin-tool]").forEach((button) => {
      const row = STUDY.tools.find((t) => t[1] === button.dataset.pinTool),
        on = selected.includes(button.dataset.pinTool);
      button.setAttribute("aria-pressed", String(on));
      button.setAttribute(
        "aria-label",
        (on ? "Unpin " : "Pin ") +
          row[4] +
          (on ? " from" : " to") +
          " quick tools",
      );
      button.textContent = on ? "★" : "☆";
    });
    const holder = $("pinnedTools");
    if (!holder) return;
    // Avoid replacing the element which currently owns keyboard focus.
    const signature = uid() + ":" + selected.join(",");
    if (holder.dataset.signature === signature) return;
    holder.dataset.signature = signature;
    holder.innerHTML = selected.length
      ? selected
          .map((id) => {
            const t = STUDY.tools.find((t) => t[1] === id);
            return (
              '<button data-tool="' +
              id +
              '">' +
              icon(t[2]) +
              "<span>" +
              safe(t[4]) +
              "</span></button>"
            );
          })
          .join("")
      : '<span class="pinned-empty">Pin a favourite from the toolkit to put it here.</span>';
  }
  function refresh() {
    syncPins();
    const questions =
      typeof CLASSES !== "undefined" && CLASSES[STUDY.grade]?.questions;
    if (questions)
      document
        .querySelectorAll("#featuredSubjects [data-subject]")
        .forEach((card) => {
          const label = card.querySelector(".subject-footer>span");
          if (label)
            label.textContent =
              questions.filter((q) => q.s === card.dataset.subject).length +
              " questions";
        });
    const edit = document.querySelector('[data-studio="goal"]');
    if (edit)
      edit.setAttribute(
        "aria-label",
        "Edit goal, currently " + goalTarget() + " questions",
      );
  }
  function openDialog(id) {
    STUDY.menu(false);
    const dialog = $(id);
    dialog.studioReturn = document.activeElement;
    dialog.studioRestore = true;
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add("studio-dialog-open");
  }
  function closeDialog(id, restore = true) {
    $(id).studioRestore = restore;
    $(id).close();
  }
  function renderSubjects() {
    const grade = Number($("studioGrade").value),
      questions = CLASSES[grade]?.questions || [],
      selected = $("studioSubject").value;
    const subjects = [...new Set(questions.map((q) => q.s))].sort((a, b) =>
      a.localeCompare(b),
    );
    $("studioSubject").replaceChildren(
      ...subjects.map((name) => {
        const o = document.createElement("option");
        o.value = name;
        o.textContent = name;
        return o;
      }),
    );
    if (subjects.includes(selected)) $("studioSubject").value = selected;
    else if (subjects.includes("Mathematics"))
      $("studioSubject").value = "Mathematics";
    renderCounts();
  }
  function renderCounts() {
    const available =
      CLASSES[Number($("studioGrade").value)]?.questions.filter(
        (q) => q.s === $("studioSubject").value,
      ).length || 0;
    const previous = Number($("studioCount").value),
      choices = [
        ...new Set(
          [10, 20, 50, available].filter((n) => n > 0 && n <= available),
        ),
      ];
    $("studioCount").replaceChildren(
      ...choices.map((n) => {
        const o = document.createElement("option");
        o.value = String(n);
        o.textContent =
          n + " questions" + (n === available ? " · all available" : "");
        return o;
      }),
    );
    if (choices.includes(previous)) $("studioCount").value = String(previous);
    summary();
  }
  function summary() {
    const form = $("sessionForm");
    $("studioSummary").textContent =
      "SS" +
      (Number($("studioGrade").value) + 1) +
      " · " +
      $("studioSubject").value +
      " · " +
      $("studioCount").value +
      " questions · " +
      (form.elements.studioMode.value === "exam"
        ? "Timed examination"
        : "Learn as you go");
  }
  async function designer() {
    await STUDY.curriculum();
    $("studioGrade").value = String(STUDY.grade);
    renderSubjects();
    openDialog("sessionDesigner");
  }
  function goal() {
    const n = goalTarget();
    $("studioGoal").value = n;
    syncGoalButtons();
    openDialog("goalDesigner");
  }
  function syncGoalButtons() {
    document
      .querySelectorAll("[data-goal]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(Number(b.dataset.goal) === Number($("studioGoal").value)),
        ),
      );
  }
  function focusView() {
    const root = document.documentElement,
      on = !root.classList.contains("studio-focus");
    root.classList.toggle("studio-focus", on);
    document.querySelectorAll(".focus-view-toggle").forEach((b) => {
      b.setAttribute("aria-pressed", String(on));
      b.querySelector("span").textContent = on
        ? "Exit focus view"
        : "Focus view";
    });
    STUDY.notify(
      on
        ? "Focus view on. Your paper and progress are unchanged."
        : "Full workspace restored.",
    );
  }
  function buildCommands() {
    commands = [
      {
        name: "Home overview",
        group: "Workspace",
        icon: "grid",
        words: "home dashboard",
        run: () => STUDY.navigate("overview"),
      },
      {
        name: "Choose a practice paper",
        group: "Workspace",
        icon: "book",
        words: "practice questions subjects class",
        run: () => STUDY.navigate("practice"),
      },
      {
        name: "My progress",
        group: "Workspace",
        icon: "chart",
        words: "scores results history analytics",
        run: () => STUDY.navigate("progress"),
      },
      {
        name: "Study toolkit",
        group: "Workspace",
        icon: "tools",
        words: "all tools",
        run: () => STUDY.navigate("tools"),
      },
      {
        name: "Design a study session",
        group: "Make it yours",
        icon: "spark",
        words: "start maths mathematics english exam subject class",
        run: designer,
      },
      {
        name: "Set a daily goal",
        group: "Make it yours",
        icon: "check",
        words: "target questions habit goal",
        run: goal,
      },
      {
        name: "Search the question library",
        group: "Study",
        icon: "search",
        words: "find questions answers",
        run: () => STUDY.library(),
      },
      {
        name: "Switch light / dark appearance",
        group: "Make it yours",
        icon: "moon",
        words: "theme night light dark",
        run: () =>
          applyTheme(
            document.documentElement.dataset.theme === "dark"
              ? "light"
              : "dark",
          ),
      },
      ...STUDY.tools.map((t) => ({
        name: t[4],
        group: t[0],
        icon: t[2],
        words: t.join(" "),
        run: () => STUDY.tool(t[1]),
      })),
    ];
  }
  function renderCommands() {
    const words = $("commandQuery")
      .value.toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    matches = commands.filter((c) =>
      words.every((w) =>
        (c.name + " " + c.group + " " + c.words).toLowerCase().includes(w),
      ),
    );
    active = matches.length ? 0 : -1;
    $("commandStatus").textContent =
      matches.length +
      " " +
      (matches.length === 1 ? "destination" : "destinations") +
      " · nothing is sent online";
    $("commandResults").innerHTML = matches.length
      ? matches
          .map(
            (c, i) =>
              '<button class="command-result' +
              (i === 0 ? " command-active" : "") +
              '" data-command="' +
              i +
              '">' +
              icon(c.icon) +
              "<span><b>" +
              safe(c.name) +
              "</b><small>" +
              safe(c.group) +
              "</small></span></button>",
          )
          .join("")
      : '<p class="command-empty">No matches. Try “notes”, “focus” or “practice”.</p>';
  }
  function palette() {
    const busyDialog = [
      ...document.querySelectorAll('[role="dialog"],.overlay'),
    ].some(
      (el) =>
        !el.hidden &&
        !el.classList.contains("hidden") &&
        el.getBoundingClientRect().width,
    );
    if (busyDialog) {
      STUDY.notify("Close your current tool before opening quick commands.");
      return;
    }
    buildCommands();
    $("commandQuery").value = "";
    renderCommands();
    openDialog("commandDialog");
    $("commandQuery").focus({ preventScroll: true });
  }
  async function runCommand(index) {
    const item = matches[index];
    if (!item) return;
    closeDialog("commandDialog", false);
    await item.run();
  }
  async function busy(button, fn) {
    if (button?.disabled) return;
    if (button) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    }
    try {
      await fn();
    } catch (error) {
      STUDY.notify(error.message || "This could not open. Please try again.");
    } finally {
      if (button) {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    }
  }
  function init() {
    window.ATELIER = {
      pins,
      syncPins,
      refresh,
      designer,
      palette,
      goal,
      focusView,
    };
    refresh();
    $("closeSidebar").addEventListener("click", () => STUDY.menu(false));
    document.addEventListener("click", (e) => {
      const close = e.target.closest("[data-close-studio]");
      if (close) return closeDialog(close.dataset.closeStudio);
      const b = e.target.closest("[data-studio]");
      if (b) {
        const actions = {
          session: designer,
          commands: palette,
          goal,
          focus: focusView,
        };
        return busy(b, actions[b.dataset.studio]);
      }
      const pin = e.target.closest("[data-pin-tool]");
      if (pin) {
        const id = pin.dataset.pinTool,
          list = pins(),
          on = list.includes(id);
        if (!on && list.length >= 6) {
          STUDY.notify("You can pin up to six tools. Unpin one to make room.");
          return;
        }
        store.set(pinsKey(), on ? list.filter((x) => x !== id) : [...list, id]);
        syncPins();
        STUDY.notify(
          on
            ? "Tool removed from your shortcuts."
            : "Tool pinned to your home shortcuts.",
        );
        return;
      }
      const group = e.target.closest("[data-tool-group]");
      if (group) {
        document
          .querySelectorAll("[data-tool-group]")
          .forEach((b) => b.setAttribute("aria-pressed", String(b === group)));
        STUDY.renderTools($("toolSearch").value);
        return;
      }
      const preset = e.target.closest("[data-goal]");
      if (preset) {
        $("studioGoal").value = preset.dataset.goal;
        syncGoalButtons();
        return;
      }
      const command = e.target.closest("[data-command]");
      if (command)
        busy(command, () => runCommand(Number(command.dataset.command)));
    });
    document.querySelectorAll(".atelier-dialog").forEach((dialog) => {
      dialog.addEventListener("close", () => {
        if (!document.querySelector(".atelier-dialog[open]"))
          document.documentElement.classList.remove("studio-dialog-open");
        if (
          dialog.studioRestore &&
          !document.querySelector(".atelier-dialog[open]") &&
          dialog.studioReturn?.isConnected &&
          dialog.studioReturn.getClientRects().length
        )
          dialog.studioReturn.focus({ preventScroll: true });
      });
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) {
          const r = dialog.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            dialog.close();
        }
      });
    });
    $("studioGrade").addEventListener("change", renderSubjects);
    $("studioSubject").addEventListener("change", renderCounts);
    $("sessionForm").addEventListener("change", summary);
    $("sessionForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const grade = Number($("studioGrade").value),
        subject = $("studioSubject").value,
        count = Number($("studioCount").value),
        exam = e.target.elements.studioMode.value === "exam";
      if (!subject || !count) return;
      busy(e.submitter, async () => {
        STUDY.setGrade(grade);
        await STUDY.startSubject(subject);
        state.count = count;
        window.renderCounts();
        $("examToggle").checked = exam;
        closeDialog("sessionDesigner", false);
        $("practiceCrumb").textContent =
          "SS" + (grade + 1) + " / " + subject + " / Your session settings";
        $("step-length").setAttribute("tabindex", "-1");
        $("step-length").focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: "instant" });
      });
    });
    $("studioGoal").addEventListener("input", syncGoalButtons);
    $("goalForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const n = Number($("studioGoal").value);
      if (!Number.isInteger(n) || n < 1 || n > 500) return;
      store.set(goalKey(), { ...(store.get(goalKey(), {}) || {}), target: n });
      STUDY.render();
      closeDialog("goalDesigner");
      STUDY.notify("Daily goal set to " + n + " questions. Small steps count.");
    });
    $("commandQuery").addEventListener("input", renderCommands);
    document.addEventListener(
      "keydown",
      (e) => {
        const open = document.querySelector(".atelier-dialog[open]");
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
          e.preventDefault();
          if (!open) palette();
          return;
        }
        if (!open) return;
        // Do not let practice shortcuts answer a question behind a studio dialog.
        e.stopImmediatePropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          open.close();
          return;
        }
        if (open.id !== "commandDialog") return;
        if (["ArrowDown", "ArrowUp"].includes(e.key) && matches.length) {
          e.preventDefault();
          const selected = e.target.closest("[data-command]");
          if (selected) active = Number(selected.dataset.command);
          else active = e.key === "ArrowDown" ? -1 : 0;
          active =
            (active + (e.key === "ArrowDown" ? 1 : -1) + matches.length) %
            matches.length;
          const items = [
            ...$("commandResults").querySelectorAll("[data-command]"),
          ];
          items.forEach((b, i) =>
            b.classList.toggle("command-active", i === active),
          );
          items[active].focus({ preventScroll: true });
          items[active].scrollIntoView({ block: "nearest" });
        }
        if (e.key === "Enter" && e.target === $("commandQuery")) {
          e.preventDefault();
          busy(null, () => runCommand(active));
        }
      },
      true,
    );
    window.addEventListener("study:view", (e) => {
      if (
        e.detail !== "practice" &&
        document.documentElement.classList.contains("studio-focus")
      )
        focusView();
    });
    // Dates, history, marks and goal values always come from the existing engine.
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/* ── v63 "Anywhere" — offline awareness, update notice, storage persistence ──
   The app has always worked from the device; v63 makes that visible and
   keeps the offline cache from being evicted by a full phone.            */
(() => {
  "use strict";
  var strip = null;
  function ensureStrip() {
    if (strip && strip.isConnected) return strip;
    strip = document.createElement("div");
    strip.id = "mpNetStrip";
    strip.setAttribute("role", "status");
    strip.hidden = true;
    (document.body || document.documentElement).appendChild(strip);
    return strip;
  }
  function paint() {
    var s = ensureStrip();
    if (window.__mpSwUpdate) {
      s.hidden = false;
      s.className = "mp-net-strip mp-net-update";
      s.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-bolt"></use></svg>' +
        "<span>A fresh edition of MAMSS PREP is ready.</span>" +
        '<button type="button" id="mpNetReload">Reload now</button>';
      var b = document.getElementById("mpNetReload");
      if (b) b.onclick = function () { window.location.reload(); };
      return;
    }
    if (navigator.onLine === false) {
      s.hidden = false;
      s.className = "mp-net-strip mp-net-off";
      s.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-cloud"></use></svg>' +
        "<span>Offline — everything you have studied stays on this device; new progress reports file themselves when you reconnect.</span>";
      return;
    }
    s.hidden = true;
    s.innerHTML = "";
  }
  function init() {
    window.addEventListener("online", paint);
    window.addEventListener("offline", paint);
    if ("serviceWorker" in navigator) {
      if (navigator.serviceWorker.controller) window.__mpSwHadController = true;
      navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (window.__mpSwHadController) { window.__mpSwUpdate = true; }
        paint();
      });
      navigator.serviceWorker.getRegistration().then(function (reg) {
        if (!reg) return;
        reg.addEventListener("updatefound", function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", function () {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              window.__mpSwUpdate = true;
              paint();
            }
          });
        });
      }).catch(function () {});
    }
    try {
      if (navigator.storage && navigator.storage.persist && !localStorage.getItem("nssc_persist")) {
        navigator.storage.persist().then(function (ok) {
          try { localStorage.setItem("nssc_persist", ok ? "1" : "0"); } catch (e) {}
        }).catch(function () {});
      }
    } catch (e) {}
    paint();
  }
  window.MAMSS_NET = {
    paint: paint,
    showUpdate: function () { window.__mpSwUpdate = true; paint(); },
    clearUpdate: function () { window.__mpSwUpdate = false; paint(); }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else setTimeout(init, 0);
})();
