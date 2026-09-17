"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, RotateCcw, Coffee, Brain } from "lucide-react";
import { cx } from "@/lib/utils";
import { formatClock } from "@/lib/constants";

const PRESETS = [
  { work: 25 * 60, rest: 5 * 60, label: "25 / 5", name: "Standard" },
  { work: 45 * 60, rest: 10 * 60, label: "45 / 10", name: "Deep" },
  { work: 15 * 60, rest: 3 * 60, label: "15 / 3", name: "Sprint" },
];

export default function FocusPage() {
  const [preset, setPreset] = useState(0);
  const [mode, setMode] = useState<"work" | "rest">("work");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(PRESETS[0].work);
  const [sessions, setSessions] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const tickRef = useRef(0);

  const p = PRESETS[preset];

  const reset = useCallback((newPreset?: number) => {
    const pi = newPreset ?? preset;
    setPreset(pi);
    setMode("work");
    setRunning(false);
    setRemaining(PRESETS[pi].work);
  }, [preset]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      tickRef.current += 1;
      if (tickRef.current >= 60) {
        tickRef.current = 0;
        setTotalMinutes((m) => m + 1);
      }
      setRemaining((r) => {
        if (r <= 1) {
          if (mode === "work") {
            setSessions((s) => s + 1);
            setMode("rest");
            return p.rest;
          } else {
            setMode("work");
            return p.work;
          }
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, mode, p]);

  const total = mode === "work" ? p.work : p.rest;
  const pct = ((total - remaining) / total) * 100;
  const R = 110;
  const C = 2 * Math.PI * R;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-24 pt-28 sm:px-6">
      <p className="font-mono text-xs tracking-[0.3em] text-dim">🔥 FOCUS LAB</p>
      <h1 className="mt-2 font-display text-2xl font-black">Pomodoro Timer</h1>
      <p className="mt-1 text-xs text-dim">Study hard, rest smart. Lock in.</p>

      {/* preset selector */}
      <div className="mt-6 flex gap-2">
        {PRESETS.map((pr, i) => (
          <button
            key={i}
            onClick={() => { reset(i); }}
            className={cx(
              "rounded-lg border px-4 py-2.5 font-mono text-xs font-bold transition-colors",
              preset === i ? "border-lime bg-lime/10 text-lime" : "border-line text-dim hover:text-paper",
            )}
          >
            {pr.name} ({pr.label})
          </button>
        ))}
      </div>

      {/* circular timer */}
      <div className="relative mt-10 size-64">
        <svg viewBox="0 0 240 240" className="size-full -rotate-90">
          <circle cx="120" cy="120" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <motion.circle
            cx="120" cy="120" r={R}
            fill="none"
            stroke={mode === "work" ? "#c8f169" : "#a78bfa"}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={C}
            animate={{ strokeDashoffset: C - (C * pct) / 100 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              {mode === "work" ? <Brain size={18} className="text-lime" /> : <Coffee size={18} className="text-iris" />}
              <span className={cx("font-mono text-xs font-bold tracking-widest", mode === "work" ? "text-lime" : "text-iris")}>
                {mode === "work" ? "FOCUS" : "REST"}
              </span>
            </div>
            <p className="mt-2 font-mono text-5xl font-black tabular">{formatClock(remaining)}</p>
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={() => reset()}
          className="grid size-12 place-items-center rounded-full border border-line text-dim transition-colors hover:text-paper"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={() => setRunning(!running)}
          className={cx(
            "grid size-16 place-items-center rounded-full text-ink transition-all",
            running ? "bg-coral hover:bg-red-400" : "bg-lime hover:bg-lime2",
          )}
        >
          {running ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </button>
      </div>

      {/* session stats */}
      <div className="mt-10 flex gap-6 text-center">
        <div>
          <p className="font-display text-3xl font-black text-lime tabular">{sessions}</p>
          <p className="font-mono text-[9px] tracking-widest text-dim">SESSIONS</p>
        </div>
        <div>
          <p className="font-display text-3xl font-black text-iris tabular">{totalMinutes}</p>
          <p className="font-mono text-[9px] tracking-widest text-dim">MINUTES TODAY</p>
        </div>
      </div>
    </main>
  );
}
