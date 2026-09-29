import { describe, expect, test } from "bun:test";

import { relatedSessions, sessionNeighbors } from "./related-sessions";
import { deriveSession } from "./session";

import type { SessionSource } from "./session";

function session(number: number, fields: Partial<SessionSource> = {}) {
  return deriveSession(
    {
      _id: `session-${number}`,
      slug: `session-${number}`,
      date: `2026-01-${String(number).padStart(2, "0")}`,
      ...fields,
    },
    number,
  );
}

describe("article recommendations", () => {
  test("excludes self and both neighbors even from authored picks, deduplicates and ranks tag overlap before recency", () => {
    const current = session(5, {
      tags: ["code", "systems"],
      relatedIds: [
        "session-5",
        "session-4",
        "session-6",
        "missing",
        "drafts.session-1",
        "session-1",
      ],
    });
    const candidates = [
      current,
      session(1, { relatedIds: [current._id] }),
      session(2, { tags: ["code", "systems"] }),
      session(3, { tags: ["code"], date: "2027-01-01" }),
      session(4, { tags: ["code", "systems"] }),
      session(6, { tags: ["code", "systems"], kind: "tape" }),
      session(7, { tags: ["code", "systems"] }),
    ];
    expect(
      relatedSessions(current, candidates).map(({ session: entry, reason }) => ({
        id: entry._id,
        reason,
      })),
    ).toEqual([
      { id: "session-1", reason: { kind: "picked" } },
      { id: "session-7", reason: { kind: "tag", tag: "code" } },
      { id: "session-2", reason: { kind: "tag", tag: "code" } },
    ]);
  });

  test("does not pad an untagged article with unrelated or unavailable picks", () => {
    const current = session(5, { relatedIds: ["missing", "session-4"] });
    expect(relatedSessions(current, [session(1), session(4), current, session(6)])).toEqual([]);
  });

  test("steps by number across sessions and tapes rather than input order or date", () => {
    const current = session(5, { kind: "tape" });
    const previous = session(4, { date: "2027-01-01" });
    const next = session(6, { kind: "tape", date: "2025-01-01" });
    const entries = [session(8), next, current, session(1), previous];
    expect(sessionNeighbors(current, entries)).toEqual({ previous, next });
    expect(sessionNeighbors(entries[0], entries).next).toBeUndefined();
    expect(sessionNeighbors(entries[3], entries).previous).toBeUndefined();
  });
});
