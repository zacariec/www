import { type SchemaTypeDefinition } from "sanity";
import { blogPostType } from "./blog-post";
import { timelineEntryType } from "./timeline-entry";
import { commentType } from "./comment";
import { siteConfigType } from "./site-config";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [blogPostType, timelineEntryType, commentType, siteConfigType],
};
