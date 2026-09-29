import { canonicalSessionId } from "./session";

import type { SanitySessionTape } from "./sanity/types";

export interface SessionNeighbors {
  previous?: SanitySessionTape;
  next?: SanitySessionTape;
}

export interface RelatedSession {
  session: SanitySessionTape;
  reason: { kind: "picked" } | { kind: "tag"; tag: string };
}

export function sessionNeighbors(
  current: SanitySessionTape,
  sessions: readonly SanitySessionTape[],
): SessionNeighbors {
  let previous: SanitySessionTape | undefined;
  let next: SanitySessionTape | undefined;
  const currentId = canonicalSessionId(current._id);
  for (const session of sessions) {
    if (!session.slug || canonicalSessionId(session._id) === currentId) continue;
    if (session.number < current.number && (!previous || session.number > previous.number))
      previous = session;
    if (session.number > current.number && (!next || session.number < next.number)) next = session;
  }
  return { previous, next };
}

/** Resolve IDs only against the caller's already-authorized full session list. */
export function relatedSessions(
  current: SanitySessionTape,
  sessions: readonly SanitySessionTape[],
): RelatedSession[] {
  const { previous, next } = sessionNeighbors(current, sessions);
  const excluded = new Set([canonicalSessionId(current._id)]);
  if (previous) excluded.add(canonicalSessionId(previous._id));
  if (next) excluded.add(canonicalSessionId(next._id));
  const candidates = new Map<string, SanitySessionTape>();
  for (const session of sessions) {
    const id = canonicalSessionId(session._id);
    if (
      session.slug &&
      !excluded.has(id) &&
      (!candidates.has(id) || !session._id.startsWith("drafts."))
    )
      candidates.set(id, session);
  }
  const selected: RelatedSession[] = [];
  for (const reference of current.relatedIds ?? []) {
    const id = canonicalSessionId(reference);
    const session = candidates.get(id);
    if (!session) continue;
    selected.push({ session, reason: { kind: "picked" } });
    candidates.delete(id);
    if (selected.length === 3) return selected;
  }
  const tags = new Set(current.tags ?? []);
  if (tags.size === 0) return selected;
  const matches = [...candidates.values()].flatMap((session) => {
    const shared = [...new Set(session.tags ?? [])].filter((tag) => tags.has(tag));
    return shared.length ? [{ session, shared }] : [];
  });
  matches.sort(
    (a, b) =>
      b.shared.length - a.shared.length ||
      b.session.date.localeCompare(a.session.date) ||
      b.session.number - a.session.number ||
      a.session._id.localeCompare(b.session._id),
  );
  for (const { session, shared } of matches.slice(0, 3 - selected.length))
    selected.push({ session, reason: { kind: "tag", tag: shared[0] } });
  return selected;
}
