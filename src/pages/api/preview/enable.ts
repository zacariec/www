import { validatePreviewUrl } from "@sanity/preview-url-secret";
import { env } from "cloudflare:workers";

import { createPreviewClient } from "@/lib/sanity/client";
import { createPreviewCookie, PREVIEW_COOKIE } from "@/lib/sanity/preview";

import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const secret = env.SANITY_API_TOKEN;
  const previewClient = createPreviewClient(secret);
  if (!secret || !previewClient) {
    return new Response("Preview client not configured (missing SANITY_API_TOKEN)", {
      status: 500,
    });
  }

  const { isValid, redirectTo = "/" } = await validatePreviewUrl(previewClient, request.url);
  if (!isValid) {
    return new Response("Invalid preview secret", { status: 401 });
  }

  const signedCookie = await createPreviewCookie(secret, Date.now() + 60 * 60 * 1000);
  cookies.set(PREVIEW_COOKIE, signedCookie, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: 60 * 60, // 1h
  });

  const destination = new URL(redirectTo, request.url);
  if (destination.pathname === "/") destination.pathname = "/preview";
  else if (destination.pathname.startsWith("/sessions/"))
    destination.pathname = `/preview${destination.pathname}`;
  if (
    destination.origin !== new URL(request.url).origin ||
    !destination.pathname.startsWith("/preview")
  ) {
    return new Response("Preview destination must be a local preview route", { status: 400 });
  }
  return redirect(`${destination.pathname}${destination.search}${destination.hash}`, 307);
};
