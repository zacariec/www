export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasAuthUrl: !!process.env.AUTH_URL,
    hasGithubId: !!process.env.AUTH_GITHUB_ID,
    hasGithubSecret: !!process.env.AUTH_GITHUB_SECRET,
    hasGoogleId: !!process.env.AUTH_GOOGLE_ID,
    hasGoogleSecret: !!process.env.AUTH_GOOGLE_SECRET,
    hasSanityToken: !!process.env.SANITY_API_TOKEN,
    hasSpotifyClient: !!process.env.SPOTIFY_CLIENT_ID,
    authUrl: process.env.AUTH_URL ?? "NOT SET",
    nodeEnv: process.env.NODE_ENV,
  });
}
