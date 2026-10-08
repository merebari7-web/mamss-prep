export type Level = "SS1" | "SS2" | "SS3";
export type Term = 1 | 2 | 3;
export type Difficulty = "easy" | "medium" | "hard";

export interface SeedQ {
  level: Level;
  term: Term;
  topic: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty: Difficulty;
  exams: string[];
}

export function q(
  level: Level,
  term: Term,
  topic: string,
  question: string,
  options: [string, string, string, string],
  answerIndex: 0 | 1 | 2 | 3,
  explanation: string,
  difficulty: Difficulty = "medium",
  exams: string[] = ["WAEC", "JAMB"],
): SeedQ {
  return { level, term, topic, question, options, answerIndex, explanation, difficulty, exams };
}

/**
 * Deterministically permute a question's options so correct answers spread
 * across positions A–D. Seed-authored questions mostly place the answer at
 * index 0 (authoring convenience); without a spread, always picking "A" would
 * ace every paper. The permutation is derived from the question text, so it is
 * stable across reseeds and identical on every device.
 */
export function spread(item: SeedQ): SeedQ {
  let h = 2166136261;
  for (let i = 0; i < item.question.length; i++) {
    h ^= item.question.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rng = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...item,
    options: order.map((oi) => item.options[oi]),
    answerIndex: order.indexOf(item.answerIndex) as 0 | 1 | 2 | 3,
  };
}

export interface SubjectMeta {
  slug: string;
  name: string;
  short: string;
  blurb: string;
  color: string;
  icon: string;
}

export const SUBJECTS: SubjectMeta[] = [
  { slug: "mathematics", name: "Mathematics", short: "MTH", color: "#C8F169", icon: "Sigma", blurb: "Number bases to calculus - every WAEC and JAMB topic, term by term." },
  { slug: "english", name: "English Language", short: "ENG", color: "#7DD3FC", icon: "BookOpen", blurb: "Lexis, structure, oral English and comprehension drilled the JAMB way." },
  { slug: "physics", name: "Physics", short: "PHY", color: "#A78BFA", icon: "Atom", blurb: "Mechanics, waves, electricity and modern physics with worked answers." },
  { slug: "chemistry", name: "Chemistry", short: "CHM", color: "#F472B6", icon: "FlaskConical", blurb: "Atomic structure, stoichiometry and organic chemistry made concrete." },
  { slug: "biology", name: "Biology", short: "BIO", color: "#34D399", icon: "Dna", blurb: "Cells to genetics - the facts examiners repeat year after year." },
  { slug: "economics", name: "Economics", short: "ECO", color: "#FBBF24", icon: "TrendingUp", blurb: "Demand, markets and national income with past-question patterns." },
  { slug: "government", name: "Government", short: "GOV", color: "#F87171", icon: "Landmark", blurb: "Constitutions, nationalism and federalism for WAEC and JAMB." },
  { slug: "literature", name: "Literature-in-English", short: "LIT", color: "#E879F9", icon: "Feather", blurb: "Genres, devices and dramatic terms every literature paper tests." },
  { slug: "civic-education", name: "Civic Education", short: "CVC", color: "#38BDF8", icon: "Scale", blurb: "Values, rights and national agencies - easy marks when prepared." },
];
