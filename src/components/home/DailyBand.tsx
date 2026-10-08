import Link from "next/link";
import { ArrowUpRight, Flame } from "lucide-react";

/** Home-strip advertising the Daily Challenge — one paper per day for the whole school. */
export default function DailyBand() {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <section className="relative px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-[88rem]">
        <Link href="/daily" className="group block">
          <div className="tick relative overflow-hidden rounded-[6px] border border-lime/30 bg-gradient-to-br from-panel via-panel to-lime/8 p-7 transition-all duration-300 hover:border-lime/60 hover:shadow-[0_24px_70px_rgba(205,231,74,0.08)] sm:p-10">
            <div className="graph-bg pointer-events-none absolute inset-0 opacity-25 [mask-image:radial-gradient(60%_120%_at_82%_50%,black,transparent)]" />
            <span className="ghost-num absolute -right-3 -top-8 text-[8rem] sm:text-[11rem]">
              365
            </span>
            <div className="relative flex flex-wrap items-center gap-6 sm:gap-10">
              <span className="grid size-16 shrink-0 place-items-center rounded-[6px] bg-lime shadow-[0_0_44px_rgba(205,231,74,0.35)] transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105 sm:size-20">
                <Flame size={34} className="text-ink" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="rule-label">One paper · every day · whole school</p>
                <h2 className="mt-3 font-display text-2xl font-black tracking-tight sm:text-4xl">
                  The Daily <span className="serif-a font-normal text-lime">challenge.</span>
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-dim">
                  Five questions across five subjects, the same for every student today — {today}.
                  Keep your streak alive and watch the adaptive engine learn you.
                </p>
              </div>
              <span className="btn btn-lime">
                Play today <ArrowUpRight size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
