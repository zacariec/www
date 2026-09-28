import { env } from "cloudflare:workers";
import { z } from "zod";

import { accountPreferences, saveAccountPreferences } from "@/lib/comments/preferences";
import {
  CommentError,
  commentFailure,
  commentsClient,
  json,
  requestJson,
  requireReader,
  requireSameOrigin,
} from "@/lib/comments/server";

import type { APIRoute } from "astro";

export const prerender = false;
const preferencePatch = z
  .object({
    replyNotifications: z.boolean().optional(),
    showAnchors: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Choose a setting to update.");

export const GET: APIRoute = async ({ request }) => {
  try {
    const reader = await requireReader(request, env);
    return json(await accountPreferences(commentsClient(env), env, reader));
  } catch (error) {
    return commentFailure(error);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  try {
    requireSameOrigin(request, env);
    const reader = await requireReader(request, env);
    const parsed = preferencePatch.safeParse(await requestJson(request));
    if (!parsed.success) throw new CommentError(400, "Send only boolean account preferences.");
    return json(await saveAccountPreferences(commentsClient(env), env, reader, parsed.data));
  } catch (error) {
    return commentFailure(error);
  }
};
