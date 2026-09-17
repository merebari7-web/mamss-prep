"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calculator as CalcIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Delete,
  Flag,
  Home,
  LayoutGrid,
  Lightbulb,
  Loader2,
  RefreshCcw,
  RotateCcw,
  X,
} from "lucide-react";
import { cx, getClientId } from "@/lib/utils";
import { formatClock, waecGrade, TERM_LABELS, UTME_PRESETS, type SubjectInfo } from "@/lib/constants";

/* ---------------- types ---------------- */

interface CbtQ {
  id: number;
  subjectSlug: string;
  level: string;
  term: number;
  topic: string;
  question: string;
  options: string[];
  difficulty: string;
}
interface Section {
  slug: string;
  name: string;
  short: string;
  color: string;
  items: CbtQ[];
}
interface ReviewRow {
  id: number;
  subjectSlug: string;
  level: string;
  term: number;
  topic: string;
  question: string;
  options: string[];
  selected: number | null;
  answerIndex: number;
  explanation: string;
  isRight: boolean;
}
interface ScoreResult {
  total: number;
  correct: number;
  scorePct: number;
  utmeScore: number | null;
  grade: { grade: string; label: string };
  bySubject: Record<string, { correct: number; total: number }>;
  review: ReviewRow[];
}

const LETTERS = ["A", "B", "C", "D"];

/* ---------------- calculator ---------------- */

function Calculator({ onClose }: { onClose: () => void }) {
  const [expr, setExpr] = useState("");
  const feed = (k: string) => {
    if (k === "C") return setExpr("");
    if (k === "DEL") return setExpr((s) => s.slice(0, -1));
    if (k === "=") {
      setExpr((s) => {
        if (!/^[0-9+\-*/.() ]+$/.test(s) || !s) return "ERR";
        try {
          const v = Function(`"use strict"; return (${s})`)() as number;
          return Number.isFinite(v) ? String(Math.round(v * 1e8) / 1e8) : "ERR";
        } catch {
          return "ERR";
        }
      });
      return;
    }
    setExpr((s) => (s === "ERR" ? k : s + k));
  };
  const keys = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "(", ")", "+", "="];
  return (
    <div className="w-64 rounded-xl border border-line bg-panel2 p-3 shadow-2xl shadow-black/70">
      <div className="flex items-center justify-between px-1">
        <p className="font-mono text-[9px] tracking-widest text-dim">CALCULATOR</p>
        <button onClick={onClose} className="text-dim hover:text-paper" aria-label="Close calculator">
          <X size={14} />
        </button>
      </div>
      <div className="mt-2 min-h-9 truncate rounded-lg border border-line bg-ink px-3 py-2 text-right font-mono text-lg text-lime tabular">
        {expr || "0"}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <button onClick={() => feed("C")} className="col-span-2 rounded-lg bg-coral/20 py-2 font-mono text-xs font-bold text-coral">C</button>
        <button onClick={() => feed("DEL")} className="col-span-2 grid place-items-center rounded-lg bg-white/5 py-2 text-paper"><Delete size={14} /></button>
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => feed(k)}
            className={cx(
              "rounded-lg py-2 font-mono text-sm font-bold transition-colors",
              k === "=" ? "col-span-2 bg-lime text-ink" : "bg-white/5 text-paper hover:bg-white/10",
            )}
          >
            {k === "*" ? "×" : k === "/" ? "÷" : k}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- main app ---------------- */

export default function CBTApp({ subjects }: { subjects: SubjectInfo[] }) {
  const [preset, setPreset] = useState<string>("medicine");
  const [custom, setCustom] = useState<string[]>(["mathematics", "physics", "chemistry"]);
  const [useCustom, setUseCustom] = useState(false);
  const [perSubject, setPerSubject] = useState(8);
  const [minutes, setMinutes] = useState(12);
  const [error, setError] = useState("");

  const [phase, setPhase] = useState<"setup" | "loading" | "exam" | "result">("setup");
  const [sections, setSections] = useState<Section[]>([]);
  const [cursor, setCursor] = useState({ s: 0, j: 0 });
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [remaining, setRemaining] = useState(0);
  const [showCalc, setShowCalc] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [filter, setFilter] = useState<"all" | "wrong" | "flagged">("all");
  const usedSec = useRef(0);
  const sessionLabel = useRef("");

  const chosenList = useMemo(() => {
    if (useCustom) return ["english", ...custom];
    const p = UTME_PRESETS.find((x) => x.id === preset) ?? UTME_PRESETS[0];
    return [...p.subjects];
  }, [useCustom, custom, preset]);

  const totalQ = sections.reduce((a, s) => a + s.items.length, 0);
  const answeredCount = Object.keys(answers).length;
  const allFlat = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const cur = sections[cursor.s]?.items[cursor.j];
  const regNo = useMemo(() => `MAMSS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`, []);

  const begin = useCallback(async () => {
    setPhase("loading");
    setError("");
    try {
      const params = new URLSearchParams({
        subjects: chosenList.join(","),
        perSubject: String(perSubject),
        mode: "cbt",
      });
      const res = await fetch(`/api/questions?${params}`);
      const data = await res.json();
      const built: Section[] = [];
      for (const slug of chosenList) {
        const meta = subjects.find((x) => x.slug === slug) ?? {
          slug, name: slug, short: slug.slice(0, 3).toUpperCase(), color: "#c8f169",
        };
        const items: CbtQ[] = data.grouped?.[slug] ?? [];
        if (items.length === 0) {
          setError(`Not enough banked questions for ${meta.name} yet — lower the per-subject count.`);
          setPhase("setup");
          return;
        }
        built.push({ slug, name: meta.name, short: meta.short, color: meta.color, items });
      }
      const p = UTME_PRESETS.find((x) => x.id === preset);
      sessionLabel.current = `UTME Mock · ${useCustom ? "Custom combo" : (p?.name ?? "Custom")}`;
      setSections(built);
      setCursor({ s: 0, j: 0 });
      setAnswers({});
      setFlags(new Set());
      setRemaining(minutes * 60);
      usedSec.current = 0;
      setResult(null);
      setShowCalc(false);
      setConfirming(false);
      setPhase("exam");
    } catch {
      setError("Network hiccup — the invigilator says try again.");
      setPhase("setup");
    }
  }, [chosenList, perSubject, minutes, subjects, preset, useCustom]);

  const submit = useCallback(
    async (auto = false) => {
      if (submitting) return;
      setSubmitting(true);
      setConfirming(false);
      const payload = {
        clientId: getClientId(),
        mode: "cbt",
        label: sessionLabel.current,
        durationSec: usedSec.current,
        answers: allFlat.map((q) => ({ id: q.id, selected: answers[q.id] ?? null })),
        meta: { subjects: sections.map((s) => s.slug), perSubject, minutes, auto },
      };
      try {
        const res = await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as ScoreResult;
        setResult(data);
        setPhase("result");
      } catch {
        setError("Scoring failed — your answers are safe on this device. Try resubmitting.");
      } finally {
        setSubmitting(false);
      }
    },
    [allFlat, answers, minutes, perSubject, sections, submitting],
  );

  // exam clock
  useEffect(() => {
    if (phase !== "exam") return;
    const t = setInterval(() => {
      setRemaining((r) => {
        usedSec.current += 1;
        if (r <= 1) {
          clearInterval(t);
          submit(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, submit]);

  // keyboard
  useEffect(() => {
    if (phase !== "exam" || confirming) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase();
      const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
      if (k in map && cur) setAnswers((a) => ({ ...a, [cur.id]: map[k] }));
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "f" || e.key === "F") toggleFlag();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, confirming, cur, cursor, sections]);

  const go = useCallback(
    (dir: number) => {
      setCursor((c) => {
        const sLen = sections[c.s]?.items.length ?? 0;
        let { s, j } = c;
        j += dir;
        if (j >= sLen) { s += 1; j = 0; }
        if (j < 0) { s -= 1; j = (sections[s]?.items.length ?? 1) - 1; }
        if (s < 0) return c;
        if (s >= sections.length) return c;
        return { s, j };
      });
    },
    [sections],
  );

  const toggleFlag = useCallback(() => {
    if (!cur) return;
    setFlags((f) => {
      const nf = new Set(f);
      if (nf.has(cur.id)) nf.delete(cur.id); else nf.add(cur.id);
      return nf;
    });
  }, [cur]);

  const isLast = cursor.s === sections.length - 1 && cursor.j === (sections[cursor.s]?.items.length ?? 1) - 1;
  const lowTime = remaining > 0 && remaining <= 60;

  /* ================= SETUP ================= */
  if (phase === "setup" || phase === "loading") {
    return (
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
            <p className="font-mono text-xs tracking-[0.25em] text-dim">STEP 1 — CHOOSE YOUR COMBINATION</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {UTME_PRESETS.map((p) => {
                const active = !useCustom && preset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setPreset(p.id); setUseCustom(false); }}
                    className={cx(
                      "rounded-xl border p-4 text-left transition-all",
                      active ? "border-lime bg-lime/10" : "border-line bg-ink hover:border-white/25",
                    )}
                  >
                    <p className={cx("font-display text-sm font-bold", active && "text-lime")}>{p.name}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-dim">{p.note}</p>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setUseCustom(true)}
              className={cx(
                "mt-3 w-full rounded-xl border p-4 text-left transition-all",
                useCustom ? "border-iris bg-iris/10" : "border-line bg-ink hover:border-white/25",
              )}
            >
              <p className={cx("font-display text-sm font-bold", useCustom && "text-iris")}>
                CUSTOM COMBINATION — Use of English + 3 subjects
              </p>
            </button>

            <AnimatePresence>
              {useCustom && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <span className="rounded-lg border border-lime/40 bg-lime/10 px-3 py-2.5 text-xs font-semibold text-lime">
                      English ✓ (compulsory)
                    </span>
                    {subjects
                      .filter((s) => s.slug !== "english")
                      .map((s) => {
                        const on = custom.includes(s.slug);
                        return (
                          <button
                            key={s.slug}
                            onClick={() =>
                              setCustom((c) => (on ? c.filter((x) => x !== s.slug) : c.length < 3 ? [...c, s.slug] : c))
                            }
                            className={cx(
                              "rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-all",
                              on ? "border-iris bg-iris/10 text-iris" : "border-line text-paper/80 hover:border-white/25",
                            )}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-dim tabular">{custom.length}/3 EXTRA SUBJECTS PICKED</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-7 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 font-mono text-[11px] tracking-widest text-dim">
                  QUESTIONS PER PAPER — <span className="text-lime tabular">{perSubject}</span> ({perSubject * 4} total)
                </p>
                <input type="range" min={5} max={15} value={perSubject} onChange={(e) => setPerSubject(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <p className="mb-2 font-mono text-[11px] tracking-widest text-dim">TIME ALLOWED</p>
                <div className="flex flex-wrap gap-2">
                  {[8, 12, 20, 30, 45].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMinutes(m)}
                      className={cx(
                        "rounded-lg border px-3.5 py-2 font-mono text-xs font-bold transition-colors",
                        minutes === m ? "border-lime bg-lime/10 text-lime" : "border-line text-dim hover:text-paper",
                      )}
                    >
                      {m} MIN
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-5 flex items-center gap-2 rounded-lg border border-coral/40 bg-coral/10 px-4 py-3 text-xs text-coral">
                <AlertTriangle size={14} /> {error}
              </p>
            )}

            <button
              onClick={begin}
              disabled={phase === "loading" || (useCustom && custom.length !== 3)}
              className="group mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-4 text-sm font-black text-ink transition-all hover:bg-lime2 hover:shadow-[0_0_30px_rgba(200,241,105,0.35)] disabled:opacity-50"
            >
              {phase === "loading" ? <Loader2 size={17} className="animate-spin" /> : <Clock size={17} />}
              {phase === "loading" ? "PRINTING PAPERS…" : `ENTER HALL — ${perSubject * 4} QUESTIONS / ${minutes} MIN`}
            </button>
          </div>
        </div>

        {/* candidate card + rules */}
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-2xl border border-line bg-panel p-6">
            <span className="absolute -right-10 -top-10 size-40 rounded-full bg-lime/10 blur-2xl" />
            <p className="font-mono text-[10px] tracking-[0.3em] text-dim">MAMSS MOCK UTME</p>
            <div className="mt-5 flex items-center gap-4">
              <div className="grid size-16 place-items-center rounded-xl border border-line bg-ink">
                <Image src="/media/mamss-logo.png" alt="MAMSS Logo" width={48} height={48} className="size-12 object-contain" />
              </div>
              <div>
                <p className="font-display text-lg font-bold">CANDIDATE 001</p>
                <p className="font-mono text-xs text-dim tabular">REG NO: {regNo}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-line pt-4 font-mono text-[10px] text-dim">
              <p>PAPERS: <span className="text-paper">4 SUBJECTS</span></p>
              <p>MODE: <span className="text-paper">COMPUTER-BASED</span></p>
              <p>SCALE: <span className="text-paper">/400</span></p>
              <p>STATUS: <span className="text-lime">● ADMITTED</span></p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-6">
            <p className="font-mono text-[10px] tracking-[0.3em] text-dim">HALL RULES</p>
            <ul className="mt-4 space-y-3 text-xs leading-relaxed text-paper/80">
              {[
                "The clock starts the moment you enter and never pauses.",
                "At 00:00 your script submits itself — answered or not.",
                "A–D keys, arrow keys and F (flag) work if you're on a computer.",
                "The palette shows answered (green) and flagged (red) questions.",
                "An on-screen calculator is provided — the only foreign body allowed.",
                "Your aggregate is scaled to /400 like the real UTME.",
              ].map((r, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-lime tabular">{String(i + 1).padStart(2, "0")}</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  /* ================= RESULT ================= */
  if (phase === "result" && result) {
    const grade = result.grade;
    const utme = result.utmeScore ?? result.scorePct * 4;
    const reviewList = result.review.filter((r) => {
      if (filter === "wrong") return !r.isRight;
      if (filter === "flagged") return flags.has(r.id);
      return true;
    });
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-line bg-panel p-6 text-center sm:p-10">
          <p className="font-mono text-xs tracking-[0.3em] text-dim">{sessionLabel.current.toUpperCase()} — RESULT SLIP</p>
          <p className="mt-2 font-mono text-[11px] text-dim tabular">REG NO: {regNo} · TIME USED: {formatClock(usedSec.current)}</p>

          <div className="mt-8">
            <p className="font-mono text-xs tracking-widest text-dim">UTME AGGREGATE</p>
            <motion.p
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 12 }}
              className="font-display text-7xl font-black tracking-tight text-lime tabular sm:text-8xl"
            >
              {utme}
              <span className="text-2xl text-dim">/400</span>
            </motion.p>
            <div className={cx("mt-4 inline-flex items-center gap-3 rounded-xl px-5 py-2.5", result.scorePct >= 50 ? "bg-lime/10 text-lime" : "bg-coral/10 text-coral")}>
              <span className="font-display text-xl font-black">{grade.grade}</span>
              <span className="text-sm font-semibold">{grade.label} band</span>
              <span className="font-mono text-xs tabular">{result.correct}/{result.total} correct</span>
            </div>
          </div>

          {/* per subject bars */}
          <div className="mx-auto mt-9 grid max-w-xl gap-3 text-left">
            {Object.entries(result.bySubject).map(([slug, b]) => {
              const meta = subjects.find((x) => x.slug === slug);
              const pct = Math.round((b.correct / b.total) * 100);
              return (
                <div key={slug}>
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-paper/80">{meta?.name ?? slug}</span>
                    <span className="text-dim tabular">{b.correct}/{b.total} · {pct}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: meta?.color ?? "#c8f169" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <button onClick={begin} className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-bold text-ink hover:bg-lime2">
              <RefreshCcw size={15} /> Retake (new questions)
            </button>
            <button onClick={() => setPhase("setup")} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-bold hover:border-lime hover:text-lime">
              <RotateCcw size={15} /> New session
            </button>
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-dim hover:text-paper">
              <Home size={15} /> Home
            </Link>
          </div>
        </div>

        {/* review */}
        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-black">SCRIPT REVIEW</h2>
            <div className="flex gap-2">
              {([
                ["all", `ALL (${result.review.length})`],
                ["wrong", `WRONG (${result.review.filter((r) => !r.isRight).length})`],
                ["flagged", `FLAGGED (${flags.size})`],
              ] as const).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={cx(
                    "rounded-lg border px-3.5 py-2 font-mono text-[10px] font-bold tracking-wider transition-colors",
                    filter === k ? "border-lime bg-lime/10 text-lime" : "border-line text-dim hover:text-paper",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {reviewList.length === 0 && (
              <p className="rounded-xl border border-line bg-panel p-8 text-center text-sm text-dim">
                Nothing here. {filter === "wrong" ? "A clean script — outstanding." : "No flags were raised."}
              </p>
            )}
            {reviewList.map((r, i) => (
              <div key={r.id} className="rounded-xl border border-line bg-panel p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-dim tabular">Q{i + 1}</span>
                  <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[9px] tracking-widest text-dim">
                    {subjects.find((x) => x.slug === r.subjectSlug)?.name ?? r.subjectSlug} · {r.topic.toUpperCase()}
                  </span>
                  <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[9px] tracking-widest text-dim">
                    {r.level} · {TERM_LABELS[r.term]}
                  </span>
                  {flags.has(r.id) && <Flag size={11} className="text-coral" />}
                  <span className={cx("ml-auto rounded px-2 py-0.5 font-mono text-[9px] font-bold", r.isRight ? "bg-lime/10 text-lime" : "bg-coral/10 text-coral")}>
                    {r.isRight ? "CORRECT" : r.selected === null ? "SKIPPED" : "WRONG"}
                  </span>
                </div>
                <p className="mt-2.5 text-sm font-semibold leading-relaxed">{r.question}</p>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <p className={cx(
                    "rounded-lg border px-3 py-2",
                    r.isRight ? "border-lime/30 bg-lime/5 text-lime" : "border-coral/30 bg-coral/5 text-coral",
                  )}>
                    You picked: {r.selected !== null ? `${LETTERS[r.selected]}. ${r.options[r.selected]}` : "— (unanswered)"}
                  </p>
                  {!r.isRight && (
                    <p className="rounded-lg border border-lime/30 bg-lime/5 px-3 py-2 text-lime">
                      Answer: {LETTERS[r.answerIndex]}. {r.options[r.answerIndex]}
                    </p>
                  )}
                </div>
                <p className="mt-3 flex gap-2 text-xs leading-relaxed text-dim">
                  <Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-300" />
                  {r.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ================= EXAM ================= */
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-ink">
      {/* exam chrome */}
      <header className="sticky top-0 z-20 border-b border-line bg-panel/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden font-mono text-[10px] tracking-widest text-dim sm:block tabular">{regNo}</span>
          </div>

          {/* subject tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {sections.map((s, si) => (
              <button
                key={s.slug}
                onClick={() => setCursor({ s: si, j: 0 })}
                className={cx(
                  "shrink-0 rounded-lg px-3 py-2 font-mono text-[10px] font-bold tracking-wider transition-all",
                  cursor.s === si ? "text-ink" : "text-dim hover:text-paper",
                )}
                style={cursor.s === si ? { backgroundColor: s.color } : undefined}
              >
                {s.short}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cx(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-mono text-sm font-black tabular",
                lowTime ? "animate-pulse border-coral bg-coral/10 text-coral" : "border-lime/40 bg-lime/5 text-lime",
              )}
            >
              <Clock size={14} /> {formatClock(remaining)}
            </span>
            <button
              onClick={() => setShowCalc((v) => !v)}
              aria-label="Toggle calculator"
              className={cx("grid size-9 place-items-center rounded-lg border transition-colors", showCalc ? "border-lime text-lime" : "border-line text-dim hover:text-paper")}
            >
              <CalcIcon size={15} />
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="hidden rounded-lg bg-coral px-4 py-2 font-mono text-xs font-black text-ink transition-colors hover:bg-red-400 sm:block"
            >
              SUBMIT
            </button>
            <button
              onClick={() => setShowPalette(true)}
              aria-label="Open question palette"
              className="grid size-9 place-items-center rounded-lg border border-line text-paper lg:hidden"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
        {/* mobile progress strip */}
        <div className="h-0.5 bg-white/5">
          <div className="h-full bg-lime transition-all" style={{ width: `${totalQ ? (answeredCount / totalQ) * 100 : 0}%` }} />
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-3 py-5 sm:px-5 lg:grid-cols-[1fr_280px]">
        {/* question card */}
        {cur && (
          <motion.div
            key={cur.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-line bg-panel p-5 sm:p-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[11px] text-dim">
                <span style={{ color: sections[cursor.s].color }}>{sections[cursor.s].name}</span>
                {" · "}QUESTION {cursor.j + 1} OF {sections[cursor.s].items.length}
              </p>
              <button
                onClick={toggleFlag}
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[10px] font-bold transition-colors",
                  flags.has(cur.id) ? "border-coral bg-coral/10 text-coral" : "border-line text-dim hover:text-paper",
                )}
              >
                <Flag size={11} /> {flags.has(cur.id) ? "FLAGGED" : "FLAG"}
              </button>
            </div>

            <h2 className="mt-4 text-base font-semibold leading-relaxed sm:text-lg">{cur.question}</h2>

            <div className="mt-6 space-y-3">
              {cur.options.map((opt, oi) => {
                const on = answers[cur.id] === oi;
                return (
                  <button
                    key={oi}
                    onClick={() => setAnswers((a) => ({ ...a, [cur.id]: oi }))}
                    className={cx(
                      "flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all",
                      on ? "border-lime bg-lime/10" : "border-line bg-ink hover:border-lime/50",
                    )}
                  >
                    <span className={cx("grid size-8 shrink-0 place-items-center rounded-full font-mono text-xs font-bold", on ? "bg-lime text-ink" : "bg-white/10 text-paper")}>
                      {on ? <Check size={15} /> : LETTERS[oi]}
                    </span>
                    <span className={cx("text-sm", on && "font-semibold text-lime")}>{opt}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-7 flex items-center justify-between">
              <button
                onClick={() => go(-1)}
                disabled={cursor.s === 0 && cursor.j === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2.5 text-xs font-bold text-dim transition-colors hover:text-paper disabled:opacity-30"
              >
                <ChevronLeft size={14} /> PREVIOUS
              </button>
              <span className="font-mono text-[10px] text-dim tabular">
                ANSWERED {answeredCount}/{totalQ}
              </span>
              {isLast ? (
                <button onClick={() => setConfirming(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-coral px-5 py-2.5 text-xs font-black text-ink hover:bg-red-400">
                  SUBMIT SCRIPT <BadgeCheck size={14} />
                </button>
              ) : (
                <button onClick={() => go(1)} className="inline-flex items-center gap-1.5 rounded-lg bg-lime px-5 py-2.5 text-xs font-black text-ink hover:bg-lime2">
                  NEXT <ChevronRight size={14} />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* palette */}
        <aside className="sticky top-[72px] hidden h-fit rounded-2xl border border-line bg-panel p-4 lg:block">
          <p className="font-mono text-[10px] tracking-widest text-dim">QUESTION PALETTE</p>
          <div className="mt-3 space-y-4">
            {sections.map((s, si) => (
              <div key={s.slug}>
                <p className="mb-1.5 font-mono text-[9px] font-bold tracking-widest" style={{ color: s.color }}>
                  {s.name.toUpperCase()}
                </p>
                <div className="grid grid-cols-6 gap-1.5">
                  {s.items.map((qq, ji) => {
                    const active = cursor.s === si && cursor.j === ji;
                    const done = answers[qq.id] !== undefined;
                    const flagged = flags.has(qq.id);
                    return (
                      <button
                        key={qq.id}
                        onClick={() => setCursor({ s: si, j: ji })}
                        className={cx(
                          "grid aspect-square place-items-center rounded-md font-mono text-[10px] font-bold transition-all",
                          done ? "bg-lime text-ink" : "border border-line text-dim hover:border-white/40",
                          flagged && "bg-coral text-ink ring-0",
                          active && "ring-2 ring-paper ring-offset-2 ring-offset-panel",
                        )}
                      >
                        {ji + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 border-t border-line pt-3 font-mono text-[9px] text-dim">
            <p className="flex items-center gap-2"><span className="size-2.5 rounded bg-lime" /> ANSWERED</p>
            <p className="flex items-center gap-2"><span className="size-2.5 rounded bg-coral" /> FLAGGED</p>
            <p className="flex items-center gap-2"><span className="size-2.5 rounded border border-line" /> UNANSWERED</p>
          </div>
          <button onClick={() => setConfirming(true)} className="mt-4 w-full rounded-lg bg-coral py-3 font-mono text-xs font-black text-ink hover:bg-red-400">
            SUBMIT SCRIPT
          </button>
        </aside>
      </div>

      {/* mobile palette drawer */}
      <AnimatePresence>
        {showPalette && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPalette(false)}
              className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 240 }}
              className="fixed inset-y-0 right-0 z-50 w-[80%] max-w-xs overflow-y-auto border-l border-line bg-panel p-4 lg:hidden"
            >
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-widest text-dim">QUESTION PALETTE</p>
                <button onClick={() => setShowPalette(false)} aria-label="Close palette"><X size={18} /></button>
              </div>
              <div className="mt-4 space-y-4">
                {sections.map((s, si) => (
                  <div key={s.slug}>
                    <p className="mb-1.5 font-mono text-[9px] font-bold tracking-widest" style={{ color: s.color }}>
                      {s.name.toUpperCase()}
                    </p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {s.items.map((qq, ji) => {
                        const done = answers[qq.id] !== undefined;
                        const flagged = flags.has(qq.id);
                        return (
                          <button
                            key={qq.id}
                            onClick={() => { setCursor({ s: si, j: ji }); setShowPalette(false); }}
                            className={cx(
                              "grid aspect-square place-items-center rounded-md font-mono text-[10px] font-bold",
                              done ? "bg-lime text-ink" : "border border-line text-dim",
                              flagged && "bg-coral text-ink",
                            )}
                          >
                            {ji + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setShowPalette(false); setConfirming(true); }}
                className="mt-6 w-full rounded-lg bg-coral py-3 font-mono text-xs font-black text-ink"
              >
                SUBMIT SCRIPT
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* calculator */}
      <AnimatePresence>
        {showCalc && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className="fixed bottom-5 right-5 z-50"
          >
            <Calculator onClose={() => setShowCalc(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* confirm submit modal */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4 backdrop-blur-sm"
            onClick={() => !submitting && setConfirming(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-line bg-panel p-7"
            >
              <p className="font-mono text-[10px] tracking-[0.3em] text-coral">FINAL WARNING</p>
              <h3 className="mt-2 font-display text-xl font-black">SUBMIT YOUR SCRIPT?</h3>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                {[
                  [answeredCount, "ANSWERED", "text-lime"],
                  [totalQ - answeredCount, "UNANSWERED", totalQ - answeredCount > 0 ? "text-coral" : "text-dim"],
                  [flags.size, "FLAGGED", "text-iris"],
                ].map(([n, l, c]) => (
                  <div key={l as string} className="rounded-xl border border-line bg-ink px-2 py-4">
                    <p className={cx("font-display text-2xl font-black tabular", c as string)}>{n as number}</p>
                    <p className="mt-1 font-mono text-[8px] tracking-widest text-dim">{l}</p>
                  </div>
                ))}
              </div>
              {totalQ - answeredCount > 0 && (
                <p className="mt-4 flex items-start gap-2 rounded-lg border border-coral/40 bg-coral/10 px-3 py-2.5 text-[11px] leading-relaxed text-coral">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  {totalQ - answeredCount} question(s) will score zero. The invigilator cannot add time.
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setConfirming(false)}
                  disabled={submitting}
                  className="flex-1 rounded-xl border border-line py-3 text-xs font-bold text-dim hover:text-paper disabled:opacity-40"
                >
                  KEEP WRITING
                </button>
                <button
                  onClick={() => submit(false)}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-coral py-3 text-xs font-black text-ink hover:bg-red-400 disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
                  {submitting ? "MARKING…" : "SUBMIT NOW"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* submit FAB on mobile */}
      <button
        onClick={() => setConfirming(true)}
        className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full bg-coral px-6 py-3 font-mono text-xs font-black text-ink shadow-xl sm:hidden"
      >
        SUBMIT SCRIPT
      </button>
    </div>
  );
}
