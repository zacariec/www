import { getSessionBySlug } from "@/lib/sanity/fetch";

import type { APIRoute } from "astro";

export const prerender = false;

// Cloudflare serves generated PNG assets before the Worker. A session published
// since the last image build gets the designed site default until the next build.
export const GET: APIRoute = async ({ params }) => {
  const session = params.slug ? await getSessionBySlug(params.slug) : null;
  if (!session) {
    return new Response("Image not found.", {
      status: 404,
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/og/default.png",
      "Cache-Control": "public, max-age=60",
      "X-Robots-Tag": "noindex",
    },
  });
};
