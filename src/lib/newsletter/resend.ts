import { z } from "zod";

export type NewsletterPreference = "all" | "tapes" | "none";

export interface NewsletterProviderEnv {
  RESEND_API_KEY?: string;
  RESEND_AUDIENCE_ID?: string;
  RESEND_SESSIONS_TOPIC_ID?: string;
}

const contactSchema = z.object({
  id: z.string().min(1),
  unsubscribed: z.boolean(),
});
const listSchema = z.object({
  data: z.array(
    z.object({ id: z.string(), subscription: z.enum(["opt_in", "opt_out"]).optional() }),
  ),
  has_more: z.boolean().optional(),
});

async function requestProvider(
  env: NewsletterProviderEnv,
  path: string,
  method = "GET",
  body?: unknown,
): Promise<Response> {
  if (!env.RESEND_API_KEY) throw new Error("Newsletter provider is not configured");
  const response = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok && !(method === "GET" && response.status === 404)) {
    throw new Error(`Newsletter provider request failed (${response.status})`);
  }
  return response;
}

function deliveryConfig(env: NewsletterProviderEnv) {
  if (!env.RESEND_AUDIENCE_ID || !env.RESEND_SESSIONS_TOPIC_ID) {
    throw new Error("Newsletter delivery preferences are not configured");
  }
  return { segmentId: env.RESEND_AUDIENCE_ID, topicId: env.RESEND_SESSIONS_TOPIC_ID };
}

async function findContactSetting(env: NewsletterProviderEnv, path: string, id: string) {
  let after: string | undefined;
  do {
    // eslint-disable-next-line no-await-in-loop -- Each page requires the cursor returned by the previous page.
    const response = await requestProvider(
      env,
      `${path}${after ? `?after=${encodeURIComponent(after)}` : ""}`,
    );
    if (!response.ok) throw new Error("Newsletter contact settings are unavailable");
    // eslint-disable-next-line no-await-in-loop -- Decode this page to discover the cursor before requesting the next one.
    const page = listSchema.parse(await response.json());
    const match = page.data.find((item) => item.id === id);
    if (match) return match;
    const cursor = page.data.at(-1)?.id;
    if (page.has_more && (!cursor || cursor === after)) {
      throw new Error("Newsletter provider returned invalid pagination");
    }
    after = page.has_more ? cursor : undefined;
  } while (after);
  return undefined;
}

export async function getProviderPreference(env: NewsletterProviderEnv, email: string) {
  const { segmentId, topicId } = deliveryConfig(env);
  const path = `/contacts/${encodeURIComponent(email)}`;
  const response = await requestProvider(env, path);
  if (response.status === 404) return { preference: "none" as const, contactId: null };
  const contact = contactSchema.parse(await response.json());
  if (contact.unsubscribed) return { preference: "none" as const, contactId: contact.id };
  const segment = await findContactSetting(env, `${path}/segments`, segmentId);
  if (!segment) return { preference: "none" as const, contactId: contact.id };
  const topic = await findContactSetting(env, `${path}/topics`, topicId);
  // The configured topic MUST be default opt-in, preserving all legacy subscribers.
  const preference: NewsletterPreference = topic?.subscription === "opt_out" ? "tapes" : "all";
  return { preference, contactId: contact.id };
}

export async function setProviderPreference(
  env: NewsletterProviderEnv,
  email: string,
  preference: NewsletterPreference,
): Promise<string | null> {
  const path = `/contacts/${encodeURIComponent(email)}`;
  const response = await requestProvider(env, path);
  const contact = response.status === 404 ? null : contactSchema.parse(await response.json());
  if (preference === "none") {
    if (contact && !contact.unsubscribed) {
      await requestProvider(env, path, "PATCH", { unsubscribed: true });
    }
    return contact?.id ?? null;
  }

  const { segmentId, topicId } = deliveryConfig(env);
  const topics = [{ id: topicId, subscription: preference === "all" ? "opt_in" : "opt_out" }];
  if (!contact) {
    const created = await requestProvider(env, "/contacts", "POST", {
      email,
      unsubscribed: false,
      segments: [{ id: segmentId }],
      topics,
    });
    return z.object({ id: z.string().min(1) }).parse(await created.json()).id;
  }

  // Set filtering before reactivating: an interrupted re-subscription must not
  // briefly reopen delivery to a broader class than the reader selected.
  await requestProvider(env, `${path}/topics`, "PATCH", topics);
  await requestProvider(env, `${path}/segments/${encodeURIComponent(segmentId)}`, "POST");
  if (contact.unsubscribed) {
    await requestProvider(env, path, "PATCH", { unsubscribed: false });
  }
  return contact.id;
}
