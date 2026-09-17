import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { questions } from "@/db/schema";

export const dynamic = "force-dynamic";

function buildWhere(sp: URLSearchParams, subjectSlug: string): SQL[] {
  const conds: SQL[] = [eq(questions.subjectSlug, subjectSlug)];
  const level = sp.get("level");
  const term = sp.get("term");
  const exam = sp.get("exam");
  if (level && ["SS1", "SS2", "SS3"].includes(level)) {
    conds.push(eq(questions.level, level));
  }
  if (term && ["1", "2", "3"].includes(term)) {
    conds.push(eq(questions.term, Number(term)));
  }
  if (exam) {
    conds.push(sql`${questions.exams} && ARRAY[${exam}]::text[]`);
  }
  return conds;
}

/**
 * GET /api/questions
 * Single subject:  ?subject=mathematics&level=SS2&term=1&limit=10&mode=practice
 * Multi (CBT):     ?subjects=english,mathematics&perSubject=8&mode=cbt&exam=JAMB
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const mode = sp.get("mode") === "cbt" ? "cbt" : "practice";
    const multi = sp.get("subjects");

    async function pull(slug: string, limit: number) {
      return db
        .select()
        .from(questions)
        .where(and(...buildWhere(sp, slug)))
        .orderBy(sql`random()`)
        .limit(limit);
    }

    if (multi) {
      const slugs = multi
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6);
      const perSubject = Math.min(25, Math.max(1, Number(sp.get("perSubject") ?? 10)));
      type Row = Awaited<ReturnType<typeof pull>>[number];
      const strip = (r: Row) => ({
        id: r.id,
        subjectSlug: r.subjectSlug,
        level: r.level,
        term: r.term,
        topic: r.topic,
        question: r.question,
        options: r.options,
        difficulty: r.difficulty,
      });
      const grouped: Record<string, ReturnType<typeof strip>[] | Row[]> = {};
      for (const slug of slugs) {
        const rows = await pull(slug, perSubject);
        grouped[slug] = mode === "cbt" ? rows.map(strip) : rows;
      }
      return NextResponse.json({ mode, grouped });
    }

    const subject = sp.get("subject") ?? "mathematics";
    const limit = Math.min(40, Math.max(1, Number(sp.get("limit") ?? 10)));
    const rows = await pull(subject, limit);

    if (mode === "cbt") {
      return NextResponse.json({
        mode,
        questions: rows.map(({ answerIndex, explanation, ...rest }) => ({
          id: rest.id,
          subjectSlug: rest.subjectSlug,
          level: rest.level,
          term: rest.term,
          topic: rest.topic,
          question: rest.question,
          options: rest.options,
          difficulty: rest.difficulty,
        })),
      });
    }

    return NextResponse.json({ mode, questions: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed to load questions" }, { status: 500 });
  }
}
