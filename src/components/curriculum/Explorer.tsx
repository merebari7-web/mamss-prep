"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Play } from "lucide-react";
import { cx } from "@/lib/utils";
import { LEVELS, TERM_LABELS } from "@/lib/constants";

export interface SubjectRow {
  slug: string;
  name: string;
  short: string;
  blurb: string;
  color: string;
  icon: string;
  /** terms[level][termIndex0..2] = count */
  terms: Record<string, [number, number, number]>;
}

function CellDot({ n }: { n: number }) {
  return (
    <span className={cx("inline-block size-1.5 rounded-full", n > 0 ? "bg-lime" : "bg-white/15")} />
  );
}

export default function Explorer({ rows }: { rows: SubjectRow[] }) {
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("SS1");

  return (
    <div>
      {/* level switch */}
      <div className="sticky top-16 z-20 -mx-4 border-y border-line bg-ink/85 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={cx(
                  "rounded-xl px-4 py-2.5 font-display text-sm font-black transition-all sm:px-7",
                  level === l ? "bg-lime text-ink" : "text-dim hover:bg-white/5 hover:text-paper",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <p className="hidden font-mono text-[11px] text-dim sm:block">
            <CellDot n={1} /> <span className="ml-1">TOPICS COVERED THIS TERM</span>
          </p>
        </div>
      </div>

      {/* rows */}
      <motion.div
        key={level}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 overflow-hidden rounded-2xl border border-line"
      >
        {rows.map((r, ri) => {
          const t = r.terms[level] ?? [0, 0, 0];
          const total = t[0] + t[1] + t[2];
          return (
            <div
              key={r.slug}
              className={cx(
                "group grid grid-cols-[1fr_auto] items-center gap-4 p-5 transition-colors hover:bg-white/[0.03] sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.6fr))_auto]",
                ri !== 0 && "border-t border-line",
              )}
            >
              {/* subject */}
              <div className="flex items-center gap-4">
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-xl font-display text-xs font-black"
                  style={{ backgroundColor: `${r.color}1c`, color: r.color }}
                >
                  {r.short}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-sm font-bold sm:text-base">{r.name}</h3>
                  <p className="mt-0.5 hidden line-clamp-1 text-xs text-dim sm:block">{r.blurb}</p>
                  <p className="mt-1 font-mono text-[10px] text-dim sm:hidden tabular">{total} questions</p>
                </div>
              </div>

              {/* term cells */}
              <div className="col-span-2 grid grid-cols-3 gap-2 sm:col-span-3 sm:col-start-2 sm:contents">
                {[1, 2, 3].map((term) => {
                  const n = t[term - 1];
                  return (
                    <Link
                      key={term}
                      href={`/practice?subject=${r.slug}&level=${level}&term=${term}`}
                      className={cx(
                        "group/cell rounded-lg border px-3 py-2.5 text-center transition-all",
                        n > 0
                          ? "border-line bg-panel hover:border-lime/60 hover:bg-lime/5"
                          : "border-line/50 bg-transparent opacity-40",
                      )}
                    >
                      <p className="font-mono text-[9px] tracking-widest text-dim">{TERM_LABELS[term].toUpperCase()}</p>
                      <p className="mt-1 flex items-center justify-center gap-1.5 font-mono text-sm font-bold tabular">
                        <CellDot n={n} />
                        {n}
                      </p>
                    </Link>
                  );
                })}
              </div>

              {/* quick action */}
              <Link
                href={`/practice?subject=${r.slug}&level=${level}`}
                className="hidden items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-xs font-bold transition-all hover:border-lime hover:bg-lime hover:text-ink sm:inline-flex"
              >
                <Play size={13} /> ALL TERMS
                <ArrowUpRight size={13} />
              </Link>
            </div>
          );
        })}
      </motion.div>

      <p className="mt-6 text-center font-mono text-[11px] text-dim">
        TAP A TERM CELL TO DRILL THAT TERM ONLY · "ALL TERMS" MIXES THE FULL YEAR
      </p>
    </div>
  );
}
