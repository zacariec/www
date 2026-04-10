import { env } from "cloudflare:workers";
import { z } from "zod";

import { sendUnsubscribeConfirmation } from "@/lib/newsletter/send";

import type { APIRoute } from "astro";

export const prerender = false;

const unsubscribeSchema = z.object({
  email: z.string().email().max(254),
});

async function removeFromResendAudience(
  apiKey: string,
  audienceId: string,
  email: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts/${encodeURIComponent(email)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const ctx = (locals as { cfContext?: ExecutionContext }).cfContext;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  try {
    await env.DB.prepare(`UPDATE subscriber SET status = 'unsubscribed' WHERE email = ?`)
      .bind(email)
      .run();
  } catch {
    return Response.json({ error: "Failed to update" }, { status: 500 });
  }

  if (env.RESEND_API_KEY && env.RESEND_AUDIENCE_ID) {
    await removeFromResendAudience(env.RESEND_API_KEY, env.RESEND_AUDIENCE_ID, email);
  }

  // Best-effort confirmation email — use waitUntil so workerd doesn't kill
  // the isolate before the async render + Resend POST finishes.
  const emailPromise = sendUnsubscribeConfirmation(email, env)
    .then((result) => {
      if (!result.ok) console.error("Unsubscribe email failed:", result.error);
    })
    .catch((err) => console.error("Unsubscribe email threw:", err));
  if (ctx?.waitUntil) ctx.waitUntil(emailPromise);

  return Response.json({ success: true });
};
