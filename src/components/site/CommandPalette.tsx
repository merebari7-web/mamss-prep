"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Atom, BookOpen, Brain, ClipboardList, CornerDownLeft, Dna, Feather, FlaskConical,
  Flame, FlaskRound, Home, Landmark, LayoutDashboard, ScrollText, Scale, Search,
  Sigma, Swords, Timer, TrendingUp, Wrench, Zap,
} from "lucide-react";
import { cx } from "@/lib/utils";

const SUBJECT_ICONS: Record<string, typeof Sigma> = {
  mathematics: Sigma,
  english: BookOpen,
  physics: Atom,
  chemistry: FlaskConical,
  biology: Dna,
  economics: TrendingUp,
  government: Landmark,
  literature: Feather,
  "civic-education": Scale,
};

interface SubjectMeta {
  slug: string;
  name: string;
  short: string;
  counts?: { total: number };
}

interface Item {
  id: string;
  title: string;
  hint: string;
  href: string;
  Icon: typeof Sigma;
  section: "Go to" | "Subjects" | "Actions";
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [subjects, setSubjects] = useState<SubjectMeta[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery("");
    setIndex(0);
    if (subjects.length === 0) {
      fetch("/api/subjects")
        .then((r) => r.json())
        .then((d) => setSubjects(d.subjects ?? []))
        .catch(() => {});
    }
  }, [subjects.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => (o ? false : (openPalette(), true)));
      } else if (e.key === "/" && !open) {
        const t = e.target as HTMLElement;
        if (t.tagName !== "INPUT" && t.tagName !== "TEXTAREA") {
          e.preventDefault();
          openPalette();
        }
      } else if (e.key === "Escape") setOpen(false);
    };
    const onCustom = () => openPalette();
    window.addEventListener("keydown", onKey);
    window.addEventListener("mamss:open-palette", onCustom);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mamss:open-palette", onCustom);
    };
  }, [open, openPalette]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const base: Item[] = [
      { id: "home", title: "Home", hint: "Start page", href: "/", Icon: Home, section: "Go to" },
      { id: "study", title: "Study Hall", hint: "16+ tools", href: "/study", Icon: FlaskRound, section: "Go to" },
      { id: "practice", title: "Practice", hint: "Build custom quizzes", href: "/practice", Icon: ClipboardList, section: "Go to" },
      { id: "smart", title: "Smart Sprint", hint: "Adaptive engine picks your weak spots", href: "/practice?mode=smart", Icon: Brain, section: "Actions" },
      { id: "daily", title: "Daily Challenge", hint: "5 questions · keep the streak", href: "/daily", Icon: Flame, section: "Actions" },
      { id: "cbt", title: "CBT Hall", hint: "Full JAMB-style mock", href: "/cbt", Icon: Zap, section: "Actions" },
      { id: "curriculum", title: "Curriculum", hint: "Browse by class & term", href: "/curriculum", Icon: ScrollText, section: "Go to" },
      { id: "tools", title: "Tools", hint: "Calculator, formulas, converter", href: "/tools", Icon: Wrench, section: "Go to" },
      { id: "hq", title: "Progress HQ", hint: "Streaks, mastery & leaderboard", href: "/hq", Icon: LayoutDashboard, section: "Go to" },
      { id: "board", title: "Weekly Leaderboard", hint: "See the crown holders", href: "/hq#board", Icon: Swords, section: "Actions" },
      { id: "focus", title: "Focus Timer", hint: "Pomodoro study sessions", href: "/study/focus", Icon: Timer, section: "Actions" },
    ];
    const subs: Item[] = subjects.map((s) => ({
      id: `sub-${s.slug}`,
      title: s.name,
      hint: `Smart drill · ${s.counts?.total ?? "–"} questions`,
      href: `/practice?mode=smart&subject=${s.slug}`,
      Icon: SUBJECT_ICONS[s.slug] ?? BookOpen,
      section: "Subjects",
    }));
    return [...base, ...subs];
  }, [subjects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.title.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => setIndex(0), [query]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && filtered[index]) {
      go(filtered[index].href);
    }
  };

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  let lastSection = "";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[90] flex items-start justify-center bg-ink/70 px-4 pt-[12vh] backdrop-blur-md"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-panel shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <Search size={18} className="shrink-0 text-lime" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onListKey}
                placeholder="Jump to a subject, tool or challenge..."
                className="w-full bg-transparent text-sm text-paper outline-none placeholder:text-dim"
              />
              <kbd className="rounded border border-line bg-ink px-1.5 py-0.5 font-mono text-[10px] text-dim">ESC</kbd>
            </div>

            <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2">
              {filtered.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-dim">Nothing matches “{query}”.</p>
              )}
              {filtered.map((item, i) => {
                const showSection = item.section !== lastSection;
                lastSection = item.section;
                return (
                  <div key={item.id}>
                    {showSection && (
                      <p className="px-3 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[0.25em] text-dim">
                        {item.section}
                      </p>
                    )}
                    <button
                      data-idx={i}
                      onClick={() => go(item.href)}
                      onMouseEnter={() => setIndex(i)}
                      className={cx(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                        i === index ? "bg-lime/10 text-paper" : "text-dim",
                      )}
                    >
                      <span className={cx(
                        "grid size-9 shrink-0 place-items-center rounded-lg border",
                        i === index ? "border-lime/40 bg-lime/10 text-lime" : "border-line bg-ink",
                      )}>
                        <item.Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{item.title}</span>
                        <span className="block truncate text-[11px] text-dim">{item.hint}</span>
                      </span>
                      {i === index && <CornerDownLeft size={14} className="shrink-0 text-lime" />}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-line px-5 py-3">
              <p className="font-mono text-[10px] text-dim">
                <kbd className="rounded border border-line bg-ink px-1">↑↓</kbd> navigate ·{" "}
                <kbd className="rounded border border-line bg-ink px-1">↵</kbd> open
              </p>
              <p className="font-mono text-[10px] text-dim">MAMSS PREP · QUICK COMMAND</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
