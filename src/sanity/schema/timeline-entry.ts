import { defineField, defineType } from "sanity";
import { StudioTimelinePreview } from "../studio-components";

export const timelineEntryType = defineType({
  name: "timelineEntry",
  title: "Timeline Entry",
  type: "document",
  components: { preview: StudioTimelinePreview },
  fields: [
    defineField({
      name: "text",
      title: "Text",
      type: "text",
      rows: 4,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "Thought", value: "thought" },
          { title: "LinkedIn", value: "linkedin" },
          { title: "X", value: "x" },
          { title: "Reflection", value: "reflection" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "likes",
      title: "Likes",
      type: "number",
      initialValue: 0,
    }),
    defineField({
      name: "comments",
      title: "Comments",
      type: "number",
      initialValue: 0,
    }),
    defineField({
      name: "url",
      title: "URL",
      type: "url",
      description: "Link to original post (e.g. LinkedIn)",
    }),
    defineField({
      name: "board",
      title: "Thoughts board",
      type: "object",
      description: "Default reader layout. Positions are editable in the Thoughts board tool.",
      fields: [
        defineField({
          name: "visible",
          title: "Show on board",
          type: "boolean",
          initialValue: false,
        }),
        defineField({
          name: "x",
          title: "Horizontal position (%)",
          type: "number",
          validation: (rule) => rule.min(0).max(100),
        }),
        defineField({
          name: "y",
          title: "Vertical position (px)",
          type: "number",
          validation: (rule) => rule.min(0),
        }),
        defineField({
          name: "rotation",
          title: "Rotation (degrees)",
          type: "number",
          validation: (rule) => rule.min(-180).max(180),
        }),
        defineField({
          name: "z",
          title: "Stacking order",
          type: "number",
          validation: (rule) => rule.integer().min(0),
        }),
      ],
    }),
  ],
  orderings: [
    {
      title: "Published",
      name: "publishedDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      documentId: "_id",
      title: "text",
      subtitle: "type",
    },
    prepare(selection) {
      return selection;
    },
  },
});
