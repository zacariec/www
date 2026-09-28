import { env, waitUntil } from "cloudflare:workers";
import { z } from "zod";

import { getAuth } from "@/lib/auth/auth";
import {
  getNewsletterPreferences,
  getSubscriber,
  setNewsletterPreferences,
} from "@/lib/newsletter/preferences";
import { newsletterJson, newsletterSameOrigin } from "@/lib/newsletter/request";
import { sendSubscriptionConfirmed } from "@/lib/newsletter/send";
import { checkRateLimit } from "@/lib/rate-limit";

import type { APIRoute } from "astro";

export const prerender = false;

const subscribeSchema = z.object({
  email: z.string().email().max(254),
  company: z.string().optional(),
});

export const POST: APIRoute = async ({ request }) => {
  if (!newsletterSameOrigin(request))
    return newsletterJson({ error: "Same-origin request required" }, 403);
  const ip =
    request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const allowed = await checkRateLimit(env.DB, `subscribe:${ip}`, 3, 60_000);
  if (!allowed) return newsletterJson({ error: "Too many requests, try again later" }, 429);
  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return newsletterJson({ error: "Invalid email" }, 400);
  if (parsed.data.company) return newsletterJson({ success: true, status: "new" });

  const email = parsed.data.email.toLowerCase();
  try {
    const existing = await getSubscriber(env, email);
    const current = await getNewsletterPreferences(env, email);
    // Duplicate footer submissions must not turn tapes-only into all updates.
    if (current.preference !== "none") return newsletterJson({ success: true, status: "already" });
    const reconciled = await getSubscriber(env, email);
    if (existing?.status === "unsubscribed" || reconciled?.status === "unsubscribed") {
      const session = await getAuth(env).api.getSession({ headers: request.headers });
      if (!session?.user?.emailVerified || session.user.email.toLowerCase() !== email) {
        return newsletterJson(
          {
            error:
              "Sign in with this verified email to re-subscribe and change your delivery preferences",
          },
          403,
        );
      }
    }
    await setNewsletterPreferences(env, email, "all");
    const emailPromise = sendSubscriptionConfirmed(email, env)
      .then((result) => {
        if (!result.ok) console.error("Welcome email failed:", result.error);
      })
      .catch((error) => console.error("Welcome email failed:", error));
    waitUntil(emailPromise);
    return newsletterJson({ success: true, status: "new" });
  } catch (error) {
    console.error("[newsletter] signup failed", error);
    return newsletterJson({ error: "Subscription could not be saved. Please try again." }, 502);
  }
};
