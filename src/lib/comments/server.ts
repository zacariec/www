import { createClient } from "@sanity/client";

import { configuredProviders, getAuth } from "@/lib/auth/auth";
import { COMMENT_PROJECTION } from "@/lib/sanity/queries";
import { apiVersion, dataset, projectId } from "@/sanity/env";

import type { SanityClient } from "@sanity/client";

import type { RuntimeEnv } from "@/lib/auth/auth";
import type { SanityComment } from "@/lib/sanity/types";

export class CommentError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface Reader {
  id: string;
  key: string;
  author: SanityComment["author"];
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function commentFailure(error: unknown) {
  if (error instanceof CommentError) return json({ error: error.message }, error.status);
  console.error(
    "[comments] request failed",
    error instanceof Error ? error.message : "Unknown error",
  );
  return json({ error: "Comments are unavailable. Please try again." }, 503);
}

export function commentsClient(env: RuntimeEnv): SanityClient {
  if (!projectId || !env.SANITY_API_TOKEN)
    throw new CommentError(503, "Comments are not configured yet.");
  return createClient({
    projectId,
    dataset,
    apiVersion,
    token: env.SANITY_API_TOKEN,
    useCdn: false,
    perspective: "published",
  });
}

export function requireSameOrigin(request: Request, env: RuntimeEnv) {
  const expected = new URL(env.SITE_URL ?? env.BETTER_AUTH_URL ?? request.url).origin;
  const origin = request.headers.get("origin");
  // An exact Origin and SameSite session cookies form the mutation CSRF boundary.
  if (!origin || origin !== expected || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new CommentError(403, "This request must come from this site.");
  }
}

export async function requestJson(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json"
  ) {
    throw new CommentError(415, "Send a JSON request.");
  }
  if (!request.body) throw new CommentError(400, "A request body is required.");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      // eslint-disable-next-line no-await-in-loop -- Stream chunks must be consumed in order before enforcing the byte limit.
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 32_768) {
        // eslint-disable-next-line no-await-in-loop -- Cancel this reader before releasing its lock on an oversized body.
        await reader.cancel();
        throw new CommentError(413, "This comment is too long.");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof CommentError) throw error;
    throw new CommentError(400, "Invalid JSON request.");
  } finally {
    reader.releaseLock();
  }
}

async function digest(value: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isAuthor(env: RuntimeEnv, provider: string, providerId: string) {
  if (!env.COMMENT_AUTHOR_IDENTITIES) return false;
  let identities: unknown;
  try {
    identities = JSON.parse(env.COMMENT_AUTHOR_IDENTITIES);
  } catch {
    throw new CommentError(503, "Reader author identities are misconfigured.");
  }
  if (
    !Array.isArray(identities) ||
    !identities.every(
      (value) =>
        value && typeof value.provider === "string" && typeof value.providerId === "string",
    )
  ) {
    throw new CommentError(503, "Reader author identities are misconfigured.");
  }
  return identities.some((value) => value.provider === provider && value.providerId === providerId);
}

export async function getReader(request: Request, env: RuntimeEnv): Promise<Reader | null> {
  if (!env.BETTER_AUTH_SECRET && !env.AUTH_SECRET) return null;
  const session = await getAuth(env).api.getSession({ headers: request.headers });
  if (!session?.user) return null;
  const account = await env.DB.prepare(
    `SELECT a.providerId AS provider, a.accountId AS providerId, p.handle
     FROM account a LEFT JOIN reader_profile p ON p.provider = a.providerId AND p.provider_id = a.accountId
     LEFT JOIN reader_session s ON s.session_id = ?
     WHERE a.userId = ? AND a.providerId IN ('github', 'twitter', 'linkedin', 'google')
       AND (s.session_id IS NULL OR (a.providerId = s.provider AND a.accountId = s.provider_id))
     ORDER BY COALESCE(p.updated_at, a.updatedAt) DESC, a.id ASC LIMIT 1`,
  )
    .bind(session.session.id, session.user.id)
    .first<{ provider: string; providerId: string; handle: string | null }>();
  if (!account) throw new CommentError(403, "Link a supported reader account to comment.");
  const key = await digest(`reader:${session.user.id}`);
  // Old Google/GitHub accounts remain valid before their first post-migration sign-in.
  // Display names are never identities, and email-looking names are not made public.
  const name = account.handle || session.user.name;
  const handle = name && !name.includes("@") ? name.slice(0, 100) : "reader";
  return {
    id: session.user.id,
    key,
    author: {
      provider: account.provider,
      providerId: account.providerId,
      handle,
      avatarSeed: Number.parseInt(key.slice(0, 8), 16),
      isAuthor: isAuthor(env, account.provider, account.providerId),
    },
  };
}

export async function requireReader(request: Request, env: RuntimeEnv) {
  if (!env.BETTER_AUTH_SECRET && !env.AUTH_SECRET)
    throw new CommentError(503, "Reader sign-in is not configured yet.");
  const reader = await getReader(request, env);
  if (!reader) throw new CommentError(401, "Sign in to comment.");
  return reader;
}

export async function limitMutation(
  request: Request,
  env: RuntimeEnv,
  reader: Reader,
  action: "post" | "like",
) {
  const now = Date.now();
  const ip = request.headers.get("cf-connecting-ip") ?? new URL(request.url).hostname;
  const keys = [`comment:${action}:user:${reader.key}`, `comment:${action}:ip:${await digest(ip)}`];
  const limits = action === "post" ? [5, 20] : [30, 90];
  // A single SQLite UPSERT is atomic even for simultaneous requests. Fail closed.
  const results = await env.DB.batch<{ count: number }>(
    keys.map((key) =>
      env.DB.prepare(
        `INSERT INTO rate_limit (key, count, window_start) VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN window_start <= ? THEN 1 ELSE count + 1 END,
       window_start = CASE WHEN window_start <= ? THEN excluded.window_start ELSE window_start END
     RETURNING count`,
      ).bind(key, now, now - 60_000, now - 60_000),
    ),
  );
  if (
    results.some(
      (result, index) =>
        !result.success || (result.results?.[0]?.count ?? Infinity) > limits[index],
    )
  ) {
    throw new CommentError(429, "Too many requests. Please wait a minute.");
  }
}

export async function requireSession(client: SanityClient, id: string) {
  const session = await client.fetch<{
    _id: string;
    slug: string;
    content: { _type: string; style?: string; listItem?: string }[] | null;
  } | null>(
    `*[_type == "sessionTape" && _id == $id && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && publishedAt <= now()][0]{_id, "slug": slug.current, content[]{_type, style, listItem}}`,
    { id },
  );
  if (!session) throw new CommentError(404, "Session not found.");
  return {
    ...session,
    paragraphCount: (session.content ?? []).filter(
      (block) =>
        block._type === "block" && (!block.style || block.style === "normal") && !block.listItem,
    ).length,
  };
}

export async function visibleComments(
  client: SanityClient,
  session: string,
  readerKey: string | null,
) {
  const rows = await client.fetch<SanityComment[]>(
    `*[_type == "comment" && session._ref == $session && (status == "approved" || (status == "pending" && defined($readerKey) && readerId == $readerKey))] | order(createdAt asc, _id asc) {${COMMENT_PROJECTION}}`,
    { session, readerKey },
  );
  // Do not expose descendants of a hidden/private parent. Also reject corrupt cycles.
  const byId = new Map(rows.map((comment) => [comment._id, comment]));
  return rows.filter((comment) => {
    const seen = new Set([comment._id]);
    let { parent } = comment;
    while (parent) {
      if (seen.has(parent)) return false;
      seen.add(parent);
      const ancestor = byId.get(parent);
      if (!ancestor) return false;
      parent = ancestor.parent;
    }
    return true;
  });
}

export async function threadPayload(
  client: SanityClient,
  session: string,
  reader: Reader | null,
  env: RuntimeEnv,
) {
  const comments = await visibleComments(client, session, reader?.key ?? null);
  const likedIds = reader
    ? await client.fetch<string[]>(
        `*[_type == "comment" && _id in $ids && $readerKey in likedBy]._id`,
        { ids: comments.map((comment) => comment._id), readerKey: reader.key },
      )
    : [];
  return {
    comments,
    viewer: reader ? { author: reader.author } : null,
    providers: configuredProviders(env),
    likedIds,
  };
}
