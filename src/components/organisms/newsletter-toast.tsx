"use client";

/**
 * NewsletterToast
 *
 * Bottom-anchored subscribe prompt for session (blog) pages.
 *
 * Behavior:
 *  - Shows after the reader has spent DISPLAY_DELAY_MS on the page, or once
 *    they've scrolled past SCROLL_TRIGGER_FRACTION of the document — whichever
 *    fires first. Prevents pouncing on first paint.
 *  - Dismissal (X) persists to localStorage for DISMISS_DAYS days.
 *  - Successful subscription auto-hides the toast and persists that state
 *    for a year — no more prompting a subscribed reader.
 *  - Respects prefers-reduced-motion (no slide, just fade).
 *
 * Mobile: full-width sheet flush with the viewport bottom.
 * Desktop: floating card, bottom-right, max 400px wide.
 *
 * Composes the existing NewsletterForm (variant="inline") — one source of
 * truth for form logic, styling stays consistent with the inline embed.
 */

import { useEffect, useState } from "react";

import { useStore } from "@nanostores/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { NewsletterForm } from "@/components/molecules/newsletter-form";
import { $newsletterStatus } from "@/lib/newsletter/store";

import type { ReactElement } from "react";

import type { NewsletterCopy } from "@/components/molecules/newsletter-form";

const STORAGE_KEY = "zc.newsletter-toast.dismissed-until";
const DISMISS_DAYS = 30;
const SUBSCRIBED_DAYS = 365;
const DISPLAY_DELAY_MS = 20_000;
const SCROLL_TRIGGER_FRACTION = 0.3;

interface NewsletterToastProps {
  readonly copy?: NewsletterCopy;
}

function readDismissedUntil(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function writeDismissedUntil(days: number): void {
  if (typeof window === "undefined") return;
  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  window.localStorage.setItem(STORAGE_KEY, String(until));
}

function scrolledPast(fraction: number): boolean {
  const scrolled = window.scrollY + window.innerHeight;
  const total = document.documentElement.scrollHeight;
  if (total <= 0) return false;
  return scrolled / total >= fraction;
}

export const NewsletterToast = ({ copy }: NewsletterToastProps): ReactElement => {
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();
  const status = useStore($newsletterStatus);

  // Gate: reveal after delay or scroll, unless dismissed / already subscribed.
  useEffect(() => {
    if (readDismissedUntil() > Date.now()) return;
    if (status === "success" || status === "already") return;

    let done = false;

    const reveal = (): void => {
      if (done) return;
      done = true;
      setVisible(true);
    };

    const timeoutHandle = setTimeout(reveal, DISPLAY_DELAY_MS);

    const onScroll = (): void => {
      if (scrolledPast(SCROLL_TRIGGER_FRACTION)) {
        reveal();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      clearTimeout(timeoutHandle);
      window.removeEventListener("scroll", onScroll);
    };
  }, [status]);

  // Auto-close + persist on successful subscribe.
  useEffect(() => {
    if (status !== "success" && status !== "already") return;
    writeDismissedUntil(SUBSCRIBED_DAYS);
    const handle = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(handle);
  }, [status]);

  const dismiss = (): void => {
    writeDismissedUntil(DISMISS_DAYS);
    setVisible(false);
  };

  const slideDistance = reduceMotion === true ? 0 : 24;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.aside
          animate={{ opacity: 1, y: 0 }}
          aria-label="Newsletter subscription"
          // Mobile: sits above the fixed bottom nav (SiteLayout adds pb-[64px]
          // to <main>, so the nav owns the bottom 64px). Desktop: floats bottom-right.
          className="fixed inset-x-0 bottom-[72px] z-40 flex justify-center px-3 pointer-events-none sm:inset-x-auto sm:right-6 sm:bottom-6 sm:px-0"
          exit={{ opacity: 0, y: slideDistance }}
          initial={{ opacity: 0, y: slideDistance }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="pointer-events-auto w-full max-w-[420px] bg-[#ffffff] border border-[rgba(0,0,0,0.06)] shadow-[0_20px_48px_-12px_rgba(0,0,0,0.18)]">
            <div className="relative p-6 sm:p-7">
              <button
                aria-label="Dismiss subscription prompt"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-[#c6c6c6] transition-colors duration-200 hover:text-[#1a1c1b] focus:outline-none focus-visible:text-[#1a1c1b]"
                onClick={dismiss}
                type="button"
              >
                <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 14 14" width="14">
                  <path
                    d="M1 1L13 13M13 1L1 13"
                    stroke="currentColor"
                    strokeLinecap="square"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
              <NewsletterForm copy={copy} variant="inline" />
            </div>
          </div>
        </motion.aside>
      ) : undefined}
    </AnimatePresence>
  );
};
