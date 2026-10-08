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
  Brain,
  Swords,
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

/** Chapter opener: mono index rule + display title + optional right slot. */
function Chapter({ index, eyebrow, title, right }: {
  index: string;
  eyebrow: string;
  title: ReactNode;
  right?: ReactNode;
}) {
  return (
    <Reveal className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="rule-label">
          <span className="text-lime">{index}</span> · {eyebrow}
        </p>
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-black leading-[1.02] tracking-tight sm:text-5xl">
          {title}
        </h2>
      </div>
      {right}
    </Reveal>
  );
}

/* ---------------- STATS ---------------- */

export function Stats({ totalQuestions }: { totalQuestions: number }) {
  const items = [
    { v: totalQuestions, s: "+", label: "expert-written questions", note: "worked answers included" },
    { v: 9, s: "", label: "core WAEC / JAMB subjects", note: "Mathematics to Civic Education" },
    { v: 3, s: "", label: "classes: SS1, SS2, SS3", note: "the full senior corridor" },
    { v: 27, s: "", label: "term corridors to master", note: "9 subjects × 3 terms" },
  ];
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-[88rem] grid-cols-2 divide-x divide-y divide-line lg:grid-cols-4 lg:divide-y-0">
        {items.map((it, i) => (
          <Reveal key={it.label} delay={i * 0.06} className="group relative overflow-hidden px-6 py-10">
            <span className="ghost-num absolute -right-2 -top-3 text-6xl transition-opacity group-hover:opacity-150">
              0{i + 1}
            </span>
            <p className="font-display text-4xl font-black text-paper tabular sm:text-5xl">
              <CountUp value={it.v} suffix={it.s} />
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/80">{it.label}</p>
            <p className="serif-a mt-1 text-sm text-dim">{it.note}</p>
            <span className="mt-4 block h-px w-8 bg-lime transition-all duration-500 group-hover:w-full" />
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
      gloss: "the long game",
      body: "Objective papers graded the real WAEC way — A1 to F9. Drill term topics from SS1 so May never sneaks up on you.",
      meta: ["9 subjects", "A1–F9 grading", "Past-question patterns"],
      href: "/practice?exam=WAEC",
      accent: "text-lime",
      bar: "bg-lime",
    },
    {
      tag: "JAMB UTME",
      title: "The CBT track",
      gloss: "the dress rehearsal",
      body: "Four papers, one clock, a question palette and auto-submit. Simulated /400 aggregate so you always know your admission odds.",
      meta: ["English + 3 papers", "Scaled /400", "On-screen calculator"],
      href: "/cbt",
      accent: "text-iris",
      bar: "bg-iris",
    },
    {
      tag: "ADAPTIVE",
      title: "Smart Sprint track",
      gloss: "the personal tutor",
      body: "The engine reads your answer log, finds the topics you keep missing and serves them back until they stick.",
      meta: ["Weak-topic targeting", "Difficulty calibration", "Daily streaks & board"],
      href: "/practice?mode=smart",
      accent: "text-brass",
      bar: "bg-brass",
    },
  ];
  return (
    <section className="relative mx-auto max-w-[88rem] px-5 py-24 sm:px-8">
      <Chapter
        index="01"
        eyebrow="Pick your battle"
        title={<>THREE PATHS. <span className="text-stroke">ONE</span> <span className="serif-a font-normal text-lime">weapon.</span></>}
      />
      <div className="persp mt-12 grid gap-5 lg:grid-cols-3">
        {tracks.map((t, i) => (
          <Reveal key={t.tag} delay={i * 0.1}>
            <TiltCard>
              <div className="card-sheen tick relative h-full overflow-hidden rounded-[6px] border border-line bg-panel p-7">
                <span className={cx("absolute inset-x-0 top-0 h-[3px]", t.bar)} />
                <div className="flex items-baseline justify-between gap-3">
                  <p className={cx("font-mono text-[11px] tracking-[0.25em]", t.accent)}>{t.tag}</p>
                  <span className="ghost-num text-4xl">0{i + 1}</span>
                </div>
                <h3 className="mt-3 font-display text-xl font-bold">{t.title}</h3>
                <p className="serif-a text-sm text-dim">{t.gloss}</p>
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
                  className="link-u mt-7 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-paper transition-colors hover:text-lime"
                >
                  Start this track <ArrowUpRight size={14} />
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
      <div className="relative mx-auto max-w-[88rem] px-5 sm:px-8">
        <Chapter
          index="02"
          eyebrow="Curriculum, unlocked"
          title={<>CHOOSE A CLASS. <span className="text-stroke">CHOOSE A</span> <span className="serif-a font-normal text-lime">term.</span></>}
          right={
            <div className="flex items-center gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={cx(
                    "btn btn-sm",
                    level === l ? "btn-lime" : "btn-ghost text-dim hover:text-paper",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          }
        />

        <Reveal delay={0.08} className="mt-7 flex flex-wrap items-center gap-2">
          <span className="mr-2 font-mono text-[10px] tracking-[0.25em] text-dim">TERM:</span>
          {[0, 1, 2, 3].map((t) => (
            <button
              key={t}
              onClick={() => setTerm(t)}
              className={cx(
                "rounded-[3px] border px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors",
                term === t ? "border-lime bg-lime/10 text-lime" : "border-line text-dim hover:text-paper",
              )}
            >
              {t === 0 ? "All" : TERM_LABELS[t]}
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
                  className="card-ed group block overflow-hidden p-5"
                >
                  <div className="flex items-start justify-between">
                    <span
                      className="grid size-11 place-items-center rounded-[4px]"
                      style={{ backgroundColor: `${s.color}1c`, color: s.color }}
                    >
                      <Icon size={20} />
                    </span>
                    <ArrowUpRight
                      size={18}
                      className="text-dim transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-lime"
                    />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold">{s.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-dim">{s.blurb}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                    <span className="font-mono text-[11px] text-dim">
                      <span className="font-bold text-paper tabular">{s.counts[level]}</span> {level} QUESTIONS
                    </span>
                    <span className="rounded-[3px] bg-white/5 px-2 py-0.5 font-mono text-[9px] tracking-widest text-dim">
                      T1–T3
                    </span>
                  </div>
                  <span
                    className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-100"
                    style={{ backgroundColor: `${s.color}30` }}
                  />
                </Link>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-9 flex justify-center">
          <Link href="/curriculum" className="btn btn-ghost">
            Open the full curriculum browser <ArrowRight size={13} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- CBT PROMO ---------------- */

export function CbtPromo() {
  return (
    <section className="relative mx-auto grid max-w-[88rem] items-center gap-14 px-5 py-28 sm:px-8 lg:grid-cols-2">
      <Reveal>
        <p className="rule-label"><span className="text-lime">03</span> · The live CBT hall</p>
        <h2 className="mt-4 font-display text-3xl font-black leading-[1.02] tracking-tight sm:text-5xl">
          WALK INTO JAMB
          <br />
          <span className="serif-a font-normal text-lime">a hundred times</span>
          <br />
          <span className="text-stroke">BEFORE THE REAL DAY.</span>
        </h2>
        <p className="mt-5 max-w-md text-base leading-relaxed text-dim">
          Timed papers, a numbered question palette, on-screen calculator, flag-for-review and
          auto-submit when the clock dies — then a scored script with every explanation.
        </p>
        <ul className="mt-7 grid max-w-md grid-cols-2 gap-2.5 text-sm">
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
              <li key={label as string} className="flex items-center gap-2.5 rounded-[4px] border border-line bg-panel px-3.5 py-3 transition-colors hover:border-lime/40">
                <I size={15} className="shrink-0 text-lime" />
                <span className="text-xs font-medium text-paper/85">{label as string}</span>
              </li>
            );
          })}
        </ul>
        <Link href="/cbt" className="btn btn-lime mt-9">
          Take a mock UTME <ArrowRight size={13} />
        </Link>
      </Reveal>

      {/* mock exam window */}
      <Reveal delay={0.12} className="persp relative">
        <div className="preserve-3d relative mx-auto max-w-lg animate-floaty">
          <div className="overflow-hidden rounded-[8px] border border-line bg-panel shadow-2xl shadow-black/70 [transform:rotateX(6deg)_rotateY(-8deg)]">
            <div className="flex items-center justify-between border-b border-line bg-panel2 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-coral/70" />
                <span className="size-2.5 rounded-full bg-brass/70" />
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
                        "flex items-center gap-3 rounded-[4px] border px-3 py-2.5 text-xs",
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
                        "grid size-7 place-items-center rounded-[3px] font-mono text-[9px] font-bold",
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
                <div className="rounded-[6px] border border-line bg-ink p-3">
                  <p className="font-mono text-[9px] tracking-widest text-dim">CALCULATOR</p>
                  <p className="mt-1 text-right font-mono text-lg text-lime tabular">50 × 4 = 200</p>
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "="].map((k) => (
                      <span key={k} className="grid h-6 place-items-center rounded-[3px] bg-white/5 font-mono text-[10px] text-paper/80">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <span className="absolute -right-4 -top-5 animate-floaty rounded-[4px] border border-lime/40 bg-ink px-4 py-2 font-mono text-[10px] font-bold tracking-widest text-lime shadow-xl">
            AUTO-SUBMITS AT 00:00
          </span>
          <span
            className="absolute -bottom-6 -left-4 animate-floaty rounded-[4px] border border-iris/40 bg-ink px-4 py-2 font-mono text-[10px] font-bold tracking-widest text-iris shadow-xl"
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
    { icon: Brain, t: "Adaptive engine", d: "Each answer you submit trains the engine — weak topics resurface, difficulty calibrates to you." },
    { icon: MonitorPlay, t: "Real CBT conditions", d: "The hall experience — palette, clock, calculator, auto-submit — on your phone." },
    { icon: Zap, t: "Flashcards & Rapid Fire", d: "Flip-card recall drills and 30–90 second sprints that push your speed ceiling." },
    { icon: Layers, t: "16 study tools", d: "Flashcards, Spelling Lab, Focus Lab, Mastery Map, Formula Vault, Periodic Table — all in one Study Hall." },
    { icon: Swords, t: "Weekly leaderboard", d: "Pin your best CBT score under an alias and chase the school crown, week by week." },
  ];
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-[88rem] px-5 py-24 sm:px-8">
        <Chapter
          index="04"
          eyebrow="Why it works"
          title={<>BUILT LIKE AN <span className="serif-a font-normal text-lime">A1</span> STUDENT.</>}
        />
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {feats.map((f, i) => (
            <Reveal key={f.t} delay={Math.min(i * 0.05, 0.3)}>
              <div className="card-ed group h-full p-6">
                <div className="flex items-start justify-between">
                  <span className="grid size-10 place-items-center rounded-[4px] bg-lime/10 text-lime">
                    <f.icon size={18} />
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.25em] text-dim">
                    {String(i + 1).padStart(2, "0")}/06
                  </span>
                </div>
                <h3 className="mt-4 font-display text-sm font-bold">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dim">{f.d}</p>
                <span className="mt-4 block h-px w-6 bg-line transition-all duration-500 group-hover:w-full group-hover:bg-lime/50" />
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
    <div className="overflow-hidden border-y border-line bg-lime py-4">
      <div className="flex w-max animate-marquee-slow items-center">
        {[0, 1].map((rep) => (
          <div key={rep} className="flex items-center">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="flex items-center gap-6 pr-6 font-display text-xl font-black tracking-tight text-ink sm:text-2xl">
                READ LIKE YOUR ADMISSION DEPENDS ON IT
                <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0l6 6-6 6-6-6z" /></svg>
                <span className="serif-a font-normal text-ink/60">because it does</span>
                <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor"><path d="M6 0l6 6-6 6-6-6z" /></svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
