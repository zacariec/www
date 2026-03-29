import { navItems as fallbackNavItems, siteConfig as fallbackSiteConfig } from "@/lib/constants";
import { blogPosts, timelineEntries } from "@/lib/fallback-data";

import { client } from "./client";
import {
  allPostSlugsQuery,
  allPostsQuery,
  allTimelineEntriesQuery,
  latestPostsQuery,
  latestTimelineQuery,
  postBySlugQuery,
  siteConfigQuery,
} from "./queries";

import type { SanityBlogPost, SanitySiteConfig, SanityTimelineEntry } from "./types";

export async function getAllPosts(): Promise<SanityBlogPost[]> {
  if (!client) return blogPosts as unknown as SanityBlogPost[];
  return client.fetch(allPostsQuery);
}

export async function getPostBySlug(slug: string): Promise<SanityBlogPost | null> {
  if (!client) {
    const post = blogPosts.find((p) => p.slug === slug);
    return (post as unknown as SanityBlogPost) ?? null;
  }
  return client.fetch(postBySlugQuery, { slug });
}

export async function getAllTimelineEntries(): Promise<SanityTimelineEntry[]> {
  if (!client) return timelineEntries as unknown as SanityTimelineEntry[];
  return client.fetch(allTimelineEntriesQuery);
}

export async function getLatestPosts(): Promise<SanityBlogPost[]> {
  if (!client) return blogPosts.slice(0, 3) as unknown as SanityBlogPost[];
  return client.fetch(latestPostsQuery);
}

export async function getLatestTimeline(): Promise<SanityTimelineEntry[]> {
  if (!client) return timelineEntries.slice(0, 4) as unknown as SanityTimelineEntry[];
  return client.fetch(latestTimelineQuery);
}

export async function getAllPostSlugs(): Promise<{ slug: string }[]> {
  if (!client) return blogPosts.map((p) => ({ slug: p.slug }));
  return client.fetch(allPostSlugsQuery);
}

const defaultSiteConfig: SanitySiteConfig = {
  navItems: fallbackNavItems.map((n) => ({ label: n.label, href: n.href })),
  heroSubtitle: "Design \u00b7 Code \u00b7 Noise",
  heroHeading: ["THOUGHTS,", "UNFILTERED."],
  heroDescription: fallbackSiteConfig.description,
  marqueeText: "DESIGN \u00b7 SYSTEMS \u00b7 THOUGHTS \u00b7 CODE \u00b7",
  footerHeading: "Thanks for\nreading.",
  footerSubtitle: "\u2014 End",
  siteName: "zcarr.dev",
  siteDescription:
    "A space for long-form thinking on design, engineering, and the details most people skip.",
  author: fallbackSiteConfig.author,
  linkedIn: fallbackSiteConfig.linkedIn,
  timezone: fallbackSiteConfig.timezone,
};

export async function getSiteConfig(): Promise<SanitySiteConfig> {
  if (!client) return defaultSiteConfig;
  const config = await client.fetch(siteConfigQuery);
  return config ?? defaultSiteConfig;
}
