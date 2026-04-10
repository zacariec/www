import type { APIRoute } from 'astro';
import { createClient } from '@sanity/client';
import { z, ZodError } from 'zod';
import { apiVersion, dataset, projectId } from '@/sanity/env';

export const prerender = false;

const likeSchema = z.object({
  commentId: z.string().min(1),
});

function getWriteClient() {
  if (!projectId) return null;
  return createClient({
    projectId,
    dataset,
    apiVersion,
    token: import.meta.env.SANITY_API_TOKEN,
    useCdn: false,
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: unknown = await request.json();
    const { commentId } = likeSchema.parse(body);

    const writeClient = getWriteClient();
    if (!writeClient || !import.meta.env.SANITY_API_TOKEN) {
      return new Response(JSON.stringify({ success: true, message: 'Sanity not configured' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await writeClient.patch(commentId).inc({ likes: 1 }).commit();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Failed to like comment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
