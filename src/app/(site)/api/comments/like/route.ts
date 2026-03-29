import { createClient } from "@sanity/client";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { apiVersion, dataset, projectId } from "@/sanity/env";

const likeSchema = z.object({
  commentId: z.string().min(1),
});

function getWriteClient() {
  if (!projectId) return null;
  return createClient({
    projectId,
    dataset,
    apiVersion,
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
  });
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const { commentId } = likeSchema.parse(body);

    const writeClient = getWriteClient();
    if (!writeClient || !process.env.SANITY_API_TOKEN) {
      return NextResponse.json({ success: true, message: "Sanity not configured" });
    }

    await writeClient.patch(commentId).inc({ likes: 1 }).commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to like comment" }, { status: 500 });
  }
}
