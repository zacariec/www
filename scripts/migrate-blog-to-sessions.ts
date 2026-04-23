/**
 * One-shot migration: blogPost → sessionTape.
 *
 * Why this exists
 * ---------------
 * Sanity treats `_type` as immutable on a document — you cannot patch a
 * document's type. To rename the content model from `blogPost` to
 * `sessionTape` in an existing dataset we have to:
 *
 *   1. Copy each `blogPost` into a new `sessionTape` doc (new _id)
 *   2. Rewrite every `comment.post` reference to point at the new _id
 *   3. Delete the original `blogPost` docs
 *
 * The script is idempotent: running it a second time finds no `blogPost`
 * docs and exits cleanly.
 *
 * Usage
 * -----
 *   bun run scripts/migrate-blog-to-sessions.ts           # dry-run
 *   bun run scripts/migrate-blog-to-sessions.ts --apply   # execute
 *
 * Always take a dataset export before running with --apply:
 *   sanity dataset export production pre-migration.tar.gz
 */

import { createClient, type SanityClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_TOKEN in .env.local");
  process.exit(1);
}

const apply = process.argv.includes("--apply");

const client: SanityClient = createClient({
  projectId,
  dataset,
  apiVersion: "2026-03-26",
  token,
  useCdn: false,
});

interface BlogPostDoc {
  _id: string;
  _type: "blogPost";
  _createdAt?: string;
  _updatedAt?: string;
  _rev?: string;
  [key: string]: unknown;
}

interface CommentRef {
  _id: string;
  post?: { _ref: string };
}

function stripSystemFields<T extends BlogPostDoc>(doc: T): Record<string, unknown> {
  const { _id, _type, _createdAt, _updatedAt, _rev, ...rest } = doc;
  // Keep these referenced to satisfy TS noUnusedLocals; we're intentionally
  // dropping them from the copy so Sanity assigns fresh values.
  void _id;
  void _type;
  void _createdAt;
  void _updatedAt;
  void _rev;
  return rest;
}

async function main(): Promise<void> {
  const posts = await client.fetch<BlogPostDoc[]>('*[_type == "blogPost"]');
  if (posts.length === 0) {
    console.log("No blogPost documents found — nothing to migrate.");
    return;
  }

  console.log(`Found ${posts.length} blogPost document(s) to migrate.`);
  if (!apply) {
    console.log("\nDRY RUN — pass --apply to execute.\n");
    for (const post of posts) {
      console.log(`  - ${post._id}  "${String(post.title ?? "(untitled)")}"`);
    }
    return;
  }

  const tx = client.transaction();
  const oldToNew = new Map<string, string>();

  // 1. Create sessionTape copies
  for (const post of posts) {
    const newId = `sessionTape-${post._id.replace(/^drafts\./, "").replace(/^[^.]+\./, "")}`;
    oldToNew.set(post._id, newId);
    tx.createIfNotExists({
      _id: newId,
      _type: "sessionTape",
      ...stripSystemFields(post),
    });
  }

  // 2. Repoint every comment.post reference
  const comments = await client.fetch<CommentRef[]>(
    '*[_type == "comment" && defined(post._ref) && post._ref in $ids]{ _id, post }',
    { ids: Array.from(oldToNew.keys()) },
  );
  for (const comment of comments) {
    const newRef = oldToNew.get(comment.post?._ref ?? "");
    if (!newRef) continue;
    tx.patch(comment._id, (patch) =>
      patch.set({ post: { _type: "reference", _ref: newRef } }),
    );
  }

  // 3. Delete original blogPost documents
  for (const post of posts) {
    tx.delete(post._id);
  }

  console.log(
    `\nApplying transaction: ${posts.length} create, ${comments.length} patch, ${posts.length} delete...`,
  );
  await tx.commit();
  console.log("Done.");
}

main().catch((err: unknown) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
