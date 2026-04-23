import { validatePreviewUrl } from "@sanity/preview-url-secret";
import { env } from "cloudflare:workers";

import { createPreviewClient } from "@/lib/sanity/client";

import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const previewClient = createPreviewClient(env.SANITY_API_TOKEN);
  if (!previewClient) {
    return new Response("Preview client not configured (missing SANITY_API_TOKEN)", {
      status: 500,
    });
  }

  const { isValid, redirectTo = "/" } = await validatePreviewUrl(previewClient, request.url);
  if (!isValid) {
    return new Response("Invalid preview secret", { status: 401 });
  }

  cookies.set("__sanity_preview", "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: 60 * 60, // 1h
  });

  return redirect(redirectTo, 307);
};
