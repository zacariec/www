import { env } from "cloudflare:workers";

import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const email = url.searchParams.get("email")?.toLowerCase();
  if (!email) {
    return Response.json({ subscribed: false });
  }

  try {
    const row = await env.DB.prepare(
      `SELECT status, created_at FROM subscriber WHERE email = ? LIMIT 1`,
    )
      .bind(email)
      .first<{ status: string; created_at: number }>();

    if (!row || row.status === "unsubscribed") {
      return Response.json({ subscribed: false });
    }
    return Response.json({ subscribed: true, status: row.status, subscribedAt: row.created_at });
  } catch {
    return Response.json({ subscribed: false });
  }
};
