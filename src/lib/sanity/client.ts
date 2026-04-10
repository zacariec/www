import imageUrlBuilder from "@sanity/image-url";
import { createClient } from "@sanity/client";

import { apiVersion, dataset, projectId } from "@/sanity/env";

export const client = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true,
    })
  : null;

const builder = client ? imageUrlBuilder(client) : null;

export function urlFor(source: { asset: { _ref: string } }) {
  if (!builder) throw new Error("Sanity client not configured");
  return builder.image(source);
}
