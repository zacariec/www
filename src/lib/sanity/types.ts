import type { PortableTextBlock, TypedObject } from "@portabletext/types";

import type { Tone } from "../session";

export interface SanityTextBlock extends PortableTextBlock {
  _type: "block";
}

export interface SanityCodeBlock extends TypedObject {
  _type: "code";
  code?: string;
  language?: string;
  filename?: string;
}

export interface SanityImageBlock extends TypedObject {
  _type: "image";
  asset?: { _ref: string; _type?: "reference" };
  url?: string;
  alt?: string;
  caption?: string;
}

export type SanityContentNode = SanityTextBlock | SanityCodeBlock | SanityImageBlock;

export interface WrittenTo {
  track: string;
  artist: string;
  spotifyUrl: string;
}

export interface SanitySessionTape {
  _id: string;
  title: string;
  slug: string;
  subtitle: string;
  date: string;
  dateModified?: string;
  number: number;
  readTime: number;
  wordCount: number;
  sections: { key: string; id: string; title: string }[];
  kind: "session" | "tape";
  state: "raw" | "edited";
  coverSeed: number;
  toneOverride?: Tone;
  readTimeOverride?: number;
  excerpt: string;
  content: SanityContentNode[];
  sideNote?: string;
  tags: string[];
  relatedIds: string[];
  writtenTo?: WrittenTo;
  featuredImage?: { asset: { _ref: string }; url?: string; alt?: string };
  comments: SanityComment[];
  commentCount: number;
}

export interface SanityComment {
  _id: string;
  session: string;
  anchorIndex: number | null;
  parent: string | null;
  body: string;
  author: {
    provider: string;
    providerId: string;
    handle: string;
    avatarSeed: number;
    isAuthor: boolean;
  };
  status: "pending" | "approved" | "hidden";
  likes: number;
  createdAt: string;
}

export interface SanityNewsletterCopy {
  footerHeading?: string;
  footerDescription?: string;
  inlineHeading?: string;
  inlineDescription?: string;
  buttonLabel?: string;
  placeholder?: string;
  successMessage?: string;
  alreadySubscribedMessage?: string;
  unsubscribeLabel?: string;
  unsubscribeConfirmedMessage?: string;
  errorMessage?: string;
}

export interface SanitySiteConfig {
  navItems: { label: string; href: string }[];
  headline: string[];
  readme: string;
  tickerEnabled: boolean;
  socials: { label: string; url: string }[];
  toneShift: number;
  pageTransition: "radial" | "sweep" | "dissolve" | "off";
  displayVersion: string;
  moderationDefault: "approved" | "pending";
  authorSanityId?: string;
  newsletter?: SanityNewsletterCopy;
  siteName: string;
  siteDescription: string;
  siteUrl?: string;
  author: string;
  twitterHandle?: string;
  timezone?: string;
}

export interface SanityTimelineEntry {
  _id: string;
  text: string;
  date: string;
  type: "thought" | "linkedin" | "reflection" | "x";
  likes: number;
  comments: number;
  url?: string;
  board?: { visible: boolean; x: number; y: number; rotation: number; z: number };
}
