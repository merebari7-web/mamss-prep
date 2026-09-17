import { getSubjectInfo } from "@/lib/server/subjects";
import StudyHall from "@/components/study/StudyHall";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Study Hall — MAMSS Prep",
  description: "Flashcards, Rapid Fire, Spelling Lab, Mastery Map and 12 more study tools — all in one hall.",
};

export default async function StudyPage() {
  const subjects = await getSubjectInfo();
  return <StudyHall subjects={subjects} />;
}
