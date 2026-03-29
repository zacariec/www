import { Container, getContainer } from "@cloudflare/containers";

interface Env {
  NEXT_APP: DurableObjectNamespace<NextApp>;
  AUTH_SECRET: string;
  AUTH_URL: string;
  AUTH_GITHUB_ID: string;
  AUTH_GITHUB_SECRET: string;
  AUTH_GOOGLE_ID: string;
  AUTH_GOOGLE_SECRET: string;
  SANITY_API_TOKEN: string;
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  SPOTIFY_REFRESH_TOKEN: string;
}

export class NextApp extends Container<Env> {
  defaultPort = 3000;
  sleepAfter = "5m";

  override get envVars() {
    return {
      AUTH_SECRET: this.env.AUTH_SECRET ?? "",
      AUTH_URL: this.env.AUTH_URL ?? "",
      AUTH_TRUST_HOST: "true",
      AUTH_GITHUB_ID: this.env.AUTH_GITHUB_ID ?? "",
      AUTH_GITHUB_SECRET: this.env.AUTH_GITHUB_SECRET ?? "",
      AUTH_GOOGLE_ID: this.env.AUTH_GOOGLE_ID ?? "",
      AUTH_GOOGLE_SECRET: this.env.AUTH_GOOGLE_SECRET ?? "",
      SANITY_API_TOKEN: this.env.SANITY_API_TOKEN ?? "",
      SPOTIFY_CLIENT_ID: this.env.SPOTIFY_CLIENT_ID ?? "",
      SPOTIFY_CLIENT_SECRET: this.env.SPOTIFY_CLIENT_SECRET ?? "",
      SPOTIFY_REFRESH_TOKEN: this.env.SPOTIFY_REFRESH_TOKEN ?? "",
      NODE_ENV: "production",
    };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const container = getContainer(env.NEXT_APP);
    return await container.fetch(request);
  },
};
