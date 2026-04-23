import type { PortableTextBlock } from "@portabletext/react";

export interface SanitySessionTape {
  title: string;
  slug: string;
  subtitle: string;
  date: string;
  dateModified?: string;
  readingTime: string;
  excerpt: string;
  content: PortableTextBlock[];
  sideNote?: string;
  featuredImage?: {
    asset: { _ref: string };
    url?: string;
    alt?: string;
  };
  comments: SanityComment[];
  commentCount?: number;
}

export interface SanityComment {
  _id: string;
  author: string;
  authorImage?: string;
  date: string;
  text: string;
  likes: number;
  parentCommentId?: string;
}

export interface SanityNewsletterCopy {
  footerHeading?: string;
  footerDescription?: string;
  inlineHeading?: string;
  inlineDescription?: string;
  buttonLabel?: string;
  placeholder?: string;
  successMessage?: string;
  alreadySubscribedMessage?: string;
  unsubscribeLabel?: string;
  unsubscribeConfirmedMessage?: string;
  errorMessage?: string;
}

export interface SanitySiteConfig {
  navItems: { label: string; href: string }[];
  heroSubtitle: string;
  heroHeading: string[];
  heroDescription: string;
  heroImage?: { url: string; alt?: string; caption?: string };
  marqueeText: string;
  footerHeading: string;
  footerSubtitle: string;
  newsletter?: SanityNewsletterCopy;
  siteName: string;
  siteDescription: string;
  siteUrl?: string;
  ogImage?: { url: string; alt?: string };
  author: string;
  linkedIn?: string;
  github?: string;
  twitter?: string;
  twitterHandle?: string;
  timezone?: string;
}

export interface SanityTimelineEntry {
  _id: string;
  text: string;
  date: string;
  type: "thought" | "linkedin" | "reflection";
  likes: number;
  comments: number;
  url?: string;
}
