/**
 * Sliding-window rate limiter backed by D1.
 *
 * Returns `true` if the request is allowed, `false` if rate-limited.
 */
export async function checkRateLimit(
  db: D1Database,
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    const row = await db
      .prepare(`SELECT count, window_start FROM rate_limit WHERE key = ? LIMIT 1`)
      .bind(key)
      .first<{ count: number; window_start: number }>();

    if (!row || row.window_start < windowStart) {
      // No record or window expired — reset
      await db
        .prepare(
          `INSERT INTO rate_limit (key, count, window_start) VALUES (?, 1, ?)
           ON CONFLICT(key) DO UPDATE SET count = 1, window_start = ?`,
        )
        .bind(key, now, now)
        .run();
      return true;
    }

    if (row.count >= maxRequests) {
      return false;
    }

    // Increment
    await db.prepare(`UPDATE rate_limit SET count = count + 1 WHERE key = ?`).bind(key).run();
    return true;
  } catch (err) {
    // Fail open — don't block requests if rate limit table is broken
    console.error("[rate-limit] error:", err);
    return true;
  }
}
