/* ============================================================
   MAMSS PREP — SCHOOL SETTINGS & NOTICE BOARD
   ------------------------------------------------------------
   HOW TO EDIT (no coding needed):
   - Change the WhatsApp number or the result-check link below.
   - Add / remove notices in MSS_NOTICES. Each notice needs:
       d : date as "YYYY-MM-DD"   (shown on the card)
       t : title                  (short heading)
       b : body                   (one or two sentences)
       tag: optional badge text   (e.g. "Exam", "Notice", "Urgent")
   - Save the file, commit, and the site updates automatically.
   ============================================================ */
window.MSS_CONFIG = {
  /* The school's online result-check portal. */
  resultUrl: "https://myschoolz-001-site16.rtempurl.com/materresults/",
  /* School WhatsApp (digits only, country code first). */
  whatsapp: "2349076179998",
  /* Pre-filled message students/parents send when they tap Help. */
  whatsappMessage: "Hello Mater Misericordiae Secondary School! Please I need help with the school portal / results.",
  /* Upcoming milestones shown in the Exam Countdown card (max 3). */
  countdown: [
    { label: "JAMB UTME",     date: "2027-04-24" },
    { label: "WAEC (WASSCE)", date: "2027-05-04" },
    { label: "1st Term Exams", date: "2026-12-08" }
  ]
};

window.MSS_NOTICES = [
  {
    d: "2026-09-20",
    t: "Online result portal is live",
    b: "Parents and guardians can now check full term results online using the card PIN and serial number from the school.",
    tag: "Notice"
  },
  {
    d: "2026-10-12",
    t: "WAEC & JAMB registration",
    b: "SS3 students: complete your UTME and WASSCE registration with your form master before the deadline.",
    tag: "Exam"
  },
  {
    d: "2026-11-03",
    t: "SS3 mock examination",
    b: "Mock exams begin for SS3. Prepare with the CBT Hall and the Mock examination tool right here on MAMSS Prep.",
    tag: "Exam"
  },
  {
    d: "2026-12-08",
    t: "First term examinations",
    b: "Time-table will be shared by form masters. Revise each subject using the practice papers before exam week.",
    tag: "Exam"
  }
];
