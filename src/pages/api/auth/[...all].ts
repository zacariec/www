import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAuth } from '@/lib/auth/auth';

export const prerender = false;

const handler: APIRoute = ({ request }) => {
  const auth = getAuth(env);
  return auth.handler(request);
};

export const GET = handler;
export const POST = handler;
