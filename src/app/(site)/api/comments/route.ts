import { createClient } from "@sanity/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/lib/auth";
import { commentRequestSchema, sanityPostRefSchema } from "@/lib/schemas/comment";
import { apiVersion, dataset, projectId } from "@/sanity/env";

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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Sign in to comment" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const { text, postSlug, parentCommentId } = commentRequestSchema.parse(body);

    const writeClient = getWriteClient();
    if (!writeClient || !process.env.SANITY_API_TOKEN) {
      return NextResponse.json({ success: true, message: "Sanity not configured" });
    }

    const postResult: unknown = await writeClient.fetch(
      `*[_type == "blogPost" && slug.current == $slug][0]{ _id }`,
      { slug: postSlug },
    );

    const post = sanityPostRefSchema.safeParse(postResult);
    if (!post.success) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const comment = await writeClient.create({
      _type: "comment",
      post: { _type: "reference", _ref: post.data._id },
      ...(parentCommentId && {
        parentComment: { _type: "reference", _ref: parentCommentId },
      }),
      author: session.user.name || "Anonymous",
      authorEmail: session.user.email,
      authorImage: session.user.image,
      text,
      publishedAt: new Date().toISOString(),
      likes: 0,
    });

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
