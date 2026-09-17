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
