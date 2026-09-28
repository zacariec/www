import { env, waitUntil } from "cloudflare:workers";

import { setNewsletterPreferences } from "@/lib/newsletter/preferences";
import { newsletterIdentity, newsletterJson, newsletterSameOrigin } from "@/lib/newsletter/request";
import { sendUnsubscribeConfirmation } from "@/lib/newsletter/send";

import type { APIRoute } from "astro";

export const prerender = false;

export async function performUnsubscribe(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await setNewsletterPreferences(env, email, "none");
  } catch (error) {
    console.error("[newsletter] unsubscribe failed", error);
    return { ok: false, error: "Unsubscribe could not be completed. Please try again." };
  }
  waitUntil(
    sendUnsubscribeConfirmation(email, env)
      .then((result) => {
        if (!result.ok) console.error("Unsubscribe confirmation failed:", result.error);
      })
      .catch((error) => console.error("Unsubscribe confirmation failed:", error)),
  );
  return { ok: true };
}

export const POST: APIRoute = async ({ request }) => {
  if (!newsletterSameOrigin(request))
    return newsletterJson({ error: "Same-origin request required" }, 403);
  try {
    const email = await newsletterIdentity(env, request);
    if (email instanceof Response) return email;
    const result = await performUnsubscribe(email);
    if (!result.ok) return newsletterJson({ error: result.error }, 502);
    return newsletterJson({ success: true });
  } catch (error) {
    console.error("[newsletter] unsubscribe request failed", error);
    return newsletterJson({ error: "Unsubscribe is unavailable. Please try again." }, 502);
  }
};
