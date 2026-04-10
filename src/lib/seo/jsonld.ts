import type { SanityBlogPost, SanitySiteConfig } from "@/lib/sanity/types";

const personId = (siteUrl: string) => `${siteUrl}/#person`;
const websiteId = (siteUrl: string) => `${siteUrl}/#website`;
const blogId = (siteUrl: string) => `${siteUrl}/blog#blog`;

function trimSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

function siteUrlOrEmpty(config: SanitySiteConfig): string {
  return config.siteUrl ? trimSlash(config.siteUrl) : "";
}

function person(config: SanitySiteConfig) {
  const siteUrl = siteUrlOrEmpty(config);
  const sameAs = [config.linkedIn, config.github, config.twitter].filter((v): v is string =>
    Boolean(v),
  );
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
  const siteUrl = siteUrlOrEmpty(config);
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

function blogObj(config: SanitySiteConfig) {
  const siteUrl = siteUrlOrEmpty(config);
  return {
    "@type": "Blog",
    "@id": blogId(siteUrl),
    name: "Writing",
    description: "Long-form writing on code, systems, and the patterns behind how things work.",
    ...(siteUrl && { url: `${siteUrl}/blog` }),
    inLanguage: "en",
    publisher: { "@id": personId(siteUrl) },
    isPartOf: { "@id": websiteId(siteUrl) },
  };
}

function collectionPage(config: SanitySiteConfig, name: string, url: string, description: string) {
  const siteUrl = siteUrlOrEmpty(config);
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

interface BlogPostingOpts {
  ogImageUrl?: string;
  wordCount?: number;
}

function blogPosting(post: SanityBlogPost, config: SanitySiteConfig, opts: BlogPostingOpts) {
  const siteUrl = siteUrlOrEmpty(config);
  const url = `${siteUrl}/blog/${post.slug}`;
  return {
    "@type": "BlogPosting",
    "@id": `${url}#blogposting`,
    headline: post.title,
    description: post.subtitle || post.excerpt,
    ...(opts.ogImageUrl && { image: opts.ogImageUrl }),
    datePublished: post.date,
    dateModified: post.dateModified ?? post.date,
    author: { "@id": personId(siteUrl) },
    publisher: { "@id": personId(siteUrl) },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    inLanguage: "en",
    articleSection: "Writing",
    isPartOf: { "@id": blogId(siteUrl) },
    ...(opts.wordCount && opts.wordCount > 0 && { wordCount: opts.wordCount }),
  };
}

// ---- public builders ----

export function homeJsonLd(config: SanitySiteConfig) {
  return {
    "@context": "https://schema.org",
    "@graph": [website(config), person(config)],
  };
}

export function blogIndexJsonLd(config: SanitySiteConfig) {
  const siteUrl = siteUrlOrEmpty(config);
  return {
    "@context": "https://schema.org",
    "@graph": [
      blogObj(config),
      person(config),
      breadcrumbs([
        { name: "Home", url: siteUrl },
        { name: "Writing", url: `${siteUrl}/blog` },
      ]),
    ],
  };
}

export function blogPostJsonLd(
  post: SanityBlogPost,
  config: SanitySiteConfig,
  opts: BlogPostingOpts = {},
) {
  const siteUrl = siteUrlOrEmpty(config);
  return {
    "@context": "https://schema.org",
    "@graph": [
      blogPosting(post, config, opts),
      person(config),
      breadcrumbs([
        { name: "Home", url: siteUrl },
        { name: "Writing", url: `${siteUrl}/blog` },
        { name: post.title, url: `${siteUrl}/blog/${post.slug}` },
      ]),
    ],
  };
}

export function timelineJsonLd(config: SanitySiteConfig) {
  const siteUrl = siteUrlOrEmpty(config);
  return {
    "@context": "https://schema.org",
    "@graph": [
      collectionPage(
        config,
        "Timeline",
        `${siteUrl}/timeline`,
        "Short-form noise. Thoughts, observations, and the things that don't need a whole essay.",
      ),
      person(config),
      breadcrumbs([
        { name: "Home", url: siteUrl },
        { name: "Timeline", url: `${siteUrl}/timeline` },
      ]),
    ],
  };
}
