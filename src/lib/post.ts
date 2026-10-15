import { rollId } from "./roll";
import { canonicalSessionId, sessionId } from "./session";

import type { SanityPost } from "./sanity/types";

export function postHref(post: SanityPost): string {
  return `/${post.kind === "roll" ? "rolls" : "sessions"}/${post.slug}`;
}

export function postId(post: SanityPost): string {
  return post.kind === "roll" ? rollId(post.number) : sessionId(post.number);
}

export function postNeighbors(
  current: SanityPost,
  posts: readonly SanityPost[],
): { previous?: SanityPost; next?: SanityPost } {
  const ordered = posts
    .filter((post) => post.slug)
    .toSorted(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        canonicalSessionId(a._id).localeCompare(canonicalSessionId(b._id)),
    );
  const index = ordered.findIndex(
    (post) => canonicalSessionId(post._id) === canonicalSessionId(current._id),
  );
  return index < 0 ? {} : { previous: ordered[index - 1], next: ordered[index + 1] };
}
