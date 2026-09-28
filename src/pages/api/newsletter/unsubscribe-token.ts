import { env } from "cloudflare:workers";

import { verifyUnsubscribeToken } from "@/lib/newsletter/hmac";
import { newsletterJson } from "@/lib/newsletter/request";

import { performUnsubscribe } from "./unsubscribe";

import type { APIRoute } from "astro";

export const prerender = false;

async function handleUnsubscribe(url: URL, oneClick: boolean): Promise<Response> {
  const email = url.searchParams.get("email")?.toLowerCase();
  const token = url.searchParams.get("token");
  let error: "missing" | "server" | "expired" | undefined;
  if (!email || !token) error = "missing";
  else if (!env.AUTH_SECRET) error = "server";
  else if (!(await verifyUnsubscribeToken(email, token, env.AUTH_SECRET))) error = "expired";
  else if (!(await performUnsubscribe(email)).ok) error = "server";

  // RFC 8058 clients need an actual success/failure status, not a redirect
  // that looks successful even when the provider refused the unsubscribe.
  if (oneClick) {
    return error
      ? newsletterJson(
          { error: error === "server" ? "Unsubscribe unavailable" : "Invalid unsubscribe link" },
          error === "server" ? 502 : 400,
        )
      : newsletterJson({ success: true });
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL(
        error ? `/unsubscribe?error=${error}` : "/unsubscribe?success=true",
        url.origin,
      ).toString(),
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export const GET: APIRoute = async ({ url }) => handleUnsubscribe(url, false);
export const POST: APIRoute = async ({ url }) => handleUnsubscribe(url, true);
