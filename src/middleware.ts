/**
 * Legacy route redirects and edge cache policy for SSR pages.
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
const SAFE_METHODS: Record<string, true | undefined> = { GET: true, HEAD: true, OPTIONS: true };
const FORM_CONTENT_TYPES = [
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain",
];

const NO_CACHE_PREFIXES = [
  "/studio",
  "/api/",
  "/preview/",
  "/preferences",
  "/unsubscribe",
  "/og/render",
] as const;

const NO_INDEX_ROUTES = [
  "/studio",
  "/preview",
  "/api",
  "/preferences",
  "/unsubscribe",
  "/og/render",
];

function shouldCache(pathname: string): boolean {
  return !NO_CACHE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Preserve Astro's form CSRF protection while allowing RFC 8058 mail clients,
  // which cannot send a same-site Origin. That one route verifies a signed token.
  const signedUnsubscribe =
    context.request.method === "POST" &&
    context.url.pathname === "/api/newsletter/unsubscribe-token";
  if (
    !context.isPrerendered &&
    SAFE_METHODS[context.request.method] !== true &&
    !signedUnsubscribe
  ) {
    const contentType = context.request.headers.get("content-type")?.toLowerCase();
    const formLike =
      contentType === undefined || FORM_CONTENT_TYPES.some((type) => contentType.includes(type));
    if (formLike && context.request.headers.get("origin") !== context.url.origin) {
      return new Response(`Cross-site ${context.request.method} form submissions are forbidden`, {
        status: 403,
      });
    }
  }

  // Redirect at runtime: generated asset rules append /index.html to dynamic
  // destinations, but sessions are SSR routes rather than static HTML files.
  const { pathname, search } = context.url;
  if (pathname === "/blog" || pathname.startsWith("/blog/")) {
    return context.redirect(`/sessions${pathname.slice("/blog".length)}${search}`, 301);
  }

  let response = await next();
  if (
    response.status === 404 ||
    NO_INDEX_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
  ) {
    // Auth handlers may return immutable redirect headers; preserve the response while adding policy.
    response = new Response(response.body, response);
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  if (context.request.method !== "GET") return response;
  if (response.status !== 200) return response;
  if (response.headers.get("cache-control")) return response;
  if (!shouldCache(context.url.pathname)) return response;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  response.headers.set("cache-control", CACHE_CONTROL_VALUE);
  return response;
});
