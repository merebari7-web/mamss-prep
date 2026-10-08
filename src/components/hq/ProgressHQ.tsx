"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, ArrowRight, Brain, CalendarDays, CheckCircle2, Clock, Crown,
  Download, Flame, Gauge, ListChecks, Map, Medal, Play, ScrollText,
  Sparkles, Swords, Target, TrendingUp, Trophy, Zap,
} from "lucide-react";
import { cx, getClientId } from "@/lib/utils";
import { waecGrade, type SubjectInfo } from "@/lib/constants";

interface Attempt {
  id: string;
  mode: string;
  label: string;
  totalQuestions: number;
  correct: number;
  scorePct: number;
  utmeScore: number | null;
  durationSec: number;
  createdAt: string;
  meta: Record<string, unknown>;
}

interface TopicStat { subject: string; topic: string; correct: number; total: number; pct: number }

interface Stats {
  ok: boolean;
  streak: number;
  week: { date: string; count: number }[];
  bySubject: Record<string, { correct: number; total: number; pct: number }>;
  weakTopics: TopicStat[];
  strongTopics: TopicStat[];
  accuracy: number;
  readiness: number;
  headline: { papers: number; questions: number; correct: number; avgPct: number; bestPct: number; timeSec: number };
}

interface BoardEntry {
  id: string;
  alias: string;
  scorePct: number;
  utmeScore: number | null;
  totalQuestions: number;
  durationSec: number;
  label: string;
  createdAt: string;
}

export default function ProgressHQ({ subjects }: { subjects: SubjectInfo[] }) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [board, setBoard] = useState<BoardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinFor, setPinFor] = useState<string | null>(null);
  const [alias, setAlias] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  const cid = useMemo(() => (typeof window === "undefined" ? "" : getClientId()), []);

  useEffect(() => {
    if (!cid) return;
    const loadBoard = () =>
      fetch("/api/leaderboard").then((r) => r.json()).then((d) => setBoard(d.entries ?? [])).catch(() => {});
    loadBoard();
    Promise.all([
      fetch(`/api/attempts?clientId=${cid}`).then((r) => r.json()).catch(() => ({ attempts: [] })),
      fetch(`/api/stats?clientId=${cid}`).then((r) => r.json()).catch(() => null),
    ])
      .then(([a, s]) => {
        setAttempts(a.attempts ?? []);
        if (s?.ok) setStats(s);
      })
      .finally(() => setLoading(false));
  }, [cid]);

  // fallback mastery from attempt metadata when the answer log is still empty
  const fallbackMastery = useMemo(() => {
    const map: Record<string, { correct: number; total: number; pct: number }> = {};
    for (const a of attempts) {
      const bySubj = (a.meta as Record<string, unknown>)?.bySubject as
        | Record<string, { correct: number; total: number }>
        | undefined;
      if (!bySubj) continue;
      for (const [slug, v] of Object.entries(bySubj)) {
        map[slug] = map[slug] ?? { correct: 0, total: 0, pct: 0 };
        map[slug].correct += v.correct;
        map[slug].total += v.total;
      }
    }
    for (const k of Object.keys(map)) {
      map[k].pct = map[k].total ? Math.round((map[k].correct / map[k].total) * 100) : 0;
    }
    return map;
  }, [attempts]);

  const mastery =
    stats && Object.keys(stats.bySubject).length > 0 ? stats.bySubject : fallbackMastery;

  const headline = stats?.headline;
  const totalPapers = headline?.papers ?? attempts.length;
  const totalQuestions = headline?.questions ?? attempts.reduce((a, x) => a + x.totalQuestions, 0);
  const totalCorrect = headline?.correct ?? attempts.reduce((a, x) => a + x.correct, 0);
  const avgPct = headline?.avgPct ?? 0;
  const bestPct = headline?.bestPct ?? 0;
  const totalTime = headline?.timeSec ?? attempts.reduce((a, x) => a + x.durationSec, 0);

  const readiness = useMemo(() => {
    if (stats) return stats.readiness;
    if (!attempts.length) return 0;
    const recent = attempts.slice(0, 5);
    const avg = recent.reduce((a, x) => a + x.scorePct, 0) / recent.length;
    const coverage = Math.min(1, Object.keys(fallbackMastery).length / subjects.length);
    return Math.round(avg * 0.7 + coverage * 30);
  }, [stats, attempts, fallbackMastery, subjects.length]);

  const weakest = useMemo(() => {
    const entries = Object.entries(mastery).filter(([, v]) => v.total >= 3);
    if (!entries.length) return null;
    return entries.sort((a, b) => a[1].pct - b[1].pct)[0];
  }, [mastery]);

  const weekMax = Math.max(1, ...(stats?.week ?? []).map((d) => d.count));

  async function pinAttempt(attemptId: string) {
    if (!alias.trim() || alias.trim().length < 2) return;
    setPinBusy(true);
    try {
      await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: cid, alias: alias.trim(), attemptId }),
      });
      setPinFor(null);
      setAlias("");
      const d = await fetch("/api/leaderboard").then((r) => r.json());
      setBoard(d.entries ?? []);
    } finally {
      setPinBusy(false);
    }
  }

  const R = 54;
  const C = 2 * Math.PI * R;
  const empty = !loading && attempts.length === 0 && Object.keys(mastery).length === 0;

  return (
    <main className="relative min-h-screen px-4 pb-24 pt-28 sm:px-6">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-20 [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)]" />
      <div className="relative mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-mono text-xs tracking-[0.3em] text-dim">
              <Activity size={13} className="text-lime" /> YOUR COMMAND CENTER
            </p>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">
              Progress <span className="text-stroke">HQ</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-lime/30 bg-lime/5 px-3 py-1.5 font-mono text-[10px] font-bold text-lime">
              <Flame size={12} /> {stats?.streak ?? 0}-DAY STREAK
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-mono text-[10px] font-bold text-dim">
              <Gauge size={12} /> {stats?.accuracy ?? 0}% ACCURACY
            </span>
          </div>
        </header>

        {/* ── adaptive engine + today's plan ── */}
        <div className="mb-8 grid gap-4 md:grid-cols-[0.4fr_1fr]">
          {/* readiness ring */}
          <div className="rounded-2xl border border-amber-300/30 bg-panel p-6 text-center">
            <p className="flex items-center justify-center gap-2 font-mono text-[10px] tracking-widest text-amber-300">
              <Sparkles size={12} /> ADAPTIVE ENGINE
            </p>
            <div className="relative mx-auto mt-4 size-32">
              <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                <motion.circle
                  cx="60" cy="60" r={R}
                  fill="none"
                  stroke={readiness >= 60 ? "#c8f169" : readiness >= 35 ? "#FBBF24" : "#F87171"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={C}
                  initial={{ strokeDashoffset: C }}
                  animate={{ strokeDashoffset: C - (C * readiness) / 100 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <p className="font-display text-4xl font-black tabular">{readiness}%</p>
              </div>
            </div>
            <span className={cx(
              "mt-3 inline-block rounded-lg px-3 py-1.5 text-xs font-bold",
              readiness >= 60 ? "bg-lime/10 text-lime" : readiness >= 35 ? "bg-amber-400/10 text-amber-300" : "bg-coral/10 text-coral",
            )}>
              {readiness >= 60 ? "Exam ready" : readiness >= 35 ? "Keep revising" : "Start drilling"}
            </span>
            <p className="mt-2 text-[10px] text-dim">
              Server-computed · accuracy 55% · coverage 25% · consistency 20%
            </p>
          </div>

          {/* today's plan */}
          <div className="rounded-2xl border border-amber-300/30 bg-panel p-6">
            <p className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-amber-300">
              <Sparkles size={12} /> TODAY&apos;S PLAN — generated from your answer log
            </p>
            <div className="mt-4 space-y-3">
              {weakest && (
                <PlanRow
                  icon={<Target size={20} className="text-coral" />}
                  title={subjects.find((s) => s.slug === weakest[0])?.name ?? weakest[0]}
                  sub={`Weakest subject · ${weakest[1].pct}% accuracy over ${weakest[1].total} answers`}
                  href={`/practice?mode=smart&subject=${weakest[0]}`}
                  cta="Smart drill"
                />
              )}
              <PlanRow
                icon={<Brain size={20} className="text-lime" />}
                title="Smart Sprint"
                sub="The engine picks 10 questions aimed at your weak topics"
                href={weakest ? `/practice?mode=smart&subject=${weakest[0]}` : "/practice?mode=smart"}
                cta="Start"
              />
              <PlanRow
                icon={<Flame size={20} className="text-amber-300" />}
                title="Daily Challenge"
                sub={`5 questions, same for everyone today · streak ${stats?.streak ?? 0}d`}
                href="/daily"
                cta="Play"
              />
              <PlanRow
                icon={<Zap size={20} className="text-iris" />}
                title="Rapid Fire sprint"
                sub="60-second accuracy dash on any subject"
                href="/study/rapid-fire"
                cta="Go"
                accent="iris"
              />
            </div>
          </div>
        </div>

        {/* ── streak & activity ── */}
        <div className="mb-8 grid gap-4 md:grid-cols-[0.4fr_1fr]">
          <div className="flex items-center gap-5 rounded-2xl border border-line bg-panel p-6">
            <div className="grid size-16 place-items-center rounded-2xl bg-lime/10">
              <Flame size={30} className="text-lime" />
            </div>
            <div>
              <p className="font-display text-4xl font-black tabular">
                {stats?.streak ?? 0}
                <span className="ml-1 text-base font-bold text-dim">days</span>
              </p>
              <p className="mt-1 text-xs text-dim">Study streak — sit a paper every day to grow it.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-panel p-6">
            <p className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-dim">
              <CalendarDays size={12} /> LAST 7 DAYS · PAPERS SAT
            </p>
            <div className="mt-4 flex h-20 items-end gap-2">
              {(stats?.week ?? []).map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-14 w-full items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.count / weekMax) * 100}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={cx(
                        "w-full rounded-md",
                        d.count > 0 ? "bg-lime shadow-[0_0_16px_rgba(200,241,105,0.25)]" : "bg-white/5",
                      )}
                      style={{ minHeight: d.count > 0 ? 6 : 3 }}
                    />
                  </div>
                  <span className="font-mono text-[9px] uppercase text-dim">
                    {new Date(d.date + "T00:00:00Z").toLocaleDateString("en", { weekday: "narrow", timeZone: "UTC" })}
                  </span>
                </div>
              ))}
              {!stats && <p className="text-xs text-dim">No activity tracked yet.</p>}
            </div>
          </div>
        </div>

        {/* ── stat cards ── */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {[
            { v: String(totalPapers), l: "PAPERS SAT", Icon: ScrollText, c: "text-lime" },
            { v: String(totalQuestions), l: "QUESTIONS", Icon: ListChecks, c: "text-iris" },
            { v: String(totalCorrect), l: "CORRECT", Icon: CheckCircle2, c: "text-lime" },
            { v: `${avgPct}%`, l: "AVG SCORE", Icon: Gauge, c: "text-amber-300" },
            { v: `${bestPct}%`, l: "BEST SCORE", Icon: Trophy, c: "text-lime" },
            { v: `${Math.round(totalTime / 60)}m`, l: "STUDY TIME", Icon: Clock, c: "text-iris" },
          ].map(({ Icon, ...s }) => (
            <div key={s.l} className="rounded-xl border border-line bg-panel p-4 text-center">
              <Icon size={18} className={cx("mx-auto", s.c)} />
              <p className={cx("mt-2 font-display text-2xl font-black tabular", s.c)}>{s.v}</p>
              <p className="mt-1 font-mono text-[8px] tracking-widest text-dim">{s.l}</p>
            </div>
          ))}
        </div>

        {/* ── focus areas ── */}
        {stats && (stats.weakTopics.length > 0 || stats.strongTopics.length > 0) && (
          <div className="mb-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-coral/25 bg-panel p-6">
              <p className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-coral">
                <Target size={12} /> NEEDS WORK · from your answer log
              </p>
              <div className="mt-4 space-y-2">
                {stats.weakTopics.length === 0 && <p className="text-xs text-dim">No weak topics detected yet. Keep practising.</p>}
                {stats.weakTopics.map((t) => (
                  <Link
                    key={`${t.subject}-${t.topic}`}
                    href={`/practice?mode=smart&subject=${t.subject}`}
                    className="flex items-center justify-between rounded-xl border border-line bg-ink px-4 py-3 transition-colors hover:border-coral/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{t.topic}</p>
                      <p className="font-mono text-[10px] text-dim">{subjects.find((s) => s.slug === t.subject)?.name ?? t.subject}</p>
                    </div>
                    <span className="rounded-lg bg-coral/10 px-2.5 py-1 font-mono text-xs font-bold text-coral tabular">
                      {t.pct}%
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-lime/25 bg-panel p-6">
              <p className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-lime">
                <TrendingUp size={12} /> BANKED · your strongholds
              </p>
              <div className="mt-4 space-y-2">
                {stats.strongTopics.length === 0 && <p className="text-xs text-dim">Strong topics will appear once your accuracy climbs past 80%.</p>}
                {stats.strongTopics.map((t) => (
                  <div key={`${t.subject}-${t.topic}`} className="flex items-center justify-between rounded-xl border border-line bg-ink px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{t.topic}</p>
                      <p className="font-mono text-[10px] text-dim">{subjects.find((s) => s.slug === t.subject)?.name ?? t.subject}</p>
                    </div>
                    <span className="rounded-lg bg-lime/10 px-2.5 py-1 font-mono text-xs font-bold text-lime tabular">{t.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── mastery map ── */}
        <section id="mastery" className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-black">
            <Map size={18} className="text-lime" /> Mastery Map
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => {
              const m = mastery[s.slug];
              const pct = m?.pct ?? 0;
              const grade = waecGrade(pct);
              return (
                <Link
                  key={s.slug}
                  href={`/practice?subject=${s.slug}`}
                  className="group rounded-xl border border-line bg-panel p-4 transition-all hover:border-white/25"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold">{s.name}</h3>
                    <span className={cx("rounded px-2 py-0.5 font-mono text-[10px] font-bold",
                      pct >= 50 ? "bg-lime/10 text-lime" : pct > 0 ? "bg-coral/10 text-coral" : "bg-white/5 text-dim"
                    )}>
                      {m ? grade.grade : "—"}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] text-dim tabular">
                    {m ? `${m.correct}/${m.total} correct · ${pct}%` : "Not attempted yet"}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── weekly leaderboard ── */}
        <section id="board" className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-black">
              <Swords size={18} className="text-iris" /> Weekly Leaderboard
            </h2>
            <p className="font-mono text-[10px] text-dim">PIN A SCORE FROM YOUR RECORDS · OPT-IN ONLY</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-panel">
            {board.length === 0 ? (
              <div className="p-8 text-center">
                <Crown size={28} className="mx-auto text-dim" />
                <p className="mt-3 text-sm font-bold">The board is empty this week.</p>
                <p className="mt-1 text-xs text-dim">Sit a CBT mock, then pin your score below to take the crown.</p>
              </div>
            ) : (
              board.map((e, i) => (
                <div
                  key={e.id}
                  className={cx(
                    "flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-0",
                    i === 0 && "bg-lime/5",
                  )}
                >
                  <span className={cx(
                    "grid size-8 shrink-0 place-items-center rounded-lg font-display text-sm font-black",
                    i === 0 ? "bg-lime text-ink" : i === 1 ? "bg-white/15 text-paper" : i === 2 ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-dim",
                  )}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{e.alias}</p>
                    <p className="truncate font-mono text-[10px] text-dim">
                      {e.label} · {e.totalQuestions}Q · {Math.round(e.durationSec / 60)}m
                    </p>
                  </div>
                  {e.utmeScore != null && (
                    <span className="rounded-lg bg-iris/10 px-2.5 py-1 font-mono text-xs font-bold text-iris tabular">{e.utmeScore}/400</span>
                  )}
                  <span className={cx("rounded-lg px-3 py-1.5 font-display text-sm font-black tabular",
                    e.scorePct >= 50 ? "bg-lime/10 text-lime" : "bg-coral/10 text-coral")}>
                    {e.scorePct}%
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── records hall ── */}
        <section id="records" className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-black">
            <Medal size={18} className="text-amber-300" /> Records Hall
          </h2>
          {loading ? (
            <p className="text-sm text-dim">Loading your records...</p>
          ) : empty ? (
            <div className="rounded-2xl border border-line bg-panel p-8 text-center">
              <Trophy size={30} className="mx-auto text-dim" />
              <p className="mt-3 font-display text-lg font-bold">No records yet</p>
              <p className="mt-1 text-xs text-dim">Take a practice quiz or CBT session to start building your records.</p>
              <Link href="/practice" className="mt-4 inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-bold text-ink hover:bg-lime2">
                <Play size={15} /> Start practicing
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {attempts.map((a, i) => {
                const grade = waecGrade(a.scorePct);
                return (
                  <div key={a.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-panel p-4">
                    <span className="font-mono text-xs text-dim tabular">#{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{a.label}</p>
                      <p className="font-mono text-[10px] text-dim">
                        {a.mode === "cbt" ? "CBT" : a.mode === "daily" ? "Daily" : "Practice"} · {a.totalQuestions}Q · {Math.round(a.durationSec / 60)}m · {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {pinFor === a.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={alias}
                          onChange={(e) => setAlias(e.target.value)}
                          placeholder="Your alias (2–20 chars)"
                          maxLength={20}
                          className="w-40 rounded-lg border border-line bg-ink px-3 py-1.5 text-xs outline-none focus:border-lime"
                        />
                        <button
                          onClick={() => pinAttempt(a.id)}
                          disabled={pinBusy || alias.trim().length < 2}
                          className="rounded-lg bg-lime px-3 py-1.5 text-xs font-black text-ink disabled:opacity-40"
                        >
                          {pinBusy ? "..." : "Pin"}
                        </button>
                        <button onClick={() => setPinFor(null)} className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-dim">×</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setPinFor(a.id); setAlias(""); }}
                        className="inline-flex items-center gap-1 rounded-lg border border-iris/30 px-2.5 py-1.5 font-mono text-[10px] font-bold text-iris transition-colors hover:bg-iris/10"
                      >
                        <Crown size={11} /> Pin to board
                      </button>
                    )}
                    <div className="flex items-center gap-2">
                      <span className={cx("rounded-lg px-3 py-1.5 font-display text-sm font-black",
                        a.scorePct >= 50 ? "bg-lime/10 text-lime" : "bg-coral/10 text-coral"
                      )}>
                        {a.scorePct}%
                      </span>
                      <span className="rounded bg-white/5 px-2 py-1 font-mono text-[10px] font-bold text-dim">
                        {grade.grade}
                      </span>
                      {a.utmeScore != null && (
                        <span className="rounded bg-iris/10 px-2 py-1 font-mono text-[10px] font-bold text-iris tabular">
                          {a.utmeScore}/400
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── quick export / backup ── */}
        <section id="backup" className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-black">
            <Download size={18} className="text-lime" /> Backup &amp; Restore
          </h2>
          <div className="rounded-2xl border border-line bg-panel p-6">
            <p className="text-sm text-dim">Export your study data as JSON to back up or move to another device.</p>
            <button
              onClick={() => {
                const data = JSON.stringify({ attempts, stats, exported: new Date().toISOString() }, null, 2);
                const blob = new Blob([data], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `mamss-prep-backup-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-lime px-5 py-3 text-sm font-bold text-ink hover:bg-lime2"
            >
              <Download size={15} /> Export progress data
            </button>
          </div>
        </section>

        <p className="text-center font-mono text-[10px] text-dim">
          <ArrowRight size={10} className="mr-1 inline" /> Every answer you submit trains the adaptive engine.
        </p>
      </div>
    </main>
  );
}

function PlanRow({ icon, title, sub, href, cta, accent }: {
  icon: React.ReactNode; title: string; sub: string; href: string; cta: string; accent?: "iris";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{title}</p>
          <p className="truncate text-[11px] text-dim">{sub}</p>
        </div>
      </div>
      <Link
        href={href}
        className={cx(
          "shrink-0 rounded-lg px-4 py-2 text-xs font-black text-ink transition-colors",
          accent === "iris" ? "bg-iris hover:bg-purple-400" : "bg-lime hover:bg-lime2",
        )}
      >
        {cta}
      </Link>
    </div>
  );
}
