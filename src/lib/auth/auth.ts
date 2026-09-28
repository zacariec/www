import { betterAuth } from "better-auth";

import type { Auth, BetterAuthOptions } from "better-auth";
import type {
  GithubProfile,
  GoogleProfile,
  LinkedInProfile,
  TwitterProfile,
} from "better-auth/social-providers";

export type RuntimeEnv = Cloudflare.Env;
export type ReaderProvider = "github" | "twitter" | "linkedin" | "google";

export function configuredProviders(env: RuntimeEnv): ReaderProvider[] {
  const providers: ReaderProvider[] = [];
  if (!env.BETTER_AUTH_SECRET && !env.AUTH_SECRET) return providers;
  if (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) providers.push("github");
  if (env.AUTH_X_ID && env.AUTH_X_SECRET) providers.push("twitter");
  if (env.AUTH_LINKEDIN_ID && env.AUTH_LINKEDIN_SECRET) providers.push("linkedin");
  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) providers.push("google");
  return providers;
}

// Profiles are written only from the provider's authenticated user-info response.
// Keeping them separate from Better Auth's tables preserves existing reader accounts.
async function rememberProfile(
  env: RuntimeEnv,
  provider: ReaderProvider,
  id: string,
  handle: string,
) {
  await env.DB.prepare(
    `INSERT INTO reader_profile (provider, provider_id, handle, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(provider, provider_id) DO UPDATE SET handle = excluded.handle, updated_at = excluded.updated_at`,
  )
    .bind(provider, id, handle, Date.now())
    .run();
  return {};
}

function create(env: RuntimeEnv): Auth {
  const baseURL = env.BETTER_AUTH_URL ?? env.SITE_URL;
  const secret = env.BETTER_AUTH_SECRET ?? env.AUTH_SECRET;
  if (!secret) throw new Error("Reader authentication requires BETTER_AUTH_SECRET");
  return betterAuth<BetterAuthOptions>({
    database: env.DB,
    secret,
    baseURL,
    trustedOrigins: baseURL ? [new URL(baseURL).origin] : undefined,
    advanced: {
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
    account: {
      updateAccountOnSignIn: true,
      // Only a provider-verified matching email can link to an existing reader.
      accountLinking: { enabled: true, allowDifferentEmails: false, trustedProviders: [] },
    },
    databaseHooks: {
      session: {
        create: {
          after: async (session, context) => {
            const provider = context?.params?.id;
            if (!context?.path.startsWith("/callback/") || typeof provider !== "string") return;
            const account = await env.DB.prepare(
              `SELECT accountId FROM account WHERE userId = ? AND providerId = ? ORDER BY updatedAt DESC, id ASC LIMIT 1`,
            )
              .bind(session.userId, provider)
              .first<{ accountId: string }>();
            if (!account) return;
            await env.DB.prepare(
              `INSERT INTO reader_session (session_id, provider, provider_id) VALUES (?, ?, ?)
               ON CONFLICT(session_id) DO UPDATE SET provider = excluded.provider, provider_id = excluded.provider_id`,
            )
              .bind(session.id, provider, account.accountId)
              .run();
          },
        },
      },
    },
    socialProviders: {
      ...(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET
        ? {
            github: {
              clientId: env.AUTH_GITHUB_ID,
              clientSecret: env.AUTH_GITHUB_SECRET,
              mapProfileToUser: async (profile: GithubProfile) =>
                rememberProfile(env, "github", String(profile.id), profile.login),
            },
          }
        : {}),
      ...(env.AUTH_X_ID && env.AUTH_X_SECRET
        ? {
            twitter: {
              clientId: env.AUTH_X_ID,
              clientSecret: env.AUTH_X_SECRET,
              mapProfileToUser: async (profile: TwitterProfile) => {
                await rememberProfile(env, "twitter", profile.data.id, profile.data.username);
                // Never use a mutable username as an email/account-linking identifier.
                return { email: profile.data.email ?? null };
              },
            },
          }
        : {}),
      ...(env.AUTH_LINKEDIN_ID && env.AUTH_LINKEDIN_SECRET
        ? {
            linkedin: {
              clientId: env.AUTH_LINKEDIN_ID,
              clientSecret: env.AUTH_LINKEDIN_SECRET,
              mapProfileToUser: async (profile: LinkedInProfile) =>
                rememberProfile(env, "linkedin", profile.sub, profile.name),
            },
          }
        : {}),
      ...(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
        ? {
            google: {
              clientId: env.AUTH_GOOGLE_ID,
              clientSecret: env.AUTH_GOOGLE_SECRET,
              mapProfileToUser: async (profile: GoogleProfile) =>
                rememberProfile(env, "google", profile.sub, profile.name),
            },
          }
        : {}),
    },
  });
}

let cached: Auth | null = null;
let cachedEnv: RuntimeEnv | null = null;

export function getAuth(env: RuntimeEnv): Auth {
  if (cached && cachedEnv === env) return cached;
  cached = create(env);
  cachedEnv = env;
  return cached;
}
