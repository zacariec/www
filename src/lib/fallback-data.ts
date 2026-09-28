import type { SanitySessionTape, SanityTimelineEntry } from "./sanity/types";

// Missing CMS configuration must not publish invented sessions or comments.
export const sessionTapes: SanitySessionTape[] = [];
export const timelineEntries: SanityTimelineEntry[] = [];
