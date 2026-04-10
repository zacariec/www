/**
 * Default newsletter copy. Used as the canonical fallback when the Sanity
 * `siteConfig.newsletter` object (or any individual field) is empty.
 *
 * Imported by:
 *   - `src/components/molecules/newsletter-form.tsx` (React island)
 *   - `src/components/astro/FooterFallback.astro` (SSR static fallback)
 *
 * Keep these in sync by editing this file only.
 */

export interface NewsletterCopy {
  heading?: string;
  description?: string;
  buttonLabel?: string;
  placeholder?: string;
  successMessage?: string;
  alreadySubscribedMessage?: string;
  unsubscribeLabel?: string;
  unsubscribeConfirmedMessage?: string;
  errorMessage?: string;
}

export const DEFAULT_NEWSLETTER_COPY: Required<NewsletterCopy> = {
  heading: "Updates",
  description: "New posts, straight to your inbox. No spam.",
  buttonLabel: "Subscribe",
  placeholder: "you@domain.com",
  successMessage: "Thanks \u2014 you're subscribed.",
  alreadySubscribedMessage: "You're already on the list.",
  unsubscribeLabel: "Unsubscribe",
  unsubscribeConfirmedMessage: "You've been unsubscribed.",
  errorMessage: "Something went wrong. Try again?",
};

/**
 * Merge a (possibly partial / undefined-laden) copy object onto the defaults.
 * Filters out undefined values so they don't overwrite defaults — this is the
 * gotcha with plain object spread.
 */
export function withNewsletterDefaults(copy?: NewsletterCopy): Required<NewsletterCopy> {
  if (!copy) return { ...DEFAULT_NEWSLETTER_COPY };
  const filtered = Object.fromEntries(
    Object.entries(copy).filter(([, v]) => v !== undefined && v !== ""),
  );
  return { ...DEFAULT_NEWSLETTER_COPY, ...filtered } as Required<NewsletterCopy>;
}
