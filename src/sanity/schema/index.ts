import { type SchemaTypeDefinition } from "sanity";
import { sessionTapeType } from "./session-tape";
import { timelineEntryType } from "./timeline-entry";
import { commentType } from "./comment";
import { siteConfigType } from "./site-config";
import { readerPreferencesType } from "./reader-preferences";
import { rollFrameType, rollGroupType, rollType } from "./roll";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [sessionTapeType, rollType, rollGroupType, rollFrameType, timelineEntryType, commentType, siteConfigType, readerPreferencesType],
};
