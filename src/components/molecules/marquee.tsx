"use client";

import { motion } from "motion/react";

interface MarqueeProps {
  text?: string;
}

export function Marquee({ text = "DESIGN \u00b7 SYSTEMS \u00b7 THOUGHTS \u00b7 CODE \u00b7" }: MarqueeProps) {
  return (
    <section className="py-12 md:py-20 overflow-hidden">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: [0, -1200] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="text-[clamp(40px,8vw,80px)] tracking-[-0.03em] text-[#eeeeec] mx-8 font-[family-name:var(--font-space-grotesk)]"
            style={{ fontWeight: 700 }}
          >
            {text}
          </span>
        ))}
      </motion.div>
    </section>
  );
}
