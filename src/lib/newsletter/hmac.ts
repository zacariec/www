const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a time-limited HMAC token for an email address.
 * Format: `hexDigest.expiryTimestamp`
 */
export async function createUnsubscribeToken(
  email: string,
  secret: string,
  ttlMs: number = SEVEN_DAYS_MS,
): Promise<string> {
  const expiry = Date.now() + ttlMs;
  const payload = `${email.toLowerCase()}:${expiry}`;
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${toHex(sig)}.${expiry}`;
}

/**
 * Verify an HMAC unsubscribe token. Returns false if expired or invalid.
 */
export async function verifyUnsubscribeToken(
  email: string,
  token: string,
  secret: string,
): Promise<boolean> {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;
  const digest = token.slice(0, dot);
  const expiry = Number(token.slice(dot + 1));
  if (Number.isNaN(expiry) || expiry < Date.now()) return false;

  const payload = `${email.toLowerCase()}:${expiry}`;
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(sig) === digest;
}

/**
 * Build a full signed unsubscribe URL for use in emails.
 */
export async function buildSignedUnsubscribeUrl(
  email: string,
  siteUrl: string,
  secret: string,
): Promise<string> {
  const token = await createUnsubscribeToken(email, secret);
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/api/newsletter/unsubscribe-token?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
}
