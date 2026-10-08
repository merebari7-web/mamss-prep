"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, Brain, CalendarDays, CheckCircle2, ChevronRight, Copy, Flame,
  LayoutDashboard, Loader2, Lock, Timer, Trophy, XCircle,
} from "lucide-react";
import { cx, getClientId } from "@/lib/utils";

interface DailyQ {
  id: number;
  subjectSlug: string;
  level: string;
  topic: string;
  question: string;
  options: string[];
  difficulty: string;
}

interface ReviewRow {
  id: number;
  subjectSlug: string;
  topic: string;
  question: string;
  options: string[];
  selected: number | null;
  answerIndex: number;
  explanation: string;
  isRight: boolean;
}

const SUBJECT_SHORT: Record<string, string> = {
  mathematics: "MTH", english: "ENG", physics: "PHY", chemistry: "CHM", biology: "BIO",
  economics: "ECO", government: "GOV", literature: "LIT", "civic-education": "CVC",
};
const SUBJECT_COLORS: Record<string, string> = {
  mathematics: "#C8F169", english: "#7DD3FC", physics: "#A78BFA", chemistry: "#F472B6",
  biology: "#34D399", economics: "#FBBF24", government: "#F87171", literature: "#E879F9",
  "civic-education": "#38BDF8",
};

const LETTERS = ["A", "B", "C", "D"];

type Phase = "loading" | "intro" | "run" | "submitting" | "result" | "already";

export default function DailyRunner() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [date, setDate] = useState("");
  const [qs, setQs] = useState<DailyQ[]>([]);
  const [streak, setStreak] = useState(0);
  const [todayScore, setTodayScore] = useState<number | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ id: number; selected: number | null }[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{
    scorePct: number; correct: number; total: number; streak: number; review: ReviewRow[];
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const cid = getClientId();
    fetch(`/api/daily?clientId=${cid}`)
      .then((r) => r.json())
      .then((d) => {
        setDate(d.date ?? "");
        setQs(d.questions ?? []);
        setStreak(d.streak ?? 0);
        setTodayScore(d.todayScore ?? null);
        setPhase(d.completedToday ? "already" : "intro");
      })
      .catch(() => setPhase("intro"));
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (phase === "run") {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [phase]);

  const q = qs[idx];

  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    setAnswers((a) => [...a, { id: q.id, selected: i }]);
  }

  async function next() {
    if (idx < qs.length - 1) {
      setIdx(idx + 1);
      setPicked(null);
    } else {
      setPhase("submitting");
      try {
        const res = await fetch("/api/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: getClientId(), durationSec: elapsed, answers }),
        });
        const d = await res.json();
        setResult({ scorePct: d.scorePct, correct: d.correct, total: d.total, streak: d.streak, review: d.review ?? [] });
        setStreak(d.streak ?? 0);
        setPhase("result");
      } catch {
        setPhase("result");
      }
    }
  }

  const prettyDate = useMemo(() => {
    if (!date) return "";
    return new Date(date + "T00:00:00Z").toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
    });
  }, [date]);

  const verdict = useMemo(() => {
    if (!result) return null;
    const p = result.scorePct;
    if (p >= 80) return { txt: "Superb. Top of the class today.", Icon: Trophy, c: "text-lime" };
    if (p >= 60) return { txt: "Solid work. The engine will push harder tomorrow.", Icon: CheckCircle2, c: "text-lime" };
    if (p >= 40) return { txt: "Building. Read the explanations below carefully.", Icon: Brain, c: "text-amber-300" };
    return { txt: "Today was rough — but the streak grows by showing up.", Icon: Flame, c: "text-coral" };
  }, [result]);

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 pb-16 pt-24 sm:px-6">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-25 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]" />
      <div className="relative w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {/* ── loading ── */}
          {phase === "loading" && (
            <motion.div key="load" exit={{ opacity: 0 }} className="grid place-items-center py-24">
              <Loader2 size={28} className="animate-spin text-lime" />
            </motion.div>
          )}

          {/* ── intro ── */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="rounded-3xl border border-line bg-panel p-8 text-center sm:p-12"
            >
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-lime/10">
                <Flame size={32} className="text-lime" />
              </span>
              <p className="mt-6 flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.3em] text-dim">
                <CalendarDays size={12} /> {prettyDate.toUpperCase()}
              </p>
              <h1 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-4xl">
                Daily <span className="text-lime">Challenge</span>
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-sm text-dim">
                {qs.length} questions, one shot, the same paper for the whole school today.
                Answer every day to grow your streak.
              </p>
              <div className="mx-auto mt-6 flex w-fit items-center gap-4 rounded-full border border-line px-5 py-2.5">
                <span className="flex items-center gap-1.5 font-mono text-xs text-amber-300">
                  <Flame size={13} /> {streak}d streak
                </span>
                <span className="h-3 w-px bg-line" />
                <span className="font-mono text-xs text-dim">mixed subjects</span>
                <span className="h-3 w-px bg-line" />
                <span className="font-mono text-xs text-dim">untimed</span>
              </div>
              <button
                onClick={() => setPhase("run")}
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-lime px-8 py-4 font-display text-sm font-black text-ink transition-all hover:bg-lime2 hover:shadow-[0_0_32px_rgba(200,241,105,0.35)]"
              >
                Start today&apos;s paper
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
            </motion.div>
          )}

          {/* ── already done ── */}
          {phase === "already" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-line bg-panel p-8 text-center sm:p-12"
            >
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-lime/10">
                <Lock size={28} className="text-lime" />
              </span>
              <h1 className="mt-6 font-display text-2xl font-black sm:text-3xl">Paper locked in</h1>
              <p className="mx-auto mt-3 max-w-sm text-sm text-dim">
                You scored <span className="font-bold text-lime">{todayScore}%</span> on today&apos;s challenge.
                A fresh paper unlocks at midnight — your streak is safe.
              </p>
              <div className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/5 px-4 py-2 font-mono text-xs text-amber-300">
                <Flame size={13} /> {streak}-day streak
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/practice?mode=smart" className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-bold text-ink hover:bg-lime2">
                  <Brain size={15} /> Smart drill meanwhile
                </Link>
                <Link href="/hq" className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-bold hover:border-lime/40">
                  <LayoutDashboard size={15} /> Progress HQ
                </Link>
              </div>
            </motion.div>
          )}

          {/* ── runner ── */}
          {(phase === "run" || phase === "submitting") && q && (
            <motion.div key="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {qs.map((_, i) => (
                    <span
                      key={i}
                      className={cx(
                        "h-1.5 rounded-full transition-all",
                        i < idx ? "w-6 bg-lime" : i === idx ? "w-10 bg-lime shadow-[0_0_10px_rgba(200,241,105,0.5)]" : "w-6 bg-white/10",
                      )}
                    />
                  ))}
                </div>
                <span className="flex items-center gap-1.5 font-mono text-xs text-dim tabular">
                  <Timer size={13} /> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-3xl border border-line bg-panel p-6 sm:p-8"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 font-mono text-[10px] font-black"
                      style={{ backgroundColor: `${SUBJECT_COLORS[q.subjectSlug]}1f`, color: SUBJECT_COLORS[q.subjectSlug] }}
                    >
                      {SUBJECT_SHORT[q.subjectSlug] ?? q.subjectSlug.toUpperCase()}
                    </span>
                    <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-dim">{q.topic}</span>
                    <span className={cx(
                      "rounded-md px-2 py-0.5 font-mono text-[10px] font-bold",
                      q.difficulty === "easy" ? "bg-lime/10 text-lime" : q.difficulty === "hard" ? "bg-coral/10 text-coral" : "bg-amber-400/10 text-amber-300",
                    )}>
                      {q.difficulty.toUpperCase()}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-dim">Q{idx + 1}/{qs.length}</span>
                  </div>

                  <h2 className="mt-5 text-lg font-bold leading-snug sm:text-xl">{q.question}</h2>

                  <div className="mt-6 space-y-2.5">
                    {q.options.map((opt, i) => {
                      const isPicked = picked === i;
                      return (
                        <button
                          key={i}
                          onClick={() => pick(i)}
                          disabled={picked !== null}
                          className={cx(
                            "flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm transition-all",
                            isPicked
                              ? "border-lime bg-lime/10 shadow-[0_0_20px_rgba(200,241,105,0.12)]"
                              : picked !== null
                                ? "border-line opacity-45"
                                : "border-line hover:border-white/30 hover:bg-white/5",
                          )}
                        >
                          <span className={cx(
                            "grid size-7 shrink-0 place-items-center rounded-lg font-mono text-xs font-bold",
                            isPicked ? "bg-lime text-ink" : "bg-white/5 text-dim",
                          )}>
                            {LETTERS[i]}
                          </span>
                          <span className="font-medium">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={next}
                      disabled={picked === null || phase === "submitting"}
                      className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-bold text-ink transition-all hover:bg-lime2 disabled:opacity-30"
                    >
                      {phase === "submitting" ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : idx === qs.length - 1 ? "Submit paper" : "Next"}
                      {phase !== "submitting" && <ChevronRight size={15} />}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── result ── */}
          {phase === "result" && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="rounded-3xl border border-line bg-panel p-8 text-center sm:p-10">
                {verdict && <verdict.Icon size={40} className={cx("mx-auto", verdict.c)} />}
                <p className="mt-4 font-display text-6xl font-black tabular">
                  {result?.scorePct ?? 0}<span className="text-2xl text-dim">%</span>
                </p>
                <p className="mt-1 font-mono text-xs text-dim">
                  {result?.correct ?? 0} of {result?.total ?? qs.length} correct · {Math.floor(elapsed / 60)}m {elapsed % 60}s
                </p>
                <p className="mt-3 text-sm font-bold">{verdict?.txt}</p>
                <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/5 px-4 py-2 font-mono text-xs text-amber-300">
                  <Flame size={13} /> streak now {(result?.streak ?? streak)} day{(result?.streak ?? streak) === 1 ? "" : "s"}
                </div>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        `MAMSS Prep Daily Challenge ${date}: ${result?.scorePct ?? 0}% (${result?.correct}/${result?.total}) — streak ${result?.streak ?? streak}d`,
                      );
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-bold hover:border-lime/40"
                  >
                    <Copy size={14} /> {copied ? "Copied!" : "Copy result"}
                  </button>
                  <Link href="/practice?mode=smart" className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-bold text-ink hover:bg-lime2">
                    <Brain size={15} /> Keep drilling
                  </Link>
                </div>
              </div>

              {result && result.review.length > 0 && (
                <div className="mt-6 rounded-3xl border border-line bg-panel p-6 sm:p-8">
                  <h3 className="flex items-center gap-2 font-display text-sm font-black tracking-wide">
                    <CheckCircle2 size={16} className="text-lime" /> WORKED ANSWERS
                  </h3>
                  <div className="mt-5 space-y-4">
                    {result.review.map((r, i) => (
                      <div key={r.id} className="rounded-2xl border border-line bg-ink p-5">
                        <div className="flex items-start gap-3">
                          {r.isRight ? (
                            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-lime" />
                          ) : (
                            <XCircle size={18} className="mt-0.5 shrink-0 text-coral" />
                          )}
                          <div>
                            <p className="font-mono text-[10px] text-dim">
                              Q{i + 1} · {SUBJECT_SHORT[r.subjectSlug]} · {r.topic}
                            </p>
                            <p className="mt-1 text-sm font-bold">{r.question}</p>
                            <p className="mt-2 text-xs">
                              <span className="text-dim">Answer: </span>
                              <span className="font-bold text-lime">{r.options[r.answerIndex]}</span>
                              {!r.isRight && r.selected !== null && (
                                <span className="text-coral"> · you picked {r.options[r.selected]}</span>
                              )}
                            </p>
                            <p className="mt-2 rounded-lg bg-white/5 p-3 text-xs leading-relaxed text-dim">{r.explanation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
