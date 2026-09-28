import { env } from "cloudflare:workers";

import { OWNED_COMMENTS } from "@/lib/comments/preferences";
import { commentFailure, commentsClient, requireReader } from "@/lib/comments/server";

import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const reader = await requireReader(request, env);
    const comments = await commentsClient(env).fetch<
      {
        id: string;
        sessionId: string;
        sessionSlug: string | null;
        sessionTitle: string | null;
        parentId: string | null;
        anchorIndex: number | null;
        body: string;
        status: string;
        createdAt: string;
        updatedAt: string;
      }[]
    >(
      `*[${OWNED_COMMENTS}] | order(createdAt asc, _id asc) {
      "id": _id, "sessionId": session._ref, "sessionSlug": session->slug.current,
      "sessionTitle": session->title, "parentId": coalesce(parent._ref, null),
      "anchorIndex": coalesce(anchorIndex, null), body, status, createdAt, "updatedAt": _updatedAt
    }`,
      { readerKey: reader.key },
    );
    const { origin } = new URL(env.SITE_URL ?? request.url);
    return Response.json(
      {
        exportedAt: new Date().toISOString(),
        comments: comments.map(({ sessionSlug, ...comment }) => ({
          ...comment,
          sessionUrl: sessionSlug ? `${origin}/sessions/${encodeURIComponent(sessionSlug)}` : null,
          commentUrl: sessionSlug
            ? `${origin}/sessions/${encodeURIComponent(sessionSlug)}#comment-${encodeURIComponent(comment.id)}`
            : null,
        })),
      },
      {
        headers: {
          "Content-Disposition": 'attachment; filename="zcarr-comments.json"',
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          Vary: "Cookie",
        },
      },
    );
  } catch (error) {
    return commentFailure(error);
  }
};
