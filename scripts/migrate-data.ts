/**
 * One-time migration script to populate Sanity with fallback data.
 *
 * Usage: bun run scripts/migrate-data.ts
 *
 * Requires SANITY_API_TOKEN, NEXT_PUBLIC_SANITY_PROJECT_ID, and
 * NEXT_PUBLIC_SANITY_DATASET to be set in .env.local
 */

import { createClient } from "@sanity/client";

import { blogPosts, timelineEntries } from "../src/lib/fallback-data";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_TOKEN in .env.local");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2026-03-26",
  token,
  useCdn: false,
});

function textToPortableText(paragraphs: string[]) {
  return paragraphs.map((text, i) => ({
    _type: "block",
    _key: `block-${i}`,
    style: "normal",
    markDefs: [],
    children: [
      {
        _type: "span",
        _key: `span-${i}`,
        text,
        marks: [],
      },
    ],
  }));
}

async function migrate() {
  console.log("Starting migration...\n");

  // Check if siteConfig already exists
  const existingConfig = await client.fetch('*[_type == "siteConfig"][0]._id');
  if (!existingConfig) {
    console.log("Creating site configuration...");
    await client.create({
      _type: "siteConfig",
      siteName: "zcarr.dev",
      siteDescription:
        "A space for long-form thinking on design, engineering, and the details most people skip.",
      siteUrl: "https://zcarr.dev",
      author: "ZC",
      linkedIn: "https://www.linkedin.com/in/zacariecarr",
      timezone: "Australia/Sydney",
      navItems: [
        { _type: "object", _key: "nav-index", label: "Index", href: "/" },
        { _type: "object", _key: "nav-writing", label: "Writing", href: "/blog" },
        { _type: "object", _key: "nav-timeline", label: "Timeline", href: "/timeline" },
      ],
      heroSubtitle: "Design \u00b7 Code \u00b7 Noise",
      heroHeading: ["THOUGHTS,", "UNFILTERED."],
      heroDescription:
        "A personal archive of ideas, reflections, and long\u2011form writing on design, technology, and the quiet spaces in between.",
      marqueeText: "DESIGN \u00b7 SYSTEMS \u00b7 THOUGHTS \u00b7 CODE \u00b7",
      footerHeading: "Thanks for\nreading.",
      footerSubtitle: "\u2014 End",
    });
    console.log("  Site config created!\n");
  } else {
    console.log("Site config already exists, skipping.\n");
  }

  // Check if blog posts already exist
  const existingPosts = await client.fetch('count(*[_type == "blogPost"])');
  if (existingPosts === 0) {
    // Migrate blog posts
    for (const post of blogPosts) {
      console.log(`Creating post: ${post.title}`);
      const doc = await client.create({
        _type: "blogPost",
        title: post.title,
        slug: { _type: "slug", current: post.slug },
        subtitle: post.subtitle,
        publishedAt: new Date(post.date).toISOString(),
        readingTime: post.readingTime,
        excerpt: post.excerpt,
        content: textToPortableText(post.content),
      });

      for (const comment of post.comments) {
        console.log(`  Creating comment by ${comment.author}`);
        await client.create({
          _type: "comment",
          post: { _type: "reference", _ref: doc._id },
          author: comment.author,
          publishedAt: new Date(comment.date).toISOString(),
          text: comment.text,
          likes: comment.likes,
        });
      }
    }
  } else {
    console.log(`${existingPosts} blog posts already exist, skipping.\n`);
  }

  // Check if timeline entries already exist
  const existingEntries = await client.fetch('count(*[_type == "timelineEntry"])');
  if (existingEntries === 0) {
    for (const entry of timelineEntries) {
      console.log(`Creating timeline entry: ${entry.text.slice(0, 50)}...`);
      await client.create({
        _type: "timelineEntry",
        text: entry.text,
        publishedAt: new Date(entry.date).toISOString(),
        type: entry.type,
        likes: entry.likes,
        comments: entry.comments,
      });
    }
  } else {
    console.log(`${existingEntries} timeline entries already exist, skipping.\n`);
  }

  console.log("\nMigration complete!");
}

migrate().catch(console.error);
