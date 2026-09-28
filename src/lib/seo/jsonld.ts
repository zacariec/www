import { sessionOgImage, siteOrigin } from "./og-image";

import type { SanitySessionTape, SanitySiteConfig } from "@/lib/sanity/types";

const personId = (siteUrl: string) => `${siteUrl}/#person`;
const websiteId = (siteUrl: string) => `${siteUrl}/#website`;
const sessionsId = (siteUrl: string) => `${siteUrl}/sessions#blog`;

function person(config: SanitySiteConfig) {
  const siteUrl = siteOrigin(config);
  const sameAs = config.socials.map((social) => social.url);
  return {
    "@type": "Person",
    "@id": personId(siteUrl),
    name: config.author,
    ...(siteUrl && { url: siteUrl }),
    ...(sameAs.length > 0 && { sameAs }),
    jobTitle: "Software Engineer",
  };
}

function website(config: SanitySiteConfig) {
  const siteUrl = siteOrigin(config);
  return {
    "@type": "WebSite",
    "@id": websiteId(siteUrl),
    name: config.siteName,
    description: config.siteDescription,
    ...(siteUrl && { url: siteUrl }),
    inLanguage: "en",
    publisher: { "@id": personId(siteUrl) },
  };
}

// Note: schema.org type stays "Blog" — that's what search engines index.
// The customer-facing name is "Sessions" but the structured-data vocabulary
// is unchanged so SEO semantics carry over cleanly.
function sessionsObj(config: SanitySiteConfig) {
  const siteUrl = siteOrigin(config);
  return {
    "@type": "Blog",
    "@id": sessionsId(siteUrl),
    name: "Sessions",
    description: "Long-form sessions on code, systems, and the patterns behind how things work.",
    ...(siteUrl && { url: `${siteUrl}/sessions` }),
    inLanguage: "en",
    publisher: { "@id": personId(siteUrl) },
    isPartOf: { "@id": websiteId(siteUrl) },
  };
}

function collectionPage(config: SanitySiteConfig, name: string, url: string, description: string) {
  const siteUrl = siteOrigin(config);
  return {
    "@type": "CollectionPage",
    name,
    description,
    url,
    inLanguage: "en",
    isPartOf: { "@id": websiteId(siteUrl) },
    publisher: { "@id": personId(siteUrl) },
  };
}

function breadcrumbs(items: { name: string; url: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// schema.org @type stays "BlogPosting" for SEO semantics even though the
// customer-facing label is "Session Tape".
function sessionTapePosting(session: SanitySessionTape, config: SanitySiteConfig) {
  const siteUrl = siteOrigin(config);
  const url = `${siteUrl}/sessions/${session.slug}`;
  return {
    "@type": "BlogPosting",
    "@id": `${url}#blogposting`,
    headline: session.title,
    description: session.subtitle || session.excerpt,
    image: new URL(sessionOgImage(session).url, siteUrl).href,
    datePublished: session.date,
    dateModified: session.dateModified ?? session.date,
    author: { "@id": personId(siteUrl) },
    publisher: { "@id": personId(siteUrl) },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    inLanguage: "en",
    articleSection: session.kind === "tape" ? "Tape" : "Session",
    isPartOf: { "@id": sessionsId(siteUrl) },
    wordCount: session.wordCount,
    timeRequired: `PT${session.readTime}M`,
  };
}

// ---- public builders ----

export function homeJsonLd(config: SanitySiteConfig) {
  return {
    "@context": "https://schema.org",
    "@graph": [website(config), person(config)],
  };
}

export function sessionsIndexJsonLd(config: SanitySiteConfig) {
  const siteUrl = siteOrigin(config);
  return {
    "@context": "https://schema.org",
    "@graph": [
      sessionsObj(config),
      person(config),
      breadcrumbs([
        { name: "Home", url: siteUrl },
        { name: "Sessions", url: `${siteUrl}/sessions` },
      ]),
    ],
  };
}

export function sessionTapeJsonLd(session: SanitySessionTape, config: SanitySiteConfig) {
  const siteUrl = siteOrigin(config);
  return {
    "@context": "https://schema.org",
    "@graph": [
      sessionTapePosting(session, config),
      person(config),
      breadcrumbs([
        { name: "Home", url: siteUrl },
        { name: "Sessions", url: `${siteUrl}/sessions` },
        { name: session.title, url: `${siteUrl}/sessions/${session.slug}` },
      ]),
    ],
  };
}

export function timelineJsonLd(config: SanitySiteConfig) {
  const siteUrl = siteOrigin(config);
  return {
    "@context": "https://schema.org",
    "@graph": [
      collectionPage(
        config,
        "Timeline",
        `${siteUrl}/timeline`,
        "Sessions and thoughts, in the order they happened.",
      ),
      person(config),
      breadcrumbs([
        { name: "Home", url: siteUrl },
        { name: "Timeline", url: `${siteUrl}/timeline` },
      ]),
    ],
  };
}
