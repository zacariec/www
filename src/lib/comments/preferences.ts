import { CommentError, showReaderAnchors } from "@/lib/comments/server";

import type { SanityClient } from "@sanity/client";

import type { RuntimeEnv } from "@/lib/auth/auth";
import type { Reader } from "@/lib/comments/server";

export const OWNED_COMMENTS = `_type == "comment" && readerId == $readerKey && !(_id in path("drafts.**")) && !(_id in path("versions.**"))`;

export async function accountPreferences(client: SanityClient, env: RuntimeEnv, reader: Reader) {
  const [row, showAnchors, commentCount] = await Promise.all([
    env.DB.prepare("SELECT reply_notifications FROM reader_preferences WHERE user_id = ?")
      .bind(reader.id)
      .first<{ reply_notifications: number }>(),
    showReaderAnchors(client, reader.key),
    client.fetch<number>(`count(*[${OWNED_COMMENTS}])`, { readerKey: reader.key }),
  ]);
  return { replyNotifications: row?.reply_notifications === 1, showAnchors, commentCount };
}

export async function saveAccountPreferences(
  client: SanityClient,
  env: RuntimeEnv,
  reader: Reader,
  patch: { replyNotifications?: boolean; showAnchors?: boolean },
) {
  if (patch.replyNotifications === true) {
    if (!env.RESEND_API_KEY || !env.COMMENT_WEBHOOK_SECRET) {
      throw new CommentError(
        503,
        "Reply emails are not configured yet. Your setting was not changed.",
      );
    }
    const user = await env.DB.prepare("SELECT emailVerified FROM user WHERE id = ?")
      .bind(reader.id)
      .first<{ emailVerified: number }>();
    if (user?.emailVerified !== 1) {
      throw new CommentError(403, "A verified account email is required for reply notifications.");
    }
  }
  // Sanity is the authoritative anchor-display store. Its live projection covers every
  // old and new comment without destructive edits to the underlying paragraph relation.
  if (patch.showAnchors !== undefined) {
    await client.createOrReplace({
      _id: `readerPreferences.${reader.key}`,
      _type: "readerPreferences",
      showAnchors: patch.showAnchors,
    });
  }
  if (patch.replyNotifications !== undefined) {
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO reader_preferences
      (user_id, reader_key, reply_notifications, notification_enabled_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        reply_notifications = excluded.reply_notifications,
        notification_enabled_at = CASE
          WHEN excluded.reply_notifications = 0 THEN NULL
          WHEN reader_preferences.reply_notifications = 1 THEN reader_preferences.notification_enabled_at
          ELSE excluded.notification_enabled_at END,
        updated_at = excluded.updated_at`,
    )
      .bind(
        reader.id,
        reader.key,
        patch.replyNotifications ? 1 : 0,
        patch.replyNotifications ? now : null,
        now,
      )
      .run();
  }
  return accountPreferences(client, env, reader);
}
