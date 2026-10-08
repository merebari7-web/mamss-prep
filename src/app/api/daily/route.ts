import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts } from "@/db/schema";
import { questions, subjects } from "@/db/schema";
import { scoreAndPersist, type AnswerIn } from "@/lib/server/grading";
import { computeStreak } from "@/lib/server/analytics";

export const dynamic = "force-dynamic";

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/** Deterministic xorshift PRNG seeded from the date so everyone gets the same paper. */
function seededRng(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

/** Today's 5-question paper: deterministic, spread across mixed subjects. */
async function todaysPaper(dateStr: string) {
  const rng = seededRng(`mamss-daily-${dateStr}`);
  const meta = await db.select().from(subjects);
  const slugs = [...meta.map((s) => s.slug)].sort(() => rng() - 0.5);
  const picked: typeof questions.$inferSelect[] = [];
  for (const slug of slugs) {
    if (picked.length >= 5) break;
    const rows = await db
      .select()
      .from(questions)
      .where(eq(questions.subjectSlug, slug))
      .orderBy(sql`random()`)
      .limit(1);
    if (rows[0]) picked.push(rows[0]);
  }
  return picked.sort(() => rng() - 0.5);
}

const strip = (r: typeof questions.$inferSelect) => ({
  id: r.id,
  subjectSlug: r.subjectSlug,
  level: r.level,
  topic: r.topic,
  question: r.question,
  options: r.options,
  difficulty: r.difficulty,
});

/** GET /api/daily?clientId=x - today's challenge plus the visitor's streak state. */
export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get("clientId") ?? "";
    const date = dayKey();
    const paper = await todaysPaper(date);

    let completedToday = false;
    let todayScore: number | null = null;
    let streak = 0;
    if (clientId) {
      streak = await computeStreak(clientId);
      const done = await db
        .select({ pct: attempts.scorePct })
        .from(attempts)
        .where(
          and(
            eq(attempts.clientId, clientId),
            eq(attempts.mode, "daily"),
            sql`to_char(${attempts.createdAt} at time zone 'UTC', 'YYYY-MM-DD') = ${date}`,
          ),
        )
        .limit(1);
      if (done[0]) {
        completedToday = true;
        todayScore = done[0].pct;
      }
    }

    return NextResponse.json({
      date,
      count: paper.length,
      questions: paper.map(strip),
      streak,
      completedToday,
      todayScore,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "failed to build daily challenge" }, { status: 500 });
  }
}

/** POST /api/daily - submit today's answers; score, persist and return the streak. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      clientId?: string;
      durationSec?: number;
      answers?: AnswerIn[];
    };
    const answers = body.answers ?? [];
    if (answers.length === 0) {
      return NextResponse.json({ error: "no answers provided" }, { status: 400 });
    }
    const date = dayKey();
    const label = `Daily Challenge · ${date}`;
    const result = await scoreAndPersist({
      clientId: body.clientId || "anon",
      mode: "daily",
      label,
      durationSec: body.durationSec,
      answers,
      meta: { dailyDate: date },
    });
    const streak = await computeStreak(body.clientId || "anon");
    return NextResponse.json({ ...result, streak, dailyDate: date });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "daily scoring failed" }, { status: 500 });
  }
}
