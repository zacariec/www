import { env } from "cloudflare:workers";

import { verifyUnsubscribeToken } from "@/lib/newsletter/hmac";

import { performUnsubscribe } from "./unsubscribe";

import type { APIRoute } from "astro";

export const prerender = false;

async function handleUnsubscribe(url: URL, locals: Record<string, unknown>): Promise<Response> {
  const email = url.searchParams.get("email")?.toLowerCase();
  const token = url.searchParams.get("token");

  if (!email || !token) {
    return Response.redirect(new URL("/unsubscribe?error=missing", url.origin).toString(), 302);
  }

  const secret = env.AUTH_SECRET ?? "";
  if (!secret) {
    console.error("[unsubscribe-token] AUTH_SECRET not set");
    return Response.redirect(new URL("/unsubscribe?error=server", url.origin).toString(), 302);
  }

  const valid = await verifyUnsubscribeToken(email, token, secret);
  if (!valid) {
    return Response.redirect(new URL("/unsubscribe?error=expired", url.origin).toString(), 302);
  }

  const ctx = (locals as { cfContext?: ExecutionContext }).cfContext;
  const result = await performUnsubscribe(email, ctx);

  if (!result.ok) {
    return Response.redirect(new URL("/unsubscribe?error=server", url.origin).toString(), 302);
  }

  return Response.redirect(new URL("/unsubscribe?success=true", url.origin).toString(), 302);
}

// GET: browser link click from email
export const GET: APIRoute = async ({ url, locals }) =>
  handleUnsubscribe(url, locals as Record<string, unknown>);

// POST: RFC 8058 one-click unsubscribe from email clients
export const POST: APIRoute = async ({ url, locals }) =>
  handleUnsubscribe(url, locals as Record<string, unknown>);
