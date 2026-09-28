import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { z } from "zod";

import { authClient } from "@/lib/auth/client";
import { publicCommentSchema, threadResponseSchema } from "@/lib/schemas/comment";
import { scan } from "@/lib/zc-gl";
import "@/styles/thread.css";

import type { ReactElement } from "react";

import type { ReaderProvider } from "@/lib/auth/auth";
import type { SanityComment } from "@/lib/sanity/types";

interface ThreadProps {
  sessionId: string;
  slug: string;
  paragraphCount: number;
  initialComments: SanityComment[];
}

interface AnchorIntent {
  anchorIndex: number;
  body?: string;
  submit?: boolean;
}

interface Viewer {
  author: SanityComment["author"];
}

const PROVIDER_LABELS: Record<string, string> = {
  github: "GitHub",
  twitter: "X",
  linkedin: "LinkedIn",
  google: "Google",
};
const PRIMARY_PROVIDERS: ReaderProvider[] = ["github", "twitter", "linkedin"];
const errorSchema = z.object({ error: z.string() });
const postResponseSchema = z.object({ comment: publicCommentSchema });
const likeResponseSchema = z.object({ likes: z.number().int().nonnegative(), liked: z.boolean() });
const draftSchema = z.object({
  body: z.string(),
  anchor: z.number().int().positive().nullable(),
  parent: z.string().nullable(),
});
const anchorIntentSchema = z.object({
  anchorIndex: z.number().int().positive(),
  body: z.string().optional(),
  submit: z.boolean().optional(),
});

async function responseData(response: Response): Promise<unknown> {
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = errorSchema.safeParse(data);
    throw new Error(error.success ? error.data.error : "The request failed. Please try again.");
  }
  return data;
}

function relativeTime(date: string, now: number | null) {
  if (now === null)
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  const minutes = Math.max(0, Math.floor((now - new Date(date).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

export function Thread({ sessionId, slug, paragraphCount, initialComments }: ThreadProps) {
  const [comments, setComments] = useState(initialComments);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [providers, setProviders] = useState<ReaderProvider[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [likingIds, setLikingIds] = useState<Set<string>>(() => new Set());
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(() => new Set());
  const [body, setBody] = useState("");
  const [anchor, setAnchor] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [authPending, setAuthPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [queuedPost, setQueuedPost] = useState<AnchorIntent | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const replyComposer = useRef<HTMLTextAreaElement>(null);
  const postingLock = useRef(false);
  const likeLocks = useRef(new Set<string>());
  const loadSequence = useRef(0);
  const draftKey = `zc:comment-draft:${slug}`;

  const reportActionFailure = useCallback((failure: unknown) => {
    setError(failure instanceof Error ? failure.message : "The action failed. Please try again.");
  }, []);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const sequence = ++loadSequence.current;
      const response = await fetch(`/api/comments?session=${encodeURIComponent(sessionId)}`, {
        credentials: "same-origin",
        cache: "no-store",
        signal,
      });
      const data = threadResponseSchema.parse(await responseData(response));
      if (sequence !== loadSequence.current || signal?.aborted) return;
      setComments(data.comments);
      setViewer(data.viewer);
      setProviders(data.providers);
      setLikedIds(new Set(data.likedIds));
    },
    [sessionId],
  );

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal)
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : "Could not load the thread.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    scan();
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [refresh]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("zc:comments-updated", { detail: { comments } }));
  }, [comments]);

  useEffect(() => {
    if (replyingTo) replyComposer.current?.focus();
  }, [replyingTo]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) {
        const parsed = draftSchema.safeParse(JSON.parse(saved));
        if (parsed.success) {
          if (parsed.data.parent) {
            setReplyingTo(parsed.data.parent);
            setReplyBody(parsed.data.body);
          } else {
            setBody(parsed.data.body);
            setAnchor(
              parsed.data.anchor && parsed.data.anchor <= paragraphCount
                ? parsed.data.anchor
                : null,
            );
          }
        }
        sessionStorage.removeItem(draftKey);
      }
    } catch {
      /* Private browsing may disable storage; the live draft remains usable. */
    }
    if (new URLSearchParams(window.location.search).has("error")) {
      setError("Sign-in did not complete. Please try again with a configured provider.");
    }
    const apply = (intent: AnchorIntent) => {
      if (
        !Number.isInteger(intent.anchorIndex) ||
        intent.anchorIndex < 1 ||
        intent.anchorIndex > paragraphCount
      )
        return;
      setAnchor(intent.anchorIndex);
      if (typeof intent.body === "string") setBody(intent.body);
      if (intent.submit && intent.body?.trim()) setQueuedPost(intent);
      composer.current?.focus({ preventScroll: true });
    };
    const onAnchor = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const parsed = anchorIntentSchema.safeParse(event.detail);
      if (parsed.success) apply(parsed.data);
      delete document.documentElement.dataset.commentAnchor;
      delete document.documentElement.dataset.commentDraft;
      delete document.documentElement.dataset.commentSubmit;
    };
    const root = document.documentElement;
    if (root.dataset.commentAnchor) {
      apply({
        anchorIndex: Number(root.dataset.commentAnchor),
        body: root.dataset.commentDraft,
        submit: root.dataset.commentSubmit === "true",
      });
    }
    delete root.dataset.commentAnchor;
    delete root.dataset.commentDraft;
    delete root.dataset.commentSubmit;
    window.addEventListener("zc:comment-anchor", onAnchor);
    return () => window.removeEventListener("zc:comment-anchor", onAnchor);
  }, [draftKey, paragraphCount]);

  const post = useCallback(
    async (text: string, targetAnchor: number | null, parent: string | null) => {
      if (!text.trim() || postingLock.current) return;
      if (!viewer) {
        setStatus("Sign in to post your comment. Your draft is kept here.");
        composer.current?.focus();
        return;
      }
      postingLock.current = true;
      setPosting(true);
      setError("");
      setStatus("");
      const id = `optimistic-${crypto.randomUUID()}`;
      const optimistic: SanityComment = {
        _id: id,
        session: sessionId,
        anchorIndex: targetAnchor,
        parent,
        body: text.trim(),
        author: viewer.author,
        status: "pending",
        likes: 0,
        createdAt: new Date().toISOString(),
      };
      setOptimisticIds((ids) => new Set([...ids, id]));
      setComments((rows) => [...rows, optimistic]);
      // Any GET started before this mutation must not overwrite the optimistic row.
      loadSequence.current++;
      try {
        const response = await fetch("/api/comments", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session: sessionId,
            body: text,
            anchorIndex: targetAnchor,
            parent,
          }),
        });
        const data = postResponseSchema.parse(await responseData(response));
        setComments((rows) => rows.map((row) => (row._id === id ? data.comment : row)));
        if (parent) {
          setReplyBody("");
          setReplyingTo(null);
        } else setBody("");
        setStatus(
          data.comment.status === "pending"
            ? "Your comment is awaiting approval. Only you can see it for now."
            : "Comment posted.",
        );
        try {
          await refresh();
        } catch {
          setError(
            "Your comment was posted, but the thread could not refresh. Reload to check for replies.",
          );
        }
      } catch (failure) {
        setComments((rows) => rows.filter((row) => row._id !== id));
        setError(
          failure instanceof Error
            ? failure.message
            : "Your comment was not posted. Please try again.",
        );
      } finally {
        setOptimisticIds((ids) => {
          const next = new Set(ids);
          next.delete(id);
          return next;
        });
        postingLock.current = false;
        setPosting(false);
      }
    },
    [refresh, sessionId, viewer],
  );

  useEffect(() => {
    if (!queuedPost || loading) return;
    setQueuedPost(null);
    post(queuedPost.body ?? "", queuedPost.anchorIndex, null).catch(reportActionFailure);
  }, [loading, post, queuedPost, reportActionFailure]);

  const signIn = async (provider: ReaderProvider) => {
    setAuthPending(true);
    setError("");
    try {
      const reply =
        replyingTo && replyBody.trim()
          ? comments.find((comment) => comment._id === replyingTo)
          : null;
      const draft = reply
        ? { body: replyBody, anchor: reply.anchorIndex, parent: reply._id }
        : { body, anchor, parent: null };
      try {
        sessionStorage.setItem(draftKey, JSON.stringify(draft));
      } catch {
        /* OAuth still works without draft persistence. */
      }
      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.delete("error");
      returnUrl.searchParams.delete("error_description");
      returnUrl.hash = "";
      const result = await authClient.signIn.social({
        provider,
        callbackURL: `${returnUrl.href}#thread`,
        errorCallbackURL: returnUrl.href,
      });
      if (result.error) throw new Error(result.error.message ?? "Sign-in failed.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sign-in failed. Please try again.");
    } finally {
      setAuthPending(false);
    }
  };

  const signOut = async () => {
    setAuthPending(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message ?? "Sign-out failed.");
      setViewer(null);
      setLikedIds(new Set());
      setComments((rows) => rows.filter((comment) => comment.status === "approved"));
      setStatus("Signed out.");
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sign-out failed.");
    } finally {
      setAuthPending(false);
    }
  };

  const like = async (comment: SanityComment) => {
    if (!viewer) {
      setStatus("Sign in to like a comment.");
      composer.current?.focus();
      return;
    }
    if (likedIds.has(comment._id) || likeLocks.current.has(comment._id)) return;
    likeLocks.current.add(comment._id);
    setLikingIds((ids) => new Set([...ids, comment._id]));
    setLikedIds((ids) => new Set([...ids, comment._id]));
    setComments((rows) =>
      rows.map((row) => (row._id === comment._id ? { ...row, likes: row.likes + 1 } : row)),
    );
    setError("");
    loadSequence.current++;
    try {
      const response = await fetch(`/api/comments/${encodeURIComponent(comment._id)}/like`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = likeResponseSchema.parse(await responseData(response));
      setComments((rows) =>
        rows.map((row) => (row._id === comment._id ? { ...row, likes: data.likes } : row)),
      );
      try {
        await refresh();
      } catch {
        setError("Your like was saved, but the thread could not refresh.");
      }
    } catch (failure) {
      setLikedIds((ids) => {
        const next = new Set(ids);
        next.delete(comment._id);
        return next;
      });
      setComments((rows) =>
        rows.map((row) => (row._id === comment._id ? { ...row, likes: comment.likes } : row)),
      );
      setError(failure instanceof Error ? failure.message : "Could not save your like.");
    } finally {
      likeLocks.current.delete(comment._id);
      setLikingIds((ids) => {
        const next = new Set(ids);
        next.delete(comment._id);
        return next;
      });
    }
  };

  const children = useMemo(() => {
    const grouped = new Map<string | null, SanityComment[]>();
    const ids = new Set(comments.map((comment) => comment._id));
    for (const comment of comments) {
      const parent = comment.parent && ids.has(comment.parent) ? comment.parent : null;
      const siblings = grouped.get(parent) ?? [];
      siblings.push(comment);
      grouped.set(parent, siblings);
    }
    return grouped;
  }, [comments]);

  const renderComment = (comment: SanityComment, ancestors: string[] = []): ReactElement | null => {
    if (ancestors.includes(comment._id)) return null;
    const optimistic = optimisticIds.has(comment._id);
    const replies = children.get(comment._id) ?? [];
    const paragraph =
      comment.anchorIndex === null ? null : `¶${String(comment.anchorIndex).padStart(2, "0")}`;
    return (
      <li key={comment._id} className="thread-item" id={`comment-${comment._id}`}>
        <article aria-busy={optimistic} className="thread-comment">
          <header className="thread-comment__header">
            <canvas
              aria-hidden="true"
              className="thread-avatar"
              data-bg={comment.author.isAuthor ? "--pink" : "--paper"}
              data-fg="--ink"
              data-seed={comment.author.avatarSeed}
              data-zc="cover"
              height={32}
              width={32}
            />
            <span className="thread-handle">@{comment.author.handle.replace(/^@/, "")}</span>
            {comment.author.isAuthor ? <span className="thread-author">AUTHOR</span> : null}
            <time dateTime={comment.createdAt} title={new Date(comment.createdAt).toUTCString()}>
              {relativeTime(comment.createdAt, now)}
            </time>
            <span className="thread-comment__anchor">on {paragraph ?? "whole session"}</span>
          </header>
          <p className="thread-comment__body">{comment.body}</p>
          {comment.status === "pending" && (
            <p className="thread-pending">
              {optimistic ? "Posting…" : "Awaiting approval · visible only to you"}
            </p>
          )}
          <footer className="thread-comment__actions">
            <button
              aria-label={`${likedIds.has(comment._id) ? "Liked" : "Like comment"}, ${comment.likes} likes`}
              aria-pressed={likedIds.has(comment._id)}
              disabled={optimistic || likingIds.has(comment._id) || likedIds.has(comment._id)}
              type="button"
              onClick={() => {
                like(comment).catch(reportActionFailure);
              }}
            >
              ♥ {comment.likes}
            </button>
            <button
              aria-expanded={replyingTo === comment._id}
              disabled={optimistic}
              type="button"
              onClick={() => {
                setReplyingTo(replyingTo === comment._id ? null : comment._id);
                setReplyBody("");
              }}
            >
              Reply
            </button>
            {paragraph ? (
              <a
                href={`#p${comment.anchorIndex}`}
                onClick={(event) => {
                  event.preventDefault();
                  window.dispatchEvent(
                    new CustomEvent("zc:paragraph-jump", {
                      detail: { anchorIndex: comment.anchorIndex },
                    }),
                  );
                }}
              >
                Jump to {paragraph} ↑
              </a>
            ) : null}
          </footer>
          {replyingTo === comment._id && (
            <form
              className="thread-inline-reply"
              onSubmit={(event) => {
                event.preventDefault();
                post(replyBody, comment.anchorIndex, comment._id).catch(reportActionFailure);
              }}
            >
              <label htmlFor={`reply-${comment._id}`}>
                <span>Reply to @{comment.author.handle.replace(/^@/, "")}</span>
                <textarea
                  ref={replyComposer}
                  aria-describedby="thread-feedback"
                  id={`reply-${comment._id}`}
                  maxLength={5000}
                  onChange={(event) => setReplyBody(event.target.value)}
                  rows={3}
                  value={replyBody}
                />
              </label>
              <div className="thread-inline-reply__buttons">
                <button disabled={!replyBody.trim() || posting || !viewer} type="submit">
                  {posting ? "Posting…" : "Post ↵"}
                </button>
                {!viewer && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatus(
                        "Sign in above, then return to this reply. Your draft is kept here.",
                      );
                      composer.current?.focus();
                    }}
                  >
                    Sign in to reply
                  </button>
                )}
                <button onClick={() => setReplyingTo(null)} type="button">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </article>
        {replies.length > 0 && (
          <ol className="thread-replies">
            {replies.map((reply) => renderComment(reply, [...ancestors, comment._id]))}
          </ol>
        )}
      </li>
    );
  };

  return (
    <section aria-labelledby="thread-title" className="thread-section" id="thread">
      <canvas
        aria-hidden="true"
        className="thread-blot"
        data-bg="transparent"
        data-fg="--pink"
        data-seed="93"
        data-zc="blot"
        height={280}
        width={340}
      />
      <div className="thread-inner">
        <header className="thread-heading">
          <span>[05]</span>
          <h2 id="thread-title">Thread ({comments.length})</h2>
        </header>
        <div className="thread-layout">
          <div className="thread-composer">
            <div className="thread-window-title">
              Reply 1.0 — new comment <span aria-hidden="true">↳</span>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                post(body, anchor, null).catch(reportActionFailure);
              }}
            >
              <label className="thread-anchor-select" htmlFor="thread-anchor">
                <span>Anchor</span>
                <select
                  aria-label="Comment anchor"
                  id="thread-anchor"
                  value={anchor ?? ""}
                  onChange={(event) =>
                    setAnchor(event.target.value ? Number(event.target.value) : null)
                  }
                >
                  <option value="">Whole session</option>
                  {Array.from({ length: paragraphCount }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      ¶{String(index + 1).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="thread-draft">
                <span className="thread-visually-hidden">Your comment</span>
                <textarea
                  ref={composer}
                  aria-describedby="thread-feedback"
                  id="thread-draft"
                  maxLength={5000}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Say the thing"
                  rows={6}
                  value={body}
                />
              </label>
              {viewer ? (
                <>
                  <div className="thread-reader">
                    <span>
                      ✓ @{viewer.author.handle.replace(/^@/, "")} via{" "}
                      {PROVIDER_LABELS[viewer.author.provider] ?? viewer.author.provider}
                    </span>
                    <button
                      disabled={authPending || posting}
                      type="button"
                      onClick={() => {
                        signOut().catch(reportActionFailure);
                      }}
                    >
                      sign out
                    </button>
                  </div>
                  <button
                    className="thread-post"
                    disabled={!body.trim() || posting || authPending}
                    type="submit"
                  >
                    {posting ? "Posting…" : "Post ↵"}
                  </button>
                </>
              ) : (
                <div className="thread-signin">
                  {PRIMARY_PROVIDERS.map((provider) => (
                    <button
                      key={provider}
                      disabled={loading || authPending || !providers.includes(provider)}
                      type="button"
                      onClick={() => {
                        signIn(provider).catch(reportActionFailure);
                      }}
                      title={
                        !loading && !providers.includes(provider)
                          ? `${PROVIDER_LABELS[provider]} sign-in is not configured`
                          : undefined
                      }
                    >
                      {provider === "github" ? "Sign in with GitHub" : PROVIDER_LABELS[provider]}
                    </button>
                  ))}
                </div>
              )}
              {!viewer && providers.includes("google") && (
                <details className="thread-google">
                  <summary>Existing Google reader account?</summary>
                  <button
                    disabled={authPending}
                    type="button"
                    onClick={() => {
                      signIn("google").catch(reportActionFailure);
                    }}
                  >
                    Continue with Google
                  </button>
                </details>
              )}
              <p className="thread-hint">
                Plain text. Or click any ¶ number in the session to highlight or comment on that
                paragraph.
              </p>
              <div className="thread-feedback" id="thread-feedback">
                {loading ? <p role="status">Loading reader sign-in…</p> : null}
                {!loading && !viewer && !error && providers.length === 0 && (
                  <p role="status">Reader sign-in is not configured yet.</p>
                )}
                {status ? <p role="status">{status}</p> : null}
                {error ? <p role="alert">{error}</p> : null}
                {error ? (
                  <button
                    disabled={loading}
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      setError("");
                      refresh()
                        .catch((failure: unknown) =>
                          setError(
                            failure instanceof Error
                              ? failure.message
                              : "Could not refresh the thread.",
                          ),
                        )
                        .finally(() => setLoading(false));
                    }}
                  >
                    Refresh thread
                  </button>
                ) : null}
              </div>
            </form>
          </div>
          <div aria-label="Comments" className="thread-list">
            {comments.length === 0 ? (
              <p className="thread-empty">Nobody&apos;s said anything yet.</p>
            ) : (
              <ol>{(children.get(null) ?? []).map((comment) => renderComment(comment))}</ol>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
