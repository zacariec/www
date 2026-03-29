/**
 * Patches the siteConfig document with GitHub and X/Twitter URLs.
 *
 * Usage: bun run scripts/patch-social-urls.ts
 */

import { createClient } from "@sanity/client";

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

async function patch() {
  const configId = await client.fetch('*[_type == "siteConfig"][0]._id');
  if (!configId) {
    console.error("No siteConfig document found");
    process.exit(1);
  }

  console.log(`Patching siteConfig (${configId})...`);
  await client
    .patch(configId)
    .set({
      github: "https://github.com/zacariec",
      twitter: "https://x.com/zacariec",
    })
    .commit();

  console.log("Done! GitHub and X/Twitter URLs added to siteConfig.");
}

patch().catch(console.error);
