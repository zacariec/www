import { type SchemaTypeDefinition } from "sanity";
import { sessionTapeType } from "./session-tape";
import { timelineEntryType } from "./timeline-entry";
import { commentType } from "./comment";
import { siteConfigType } from "./site-config";
import { readerPreferencesType } from "./reader-preferences";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [sessionTapeType, timelineEntryType, commentType, siteConfigType, readerPreferencesType],
};
