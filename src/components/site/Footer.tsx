"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, MapPin } from "lucide-react";
import { nextExamDates, daysUntil } from "@/lib/constants";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const { jamb, waec } = nextExamDates();

  return (
    <footer className="relative overflow-hidden border-t border-line bg-panel noise">
      <div className="graph-bg pointer-events-none absolute inset-0 opacity-50" />

      {/* running wordmark band */}
      <div className="relative select-none overflow-hidden border-b border-line py-4">
        <div className="flex w-max animate-marquee-slow items-center">
          {[0, 1].map((rep) => (
            <p key={rep} className="flex items-center whitespace-nowrap font-display font-black leading-none tracking-tight">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="flex items-center text-[7vw] sm:text-[4.5vw]">
                  <span className={i % 2 ? "text-stroke-faint" : "text-white/[0.06]"}>MAMSS&nbsp;PREP</span>
                  <svg width="14" height="14" viewBox="0 0 12 12" className="mx-8 shrink-0 text-lime/40" fill="currentColor">
                    <path d="M6 0l6 6-6 6-6-6z" />
                  </svg>
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>

      <div className="relative mx-auto max-w-[88rem] px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.35fr_1fr_1fr]">
          {/* brand + dispatch */}
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-[4px] border border-line">
                <Image
                  src="/media/mamss-logo.png"
                  alt="MAMSS crest"
                  width={38}
                  height={38}
                  className="size-9 object-contain"
                />
              </span>
              <div>
                <p className="font-display text-sm font-black tracking-tight">
                  MAMSS <span className="text-lime">PREP</span>
                </p>
                <p className="font-mono text-[9px] tracking-[0.35em] text-dim">MORALS AND EXCELLENCE</p>
              </div>
            </div>
            <h2 className="mt-7 font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
              READING IS
              <br />
              <span className="text-stroke">A SPORT.</span>
              <br />
              TRAIN <span className="serif-a font-normal text-lime">hard.</span>
            </h2>
            <form
              className="mt-8 flex max-w-md overflow-hidden rounded-[4px] border border-line bg-ink"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setDone(true);
              }}
            >
              <span className="grid w-12 shrink-0 place-items-center border-r border-line font-mono text-[9px] tracking-widest text-dim">
                @
              </span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="Get weekly practice targets"
                className="w-full bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-dim"
              />
              <button className="grid w-14 shrink-0 place-items-center border-l border-lime bg-lime text-ink transition-colors hover:bg-lime2">
                {done ? <Check size={18} /> : <ArrowUpRight size={18} />}
              </button>
            </form>
            {done && <p className="mt-2 font-mono text-xs text-lime">You are on the list. Now go read.</p>}
          </div>

          {/* index */}
          <div>
            <p className="rule-label">THE INDEX</p>
            <ul className="mt-5 space-y-0">
              {[
                ["Daily Challenge", "/daily"],
                ["Smart Sprint — adaptive", "/practice?mode=smart"],
                ["Practice quizzes", "/practice"],
                ["Live CBT hall", "/cbt"],
                ["Curriculum browser", "/curriculum"],
                ["Study tools", "/tools"],
                ["Weekly leaderboard", "/hq#board"],
                ["WAEC track", "/practice?exam=WAEC"],
                ["JAMB track", "/practice?exam=JAMB"],
              ].map(([label, href], i) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex items-baseline gap-3 border-b border-line/60 py-2.5 text-sm transition-colors hover:text-lime"
                  >
                    <span className="font-mono text-[9px] text-dim tabular group-hover:text-lime/70">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-paper/80 group-hover:text-lime">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* countdown */}
          <div>
            <p className="rule-label">THE CLOCK</p>
            <div className="mt-5 space-y-4">
              {[
                { name: `JAMB UTME ${jamb.getFullYear()}`, d: daysUntil(jamb), c: "text-lime", b: "border-lime/25" },
                { name: `WAEC WASSCE ${waec.getFullYear()}`, d: daysUntil(waec), c: "text-iris", b: "border-iris/25" },
              ].map((x) => (
                <div key={x.name} className={`rounded-[4px] border ${x.b} bg-ink/60 p-5`}>
                  <p className="font-mono text-[10px] tracking-[0.25em] text-dim">{x.name}</p>
                  <p className={`mt-2 font-display text-4xl font-black tabular ${x.c}`}>
                    {x.d}
                    <span className="ml-2 font-mono text-[10px] font-normal tracking-[0.25em] text-dim">DAYS LEFT</span>
                  </p>
                </div>
              ))}
              <p className="flex items-center gap-2 pt-1 font-mono text-[10px] tracking-[0.2em] text-dim">
                <MapPin size={11} className="text-lime" /> RUMUOMASI, PORT HARCOURT · NIGERIA
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 font-mono text-[10px] tracking-[0.18em] text-dim sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} MATER MISERICORDIAE SECONDARY SCHOOL</p>
          <p className="flex items-center gap-2">
            <span className="size-1 rounded-full bg-lime animate-pulse-dot" />
            WAEC · NECO · JAMB-UTME ALIGNED
          </p>
        </div>
      </div>
    </footer>
  );
}
