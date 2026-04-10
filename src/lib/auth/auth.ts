import { betterAuth } from 'better-auth';

export type RuntimeEnv = Cloudflare.Env;

let cached: ReturnType<typeof create> | null = null;
let cachedDb: D1Database | null = null;

function create(env: RuntimeEnv) {
  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET ?? env.AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: env.BETTER_AUTH_URL ? [env.BETTER_AUTH_URL] : undefined,
    socialProviders: {
      github: {
        clientId: env.AUTH_GITHUB_ID ?? '',
        clientSecret: env.AUTH_GITHUB_SECRET ?? '',
      },
      google: {
        clientId: env.AUTH_GOOGLE_ID ?? '',
        clientSecret: env.AUTH_GOOGLE_SECRET ?? '',
      },
    },
  });
}

export function getAuth(env: RuntimeEnv) {
  if (cached && cachedDb === env.DB) return cached;
  cached = create(env);
  cachedDb = env.DB;
  return cached;
}

export type Auth = ReturnType<typeof create>;
