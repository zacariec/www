import { urlFor } from "./sanity/client";
import { canonicalSessionId, TONES } from "./session";

import type { RollFrame, RollGroup, SanityRoll } from "./sanity/types";

export interface RollSource {
  _id: string;
  title?: string;
  slug?: string | { current?: string };
  number?: number;
  date?: string;
  publishedAt?: string;
  dateModified?: string;
  dek?: string;
  meta?: string[];
  groupLabel?: string;
  groups?: RollGroup[];
  layout?: SanityRoll["layout"];
  tone?: SanityRoll["toneOverride"];
  seo?: SanityRoll["seo"];
}

export function rollId(number: number): string {
  return `R.${String(number).padStart(3, "0")}`;
}

export function deriveRoll(source: RollSource, number = source.number ?? 1): SanityRoll {
  const groups = (source.groups ?? []).map((group) => ({
    ...group,
    frames: (group.frames ?? []).map((frame) => ({
      ...frame,
      size: frame.size || "half",
      aspect: frame.aspect || "3:2",
    })),
  }));
  return {
    _id: source._id,
    title: source.title ?? "",
    slug: typeof source.slug === "string" ? source.slug : (source.slug?.current ?? ""),
    kind: "roll",
    number,
    date: source.date ?? source.publishedAt ?? "",
    dateModified: source.dateModified,
    dek: source.dek ?? "",
    subtitle: source.dek ?? "",
    excerpt: source.dek ?? "",
    meta: source.meta ?? [],
    groupLabel: source.groupLabel?.trim() ?? "",
    groups,
    layout: source.layout ?? "sheet",
    toneOverride: source.tone && TONES.includes(source.tone) ? source.tone : undefined,
    coverSeed: number * 7919,
    frameCount: groups.reduce((count, group) => count + group.frames.length, 0),
    seo: source.seo,
  };
}

export function deriveRolls(inputs: RollSource[]): SanityRoll[] {
  const identities = new Map<string, RollSource>();
  for (const source of inputs) {
    const id = canonicalSessionId(source._id);
    if (!identities.has(id) || !source._id.startsWith("drafts.")) identities.set(id, source);
  }
  const numbers = new Map(
    [...identities.values()]
      .sort(
        (a, b) =>
          (a.date ?? a.publishedAt ?? "9999").localeCompare(b.date ?? b.publishedAt ?? "9999") ||
          canonicalSessionId(a._id).localeCompare(canonicalSessionId(b._id)),
      )
      .map((source, index) => [canonicalSessionId(source._id), index + 1]),
  );
  return inputs.map((source) => deriveRoll(source, numbers.get(canonicalSessionId(source._id))));
}

export interface RollViewFrame extends RollFrame {
  index: number;
  number: string;
  groupTitle: string;
  groupDate: string;
}

export interface RollViewGroup {
  _key: string;
  title: string;
  date: string;
  number: string;
  start: string;
  end: string;
  frames: RollViewFrame[];
}

const pad = (value: number) => String(value).padStart(2, "0");

export function rollView(roll: SanityRoll): {
  grouped: boolean;
  label: string;
  frames: RollViewFrame[];
  groups: RollViewGroup[];
} {
  const grouped = roll.groups.length > 1 || Boolean(roll.groups[0]?.title?.trim());
  const frames: RollViewFrame[] = [];
  let groups = roll.groups.map((group, index): RollViewGroup => {
    const start = frames.length + 1;
    const groupFrames = group.frames.map((frame) => {
      const viewFrame = {
        ...frame,
        index: frames.length,
        number: pad(frames.length + 1),
        groupTitle: group.title?.trim() ?? "",
        groupDate: group.date ?? "",
      };
      frames.push(viewFrame);
      return viewFrame;
    });
    return {
      _key: group._key,
      title: group.title?.trim() ?? "",
      date: group.date ?? "",
      number: pad(index + 1),
      start: pad(start),
      end: pad(frames.length),
      frames: groupFrames,
    };
  });
  if (!grouped && roll.layout === "route") {
    groups = [];
    const chunk = Math.max(3, Math.ceil(frames.length / 4));
    for (let start = 0; start < frames.length; start += chunk) {
      const end = Math.min(start + chunk, frames.length);
      groups.push({
        _key: `set-${groups.length + 1}`,
        title: `Frames ${pad(start + 1)}–${pad(end)}`,
        date: "",
        number: pad(groups.length + 1),
        start: pad(start + 1),
        end: pad(end),
        frames: frames.slice(start, end),
      });
    }
  }
  return { grouped, label: grouped ? roll.groupLabel || "Set" : "Set", frames, groups };
}

export function rollImageRatio(frame: RollFrame, strip = false): number {
  if (frame.aspect !== "auto") {
    const [width, height] = frame.aspect.split(":").map(Number);
    return width / height;
  }
  if (strip) return 4 / 5;
  if (frame.image.width && frame.image.height) return frame.image.width / frame.image.height;
  const dimensions = /-(\d+)x(\d+)-/.exec(frame.image.asset._ref);
  return dimensions ? Number(dimensions[1]) / Number(dimensions[2]) : 3 / 2;
}

export function rollImageUrl(frame: RollFrame, width: number, ratio?: number): string {
  // Grid crops honor the editor's hotspot. The viewer always receives the original image.
  const source = ratio ? frame.image : { asset: frame.image.asset };
  let image = urlFor(source).width(width).auto("format");
  if (ratio) image = image.height(Math.round(width / ratio)).fit("crop");
  else image = image.fit("max");
  return image.url();
}

export function rollImageSrcSet(frame: RollFrame, maxWidth: number, ratio?: number): string {
  let limit = maxWidth;
  if (!ratio) {
    const intrinsicWidth =
      frame.image.width ?? Number(/-(\d+)x\d+-/.exec(frame.image.asset._ref)?.[1]);
    if (intrinsicWidth > 0) limit = Math.min(maxWidth, intrinsicWidth);
  }
  return [...new Set([320, 480, 640, 800, 960, 1200, 1600, 1920, 2400, limit])]
    .filter((width) => width <= limit)
    .sort((a, b) => a - b)
    .map((width) => `${rollImageUrl(frame, width, ratio)} ${width}w`)
    .join(", ");
}
