import { sql } from "drizzle-orm";
import { db } from "@/db";
import { questions, subjects } from "@/db/schema";
import type { SubjectInfo } from "@/lib/constants";
import PracticeRunner from "@/components/practice/PracticeRunner";

export const dynamic = "force-dynamic";

async function getSubjects(): Promise<SubjectInfo[]> {
  try {
    const meta = await db.select().from(subjects);
    const counts = await db
      .select({ slug: questions.subjectSlug, level: questions.level, n: sql<number>`count(*)::int` })
      .from(questions)
      .groupBy(questions.subjectSlug, questions.level);
    const grouped = new Map<string, { SS1: number; SS2: number; SS3: number }>();
    for (const c of counts) {
      const e = grouped.get(c.slug) ?? { SS1: 0, SS2: 0, SS3: 0 };
      if (c.level === "SS1" || c.level === "SS2" || c.level === "SS3") e[c.level] = Number(c.n);
      grouped.set(c.slug, e);
    }
    return meta.map((s) => {
      const c = grouped.get(s.slug) ?? { SS1: 0, SS2: 0, SS3: 0 };
      return { ...s, counts: { ...c, total: c.SS1 + c.SS2 + c.SS3 } };
    });
  } catch {
    return [];
  }
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const list = await getSubjects();

  const subject = sp.subject && list.some((s) => s.slug === sp.subject) ? sp.subject : "mathematics";
  const initial = {
    subject,
    level: ["SS1", "SS2", "SS3"].includes(sp.level ?? "") ? sp.level! : "SS2",
    term: ["1", "2", "3"].includes(sp.term ?? "") ? sp.term! : "",
    count: Math.min(20, Math.max(5, Number(sp.count ?? 10) || 10)),
    exam: ["WAEC", "JAMB", "NECO"].includes(sp.exam ?? "") ? sp.exam! : "",
    autoStart: Boolean(sp.subject),
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-24 pt-28 sm:px-6">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)]" />
      <div className="relative mx-auto max-w-7xl">
        <header className="mb-10 text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-dim">DRILL MODE · INSTANT FEEDBACK</p>
          <h1 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-5xl">
            THE PRACTICE <span className="text-stroke">GROUND</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-dim">
            Untimed questions with worked explanations the moment you answer.
            Pick a subject, class and term — leave with the marks.
          </p>
        </header>
        <PracticeRunner subjects={list} initial={initial} />
      </div>
    </main>
  );
}
