"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Zap, ScrollText } from "lucide-react";
import { cx } from "@/lib/utils";
import { RESULTS_PORTAL_URL } from "@/lib/constants";

const LINKS = [
  { href: "/study", label: "Study Hall" },
  { href: "/practice", label: "Practice" },
  { href: "/cbt", label: "CBT Hall" },
  { href: "/curriculum", label: "Curriculum" },
  { href: "/tools", label: "Tools" },
  { href: "/hq", label: "HQ" },
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

  return (
    <>
      <header
        className={cx(
          "fixed inset-x-0 top-0 z-30 transition-all duration-300",
          scrolled ? "border-b border-line bg-ink/80 backdrop-blur-xl" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <Image
              src="/media/mamss-logo.png"
              alt="MAMSS Logo"
              width={40}
              height={40}
              className="size-10 object-contain transition-transform duration-300 group-hover:scale-110"
            />
            <span className="hidden font-display text-sm font-bold tracking-tight sm:block">
              MAMSS<span className="text-lime"> PREP</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cx(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  pathname === l.href || pathname.startsWith(l.href + "/")
                    ? "bg-white/10 text-paper"
                    : "text-dim hover:text-paper",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={RESULTS_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-full border border-lime/40 px-4 py-2.5 text-sm font-bold text-paper backdrop-blur transition-colors hover:border-lime hover:text-lime md:inline-flex"
            >
              <ScrollText size={15} strokeWidth={2.6} />
              Check Result
            </a>
            <Link
              href="/cbt"
              className="hidden items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-ink transition-all hover:bg-lime2 hover:shadow-[0_0_28px_rgba(200,241,105,0.35)] md:inline-flex"
            >
              <Zap size={15} strokeWidth={2.6} />
              CBT Hall
            </Link>
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="grid size-10 place-items-center rounded-lg border border-line text-paper lg:hidden"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* mobile sheet */}
      <div
        className={cx(
          "fixed inset-0 z-40 bg-ink/60 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />
      <aside
        className={cx(
          "fixed inset-y-0 right-0 z-50 w-[78%] max-w-xs border-l border-line bg-panel p-6 transition-transform duration-300 lg:hidden",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-display text-sm font-bold">
            <Image src="/media/mamss-logo.png" alt="MAMSS Logo" width={28} height={28} className="size-7 object-contain" />
            MENU
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="grid size-9 place-items-center rounded-lg border border-line"
          >
            <X size={16} />
          </button>
        </div>
        <nav className="mt-10 flex flex-col gap-2">
          {[{ href: "/", label: "Home" }, ...LINKS].map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className="group flex items-baseline gap-3 rounded-xl px-3 py-3 hover:bg-white/5"
            >
              <span className="font-mono text-xs text-dim">0{i + 1}</span>
              <span className="font-display text-xl font-bold group-hover:text-lime">{l.label}</span>
            </Link>
          ))}
        </nav>
        <Link
          href="/cbt"
          className="mt-10 flex items-center justify-center gap-2 rounded-xl bg-lime py-3.5 text-sm font-bold text-ink"
        >
          <Zap size={15} /> Enter CBT Hall
        </Link>
        <a
          href={RESULTS_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-lime/40 py-3.5 text-sm font-bold text-paper transition-colors hover:border-lime hover:text-lime"
        >
          <ScrollText size={15} /> Check Result — School Portal
        </a>
      </aside>
    </>
  );
}
