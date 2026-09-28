import { getAuth } from "@/lib/auth/auth";

import type { RuntimeEnv } from "@/lib/auth/auth";

export function newsletterJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function newsletterSameOrigin(request: Request): boolean {
  return request.headers.get("Origin") === new URL(request.url).origin;
}

export async function newsletterIdentity(
  env: RuntimeEnv,
  request: Request,
): Promise<string | Response> {
  const session = await getAuth(env).api.getSession({ headers: request.headers });
  if (!session?.user?.email) {
    return newsletterJson({ error: "Sign in to manage newsletter preferences" }, 401);
  }
  if (!session.user.emailVerified) {
    return newsletterJson(
      { error: "A verified sign-in email is required to manage newsletter preferences" },
      403,
    );
  }
  return session.user.email.toLowerCase();
}
