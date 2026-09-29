import { describe, expect, test } from "bun:test";

import { normalizeContributionDays } from "./github";

const DAY = 86_400_000;

function calendar(now: Date, activity: Record<string, number>) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const start = today - (364 + now.getUTCDay()) * DAY;
  return Array.from({ length: 365 + now.getUTCDay() }, (_, index) => {
    const date = new Date(start + index * DAY).toISOString().slice(0, 10);
    return { date, contributionCount: activity[date] ?? 0 };
  });
}

describe("public contribution calendar", () => {
  test("keeps yesterday's streak across a Sunday boundary until today finishes", () => {
    const now = new Date("2026-09-27T00:01:00Z");
    const activity = { "2026-09-25": 2, "2026-09-26": 1 };
    const result = normalizeContributionDays(calendar(now, activity), now);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
    expect(result.days[0]?.iso).toBe("2025-09-28");
    expect(result.days.at(-1)).toEqual({
      iso: "2026-10-03",
      count: 0,
      level: 0,
      future: true,
    });
    const tomorrow = new Date("2026-09-28T00:01:00Z");
    expect(normalizeContributionDays(calendar(tomorrow, activity), tomorrow).currentStreak).toBe(0);
  });

  test("separates current streak from longest and retains the specified dither thresholds", () => {
    const now = new Date("2026-09-29T23:59:59Z");
    const activity = {
      "2026-09-20": 1,
      "2026-09-21": 3,
      "2026-09-22": 4,
      "2026-09-23": 7,
      "2026-09-24": 8,
      "2026-09-25": 12,
      "2026-09-26": 13,
      "2026-09-28": 1,
      "2026-09-29": 2,
    };
    const result = normalizeContributionDays(calendar(now, activity), now);
    expect(result.total).toBe(51);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(7);
    expect(
      result.days
        .filter((day) => day.iso >= "2026-09-20" && day.iso <= "2026-09-27")
        .map((day) => day.level),
    ).toEqual([1, 1, 2, 2, 3, 3, 4, 0]);
  });

  test("does not turn a missing historical day into invented zero activity", () => {
    const now = new Date("2026-09-29T12:00:00Z");
    const source = calendar(now, { "2026-09-28": 1 });
    source.splice(source.length - 2, 1);
    expect(() => normalizeContributionDays(source, now)).toThrow(
      "Missing GitHub contribution day: 2026-09-28",
    );
  });
});
