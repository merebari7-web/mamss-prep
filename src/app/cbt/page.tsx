import CBTApp from "@/components/cbt/CBTApp";
import { getSubjectInfo } from "@/lib/server/subjects";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live CBT Hall — MAMSS Prep",
  description:
    "A JAMB-style computer-based test hall: four papers, one clock, question palette, calculator, auto-submit and an aggregate scaled to /400.",
};

export default async function CbtPage() {
  const subjects = await getSubjectInfo();

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-24 pt-28 sm:px-6">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)]" />
      <div className="relative">
        <header className="mx-auto mb-10 max-w-3xl text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-dim">LIVE SIMULATION · ENGLISH + 3 PAPERS</p>
          <h1 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-5xl">
            THE CBT <span className="text-stroke">HALL</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-dim">
            Everything JAMB does, minus the queue: a running clock, numbered palette,
            on-screen calculator, auto-submit — and an aggregate scaled to /400.
          </p>
        </header>
        <CBTApp subjects={subjects} />
      </div>
    </main>
  );
}
