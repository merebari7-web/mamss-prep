import { sql } from "drizzle-orm";
import { db } from "@/db";
import { questions, subjects } from "@/db/schema";
import type { SubjectInfo } from "@/lib/constants";

export async function getSubjectInfo(): Promise<SubjectInfo[]> {
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
