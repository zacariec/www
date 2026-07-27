/**
 * Sanity webhook signature verification.
 *
 * Sanity signs webhooks with an HMAC-SHA256 of `${timestamp}.${rawBody}`
 * using the secret configured on the webhook.
 *
 * Header: `sanity-webhook-signature`
 * Value:  `t=<timestamp_ms>,v1=<base64url_hmac_sha256(payload)>`
 *
 * Docs: https://www.sanity.io/docs/webhooks
 */

const REPLAY_WINDOW_MS = 5 * 60 * 1000;

interface ParsedSignature {
  readonly timestamp: number;
  readonly signature: string;
}

function parseSignatureHeader(header: string): ParsedSignature | undefined {
  const parts = header.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signaturePart = parts.find((part) => part.startsWith("v1="));

  if (timestampPart === undefined || signaturePart === undefined) {
    return undefined;
  }

  const timestamp = Number(timestampPart.slice(2));
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return { timestamp, signature: signaturePart.slice(3) };
}

async function importSecret(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

function fromBase64Url(input: string): ArrayBuffer | undefined {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  try {
    const binary = atob(padded + "=".repeat(padLength));
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return buffer;
  } catch {
    return undefined;
  }
}

export type VerifyResult = { readonly ok: true } | { readonly ok: false; readonly reason: string };

/**
 * Verify a Sanity webhook signature against the raw request body.
 *
 * Caller must pass the raw string body — NOT `JSON.parse`'d — because the
 * HMAC is over the exact bytes Sanity sent, whitespace and all.
 */
export async function verifySanityWebhook(
  header: string | undefined,
  rawBody: string,
  secret: string,
  now: number = Date.now(),
): Promise<VerifyResult> {
  if (header === undefined || header === "") {
    return { ok: false, reason: "missing signature header" };
  }

  const parsed = parseSignatureHeader(header);
  if (parsed === undefined) {
    return { ok: false, reason: "malformed signature header" };
  }

  if (Math.abs(now - parsed.timestamp) > REPLAY_WINDOW_MS) {
    return { ok: false, reason: "signature outside replay window" };
  }

  const providedSignature = fromBase64Url(parsed.signature);
  if (providedSignature === undefined) {
    return { ok: false, reason: "signature is not valid base64url" };
  }

  const key = await importSecret(secret);
  const payload = new TextEncoder().encode(`${parsed.timestamp}.${rawBody}`);
  // crypto.subtle.verify is spec'd to compare in constant time — safer than
  // sign-then-compare and satisfies the no-bitwise lint rule.
  const valid = await crypto.subtle.verify("HMAC", key, providedSignature, payload);

  if (!valid) {
    return { ok: false, reason: "signature mismatch" };
  }

  return { ok: true };
}
