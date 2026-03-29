"use client";

import { useEffect, useState } from "react";

import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { socialLinks } from "@/lib/constants";

interface SocialFlipperProps {
  variant?: "header" | "footer";
}

export const SocialFlipper = ({ variant = "header" }: SocialFlipperProps) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % socialLinks.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [paused]);

  const current = socialLinks[index];
  const isHeader = variant === "header";
  const textClass = isHeader
    ? "text-[11px] tracking-[2px] text-[#777777] hover:text-black"
    : "text-[9px] tracking-[2px] text-[#777777] hover:text-[#c6c6c6]";
  const fontClass = isHeader ? "" : "font-[family-name:var(--font-space-grotesk)]";

  return (
    <a
      href={current.href}
      rel="noopener noreferrer"
      target="_blank"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`${textClass} uppercase no-underline transition-colors duration-300 flex items-center gap-1 py-5 px-3 -mx-3 ${fontClass} relative overflow-hidden`}
    >
      <div className="relative h-[14px] w-[16px] overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={current.label}
            initial={{ y: 14, rotateX: -90 }}
            animate={{ y: 0, rotateX: 0 }}
            exit={{ y: -14, rotateX: 90 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0 flex items-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            {current.label}
          </motion.span>
        </AnimatePresence>
      </div>
      <ArrowUpRight className="w-2.5 h-2.5" />
    </a>
  );
};
