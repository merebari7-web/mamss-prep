"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Zap, Keyboard, FileText, Map, Box, Timer, Save,
  Trophy, BarChart3, Brain, Medal, CalendarDays, Flame,
  Gamepad2, Clock, Target, Sparkles, ChevronRight, ArrowRight,
} from "lucide-react";
import { cx, getClientId } from "@/lib/utils";
import { nextExamDates, daysUntil, type SubjectInfo } from "@/lib/constants";

/* ────────── data ────────── */

const TOOLS = [
  {
    id: "flashcards", name: "Flashcards", icon: BookOpen, color: "#A78BFA",
    desc: "Flip cards · recall & lock in · mistake decks",
    href: "/study/flashcards",
  },
  {
    id: "rapid-fire", name: "Rapid Fire", icon: Zap, color: "#FBBF24",
    desc: "30–90 s sprints · beat your best streak",
    href: "/study/rapid-fire",
  },
  {
    id: "spelling-lab", name: "Spelling Lab", icon: Keyboard, color: "#34D399",
    desc: "Type the answer · spelling counts",
    href: "/study/spelling-lab",
  },
  {
    id: "report-card", name: "Report Card", icon: FileText, color: "#F87171",
    desc: "Printable progress · for parents & teachers",
    href: "/hq",
  },
  {
    id: "mastery-map", name: "Mastery Map", icon: Map, color: "#38BDF8",
    desc: "Topic heat-map · tap to drill weak spots",
    href: "/hq#mastery",
  },
  {
    id: "3d-shape-lab", name: "3D Shape Lab", icon: Box, color: "#7DD3FC",
    desc: "Rotate solids · live volume & surface area",
    href: "/tools#shapes",
  },
  {
    id: "mock-hall", name: "Mock Hall", icon: Timer, color: "#F472B6",
    desc: "Full timed exam · auto-submit · integrity watch",
    href: "/cbt",
  },
  {
    id: "backup-restore", name: "Backup & Restore", icon: Save, color: "#6EE7B7",
    desc: "Export or restore all your progress",
    href: "/hq#backup",
  },
  {
    id: "scholar-league", name: "Scholar League", icon: Trophy, color: "#FBBF24",
    desc: "Every account on this device, ranked",
    href: "/hq#league",
  },
  {
    id: "progress-hq", name: "Progress HQ", icon: BarChart3, color: "#C8F169",
    desc: "Heatmap · radar · trend · readiness",
    href: "/hq",
  },
  {
    id: "mistake-master", name: "Mistake Master", icon: Brain, color: "#F472B6",
    desc: "Spaced revision · lock in every gap",
    href: "/study/flashcards?mode=mistakes",
  },
  {
    id: "records-hall", name: "Records Hall", icon: Medal, color: "#F87171",
    desc: "Personal bests · fastest papers · streaks",
    href: "/hq#records",
  },
  {
    id: "exam-planner", name: "Exam Planner", icon: CalendarDays, color: "#38BDF8",
    desc: "A day-by-day plan to your exam date",
    href: "/tools#planner",
  },
  {
    id: "recall-blitz", name: "Recall Blitz", icon: Flame, color: "#E879F9",
    desc: "Answer before the options appear",
    href: "/study/rapid-fire?mode=recall",
  },
  {
    id: "quiz-me", name: "Quiz Me", icon: Gamepad2, color: "#FBBF24",
    desc: "Two players · pass the device · bragging rights",
    href: "/practice",
  },
  {
    id: "focus-lab", name: "Focus Lab", icon: Clock, color: "#F87171",
    desc: "Pomodoro timer · subject drill · today's minutes",
    href: "/study/focus",
  },
];

const QUOTES = [
  { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "Success is no accident. It is hard work, perseverance, learning, studying, sacrifice.", author: "Pelé" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { text: "Don't let what you cannot do interfere with what you can do.", author: "John Wooden" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
];

const WORDS = [
  { word: "Inherent", pos: "adjective", def: "existing as a permanent quality", eg: "Risk is inherent in every investment question." },
  { word: "Elucidate", pos: "verb", def: "to make something clear; explain", eg: "The teacher elucidated the concept of valency." },
  { word: "Diligent", pos: "adjective", def: "having or showing careful effort in work", eg: "A diligent student always reviews before exams." },
  { word: "Pragmatic", pos: "adjective", def: "dealing with things sensibly and realistically", eg: "Her pragmatic approach helped solve the equation." },
  { word: "Tenacious", pos: "adjective", def: "holding firmly; persistent", eg: "The tenacious scholar kept studying till dawn." },
  { word: "Eloquent", pos: "adjective", def: "fluent or persuasive in speaking or writing", eg: "She gave an eloquent speech at the debate." },
  { word: "Ubiquitous", pos: "adjective", def: "present, appearing, or found everywhere", eg: "Mobile phones are ubiquitous in modern society." },
];

/* ────────── component ────────── */

export default function StudyHall({ subjects }: { subjects: SubjectInfo[] }) {
  const { jamb, waec } = nextExamDates();
  const today = useMemo(() => new Date(), []);
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const quote = QUOTES[dayOfYear % QUOTES.length];
  const word = WORDS[dayOfYear % WORDS.length];

  const [examDate, setExamDate] = useState<string>("");
  const [examLabel, setExamLabel] = useState<string>("");
  const [showExamModal, setShowExamModal] = useState(false);

  // Load saved exam target
  useEffect(() => {
    const saved = localStorage.getItem("mamss-exam-target");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setExamDate(p.date ?? "");
        setExamLabel(p.label ?? "");
      } catch { /* ignore */ }
    }
  }, []);

  const saveExamTarget = () => {
    localStorage.setItem("mamss-exam-target", JSON.stringify({ date: examDate, label: examLabel }));
    setShowExamModal(false);
  };

  const examDays = examDate ? daysUntil(new Date(examDate)) : 0;
  const totalQ = subjects.reduce((a, s) => a + s.counts.total, 0);

  return (
    <main className="relative min-h-screen overflow-hidden pb-24 pt-20">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-20 [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">

        {/* ── header ── */}
        <header className="pb-6 pt-8">
          <div className="flex items-center gap-4">
            <Image src="/media/mamss-logo.png" alt="MAMSS" width={48} height={48} className="size-12 object-contain" />
            <div>
              <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
                Study Hall
              </h1>
              <p className="font-mono text-[11px] tracking-widest text-dim">
                MATER MISERICORDIAE SECONDARY SCHOOL · SS1–SS3
              </p>
            </div>
          </div>
        </header>

        {/* ── exam countdown banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 overflow-hidden rounded-2xl border border-line bg-gradient-to-r from-panel to-panel2 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <h2 className="font-display text-base font-bold">Exam countdown</h2>
                <p className="text-xs text-dim">
                  {examDate
                    ? `${examLabel || "Target exam"} — ${examDays} days left`
                    : "Set your target exam date and stay on pace"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* quick exam pills */}
              <div className="hidden flex-wrap gap-2 sm:flex">
                <span className="rounded-full bg-lime/15 px-3 py-1.5 font-mono text-[10px] font-bold text-lime">
                  WAEC {waec.getFullYear()} · {daysUntil(waec)}d
                </span>
                <span className="rounded-full bg-iris/15 px-3 py-1.5 font-mono text-[10px] font-bold text-iris">
                  JAMB {jamb.getFullYear()} · {daysUntil(jamb)}d
                </span>
              </div>
              <button
                onClick={() => setShowExamModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-ink px-4 py-2.5 text-xs font-bold transition-colors hover:border-lime hover:text-lime"
              >
                📅 Set exam date
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── tools grid ── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <p className="font-mono text-xs tracking-[0.3em] text-dim">STUDY TOOLS</p>
            <p className="font-mono text-[10px] text-dim tabular">{TOOLS.length} TOOLS AVAILABLE</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {TOOLS.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.5), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={t.href}
                  className="group flex h-full flex-col rounded-xl border border-line bg-panel p-5 transition-all hover:-translate-y-1 hover:border-white/25 hover:shadow-lg hover:shadow-black/20"
                >
                  <span
                    className="grid size-12 place-items-center rounded-xl"
                    style={{ backgroundColor: `${t.color}18`, color: t.color }}
                  >
                    <t.icon size={22} />
                  </span>
                  <h3 className="mt-3 font-display text-sm font-bold">{t.name}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-dim">{t.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── word + quote of the day ── */}
        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-line bg-panel p-5"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📘</span>
              <p className="font-mono text-[10px] tracking-widest text-dim">WORD OF THE DAY</p>
            </div>
            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              <h3 className="font-display text-2xl font-black text-lime">{word.word}</h3>
              <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] italic text-dim">
                ({word.pos})
              </span>
            </div>
            <p className="mt-2 text-sm text-paper/80">{word.def}</p>
            <p className="mt-2 rounded-lg border border-line bg-ink px-3 py-2 text-xs italic text-dim">
              &ldquo;{word.eg}&rdquo;
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-line bg-panel p-5"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <p className="font-mono text-[10px] tracking-widest text-dim">QUOTE OF THE DAY</p>
            </div>
            <blockquote className="mt-3 text-base font-semibold leading-relaxed text-paper/90">
              &ldquo;{quote.text}&rdquo;
            </blockquote>
            <p className="mt-3 text-xs text-dim">— {quote.author}</p>
          </motion.div>
        </section>

        {/* ── quick-launch tools bar ── */}
        <section className="mt-10">
          <p className="mb-4 font-mono text-xs tracking-[0.3em] text-dim">QUICK TOOLS</p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Periodic Table", icon: "🧪", href: "/tools#periodic" },
              { label: "Formula Vault", icon: "📐", href: "/tools#formulas" },
              { label: "Unit Converter", icon: "🔄", href: "/tools#converter" },
              { label: "Calculator", icon: "🔢", href: "/tools#calculator" },
              { label: "Mind Map", icon: "🧠", href: "/tools#mindmap" },
            ].map((t) => (
              <Link
                key={t.label}
                href={t.href}
                className="inline-flex items-center gap-2.5 rounded-full border border-line bg-panel px-5 py-3 text-sm font-semibold transition-all hover:border-lime/50 hover:bg-lime/5"
              >
                <span className="text-base">{t.icon}</span>
                {t.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ── SS1/SS2/SS3 class cards ── */}
        <section className="mt-10">
          <p className="mb-4 font-mono text-xs tracking-[0.3em] text-dim">CHOOSE YOUR CLASS</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {([
              { level: "SS1", label: "PRELIMINARY", color: "from-emerald-500 to-emerald-600", roman: "I" },
              { level: "SS2", label: "INTERMEDIATE", color: "from-blue-500 to-blue-600", roman: "II" },
              { level: "SS3", label: "ADVANCED", color: "from-pink-500 to-pink-600", roman: "III" },
            ] as const).map((c) => {
              const count = subjects.reduce((a, s) => a + s.counts[c.level], 0);
              return (
                <motion.div
                  key={c.level}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Link
                    href={`/practice?level=${c.level}`}
                    className={cx(
                      "relative flex flex-col items-center overflow-hidden rounded-2xl bg-gradient-to-br p-8 text-center text-white shadow-xl",
                      c.color,
                    )}
                  >
                    <div className="grid size-16 place-items-center rounded-full bg-black/25">
                      <span className="font-display text-xl font-black">{c.roman}</span>
                    </div>
                    <h3 className="mt-4 font-display text-2xl font-black">{c.level}</h3>
                    <p className="mt-1 text-xs text-white/70">{count} questions · {subjects.length} subjects</p>
                    <span className="mt-3 rounded-full border border-white/30 px-4 py-1.5 text-[10px] font-bold tracking-widest">
                      {c.label}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── stats footer ── */}
        <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {[
            { v: totalQ, l: "EXAM QUESTIONS", icon: "📝" },
            { v: subjects.length, l: "SUBJECTS", icon: "📚" },
            { v: Math.round(totalQ / subjects.length), l: "PER SUBJECT", icon: "🎯" },
            { v: 3, l: "CLASSES", icon: "🏫" },
            { v: 100, l: "% EXPLAINED", icon: "💡" },
            { v: 9, l: "TERMS", icon: "📋" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-line bg-panel p-4 text-center">
              <p className="text-lg">{s.icon}</p>
              <p className="font-display text-2xl font-black text-lime tabular">{s.v}</p>
              <p className="mt-1 font-mono text-[8px] tracking-widest text-dim">{s.l}</p>
            </div>
          ))}
        </section>
      </div>

      {/* ── exam date modal ── */}
      <AnimatePresence>
        {showExamModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowExamModal(false)}
            className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-line bg-panel p-7"
            >
              <p className="font-mono text-[10px] tracking-[0.3em] text-dim">SET YOUR TARGET</p>
              <h3 className="mt-2 font-display text-xl font-black">Exam countdown</h3>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dim">Exam name</label>
                  <input
                    value={examLabel}
                    onChange={(e) => setExamLabel(e.target.value)}
                    placeholder="e.g. WAEC SSCE 2027"
                    className="w-full rounded-lg border border-line bg-ink px-4 py-3 text-sm outline-none focus:border-lime"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-dim">Exam date</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full rounded-lg border border-line bg-ink px-4 py-3 text-sm outline-none focus:border-lime"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowExamModal(false)}
                    className="flex-1 rounded-xl border border-line py-3 text-sm font-bold text-dim hover:text-paper"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveExamTarget}
                    className="flex-1 rounded-xl bg-lime py-3 text-sm font-black text-ink hover:bg-lime2"
                  >
                    Save target
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
