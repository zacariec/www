import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useClient } from "sanity";
import type { ReactNode } from "react";
import type {
  SanityComment,
  SanityContentNode,
  SanitySessionTape,
  SanityTextBlock,
} from "../lib/sanity/types";
import { deriveSessions, type Tone } from "../lib/session";

export type StudioBlock = SanityContentNode;
export type StudioSession = {
  _id: string;
  _rev: string;
  title?: string;
  slug?: { current?: string };
  subtitle?: string;
  excerpt?: string;
  publishedAt?: string;
  kind?: "session" | "tape";
  toneOverride?: Tone;
  coverSeed?: number;
  readTimeOverride?: number;
  content?: StudioBlock[];
  tags?: string[];
  relatedIds?: string[];
  writtenTo?: SanitySessionTape["writtenTo"];
};
export type BoardPosition = { visible: boolean; x: number; y: number; rotation: number; z: number };
export type StudioThought = {
  _id: string;
  _rev: string;
  text: string;
  date: string;
  type: string;
  board?: BoardPosition;
};
export type StudioComment = SanityComment & { _rev: string };
export type StudioConfig = { _id?: string; toneShift?: number; authorSanityId?: string };
export type StudioSnapshot = {
  sessions: StudioSession[];
  thoughts: StudioThought[];
  comments: StudioComment[];
  config: StudioConfig | null;
};

type StudioData = StudioSnapshot & {
  derivedSessions: SanitySessionTape[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};
export const STUDIO_DATA_QUERY = `{
  "sessions": *[_type == "sessionTape"]{_id,_rev,title,slug,subtitle,excerpt,publishedAt,kind,toneOverride,coverSeed,readTimeOverride,content,tags,"relatedIds":coalesce(related[]._ref,[]),writtenTo{track,artist,spotifyUrl}},
  "thoughts": *[_type == "timelineEntry"]{_id,_rev,text,"date":coalesce(publishedAt,""),type,board},
  "comments": *[_type == "comment" && !(_id in path("drafts.**"))]{_id,_rev,"session":session._ref,anchorIndex,"parent":parent._ref,body,author,status,likes,createdAt},
  "config": *[_type == "siteConfig"] | order(_id desc)[0]{_id,toneShift,authorSanityId}
}`;

export function canonicalId(id: string): string {
  return id.replace(/^drafts\./, "");
}

export function preferDrafts<T extends { _id: string }>(documents: T[]): T[] {
  const byId = new Map<string, T>();
  for (const document of documents) {
    const id = canonicalId(document._id);
    if (!byId.has(id) || document._id.startsWith("drafts.")) byId.set(id, document);
  }
  return [...byId.values()];
}

export function paragraphs(content: StudioBlock[] | undefined): SanityTextBlock[] {
  return (content ?? []).filter(
    (block): block is SanityTextBlock =>
      block._type === "block" && (!block.style || block.style === "normal") && !block.listItem,
  );
}

export function blockText(block: StudioBlock | undefined): string {
  if (block?._type !== "block") return "";
  return block.children
    .map((span) => ("text" in span && typeof span.text === "string" ? span.text : ""))
    .join("");
}

export function identitySeed(id: string): number {
  let value = 2166136261;
  for (let index = 0; index < id.length; index++)
    value = Math.imul(value ^ id.charCodeAt(index), 16777619);
  return value >>> 0;
}

const DataContext = createContext<StudioData | null>(null);

export function StudioDataProvider({ children }: { children: ReactNode }) {
  const client = useClient({ apiVersion: "2026-03-26" });
  const [snapshot, setSnapshot] = useState<StudioSnapshot>({
    sessions: [],
    thoughts: [],
    comments: [],
    config: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    let request = 0;
    async function load() {
      const current = ++request;
      try {
        const data = await client.fetch<StudioSnapshot>(
          STUDIO_DATA_QUERY,
          {},
          { perspective: "raw" },
        );
        if (!active || current !== request) return;
        setSnapshot({
          ...data,
          thoughts: preferDrafts(data.thoughts).sort((a, b) => b.date.localeCompare(a.date)),
        });
        setError(null);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const subscription = client
      .listen(
        '*[_type in ["sessionTape","timelineEntry","comment","siteConfig"]]',
        {},
        { includeResult: false, visibility: "query" },
      )
      .subscribe({
        next: () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(() => void load(), 180);
        },
        error: (cause: Error) => {
          if (active) setError(cause.message);
        },
      });
    return () => {
      active = false;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [client, version]);
  const value = useMemo(() => {
    const sessions = preferDrafts(snapshot.sessions);
    const derived = deriveSessions(snapshot.sessions);
    const bySourceId = new Map(
      snapshot.sessions.map((session, index) => [session._id, derived[index]]),
    );
    return {
      ...snapshot,
      sessions,
      derivedSessions: sessions.map((session) => bySourceId.get(session._id)!),
      loading,
      error,
      refresh: async () => {
        setVersion((value) => value + 1);
      },
    };
  }, [snapshot, loading, error]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useStudioData(): StudioData {
  const value = useContext(DataContext);
  if (!value) throw new Error("Studio tools require StudioDataProvider");
  return value;
}
