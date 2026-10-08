"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Database, Play, Timer } from "lucide-react";
import { nextExamDates, daysUntil } from "@/lib/constants";
import type { SubjectInfo } from "@/lib/constants";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

const rise = {
  hidden: { y: 60, opacity: 0 },
  show: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { delay: 0.1 * i, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function Diamond() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" className="mx-6 shrink-0 text-lime" fill="currentColor">
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

  const specs = [
    { Icon: Database, k: "Q-BANK", v: String(totalQuestions), note: "exam-grade questions live" },
    { Icon: Play, k: "SUBJECTS", v: "09", note: "core WAEC / JAMB papers" },
    { Icon: Timer, k: `JAMB ${jamb.getFullYear()}`, v: `${daysUntil(jamb)}d`, note: "until the real UTME" },
    { Icon: Timer, k: `WAEC ${waec.getFullYear()}`, v: `${daysUntil(waec)}d`, note: "until May/June papers" },
  ];

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden">
      {/* 3D backdrop + paper textures */}
      <div className="absolute inset-0 opacity-70 md:opacity-100">
        <Scene />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(85%_65%_at_72%_28%,transparent_35%,rgba(6,8,5,0.8)_100%)]" />
      <div className="graph-bg pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[88rem] flex-1 flex-col justify-center px-5 pb-16 pt-32 sm:px-8">
        {/* masthead row */}
        <motion.div variants={rise} initial="hidden" animate="show" custom={0} className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-[4px] border border-line bg-panel/70 backdrop-blur">
              <Image
                src="/media/mamss-logo.png"
                alt="Mater Misericordiae Secondary School crest"
                width={44}
                height={44}
                className="size-11 object-contain drop-shadow-[0_0_18px_rgba(205,231,74,0.2)]"
                priority
              />
            </span>
            <div>
              <p className="chip-mono">
                <span className="size-1.5 rounded-full bg-lime animate-pulse-dot" />
                Mater Misericordiae Secondary School
              </p>
              <p className="mt-1.5 pl-0.5 font-mono text-[9px] tracking-[0.3em] text-dim">
                SS1 → SS3 · NIGERIAN CURRICULUM · RUMUOMASI
              </p>
            </div>
          </div>
          <p className="hidden text-right font-mono text-[10px] leading-relaxed tracking-[0.25em] text-dim lg:block">
            THE EXAM-PREPARATION BULLETIN
            <br />
            <span className="text-paper/80">VOL. 09 — REVISED EDITION</span>
          </p>
        </motion.div>

        {/* headline */}
        <h1 className="mt-10 font-display font-black leading-[0.92] tracking-tight">
          <motion.span
            className="block text-[13.5vw] sm:text-[10vw] lg:text-[7.2rem]"
            variants={rise} initial="hidden" animate="show" custom={1}
          >
            FAIL IS NOT
          </motion.span>
          <motion.span
            className="block text-[13.5vw] sm:text-[10vw] lg:text-[7.2rem]"
            variants={rise} initial="hidden" animate="show" custom={2}
          >
            <span className="text-stroke">IN YOUR</span>{" "}
            <span className="serif-a text-lime">syllabus.</span>
          </motion.span>
        </h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <motion.div variants={rise} initial="hidden" animate="show" custom={3}>
            <p className="max-w-xl text-base leading-relaxed text-dim sm:text-lg">
              Curriculum-true quizzes for every term of senior secondary, a live CBT hall built
              the JAMB way, and an adaptive engine that learns your weak spots — with worked
              answers to the questions WAEC repeats.{" "}
              <span className="serif-a text-paper/90">Start in SS1. Finish with a first choice.</span>
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link href="/practice" className="btn btn-lime group">
                <Play size={13} className="transition-transform group-hover:scale-125" />
                Start practicing — free
              </Link>
              <Link href="/cbt" className="btn btn-ghost">
                <Timer size={13} />
                Enter the CBT hall
              </Link>
            </div>
          </motion.div>

          {/* spec sheet */}
          <motion.div variants={rise} initial="hidden" animate="show" custom={4} className="tick relative">
            <div className="grid grid-cols-2 rounded-[4px] border border-line bg-panel/70 backdrop-blur">
              {specs.map((s, i) => (
                <div
                  key={s.k + i}
                  className={
                    "p-4 sm:p-5 " +
                    (i % 2 === 0 ? "border-r border-line " : "") +
                    (i < 2 ? "border-b border-line" : "")
                  }
                >
                  <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.25em] text-dim">
                    <s.Icon size={10} className="text-lime" /> {s.k}
                  </p>
                  <p className="mt-1.5 font-display text-2xl font-black tabular sm:text-3xl">{s.v}</p>
                  <p className="mt-1 text-[10px] text-dim">{s.note}</p>
                </div>
              ))}
            </div>
            <Link
              href="/daily"
              className="group mt-3 flex items-center justify-between rounded-[4px] border border-lime/30 bg-lime/5 px-4 py-3 backdrop-blur transition-colors hover:bg-lime/10"
            >
              <span className="font-mono text-[10px] tracking-[0.22em] text-lime">
                TODAY&apos;S DAILY CHALLENGE IS LIVE
              </span>
              <ArrowUpRight size={15} className="text-lime transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* scroll cue */}
      <div className="relative z-10 flex justify-center pb-5">
        <motion.span animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }} className="text-dim">
          <ArrowDown size={18} />
        </motion.span>
      </div>

      {/* subjects ticker */}
      <div className="relative z-10 border-y border-line bg-panel/70 backdrop-blur-md">
        <div className="flex w-max animate-marquee items-center py-3.5">
          {[0, 1].map((rep) => (
            <div key={rep} className="flex items-center">
              {marquee.map((s, i) => (
                <span
                  key={`${rep}-${i}`}
                  className="flex items-center font-mono text-[11px] font-bold tracking-[0.2em] text-paper/75"
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
