import { env } from "cloudflare:workers";
import { z } from "zod";

import { addToResendAudience, getResendContact } from "@/lib/newsletter/resend";
import { sendSubscriptionConfirmed } from "@/lib/newsletter/send";

import type { APIRoute } from "astro";

export const prerender = false;

const subscribeSchema = z.object({
  email: z.string().email().max(254),
  company: z.string().optional(), // honeypot
});

export const POST: APIRoute = async ({ request, locals }) => {
  const ctx = (locals as { cfContext?: ExecutionContext }).cfContext;

  if (!env.RESEND_AUDIENCE_ID) {
    console.warn("[newsletter] RESEND_AUDIENCE_ID not set — skipping Resend sync");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  // Honeypot — silently succeed
  if (parsed.data.company && parsed.data.company.length > 0) {
    return Response.json({ success: true, status: "new" });
  }

  const email = parsed.data.email.toLowerCase();
  const now = Date.now();

  // 1. Check D1 — but treat 'unsubscribed' rows as re-subscriptions, not duplicates
  let alreadySubscribed = false;
  let isResubscription = false;
  try {
    const existing = await env.DB.prepare(
      `SELECT id, status FROM subscriber WHERE email = ? LIMIT 1`,
    )
      .bind(email)
      .first<{ id: string; status: string }>();
    if (existing) {
      if (existing.status === "unsubscribed") {
        isResubscription = true;
      } else {
        alreadySubscribed = true;
      }
    }
  } catch {
    return Response.json({ error: "Failed to query" }, { status: 500 });
  }

  // 2. If not in D1 but Resend is configured, double-check Resend in case
  // a contact was created out-of-band (manual import, dashboard add, etc.)
  if (!alreadySubscribed && !isResubscription && env.RESEND_API_KEY && env.RESEND_AUDIENCE_ID) {
    const contact = await getResendContact(env.RESEND_API_KEY, env.RESEND_AUDIENCE_ID, email);
    if (contact.exists) {
      alreadySubscribed = true;
      // Backfill into D1 so next time we don't have to round-trip
      try {
        await env.DB.prepare(
          `INSERT OR IGNORE INTO subscriber (id, email, created_at, resend_contact_id, status) VALUES (?, ?, ?, ?, 'confirmed')`,
        )
          .bind(crypto.randomUUID(), email, now, contact.id ?? null)
          .run();
      } catch {
        // non-fatal
      }
    }
  }

  if (alreadySubscribed) {
    return Response.json({ success: true, status: "already" });
  }

  // 3. Insert or re-activate in D1
  if (isResubscription) {
    try {
      await env.DB.prepare(
        `UPDATE subscriber SET status = 'pending', created_at = ? WHERE email = ?`,
      )
        .bind(now, email)
        .run();
    } catch {
      return Response.json({ error: "Failed to update" }, { status: 500 });
    }
  } else {
    const id = crypto.randomUUID();
    try {
      await env.DB.prepare(
        `INSERT INTO subscriber (id, email, created_at, status) VALUES (?, ?, ?, 'pending')`,
      )
        .bind(id, email, now)
        .run();
    } catch {
      return Response.json({ error: "Failed to save" }, { status: 500 });
    }
  }

  // 4. Best-effort sync to Resend (works for both new + re-subscriptions)
  if (env.RESEND_API_KEY && env.RESEND_AUDIENCE_ID) {
    const result = await addToResendAudience(env.RESEND_API_KEY, env.RESEND_AUDIENCE_ID, email);
    if (result.id) {
      try {
        await env.DB.prepare(
          `UPDATE subscriber SET resend_contact_id = ?, status = 'confirmed' WHERE email = ?`,
        )
          .bind(result.id, email)
          .run();
      } catch {
        // non-fatal
      }
    }
  }

  // 5. Best-effort welcome email — use waitUntil so workerd doesn't kill
  // the isolate before the async render + Resend POST finishes.
  const emailPromise = sendSubscriptionConfirmed(email, env)
    .then((result) => {
      if (!result.ok) console.error("Welcome email failed:", result.error);
    })
    .catch((err) => console.error("Welcome email threw:", err));
  if (ctx?.waitUntil) ctx.waitUntil(emailPromise);

  return Response.json({ success: true, status: "new" });
};
