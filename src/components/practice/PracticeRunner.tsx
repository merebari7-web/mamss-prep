"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Lightbulb,
  Loader2,
  MonitorPlay,
  RefreshCcw,
  RotateCcw,
  X,
} from "lucide-react";
import { cx, getClientId, shuffle } from "@/lib/utils";
import { waecGrade, TERM_LABELS, type SubjectInfo } from "@/lib/constants";

export interface PracticeQ {
  id: number;
  subjectSlug: string;
  level: string;
  term: number;
  topic: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty: string;
}

interface Initial {
  subject: string;
  level: string;
  term: string;
  count: number;
  exam: string;
  autoStart?: boolean;
}

const LETTERS = ["A", "B", "C", "D"];

export default function PracticeRunner({ subjects, initial }: { subjects: SubjectInfo[]; initial: Initial }) {
  const [subject, setSubject] = useState(initial.subject);
  const [level, setLevel] = useState(initial.level);
  const [term, setTerm] = useState(initial.term);
  const [count, setCount] = useState(initial.count);

  const [phase, setPhase] = useState<"setup" | "loading" | "run" | "done">("setup");
  const [qs, setQs] = useState<PracticeQ[]>([]);
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<Record<number, number>>({});
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const startedAt = useRef<number>(Date.now());

  const meta = subjects.find((s) => s.slug === subject);
  const q = qs[i];
  const revealed = chosen[i] !== undefined;
  const correctCount = useMemo(
    () => Object.entries(chosen).filter(([idx, c]) => qs[Number(idx)]?.answerIndex === c).length,
    [chosen, qs],
  );
  const answered = Object.keys(chosen).length;

  const begin = useCallback(async () => {
    setPhase("loading");
    const params = new URLSearchParams({
      subject,
      level,
      limit: String(count),
      mode: "practice",
    });
    if (term) params.set("term", term);
    if (initial.exam) params.set("exam", initial.exam);
    try {
      const res = await fetch(`/api/questions?${params.toString()}`);
      const data = await res.json();
      const rows: PracticeQ[] = data.questions ?? [];
      if (rows.length === 0) {
        setPhase("setup");
        return;
      }
      setQs(rows);
      setI(0);
      setChosen({});
      setStreak(0);
      setBest(0);
      startedAt.current = Date.now();
      setPhase("run");
    } catch {
      setPhase("setup");
    }
  }, [subject, level, term, count, initial.exam]);

  useEffect(() => {
    if (initial.autoStart) begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = useCallback(
    (opt: number) => {
      if (phase !== "run" || revealed) return;
      setChosen((c) => ({ ...c, [i]: opt }));
      const right = opt === q.answerIndex;
      setStreak((s) => {
        const ns = right ? s + 1 : 0;
        setBest((b) => Math.max(b, ns));
        return ns;
      });
    },
    [phase, revealed, i, q],
  );

  const finish = useCallback(async () => {
    const answers = qs.map((qq, idx) => ({ id: qq.id, selected: chosen[idx] ?? null }));
    const label = `${meta?.name ?? subject} · ${level}${term ? ` · ${TERM_LABELS[Number(term)]}` : ""}`;
    setPhase("done");
    fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: getClientId(),
        mode: "practice",
        label,
        durationSec: Math.round((Date.now() - startedAt.current) / 1000),
        answers,
        meta: { subject, level, term, exam: initial.exam },
      }),
    }).catch(() => {});
  }, [qs, chosen, meta, subject, level, term, initial.exam]);

  const next = useCallback(() => {
    if (i + 1 >= qs.length) finish();
    else setI((v) => v + 1);
  }, [i, qs.length, finish]);

  // keyboard shortcuts: A-D / 1-4 select, Enter = next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "run") return;
      const k = e.key.toUpperCase();
      const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
      if (k in map && !revealed) pick(map[k]);
      if (e.key === "Enter" && revealed) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, revealed, pick, next]);

  /* ---------- SETUP ---------- */
  if (phase === "setup" || phase === "loading") {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
          <p className="font-mono text-xs tracking-[0.25em] text-dim">BUILD YOUR DRILL</p>
          <h2 className="mt-2 font-display text-2xl font-black tracking-tight">
            {initial.exam ? `${initial.exam} PRACTICE SET` : "PRACTICE SET"}
          </h2>

          <div className="mt-7 space-y-5">
            <div>
              <label className="mb-2 block font-mono text-[11px] tracking-widest text-dim">SUBJECT</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {subjects.map((s) => (
                  <button
                    key={s.slug}
                    onClick={() => setSubject(s.slug)}
                    className={cx(
                      "rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-all",
                      subject === s.slug
                        ? "border-lime bg-lime/10 text-lime"
                        : "border-line text-paper/80 hover:border-white/25",
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block font-mono text-[11px] tracking-widest text-dim">CLASS</label>
                <div className="flex overflow-hidden rounded-lg border border-line">
                  {["SS1", "SS2", "SS3"].map((l) => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className={cx(
                        "flex-1 py-2.5 text-xs font-bold transition-colors",
                        level === l ? "bg-lime text-ink" : "text-dim hover:text-paper",
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] tracking-widest text-dim">TERM</label>
                <div className="flex overflow-hidden rounded-lg border border-line">
                  {[["", "ALL"], ["1", "1ST"], ["2", "2ND"], ["3", "3RD"]].map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setTerm(v)}
                      className={cx(
                        "flex-1 py-2.5 text-xs font-bold transition-colors",
                        term === v ? "bg-lime text-ink" : "text-dim hover:text-paper",
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block font-mono text-[11px] tracking-widest text-dim">
                QUESTIONS — <span className="text-lime tabular">{count}</span>
              </label>
              <input
                type="range"
                min={5}
                max={20}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {meta && (
              <p className="rounded-lg border border-line bg-ink px-4 py-3 font-mono text-[11px] text-dim">
                BANK: <span className="text-paper tabular">{meta.counts[level as "SS1" | "SS2" | "SS3"]}</span>{" "}
                {level} questions available in {meta.name}
                {meta.counts[level as "SS1" | "SS2" | "SS3"] === 0 && (
                  <span className="text-coral"> — empty here; pick another class</span>
                )}
              </p>
            )}

            <button
              onClick={begin}
              disabled={phase === "loading"}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-4 text-sm font-black text-ink transition-all hover:bg-lime2 hover:shadow-[0_0_30px_rgba(200,241,105,0.35)] disabled:opacity-60"
            >
              {phase === "loading" ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <>
                  START DRILL
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- DONE ---------- */
  if (phase === "done") {
    const pct = qs.length ? Math.round((correctCount / qs.length) * 100) : 0;
    const grade = waecGrade(pct);
    const wrong = qs.map((qq, idx) => ({ qq, idx })).filter(({ idx }) => chosen[idx] !== qs[idx].answerIndex);
    const R = 54;
    const C = 2 * Math.PI * R;
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-line bg-panel p-6 text-center sm:p-10">
          <p className="font-mono text-xs tracking-[0.25em] text-dim">SCRIPT MARKED</p>
          <div className="relative mx-auto mt-6 size-40">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90">
              <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
              <motion.circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke={pct >= 50 ? "#c8f169" : "#f87171"}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={C}
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: C - (C * pct) / 100 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div>
                <p className="font-display text-4xl font-black tabular">{pct}%</p>
                <p className="font-mono text-[10px] text-dim">
                  {correctCount}/{qs.length} CORRECT
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-center gap-3">
            <span className={cx("rounded-lg px-4 py-2 font-display text-lg font-black", pct >= 50 ? "bg-lime text-ink" : "bg-coral text-ink")}>
              {grade.grade}
            </span>
            <div className="text-left">
              <p className="text-sm font-bold">{grade.label}</p>
              <p className="font-mono text-[11px] text-dim">WAEC BAND · BEST STREAK ×{best}</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => begin()}
              className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-bold text-ink hover:bg-lime2"
            >
              <RefreshCcw size={15} /> New set
            </button>
            <button
              onClick={() => {
                setChosen({});
                setI(0);
                setStreak(0);
                setBest(0);
                setPhase("run");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-bold hover:border-lime hover:text-lime"
            >
              <RotateCcw size={15} /> Retry same set
            </button>
            <Link
              href="/cbt"
              className="inline-flex items-center gap-2 rounded-full border border-iris/50 px-6 py-3 text-sm font-bold text-iris hover:bg-iris/10"
            >
              <MonitorPlay size={15} /> Try CBT mode
            </Link>
          </div>

          {wrong.length > 0 && (
            <div className="mt-10 text-left">
              <h3 className="font-display text-sm font-bold tracking-wide">
                REVIEW YOUR GAPS — <span className="text-coral tabular">{wrong.length}</span>
              </h3>
              <div className="mt-4 space-y-3">
                {wrong.map(({ qq, idx }) => (
                  <div key={qq.id} className="rounded-xl border border-line bg-ink p-5">
                    <p className="font-mono text-[10px] text-dim">
                      {qq.topic.toUpperCase()} · {qq.level} · {TERM_LABELS[qq.term]}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold leading-relaxed">{qq.question}</p>
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                      <p className="rounded-lg border border-coral/30 bg-coral/5 px-3 py-2 text-coral">
                        You picked: {chosen[idx] !== undefined ? `${LETTERS[chosen[idx]]}. ${qq.options[chosen[idx]]}` : "— (skipped)"}
                      </p>
                      <p className="rounded-lg border border-lime/30 bg-lime/5 px-3 py-2 text-lime">
                        Answer: {LETTERS[qq.answerIndex]}. {qq.options[qq.answerIndex]}
                      </p>
                    </div>
                    <p className="mt-3 flex gap-2 text-xs leading-relaxed text-dim">
                      <Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-300" />
                      {qq.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- RUN ---------- */
  return (
    <div className="mx-auto max-w-3xl">
      {/* header strip */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg font-display text-xs font-black" style={{ backgroundColor: `${meta?.color ?? "#c8f169"}1c`, color: meta?.color }}>
            {meta?.short}
          </span>
          <div>
            <p className="text-sm font-bold">{meta?.name}</p>
            <p className="font-mono text-[10px] text-dim">
              {level}{term ? ` · ${TERM_LABELS[Number(term)]}` : " · ALL TERMS"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cx(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-mono text-xs font-bold transition-colors",
              streak >= 2 ? "border-orange-400/40 bg-orange-400/10 text-orange-300" : "border-line text-dim",
            )}
          >
            <Flame size={13} /> ×{streak}
          </span>
          <button
            onClick={() => setPhase("setup")}
            aria-label="Quit drill"
            className="grid size-10 place-items-center rounded-lg border border-line text-dim hover:border-coral hover:text-coral"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* progress */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-lime transition-all duration-500"
            style={{ width: `${(answered / qs.length) * 100}%` }}
          />
        </div>
        <span className="font-mono text-[11px] text-dim tabular">
          {i + 1}/{qs.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -60, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-white/5 px-2 py-1 font-mono text-[10px] tracking-widest text-dim">
                {q.topic.toUpperCase()}
              </span>
              <span className="rounded bg-white/5 px-2 py-1 font-mono text-[10px] tracking-widest text-dim">
                {q.level} · {TERM_LABELS[q.term]}
              </span>
              <span
                className={cx(
                  "rounded px-2 py-1 font-mono text-[10px] tracking-widest",
                  q.difficulty === "easy" && "bg-lime/10 text-lime",
                  q.difficulty === "medium" && "bg-amber-400/10 text-amber-300",
                  q.difficulty === "hard" && "bg-coral/10 text-coral",
                )}
              >
                {q.difficulty.toUpperCase()}
              </span>
            </div>

            <h2 className="mt-4 text-lg font-semibold leading-relaxed sm:text-xl">{q.question}</h2>

            <div className="mt-6 space-y-3">
              {q.options.map((opt, oi) => {
                const isPicked = chosen[i] === oi;
                const isAnswer = q.answerIndex === oi;
                const showRight = revealed && isAnswer;
                const showWrong = revealed && isPicked && !isAnswer;
                return (
                  <button
                    key={oi}
                    onClick={() => pick(oi)}
                    disabled={revealed}
                    className={cx(
                      "option-row flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all",
                      !revealed && "border-line bg-ink hover:border-lime/60 hover:bg-lime/5",
                      showRight && "border-lime bg-lime/10",
                      showWrong && "border-coral bg-coral/10",
                      revealed && !showRight && !showWrong && "border-line bg-ink opacity-50",
                    )}
                  >
                    <span
                      className={cx(
                        "grid size-8 shrink-0 place-items-center rounded-full font-mono text-xs font-bold",
                        showRight && "bg-lime text-ink",
                        showWrong && "bg-coral text-ink",
                        !showRight && !showWrong && "bg-white/10 text-paper",
                      )}
                    >
                      {showRight ? <Check size={15} /> : showWrong ? <X size={15} /> : LETTERS[oi]}
                    </span>
                    <span className={cx("text-sm", showRight && "font-semibold text-lime", showWrong && "text-coral")}>
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {revealed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/5 p-4">
                    <p className="flex items-start gap-2 text-sm leading-relaxed text-paper/90">
                      <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-300" />
                      <span>
                        <span className={chosen[i] === q.answerIndex ? "font-bold text-lime" : "font-bold text-coral"}>
                          {chosen[i] === q.answerIndex ? "Correct. " : "Not quite. "}
                        </span>
                        {q.explanation}
                      </span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-7 flex items-center justify-between">
              <button
                onClick={() => setI((v) => Math.max(0, v - 1))}
                disabled={i === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2.5 text-xs font-bold text-dim transition-colors hover:text-paper disabled:opacity-30"
              >
                <ChevronLeft size={14} /> PREV
              </button>
              <p className="hidden items-center gap-1.5 font-mono text-[10px] text-dim sm:flex">
                <BookOpen size={11} /> A–D TO ANSWER · ENTER FOR NEXT
              </p>
              <button
                onClick={next}
                disabled={!revealed}
                className="inline-flex items-center gap-1.5 rounded-lg bg-lime px-5 py-2.5 text-xs font-black text-ink transition-all hover:bg-lime2 disabled:opacity-30"
              >
                {i + 1 >= qs.length ? "FINISH" : "NEXT"} <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
