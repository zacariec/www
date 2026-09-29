/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    notFoundPath?: string;
  }
}

declare namespace Cloudflare {
  interface Env {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Keep the project environment ambient without importing Worker DOM globals.
    DB: import("@cloudflare/workers-types").D1Database;
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- Match the browser client's binding contract in this ambient environment.
    BROWSER: import("@cloudflare/puppeteer").BrowserWorker;
    AUTH_GITHUB_ID?: string;
    AUTH_GITHUB_SECRET?: string;
    AUTH_GOOGLE_ID?: string;
    AUTH_GOOGLE_SECRET?: string;
    AUTH_X_ID?: string;
    AUTH_X_SECRET?: string;
    AUTH_LINKEDIN_ID?: string;
    AUTH_LINKEDIN_SECRET?: string;
    COMMENT_AUTHOR_IDENTITIES?: string;
    AUTH_SECRET?: string;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    RESEND_API_KEY?: string;
    RESEND_AUDIENCE_ID?: string;
    RESEND_SESSIONS_TOPIC_ID?: string;
    RESEND_FROM_EMAIL?: string;
    SANITY_API_TOKEN?: string;
    SANITY_WEBHOOK_SECRET?: string;
    COMMENT_WEBHOOK_SECRET?: string;
    SITE_URL?: string;
    SPOTIFY_CLIENT_ID?: string;
    SPOTIFY_CLIENT_SECRET?: string;
    SPOTIFY_REFRESH_TOKEN?: string;
  }
}

declare module "cloudflare:workers" {
  import type { CloudflareWorkersModule } from "@cloudflare/workers-types";

  export const env: Cloudflare.Env;
  export const waitUntil: typeof CloudflareWorkersModule.waitUntil;
}
