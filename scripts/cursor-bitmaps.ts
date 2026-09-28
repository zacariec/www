type Point = readonly [number, number];
export type CursorName =
  | "default"
  | "pointer"
  | "text"
  | "grab"
  | "grabbing"
  | "anchor"
  | "not-allowed"
  | "progress";
interface Cursor {
  bitmap: string[];
  hotspot: Point;
  fallback: string;
}

// Reference 16×16 art: o = paper outline, x = ink, p = pink, . = transparent.
const pad = (rows: string[]): string[] =>
  Array.from({ length: 16 }, (_, y) => `${rows[y] || ""}................`.slice(0, 16));
function accent(rows: string[], points: Point[]): string[] {
  return rows.map((row, y) =>
    Array.from(row)
      .map((cell, x) => (points.some(([px, py]) => px === x && py === y) ? "p" : cell))
      .join(""),
  );
}
const arrow = pad([
  "o",
  "oo",
  "oxo",
  "oxxo",
  "oxxxo",
  "oxxxxo",
  "oxxxxxo",
  "oxxxxxxo",
  "oxxxxxxxo",
  "oxxxxxxxxo",
  "oxxxxxoooo",
  "oxxoxxo",
  "oxo.oxxo",
  "oo..oxxo",
  ".....oxxo",
  "......ooo",
]);
const hand = pad([
  "....oo",
  "...oxxo",
  "...oxxo",
  "...oxxo",
  "...oxxoooo",
  "...oxxoxxoooo",
  "...oxxoxxoxxooo",
  "oo.oxxoxxoxxoxxo",
  "oxooxxxxxxxxoxxo",
  "oxxoxxxxxxxxxxxo",
  ".oxxxxxxxxxxxxxo",
  "..oxxxxxxxxxxxo",
  "..oxxxxxxxxxxxo",
  "...oxxxxxxxxxo",
  "....oxxxxxxxxo",
  "....oooooooooo",
]);
const open = pad([
  ".......oo",
  "......oxxooo",
  "....oooxxoxxo",
  "...oxxoxxoxxooo",
  "...oxxoxxoxxoxxo",
  "...oxxoxxoxxoxxo",
  "...oxxoxxoxxoxxo",
  "oo.oxxxxxxxxxxxo",
  "oxooxxxxxxxxxxxo",
  "oxxoxxxxxxxxxxxo",
  ".oxxxxxxxxxxxxxo",
  "..oxxxxxxxxxxxo",
  "..oxxxxxxxxxxxo",
  "...oxxxxxxxxxo",
  "....oxxxxxxxxo",
  "....oooooooooo",
]);
const fist = pad([
  "",
  "",
  "",
  "....oo.oo.oo.oo",
  "...oxxoxxoxxoxxo",
  "...oxxoxxoxxoxxo",
  "oo.oxxxxxxxxxxxo",
  "oxooxxxxxxxxxxxo",
  "oxxoxxxxxxxxxxxo",
  ".oxxxxxxxxxxxxxo",
  "..oxxxxxxxxxxxo",
  "..oxxxxxxxxxxxo",
  "...oxxxxxxxxxo",
  "....oxxxxxxxxo",
  "....oooooooooo",
]);
const beam = pad([
  "....ooo.ooo",
  "....oxxoxxo",
  "....ooxxxoo",
  "......oxo",
  "......oxo",
  "......oxo",
  "......oxo",
  "......opo",
  "......opo",
  "......oxo",
  "......oxo",
  "......oxo",
  "......oxo",
  "....ooxxxoo",
  "....oxxoxxo",
  "....ooo.ooo",
]);
const cross = pad([
  "......ooo",
  "......oxo",
  "......oxo",
  "......oxo",
  "......oxo",
  "......ooo",
  "ooooo.....ooooo",
  "oxxxo.....oxxxo",
  "ooooo.....ooooo",
  "......ooo",
  "......oxo",
  "......oxo",
  "......oxo",
  "......oxo",
  "......ooo",
]);
const blocked = Array.from({ length: 16 }, (_, y) =>
  Array.from({ length: 16 }, (_cell, x) => {
    const distance = Math.hypot(x - 7.5, y - 7.5);
    const diagonal = x - y;
    if (distance >= 4.3 && distance <= 6.1) return "x";
    if (distance > 6.1 && distance <= 7) return "o";
    if (distance < 4.3) {
      if (diagonal >= -1 && diagonal <= 1) return "p";
      if (diagonal === 2 || diagonal === -2 || distance >= 3.5) return "o";
    }
    return ".";
  }).join(""),
);
const ring = ["..ooo..", ".oxxxo.", "oxo.opo", "oxo.opo", "oxo.oxo", ".oxxxo.", "..ooo.."];
const progress = arrow.map((row, y) =>
  Array.from(row)
    .map((cell, x) => {
      const ry = y - 9;
      const rx = x - 9;
      if (ry >= 0 && ry < 7 && rx >= 0 && rx < 7) {
        if (ring[ry][rx] !== ".") return ring[ry][rx];
        if (Math.hypot(rx - 3, ry - 3) < 1.5) return ".";
      }
      return cell;
    })
    .join(""),
);

export const cursors: Record<CursorName, Cursor> = {
  default: {
    bitmap: accent(arrow, [
      [2, 7],
      [3, 7],
      [2, 8],
      [3, 8],
    ]),
    hotspot: [0, 0],
    fallback: "default",
  },
  pointer: {
    bitmap: accent(hand, [
      [4, 1],
      [5, 1],
    ]),
    hotspot: [4, 0],
    fallback: "pointer",
  },
  text: { bitmap: beam, hotspot: [7, 8], fallback: "text" },
  grab: {
    bitmap: accent(open, [
      [8, 10],
      [9, 10],
      [8, 11],
      [9, 11],
    ]),
    hotspot: [8, 8],
    fallback: "grab",
  },
  grabbing: {
    bitmap: accent(fist, [
      [8, 9],
      [9, 9],
      [8, 10],
      [9, 10],
    ]),
    hotspot: [8, 8],
    fallback: "grabbing",
  },
  anchor: {
    bitmap: accent(cross, [
      [7, 6],
      [6, 7],
      [7, 7],
      [8, 7],
      [7, 8],
    ]),
    hotspot: [7, 7],
    fallback: "crosshair",
  },
  "not-allowed": { bitmap: blocked, hotspot: [8, 8], fallback: "not-allowed" },
  progress: { bitmap: progress, hotspot: [0, 0], fallback: "progress" },
};
