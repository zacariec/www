import { normalizeMarkdownShortcuts } from "./sanity/normalize-markdown";

import type { SanityComment, SanityContentNode, SanitySessionTape } from "./sanity/types";

export const TONES = ["pink", "blue", "sand", "sage", "lilac", "apricot"] as const;
export type Tone = (typeof TONES)[number];
export const WORDS_PER_MINUTE = 200;

export interface SessionSource {
  _id: string;
  title?: string;
  slug?: string | { current?: string };
  subtitle?: string;
  date?: string;
  publishedAt?: string;
  dateModified?: string;
  excerpt?: string;
  content?: SanityContentNode[] | null;
  kind?: "session" | "tape" | null;
  state?: "raw" | "edited" | null;
  number?: number;
  coverSeed?: number | null;
  toneOverride?: Tone | null;
  readTimeOverride?: number | null;
  sideNote?: string;
  featuredImage?: SanitySessionTape["featuredImage"];
  comments?: SanityComment[];
  commentCount?: number;
}

export function canonicalSessionId(id: string): string {
  return id.replace(/^drafts\./, "");
}

export function sessionId(number: number): string {
  return `S.${String(number).padStart(3, "0")}`;
}

export function resolveTone(
  number: number,
  shift: number,
  params: URLSearchParams,
  override?: Tone,
): Tone {
  const forced = params.get("tone");
  if (TONES.includes(forced as Tone)) return forced as Tone;
  if (override && TONES.includes(override)) return override;
  const queryShift = params.get("shift");
  let effectiveShift = Number.isInteger(shift) && shift >= 0 && shift <= 5 ? shift : 1;
  if (queryShift !== null && /^[0-5]$/.test(queryShift)) effectiveShift = Number(queryShift);
  return TONES[(((number * 5 + effectiveShift) % 6) + 6) % 6];
}

/** Formula aliases are set before paint; pinned CMS and URL tones stay canonical. */
export function postToneStyle(number: number, tone: string, fixed = false): string {
  const color = TONES.includes(tone as Tone) ? tone : "pink";
  const slot = (((number * 5) % 6) + 6) % 6;
  return `--post-tone:${fixed ? `var(--${color})` : `var(--post-palette-${slot},var(--${color}))`}`;
}

export function formatWritten(date: string, long = false): string {
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return "";
  if (!long)
    return `${String(parsed.getUTCDate()).padStart(2, "0")}.${String(parsed.getUTCMonth() + 1).padStart(2, "0")}.${String(parsed.getUTCFullYear()).slice(-2)}`;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function sectionId(key: string | undefined, index: number): string {
  return `section-${key === "" ? index + 1 : (key ?? index + 1)}`;
}

function blockText(block: SanityContentNode): string {
  if (block._type === "block")
    return (block.children ?? [])
      .map((child) => ("text" in child && typeof child.text === "string" ? child.text : ""))
      .join("");
  if (block._type === "code") return typeof block.code === "string" ? block.code : "";
  return typeof block.caption === "string" ? block.caption : "";
}

export function countWords(content: SanityContentNode[] | null | undefined): number {
  return (content ?? []).reduce(
    (total, block) =>
      total + (blockText(block).match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0),
    0,
  );
}

export function deriveSession(input: SessionSource, number = input.number ?? 1): SanitySessionTape {
  const content = normalizeMarkdownShortcuts(input.content);
  const wordCount = countWords(content);
  const kind = input.kind === "tape" ? "tape" : "session";
  const readTimeOverride =
    typeof input.readTimeOverride === "number" &&
    Number.isFinite(input.readTimeOverride) &&
    input.readTimeOverride > 0
      ? input.readTimeOverride
      : undefined;
  const comments = (input.comments ?? []).filter((comment) => comment.status === "approved");
  return {
    _id: canonicalSessionId(input._id),
    title: input.title ?? "",
    slug: typeof input.slug === "string" ? input.slug : (input.slug?.current ?? ""),
    subtitle: input.subtitle ?? "",
    date: input.date ?? input.publishedAt ?? "",
    dateModified: input.dateModified,
    excerpt: input.excerpt ?? "",
    content,
    kind,
    state: input.state === "edited" ? "edited" : "raw",
    number,
    readTime: readTimeOverride ?? Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE)),
    readTimeOverride,
    wordCount,
    sections:
      kind === "tape"
        ? content.flatMap((block, index) =>
            block._type === "block" && block.style === "h2"
              ? [
                  {
                    key: block._key ?? sectionId(block._key, index),
                    id: sectionId(block._key, index),
                    title: blockText(block),
                  },
                ]
              : [],
          )
        : [],
    coverSeed:
      typeof input.coverSeed === "number" && Number.isFinite(input.coverSeed)
        ? input.coverSeed
        : number,
    toneOverride:
      input.toneOverride && TONES.includes(input.toneOverride) ? input.toneOverride : undefined,
    sideNote: input.sideNote,
    featuredImage: input.featuredImage,
    comments,
    commentCount: input.commentCount ?? comments.length,
  };
}

export function deriveSessions(inputs: SessionSource[]): SanitySessionTape[] {
  const identities = new Map<string, SessionSource>();
  for (const input of inputs) {
    const id = canonicalSessionId(input._id);
    if (!identities.has(id) || !input._id.startsWith("drafts.")) identities.set(id, input);
  }
  const chronology = [...identities.values()].sort((a, b) => {
    const dateOrder = (a.date ?? a.publishedAt ?? "9999").localeCompare(
      b.date ?? b.publishedAt ?? "9999",
    );
    return dateOrder || canonicalSessionId(a._id).localeCompare(canonicalSessionId(b._id));
  });
  const numbers = new Map(
    chronology.map((input, index) => [canonicalSessionId(input._id), index + 1]),
  );
  return inputs.map((input) => deriveSession(input, numbers.get(canonicalSessionId(input._id))));
}
