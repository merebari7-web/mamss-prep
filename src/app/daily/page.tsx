import type { Metadata } from "next";
import DailyRunner from "@/components/daily/DailyRunner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daily Challenge — MAMSS Prep",
  description:
    "Five fresh questions every day, the same paper for the whole school. Keep your streak alive.",
};

export default function DailyPage() {
  return <DailyRunner />;
}
