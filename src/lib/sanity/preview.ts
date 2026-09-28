import { env } from "cloudflare:workers";

import type { AstroCookies } from "astro";

export const PREVIEW_COOKIE = "__sanity_preview";
const encoder = new TextEncoder();

export async function createPreviewCookie(secret: string, expiresAt: number): Promise<string> {
  const payload = String(expiresAt);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  return `${payload}.${Array.from(signature, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function isPreviewRequest(cookies: AstroCookies): Promise<boolean> {
  const secret = env.SANITY_API_TOKEN;
  const value = cookies.get(PREVIEW_COOKIE)?.value;
  if (!secret || !value) return false;
  const [payload, signature] = value.split(".");
  if (
    !/^\d+$/.test(payload) ||
    !/^[a-f0-9]{64}$/.test(signature ?? "") ||
    Number(payload) <= Date.now()
  )
    return false;
  const signatureParts = signature.match(/.{2}/g);
  if (!signatureParts) return false;
  const bytes = Uint8Array.from(signatureParts, (part) => Number.parseInt(part, 16));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify("HMAC", key, bytes, encoder.encode(payload));
}
