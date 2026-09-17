import FlashcardRunner from "@/components/study/FlashcardRunner";
import { getSubjectInfo } from "@/lib/server/subjects";

export const dynamic = "force-dynamic";
export const metadata = { title: "Flashcards — MAMSS Prep" };

export default async function Page() {
  const subjects = await getSubjectInfo();
  return <FlashcardRunner subjects={subjects} />;
}
