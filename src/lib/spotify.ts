import { env } from "cloudflare:workers";

import {
  nowPlayingResponseSchema,
  spotifyCurrentlyPlayingSchema,
  spotifyRecentlyPlayedSchema,
  spotifyTokenSchema,
  spotifyTrackSchema,
} from "@/lib/schemas/spotify";

import type { z } from "zod";

import type { NowPlayingData } from "@/lib/schemas/spotify";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";
const CACHE_TTL_MS = 30_000;
const CACHE_KEY = "https://zcarr.dev/_cache/spotify-now-playing-v3";
const tokens = new Map<string, { value: string; expiresAt: number }>();
let pendingSnapshot: Promise<NowPlayingData | null> | null = null;

type Track = z.infer<typeof spotifyTrackSchema>;
interface SpotifyTrack {
  track: string;
  artist: string;
  spotifyUrl: string;
}

async function getAccessToken(
  grant: "refresh_token" | "client_credentials",
): Promise<string | null> {
  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = env.SPOTIFY_REFRESH_TOKEN;
  if (!clientId || !clientSecret || (grant === "refresh_token" && !refreshToken)) return null;
  const cached = tokens.get(grant);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const body = new URLSearchParams({ grant_type: grant });
  if (grant === "refresh_token" && refreshToken) body.set("refresh_token", refreshToken);
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return null;
  const parsed = spotifyTokenSchema.safeParse(await response.json());
  if (!parsed.success) return null;
  tokens.set(grant, {
    value: parsed.data.access_token,
    expiresAt: Date.now() + Math.max(0, parsed.data.expires_in * 1_000 - 30_000),
  });
  return parsed.data.access_token;
}

async function spotifyFetch(path: string, token: string): Promise<Response> {
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
}

function snapshot(
  track: Track,
  playing: boolean,
  progressMs: number,
  playedAt: string | null,
): NowPlayingData {
  return {
    playing,
    track: track.name,
    artist: track.artists.map((artist) => artist.name).join(", "),
    album: track.album.name,
    artUrl: track.album.images[0]?.url ?? "",
    durationMs: track.duration_ms,
    progressMs: Math.min(track.duration_ms, Math.max(0, progressMs)),
    playedAt,
    url: track.external_urls.spotify,
    fetchedAt: Date.now(),
  };
}

async function fetchNowPlaying(): Promise<NowPlayingData | null> {
  try {
    const token = await getAccessToken("refresh_token");
    if (!token) return null;
    const current = await spotifyFetch("/me/player/currently-playing", token);
    if (current.status === 401) tokens.delete("refresh_token");
    if (current.status !== 204) {
      if (!current.ok) return null;
      const parsed = spotifyCurrentlyPlayingSchema.safeParse(await current.json());
      if (!parsed.success) return null;
      if (parsed.data.is_playing && parsed.data.currently_playing_type === "track") {
        const track = spotifyTrackSchema.safeParse(parsed.data.item);
        if (!track.success) return null;
        return snapshot(track.data, true, parsed.data.progress_ms ?? 0, null);
      }
    }

    // A paused player, no active device or a podcast may reveal recent music, never an episode.
    const recent = await spotifyFetch("/me/player/recently-played?limit=1", token);
    if (recent.status === 401) tokens.delete("refresh_token");
    if (!recent.ok) return null;
    const parsed = spotifyRecentlyPlayedSchema.safeParse(await recent.json());
    if (!parsed.success) return null;
    const item = parsed.data.items[0];
    if (!item) return null;
    const track = spotifyTrackSchema.safeParse(item.track);
    return track.success ? snapshot(track.data, false, 0, item.played_at) : null;
  } catch {
    return null;
  }
}

async function cachedNowPlaying(): Promise<NowPlayingData | null> {
  let cache: Cache | null = null;
  try {
    // The edge Cache API is shared by SSR and the API, not an isolate-only last-value variable.
    cache = await caches.open("spotify-now-playing-v3");
    const response = await cache.match(CACHE_KEY);
    if (response) {
      const saved = (await response.json()) as { cachedAt?: unknown; state?: unknown };
      const parsed = nowPlayingResponseSchema.nullable().safeParse(saved.state);
      if (
        parsed.success &&
        typeof saved.cachedAt === "number" &&
        Date.now() >= saved.cachedAt &&
        Date.now() - saved.cachedAt < CACHE_TTL_MS
      )
        return parsed.data;
    }
  } catch {
    // Cache storage being unavailable must not hide a working Spotify connection.
  }
  const state = await fetchNowPlaying();
  if (cache) {
    try {
      await cache.put(
        CACHE_KEY,
        new Response(JSON.stringify({ state, cachedAt: Date.now() }), {
          headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
        }),
      );
    } catch {
      // The provider result is still usable; never revive an expired cached track.
    }
  }
  return state;
}

export async function getNowPlaying(): Promise<NowPlayingData | null> {
  // Coalesce simultaneous header/footer/API reads while the shared cache is being filled.
  pendingSnapshot ??= cachedNowPlaying().finally(() => {
    pendingSnapshot = null;
  });
  return pendingSnapshot;
}

export async function getSpotifyTrack(
  trackId: string,
): Promise<{ status: number; track: SpotifyTrack | null }> {
  if (!/^[A-Za-z0-9]{22}$/.test(trackId)) return { status: 400, track: null };
  try {
    const token = await getAccessToken("client_credentials");
    if (!token) return { status: 503, track: null };
    const response = await spotifyFetch(`/tracks/${trackId}`, token);
    if (response.status === 401) tokens.delete("client_credentials");
    if (response.status === 404) return { status: 404, track: null };
    if (!response.ok) return { status: 503, track: null };
    const parsed = spotifyTrackSchema.safeParse(await response.json());
    if (!parsed.success) return { status: 503, track: null };
    return {
      status: 200,
      track: {
        track: parsed.data.name,
        artist: parsed.data.artists.map((artist) => artist.name).join(", "),
        spotifyUrl: parsed.data.external_urls.spotify,
      },
    };
  } catch {
    return { status: 503, track: null };
  }
}
