import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

import { apiVersion, dataset, projectId } from "@/sanity/env";

import type { SanityClient } from "@sanity/client";

export const client = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true,
    })
  : null;

// Build a draft-perspective client on demand. Token must come from the runtime
// (cloudflare:workers env on prod) — import.meta.env inlines at build time and
// .env.local isn't in CI, so a module-level client would be null in prod.
// Stega encodes document/field metadata into string fields so
// @sanity/visual-editing can render click-to-edit overlays in Presentation.
export function createPreviewClient(token: string | undefined): SanityClient | null {
  if (!projectId || !token) return null;
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token,
    perspective: "drafts",
    stega: { enabled: true, studioUrl: "/studio" },
  });
}

const builder = client ? imageUrlBuilder(client) : null;

export function urlFor(source: { asset: { _ref: string } }) {
  if (!builder) throw new Error("Sanity client not configured");
  return builder.image(source);
}
