"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { nextExamDates, daysUntil } from "@/lib/constants";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const { jamb, waec } = nextExamDates();

  return (
    <footer className="relative overflow-hidden border-t border-line bg-panel noise">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/media/mamss-logo.png"
                alt="MAMSS Logo"
                width={48}
                height={48}
                className="size-12 object-contain"
              />
              <div>
                <p className="font-display text-sm font-bold tracking-tight">
                  MAMSS <span className="text-lime">PREP</span>
                </p>
                <p className="font-mono text-[9px] tracking-widest text-dim">
                  MORALS AND EXCELLENCE
                </p>
              </div>
            </div>
            <h2 className="mt-6 font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
              READING IS
              <br />
              <span className="text-stroke">A SPORT.</span>
              <br />
              TRAIN HARD.
            </h2>
            <form
              className="mt-8 flex max-w-md overflow-hidden rounded-xl border border-line bg-ink"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setDone(true);
              }}
            >
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="Get weekly practice targets"
                className="w-full bg-transparent px-4 py-3 text-sm outline-none placeholder:text-dim"
              />
              <button className="grid w-14 shrink-0 place-items-center bg-lime text-ink transition-colors hover:bg-lime2">
                {done ? <Check size={18} /> : <ArrowUpRight size={18} />}
              </button>
            </form>
            {done && <p className="mt-2 text-xs text-lime">You are on the list. Now go read.</p>}
          </div>

          <div className="grid grid-cols-2 gap-8 lg:col-span-2">
            <div>
              <p className="font-mono text-xs tracking-widest text-dim">PLATFORM</p>
              <ul className="mt-4 space-y-3 text-sm">
                {[
                  ["Curriculum browser", "/curriculum"],
                  ["Practice quizzes", "/practice"],
                  ["Live CBT hall", "/cbt"],
                  ["WAEC track", "/practice?exam=WAEC"],
                  ["JAMB track", "/practice?exam=JAMB"],
                ].map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-paper/80 transition-colors hover:text-lime">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-mono text-xs tracking-widest text-dim">COUNTDOWN</p>
              <ul className="mt-4 space-y-4 text-sm">
                <li>
                  <p className="text-paper/80">JAMB UTME {jamb.getFullYear()}</p>
                  <p className="font-mono text-2xl font-bold text-lime tabular">
                    {daysUntil(jamb)} <span className="text-xs text-dim">days</span>
                  </p>
                </li>
                <li>
                  <p className="text-paper/80">WAEC WASSCE {waec.getFullYear()}</p>
                  <p className="font-mono text-2xl font-bold text-iris tabular">
                    {daysUntil(waec)} <span className="text-xs text-dim">days</span>
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 select-none overflow-hidden">
          <p className="whitespace-nowrap font-display text-[13.5vw] font-black leading-none tracking-tight text-white/[0.04]">
            MAMSS PREP
          </p>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 text-xs text-dim sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Mater Misericordiae Secondary School — Morals and Excellence.</p>
          <p className="font-mono">WAEC · NECO · JAMB-UTME aligned</p>
        </div>
      </div>
    </footer>
  );
}
