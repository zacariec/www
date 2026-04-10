import { getNowPlaying } from "@/lib/spotify";

import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async () => {
  const data = await getNowPlaying();

  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
};
