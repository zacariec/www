import { getAllPostSlugs, getSiteConfig } from "@/lib/sanity/fetch";

import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const config = await getSiteConfig();
  const baseUrl = config.siteUrl || "https://localhost:3000";
  const slugs = await getAllPostSlugs();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    {
      url: `${baseUrl}/timeline`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const blogPages: MetadataRoute.Sitemap = slugs.map((s) => ({
    url: `${baseUrl}/blog/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...blogPages];
}
