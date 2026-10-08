"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Search, X, Zap, ScrollText } from "lucide-react";
import { cx } from "@/lib/utils";
import { RESULTS_PORTAL_URL } from "@/lib/constants";

const LINKS = [
  { href: "/study", label: "Study Hall" },
  { href: "/practice", label: "Practice" },
  { href: "/daily", label: "Daily" },
  { href: "/cbt", label: "CBT Hall" },
  { href: "/curriculum", label: "Curriculum" },
  { href: "/tools", label: "Tools" },
  { href: "/hq", label: "HQ" },
];

const OVERLAY_LINKS = [
  { href: "/", label: "Home", note: "the front gate" },
  { href: "/daily", label: "Daily Challenge", note: "keep the streak" },
  { href: "/practice", label: "Practice Ground", note: "manual + smart drills" },
  { href: "/study", label: "Study Hall", note: "16 instruments" },
  { href: "/cbt", label: "CBT Hall", note: "the dress rehearsal" },
  { href: "/curriculum", label: "Curriculum", note: "class by term" },
  { href: "/tools", label: "Tools", note: "lab equipment" },
  { href: "/hq", label: "Progress HQ", note: "your command centre" },
];

export default function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* hairline frame edges — the "page" the app is printed on */}
      <div aria-hidden className="pointer-events-none fixed inset-y-0 left-3 z-40 hidden w-px bg-line xl:block" />
      <div aria-hidden className="pointer-events-none fixed inset-y-0 right-3 z-40 hidden w-px bg-line xl:block" />

      <header
        className={cx(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled ? "border-b border-line bg-ink/85 backdrop-blur-xl" : "border-b border-transparent",
        )}
      >
        <div className="mx-auto flex h-[68px] max-w-[88rem] items-center justify-between px-5 sm:px-8">
          {/* crest + wordmark */}
          <Link href="/" className="group flex items-center gap-3">
            <span className="relative grid size-11 place-items-center rounded-[4px] border border-line bg-panel transition-colors group-hover:border-lime/50">
              <Image
                src="/media/mamss-logo.png"
                alt="MAMSS crest"
                width={34}
                height={34}
                className="size-[30px] object-contain transition-transform duration-300 group-hover:scale-110"
              />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-[13px] font-black tracking-tight">
                MAMSS<span className="text-lime"> PREP</span>
              </span>
              <span className="mt-1 font-mono text-[8px] tracking-[0.3em] text-dim">
                MORALS &amp; EXCELLENCE
              </span>
            </span>
          </Link>

          {/* center links */}
          <nav className="hidden items-center gap-1 xl:flex">
            {LINKS.map((l, i) => {
              const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cx(
                    "group relative px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors",
                    active ? "text-paper" : "text-dim hover:text-paper",
                  )}
                >
                  <span className="mr-1 text-[8px] text-lime/70">0{i + 1}</span>
                  {l.label}
                  <span
                    className={cx(
                      "absolute inset-x-3 -bottom-0.5 h-px bg-lime transition-transform duration-300",
                      active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          {/* actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("mamss:open-palette"))}
              aria-label="Quick command"
              className="chip-mono text-dim transition-colors hover:border-lime/40 hover:text-paper"
            >
              <Search size={12} />
              <span className="hidden sm:inline">Search</span>
              <kbd className="rounded-[3px] border border-line bg-ink px-1 text-[9px]">⌘K</kbd>
            </button>

            <Link href="/cbt" className="btn btn-sm btn-lime hidden md:inline-flex">
              <Zap size={13} strokeWidth={2.6} /> CBT Hall
            </Link>

            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="group grid size-10 place-items-center rounded-[4px] border border-line text-paper transition-colors hover:border-lime/50 xl:hidden"
            >
              <span className="flex flex-col items-end gap-[5px]">
                <span className="h-px w-4 bg-paper transition-all group-hover:w-5 group-hover:bg-lime" />
                <span className="h-px w-5 bg-paper transition-all group-hover:bg-lime" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── cinematic overlay menu ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { delay: 0.25 } }}
            className="noise fixed inset-0 z-[80] bg-ink"
          >
            <div className="graph-bg pointer-events-none absolute inset-0 opacity-30" />
            <div className="relative flex h-full flex-col px-6 py-6 sm:px-10">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <Image src="/media/mamss-logo.png" alt="" width={34} height={34} className="size-8 object-contain" />
                  <span className="font-mono text-[10px] tracking-[0.35em] text-dim">INDEX / MENU</span>
                </span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid size-11 place-items-center rounded-[4px] border border-line transition-colors hover:border-lime hover:text-lime"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex flex-1 flex-col justify-center gap-0 overflow-y-auto py-6">
                {OVERLAY_LINKS.map((l, i) => {
                  const active = pathname === l.href;
                  return (
                    <motion.div
                      key={l.href}
                      initial={{ opacity: 0, y: 34 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      transition={{ delay: 0.05 + i * 0.055, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Link
                        href={l.href}
                        className="group flex items-baseline gap-4 border-b border-line py-2.5 sm:gap-8 sm:py-3"
                      >
                        <span className="font-mono text-[10px] text-lime/80 tabular">
                          /{String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={cx(
                            "font-display text-[8.5vw] font-black leading-[1.04] tracking-tight transition-colors sm:text-5xl lg:text-6xl",
                            active ? "text-lime" : "text-paper group-hover:text-lime",
                          )}
                        >
                          {l.label}
                        </span>
                        <span className="serif-a ml-auto hidden text-lg text-dim transition-colors group-hover:text-paper md:block">
                          {l.note}
                        </span>
                        <ArrowUpRight
                          size={22}
                          className="shrink-0 -translate-x-2 text-lime opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                        />
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5"
              >
                <p className="font-mono text-[10px] tracking-[0.25em] text-dim">
                  MATER MISERICORDIAE SECONDARY SCHOOL · RUMUOMASI
                </p>
                <a
                  href={RESULTS_PORTAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip-mono text-dim transition-colors hover:border-lime/50 hover:text-lime"
                >
                  <ScrollText size={11} /> School result portal
                </a>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
