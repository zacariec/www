import { env } from "cloudflare:workers";
import { z } from "zod";

import { notifyApprovedReplies } from "@/lib/comments/notifications";
import { CommentError, commentFailure, commentsClient, json } from "@/lib/comments/server";
import { verifySanityWebhook } from "@/lib/newsletter/sanity-webhook";
import { commentDocumentIdSchema } from "@/lib/schemas/comment";

import type { APIRoute } from "astro";

export const prerender = false;
const payloadSchema = z.object({ _id: commentDocumentIdSchema }).strict();

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!env.COMMENT_WEBHOOK_SECRET)
      throw new CommentError(503, "Reply notification webhook is not configured.");
    const signature = request.headers.get("sanity-webhook-signature");
    if (!signature) throw new CommentError(401, "Missing webhook signature.");
    if (!request.body) throw new CommentError(400, "Missing webhook body.");
    const stream = request.body.getReader();
    const decoder = new TextDecoder();
    let rawBody = "";
    let size = 0;
    try {
      while (true) {
        // eslint-disable-next-line no-await-in-loop -- Bound the raw signed stream before parsing.
        const chunk = await stream.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 4096) {
          // eslint-disable-next-line no-await-in-loop -- Release the oversized stream immediately.
          await stream.cancel();
          throw new CommentError(413, "Webhook body is too large.");
        }
        rawBody += decoder.decode(chunk.value, { stream: true });
      }
      rawBody += decoder.decode();
    } finally {
      stream.releaseLock();
    }
    const verified = await verifySanityWebhook(signature, rawBody, env.COMMENT_WEBHOOK_SECRET);
    if (!verified.ok) throw new CommentError(401, "Invalid webhook signature.");
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new CommentError(400, "Invalid webhook JSON.");
    }
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) throw new CommentError(400, "Invalid comment webhook payload.");
    return json(await notifyApprovedReplies(commentsClient(env), env, parsed.data._id));
  } catch (error) {
    return commentFailure(error);
  }
};
