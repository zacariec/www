import puppeteer from "@cloudflare/puppeteer";
import { env } from "cloudflare:workers";

import type { APIRoute } from "astro";

export const prerender = false;

const width = 1200;
const height = 630;

export const GET: APIRoute = async ({ params, request, rewrite, url }) => {
  const path = (params.path ?? "").split("/").map(encodeURIComponent).join("/");
  const renderUrl = new URL(`/og/render/${path}`, url.origin);
  // Resolve current published content inside this Worker, before acquiring a browser.
  // The browser receives this exact HTML, so its pixels and cache key cannot race CMS edits.
  const source = await rewrite(new Request(renderUrl));
  if (source.status === 404) {
    return new Response("Image not found.", {
      status: 404,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }
  if (!source.ok) throw new Error(`OG template returned HTTP ${source.status}`);
  const html = await source.text();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(html));
  const version = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const headers = {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=0, must-revalidate",
    "X-Robots-Tag": "noindex",
    ETag: `W/"${version}"`,
  };
  if (request.headers.get("if-none-match") === headers.ETag) {
    return new Response(null, { status: 304, headers });
  }
  if (request.method === "HEAD") return new Response(null, { headers });

  const cache = await caches.open("og-images");
  const cacheKey = new Request(new URL(`/og/cache/${version}.png`, url.origin));
  const cached = await cache.match(cacheKey);
  if (cached) return new Response(cached.body, { headers });

  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.setRequestInterception(true);
    page.on("request", async (resource) => {
      if (resource.isNavigationRequest() && resource.url() === renderUrl.href) {
        await resource.respond({ status: 200, contentType: "text/html", body: html });
      } else {
        await resource.continue();
      }
    });
    await page.goto(renderUrl.href, { waitUntil: "load" });
    await page.waitForFunction(
      () =>
        document.documentElement.dataset.ogReady === "true" ||
        Boolean(document.documentElement.dataset.ogError),
      { timeout: 30000 },
    );
    const result = await page.evaluate(() => {
      const frame = document.querySelector<HTMLElement>("[data-og-frame]");
      const box = frame?.getBoundingClientRect();
      return {
        error: document.documentElement.dataset.ogError,
        validFrame: box?.x === 0 && box.y === 0 && box.width === 1200 && box.height === 630,
      };
    });
    if (result.error || !result.validFrame) {
      throw new Error(result.error ?? "OG template must render a 1200×630 frame at the origin");
    }
    const png = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width, height },
      captureBeyondViewport: false,
    });
    const response = new Response(png as Uint8Array<ArrayBuffer>, { headers });
    await cache.put(
      cacheKey,
      new Response(response.clone().body, {
        headers: { ...headers, "Cache-Control": "public, max-age=86400" },
      }),
    );
    return response;
  } finally {
    await browser.close();
  }
};
