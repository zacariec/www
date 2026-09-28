import { env } from "cloudflare:workers";

import {
  CommentError,
  commentFailure,
  commentsClient,
  json,
  limitMutation,
  requireReader,
  requireSameOrigin,
  requireSession,
  visibleComments,
} from "@/lib/comments/server";
import { commentDocumentIdSchema } from "@/lib/schemas/comment";

import type { APIRoute } from "astro";

export const prerender = false;

interface LikeTarget {
  _rev: string;
  session: string;
  likes: number;
  likedBy: string[] | null;
}

export const POST: APIRoute = async ({ request, params }) => {
  try {
    requireSameOrigin(request, env);
    const reader = await requireReader(request, env);
    await limitMutation(request, env, reader, "like");
    const parsed = commentDocumentIdSchema.safeParse(params.id);
    if (!parsed.success) throw new CommentError(400, "Invalid comment ID.");
    const client = commentsClient(env);
    const id = parsed.data;
    // Each revision-guarded attempt must finish before fetching the next revision.
    /* eslint-disable no-await-in-loop */
    for (let attempt = 0; attempt < 5; attempt++) {
      const target = await client.fetch<LikeTarget | null>(
        `*[_type == "comment" && _id == $id][0]{_rev, "session": session._ref, "likes": coalesce(likes, 0), likedBy}`,
        { id },
      );
      if (!target) throw new CommentError(404, "Comment not found.");
      const { _rev: revision } = target;
      await requireSession(client, target.session);
      const visible = await visibleComments(client, target.session, reader.key);
      if (!visible.some((comment) => comment._id === id))
        throw new CommentError(404, "Comment not found.");
      if (target.likedBy?.includes(reader.key)) return json({ likes: target.likes, liked: true });
      try {
        // The membership check and increment share a revision guard. Duplicate requests
        // cannot count twice, and concurrent readers cannot overwrite one another.
        const updated = await client
          .patch(id)
          .ifRevisionId(revision)
          .setIfMissing({ likes: 0, likedBy: [] })
          .append("likedBy", [reader.key])
          .inc({ likes: 1 })
          .commit();
        return json({ likes: updated.likes, liked: true });
      } catch (error) {
        if (
          !(error && typeof error === "object" && "statusCode" in error && error.statusCode === 409)
        )
          throw error;
      }
    }
    /* eslint-enable no-await-in-loop */
    throw new CommentError(409, "The thread changed. Please try again.");
  } catch (error) {
    return commentFailure(error);
  }
};
