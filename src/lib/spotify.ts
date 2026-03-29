import {
  spotifyCurrentlyPlayingSchema,
  spotifyRecentlyPlayedSchema,
  spotifyTokenSchema,
} from "@/lib/schemas/spotify";

import type { NowPlayingData } from "@/lib/schemas/spotify";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";
const RECENTLY_PLAYED_ENDPOINT = "https://api.spotify.com/v1/me/player/recently-played?limit=1";

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  const data: unknown = await res.json();
  const parsed = spotifyTokenSchema.safeParse(data);
  if (!parsed.success) return null;

  return parsed.data.access_token;
}

export type { NowPlayingData };

export async function getNowPlaying(): Promise<NowPlayingData> {
  const token = await getAccessToken();
  if (!token) return { isPlaying: false, error: "No access token" };

  // Try currently playing
  const res = await fetch(NOW_PLAYING_ENDPOINT, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.status === 200) {
    const data: unknown = await res.json();
    const parsed = spotifyCurrentlyPlayingSchema.safeParse(data);

    if (parsed.success && parsed.data.is_playing && parsed.data.item) {
      const { item } = parsed.data;
      return {
        isPlaying: true,
        title: item.name,
        artist: item.artists.map((a) => a.name).join(", "),
        albumArt: item.album.images[2]?.url || item.album.images[0]?.url,
        songUrl: item.external_urls.spotify,
      };
    }
  }

  // Fall back to recently played
  const recentRes = await fetch(RECENTLY_PLAYED_ENDPOINT, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (recentRes.status === 200) {
    const data: unknown = await recentRes.json();
    const parsed = spotifyRecentlyPlayedSchema.safeParse(data);

    if (parsed.success) {
      const track = parsed.data.items[0]?.track;
      if (track) {
        return {
          isPlaying: false,
          title: track.name,
          artist: track.artists.map((a) => a.name).join(", "),
          albumArt: track.album.images[2]?.url || track.album.images[0]?.url,
          songUrl: track.external_urls.spotify,
        };
      }
    }
  }

  return { isPlaying: false, error: "No track data" };
}
