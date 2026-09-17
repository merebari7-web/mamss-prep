import SpellingLab from "@/components/study/SpellingLab";
import { getSubjectInfo } from "@/lib/server/subjects";

export const dynamic = "force-dynamic";
export const metadata = { title: "Spelling Lab — MAMSS Prep" };

export default async function Page() {
  const subjects = await getSubjectInfo();
  return <SpellingLab subjects={subjects} />;
}
