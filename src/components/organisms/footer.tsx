"use client";

import { useEffect, useState } from "react";

import { motion } from "motion/react";

import { BlobLink } from "@/components/atoms/blob-link";
import { BlobLogo } from "@/components/atoms/blob-logo";
import { NavList } from "@/components/molecules/nav-list";
import { NewsletterForm } from "@/components/molecules/newsletter-form";
import { NowPlaying } from "@/components/molecules/now-playing";

import type { NewsletterCopy } from "@/components/molecules/newsletter-form";

interface FooterProps {
  navItems?: { label: string; href: string }[];
  heading?: string;
  subtitle?: string;
  pathname?: string;
  newsletterCopy?: NewsletterCopy;
}

export const Footer = ({
  navItems = [
    { label: "Index", href: "/" },
    { label: "Writing", href: "/blog" },
    { label: "Timeline", href: "/timeline" },
  ],
  heading = "Thanks for\nreading.",
  subtitle = "\u2014 End",
  pathname,
  newsletterCopy,
}: FooterProps) => {
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [currentPathname, setCurrentPathname] = useState(
    pathname || (typeof window !== "undefined" ? window.location.pathname : "/"),
  );
  const headingLines = heading.split("\n");

  useEffect(() => {
    const onPageLoad = () => setCurrentPathname(window.location.pathname);
    document.addEventListener("astro:page-load", onPageLoad);
    window.addEventListener("popstate", onPageLoad);
    return () => {
      document.removeEventListener("astro:page-load", onPageLoad);
      window.removeEventListener("popstate", onPageLoad);
    };
  }, []);

  const handleNavClick = (href: string) => {
    setCurrentPathname(href);
  };

  return (
    <footer className="min-h-screen bg-[#1a1c1b] text-[#f9f9f7] flex flex-col justify-between relative">
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
          className="w-full flex flex-col md:flex-row md:items-end md:justify-between gap-12"
          initial={{ opacity: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1 }}
        >
          <div>
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
          </div>
          <NewsletterForm copy={newsletterCopy} />
        </motion.div>
      </div>

      <div
        data-footer-nav
        className="px-5 md:px-16 py-6 pb-[calc(env(safe-area-inset-bottom)+72px)] md:pb-6"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <BlobLogo darkMode size={20} textSize="6px" />
            <NowPlaying variant="footer" />
            <span className="text-[9px] tracking-[2px] uppercase text-[#777777] font-[family-name:var(--font-space-grotesk)]">
              &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="hidden md:flex">
            <NavList
              hoveredHref={hoveredHref}
              navItems={navItems}
              onHover={setHoveredHref}
              onNavigate={handleNavClick}
              pathname={currentPathname}
              variant="footer"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};
