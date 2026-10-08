import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, leaderboardEntries } from "@/db/schema";

export const dynamic = "force-dynamic";

function sanitizeAlias(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[^a-zA-Z0-9 _.\-]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 20);
}

/** GET /api/leaderboard - top pinned scores from the last 7 days. */
export async function GET() {
  try {
    const since = new Date(Date.now() - 7 * 86400000);
    const rows = await db
      .select({
        id: leaderboardEntries.id,
        alias: leaderboardEntries.alias,
        scorePct: leaderboardEntries.scorePct,
        utmeScore: leaderboardEntries.utmeScore,
        totalQuestions: leaderboardEntries.totalQuestions,
        durationSec: leaderboardEntries.durationSec,
        label: leaderboardEntries.label,
        createdAt: leaderboardEntries.createdAt,
      })
      .from(leaderboardEntries)
      .where(gte(leaderboardEntries.createdAt, since))
      .orderBy(
        sql`${leaderboardEntries.utmeScore} desc nulls last`,
        desc(leaderboardEntries.scorePct),
        leaderboardEntries.durationSec,
      )
      .limit(20);
    return NextResponse.json({ entries: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ entries: [] });
  }
}

/** POST /api/leaderboard - pin one of your own attempts under an alias. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { clientId?: string; alias?: string; attemptId?: string };
    const alias = sanitizeAlias(body.alias);
    const clientId = body.clientId ?? "";
    const attemptId = body.attemptId ?? "";
    if (!alias || alias.length < 2 || !clientId || !attemptId) {
      return NextResponse.json({ ok: false, error: "alias and attempt required" }, { status: 400 });
    }

    // verify ownership of the attempt
    const [att] = await db
      .select()
      .from(attempts)
      .where(and(eq(attempts.id, attemptId), eq(attempts.clientId, clientId)))
      .limit(1);
    if (!att) {
      return NextResponse.json({ ok: false, error: "attempt not found" }, { status: 404 });
    }

    // one pin per attempt; re-pin updates the alias
    await db.delete(leaderboardEntries).where(eq(leaderboardEntries.attemptId, attemptId));
    const [row] = await db
      .insert(leaderboardEntries)
      .values({
        alias,
        clientId,
        attemptId,
        scorePct: att.scorePct,
        utmeScore: att.utmeScore,
        totalQuestions: att.totalQuestions,
        durationSec: att.durationSec,
        label: att.label,
      })
      .returning({ id: leaderboardEntries.id });

    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "could not pin score" }, { status: 500 });
  }
}
