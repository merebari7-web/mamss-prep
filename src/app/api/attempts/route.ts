import { NextRequest, NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { attempts, questions } from "@/db/schema";
import { waecGrade } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface AnswerIn {
  id: number;
  selected: number | null;
}

/** GET /api/attempts?clientId=xxx - recent results for one browser. */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ attempts: [] });
  const rows = await db
    .select()
    .from(attempts)
    .where(eq(attempts.clientId, clientId))
    .orderBy(desc(attempts.createdAt))
    .limit(12);
  return NextResponse.json({ attempts: rows });
}

/** POST /api/attempts - score a quiz/CBT sitting server-side and persist it. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      clientId?: string;
      mode?: string;
      label?: string;
      durationSec?: number;
      answers?: AnswerIn[];
      meta?: Record<string, unknown>;
    };

    const clientId = body.clientId || "anon";
    const answers = (body.answers ?? []).filter((a) => typeof a.id === "number");
    if (answers.length === 0) {
      return NextResponse.json({ error: "no answers provided" }, { status: 400 });
    }

    const ids = answers.map((a) => a.id);
    const rows = await db.select().from(questions).where(inArray(questions.id, ids));
    const byId = new Map(rows.map((r) => [r.id, r]));

    let correct = 0;
    const review = answers.map((a) => {
      const row = byId.get(a.id);
      if (!row) return null;
      const isRight = a.selected !== null && a.selected === row.answerIndex;
      if (isRight) correct += 1;
      return {
        id: row.id,
        subjectSlug: row.subjectSlug,
        level: row.level,
        term: row.term,
        topic: row.topic,
        question: row.question,
        options: row.options,
        selected: a.selected,
        answerIndex: row.answerIndex,
        explanation: row.explanation,
        isRight,
      };
    }).filter(Boolean) as Array<Record<string, unknown>>;

    const total = review.length;
    const scorePct = total ? Math.round((correct / total) * 100) : 0;
    const utmeScore = body.mode === "cbt" ? scorePct * 4 : null; // scaled /400

    // per-subject breakdown
    const bySubject: Record<string, { correct: number; total: number }> = {};
    for (const r of review) {
      const slug = String(r.subjectSlug);
      bySubject[slug] = bySubject[slug] ?? { correct: 0, total: 0 };
      bySubject[slug].total += 1;
      if (r.isRight) bySubject[slug].correct += 1;
    }

    const [saved] = await db
      .insert(attempts)
      .values({
        clientId,
        mode: body.mode ?? "practice",
        label: body.label ?? "Quiz",
        totalQuestions: total,
        correct,
        scorePct,
        utmeScore,
        durationSec: Math.max(0, Number(body.durationSec ?? 0)),
        meta: { ...(body.meta ?? {}), review, bySubject },
      })
      .returning({ id: attempts.id });

    return NextResponse.json({
      attemptId: saved.id,
      total,
      correct,
      scorePct,
      utmeScore,
      grade: waecGrade(scorePct),
      bySubject,
      review,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "scoring failed" }, { status: 500 });
  }
}
