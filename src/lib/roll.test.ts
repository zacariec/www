import { describe, expect, test } from "bun:test";

import { postHref, postNeighbors } from "./post";
import { deriveRoll, deriveRolls, rollView } from "./roll";
import { deriveSession } from "./session";

import type { RollFrame } from "./sanity/types";

function frames(count: number): RollFrame[] {
  return Array.from({ length: count }, (_, index) => ({
    _key: `frame-${index}`,
    image: { asset: { _ref: "image-test-1600x1000-jpg" } },
    alt: `Photo ${index + 1}`,
    size: "half",
    aspect: "3:2",
  }));
}

describe("roll numbering and grouping", () => {
  test("continuous frame identities survive non-day groups with no captions or dates", () => {
    const roll = deriveRoll({
      _id: "roll",
      groupLabel: "Set",
      groups: [
        { _key: "one", title: "Morning", frames: frames(3) },
        { _key: "two", title: "Evening", frames: frames(2) },
      ],
    });
    const view = rollView(roll);
    expect(view.grouped).toBe(true);
    expect(view.label).toBe("Set");
    expect(view.frames.map((frame) => [frame.index, frame.number, frame.groupTitle])).toEqual([
      [0, "01", "Morning"],
      [1, "02", "Morning"],
      [2, "03", "Morning"],
      [3, "04", "Evening"],
      [4, "05", "Evening"],
    ]);
    expect(roll.frameCount).toBe(5);
    expect(view.groups.map((group) => [group.start, group.end])).toEqual([
      ["01", "03"],
      ["04", "05"],
    ]);
  });

  test("only route splits an untitled group, preserving every frame once including final partial sets", () => {
    const roll = deriveRoll({ _id: "roll", groups: [{ _key: "loose", frames: frames(13) }] });
    for (const layout of ["sheet", "stream", "strip", "route"] as const) {
      const view = rollView({ ...roll, layout });
      expect(view.grouped).toBe(false);
      expect(view.groups.flatMap((group) => group.frames.map((frame) => frame.number))).toEqual(
        Array.from({ length: 13 }, (_, index) => String(index + 1).padStart(2, "0")),
      );
      expect(view.groups.map((group) => [group.start, group.end])).toEqual(
        layout === "route"
          ? [
              ["01", "04"],
              ["05", "08"],
              ["09", "12"],
              ["13", "13"],
            ]
          : [["01", "13"]],
      );
    }
    const single = rollView(
      deriveRoll({ _id: "single", layout: "route", groups: [{ _key: "one", frames: frames(1) }] }),
    );
    expect(single.groups[0].frames[0].number).toBe("01");
    expect(single.groups[0].end).toBe("01");
  });

  test("a titled single group is grouped and draft date edits retain published chronology", () => {
    expect(
      rollView(
        deriveRoll({
          _id: "titled",
          groups: [{ _key: "one", title: "Only set", frames: frames(1) }],
        }),
      ).grouped,
    ).toBe(true);
    const rolls = deriveRolls([
      { _id: "first", date: "2026-01-01" },
      { _id: "second", date: "2026-02-01" },
      { _id: "drafts.first", date: "2026-12-01" },
      { _id: "drafts.third", date: "2026-03-01" },
    ]);
    expect(rolls.map((roll) => roll.number)).toEqual([1, 2, 1, 3]);
  });
});

test("post navigation interleaves independent roll and session numbers chronologically", () => {
  const previous = deriveSession({
    _id: "session",
    slug: "session",
    date: "2026-01-01",
    number: 30,
  });
  const current = deriveRoll({ _id: "roll", slug: "photos", date: "2026-02-01", number: 1 });
  const next = deriveSession({
    _id: "tape",
    slug: "tape",
    kind: "tape",
    date: "2026-03-01",
    number: 31,
  });
  expect(postNeighbors(current, [next, current, previous])).toEqual({ previous, next });
  expect(postNeighbors(previous, [current, previous]).next).toBe(current);
  expect(postNeighbors(next, [next, current]).next).toBeUndefined();
  expect(postHref(current)).toBe("/rolls/photos");
});
