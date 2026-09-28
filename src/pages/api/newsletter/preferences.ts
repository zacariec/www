import { env } from "cloudflare:workers";
import { z } from "zod";

import { getNewsletterPreferences, setNewsletterPreferences } from "@/lib/newsletter/preferences";
import { newsletterIdentity, newsletterJson, newsletterSameOrigin } from "@/lib/newsletter/request";

import type { APIRoute } from "astro";

export const prerender = false;

const preferenceSchema = z.object({ preference: z.enum(["all", "tapes", "none"]) }).strict();

export const GET: APIRoute = async ({ request }) => {
  try {
    const email = await newsletterIdentity(env, request);
    if (email instanceof Response) return email;
    return newsletterJson(await getNewsletterPreferences(env, email));
  } catch (error) {
    console.error("[newsletter] preference lookup failed", error);
    return newsletterJson(
      { error: "Newsletter preferences are unavailable. Please try again." },
      502,
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!newsletterSameOrigin(request)) {
    return newsletterJson({ error: "Same-origin request required" }, 403);
  }
  try {
    const email = await newsletterIdentity(env, request);
    if (email instanceof Response) return email;
    const body = await request.json().catch(() => null);
    const parsed = preferenceSchema.safeParse(body);
    if (!parsed.success) return newsletterJson({ error: "Choose all, tapes, or none" }, 400);
    return newsletterJson(await setNewsletterPreferences(env, email, parsed.data.preference));
  } catch (error) {
    console.error("[newsletter] preference change failed", error);
    return newsletterJson(
      {
        error:
          "Newsletter preferences could not be saved. Please reload to check their current state.",
      },
      502,
    );
  }
};
