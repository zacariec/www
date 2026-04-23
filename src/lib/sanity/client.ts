import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

import { apiVersion, dataset, projectId } from "@/sanity/env";

export const client = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true,
    })
  : null;

// Draft-perspective client used by /preview/* routes. Requires a Viewer-level
// SANITY_API_TOKEN; stega encodes document/field metadata into string fields so
// @sanity/visual-editing can render click-to-edit overlays in Presentation.
const previewToken = import.meta.env.SANITY_API_TOKEN;

export const previewClient =
  projectId && previewToken
    ? createClient({
        projectId,
        dataset,
        apiVersion,
        useCdn: false,
        token: previewToken,
        perspective: "drafts",
        stega: { enabled: true, studioUrl: "/studio" },
      })
    : null;

const builder = client ? imageUrlBuilder(client) : null;

export function urlFor(source: { asset: { _ref: string } }) {
  if (!builder) throw new Error("Sanity client not configured");
  return builder.image(source);
}
