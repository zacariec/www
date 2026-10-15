import { postId } from "@/lib/post";
import { urlFor } from "@/lib/sanity/client";
import { formatWritten, sessionId } from "@/lib/session";

import type {
  SanityPost,
  SanityRoll,
  SanitySessionTape,
  SanitySiteConfig,
} from "@/lib/sanity/types";

export interface OgImage {
  url: string;
  width: number;
  height: number;
  type: string;
  alt: string;
}

type OgRoute = "default" | "sessions" | "timeline" | "404" | `sessions/${string}`;

export function siteOrigin(config: SanitySiteConfig): string {
  return config.siteUrl ? new URL(config.siteUrl).origin : "https://zcarr.dev";
}

/** Generated assets are canonical: reader tone query parameters never enter their URLs. */
export function generatedOgImage(route: OgRoute, alt: string): OgImage {
  return { url: `/og/${route}.png`, width: 1200, height: 630, type: "image/png", alt };
}

export function defaultOgImage(config: SanitySiteConfig, latest?: SanityPost): OgImage {
  return generatedOgImage(
    "default",
    `${config.siteName} — "${config.headline.join(" ")}" over a dithered cortex${latest ? `, latest ${latest.kind} ${postId(latest)}` : ""}`,
  );
}

export function sessionOgImage(session: SanitySessionTape): OgImage {
  return generatedOgImage(
    `sessions/${encodeURIComponent(session.slug)}`,
    `${sessionId(session.number)} "${session.title}", ${session.readTime} min read, written ${formatWritten(session.date)}`,
  );
}

export function rollOgImage(roll: SanityRoll): OgImage | undefined {
  const frame = roll.groups[0]?.frames[0];
  const image = roll.seo?.image ?? frame?.image;
  if (!image) return undefined;
  return {
    url: urlFor(image).width(1200).height(630).fit("crop").format("jpg").url(),
    width: 1200,
    height: 630,
    type: "image/jpeg",
    alt: roll.seo?.image ? roll.title : frame?.alt || roll.title,
  };
}
