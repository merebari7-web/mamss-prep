"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2, RotateCcw, X } from "lucide-react";
import { cx, shuffle } from "@/lib/utils";
import type { SubjectInfo } from "@/lib/constants";

interface Q { id: number; question: string; options: string[]; answerIndex: number; topic: string; }

export default function SpellingLab({ subjects }: { subjects: SubjectInfo[] }) {
  const [subject, setSubject] = useState("english");
  const [level, setLevel] = useState("SS2");
  const [phase, setPhase] = useState<"setup" | "loading" | "run" | "done">("setup");
  const [qs, setQs] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [results, setResults] = useState<Array<{ q: Q; typed: string; correct: boolean }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const q = qs[idx];

  const begin = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await fetch(`/api/questions?subject=${subject}&level=${level}&limit=15&mode=practice`);
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
      setInput("");
      setResults([]);
      setPhase("run");
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch { setPhase("setup"); }
  }, [subject, level]);

  const submit = () => {
    if (!q) return;
    const answer = q.options[q.answerIndex];
    const correct = input.trim().toLowerCase() === answer.toLowerCase();
    setResults((r) => [...r, { q, typed: input.trim(), correct }]);
    setInput("");
    if (idx + 1 < qs.length) { setIdx(idx + 1); setTimeout(() => inputRef.current?.focus(), 50); }
    else setPhase("done");
  };

  const correctCount = results.filter((r) => r.correct).length;

  if (phase === "setup" || phase === "loading") {
    return (
      <main className="relative min-h-screen px-4 pb-24 pt-28 sm:px-6">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-line bg-panel p-6">
            <p className="font-mono text-xs tracking-[0.25em] text-dim">⌨️ SPELLING LAB</p>
            <h2 className="mt-2 font-display text-2xl font-black">Type the answer</h2>
            <p className="mt-1 text-xs text-dim">No options shown — you type the correct answer from memory. Spelling counts!</p>
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
                    <button key={l} onClick={() => setLevel(l)} className={cx("flex-1 py-2.5 text-xs font-bold", level === l ? "bg-lime text-ink" : "text-dim hover:text-paper")}>{l}</button>
                  ))}
                </div>
              </div>
              <button onClick={begin} disabled={phase === "loading"} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-4 text-sm font-black text-ink hover:bg-lime2 disabled:opacity-60">
                {phase === "loading" ? <Loader2 size={17} className="animate-spin" /> : <>START <ArrowRight size={16} /></>}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "done") {
    const pct = results.length ? Math.round((correctCount / results.length) * 100) : 0;
    return (
      <main className="relative min-h-screen px-4 pb-24 pt-28 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-5xl">⌨️</p>
          <h2 className="mt-4 font-display text-3xl font-black">Spelling Score</h2>
          <p className="mt-2 font-display text-5xl font-black text-lime">{pct}%</p>
          <p className="text-xs text-dim">{correctCount}/{results.length} correct</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={begin} className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-bold text-ink hover:bg-lime2"><RotateCcw size={15} /> Again</button>
          </div>
          {/* review wrong */}
          {results.filter(r => !r.correct).length > 0 && (
            <div className="mt-8 text-left">
              <h3 className="font-display text-sm font-bold text-coral">CORRECTIONS</h3>
              <div className="mt-3 space-y-2">
                {results.filter(r => !r.correct).map((r, i) => (
                  <div key={i} className="rounded-xl border border-line bg-panel p-4">
                    <p className="text-sm font-semibold">{r.q.question}</p>
                    <div className="mt-2 flex gap-2 text-xs">
                      <span className="rounded-lg border border-coral/30 bg-coral/5 px-3 py-1.5 text-coral">You: {r.typed || "(blank)"}</span>
                      <span className="rounded-lg border border-lime/30 bg-lime/5 px-3 py-1.5 text-lime">Answer: {r.q.options[r.q.answerIndex]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen px-4 pb-24 pt-28 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-mono text-xs text-dim tabular">{idx + 1}/{qs.length}</span>
          <button onClick={() => setPhase("setup")} className="grid size-9 place-items-center rounded-lg border border-line text-dim hover:text-paper"><X size={16} /></button>
        </div>
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${((idx) / qs.length) * 100}%` }} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={q?.id} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} className="rounded-2xl border border-line bg-panel p-6">
            <p className="rounded bg-white/5 px-2 py-1 text-center font-mono text-[9px] tracking-widest text-dim">{q?.topic?.toUpperCase()}</p>
            <h2 className="mt-3 text-center text-lg font-semibold leading-relaxed">{q?.question}</h2>
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="mt-6 flex overflow-hidden rounded-xl border border-line bg-ink">
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} autoFocus
                placeholder="Type the correct answer..."
                className="w-full bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-dim" />
              <button type="submit" className="grid w-14 shrink-0 place-items-center bg-lime text-ink transition-colors hover:bg-lime2">
                <Check size={18} />
              </button>
            </form>
            <p className="mt-3 text-center font-mono text-[9px] text-dim">TYPE YOUR ANSWER · ENTER TO SUBMIT · SPELLING COUNTS</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
