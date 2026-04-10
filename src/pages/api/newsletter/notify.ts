import { env } from "cloudflare:workers";
import { z } from "zod";

import { sendNewPostNotification } from "@/lib/newsletter/send";

import type { APIRoute } from "astro";

export const prerender = false;

const notifySchema = z.object({
  email: z.string().email().max(254),
  post: z.object({
    title: z.string(),
    subtitle: z.string(),
    slug: z.string(),
    date: z.string(),
    readingTime: z.string(),
    excerpt: z.string().optional(),
  }),
});

export const POST: APIRoute = async ({ request, locals }) => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${env.RESEND_API_KEY}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = notifySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, post } = parsed.data;
  const ctx = (locals as { cfContext?: ExecutionContext }).cfContext;

  const emailPromise = sendNewPostNotification(email, post, env).then((result) => {
    if (!result.ok) console.error("New post email failed:", result.error);
    return result;
  });

  if (ctx?.waitUntil) ctx.waitUntil(emailPromise);

  const result = await emailPromise;
  return Response.json({ success: result.ok, error: result.error });
};
