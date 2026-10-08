import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { answerLogs, questions } from "@/db/schema";
import { topicStats } from "@/lib/server/analytics";

export const dynamic = "force-dynamic";

/**
 * GET /api/practice/smart?clientId=x&subject=physics&level=SS2&limit=10
 *
 * The adaptive engine. Ranks the subject bank against the visitor's answer
 * history: weak topics surface first, fresh material beats repeats, and
 * difficulty tracks demonstrated ability (supports the struggling, stretches
 * the strong). Cold-start visitors get a balanced spread.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const clientId = sp.get("clientId") ?? "";
    const subject = sp.get("subject") ?? "mathematics";
    const level = sp.get("level");
    const limit = Math.min(20, Math.max(5, Number(sp.get("limit") ?? 10)));

    // candidate pool
    const conds = [eq(questions.subjectSlug, subject)];
    if (level && ["SS1", "SS2", "SS3"].includes(level)) conds.push(eq(questions.level, level));
    const bank = await db.select().from(questions).where(and(...conds));
    if (bank.length === 0) {
      return NextResponse.json({ mode: "smart", questions: [], accuracy: null, focusTopics: [] });
    }

    // history
    const topics = clientId ? await topicStats(clientId, subject) : [];
    const topicPct = new Map(topics.map((t) => [t.topic, t.pct]));
    const seenRows = clientId
      ? await db
          .select({ id: answerLogs.questionId })
          .from(answerLogs)
          .where(and(eq(answerLogs.clientId, clientId), inArray(answerLogs.questionId, bank.map((b) => b.id))))
          .orderBy(desc(answerLogs.createdAt))
          .limit(400)
      : [];
    const seen = new Map<number, number>();
    seenRows.forEach((r, i) => {
      if (!seen.has(r.id)) seen.set(r.id, i); // lower index = seen more recently
    });

    // ability estimate → difficulty bias
    const answered = topics.reduce((a, t) => a + t.total, 0);
    const accuracy = answered
      ? Math.round((topics.reduce((a, t) => a + t.correct, 0) / answered) * 100)
      : null;
    const tier = accuracy === null ? 1 : accuracy < 50 ? 0 : accuracy <= 75 ? 1 : 2; // 0 support, 1 core, 2 stretch
    const diffBias = (d: string) =>
      tier === 0
        ? d === "easy" ? 2.6 : d === "medium" ? 1.2 : 0.2
        : tier === 1
          ? d === "medium" ? 2.2 : d === "easy" ? 1.0 : 1.2
          : d === "hard" ? 2.8 : d === "medium" ? 1.6 : 0.4;

    const ranked = bank
      .map((q) => {
        const pct = topicPct.get(q.topic);
        const weakBonus = pct === undefined ? 1.6 : ((100 - pct) / 100) * 4; // unseen topic ≈ moderately attractive
        const recencyPenalty = seen.has(q.id) ? Math.max(0, 3 - (seen.get(q.id)! / 60)) : 0;
        const score = weakBonus + diffBias(q.difficulty) - recencyPenalty + Math.random();
        return { q, score, pct, recencyPenalty };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const out = ranked.map(({ q, pct, recencyPenalty }) => ({
      id: q.id,
      subjectSlug: q.subjectSlug,
      level: q.level,
      term: q.term,
      topic: q.topic,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
      answerIndex: q.answerIndex,
      explanation: q.explanation,
      reason:
        pct !== undefined && pct < 60
          ? "weak topic"
          : recencyPenalty === 0
            ? "fresh"
            : q.difficulty === "hard"
              ? "stretch"
              : "core drill",
    }));

    const focusTopics = [...new Set(
      ranked.filter((r) => r.pct !== undefined && r.pct < 60).map((r) => r.q.topic),
    )].slice(0, 4);

    return NextResponse.json({ mode: "smart", subject, accuracy, tier, focusTopics, questions: out });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "adaptive engine failed" }, { status: 500 });
  }
}
