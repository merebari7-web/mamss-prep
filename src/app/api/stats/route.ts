import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { answerLogs } from "@/db/schema";
import {
  computeStreak,
  headlineStats,
  recentActivity,
  topicStats,
} from "@/lib/server/analytics";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats?clientId=x - the Progress HQ brain: streak, activity grid,
 * subject + topic mastery, headline totals and a composite readiness score.
 */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ ok: false, error: "clientId required" }, { status: 400 });
  }
  try {
    const [streak, week, bySubjectRows, topics, headline] = await Promise.all([
      computeStreak(clientId),
      recentActivity(clientId, 7),
      db
        .select({
          subject: answerLogs.subjectSlug,
          correct: sql<number>`sum(case when ${answerLogs.correct} then 1 else 0 end)::int`,
          total: sql<number>`count(*)::int`,
        })
        .from(answerLogs)
        .where(and(eq(answerLogs.clientId, clientId)))
        .groupBy(answerLogs.subjectSlug),
      topicStats(clientId),
      headlineStats(clientId),
    ]);

    const bySubject: Record<string, { correct: number; total: number; pct: number }> = {};
    for (const r of bySubjectRows) {
      bySubject[r.subject] = {
        correct: Number(r.correct),
        total: Number(r.total),
        pct: r.total ? Math.round((Number(r.correct) / Number(r.total)) * 100) : 0,
      };
    }

    const totalAnswers = Object.values(bySubject).reduce((a, s) => a + s.total, 0);
    const totalCorrect = Object.values(bySubject).reduce((a, s) => a + s.correct, 0);
    const accuracy = totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
    const coverage = Math.min(1, Object.keys(bySubject).length / 9);
    const consistency = Math.min(1, week.filter((d) => d.count > 0).length / 5);
    const readiness = Math.round(accuracy * 0.55 + coverage * 100 * 0.25 + consistency * 100 * 0.2);

    const weakTopics = topics.filter((t) => t.total >= 2 && t.pct < 60).slice(0, 8);
    const strongTopics = topics.filter((t) => t.total >= 2 && t.pct >= 80).slice(-6).reverse();

    return NextResponse.json({
      ok: true,
      streak,
      week,
      bySubject,
      weakTopics,
      strongTopics,
      accuracy,
      readiness,
      headline,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "stats failed" }, { status: 500 });
  }
}
