import { db } from "@/db";
import { answerLogs, attempts, questions } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { waecGrade } from "@/lib/constants";

export interface AnswerIn {
  id: number;
  selected: number | null;
}

export interface ReviewRow {
  id: number;
  subjectSlug: string;
  level: string;
  term: number;
  topic: string;
  question: string;
  options: string[];
  selected: number | null;
  answerIndex: number;
  explanation: string;
  isRight: boolean;
}

/**
 * Grade a sitting server-side, persist the attempt plus one answer-log row per
 * question, and return the full review payload. Shared by /api/attempts and
 * /api/daily so every pencil mark feeds the adaptive engine.
 */
export async function scoreAndPersist(opts: {
  clientId: string;
  mode: string;
  label: string;
  durationSec?: number;
  answers: AnswerIn[];
  meta?: Record<string, unknown>;
}) {
  const { clientId, mode, label } = opts;
  const answers = (opts.answers ?? []).filter((a) => typeof a.id === "number");

  const ids = answers.map((a) => a.id);
  const rows = await db.select().from(questions).where(inArray(questions.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));

  let correct = 0;
  const review = answers
    .map((a): ReviewRow | null => {
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
    })
    .filter(Boolean) as ReviewRow[];

  const total = review.length;
  const scorePct = total ? Math.round((correct / total) * 100) : 0;
  const utmeScore = mode === "cbt" ? scorePct * 4 : null;

  const bySubject: Record<string, { correct: number; total: number }> = {};
  for (const r of review) {
    bySubject[r.subjectSlug] = bySubject[r.subjectSlug] ?? { correct: 0, total: 0 };
    bySubject[r.subjectSlug].total += 1;
    if (r.isRight) bySubject[r.subjectSlug].correct += 1;
  }

  const [saved] = await db
    .insert(attempts)
    .values({
      clientId,
      mode,
      label,
      totalQuestions: total,
      correct,
      scorePct,
      utmeScore,
      durationSec: Math.max(0, Number(opts.durationSec ?? 0)),
      meta: { ...(opts.meta ?? {}), review, bySubject },
    })
    .returning({ id: attempts.id });

  // Feed the adaptive engine. One row per answered question.
  if (review.length) {
    const lookup = new Map(rows.map((r) => [r.id, r]));
    await db.insert(answerLogs).values(
      review.map((r) => {
        const q = lookup.get(r.id);
        return {
          clientId,
          questionId: r.id,
          subjectSlug: r.subjectSlug,
          level: r.level,
          topic: r.topic,
          difficulty: q?.difficulty ?? "medium",
          correct: r.isRight,
          mode,
          durationMs: 0,
        };
      }),
    );
  }

  return {
    attemptId: saved.id,
    total,
    correct,
    scorePct,
    utmeScore,
    grade: waecGrade(scorePct),
    bySubject,
    review,
  };
}
