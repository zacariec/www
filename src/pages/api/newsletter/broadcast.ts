/**
 * POST /api/newsletter/broadcast
 *
 * Receives a Sanity webhook fired on `sessionTape` publish and sends a
 * single Resend broadcast to the RESEND_AUDIENCE_ID audience.
 *
 * Sanity webhook configuration (do this in sanity.io/manage → API → Webhooks):
 *   - URL:      https://zcarr.dev/api/newsletter/broadcast
 *   - Trigger:  Create, Update
 *   - Filter:   _type == "sessionTape" && !(_id in path("drafts.**")) && defined(publishedAt)
 *   - Projection:
 *       {
 *         "_id": _id,
 *         "_type": _type,
 *         "slug": slug.current,
 *         "title": title,
 *         "subtitle": subtitle,
 *         "excerpt": excerpt,
 *         "readingTime": readingTime,
 *         "publishedAt": publishedAt
 *       }
 *   - Secret:   generate one, then `wrangler secret put SANITY_WEBHOOK_SECRET`
 *
 * Idempotency: the post slug is a unique key in `broadcast_log`. A second
 * webhook hit for the same slug is a no-op — Sanity re-fires on every edit
 * to a published doc, and we only want one broadcast per post.
 */

import { env } from "cloudflare:workers";
import { z } from "zod";

import { createAndSendNewPostBroadcast } from "@/lib/newsletter/broadcast";
import { verifySanityWebhook } from "@/lib/newsletter/sanity-webhook";

import type { APIRoute } from "astro";

export const prerender = false;

const payloadSchema = z.object({
  _id: z.string().min(1),
  _type: z.literal("sessionTape"),
  slug: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string(),
  excerpt: z.string().optional(),
  readingTime: z.string().min(1),
  publishedAt: z.string().min(1),
});

type BroadcastPayload = z.output<typeof payloadSchema>;

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

async function reserveSlug(
  db: D1Database,
  slug: string,
  now: number,
): Promise<{ readonly reserved: boolean }> {
  const result = await db
    .prepare(
      `INSERT INTO broadcast_log (slug, broadcast_id, sent_at) VALUES (?, 'pending', ?)
       ON CONFLICT(slug) DO NOTHING`,
    )
    .bind(slug, now)
    .run();

  // D1 exposes changes() via `meta.changes` — 1 if inserted, 0 if the
  // conflict clause fired.
  const changes = result.meta.changes ?? 0;
  return { reserved: changes > 0 };
}

async function finaliseReservation(
  db: D1Database,
  slug: string,
  broadcastId: string,
): Promise<void> {
  await db
    .prepare(`UPDATE broadcast_log SET broadcast_id = ? WHERE slug = ?`)
    .bind(broadcastId, slug)
    .run();
}

async function releaseReservation(db: D1Database, slug: string): Promise<void> {
  await db.prepare(`DELETE FROM broadcast_log WHERE slug = ?`).bind(slug).run();
}

async function handleBroadcast(
  payload: BroadcastPayload,
): Promise<{ readonly status: number; readonly body: unknown }> {
  const now = Date.now();
  const reservation = await reserveSlug(env.DB, payload.slug, now);

  if (!reservation.reserved) {
    console.log(`[broadcast] slug already sent — skipping: ${payload.slug}`);
    return { status: 200, body: { success: true, skipped: "already-sent" } };
  }

  const result = await createAndSendNewPostBroadcast(env, {
    title: payload.title,
    subtitle: payload.subtitle,
    slug: payload.slug,
    readingTime: payload.readingTime,
    excerpt: payload.excerpt,
    publishedAt: payload.publishedAt,
  });

  if (!result.ok) {
    console.error(`[broadcast] send failed for ${payload.slug}: ${result.error}`);
    await releaseReservation(env.DB, payload.slug);
    return { status: 502, body: { success: false, error: result.error } };
  }

  await finaliseReservation(env.DB, payload.slug, result.broadcastId);
  console.log(`[broadcast] sent ${result.broadcastId} for ${payload.slug}`);
  return { status: 200, body: { success: true, broadcastId: result.broadcastId } };
}

export const POST: APIRoute = async ({ request }) => {
  if (env.SANITY_WEBHOOK_SECRET === undefined || env.SANITY_WEBHOOK_SECRET === "") {
    console.error("[broadcast] SANITY_WEBHOOK_SECRET not set");
    return json({ error: "Server not configured" }, 500);
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("sanity-webhook-signature") ?? undefined;
  const verification = await verifySanityWebhook(
    signatureHeader,
    rawBody,
    env.SANITY_WEBHOOK_SECRET,
  );

  if (!verification.ok) {
    console.warn(`[broadcast] signature rejected: ${verification.reason}`);
    return json({ error: "Unauthorized" }, 401);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const payload = payloadSchema.safeParse(parsedBody);
  if (!payload.success) {
    return json({ error: "Invalid payload", details: payload.error.flatten() }, 400);
  }

  const { status, body } = await handleBroadcast(payload.data);
  return json(body, status);
};
