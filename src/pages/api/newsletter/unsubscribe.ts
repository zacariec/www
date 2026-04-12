import { env } from "cloudflare:workers";

import { getAuth } from "@/lib/auth/auth";
import { sendUnsubscribeConfirmation } from "@/lib/newsletter/send";

import type { APIRoute } from "astro";

export const prerender = false;

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

export async function performUnsubscribe(
  email: string,
  ctx?: ExecutionContext,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await env.DB.prepare(`UPDATE subscriber SET status = 'unsubscribed' WHERE email = ?`)
      .bind(email)
      .run();
  } catch {
    return { ok: false, error: "Failed to update" };
  }

  if (env.RESEND_API_KEY && env.RESEND_AUDIENCE_ID) {
    await removeFromResendAudience(env.RESEND_API_KEY, env.RESEND_AUDIENCE_ID, email);
  }

  const emailPromise = sendUnsubscribeConfirmation(email, env)
    .then((result) => {
      if (!result.ok) console.error("Unsubscribe email failed:", result.error);
    })
    .catch((err) => console.error("Unsubscribe email threw:", err));
  if (ctx?.waitUntil) ctx.waitUntil(emailPromise);

  return { ok: true };
}

export const POST: APIRoute = async ({ request, locals }) => {
  const ctx = (locals as { cfContext?: ExecutionContext }).cfContext;

  const auth = getAuth(env);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) {
    return Response.json({ error: "Sign in to manage preferences" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase();
  const result = await performUnsubscribe(email, ctx);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({ success: true });
};
