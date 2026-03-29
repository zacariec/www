import { z } from "zod";

export const spotifyTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
});

const spotifyArtistSchema = z.object({
  name: z.string(),
});

const spotifyImageSchema = z.object({
  url: z.string(),
  height: z.number().nullable(),
  width: z.number().nullable(),
});

const spotifyTrackSchema = z.object({
  name: z.string(),
  artists: z.array(spotifyArtistSchema),
  album: z.object({
    images: z.array(spotifyImageSchema),
    name: z.string(),
  }),
  external_urls: z.object({
    spotify: z.string(),
  }),
});

export const spotifyCurrentlyPlayingSchema = z.object({
  is_playing: z.boolean(),
  item: spotifyTrackSchema.nullable(),
});

export const spotifyRecentlyPlayedSchema = z.object({
  items: z.array(
    z.object({
      track: spotifyTrackSchema,
    }),
  ),
});

export const nowPlayingResponseSchema = z.object({
  isPlaying: z.boolean(),
  title: z.string().optional(),
  artist: z.string().optional(),
  albumArt: z.string().optional(),
  songUrl: z.string().optional(),
  error: z.string().optional(),
});

export type NowPlayingData = z.infer<typeof nowPlayingResponseSchema>;
