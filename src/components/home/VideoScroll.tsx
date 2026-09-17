"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useScroll,
  useMotionValueEvent,
  useTransform,
} from "framer-motion";
import { ArrowRight } from "lucide-react";

/**
 * Pinned, scroll-scrubbed exam-hall video. Scrolling transports the viewer
 * through the footage while three typographic beats punch in.
 */
export default function VideoScroll() {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  const { scrollYProgress } = useScroll({
    target: wrap,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const el = video.current;
    if (el && el.duration && Number.isFinite(el.duration)) {
      const t = Math.max(0, Math.min(el.duration - 0.05, v * el.duration));
      if (Math.abs(el.currentTime - t) > 0.03) el.currentTime = t;
    }
  });

  const vidScale = useTransform(scrollYProgress, [0, 1], [0.92, 1.06]);
  const vidRotate = useTransform(scrollYProgress, [0, 1], [-2.5, 0]);
  const t1o = useTransform(scrollYProgress, [0.04, 0.14, 0.28, 0.36], [0, 1, 1, 0]);
  const t2o = useTransform(scrollYProgress, [0.34, 0.46, 0.6, 0.68], [0, 1, 1, 0]);
  const t3o = useTransform(scrollYProgress, [0.66, 0.78, 0.97], [0, 1, 1]);
  const t1y = useTransform(scrollYProgress, [0.04, 0.14], [80, 0]);
  const t2y = useTransform(scrollYProgress, [0.34, 0.46], [80, 0]);
  const t3y = useTransform(scrollYProgress, [0.66, 0.78], [80, 0]);
  const bar = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section ref={wrap} className="relative h-[340vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {/* the scrubbed footage, tilted like a screen in 3D space */}
        <motion.div
          style={{ scale: vidScale, rotate: vidRotate }}
          className="persp absolute inset-4 overflow-hidden rounded-[28px] border border-line shadow-2xl shadow-black/60 sm:inset-8"
        >
          <video
            ref={video}
            className="h-full w-full object-cover"
            src="/media/exam-hall.mp4"
            poster="/media/exam-poster.jpg"
            muted
            playsInline
            preload="auto"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/50" />
        </motion.div>

        {/* typographic beats */}
        <div className="pointer-events-none relative z-10 px-4 text-center">
          <motion.h2
            style={{ opacity: t1o, y: t1y }}
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 font-display text-[10vw] font-black leading-[0.95] tracking-tight sm:text-[6.5vw]"
          >
            EVERY TERM
            <span className="text-lime">.</span>
          </motion.h2>
          <motion.h2
            style={{ opacity: t2o, y: t2y }}
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 font-display text-[10vw] font-black leading-[0.95] tracking-tight sm:text-[6.5vw]"
          >
            EVERY TOPIC
            <span className="text-iris">.</span>
          </motion.h2>
          <motion.div style={{ opacity: t3o, y: t3y }} className="absolute inset-x-0 top-1/2 -translate-y-1/2">
            <h2 className="font-display text-[10vw] font-black leading-[0.95] tracking-tight sm:text-[6.5vw]">
              EVERY <span className="text-stroke-lime">WIN</span>.
            </h2>
            <Link
              href="/curriculum"
              className="pointer-events-auto mt-8 inline-flex items-center gap-2 rounded-full bg-lime px-7 py-3.5 text-sm font-bold text-ink transition-all hover:bg-lime2 hover:shadow-[0_0_36px_rgba(200,241,105,0.4)]"
            >
              Browse the curriculum <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>

        {/* progress + caption */}
        <div className="absolute bottom-10 left-8 right-8 z-10 flex items-center gap-4 sm:left-12 sm:right-12">
          <span className="font-mono text-[10px] tracking-[0.25em] text-dim">SCROLL — THE HALL</span>
          <div className="h-px flex-1 bg-white/15">
            <motion.div style={{ scaleX: bar }} className="h-full origin-left bg-lime" />
          </div>
          <span className="font-mono text-[10px] tracking-[0.25em] text-dim">SS1—SS3</span>
        </div>
      </div>
    </section>
  );
}
