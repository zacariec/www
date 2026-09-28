import { getProviderPreference, setProviderPreference } from "./resend";

import type { D1Database } from "@cloudflare/workers-types";

import type { NewsletterPreference, NewsletterProviderEnv } from "./resend";

interface NewsletterEnv extends NewsletterProviderEnv {
  DB: D1Database;
}

export interface NewsletterPreferences {
  preference: NewsletterPreference;
  email: string;
  subscribedAt?: number;
}

export async function getSubscriber(env: NewsletterEnv, email: string) {
  return env.DB.prepare(
    "SELECT status, preference, created_at FROM subscriber WHERE email = ? LIMIT 1",
  )
    .bind(email)
    .first<{ status: string; preference: NewsletterPreference; created_at: number }>();
}

async function savePreference(
  env: NewsletterEnv,
  email: string,
  preference: NewsletterPreference,
  contactId: string | null,
  createdAt: number,
) {
  await env.DB.prepare(
    `INSERT INTO subscriber (id, email, created_at, resend_contact_id, status, preference)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET resend_contact_id = excluded.resend_contact_id,
       status = excluded.status, preference = excluded.preference`,
  )
    .bind(
      crypto.randomUUID(),
      email,
      createdAt,
      contactId,
      preference === "none" ? "unsubscribed" : "confirmed",
      preference,
    )
    .run();
}

// Provider delivery state is authoritative. Reads only reconcile the local
// snapshot; they never opt in, create contacts, or undo a hosted unsubscribe.
export async function getNewsletterPreferences(
  env: NewsletterEnv,
  email: string,
): Promise<NewsletterPreferences> {
  const subscriber = await getSubscriber(env, email);
  const provider = await getProviderPreference(env, email);
  const subscribedAt = subscriber?.created_at ?? Date.now();
  if (subscriber || provider.contactId) {
    await savePreference(env, email, provider.preference, provider.contactId, subscribedAt);
  }
  return {
    email,
    preference: provider.preference,
    ...(provider.preference !== "none" ? { subscribedAt } : {}),
  };
}

export async function setNewsletterPreferences(
  env: NewsletterEnv,
  email: string,
  preference: NewsletterPreference,
): Promise<NewsletterPreferences> {
  const subscriber = await getSubscriber(env, email);
  // Do not claim success in D1 before the provider has accepted the change.
  const contactId = await setProviderPreference(env, email, preference);
  const subscribedAt = subscriber?.created_at ?? Date.now();
  await savePreference(env, email, preference, contactId, subscribedAt);
  return { email, preference, ...(preference !== "none" ? { subscribedAt } : {}) };
}
