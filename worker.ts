import { Container, getContainer } from "@cloudflare/containers";
import { env } from "cloudflare:workers";

interface Env {
  NEXT_APP: DurableObjectNamespace<NextApp>;
}

export class NextApp extends Container {
  defaultPort = 3000;
  sleepAfter = "5m";

  envVars = {
    AUTH_SECRET: env.AUTH_SECRET,
    AUTH_URL: env.AUTH_URL,
    AUTH_TRUST_HOST: "true",
    AUTH_GITHUB_ID: env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: env.AUTH_GITHUB_SECRET,
    AUTH_GOOGLE_ID: env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: env.AUTH_GOOGLE_SECRET,
    SANITY_API_TOKEN: env.SANITY_API_TOKEN,
    SPOTIFY_CLIENT_ID: env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: env.SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REFRESH_TOKEN: env.SPOTIFY_REFRESH_TOKEN,
    NODE_ENV: "production",
  };
}

export default {
  async fetch(request: Request, workerEnv: Env): Promise<Response> {
    const container = getContainer(workerEnv.NEXT_APP);
    return await container.fetch(request);
  },
};
