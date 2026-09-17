"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ChevronDown, Play, Timer, Database } from "lucide-react";
import { nextExamDates, daysUntil } from "@/lib/constants";
import type { SubjectInfo } from "@/lib/constants";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

const rise = {
  hidden: { y: 60, opacity: 0 },
  show: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { delay: 0.12 * i, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function Diamond() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="mx-5 shrink-0 text-lime" fill="currentColor">
      <path d="M6 0l6 6-6 6-6-6z" />
    </svg>
  );
}

export default function Hero({
  subjects,
  totalQuestions,
}: {
  subjects: SubjectInfo[];
  totalQuestions: number;
}) {
  const { jamb, waec } = nextExamDates();
  const marquee = [...subjects, ...subjects, ...subjects];

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden">
      {/* 3D backdrop */}
      <div className="absolute inset-0 opacity-70 md:opacity-100">
        <Scene />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_70%_30%,transparent_40%,rgba(6,8,10,0.75)_100%)]" />
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 pb-24 pt-32 sm:px-6">
        {/* School logo + badge */}
        <motion.div variants={rise} initial="hidden" animate="show" custom={0} className="flex items-center gap-4">
          <Image
            src="/media/mamss-logo.png"
            alt="Mater Misericordiae Secondary School Logo"
            width={72}
            height={72}
            className="size-16 object-contain drop-shadow-[0_0_20px_rgba(200,241,105,0.2)] sm:size-[72px]"
            priority
          />
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 px-4 py-1.5 font-mono text-[11px] tracking-[0.2em] text-dim backdrop-blur">
              <span className="size-1.5 rounded-full bg-lime animate-pulse-dot" />
              MATER MISERICORDIAE SECONDARY SCHOOL
            </p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.25em] text-dim/60">
              SS1 → SS3 · NIGERIAN CURRICULUM · MORALS AND EXCELLENCE
            </p>
          </div>
        </motion.div>

        <h1 className="mt-6 font-display text-[13vw] font-black leading-[0.92] tracking-tight sm:text-[9vw] lg:text-[6.4rem]">
          <motion.span className="block" variants={rise} initial="hidden" animate="show" custom={1}>
            FAIL IS NOT
          </motion.span>
          <motion.span
            className="block text-stroke"
            variants={rise}
            initial="hidden"
            animate="show"
            custom={2}
          >
            IN YOUR
          </motion.span>
          <motion.span className="block" variants={rise} initial="hidden" animate="show" custom={3}>
            SYLLABUS<span className="text-lime">.</span>
          </motion.span>
        </h1>

        <motion.p
          variants={rise}
          initial="hidden"
          animate="show"
          custom={4}
          className="mt-6 max-w-xl text-base leading-relaxed text-dim sm:text-lg"
        >
          MAMSS Prep — curriculum-true quizzes for every term of senior secondary, a live CBT hall
          built the JAMB way, and worked answers to the questions WAEC repeats.{" "}
          <span className="text-paper">Start in SS1. Finish with a first choice.</span>
        </motion.p>

        <motion.div
          variants={rise}
          initial="hidden"
          animate="show"
          custom={5}
          className="mt-9 flex flex-wrap items-center gap-4"
        >
          <Link
            href="/practice"
            className="group inline-flex items-center gap-2 rounded-full bg-lime px-7 py-3.5 text-sm font-bold text-ink transition-all hover:bg-lime2 hover:shadow-[0_0_36px_rgba(200,241,105,0.4)]"
          >
            <Play size={16} className="transition-transform group-hover:scale-125" />
            Start practicing — free
          </Link>
          <Link
            href="/cbt"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-sm font-bold text-paper backdrop-blur transition-colors hover:border-lime hover:text-lime"
          >
            <Timer size={16} />
            Enter the CBT hall
          </Link>
        </motion.div>

        <motion.div
          variants={rise}
          initial="hidden"
          animate="show"
          custom={6}
          className="mt-12 flex flex-wrap items-center gap-3"
        >
          <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel/70 px-4 py-2.5 font-mono text-xs backdrop-blur">
            <Database size={13} className="text-lime" />
            <span className="tabular font-bold text-paper">{totalQuestions}</span>
            <span className="text-dim">exam-grade questions live</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel/70 px-4 py-2.5 font-mono text-xs backdrop-blur">
            <span className="text-lime">JAMB {jamb.getFullYear()}</span>
            <span className="tabular font-bold">{daysUntil(jamb)}d</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel/70 px-4 py-2.5 font-mono text-xs backdrop-blur">
            <span className="text-iris">WAEC {waec.getFullYear()}</span>
            <span className="tabular font-bold">{daysUntil(waec)}d</span>
          </span>
        </motion.div>
      </div>

      {/* scroll cue */}
      <div className="relative z-10 flex justify-center pb-6">
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="text-dim"
        >
          <ChevronDown size={20} />
        </motion.span>
      </div>

      {/* marquee */}
      <div className="relative z-10 border-y border-line bg-panel/60 backdrop-blur-md">
        <div className="flex w-max animate-marquee items-center py-4">
          {[0, 1].map((rep) => (
            <div key={rep} className="flex items-center">
              {marquee.map((s, i) => (
                <span
                  key={`${rep}-${i}`}
                  className="flex items-center font-display text-sm font-bold tracking-wide text-paper/80"
                >
                  {s.name.toUpperCase()}
                  <Diamond />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
