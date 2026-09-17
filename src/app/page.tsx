import { sql } from "drizzle-orm";
import { db } from "@/db";
import { questions, subjects } from "@/db/schema";
import type { SubjectInfo } from "@/lib/constants";
import Hero from "@/components/home/Hero";
import VideoScroll from "@/components/home/VideoScroll";
import { Stats, ExamTracks, CurriculumTeaser, CbtPromo, Features, BigBand } from "@/components/home/Sections";

export const dynamic = "force-dynamic";

async function getData(): Promise<{ subjects: SubjectInfo[]; total: number }> {
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

    const list: SubjectInfo[] = meta.map((s) => {
      const c = grouped.get(s.slug) ?? { SS1: 0, SS2: 0, SS3: 0 };
      return {
        slug: s.slug,
        name: s.name,
        short: s.short,
        blurb: s.blurb,
        color: s.color,
        icon: s.icon,
        counts: { ...c, total: c.SS1 + c.SS2 + c.SS3 },
      };
    });
    const total = list.reduce((a, s) => a + s.counts.total, 0);
    return { subjects: list, total };
  } catch {
    return { subjects: [], total: 0 };
  }
}

export default async function HomePage() {
  const { subjects, total } = await getData();

  return (
    <main className="relative">
      <Hero subjects={subjects} totalQuestions={total} />
      <VideoScroll />
      <Stats totalQuestions={total} />
      <ExamTracks />
      <CurriculumTeaser subjects={subjects} />
      <CbtPromo />
      <BigBand />
      <Features />
    </main>
  );
}
