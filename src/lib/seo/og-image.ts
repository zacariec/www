import { formatWritten, sessionId } from "@/lib/session";

import type { SanitySessionTape, SanitySiteConfig } from "@/lib/sanity/types";

export interface OgImage {
  url: string;
  width: 1200;
  height: 630;
  type: "image/png";
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

export function defaultOgImage(config: SanitySiteConfig, latest?: SanitySessionTape): OgImage {
  return generatedOgImage(
    "default",
    `${config.siteName} — "${config.headline.join(" ")}" over a dithered cortex${latest ? `, latest session ${sessionId(latest.number)}` : ""}`,
  );
}

export function sessionOgImage(session: SanitySessionTape): OgImage {
  return generatedOgImage(
    `sessions/${encodeURIComponent(session.slug)}`,
    `${sessionId(session.number)} "${session.title}", ${session.readTime} min read, written ${formatWritten(session.date)}`,
  );
}
