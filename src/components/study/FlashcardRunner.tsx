"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Loader2, RotateCcw, X } from "lucide-react";
import { cx, shuffle } from "@/lib/utils";
import type { SubjectInfo } from "@/lib/constants";

interface Card {
  id: number;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  topic: string;
  subjectSlug: string;
}

export default function FlashcardRunner({ subjects }: { subjects: SubjectInfo[] }) {
  const [subject, setSubject] = useState("mathematics");
  const [level, setLevel] = useState("SS2");
  const [cards, setCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<"setup" | "loading" | "run" | "done">("setup");

  const card = cards[idx];
  const remaining = cards.length - known.size;

  const begin = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await fetch(`/api/questions?subject=${subject}&level=${level}&limit=20&mode=practice`);
      const data = await res.json();
      const qs: Card[] = (data.questions ?? []).map((q: Record<string, unknown>) => ({
        id: q.id as number,
        question: q.question as string,
        options: q.options as string[],
        answerIndex: q.answerIndex as number,
        explanation: q.explanation as string,
        topic: q.topic as string,
        subjectSlug: q.subjectSlug as string,
      }));
      setCards(shuffle(qs));
      setIdx(0);
      setFlipped(false);
      setKnown(new Set());
      setPhase(qs.length > 0 ? "run" : "setup");
    } catch {
      setPhase("setup");
    }
  }, [subject, level]);

  const markKnown = () => {
    if (!card) return;
    setKnown((s) => new Set(s).add(card.id));
    next();
  };

  const next = () => {
    setFlipped(false);
    if (idx + 1 < cards.length) setIdx(idx + 1);
    else if (remaining <= 1) setPhase("done");
    else setIdx(0);
  };

  const prev = () => {
    setFlipped(false);
    if (idx > 0) setIdx(idx - 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "run") return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "k" || e.key === "K") markKnown();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx, cards, card]);

  const meta = subjects.find((s) => s.slug === subject);

  if (phase === "setup" || phase === "loading") {
    return (
      <main className="relative min-h-screen px-4 pb-24 pt-28 sm:px-6">
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-line bg-panel p-6">
            <p className="font-mono text-xs tracking-[0.25em] text-dim">📇 FLASHCARD DECK</p>
            <h2 className="mt-2 font-display text-2xl font-black">Build your deck</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block font-mono text-[11px] tracking-widest text-dim">SUBJECT</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {subjects.map((s) => (
                    <button
                      key={s.slug}
                      onClick={() => setSubject(s.slug)}
                      className={cx(
                        "rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-all",
                        subject === s.slug ? "border-lime bg-lime/10 text-lime" : "border-line text-paper/80 hover:border-white/25",
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] tracking-widest text-dim">CLASS</label>
                <div className="flex overflow-hidden rounded-lg border border-line">
                  {["SS1", "SS2", "SS3"].map((l) => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className={cx("flex-1 py-2.5 text-xs font-bold transition-colors", level === l ? "bg-lime text-ink" : "text-dim hover:text-paper")}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={begin}
                disabled={phase === "loading"}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-lime py-4 text-sm font-black text-ink transition-all hover:bg-lime2 disabled:opacity-60"
              >
                {phase === "loading" ? <Loader2 size={17} className="animate-spin" /> : <>SHUFFLE & START <ArrowRight size={16} /></>}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "done") {
    return (
      <main className="relative grid min-h-screen place-items-center px-4 pb-24 pt-28 sm:px-6">
        <div className="text-center">
          <p className="text-5xl">🎉</p>
          <h2 className="mt-4 font-display text-3xl font-black">Deck mastered!</h2>
          <p className="mt-2 text-sm text-dim">You marked all {cards.length} cards as known.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={begin} className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-bold text-ink hover:bg-lime2">
              <RotateCcw size={15} /> New deck
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen px-4 pb-24 pt-28 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="font-display text-sm font-bold">{meta?.name} · {level}</p>
            <p className="font-mono text-[10px] text-dim">{remaining} cards remaining · {known.size} mastered</p>
          </div>
          <button onClick={() => setPhase("setup")} className="grid size-9 place-items-center rounded-lg border border-line text-dim hover:text-paper">
            <X size={16} />
          </button>
        </div>

        {/* progress */}
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${(known.size / cards.length) * 100}%` }} />
        </div>

        {/* card */}
        <div className="persp">
          <motion.div
            onClick={() => setFlipped(!flipped)}
            className="preserve-3d relative mx-auto aspect-[4/3] max-w-lg cursor-pointer select-none"
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 25 }}
          >
            {/* front */}
            <div className="absolute inset-0 rounded-2xl border border-line bg-panel p-6 shadow-xl [backface-visibility:hidden] flex flex-col justify-center">
              <p className="rounded bg-white/5 px-2 py-1 text-center font-mono text-[9px] tracking-widest text-dim">{card?.topic?.toUpperCase()}</p>
              <p className="mt-4 text-center text-lg font-semibold leading-relaxed sm:text-xl">{card?.question}</p>
              <p className="mt-6 text-center font-mono text-[10px] text-dim">TAP TO REVEAL ANSWER</p>
            </div>
            {/* back */}
            <div className="absolute inset-0 rounded-2xl border border-lime/40 bg-panel p-6 shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-center">
              <p className="text-center font-mono text-[10px] tracking-widest text-lime">ANSWER</p>
              <p className="mt-3 text-center text-xl font-black text-lime">{card?.options?.[card?.answerIndex]}</p>
              <p className="mx-auto mt-4 max-w-md text-center text-sm leading-relaxed text-dim">{card?.explanation}</p>
            </div>
          </motion.div>
        </div>

        {/* controls */}
        <div className="mt-6 flex items-center justify-between">
          <button onClick={prev} disabled={idx === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2.5 text-xs font-bold text-dim hover:text-paper disabled:opacity-30">
            <ChevronLeft size={14} /> PREV
          </button>
          <button onClick={markKnown} className="inline-flex items-center gap-2 rounded-lg bg-lime/10 px-5 py-2.5 text-xs font-bold text-lime hover:bg-lime/20">
            <Check size={14} /> I KNOW THIS
          </button>
          <button onClick={next} className="inline-flex items-center gap-1.5 rounded-lg bg-lime px-5 py-2.5 text-xs font-black text-ink hover:bg-lime2">
            NEXT <ChevronRight size={14} />
          </button>
        </div>
        <p className="mt-3 text-center font-mono text-[9px] text-dim">SPACE TO FLIP · ARROWS TO NAVIGATE · K = KNOW IT</p>
      </div>
    </main>
  );
}
