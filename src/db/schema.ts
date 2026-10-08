import {
  pgTable,
  text,
  integer,
  smallint,
  serial,
  jsonb,
  timestamp,
  uuid,
  index,
  boolean,
} from "drizzle-orm/pg-core";

export const subjects = pgTable("subjects", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  short: text("short").notNull(),
  blurb: text("blurb").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
});

export const questions = pgTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    subjectSlug: text("subject_slug")
      .notNull()
      .references(() => subjects.slug, { onDelete: "cascade" }),
    level: text("level").notNull(), // SS1 | SS2 | SS3
    term: smallint("term").notNull(), // 1 | 2 | 3
    topic: text("topic").notNull(),
    question: text("question").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    answerIndex: smallint("answer_index").notNull(),
    explanation: text("explanation").notNull(),
    difficulty: text("difficulty").notNull().default("medium"), // easy | medium | hard
    exams: text("exams").array().notNull().default(["WAEC", "JAMB"]),
  },
  (t) => [
    index("questions_subject_idx").on(t.subjectSlug),
    index("questions_level_idx").on(t.level),
    index("questions_term_idx").on(t.term),
  ],
);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: text("client_id").notNull(),
    mode: text("mode").notNull(), // practice | cbt
    label: text("label").notNull(),
    totalQuestions: integer("total_questions").notNull(),
    correct: integer("correct").notNull(),
    scorePct: integer("score_pct").notNull(),
    utmeScore: integer("utme_score"), // scaled /400 for cbt
    durationSec: integer("duration_sec").notNull().default(0),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("attempts_client_idx").on(t.clientId)],
);

/**
 * Per-question telemetry. Logged (fire-and-forget) after every sitting so the
 * adaptive engine can find weak topics, calibrate difficulty and build streaks.
 */
export const answerLogs = pgTable(
  "answer_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: text("client_id").notNull(),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    subjectSlug: text("subject_slug").notNull(),
    level: text("level").notNull(),
    topic: text("topic").notNull(),
    difficulty: text("difficulty").notNull().default("medium"),
    correct: boolean("correct").notNull(),
    mode: text("mode").notNull().default("practice"), // practice | cbt | daily | rapid
    durationMs: integer("duration_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("answer_logs_client_idx").on(t.clientId),
    index("answer_logs_client_subject_idx").on(t.clientId, t.subjectSlug),
    index("answer_logs_created_idx").on(t.createdAt),
  ],
);

/** Opt-in public board: a student pins one of their attempts under an alias. */
export const leaderboardEntries = pgTable(
  "leaderboard_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    alias: text("alias").notNull(),
    clientId: text("client_id").notNull(),
    attemptId: uuid("attempt_id").references(() => attempts.id, { onDelete: "cascade" }),
    scorePct: integer("score_pct").notNull(),
    utmeScore: integer("utme_score"), // null for practice sittings
    totalQuestions: integer("total_questions").notNull(),
    durationSec: integer("duration_sec").notNull().default(0),
    label: text("label").notNull().default("UTME Mock"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("leaderboard_created_idx").on(t.createdAt),
    index("leaderboard_client_idx").on(t.clientId),
  ],
);

export type Subject = typeof subjects.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type AnswerLog = typeof answerLogs.$inferSelect;
export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
