import { NextResponse } from "next/server";

import { getNowPlaying } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getNowPlaying();

  // In development, include error info for debugging
  if (process.env.NODE_ENV === "development" && data.error) {
    console.error("[Spotify API]", data.error);
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
