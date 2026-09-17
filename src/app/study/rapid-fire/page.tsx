import RapidFire from "@/components/study/RapidFire";
import { getSubjectInfo } from "@/lib/server/subjects";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rapid Fire — MAMSS Prep" };

export default async function Page() {
  const subjects = await getSubjectInfo();
  return <RapidFire subjects={subjects} />;
}
