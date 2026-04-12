import { createClient } from "@sanity/client";
import { env } from "cloudflare:workers";
import { ZodError } from "zod";

import { getAuth } from "@/lib/auth/auth";
import { checkRateLimit } from "@/lib/rate-limit";
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

async function notifyNewComment(
  author: string,
  text: string,
  postSlug: string,
  isReply: boolean,
): Promise<void> {
  if (!env.RESEND_API_KEY) return;
  const siteUrl = (env.SITE_URL ?? "https://zcarr.dev").replace(/\/$/, "");
  const subject = isReply
    ? `Reply from ${author} on ${postSlug}`
    : `New comment from ${author} on ${postSlug}`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ZC <signal@mail.zcarr.dev>",
        to: "signal@zcarr.dev",
        subject,
        text: `${author} commented on ${siteUrl}/blog/${postSlug}:\n\n${text}`,
      }),
    });
  } catch (err) {
    console.error("[comment-notify] failed:", err);
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const ctx = (locals as { cfContext?: ExecutionContext }).cfContext;
  try {
    const auth = getAuth(env);
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Sign in to comment" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const allowed = await checkRateLimit(env.DB, `comment:${session.user.email}`, 5, 60_000);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many comments, slow down" }), {
        status: 429,
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

    const emailPromise = notifyNewComment(
      session.user.name || "Anonymous",
      text,
      postSlug,
      Boolean(parentCommentId),
    );
    if (ctx?.waitUntil) ctx.waitUntil(emailPromise);

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
