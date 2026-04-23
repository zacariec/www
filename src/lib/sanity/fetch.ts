import { navItems as fallbackNavItems, siteConfig as fallbackSiteConfig } from "@/lib/constants";
import { sessionTapes, timelineEntries } from "@/lib/fallback-data";

import { client } from "./client";
import {
  allSessionSlugsQuery,
  allSessionsQuery,
  allTimelineEntriesQuery,
  latestSessionsQuery,
  latestTimelineQuery,
  sessionBySlugQuery,
  siteConfigQuery,
} from "./queries";

import type { SanitySessionTape, SanitySiteConfig, SanityTimelineEntry } from "./types";

function toSanitySession(p: (typeof sessionTapes)[number]): SanitySessionTape {
  return {
    title: p.title,
    slug: p.slug,
    subtitle: p.subtitle,
    date: p.date,
    readingTime: p.readingTime,
    excerpt: p.excerpt,
    content: p.content.map((text, i) => ({
      _type: "block" as const,
      _key: `block-${String(i)}`,
      children: [{ _type: "span" as const, _key: `span-${String(i)}`, text, marks: [] }],
      markDefs: [],
      style: "normal" as const,
    })),
    comments: p.comments.map((c) => ({
      _id: c.id,
      author: c.author,
      date: c.date,
      text: c.text,
      likes: c.likes,
    })),
  };
}

function toSanityTimeline(e: (typeof timelineEntries)[number]): SanityTimelineEntry {
  return {
    _id: e.id,
    text: e.text,
    date: e.date,
    type: e.type,
    likes: e.likes,
    comments: e.comments,
  };
}

export async function getAllSessions(): Promise<SanitySessionTape[]> {
  if (!client) return sessionTapes.map(toSanitySession);
  return client.fetch<SanitySessionTape[]>(allSessionsQuery);
}

export async function getSessionBySlug(slug: string): Promise<SanitySessionTape | null> {
  if (!client) {
    const post = sessionTapes.find((p) => p.slug === slug);
    return post ? toSanitySession(post) : null;
  }
  return client.fetch<SanitySessionTape | null>(sessionBySlugQuery, { slug });
}

export async function getAllTimelineEntries(): Promise<SanityTimelineEntry[]> {
  if (!client) return timelineEntries.map(toSanityTimeline);
  return client.fetch<SanityTimelineEntry[]>(allTimelineEntriesQuery);
}

export async function getLatestSessions(): Promise<SanitySessionTape[]> {
  if (!client) return sessionTapes.slice(0, 3).map(toSanitySession);
  return client.fetch<SanitySessionTape[]>(latestSessionsQuery);
}

export async function getLatestTimeline(): Promise<SanityTimelineEntry[]> {
  if (!client) return timelineEntries.slice(0, 4).map(toSanityTimeline);
  return client.fetch<SanityTimelineEntry[]>(latestTimelineQuery);
}

export async function getAllSessionSlugs(): Promise<{ slug: string }[]> {
  if (!client) return sessionTapes.map((p) => ({ slug: p.slug }));
  return client.fetch<{ slug: string }[]>(allSessionSlugsQuery);
}

const defaultSiteConfig: SanitySiteConfig = {
  navItems: fallbackNavItems.map((n) => ({ label: n.label, href: n.href })),
  heroSubtitle: "Code \u00b7 Systems \u00b7 Noise",
  heroHeading: ["THOUGHTS,", "UNFILTERED."],
  heroDescription: fallbackSiteConfig.description,
  marqueeText: "CODE \u00b7 SYSTEMS \u00b7 TASTE \u00b7 NOISE \u00b7",
  footerHeading: "Thanks for\nreading.",
  footerSubtitle: "\u2014 End",
  siteName: "zcarr.dev",
  siteDescription: "Code, systems, taste, and whatever else is rattling around in my head.",
  author: fallbackSiteConfig.author,
  linkedIn: fallbackSiteConfig.linkedIn,
  timezone: fallbackSiteConfig.timezone,
};

export async function getSiteConfig(): Promise<SanitySiteConfig> {
  if (!client) return defaultSiteConfig;
  const config = await client.fetch<SanitySiteConfig | null>(siteConfigQuery);
  return config ?? defaultSiteConfig;
}
