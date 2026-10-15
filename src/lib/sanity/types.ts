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

export interface RollImage {
  asset: { _ref: string };
  hotspot?: { x: number; y: number; width: number; height: number };
  crop?: { top: number; bottom: number; left: number; right: number };
  width?: number;
  height?: number;
  mimeType?: string;
  url?: string;
  size?: number;
}

export interface RollFrame {
  _key: string;
  image: RollImage;
  alt: string;
  caption?: string;
  size: "full" | "wide" | "half" | "third";
  aspect: "21:9" | "3:2" | "4:5" | "auto";
  exif?: { camera?: string; lens?: string; iso?: number; dateTaken?: string };
}

export interface RollGroup {
  _key: string;
  title?: string;
  date?: string;
  frames: RollFrame[];
}

export interface SanityRoll {
  _id: string;
  title: string;
  slug: string;
  kind: "roll";
  number: number;
  date: string;
  dateModified?: string;
  dek: string;
  subtitle: string;
  excerpt: string;
  meta: string[];
  groupLabel: string;
  groups: RollGroup[];
  layout: "sheet" | "stream" | "strip" | "route";
  toneOverride?: Tone;
  coverSeed: number;
  frameCount: number;
  seo?: { title?: string; description?: string; image?: RollImage };
}

export type SanityPost = SanitySessionTape | SanityRoll;

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
