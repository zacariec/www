"use client";

import { useEffect, useRef, useState } from "react";

import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";

import { BlobLogo } from "@/components/atoms/blob-logo";
import { TimeDisplay } from "@/components/atoms/time-display";
import { NavList } from "@/components/molecules/nav-list";
import { NowPlaying } from "@/components/molecules/now-playing";
import { navItems as defaultNavItems, siteConfig } from "@/lib/constants";

interface NavbarProps {
  navItems?: readonly { label: string; href: string }[];
  pathname?: string;
}

export const Navbar = ({ navItems = defaultNavItems, pathname: pathnameProp }: NavbarProps) => {
  const initialPathname =
    pathnameProp || (typeof window !== "undefined" ? window.location.pathname : "/");
  const [currentPathname, setCurrentPathname] = useState(initialPathname);
  const pathname = currentPathname;
  const [hideNav, setHideNav] = useState(false);
  const [overFooter, setOverFooter] = useState(false);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  // Update active state on Astro client-side navigation
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

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Hide the desktop navbar once the footer's nav strip enters the viewport.
  // We re-query the DOM on every scroll instead of using a one-shot
  // IntersectionObserver because the Footer is `client:only` with a fallback
  // slot — when it hydrates, the original [data-footer-nav] element is
  // replaced with a new one and an observer attached to the original would
  // silently stop firing.
  useEffect(() => {
    const onScroll = () => {
      const footerNav = document.querySelector("[data-footer-nav]");
      if (!footerNav) {
        setHideNav(false);
        return;
      }
      const rect = footerNav.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      setHideNav(visible);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Mobile bottom toolbar: detect when it's overlapping the footer to switch its colours
  useEffect(() => {
    const onScroll = () => {
      const footer = document.querySelector("footer");
      if (!footer) return;
      const footerTop = footer.getBoundingClientRect().top;
      // Toolbar is ~60px tall sitting at the bottom of the viewport.
      setOverFooter(footerTop < window.innerHeight - 60);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
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
        <div className="flex items-center justify-between px-8 lg:px-16">
          <a className="no-underline flex items-center gap-3 group py-5" href="/">
            <BlobLogo size={32} textSize="10px" />
            <span className="text-[10px] tracking-[3px] uppercase transition-opacity duration-300 opacity-0">
              Journal
            </span>
          </a>

          <div className="flex items-center gap-10">
            <NavList
              hoveredHref={hoveredHref}
              navItems={navItems}
              onHover={setHoveredHref}
              onNavigate={handleNavClick}
              pathname={pathname}
              variant="header"
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
          <a className="no-underline" href="/">
            <BlobLogo size={28} textSize="9px" />
          </a>
          <TimeDisplay className="text-[9px]" />
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden transition-colors duration-500">
        <div
          className={`pb-[env(safe-area-inset-bottom)] transition-colors duration-500 ${
            overFooter ? "bg-transparent backdrop-blur-0" : "bg-[#f9f9f7]/95 backdrop-blur-md"
          }`}
        >
          <div className="flex items-center justify-between px-2">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <a
                  key={item.href}
                  className="relative flex-1 flex items-center justify-center py-4 no-underline"
                  href={item.href}
                  onClick={() => handleNavClick(item.href)}
                >
                  {active ? (
                    <motion.div
                      layoutId="mobile-nav"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      className={`absolute top-0 left-4 right-4 h-[2px] transition-colors duration-500 ${
                        overFooter ? "bg-[#f9f9f7]" : "bg-black"
                      }`}
                    />
                  ) : null}
                  <span
                    style={{ fontWeight: active ? 600 : 400 }}
                    className={`text-[10px] tracking-[2px] uppercase transition-colors duration-500 ${
                      // eslint-disable-next-line no-nested-ternary
                      overFooter
                        ? active
                          ? "text-[#f9f9f7]"
                          : "text-[#777777]"
                        : active
                          ? "text-black"
                          : "text-[#c6c6c6]"
                    }`}
                  >
                    {item.label}
                  </span>
                </a>
              );
            })}
            <a
              className="flex-1 flex items-center justify-center py-4 no-underline"
              href={siteConfig.linkedIn}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span
                className={`text-[10px] tracking-[2px] uppercase flex items-center gap-1 transition-colors duration-500 ${
                  overFooter ? "text-[#777777]" : "text-[#c6c6c6]"
                }`}
              >
                Li <ArrowUpRight className="w-2.5 h-2.5" />
              </span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
};
