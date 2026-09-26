/* MAMSS PREP — School essentials (notice board, exam countdown, result check, WhatsApp help).
   Editable, no-code: see /notices.js. Built with plain DOM — no dependencies. */
(() => {
  "use strict";
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
    );

  const config = window.MSS_CONFIG || {};
  const notices = Array.isArray(window.MSS_NOTICES) ? window.MSS_NOTICES : [];

  function daysTo(iso) {
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return null;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.round((d - now) / 86400000);
  }

  function fmtDate(iso) {
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  }

  /* ---------- Section shell injected into the Overview ---------- */
  function buildSchoolSection() {
    const mount = document.getElementById("viewOverview");
    const anchor = mount && mount.querySelector(".bottom-grid");
    if (!mount || !anchor || document.getElementById("mssSchool")) return;

    // Notices (newest first, capped at 4)
    const list = [...notices]
      .sort((a, b) => (b.d || "").localeCompare(a.d || ""))
      .slice(0, 4)
      .map((n) =>
        `<li class="mss-note">
           <div class="mss-note-head"><time datetime="${esc(n.d)}">${esc(fmtDate(n.d))}</time>${n.tag ? `<span class="mss-tag">${esc(n.tag)}</span>` : ""}</div>
           <b>${esc(n.t)}</b>
           <p>${esc(n.b)}</p>
         </li>`,
      )
      .join("");

    const listHtml = list ||
      `<li class="mss-note mss-empty"><p>No announcements right now. Check back soon.</p></li>`;

    // Exam countdown
    const cds = (config.countdown || [])
      .map((c) => ({ ...c, days: daysTo(c.date) }))
      .filter((c) => c.days !== null && c.days >= -1)
      .slice(0, 3)
      .map((c) => {
        const state = c.days < 0 ? "today" : c.days <= 14 ? "soon" : "";
        const num = c.days < 0 ? "Today" : c.days === 0 ? "Today" : c.days;
        const unit = c.days > 1 ? "days" : c.days === 1 ? "day" : c.days < 0 ? "" : "";
        return `<div class="mss-cd ${state}">
                 <span class="mss-cd-num">${num}</span>
                 <span class="mss-cd-lbl">${esc(c.label)}${unit ? " · " + unit : ""}</span>
               </div>`;
      })
      .join("");

    const cdHtml = cds ||
      `<p class="mss-empty">Exam dates are added by the school.</p>`;

    const wa = String(config.whatsapp || "").replace(/[^0-9]/g, "");
    const waHref = wa
      ? `https://wa.me/${wa}?text=${encodeURIComponent(config.whatsappMessage || "")}`
      : "#";
    const resUrl = config.resultUrl || "#";

    const section = document.createElement("section");
    section.className = "mss-school";
    section.id = "mssSchool";
    section.setAttribute("aria-label", "School notices and exam information");
    section.innerHTML =
      `<div class="section-heading mss-school-head"><div><span class="eyebrow">SCHOOL DESK</span><h2>News, exams &amp; results.</h2></div></div>
       <div class="mss-grid">
         <article class="mss-panel mss-notices">
           <div class="mss-panel-head"><svg class="ico" aria-hidden="true"><use href="#i-bolt"></use></svg><h3>Notice board</h3></div>
           <ul class="mss-note-list">${listHtml}</ul>
           <p class="mss-hint">Announcements from the school office.</p>
         </article>
         <div class="mss-col">
           <article class="mss-panel mss-results">
             <div class="mss-panel-head"><svg class="ico" aria-hidden="true"><use href="#i-shield"></use></svg><h3>Check your result</h3></div>
             <p>Use the card PIN and serial number from the school to view full term results.</p>
             <a class="study-button primary" href="${esc(resUrl)}" target="_blank" rel="noopener">Open result portal<svg class="ico" aria-hidden="true"><use href="#i-up"></use></svg></a>
           </article>
           <article class="mss-panel mss-countdown">
             <div class="mss-panel-head"><svg class="ico" aria-hidden="true"><use href="#i-calendar"></use></svg><h3>Exam countdown</h3></div>
             <div class="mss-cd-row">${cdHtml}</div>
           </article>
         </div>
       </div>`;
    anchor.insertAdjacentElement("afterend", section);
  }

  /* ---------- Floating WhatsApp help button ---------- */
  function buildWhatsApp() {
    if (document.getElementById("mssWa")) return;
    const wa = String(config.whatsapp || "").replace(/[^0-9]/g, "");
    if (!wa) return;
    const a = document.createElement("a");
    a.id = "mssWa";
    a.className = "mss-wa";
    a.href = `https://wa.me/${wa}?text=${encodeURIComponent(config.whatsappMessage || "")}`;
    a.target = "_blank";
    a.rel = "noopener";
    a.title = "Chat the school on WhatsApp";
    a.setAttribute("aria-label", "Chat the school on WhatsApp");
    a.innerHTML = `<svg aria-hidden="true" viewBox="0 0 32 32" width="22" height="22"><path fill="#fff" d="M16.04 3C9.4 3 4 8.36 4 14.95c0 2.6.84 5.02 2.27 7.02L4.6 28.4l6.63-1.73a12.1 12.1 0 0 0 4.8 1.02h.01c6.63 0 12.03-5.36 12.03-11.95A11.9 11.9 0 0 0 16.04 3zm0 22.02h-.01a10 10 0 0 1-5.1-1.4l-.37-.22-3.78.99 1.01-3.68-.24-.39a9.92 9.92 0 0 1-1.53-5.37c0-5.5 4.5-9.98 10.04-9.98 2.68 0 5.2 1.04 7.1 2.93a9.9 9.9 0 0 1 2.94 7.07c0 5.5-4.5 9.97-10.05 9.97zm5.5-7.47c-.3-.15-1.77-.87-2.05-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.96 1.17-.18.2-.35.22-.65.08-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.64-.93-2.25-.24-.6-.48-.5-.67-.5l-.57-.02c-.2 0-.52.08-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.57-.35z"/></svg><span>School help</span>`;
    const style = document.createElement("style");
    style.id = "mssWaCss";
    style.textContent =
      `.mss-wa{position:fixed;right:14px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:98;display:inline-flex;align-items:center;gap:8px;min-height:42px;padding:8px 16px 8px 12px;border-radius:999px;background:#25d366;color:#fff;font-weight:700;font-size:.82rem;text-decoration:none;box-shadow:0 10px 24px -10px rgba(18,140,126,.5)}` +
      `.mss-wa:hover{transform:translateY(-2px)}` +
      `@media(max-width:640px){.mss-wa{right:10px;bottom:calc(78px + env(safe-area-inset-bottom));padding:9px 13px}.mss-wa span{display:none}}`;
    document.head.appendChild(style);
    /* v59 a11y: the floating link lives in a named complementary landmark so
       every bit of page content sits inside a landmark (axe "region"). */
    const land = document.createElement("aside");
    land.id = "mssWaLand";
    land.setAttribute("aria-label", "School help");
    land.appendChild(a);
    document.body.appendChild(land);
  }

  function init() {
    try { buildSchoolSection(); } catch (e) { /* never break the app */ }
    try { buildWhatsApp(); } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else setTimeout(init, 0);
})();
