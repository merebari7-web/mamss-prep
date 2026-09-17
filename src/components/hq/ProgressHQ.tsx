"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, BarChart3, Clock, Download, Flame, Medal, Play,
  Target, TrendingUp, Trophy,
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

export default function ProgressHQ({ subjects }: { subjects: SubjectInfo[] }) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cid = getClientId();
    fetch(`/api/attempts?clientId=${cid}`)
      .then((r) => r.json())
      .then((d) => setAttempts(d.attempts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // stats
  const totalPapers = attempts.length;
  const totalQuestions = attempts.reduce((a, x) => a + x.totalQuestions, 0);
  const totalCorrect = attempts.reduce((a, x) => a + x.correct, 0);
  const avgPct = totalPapers ? Math.round(attempts.reduce((a, x) => a + x.scorePct, 0) / totalPapers) : 0;
  const bestPct = totalPapers ? Math.max(...attempts.map((a) => a.scorePct)) : 0;
  const totalTime = attempts.reduce((a, x) => a + x.durationSec, 0);

  // per-subject mastery
  const mastery = useMemo(() => {
    const map: Record<string, { correct: number; total: number }> = {};
    for (const a of attempts) {
      const bySubj = (a.meta as Record<string, unknown>)?.bySubject as Record<string, { correct: number; total: number }> | undefined;
      if (bySubj) {
        for (const [slug, v] of Object.entries(bySubj)) {
          map[slug] = map[slug] ?? { correct: 0, total: 0 };
          map[slug].correct += v.correct;
          map[slug].total += v.total;
        }
      }
    }
    return map;
  }, [attempts]);

  // readiness score
  const readiness = useMemo(() => {
    if (!totalPapers) return 0;
    const recent = attempts.slice(0, 5);
    const avg = recent.reduce((a, x) => a + x.scorePct, 0) / recent.length;
    const subjectsCovered = Object.keys(mastery).length;
    const coverage = Math.min(1, subjectsCovered / subjects.length);
    return Math.round(avg * 0.7 + coverage * 30);
  }, [attempts, mastery, subjects.length, totalPapers]);

  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <main className="relative min-h-screen px-4 pb-24 pt-28 sm:px-6">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-20 [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)]" />
      <div className="relative mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="font-mono text-xs tracking-[0.3em] text-dim">📊 YOUR COMMAND CENTER</p>
          <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">
            Progress <span className="text-stroke">HQ</span>
          </h1>
        </header>

        {/* ── adaptive engine + today's plan ── */}
        <div className="mb-8 grid gap-4 md:grid-cols-[0.4fr_1fr]">
          {/* readiness ring */}
          <div className="rounded-2xl border border-amber-300/30 bg-panel p-6 text-center">
            <p className="flex items-center justify-center gap-2 font-mono text-[10px] tracking-widest text-amber-300">
              <Sparkle /> ADAPTIVE ENGINE
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
            <p className="mt-2 text-[10px] text-dim">Exam readiness · topics + mastery + consistency</p>
          </div>

          {/* today's plan */}
          <div className="rounded-2xl border border-amber-300/30 bg-panel p-6">
            <p className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-amber-300">
              <Sparkle /> TODAY&apos;S PLAN
            </p>
            <div className="mt-4 space-y-3">
              {/* weakest subject */}
              {Object.entries(mastery).length > 0 && (() => {
                const weakest = Object.entries(mastery).sort((a, b) => {
                  const pa = a[1].total ? a[1].correct / a[1].total : 1;
                  const pb = b[1].total ? b[1].correct / b[1].total : 1;
                  return pa - pb;
                })[0];
                const meta = subjects.find((s) => s.slug === weakest[0]);
                const pct = weakest[1].total ? Math.round((weakest[1].correct / weakest[1].total) * 100) : 0;
                return (
                  <div className="flex items-center justify-between rounded-xl border border-line bg-ink p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🎯</span>
                      <div>
                        <p className="text-sm font-bold">{meta?.name ?? weakest[0]}</p>
                        <p className="text-[11px] text-dim">Weakest topic · {pct}% accuracy</p>
                      </div>
                    </div>
                    <Link href={`/practice?subject=${weakest[0]}`} className="rounded-lg bg-lime px-4 py-2 text-xs font-black text-ink hover:bg-lime2">
                      Drill
                    </Link>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between rounded-xl border border-line bg-ink p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🧠</span>
                  <div>
                    <p className="text-sm font-bold">Smart paper</p>
                    <p className="text-[11px] text-dim">10 questions aimed at your weak areas</p>
                  </div>
                </div>
                <Link href="/practice" className="rounded-lg bg-lime px-4 py-2 text-xs font-black text-ink hover:bg-lime2">
                  Start
                </Link>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-line bg-ink p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⏰</span>
                  <div>
                    <p className="text-sm font-bold">Rapid Fire sprint</p>
                    <p className="text-[11px] text-dim">60-second dash on any subject</p>
                  </div>
                </div>
                <Link href="/study/rapid-fire" className="rounded-lg bg-iris px-4 py-2 text-xs font-black text-ink hover:bg-purple-400">
                  Go
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── stat cards ── */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {[
            { v: totalPapers, l: "PAPERS SAT", icon: "📋", c: "text-lime" },
            { v: totalQuestions, l: "QUESTIONS", icon: "📝", c: "text-iris" },
            { v: totalCorrect, l: "CORRECT", icon: "✅", c: "text-lime" },
            { v: `${avgPct}%`, l: "AVG SCORE", icon: "📊", c: "text-amber-300" },
            { v: `${bestPct}%`, l: "BEST SCORE", icon: "🏆", c: "text-lime" },
            { v: `${Math.round(totalTime / 60)}m`, l: "STUDY TIME", icon: "⏱️", c: "text-iris" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-line bg-panel p-4 text-center">
              <p className="text-lg">{s.icon}</p>
              <p className={cx("font-display text-2xl font-black tabular", s.c)}>{s.v}</p>
              <p className="mt-1 font-mono text-[8px] tracking-widest text-dim">{s.l}</p>
            </div>
          ))}
        </div>

        {/* ── mastery map ── */}
        <section id="mastery" className="mb-8">
          <h2 className="mb-4 font-display text-lg font-black">🗺️ Mastery Map</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => {
              const m = mastery[s.slug];
              const pct = m && m.total ? Math.round((m.correct / m.total) * 100) : 0;
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
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                  </div>
                  <p className="mt-1.5 font-mono text-[10px] text-dim tabular">
                    {m ? `${m.correct}/${m.total} correct · ${pct}%` : "Not attempted yet"}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── records hall ── */}
        <section id="records" className="mb-8">
          <h2 className="mb-4 font-display text-lg font-black">🏅 Records Hall</h2>
          {loading ? (
            <p className="text-sm text-dim">Loading your records...</p>
          ) : attempts.length === 0 ? (
            <div className="rounded-2xl border border-line bg-panel p-8 text-center">
              <p className="text-3xl">📭</p>
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
                  <div key={a.id} className="flex items-center gap-4 rounded-xl border border-line bg-panel p-4">
                    <span className="font-mono text-xs text-dim tabular">#{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{a.label}</p>
                      <p className="font-mono text-[10px] text-dim">
                        {a.mode === "cbt" ? "CBT" : "Practice"} · {a.totalQuestions}Q · {Math.round(a.durationSec / 60)}m · {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                    </div>
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
          <h2 className="mb-4 font-display text-lg font-black">💾 Backup & Restore</h2>
          <div className="rounded-2xl border border-line bg-panel p-6">
            <p className="text-sm text-dim">Export your study data as JSON to back up or move to another device.</p>
            <button
              onClick={() => {
                const data = JSON.stringify({ attempts, exported: new Date().toISOString() }, null, 2);
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
      </div>
    </main>
  );
}

function Sparkle() {
  return <span className="text-amber-300">✦</span>;
}
