export const LEVELS = ["SS1", "SS2", "SS3"] as const;
export type LevelName = (typeof LEVELS)[number];

export const TERMS = [1, 2, 3] as const;
export const TERM_LABELS: Record<number, string> = {
  1: "1st Term",
  2: "2nd Term",
  3: "3rd Term",
};

export interface SubjectInfo {
  slug: string;
  name: string;
  short: string;
  blurb: string;
  color: string;
  icon: string;
  counts: { SS1: number; SS2: number; SS3: number; total: number };
}

/** WAEC-style grading band from a percentage score. */
export function waecGrade(pct: number): { grade: string; label: string } {
  if (pct >= 75) return { grade: "A1", label: "Excellent" };
  if (pct >= 70) return { grade: "B2", label: "Very Good" };
  if (pct >= 65) return { grade: "B3", label: "Good" };
  if (pct >= 60) return { grade: "C4", label: "Credit" };
  if (pct >= 55) return { grade: "C5", label: "Credit" };
  if (pct >= 50) return { grade: "C6", label: "Credit" };
  if (pct >= 45) return { grade: "D7", label: "Pass" };
  if (pct >= 40) return { grade: "E8", label: "Pass" };
  return { grade: "F9", label: "Fail" };
}

/** JAMB UTME combos: Use of English is compulsory. */
export const UTME_PRESETS = [
  {
    id: "medicine",
    name: "Medicine / Sciences",
    note: "English, Biology, Chemistry, Physics",
    subjects: ["english", "biology", "chemistry", "physics"],
    icon: "Stethoscope",
  },
  {
    id: "engineering",
    name: "Engineering / Tech",
    note: "English, Mathematics, Physics, Chemistry",
    subjects: ["english", "mathematics", "physics", "chemistry"],
    icon: "Cog",
  },
  {
    id: "social",
    name: "Social Sciences",
    note: "English, Mathematics, Economics, Government",
    subjects: ["english", "mathematics", "economics", "government"],
    icon: "Briefcase",
  },
  {
    id: "arts",
    name: "Arts / Law",
    note: "English, Literature, Government, Civic",
    subjects: ["english", "literature", "government", "civic-education"],
    icon: "Palette",
  },
] as const;

/** Next WAEC (WASSCE, starts early May) and JAMB UTME (late April) dates. */
export function nextExamDates(now = new Date()) {
  const year = now.getFullYear();
  const jambThis = new Date(year, 3, 24, 8); // Apr 24
  const waecThis = new Date(year, 4, 4, 9); // May 4
  const jamb = now > jambThis ? new Date(year + 1, 3, 24, 8) : jambThis;
  const waec = now > new Date(year, 5, 20) ? new Date(year + 1, 4, 4, 9) : waecThis;
  return { jamb, waec };
}

export function daysUntil(d: Date, now = new Date()) {
  return Math.max(0, Math.ceil((d.getTime() - now.getTime()) / 86_400_000));
}

export function formatClock(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
