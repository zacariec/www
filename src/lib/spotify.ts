const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";
const RECENTLY_PLAYED_ENDPOINT = "https://api.spotify.com/v1/me/player/recently-played?limit=1";

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error("[Spotify] Missing env vars:", {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRefreshToken: !!refreshToken,
    });
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
    const text = await res.text();
    console.error("[Spotify] Token exchange failed:", res.status, text);
    return null;
  }

  const data = await res.json();
  return data.access_token;
}

export interface NowPlayingData {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  albumArt?: string;
  songUrl?: string;
  error?: string;
}

export async function getNowPlaying(): Promise<NowPlayingData> {
  const token = await getAccessToken();
  if (!token) return { isPlaying: false, error: "No access token" };

  // Try currently playing
  const res = await fetch(NOW_PLAYING_ENDPOINT, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.status === 200) {
    const data = await res.json();
    if (data.is_playing && data.item) {
      return {
        isPlaying: true,
        title: data.item.name,
        artist: data.item.artists.map((a: { name: string }) => a.name).join(", "),
        albumArt: data.item.album.images?.[2]?.url || data.item.album.images?.[0]?.url,
        songUrl: data.item.external_urls.spotify,
      };
    }
  }

  // Fall back to recently played
  const recentRes = await fetch(RECENTLY_PLAYED_ENDPOINT, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (recentRes.status === 200) {
    const data = await recentRes.json();
    const track = data.items?.[0]?.track;
    if (track) {
      return {
        isPlaying: false,
        title: track.name,
        artist: track.artists.map((a: { name: string }) => a.name).join(", "),
        albumArt: track.album.images?.[2]?.url || track.album.images?.[0]?.url,
        songUrl: track.external_urls.spotify,
      };
    }
  }

  return { isPlaying: false, error: "No track data" };
}
