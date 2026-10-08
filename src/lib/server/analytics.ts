import { db } from "@/db";
import { answerLogs, attempts } from "@/db/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";

export interface TopicStat {
  subject: string;
  topic: string;
  correct: number;
  total: number;
  pct: number;
}

/** Consecutive activity days ending today (or yesterday if today is still blank). */
export function streakFromDates(dates: string[]): number {
  const set = new Set(dates);
  const today = new Date();
  const key = (d: Date) => d.toISOString().slice(0, 10);
  let cursor = new Date(today);
  if (!set.has(key(cursor))) cursor = new Date(cursor.getTime() - 86400000);
  let streak = 0;
  while (set.has(key(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
}

/** Distinct activity dates (UTC yyyy-mm-dd) for a client, from both sources. */
export async function activityDates(clientId: string): Promise<string[]> {
  const rows = await db
    .select({ d: sql<string>`to_char(${attempts.createdAt} at time zone 'UTC', 'YYYY-MM-DD')` })
    .from(attempts)
    .where(eq(attempts.clientId, clientId))
    .groupBy(sql`1`);
  return rows.map((r) => r.d);
}

export async function computeStreak(clientId: string): Promise<number> {
  return streakFromDates(await activityDates(clientId));
}

/** Topic-level accuracy from the answer log. */
export async function topicStats(clientId: string, subject?: string): Promise<TopicStat[]> {
  const conds = [eq(answerLogs.clientId, clientId)];
  if (subject) conds.push(eq(answerLogs.subjectSlug, subject));
  const rows = await db
    .select({
      subject: answerLogs.subjectSlug,
      topic: answerLogs.topic,
      correct: sql<number>`sum(case when ${answerLogs.correct} then 1 else 0 end)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(answerLogs)
    .where(and(...conds))
    .groupBy(answerLogs.subjectSlug, answerLogs.topic);
  return rows
    .map((r) => ({
      subject: r.subject,
      topic: r.topic,
      correct: Number(r.correct),
      total: Number(r.total),
      pct: r.total ? Math.round((Number(r.correct) / Number(r.total)) * 100) : 0,
    }))
    .sort((a, b) => a.pct - b.pct);
}

/** Activity counters for the last N days (inclusive of today). */
export async function recentActivity(clientId: string, days = 7) {
  const since = new Date(Date.now() - (days - 1) * 86400000);
  since.setUTCHours(0, 0, 0, 0);
  const rows = await db
    .select({ d: sql<string>`to_char(${attempts.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` })
    .from(attempts)
    .where(and(eq(attempts.clientId, clientId), gte(attempts.createdAt, since)))
    .groupBy(sql`1`);
  const map = new Map(rows.map((r) => [r.d, Number(r.n)]));
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({ date: d, count: map.get(d) ?? 0 });
  }
  return out;
}

/** Overall correctness % from the answer log (more granular than attempts). */
export async function overallAccuracy(clientId: string): Promise<number | null> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int`, c: sql<number>`sum(case when ${answerLogs.correct} then 1 else 0 end)::int` })
    .from(answerLogs)
    .where(eq(answerLogs.clientId, clientId));
  if (!row || !row.n) return null;
  return Math.round((row.c / row.n) * 100);
}

export interface Headline {
  papers: number;
  questions: number;
  correct: number;
  avgPct: number;
  bestPct: number;
  timeSec: number;
}

/** Headline numbers from a client's attempt history. */
export async function headlineStats(clientId: string): Promise<Headline> {
  const rows = await db
    .select()
    .from(attempts)
    .where(eq(attempts.clientId, clientId))
    .orderBy(desc(attempts.createdAt))
    .limit(100);
  const papers = rows.length;
  const questionsN = rows.reduce((a, r) => a + r.totalQuestions, 0);
  const correctN = rows.reduce((a, r) => a + r.correct, 0);
  return {
    papers,
    questions: questionsN,
    correct: correctN,
    avgPct: papers ? Math.round(rows.reduce((a, r) => a + r.scorePct, 0) / papers) : 0,
    bestPct: papers ? Math.max(...rows.map((r) => r.scorePct)) : 0,
    timeSec: rows.reduce((a, r) => a + r.durationSec, 0),
  };
}
