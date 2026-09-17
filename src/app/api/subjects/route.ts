import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { questions, subjects } from "@/db/schema";
import type { SubjectInfo } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const meta = await db.select().from(subjects);
    const counts = await db
      .select({
        slug: questions.subjectSlug,
        level: questions.level,
        n: sql<number>`count(*)::int`,
      })
      .from(questions)
      .groupBy(questions.subjectSlug, questions.level);

    const grouped = new Map<string, { SS1: number; SS2: number; SS3: number }>();
    for (const c of counts) {
      const entry = grouped.get(c.slug) ?? { SS1: 0, SS2: 0, SS3: 0 };
      if (c.level === "SS1" || c.level === "SS2" || c.level === "SS3") {
        entry[c.level] = Number(c.n);
      }
      grouped.set(c.slug, entry);
    }

    const out: SubjectInfo[] = meta.map((s) => {
      const byLevel = grouped.get(s.slug) ?? { SS1: 0, SS2: 0, SS3: 0 };
      return {
        slug: s.slug,
        name: s.name,
        short: s.short,
        blurb: s.blurb,
        color: s.color,
        icon: s.icon,
        counts: { ...byLevel, total: byLevel.SS1 + byLevel.SS2 + byLevel.SS3 },
      };
    });

    return NextResponse.json({ subjects: out });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ subjects: [] }, { status: 500 });
  }
}
