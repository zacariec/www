import { env, waitUntil } from "cloudflare:workers";

import {
  CommentError,
  commentFailure,
  commentsClient,
  getReader,
  json,
  limitMutation,
  requestJson,
  requireReader,
  requireSameOrigin,
  requireSession,
  threadPayload,
  visibleComments,
} from "@/lib/comments/server";
import { commentDocumentIdSchema, commentRequestSchema } from "@/lib/schemas/comment";

import type { APIRoute } from "astro";

import type { SanityComment } from "@/lib/sanity/types";

export const prerender = false;

async function notifyNewComment(comment: SanityComment, slug: string) {
  if (!env.RESEND_API_KEY) return;
  const siteUrl = (env.SITE_URL ?? "https://zcarr.dev").replace(/\/$/, "");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL ?? "ZC <signal@mail.zcarr.dev>",
        to: "signal@zcarr.dev",
        subject: `${comment.parent ? "Reply" : "New comment"} from ${comment.author.handle} on ${slug}`,
        text: `${comment.author.handle} commented on ${siteUrl}/sessions/${slug}#thread:\n\n${comment.body}\n\nStatus: ${comment.status}`,
      }),
    });
    if (!response.ok) console.error("[comment-notify] delivery failed:", response.status);
  } catch {
    console.error("[comment-notify] delivery unavailable");
  }
}

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const parsed = commentDocumentIdSchema.safeParse(url.searchParams.get("session"));
    if (!parsed.success) throw new CommentError(400, "A valid published session ID is required.");
    const client = commentsClient(env);
    await requireSession(client, parsed.data);
    const reader = await getReader(request, env);
    return json(await threadPayload(client, parsed.data, reader, env));
  } catch (error) {
    return commentFailure(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    requireSameOrigin(request, env);
    const reader = await requireReader(request, env);
    await limitMutation(request, env, reader, "post");
    const parsed = commentRequestSchema.safeParse(await requestJson(request));
    if (!parsed.success)
      throw new CommentError(400, parsed.error.issues[0]?.message ?? "Invalid comment.");
    const input = parsed.data;
    const client = commentsClient(env);
    const session = await requireSession(client, input.session);
    if (input.anchorIndex !== null && input.anchorIndex > session.paragraphCount) {
      throw new CommentError(400, "That paragraph does not exist in this session.");
    }
    if (input.parent) {
      const comments = await visibleComments(client, input.session, reader.key);
      const parent = comments.find((comment) => comment._id === input.parent);
      if (!parent) throw new CommentError(400, "That reply is not available in this session.");
      if (parent.anchorIndex !== input.anchorIndex)
        throw new CommentError(400, "Replies must use their parent's paragraph anchor.");
    }
    const moderation = await client.fetch<string | null>(
      `*[_type == "siteConfig"][0].moderationDefault`,
    );
    const comment: SanityComment = {
      _id: crypto.randomUUID(),
      session: session._id,
      anchorIndex: input.anchorIndex,
      parent: input.parent,
      body: input.body,
      author: reader.author,
      status: moderation === "pending" ? "pending" : "approved",
      likes: 0,
      createdAt: new Date().toISOString(),
    };
    // Text is stored literally and rendered as escaped text, never HTML/Portable Text.
    await client.create({
      ...comment,
      _type: "comment",
      session: { _type: "reference", _ref: comment.session },
      parent: comment.parent ? { _type: "reference", _ref: comment.parent } : null,
      readerId: reader.key,
      likedBy: [],
    });
    waitUntil(notifyNewComment(comment, session.slug));
    // Explicit public contract, not the raw Sanity document (which includes private fields).
    return json({ comment }, 201);
  } catch (error) {
    return commentFailure(error);
  }
};
