import { postHref } from "@/lib/post";
import { urlFor } from "@/lib/sanity/client";
import { getAllPosts, getSiteConfig } from "@/lib/sanity/fetch";

import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const [sessions, config] = await Promise.all([getAllPosts(), getSiteConfig()]);
  const origin = (config.siteUrl || "https://zcarr.dev").replace(/\/$/, "");
  const replacements: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  };
  const xml = (text: string) => text.replace(/[&<>"']/g, (character) => replacements[character]);
  const items = sessions
    .map((session) => {
      const url = xml(`${origin}${postHref(session)}`);
      let description = session.subtitle || session.excerpt;
      let enclosure = "";
      if (session.kind === "roll") {
        const frames = session.groups.flatMap((group) => group.frames);
        description = [session.dek, ...frames.map((frame) => frame.caption)]
          .filter(Boolean)
          .join("\n\n");
        const image = frames[0]?.image;
        if (image) {
          const imageUrl = image.url || urlFor({ asset: image.asset }).url();
          const extension = image.asset._ref.split("-").at(-1)?.toLowerCase();
          const type =
            image.mimeType || (extension === "jpg" ? "image/jpeg" : `image/${extension}`);
          enclosure = `<enclosure url="${xml(imageUrl)}" length="${image.size ?? 0}" type="${xml(type)}"/>`;
        }
      }
      return `<item><title>${xml(session.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${new Date(session.date).toUTCString()}</pubDate><description>${xml(description)}</description>${enclosure}</item>`;
    })
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(config.siteName)}</title><link>${xml(origin)}</link><description>${xml(config.siteDescription)}</description><language>en</language><atom:link href="${xml(origin)}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`,
    {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
};
