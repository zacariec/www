import { env } from "cloudflare:workers";

import { checkRateLimit } from "@/lib/rate-limit";
import { spotifyTrackUrlSchema } from "@/lib/schemas/spotify";
import { getSpotifyTrack } from "@/lib/spotify";

import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  const parsed = spotifyTrackUrlSchema.safeParse(url.searchParams.get("url"));
  if (!parsed.success) {
    return Response.json({ error: "Enter a Spotify track URL" }, { status: 400, headers });
  }
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const allowed = await checkRateLimit(env.DB, `spotify-track:${ip}`, 20, 60_000);
  if (!allowed) {
    return Response.json(
      { error: "Too many track lookups. Try again in a minute." },
      {
        status: 429,
        headers: { ...headers, "Retry-After": "60" },
      },
    );
  }
  const trackId = parsed.data.slice(parsed.data.lastIndexOf("/") + 1);
  const result = await getSpotifyTrack(trackId);
  if (!result.track) {
    return Response.json(
      {
        error:
          result.status === 404 ? "Track not found" : "Spotify is unavailable. Try again later.",
      },
      {
        status: result.status,
        headers,
      },
    );
  }
  return Response.json(result.track, { headers });
};
