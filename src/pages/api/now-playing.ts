import { getNowPlaying } from "@/lib/spotify";

import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async () => {
  const data = await getNowPlaying();

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": data
        ? `public, max-age=0, s-maxage=${Math.max(0, Math.floor((30_000 - (Date.now() - data.fetchedAt)) / 1_000))}`
        : "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
