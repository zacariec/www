"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { BlobLogo } from "@/components/atoms/blob-logo";
import { TimeDisplay } from "@/components/atoms/time-display";
import { NowPlaying } from "@/components/molecules/now-playing";
import { NavList } from "@/components/molecules/nav-list";
import { siteConfig, navItems as defaultNavItems } from "@/lib/constants";

interface NavbarProps {
  navItems?: readonly { label: string; href: string }[];
}

export function Navbar({ navItems = defaultNavItems }: NavbarProps) {
  const pathname = usePathname();
  const [hideNav, setHideNav] = useState(false);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  useEffect(() => {
    const footerNav = document.querySelector("[data-footer-nav]");
    if (!footerNav) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHideNav(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(footerNav);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      {/* Desktop Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 hidden md:block transition-all duration-500 bg-transparent ${
          hideNav ? "opacity-0 -translate-y-full pointer-events-none" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="flex items-center justify-between px-8 lg:px-16 py-5">
          <Link href="/" className="no-underline flex items-center gap-3 group">
            <BlobLogo size={32} textSize="10px" />
            <span className="text-[10px] tracking-[3px] uppercase transition-opacity duration-300 opacity-0">
              Journal
            </span>
          </Link>

          <div className="flex items-center gap-10">
            <NavList
              navItems={navItems}
              linkedInUrl={siteConfig.linkedIn}
              variant="header"
              hoveredHref={hoveredHref}
              onHover={setHoveredHref}
            />
            <TimeDisplay />
            <NowPlaying variant="header" />
          </div>
        </div>
      </nav>

      {/* Mobile top bar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 md:hidden transition-all duration-500 bg-transparent ${
          hideNav ? "opacity-0 -translate-y-full pointer-events-none" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/" className="no-underline">
            <BlobLogo size={28} textSize="9px" />
          </Link>
          <TimeDisplay className="text-[9px]" />
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden transition-all duration-500 ${
          hideNav ? "opacity-0 translate-y-full pointer-events-none" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="bg-[#f9f9f7]/95 backdrop-blur-md">
          <div className="flex items-center justify-between px-2">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex-1 flex items-center justify-center py-4 no-underline"
                >
                  {active && (
                    <motion.div
                      layoutId="mobile-nav"
                      className="absolute top-0 left-4 right-4 h-[2px] bg-black"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span
                    className={`text-[10px] tracking-[2px] uppercase transition-colors duration-300 ${
                      active ? "text-black" : "text-[#c6c6c6]"
                    }`}
                    style={{ fontWeight: active ? 600 : 400 }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
            <a
              href={siteConfig.linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center py-4 no-underline"
            >
              <span className="text-[10px] tracking-[2px] uppercase text-[#c6c6c6] flex items-center gap-1">
                Li <ArrowUpRight className="w-2.5 h-2.5" />
              </span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
