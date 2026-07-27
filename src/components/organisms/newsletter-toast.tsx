"use client";

/**
 * NewsletterToast
 *
 * Bottom-anchored subscribe prompt for session (blog) pages.
 *
 * Visibility rules:
 *  1. Reader has scrolled past SCROLL_SHOW_FRACTION of the doc — enough that
 *     they're clearly reading, not just skimming the header.
 *  2. Reader is NOT within the last SCROLL_HIDE_FRACTION of the doc — the
 *     footer nav is close, no need to double up on CTAs.
 *  3. The inline subscribe form (element with `data-newsletter-inline`) is NOT
 *     in the viewport — hide the toast when the reader's already looking at
 *     the real thing.
 *  4. Reader hasn't dismissed (X) recently.
 *  5. Reader isn't already subscribed.
 *
 * Motion:
 *  - AnimatePresence handles the reverse-on-exit automatically — flip
 *    `visible` off and it slides + fades back out. Ease-out cubic with a
 *    slight rise-in for a soft pop.
 *  - Respects prefers-reduced-motion (fade only, no translate).
 *
 * Persistence:
 *  - Dismissal via X → 30-day localStorage lock.
 *  - Successful subscribe → 365-day lock + auto-hide.
 *
 * Layout:
 *  - Mobile: full-width sheet above the fixed bottom nav.
 *  - Desktop: floating bottom-right card, max 420px.
 *
 * Composes the existing NewsletterForm (variant="inline") — one source of
 * truth for form logic; styling stays consistent with the inline embed.
 */

import { useEffect, useMemo, useState } from "react";

import { useStore } from "@nanostores/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { NewsletterForm } from "@/components/molecules/newsletter-form";
import { $newsletterStatus } from "@/lib/newsletter/store";

import type { ReactElement } from "react";

import type { NewsletterCopy } from "@/components/molecules/newsletter-form";

const STORAGE_KEY = "zc.newsletter-toast.dismissed-until";
const DISMISS_DAYS = 30;
const SUBSCRIBED_DAYS = 365;
const SCROLL_SHOW_FRACTION = 0.15;
const SCROLL_HIDE_FRACTION = 0.9;
const INLINE_FORM_SELECTOR = "[data-newsletter-inline]";
const INLINE_FORM_HIDE_MARGIN_PX = 120;

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

/**
 * True scroll progress. 0 when the viewport top is at the top of the page,
 * 1 when the viewport bottom is at the bottom. Independent of doc length.
 */
function scrollProgress(): number {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / scrollable));
}

export const NewsletterToast = ({ copy }: NewsletterToastProps): ReactElement => {
  const reduceMotion = useReducedMotion();
  const status = useStore($newsletterStatus);

  const [scrolledPastShow, setScrolledPastShow] = useState(false);
  const [nearBottom, setNearBottom] = useState(false);
  const [inlineVisible, setInlineVisible] = useState(false);
  const [dismissedUntil, setDismissedUntil] = useState<number>(() => readDismissedUntil());

  const dismissed = dismissedUntil > Date.now();
  const subscribed = status === "success" || status === "already";

  // Scroll bookkeeping — tracks whether the reader is past the "show"
  // threshold and whether they've hit the "hide near bottom" band.
  useEffect(() => {
    const onScroll = (): void => {
      const progress = scrollProgress();
      setScrolledPastShow(progress >= SCROLL_SHOW_FRACTION);
      setNearBottom(progress >= SCROLL_HIDE_FRACTION);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Hide the toast whenever the inline form comes into view. We give it a
  // generous rootMargin so the swap happens before the form is fully visible —
  // avoids the reader briefly seeing both.
  useEffect(() => {
    const observed = document.querySelector(INLINE_FORM_SELECTOR);
    if (observed === null) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry !== undefined) setInlineVisible(entry.isIntersecting);
      },
      { rootMargin: `0px 0px ${INLINE_FORM_HIDE_MARGIN_PX}px 0px`, threshold: 0 },
    );
    observer.observe(observed);
    return () => observer.disconnect();
  }, []);

  // Auto-close + persist on successful subscribe.
  useEffect(() => {
    if (!subscribed) return;
    writeDismissedUntil(SUBSCRIBED_DAYS);
    setDismissedUntil(readDismissedUntil());
  }, [subscribed]);

  const dismiss = (): void => {
    writeDismissedUntil(DISMISS_DAYS);
    setDismissedUntil(readDismissedUntil());
  };

  const visible = useMemo(
    () => scrolledPastShow && !nearBottom && !inlineVisible && !dismissed && !subscribed,
    [scrolledPastShow, nearBottom, inlineVisible, dismissed, subscribed],
  );

  const slideDistance = reduceMotion === true ? 0 : 32;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.aside
          animate={{ opacity: 1, y: 0, scale: 1 }}
          aria-label="Newsletter subscription"
          // Mobile: above the fixed bottom nav (SiteLayout pads main pb-[64px]).
          // Desktop: floating bottom-right.
          className="fixed inset-x-0 bottom-[72px] z-40 flex justify-center px-3 pointer-events-none sm:inset-x-auto sm:right-6 sm:bottom-6 sm:px-0"
          exit={{ opacity: 0, y: slideDistance, scale: reduceMotion === true ? 1 : 0.98 }}
          initial={{ opacity: 0, y: slideDistance, scale: reduceMotion === true ? 1 : 0.98 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
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
