import { render } from "@react-email/render";

import { buildSignedUnsubscribeUrl } from "./hmac";
import NewPostNotificationEmail from "../../../emails/NewPostNotification";
import SubscriptionConfirmedEmail from "../../../emails/SubscriptionConfirmed";
import UnsubscribeConfirmationEmail from "../../../emails/UnsubscribeConfirmation";

interface MailEnv {
  AUTH_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_AUDIENCE_ID?: string;
  RESEND_FROM_EMAIL?: string;
  SITE_URL?: string;
}

const DEFAULT_FROM = "ZC <signal@mail.zcarr.dev>";

function getFrom(env: MailEnv): string {
  return env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;
}

function getSiteUrl(env: MailEnv): string {
  return (env.SITE_URL ?? "https://zcarr.dev").replace(/\/$/, "");
}

async function postEmail(
  env: MailEnv,
  payload: {
    to: string;
    subject: string;
    html: string;
    text: string;
    headers?: Record<string, string>;
  },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!env.RESEND_API_KEY) return { ok: false, error: "no api key" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getFrom(env),
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        ...(payload.headers && { headers: payload.headers }),
      }),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}` };
    const data = await res.json();
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

function listUnsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export async function sendSubscriptionConfirmed(
  email: string,
  env: MailEnv,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const siteUrl = getSiteUrl(env);
    const unsubscribeUrl = await buildSignedUnsubscribeUrl(email, siteUrl, env.AUTH_SECRET ?? "");
    console.log("[email] rendering SubscriptionConfirmed for", email);
    const html = await render(SubscriptionConfirmedEmail({ unsubscribeUrl }));
    const text = await render(SubscriptionConfirmedEmail({ unsubscribeUrl }), { plainText: true });
    console.log("[email] rendered OK, sending via Resend");
    const result = await postEmail(env, {
      to: email,
      subject: "Welcome to the list",
      html,
      text,
      headers: listUnsubscribeHeaders(unsubscribeUrl),
    });
    console.log("[email] send result:", result.ok ? "OK" : result.error);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "render failed";
    console.error("[email] sendSubscriptionConfirmed error:", msg, err);
    return { ok: false, error: msg };
  }
}

export async function sendUnsubscribeConfirmation(
  email: string,
  env: MailEnv,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const siteUrl = getSiteUrl(env);
    const resubscribeUrl = `${siteUrl}/?subscribe=${encodeURIComponent(email)}`;
    const html = await render(UnsubscribeConfirmationEmail({ resubscribeUrl }));
    const text = await render(UnsubscribeConfirmationEmail({ resubscribeUrl }), {
      plainText: true,
    });
    return await postEmail(env, {
      to: email,
      subject: "You've been unsubscribed",
      html,
      text,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "render failed" };
  }
}

export interface NewPostInput {
  title: string;
  subtitle: string;
  slug: string;
  date: string;
  readingTime: string;
  excerpt?: string;
}

/**
 * Send a new-post notification to a single subscriber. For broadcasts to the
 * full audience, use Resend's Broadcast API instead (POST /broadcasts).
 */
export async function sendNewPostNotification(
  email: string,
  post: NewPostInput,
  env: MailEnv,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const siteUrl = getSiteUrl(env);
    const unsubscribeUrl = await buildSignedUnsubscribeUrl(email, siteUrl, env.AUTH_SECRET ?? "");
    const props = {
      postTitle: post.title,
      postSubtitle: post.subtitle,
      postUrl: `${siteUrl}/blog/${post.slug}`,
      postDate: new Date(post.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      readingTime: post.readingTime,
      postExcerpt: post.excerpt,
      unsubscribeUrl,
    };
    const html = await render(NewPostNotificationEmail(props));
    const text = await render(NewPostNotificationEmail(props), {
      plainText: true,
    });
    return await postEmail(env, {
      to: email,
      subject: `New: ${post.title}`,
      html,
      text,
      headers: listUnsubscribeHeaders(unsubscribeUrl),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "render failed" };
  }
}
