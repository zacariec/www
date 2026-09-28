import { CommentError, requireSession } from "@/lib/comments/server";

import type { SanityClient } from "@sanity/client";

import type { RuntimeEnv } from "@/lib/auth/auth";

interface ReplyRow {
  _id: string;
  parent: string | null;
  readerId: string | null;
  status: string;
  body: string;
  createdAt: string;
  author: { handle: string; provider: string; providerId: string; isAuthor: boolean };
}

async function deliverReply(env: RuntimeEnv, reply: ReplyRow, parent: ReplyRow, slug: string) {
  if (
    !parent.readerId ||
    reply.readerId === parent.readerId ||
    (reply.author.provider === parent.author.provider &&
      reply.author.providerId === parent.author.providerId) ||
    (reply.author.isAuthor && parent.author.isAuthor)
  )
    return "skipped";
  const recipient = await env.DB.prepare(
    `SELECT u.email, p.notification_enabled_at
    FROM reader_preferences p JOIN user u ON u.id = p.user_id
    WHERE p.reader_key = ? AND p.reply_notifications = 1 AND u.emailVerified = 1`,
  )
    .bind(parent.readerId)
    .first<{ email: string; notification_enabled_at: number }>();
  // Turning notifications on must not mail the reader a backlog of old comments.
  if (
    !recipient ||
    !Number.isFinite(Date.parse(reply.createdAt)) ||
    Date.parse(reply.createdAt) < recipient.notification_enabled_at
  )
    return "skipped";
  if (!env.RESEND_API_KEY) throw new CommentError(503, "Reply email delivery is not configured.");
  const now = Date.now();
  const site = new URL(env.SITE_URL ?? "https://zcarr.dev").origin;
  const payload = JSON.stringify({
    from: env.RESEND_FROM_EMAIL ?? "ZC <signal@mail.zcarr.dev>",
    to: recipient.email,
    subject: `${reply.author.handle} replied to your comment on ${slug}`,
    text: `${reply.author.handle} replied to your comment:\n\n${reply.body}\n\nRead the conversation: ${site}/sessions/${encodeURIComponent(slug)}#comment-${encodeURIComponent(reply._id)}\n\nYou opted in to reply notifications. Change this setting: ${site}/preferences`,
  });
  const existing = await env.DB.prepare(
    `SELECT state, first_attempt_at, lease_until, payload
    FROM comment_reply_delivery WHERE comment_id = ?`,
  )
    .bind(reply._id)
    .first<{ state: string; first_attempt_at: number; lease_until: number; payload: string }>();
  if (existing?.state === "sent") return "duplicate";
  // Resend idempotency expires after 24h. Never risk a duplicate after an ambiguous
  // delivery crosses that boundary; return an actionable failure for operator review.
  if (existing && now - existing.first_attempt_at >= 23 * 60 * 60 * 1000) {
    throw new CommentError(
      503,
      "Reply delivery needs review: provider idempotency window expired.",
    );
  }
  if (existing && existing.lease_until > now)
    throw new CommentError(503, "Reply delivery is already in progress.");
  // Do not replay an old recipient or content after an account/email/comment change.
  if (existing && existing.payload !== payload) {
    throw new CommentError(
      503,
      "Reply delivery needs review: recipient or approved content changed.",
    );
  }
  const lease = existing
    ? await env.DB.prepare(
        `UPDATE comment_reply_delivery SET state = 'sending', lease_until = ?
        WHERE comment_id = ? AND state != 'sent' AND lease_until <= ?`,
      )
        .bind(now + 60_000, reply._id, now)
        .run()
    : await env.DB.prepare(
        `INSERT OR IGNORE INTO comment_reply_delivery
        (comment_id, recipient_key, payload, state, first_attempt_at, lease_until)
        VALUES (?, ?, ?, 'sending', ?, ?)`,
      )
        .bind(reply._id, parent.readerId, payload, now, now + 60_000)
        .run();
  if (lease.meta.changes !== 1)
    throw new CommentError(503, "Reply delivery is already in progress.");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `comment-reply/${reply._id}`,
      },
      body: payload,
      signal: AbortSignal.timeout(20_000),
    });
    const result: unknown = await response.json();
    if (
      !response.ok ||
      !result ||
      typeof result !== "object" ||
      !("id" in result) ||
      typeof result.id !== "string"
    ) {
      throw new CommentError(503, `Reply email provider rejected delivery (${response.status}).`);
    }
    await env.DB.prepare(
      `UPDATE comment_reply_delivery SET state = 'sent', provider_id = ?, sent_at = ?, lease_until = 0
      WHERE comment_id = ?`,
    )
      .bind(result.id, Date.now(), reply._id)
      .run();
    return "sent";
  } catch (error) {
    await env.DB.prepare(
      `UPDATE comment_reply_delivery SET state = 'failed', lease_until = 0
      WHERE comment_id = ? AND state != 'sent'`,
    )
      .bind(reply._id)
      .run();
    throw error;
  }
}

export async function notifyApprovedReplies(
  client: SanityClient,
  env: RuntimeEnv,
  commentId: string,
) {
  const trigger = await client.fetch<{ session: string; status: string } | null>(
    `*[_type == "comment" && _id == $id][0]{"session": session._ref, status}`,
    { id: commentId },
  );
  if (trigger?.status !== "approved") return { sent: 0, skipped: 1, duplicate: 0 };
  const session = await requireSession(client, trigger.session);
  const rows = await client.fetch<ReplyRow[]>(
    `*[_type == "comment" && session._ref == $session &&
    !(_id in path("drafts.**")) && !(_id in path("versions.**"))] {
    _id, "parent": coalesce(parent._ref, null), readerId, status, body, createdAt,
    author { handle, provider, providerId, isAuthor }
  }`,
    { session: trigger.session },
  );
  const byId = new Map(rows.map((row) => [row._id, row]));
  const result = { sent: 0, skipped: 0, duplicate: 0 };
  for (const reply of rows) {
    if (!reply.parent || reply.status !== "approved") continue;
    let ancestor: ReplyRow | undefined = reply;
    let affected = false;
    const seen = new Set<string>();
    while (ancestor) {
      if (seen.has(ancestor._id) || ancestor.status !== "approved") break;
      seen.add(ancestor._id);
      if (ancestor._id === commentId) affected = true;
      if (!ancestor.parent) break;
      ancestor = byId.get(ancestor.parent);
    }
    // Missing, hidden, pending or cyclic ancestors make the reply non-public.
    if (!affected || !ancestor || ancestor.parent || ancestor.status !== "approved") continue;
    const parent = byId.get(reply.parent);
    if (!parent) continue;
    // eslint-disable-next-line no-await-in-loop -- Persist each provider delivery before proceeding; webhook retries resume with deduplication.
    result[await deliverReply(env, reply, parent, session.slug)]++;
  }
  return result;
}
