/**
 * Resend broadcast API — create + send a broadcast to a full audience.
 *
 * Why broadcasts (not per-subscriber fan-out):
 *  - One HTTP call to Resend, not N.
 *  - Resend renders the recipient-scoped unsubscribe URL server-side via the
 *    `{{{RESEND_UNSUBSCRIBE_URL}}}` merge tag, so the HTML we ship is static.
 *  - Open/click tracking rolls up per broadcast in the Resend dashboard.
 *  - Unsubscribes flip the audience contact directly — no per-recipient
 *    signed URL round-tripping through our worker.
 */

import { render } from "@react-email/render";
import { z } from "zod";

import NewPostNotificationEmail from "../../../emails/NewPostNotification";

const createResponseSchema = z.object({
  id: z.string().min(1),
});

interface BroadcastEnv {
  readonly RESEND_API_KEY?: string;
  readonly RESEND_AUDIENCE_ID?: string;
  readonly RESEND_FROM_EMAIL?: string;
  readonly SITE_URL?: string;
}

export interface BroadcastPost {
  readonly title: string;
  readonly subtitle: string;
  readonly slug: string;
  readonly readingTime: string;
  readonly excerpt?: string;
  readonly publishedAt: string;
}

export type BroadcastResult =
  | { readonly ok: true; readonly broadcastId: string }
  | { readonly ok: false; readonly error: string };

const DEFAULT_FROM = "ZC <signal@mail.zcarr.dev>";
const RESEND_UNSUBSCRIBE_MERGE_TAG = "{{{RESEND_UNSUBSCRIBE_URL}}}";

function getFrom(env: BroadcastEnv): string {
  return env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;
}

function getSiteUrl(env: BroadcastEnv): string {
  return (env.SITE_URL ?? "https://zcarr.dev").replace(/\/$/, "");
}

function formatPostDate(publishedAt: string): string {
  const parsed = new Date(publishedAt);
  if (Number.isNaN(parsed.getTime())) {
    return publishedAt;
  }
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function renderBroadcastEmail(
  post: BroadcastPost,
  siteUrl: string,
): Promise<{ readonly html: string; readonly text: string }> {
  const props = {
    postTitle: post.title,
    postSubtitle: post.subtitle,
    postUrl: `${siteUrl}/sessions/${post.slug}`,
    postDate: formatPostDate(post.publishedAt),
    readingTime: post.readingTime,
    postExcerpt: post.excerpt,
    // Resend replaces this at send-time with the per-recipient unsubscribe
    // URL bound to the audience contact. Must be present in the rendered HTML.
    unsubscribeUrl: RESEND_UNSUBSCRIBE_MERGE_TAG,
  };
  const html = await render(NewPostNotificationEmail(props));
  const text = await render(NewPostNotificationEmail(props), { plainText: true });
  return { html, text };
}

async function createBroadcast(env: BroadcastEnv, post: BroadcastPost): Promise<BroadcastResult> {
  if (env.RESEND_API_KEY === undefined || env.RESEND_API_KEY === "") {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  if (env.RESEND_AUDIENCE_ID === undefined || env.RESEND_AUDIENCE_ID === "") {
    return { ok: false, error: "RESEND_AUDIENCE_ID not set" };
  }

  const { html, text } = await renderBroadcastEmail(post, getSiteUrl(env));

  const response = await fetch("https://api.resend.com/broadcasts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audience_id: env.RESEND_AUDIENCE_ID,
      from: getFrom(env),
      subject: `New: ${post.title}`,
      html,
      text,
      // Human-readable name in the Resend dashboard broadcast list.
      name: `New post: ${post.title} (${post.slug})`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return { ok: false, error: `Resend create ${response.status}: ${detail}` };
  }

  const parsed = createResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    return { ok: false, error: "Resend create returned unexpected shape" };
  }

  return { ok: true, broadcastId: parsed.data.id };
}

async function sendBroadcast(env: BroadcastEnv, broadcastId: string): Promise<BroadcastResult> {
  if (env.RESEND_API_KEY === undefined || env.RESEND_API_KEY === "") {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  const response = await fetch(`https://api.resend.com/broadcasts/${broadcastId}/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return { ok: false, error: `Resend send ${response.status}: ${detail}` };
  }

  return { ok: true, broadcastId };
}

/**
 * Create a Resend broadcast for a new post and immediately queue it for send.
 * Returns the broadcast id on success so the caller can persist it against
 * the post slug in the idempotency log.
 */
export async function createAndSendNewPostBroadcast(
  env: BroadcastEnv,
  post: BroadcastPost,
): Promise<BroadcastResult> {
  const created = await createBroadcast(env, post);
  if (!created.ok) {
    return created;
  }
  return sendBroadcast(env, created.broadcastId);
}
