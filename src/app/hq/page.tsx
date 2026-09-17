import ProgressHQ from "@/components/hq/ProgressHQ";
import { getSubjectInfo } from "@/lib/server/subjects";

export const dynamic = "force-dynamic";
export const metadata = { title: "Progress HQ — MAMSS Prep" };

export default async function Page() {
  const subjects = await getSubjectInfo();
  return <ProgressHQ subjects={subjects} />;
}
