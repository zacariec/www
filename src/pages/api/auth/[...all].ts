import { env } from "cloudflare:workers";

import { getAuth } from "@/lib/auth/auth";

import type { APIRoute } from "astro";

export const prerender = false;

const handler: APIRoute = async ({ request }) => {
  const auth = getAuth(env);
  return auth.handler(request);
};

export const GET = handler;
export const POST = handler;
