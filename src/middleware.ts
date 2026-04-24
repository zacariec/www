/**
 * Edge cache policy for SSR pages.
 *
 * Why this exists
 * ---------------
 * We flipped to `output: "server"` so new Sanity content shows up without a
 * redeploy. Without a cache directive, every request would round-trip through
 * the Worker and hit Sanity — wasteful for content that changes once a day.
 *
 * We set a Cloudflare-friendly Cache-Control on successful GET HTML responses
 * so the edge holds a page for ~60s, then serves stale while it refetches in
 * the background. Published content is visible worldwide within a minute of
 * publish without any webhook plumbing.
 *
 * Opt-outs
 * --------
 *  - Non-GET (POST, etc.) — never cache
 *  - Studio, preview routes, API, auth — personalised or interactive
 *  - Non-200 responses (404, redirects) — leave untouched
 *  - Responses that already set Cache-Control — respect them
 */
import { defineMiddleware } from "astro:middleware";

const CACHE_CONTROL_VALUE = "public, s-maxage=60, stale-while-revalidate=300";

const NO_CACHE_PREFIXES = [
  "/studio",
  "/api/",
  "/preview/",
  "/preferences",
  "/unsubscribe",
] as const;

function shouldCache(pathname: string): boolean {
  return !NO_CACHE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  if (context.request.method !== "GET") return response;
  if (response.status !== 200) return response;
  if (response.headers.get("cache-control")) return response;
  if (!shouldCache(context.url.pathname)) return response;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  response.headers.set("cache-control", CACHE_CONTROL_VALUE);
  return response;
});
