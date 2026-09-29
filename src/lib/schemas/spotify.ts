import { z } from "zod";

const httpsUrl = z.url().refine((value) => value.startsWith("https://"));

export const spotifyTokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  expires_in: z.number().positive(),
});

export const spotifyTrackUrlSchema = z
  .string()
  .max(512)
  .transform((value, context) => {
    try {
      const url = new URL(value);
      const match = /^\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]{22})\/?$/.exec(url.pathname);
      if (
        url.protocol === "https:" &&
        url.hostname === "open.spotify.com" &&
        !url.port &&
        !url.username &&
        !url.password &&
        match?.[1]
      ) {
        return `https://open.spotify.com/track/${match[1]}`;
      }
    } catch {
      // Invalid URLs receive the same field error as non-track Spotify links.
    }
    context.addIssue({ code: "custom", message: "Enter an https://open.spotify.com/track/ URL" });
    return z.NEVER;
  });

export const spotifyTrackSchema = z.object({
  type: z.literal("track"),
  name: z.string().min(1),
  duration_ms: z.number().nonnegative(),
  artists: z.array(z.object({ name: z.string().min(1) })).min(1),
  album: z.object({
    images: z.array(z.object({ url: httpsUrl })),
    name: z.string(),
  }),
  external_urls: z.object({ spotify: spotifyTrackUrlSchema }),
});

export const spotifyCurrentlyPlayingSchema = z.object({
  is_playing: z.boolean(),
  currently_playing_type: z.string(),
  progress_ms: z.number().nullable(),
  item: z.unknown(),
});

export const spotifyRecentlyPlayedSchema = z.object({
  items: z.array(
    z.object({
      track: z.unknown(),
      played_at: z.iso.datetime(),
    }),
  ),
});

export const nowPlayingResponseSchema = z
  .object({
    playing: z.boolean(),
    track: z.string().min(1),
    artist: z.string().min(1),
    album: z.string(),
    artUrl: z.union([httpsUrl, z.literal("")]),
    durationMs: z.number().nonnegative(),
    progressMs: z.number().nonnegative(),
    playedAt: z.iso.datetime().nullable(),
    url: spotifyTrackUrlSchema,
    fetchedAt: z.number().nonnegative(),
  })
  .refine((state) => state.progressMs <= state.durationMs, {
    message: "Track progress cannot exceed its duration",
  });

export type NowPlayingData = z.infer<typeof nowPlayingResponseSchema>;
