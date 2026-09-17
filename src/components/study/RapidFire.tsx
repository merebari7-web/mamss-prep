"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Flame, Loader2, RotateCcw, X, Zap } from "lucide-react";
import { cx, shuffle } from "@/lib/utils";
import { formatClock, type SubjectInfo } from "@/lib/constants";

interface Q {
  id: number;
  question: string;
  options: string[];
  answerIndex: number;
  topic: string;
}

const LETTERS = ["A", "B", "C", "D"];

export default function RapidFire({ subjects }: { subjects: SubjectInfo[] }) {
  const [subject, setSubject] = useState("mathematics");
  const [level, setLevel] = useState("SS2");
  const [seconds, setSeconds] = useState(60);
  const [phase, setPhase] = useState<"setup" | "loading" | "run" | "done">("setup");
  const [qs, setQs] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [flash, setFlash] = useState<"right" | "wrong" | null>(null);

  const q = qs[idx];

  const begin = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await fetch(`/api/questions?subject=${subject}&level=${level}&limit=30&mode=practice`);
      const data = await res.json();
      const rows: Q[] = shuffle((data.questions ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as number,
        question: r.question as string,
        options: r.options as string[],
        answerIndex: r.answerIndex as number,
        topic: r.topic as string,
      })));
      if (rows.length === 0) { setPhase("setup"); return; }
      setQs(rows);
      setIdx(0);
      setCorrect(0);
      setWrong(0);
      setStreak(0);
      setBestStreak(0);
      setRemaining(seconds);
      setPhase("run");
    } catch {
      setPhase("setup");
    }
  }, [subject, level, seconds]);

  // countdown
  useEffect(() => {
    if (phase !== "run") return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(t); setPhase("done"); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const pick = (oi: number) => {
    if (phase !== "run" || !q) return;
    const isRight = oi === q.answerIndex;
    if (isRight) {
      setCorrect((c) => c + 1);
      setStreak((s) => { const ns = s + 1; setBestStreak((b) => Math.max(b, ns)); return ns; });
    } else {
      setWrong((w) => w + 1);
      setStreak(0);
    }
    setFlash(isRight ? "right" : "wrong");
    setTimeout(() => {
      setFlash(null);
      if (idx + 1 < qs.length) setIdx(idx + 1);
      else setPhase("done");
    }, 300);
  };

  // keyboard A-D
  useEffect(() => {
    if (phase !== "run") return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
      const k = e.key.toUpperCase();
      if (k in map) pick(map[k]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx, q]);

  const meta = subjects.find((s) => s.slug === subject);

  if (phase === "setup" || phase === "loading") {
    return (
      <main className="relative min-h-screen px-4 pb-24 pt-28 sm:px-6">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-line bg-panel p-6">
            <p className="font-mono text-xs tracking-[0.25em] text-dim">⚡ RAPID FIRE</p>
            <h2 className="mt-2 font-display text-2xl font-black">Beat the clock</h2>
            <p className="mt-1 text-xs text-dim">Answer as many as you can before time runs out. No explanations, no mercy.</p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block font-mono text-[11px] tracking-widest text-dim">SUBJECT</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {subjects.map((s) => (
                    <button key={s.slug} onClick={() => setSubject(s.slug)}
                      className={cx("rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-all", subject === s.slug ? "border-lime bg-lime/10 text-lime" : "border-line text-paper/80 hover:border-white/25")}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] tracking-widest text-dim">CLASS</label>
                <div className="flex overflow-hidden rounded-lg border border-line">
                  {["SS1", "SS2", "SS3"].map((l) => (
                    <button key={l} onClick={() => setLevel(l)}
                      className={cx("flex-1 py-2.5 text-xs font-bold transition-colors", level === l ? "bg-lime text-ink" : "text-dim hover:text-paper")}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] tracking-widest text-dim">TIME</label>
                <div className="flex gap-2">
                  {[30, 60, 90].map((s) => (
                    <button key={s} onClick={() => setSeconds(s)}
                      className={cx("flex-1 rounded-lg border py-2.5 font-mono text-xs font-bold transition-colors", seconds === s ? "border-lime bg-lime/10 text-lime" : "border-line text-dim hover:text-paper")}>
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={begin} disabled={phase === "loading"}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-4 text-sm font-black text-ink transition-all hover:bg-lime2 disabled:opacity-60">
                {phase === "loading" ? <Loader2 size={17} className="animate-spin" /> : <>GO! <Zap size={16} /></>}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "done") {
    const total = correct + wrong;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    return (
      <main className="relative grid min-h-screen place-items-center px-4 pb-24 pt-28 sm:px-6">
        <div className="max-w-lg text-center">
          <p className="text-5xl">⚡</p>
          <h2 className="mt-4 font-display text-3xl font-black">Time&apos;s up!</h2>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="font-display text-3xl font-black text-lime tabular">{correct}</p>
              <p className="mt-1 font-mono text-[9px] tracking-widest text-dim">CORRECT</p>
            </div>
            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="font-display text-3xl font-black text-coral tabular">{wrong}</p>
              <p className="mt-1 font-mono text-[9px] tracking-widest text-dim">WRONG</p>
            </div>
            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="font-display text-3xl font-black text-iris tabular">×{bestStreak}</p>
              <p className="mt-1 font-mono text-[9px] tracking-widest text-dim">BEST STREAK</p>
            </div>
          </div>
          <p className="mt-4 font-display text-5xl font-black text-lime">{pct}%</p>
          <p className="mt-1 text-xs text-dim">accuracy across {total} questions in {seconds}s</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={begin} className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-bold text-ink hover:bg-lime2">
              <RotateCcw size={15} /> Again
            </button>
            <button onClick={() => setPhase("setup")} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-bold hover:border-lime hover:text-lime">
              New settings
            </button>
          </div>
        </div>
      </main>
    );
  }

  const lowTime = remaining <= 10;

  return (
    <main className="relative min-h-screen px-4 pb-24 pt-28 sm:px-6">
      {/* screen flash */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0.5 }} animate={{ opacity: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className={cx("fixed inset-0 z-20 pointer-events-none", flash === "right" ? "bg-lime/20" : "bg-coral/20")}
          />
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-2xl">
        {/* header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={cx("inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-mono text-xs font-bold", streak >= 3 ? "border-orange-400/40 bg-orange-400/10 text-orange-300" : "border-line text-dim")}>
              <Flame size={13} /> ×{streak}
            </span>
            <span className="font-mono text-xs text-dim tabular">{correct}✓ {wrong}✗</span>
          </div>
          <span className={cx("rounded-lg border px-4 py-2 font-mono text-xl font-black tabular", lowTime ? "animate-pulse border-coral bg-coral/10 text-coral" : "border-lime/40 bg-lime/5 text-lime")}>
            {remaining}s
          </span>
        </div>

        {/* question */}
        {q && (
          <AnimatePresence mode="wait">
            <motion.div
              key={q.id}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-line bg-panel p-6"
            >
              <p className="rounded bg-white/5 px-2 py-1 text-center font-mono text-[9px] tracking-widest text-dim">{q.topic.toUpperCase()}</p>
              <h2 className="mt-3 text-center text-lg font-semibold leading-relaxed">{q.question}</h2>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => pick(oi)}
                    className="flex items-center gap-3 rounded-xl border border-line bg-ink px-4 py-3.5 text-left text-sm transition-all hover:border-lime/50 hover:bg-lime/5"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 font-mono text-xs font-bold">{LETTERS[oi]}</span>
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
        <p className="mt-3 text-center font-mono text-[9px] text-dim">A–D TO ANSWER · NO GOING BACK · SPEED IS KING</p>
      </div>
    </main>
  );
}
