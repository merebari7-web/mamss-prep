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

export type Subject = typeof subjects.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
