"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, animate } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookMarked,
  Calculator,
  DoorOpen,
  Flame,
  History,
  Keyboard,
  Layers,
  ListChecks,
  MonitorPlay,
  Timer,
  Zap,
  Sigma,
  BookOpen as BookOpenIcon,
  Atom,
  FlaskConical,
  Dna,
  TrendingUp,
  Landmark,
  Feather,
  Scale as ScaleIcon,
} from "lucide-react";
import { cx } from "@/lib/utils";
import type { SubjectInfo } from "@/lib/constants";
import { LEVELS, TERM_LABELS } from "@/lib/constants";

const ICONS: Record<string, typeof Sigma> = {
  Sigma,
  BookOpen: BookOpenIcon,
  Atom,
  FlaskConical,
  Dna,
  TrendingUp,
  Landmark,
  Feather,
  Scale: ScaleIcon,
};

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ y: 46, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v).toLocaleString() + suffix;
      },
    });
    return () => controls.stop();
  }, [inView, value, suffix]);
  return <span ref={ref} className="tabular">0{suffix}</span>;
}

/* ---------------- STATS ---------------- */

export function Stats({ totalQuestions }: { totalQuestions: number }) {
  const items = [
    { v: totalQuestions, s: "+", label: "expert-written questions" },
    { v: 9, s: "", label: "core WAEC / JAMB subjects" },
    { v: 3, s: "", label: "classes: SS1, SS2, SS3" },
    { v: 27, s: "", label: "term corridors to master" },
  ];
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-line lg:grid-cols-4">
        {items.map((it, i) => (
          <Reveal key={it.label} delay={i * 0.06} className="px-6 py-10">
            <p className="font-display text-4xl font-black text-paper sm:text-5xl">
              <CountUp value={it.v} suffix={it.s} />
            </p>
            <p className="mt-2 text-sm text-dim">{it.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------------- EXAM TRACKS ---------------- */

function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState("perspective(1100px) rotateX(0deg) rotateY(0deg)");
  return (
    <div
      ref={ref}
      style={{ transform: t }}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        setT(`perspective(1100px) rotateX(${(-py * 9).toFixed(2)}deg) rotateY(${(px * 11).toFixed(2)}deg)`);
        ref.current!.style.setProperty("--mx", `${((px + 0.5) * 100).toFixed(1)}%`);
        ref.current!.style.setProperty("--my", `${((py + 0.5) * 100).toFixed(1)}%`);
      }}
      onMouseLeave={() => setT("perspective(1100px) rotateX(0deg) rotateY(0deg)")}
      className={cx("preserve-3d transition-transform duration-200 ease-out will-change-transform", className)}
    >
      {children}
    </div>
  );
}

export function ExamTracks() {
  const tracks = [
    {
      tag: "WAEC / NECO",
      title: "School certificate track",
      body: "Objective papers graded the real WAEC way — A1 to F9. Drill term topics from SS1 so May never sneaks up on you.",
      meta: ["9 subjects", "A1–F9 grading", "Past-question patterns"],
      href: "/practice?exam=WAEC",
      accent: "text-lime",
      bar: "bg-lime",
    },
    {
      tag: "JAMB UTME",
      title: "The CBT track",
      body: "Four papers, one clock, a question palette and auto-submit. Simulated /400 aggregate so you always know your admission odds.",
      meta: ["English + 3 papers", "Scaled /400", "On-screen calculator"],
      href: "/cbt",
      accent: "text-iris",
      bar: "bg-iris",
    },
    {
      tag: "NECO & OTHERS",
      title: "External exam ready",
      body: "The same bank prepares you for NECO and school terminal exams — concord, calculus and the coups of 1966 included.",
      meta: ["Term-by-term", "Worked explanations", "Result history"],
      href: "/practice",
      accent: "text-coral",
      bar: "bg-coral",
    },
  ];
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal>
        <p className="font-mono text-xs tracking-[0.3em] text-dim">01 — PICK YOUR BATTLE</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-black tracking-tight sm:text-5xl">
          THREE EXAMS. <span className="text-stroke">ONE WEAPON.</span>
        </h2>
      </Reveal>
      <div className="persp mt-12 grid gap-5 lg:grid-cols-3">
        {tracks.map((t, i) => (
          <Reveal key={t.tag} delay={i * 0.1}>
            <TiltCard>
              <div className="card-sheen relative h-full overflow-hidden rounded-2xl border border-line bg-panel p-7">
                <span className={cx("absolute inset-x-0 top-0 h-1", t.bar)} />
                <p className={cx("font-mono text-xs tracking-[0.25em]", t.accent)}>{t.tag}</p>
                <h3 className="mt-3 font-display text-xl font-bold">{t.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-dim">{t.body}</p>
                <ul className="mt-5 space-y-2">
                  {t.meta.map((m) => (
                    <li key={m} className="flex items-center gap-2 text-xs text-paper/80">
                      <BadgeCheck size={13} className={t.accent} /> {m}
                    </li>
                  ))}
                </ul>
                <Link
                  href={t.href}
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-paper transition-colors hover:text-lime"
                >
                  Start this track <ArrowUpRight size={16} />
                </Link>
              </div>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------------- CURRICULUM TEASER ---------------- */

export function CurriculumTeaser({ subjects }: { subjects: SubjectInfo[] }) {
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("SS2");
  const [term, setTerm] = useState<number>(0); // 0 = all terms

  return (
    <section className="relative border-y border-line bg-panel/40 py-24 noise">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-dim">02 — CURRICULUM, UNLOCKED</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-black tracking-tight sm:text-5xl">
              CHOOSE A CLASS. <span className="text-stroke">CHOOSE A TERM.</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={cx(
                  "rounded-full px-5 py-2.5 font-display text-sm font-bold transition-all",
                  level === l ? "bg-lime text-ink" : "border border-line text-dim hover:text-paper",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.08} className="mt-6 flex flex-wrap items-center gap-2">
          <span className="mr-2 font-mono text-xs text-dim">TERM:</span>
          {[0, 1, 2, 3].map((t) => (
            <button
              key={t}
              onClick={() => setTerm(t)}
              className={cx(
                "rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                term === t ? "border-lime bg-lime/10 text-lime" : "border-line text-dim hover:text-paper",
              )}
            >
              {t === 0 ? "All terms" : TERM_LABELS[t]}
            </button>
          ))}
        </Reveal>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s, i) => {
            const Icon = ICONS[s.icon] ?? BookOpenIcon;
            const href = `/practice?subject=${s.slug}&level=${level}${term ? `&term=${term}` : ""}`;
            return (
              <Reveal key={s.slug} delay={Math.min(i * 0.04, 0.3)}>
                <Link
                  href={href}
                  className="group relative block overflow-hidden rounded-xl border border-line bg-ink p-5 transition-all hover:-translate-y-1 hover:border-white/25"
                >
                  <div className="flex items-start justify-between">
                    <span
                      className="grid size-11 place-items-center rounded-lg"
                      style={{ backgroundColor: `${s.color}1c`, color: s.color }}
                    >
                      <Icon size={20} />
                    </span>
                    <ArrowUpRight
                      size={18}
                      className="text-dim transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-lime"
                    />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold">{s.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-dim">{s.blurb}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                    <span className="font-mono text-[11px] text-dim">
                      <span className="font-bold text-paper tabular">{s.counts[level]}</span> {level} questions
                    </span>
                    <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-dim">
                      TERMS 1–3
                    </span>
                  </div>
                  <span
                    className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full blur-2xl transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ backgroundColor: `${s.color}30` }}
                  />
                </Link>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-8 flex justify-center">
          <Link
            href="/curriculum"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3 text-sm font-bold transition-colors hover:border-lime hover:text-lime"
          >
            Open the full curriculum browser <ArrowRight size={15} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- CBT PROMO ---------------- */

export function CbtPromo() {
  return (
    <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-28 sm:px-6 lg:grid-cols-2">
      <Reveal>
        <p className="font-mono text-xs tracking-[0.3em] text-dim">03 — THE LIVE CBT HALL</p>
        <h2 className="mt-3 font-display text-3xl font-black leading-[1.02] tracking-tight sm:text-5xl">
          WALK INTO JAMB
          <br />
          <span className="text-stroke">100 TIMES</span> BEFORE
          <br />
          THE REAL DAY.
        </h2>
        <p className="mt-5 max-w-md text-base leading-relaxed text-dim">
          Timed papers, a numbered question palette, on-screen calculator, flag-for-review and
          auto-submit when the clock dies — then a scored script with every explanation.
        </p>
        <ul className="mt-7 grid max-w-md grid-cols-2 gap-3 text-sm">
          {[
            [Timer, "Live exam clock"],
            [Layers, "1–40 question palette"],
            [Calculator, "Built-in calculator"],
            [Flame, "Score scaled /400"],
            [Keyboard, "Keyboard shortcuts"],
            [History, "Saved to history"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof Timer;
            return (
              <li key={label as string} className="flex items-center gap-2.5 rounded-lg border border-line bg-panel px-3.5 py-3">
                <I size={16} className="shrink-0 text-lime" />
                <span className="text-paper/85 text-xs font-medium">{label as string}</span>
              </li>
            );
          })}
        </ul>
        <Link
          href="/cbt"
          className="mt-9 inline-flex items-center gap-2 rounded-full bg-lime px-7 py-3.5 text-sm font-bold text-ink transition-all hover:bg-lime2 hover:shadow-[0_0_36px_rgba(200,241,105,0.4)]"
        >
          Take a mock UTME <ArrowRight size={16} />
        </Link>
      </Reveal>

      {/* mock exam window */}
      <Reveal delay={0.12} className="persp relative">
        <div className="preserve-3d relative mx-auto max-w-lg animate-floaty">
          <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/70 [transform:rotateX(6deg)_rotateY(-8deg)]">
            <div className="flex items-center justify-between border-b border-line bg-panel2 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-coral/70" />
                <span className="size-2.5 rounded-full bg-amber-400/70" />
                <span className="size-2.5 rounded-full bg-lime/70" />
              </div>
              <span className="font-mono text-[10px] tracking-widest text-dim">MAMSS CBT — UTME MOCK</span>
              <span className="font-mono text-xs font-bold text-lime tabular">01:58:22</span>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-[1.5fr_1fr]">
              <div>
                <p className="font-mono text-[10px] text-dim">PHYSICS · QUESTION 7 OF 10</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed">
                  A wave has frequency 50 Hz and wavelength 4 m. Its velocity is _____.
                </p>
                <div className="mt-4 space-y-2.5">
                  {[
                    ["A", "200 m/s", true],
                    ["B", "12.5 m/s", false],
                    ["C", "54 m/s", false],
                    ["D", "0.08 m/s", false],
                  ].map(([k, txt, sel]) => (
                    <div
                      key={k as string}
                      className={cx(
                        "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-xs",
                        sel ? "border-lime bg-lime/10" : "border-line bg-ink",
                      )}
                    >
                      <span
                        className={cx(
                          "grid size-6 place-items-center rounded-full font-mono text-[10px] font-bold",
                          sel ? "bg-lime text-ink" : "bg-white/10 text-paper",
                        )}
                      >
                        {k}
                      </span>
                      <span className={sel ? "text-lime" : "text-paper/85"}>{txt}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-between gap-4">
                <div className="grid grid-cols-5 gap-1.5 self-start">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <span
                      key={i}
                      className={cx(
                        "grid size-7 place-items-center rounded font-mono text-[9px] font-bold",
                        i < 9
                          ? "bg-lime text-ink"
                          : i === 9
                            ? "bg-coral text-ink"
                            : i === 7
                              ? "bg-lime text-ink ring-2 ring-paper"
                              : "border border-line text-dim",
                      )}
                    >
                      {i + 1}
                    </span>
                  ))}
                </div>
                <div className="rounded-xl border border-line bg-ink p-3">
                  <p className="font-mono text-[9px] tracking-widest text-dim">CALCULATOR</p>
                  <p className="mt-1 text-right font-mono text-lg text-lime tabular">50 × 4 = 200</p>
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "="].map((k) => (
                      <span key={k} className="grid h-6 place-items-center rounded bg-white/5 font-mono text-[10px] text-paper/80">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <span className="absolute -right-4 -top-5 animate-floaty rounded-full border border-lime/40 bg-ink px-4 py-2 font-mono text-[10px] font-bold tracking-widest text-lime shadow-xl">
            AUTO-SUBMITS AT 00:00
          </span>
          <span
            className="absolute -bottom-6 -left-4 animate-floaty rounded-full border border-iris/40 bg-ink px-4 py-2 font-mono text-[10px] font-bold tracking-widest text-iris shadow-xl"
            style={{ animationDelay: "-3s" }}
          >
            SCALED TO /400
          </span>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------------- FEATURES ---------------- */

export function Features() {
  const feats = [
    { icon: BookMarked, t: "Curriculum-true", d: "Every question tagged to class, term and WAEC/JAMB syllabus topic. Nothing you shouldn't be reading." },
    { icon: ListChecks, t: "Worked explanations", d: "Each option defended. See the working behind the answer, not just the letter." },
    { icon: MonitorPlay, t: "Real CBT conditions", d: "The hall experience — palette, clock, calculator, auto-submit — on your phone." },
    { icon: Zap, t: "Flashcards & Rapid Fire", d: "Flip-card recall drills and 30–90 second sprints that push your speed ceiling." },
    { icon: Layers, t: "16 study tools", d: "Flashcards, Spelling Lab, Focus Lab, Mastery Map, Formula Vault, Periodic Table — all in one Study Hall." },
    { icon: DoorOpen, t: "Progress HQ", d: "Readiness score, mastery heat-map, records hall, report card and backup — all tracked on your device." },
  ];
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <Reveal>
          <p className="font-mono text-xs tracking-[0.3em] text-dim">04 — WHY IT WORKS</p>
          <h2 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-5xl">
            BUILT LIKE AN <span className="text-lime">A1</span> STUDENT.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {feats.map((f, i) => (
            <Reveal key={f.t} delay={Math.min(i * 0.05, 0.3)}>
              <div className="group h-full rounded-xl border border-line bg-panel p-6 transition-all hover:-translate-y-1 hover:border-lime/40">
                <span className="grid size-10 place-items-center rounded-lg bg-lime/10 text-lime">
                  <f.icon size={18} />
                </span>
                <h3 className="mt-4 font-display text-sm font-bold">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dim">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- BIG BAND ---------------- */

export function BigBand() {
  return (
    <div className="overflow-hidden border-y border-line bg-lime py-5">
      <div className="flex w-max animate-marquee-slow items-center">
        {[0, 1].map((rep) => (
          <div key={rep} className="flex items-center">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="flex items-center gap-6 pr-6 font-display text-2xl font-black tracking-tight text-ink">
                READ LIKE YOUR ADMISSION DEPENDS ON IT
                <svg width="16" height="16" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0l6 6-6 6-6-6z" /></svg>
                <span className="text-ink/40">BECAUSE IT DOES</span>
                <svg width="16" height="16" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0l6 6-6 6-6-6z" /></svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
