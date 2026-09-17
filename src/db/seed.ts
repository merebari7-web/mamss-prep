import "dotenv/config";
import { db, pool } from "./index";
import { questions, subjects } from "./schema";
import { SUBJECTS } from "./seed-data/helpers";
import { mathematics } from "./seed-data/mathematics";
import { english } from "./seed-data/english";
import { physics } from "./seed-data/physics";
import { chemistry } from "./seed-data/chemistry";
import { biology } from "./seed-data/biology";
import { economics } from "./seed-data/economics";
import { government } from "./seed-data/government";
import { literature } from "./seed-data/literature";
import { civicEducation } from "./seed-data/civic-education";

const BANK = [
  { slug: "mathematics", items: mathematics },
  { slug: "english", items: english },
  { slug: "physics", items: physics },
  { slug: "chemistry", items: chemistry },
  { slug: "biology", items: biology },
  { slug: "economics", items: economics },
  { slug: "government", items: government },
  { slug: "literature", items: literature },
  { slug: "civic-education", items: civicEducation },
];

async function main() {
  console.log("Seeding subjects...");
  for (const s of SUBJECTS) {
    await db
      .insert(subjects)
      .values(s)
      .onConflictDoUpdate({ target: subjects.slug, set: s });
  }

  console.log("Clearing old questions...");
  await db.delete(questions);

  let total = 0;
  for (const { slug, items } of BANK) {
    await db.insert(questions).values(
      items.map((it) => ({
        subjectSlug: slug,
        level: it.level,
        term: it.term,
        topic: it.topic,
        question: it.question,
        options: it.options,
        answerIndex: it.answerIndex,
        explanation: it.explanation,
        difficulty: it.difficulty,
        exams: it.exams,
      })),
    );
    total += items.length;
    console.log(`  ${slug}: ${items.length} questions`);
  }

  console.log(`DONE. ${total} questions across ${SUBJECTS.length} subjects.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
