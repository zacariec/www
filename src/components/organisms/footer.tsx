"use client";

import { useEffect, useRef, useState } from "react";

import { motion } from "motion/react";

import { BlobLink } from "@/components/atoms/blob-link";
import { BlobLogo } from "@/components/atoms/blob-logo";
import { NavList } from "@/components/molecules/nav-list";
import { NowPlaying } from "@/components/molecules/now-playing";
import { blobState } from "@/lib/blob-state";

interface FooterProps {
  navItems?: { label: string; href: string }[];
  heading?: string;
  subtitle?: string;
}

export const Footer = ({
  navItems = [
    { label: "Index", href: "/" },
    { label: "Writing", href: "/blog" },
    { label: "Timeline", href: "/timeline" },
  ],
  heading = "Thanks for\nreading.",
  subtitle = "\u2014 End",
}: FooterProps) => {
  const footerRef = useRef<HTMLElement>(null);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const headingLines = heading.split("\n");

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        blobState.inFooter = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      blobState.inFooter = false;
    };
  }, []);

  return (
    <footer
      ref={footerRef}
      className="min-h-screen bg-[#1a1c1b] text-[#f9f9f7] flex flex-col justify-between relative"
    >
      <button
        className="w-full bg-transparent border-none cursor-pointer group text-left px-5 md:px-16 py-8 transition-colors duration-500 hover:bg-[#3b3b3b]/20"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        type="button"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-[3px] uppercase text-[#777777] group-hover:text-[#c6c6c6] transition-colors duration-500 font-[family-name:var(--font-space-grotesk)]">
            Back to top
          </span>
          <BlobLink color="#3b3b3b" size={24}>
            <motion.span
              className="text-[#777777] group-hover:text-[#c6c6c6] transition-colors duration-500 text-lg"
              whileHover={{ y: -2 }}
            >
              ↑
            </motion.span>
          </BlobLink>
        </div>
      </button>

      <div className="flex-1 flex items-end px-5 md:px-16 pb-16">
        <motion.div
          initial={{ opacity: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1 }}
        >
          <p className="text-[10px] tracking-[3px] uppercase text-[#777777] mb-6 font-[family-name:var(--font-space-grotesk)]">
            {subtitle}
          </p>
          <h2
            className="text-[clamp(28px,6vw,64px)] tracking-[-0.03em] text-[#3b3b3b]"
            style={{ fontWeight: 700, lineHeight: 1.1 }}
          >
            {headingLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < headingLines.length - 1 && <br />}
              </span>
            ))}
          </h2>
        </motion.div>
      </div>

      <div data-footer-nav className="px-5 md:px-16 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <BlobLogo darkMode size={20} textSize="6px" />
            <span className="text-[9px] tracking-[2px] uppercase text-[#777777] font-[family-name:var(--font-space-grotesk)]">
              &copy; {new Date().getFullYear()}
            </span>
          </div>
          <NowPlaying variant="footer" />
          <NavList
            hoveredHref={hoveredHref}
            navItems={navItems}
            onHover={setHoveredHref}
            variant="footer"
          />
        </div>
      </div>
    </footer>
  );
};
