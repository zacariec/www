import { env } from "cloudflare:workers";

import { navItems, siteConfig } from "@/lib/constants";
import { sessionTapes, timelineEntries } from "@/lib/fallback-data";
import { canonicalSessionId, deriveSession, deriveSessions } from "@/lib/session";

import { client, createPreviewClient } from "./client";
import {
  allSessionSlugsQuery,
  allSessionsPreviewQuery,
  allSessionsQuery,
  allTimelineEntriesPreviewQuery,
  allTimelineEntriesQuery,
  latestSessionsQuery,
  latestTimelineQuery,
  sessionBySlugPreviewQuery,
  sessionBySlugQuery,
  sessionChronologyQuery,
  siteConfigQuery,
} from "./queries";

import type { SessionSource } from "@/lib/session";

import type { SanitySessionTape, SanitySiteConfig, SanityTimelineEntry } from "./types";

interface FetchOptions {
  preview?: boolean;
}

function derivePreviewSessions(
  sources: SessionSource[],
  published: SessionSource[],
): SanitySessionTape[] {
  // Use published dates to hold the number steady while a draft's date changes.
  return deriveSessions([
    ...published,
    ...sources.map((source) => ({ ...source, _id: `drafts.${canonicalSessionId(source._id)}` })),
  ]).slice(published.length);
}

export async function getAllSessions(opts: FetchOptions = {}): Promise<SanitySessionTape[]> {
  if (!client) return sessionTapes;
  const preview = opts.preview ? createPreviewClient(env.SANITY_API_TOKEN) : null;
  if (preview) {
    const [sources, chronology] = await Promise.all([
      preview.fetch<SessionSource[]>(allSessionsPreviewQuery),
      client.fetch<SessionSource[]>(sessionChronologyQuery),
    ]);
    return derivePreviewSessions(sources, chronology);
  }
  return (await client.fetch<SessionSource[]>(allSessionsQuery)).map((session) =>
    deriveSession(session),
  );
}

export async function getSessionBySlug(
  slug: string,
  opts: FetchOptions = {},
): Promise<SanitySessionTape | null> {
  if (!client) return sessionTapes.find((session) => session.slug === slug) ?? null;
  const preview = opts.preview ? createPreviewClient(env.SANITY_API_TOKEN) : null;
  if (preview) {
    const [source, chronology] = await Promise.all([
      preview.fetch<SessionSource | null>(sessionBySlugPreviewQuery, { slug }),
      client.fetch<SessionSource[]>(sessionChronologyQuery),
    ]);
    return source ? derivePreviewSessions([source], chronology)[0] : null;
  }
  const source = await client.fetch<SessionSource | null>(sessionBySlugQuery, { slug });
  return source ? deriveSession(source) : null;
}

export async function getAllTimelineEntries(
  opts: FetchOptions = {},
): Promise<SanityTimelineEntry[]> {
  if (!client) return timelineEntries;
  const preview = opts.preview ? createPreviewClient(env.SANITY_API_TOKEN) : null;
  return (preview ?? client).fetch<SanityTimelineEntry[]>(
    preview ? allTimelineEntriesPreviewQuery : allTimelineEntriesQuery,
  );
}

export async function getLatestSessions(opts: FetchOptions = {}): Promise<SanitySessionTape[]> {
  if (opts.preview) return (await getAllSessions(opts)).slice(0, 3);
  if (!client) return sessionTapes.slice(0, 3);
  return (await client.fetch<SessionSource[]>(latestSessionsQuery)).map((session) =>
    deriveSession(session),
  );
}

export async function getLatestTimeline(opts: FetchOptions = {}): Promise<SanityTimelineEntry[]> {
  if (opts.preview)
    return (await getAllTimelineEntries(opts))
      .filter((entry) => entry.board?.visible)
      .sort((a, b) => (a.board?.z ?? 0) - (b.board?.z ?? 0))
      .slice(0, 4);
  return client
    ? client.fetch<SanityTimelineEntry[]>(latestTimelineQuery)
    : timelineEntries.filter((entry) => entry.board?.visible).slice(0, 4);
}

export async function getAllSessionSlugs(): Promise<{ slug: string }[]> {
  return client
    ? client.fetch<{ slug: string }[]>(allSessionSlugsQuery)
    : sessionTapes.map(({ slug }) => ({ slug }));
}

const defaultSiteConfig: SanitySiteConfig = {
  navItems: navItems.map((item) => ({ ...item })),
  headline: [...siteConfig.headline],
  readme: siteConfig.readme,
  tickerEnabled: true,
  socials: siteConfig.socials.map((social) => ({ ...social })),
  toneShift: 1,
  displayVersion: "0.26",
  moderationDefault: "approved",
  siteName: siteConfig.name,
  siteDescription: siteConfig.description,
  siteUrl: "https://zcarr.dev",
  author: siteConfig.author,
  timezone: siteConfig.timezone,
};

export async function getSiteConfig(opts: FetchOptions = {}): Promise<SanitySiteConfig> {
  if (!client) return defaultSiteConfig;
  const preview = opts.preview ? createPreviewClient(env.SANITY_API_TOKEN) : null;
  const stored = await (preview ?? client).fetch<Partial<SanitySiteConfig> | null>(siteConfigQuery);
  if (!stored) return defaultSiteConfig;
  // GROQ emits null for missing fields; null must not erase usable defaults.
  const config = {
    ...defaultSiteConfig,
    ...Object.fromEntries(Object.entries(stored).filter(([, value]) => value != null)),
  } as SanitySiteConfig;
  if (!config.twitterHandle) {
    config.twitterHandle = config.socials
      .find((social) => /^(https?:\/\/)?(www\.)?(x|twitter)\.com\//i.test(social.url))
      ?.url.split("/")
      .filter(Boolean)
      .at(-1)
      ?.replace(/^/, "@");
  }
  return config;
}
