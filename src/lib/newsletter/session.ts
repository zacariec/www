import { client } from "../sanity/client";
import { sessionByIdQuery } from "../sanity/queries";
import { deriveSession } from "../session";

import type { SessionSource } from "../session";

// A webhook carries identity only: copy and read time always come from the
// current published document, bypassing the CDN immediately after publishing.
export async function getNewsletterSession(id: string) {
  if (!client) throw new Error("Sanity is not configured");
  const source = await client
    .withConfig({ useCdn: false, perspective: "published" })
    .fetch<SessionSource | null>(sessionByIdQuery, { id });
  return source ? deriveSession(source) : null;
}
