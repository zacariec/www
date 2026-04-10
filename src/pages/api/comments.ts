import { createClient } from "@sanity/client";
import { env } from "cloudflare:workers";
import { ZodError } from "zod";

import { getAuth } from "@/lib/auth/auth";
import { commentRequestSchema, sanityPostRefSchema } from "@/lib/schemas/comment";
import { apiVersion, dataset, projectId } from "@/sanity/env";

import type { APIRoute } from "astro";

export const prerender = false;

function getWriteClient() {
  if (!projectId) return null;
  return createClient({
    projectId,
    dataset,
    apiVersion,
    token: import.meta.env.SANITY_API_TOKEN,
    useCdn: false,
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = getAuth(env);
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Sign in to comment" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body: unknown = await request.json();
    const { text, postSlug, parentCommentId } = commentRequestSchema.parse(body);

    const writeClient = getWriteClient();
    if (!writeClient || !import.meta.env.SANITY_API_TOKEN) {
      return new Response(JSON.stringify({ success: true, message: "Sanity not configured" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const postResult: unknown = await writeClient.fetch(
      `*[_type == "blogPost" && slug.current == $slug][0]{ _id }`,
      { slug: postSlug },
    );

    const post = sanityPostRefSchema.safeParse(postResult);
    if (!post.success) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
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

    return new Response(JSON.stringify({ success: true, comment }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return new Response(JSON.stringify({ error: "Invalid request", details: error.issues }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Failed to create comment" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
