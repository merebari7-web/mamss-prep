import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attempts } from "@/db/schema";
import { scoreAndPersist, type AnswerIn } from "@/lib/server/grading";

export const dynamic = "force-dynamic";

/** GET /api/attempts?clientId=xxx - recent results for one browser. */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ attempts: [] });
  try {
    const rows = await db
      .select()
      .from(attempts)
      .where(eq(attempts.clientId, clientId))
      .orderBy(desc(attempts.createdAt))
      .limit(12);
    return NextResponse.json({ attempts: rows });
  } catch {
    return NextResponse.json({ attempts: [] });
  }
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
    const answers = body.answers ?? [];
    if (answers.length === 0) {
      return NextResponse.json({ error: "no answers provided" }, { status: 400 });
    }
    const result = await scoreAndPersist({
      clientId: body.clientId || "anon",
      mode: body.mode ?? "practice",
      label: body.label ?? "Quiz",
      durationSec: body.durationSec,
      answers,
      meta: body.meta,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "scoring failed" }, { status: 500 });
  }
}
