import type { PortableTextBlock } from "@portabletext/react";

export interface SanityBlogPost {
  title: string;
  slug: string;
  subtitle: string;
  date: string;
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

export interface SanitySiteConfig {
  navItems: { label: string; href: string }[];
  heroSubtitle: string;
  heroHeading: string[];
  heroDescription: string;
  heroImage?: { url: string; alt?: string; caption?: string };
  marqueeText: string;
  footerHeading: string;
  footerSubtitle: string;
  siteName: string;
  siteDescription: string;
  siteUrl?: string;
  ogImage?: { url: string; alt?: string };
  author: string;
  linkedIn?: string;
  github?: string;
  twitter?: string;
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
