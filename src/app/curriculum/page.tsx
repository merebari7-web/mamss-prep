import { sql } from "drizzle-orm";
import { db } from "@/db";
import { questions, subjects } from "@/db/schema";
import Explorer, { type SubjectRow } from "@/components/curriculum/Explorer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Curriculum — MAMSS Prep",
  description: "Browse SS1–SS3 subjects by term and drill the Nigerian curriculum topic by topic.",
};

async function getRows(): Promise<SubjectRow[]> {
  try {
    const meta = await db.select().from(subjects);
    const counts = await db
      .select({
        slug: questions.subjectSlug,
        level: questions.level,
        term: questions.term,
        n: sql<number>`count(*)::int`,
      })
      .from(questions)
      .groupBy(questions.subjectSlug, questions.level, questions.term);

    return meta.map((s) => {
      const terms: Record<string, [number, number, number]> = {
        SS1: [0, 0, 0],
        SS2: [0, 0, 0],
        SS3: [0, 0, 0],
      };
      for (const c of counts.filter((x) => x.slug === s.slug)) {
        const arr = terms[c.level];
        if (arr && c.term >= 1 && c.term <= 3) arr[c.term - 1] = Number(c.n);
      }
      return {
        slug: s.slug,
        name: s.name,
        short: s.short,
        blurb: s.blurb,
        color: s.color,
        icon: s.icon,
        terms,
      };
    });
  } catch {
    return [];
  }
}

export default async function CurriculumPage() {
  const rows = await getRows();

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-24 pt-28 sm:px-6">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)]" />
      <div className="relative mx-auto max-w-7xl">
        <header className="mb-10 max-w-3xl">
          <p className="font-mono text-xs tracking-[0.3em] text-dim">SS1–SS3 · 3 TERMS EACH · NERDC-ALIGNED</p>
          <h1 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-5xl">
            THE CURRICULUM,
            <br />
            <span className="text-stroke">LAID BARE.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-dim sm:text-base">
            Every subject broken into class and term corridors — the exact sequence Nigerian
            schools teach it. Walk a corridor, answer its questions, move to the next.
            By SS3 third term, nothing WAEC or JAMB asks will be new to you.
          </p>
        </header>
        <Explorer rows={rows} />
      </div>
    </main>
  );
}
