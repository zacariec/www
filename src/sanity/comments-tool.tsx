import { useState } from "react";
import { useClient, useCurrentUser } from "sanity";
import { sessionId } from "../lib/session";
import { StudioCanvas } from "./studio-components";
import type { SessionViewProps } from "./studio-components";
import { blockText, canonicalId, identitySeed, paragraphs, useStudioData } from "./studio-data";
import type { StudioComment } from "./studio-data";

type Queue = "pending" | "approved" | "hidden";
export function CommentsTool() {
  return <CommentsQueue />;
}

function CommentsQueue({ session }: { session?: string }) {
  const { comments, sessions, derivedSessions, config, loading, error, refresh } = useStudioData();
  const [queue, setQueue] = useState<Queue>("pending");
  const available = session ? comments.filter((comment) => comment.session === session) : comments;
  const selected = available
    .filter((comment) => comment.status === queue)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups = new Map<string, StudioComment[]>();
  for (const comment of selected) {
    const group = groups.get(comment.session) ?? [];
    group.push(comment);
    groups.set(comment.session, group);
  }
  return (
    <section className="zc-studio-tool">
      <header className="zc-tool-heading">
        <h1>Comments</h1>
        <span className="zc-studio-meta">{available.length} replies</span>
      </header>
      <div className="zc-queue-tabs" role="group" aria-label="Comment queue">
        {(["pending", "approved", "hidden"] as const).map((status) => (
          <button
            type="button"
            key={status}
            aria-pressed={queue === status}
            onClick={() => setQueue(status)}
          >
            {status} <span>{available.filter((comment) => comment.status === status).length}</span>
          </button>
        ))}
      </div>
      {loading && <p role="status">Loading comments…</p>}
      {error && (
        <p role="alert">
          {error}{" "}
          <button type="button" onClick={() => void refresh()}>
            Retry
          </button>
        </p>
      )}
      {!loading && !error && !selected.length && <p>No {queue} comments.</p>}
      {[...groups].map(([id, group]) => {
        const raw = sessions.find((item) => canonicalId(item._id) === id);
        const derived = derivedSessions.find((item) => item._id === id);
        const content = paragraphs(raw?.content);
        return (
          <section className="zc-comment-group" key={id}>
            <h2>
              {derived ? `${sessionId(derived.number)} · ` : ""}
              {raw?.title ?? "Unavailable session"}
            </h2>
            {group.map((comment) => (
              <ModerationCard
                key={comment._id}
                comment={comment}
                quote={comment.anchorIndex ? blockText(content[comment.anchorIndex - 1]) : ""}
                authorSanityId={config?.authorSanityId}
              />
            ))}
          </section>
        );
      })}
    </section>
  );
}

function ModerationCard({
  comment,
  quote,
  authorSanityId,
}: {
  comment: StudioComment;
  quote: string;
  authorSanityId?: string;
}) {
  const client = useClient({ apiVersion: "2026-03-26" });
  const currentUser = useCurrentUser();
  const { refresh } = useStudioData();
  const [busy, setBusy] = useState(false);
  const [replying, setReplying] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isOwner = Boolean(authorSanityId && currentUser?.id === authorSanityId);
  async function moderate(status: Queue) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await client.patch(comment._id).ifRevisionId(comment._rev).set({ status }).commit();
      setNotice(`Comment ${status}.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }
  async function reply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isOwner || !currentUser || !body.trim() || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const text = body.trim().replace(/\r\n?/g, "\n");
      if (text.length > 5000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text))
        throw new Error(
          "Reply must be plain text, at most 5000 characters, without control characters.",
        );
      // Re-read identity configuration and the parent before granting AUTHOR.
      const current = await client.fetch<{
        owner: string | null;
        parent: { status: string; session: string; anchorIndex: number | null } | null;
      }>(
        `{
        "owner": *[_type == "siteConfig" && !(_id in path("drafts.**"))][0].authorSanityId,
        "parent": *[_id == $id][0]{status,"session":session._ref,anchorIndex}
      }`,
        { id: comment._id },
        { perspective: "published" },
      );
      if (current.owner !== currentUser.id)
        throw new Error(
          "Set your current Sanity user ID as Site Config → Author Sanity ID and publish it before replying as author.",
        );
      if (!current.parent || current.parent.status !== "approved")
        throw new Error("Approve this comment before replying as author.");
      await client.create({
        _type: "comment",
        session: { _type: "reference", _ref: current.parent.session },
        parent: { _type: "reference", _ref: comment._id },
        anchorIndex: current.parent.anchorIndex ?? null,
        body: text,
        status: "approved",
        likes: 0,
        createdAt: new Date().toISOString(),
        author: {
          provider: "sanity",
          providerId: currentUser.id,
          handle: currentUser.name || currentUser.id,
          avatarSeed: identitySeed(currentUser.id),
          isAuthor: true,
        },
      });
      setBody("");
      setReplying(false);
      setNotice("Author reply published.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="zc-studio-window zc-moderation-card">
      <header>
        <StudioCanvas kind="cover" seed={comment.author.avatarSeed} />
        <strong>{comment.author.handle}</strong>
        {comment.author.isAuthor && <span className="zc-author-badge">AUTHOR</span>}
        <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
        <span>
          {comment.anchorIndex
            ? `on ¶${String(comment.anchorIndex).padStart(2, "0")}`
            : "whole session"}
        </span>
      </header>
      <div className="zc-window-body">
        {comment.anchorIndex && (
          <blockquote>
            {quote || "The anchored paragraph is no longer present in the current document."}
          </blockquote>
        )}
        <p className="zc-comment-body">{comment.body}</p>
        <div className="zc-tool-actions">
          <button
            type="button"
            disabled={busy || comment.status === "approved"}
            onClick={() => void moderate("approved")}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy || comment.status === "hidden"}
            onClick={() => void moderate("hidden")}
          >
            Hide
          </button>
          <button
            type="button"
            disabled={busy || !isOwner || comment.status !== "approved"}
            onClick={() => setReplying(!replying)}
            aria-expanded={replying}
          >
            Reply as author
          </button>
        </div>
        {!isOwner && (
          <p className="zc-studio-meta">
            {authorSanityId
              ? "Author replies are reserved for the Sanity account named in Site Config."
              : `Publish Site Config → Author Sanity ID to enable author replies. Your user ID: ${currentUser?.id ?? "not signed in"}.`}
          </p>
        )}
        {replying && (
          <form onSubmit={reply}>
            <label className="zc-studio-field">
              Reply as {currentUser?.name}
              <textarea
                required
                maxLength={5000}
                value={body}
                onChange={(event) => setBody(event.currentTarget.value)}
                rows={4}
              />
            </label>
            <button type="submit" disabled={busy || !body.trim()}>
              {busy ? "Publishing…" : "Publish reply"}
            </button>
          </form>
        )}
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
      </div>
    </article>
  );
}

export function SessionThreadPane({ document }: SessionViewProps) {
  return <CommentsQueue session={canonicalId(String(document.displayed._id ?? ""))} />;
}
