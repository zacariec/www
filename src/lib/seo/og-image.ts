import type { SanitySiteConfig } from '@/lib/sanity/types';

const OG_W = 1200;
const OG_H = 630;

/** Append Sanity image transform params for OG-shaped previews. */
export function ogImageFromSanityUrl(url: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}w=${OG_W}&h=${OG_H}&fit=crop&auto=format`;
}

export interface OgImage {
  url: string;
  width: number;
  height: number;
  alt?: string;
}

/**
 * Returns an OG-cropped image: prefer the post's own featured image, fall
 * back to the site default. Returns undefined if neither is configured so
 * the layout can omit the og:image tag entirely.
 */
export function pickOgImage(
  postImageUrl: string | undefined,
  config: SanitySiteConfig,
): OgImage | undefined {
  const raw = postImageUrl ?? config.ogImage?.url;
  if (!raw) return undefined;
  return {
    url: ogImageFromSanityUrl(raw),
    width: OG_W,
    height: OG_H,
    alt: config.ogImage?.alt,
  };
}
