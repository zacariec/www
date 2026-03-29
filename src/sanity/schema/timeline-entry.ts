import { defineField, defineType } from "sanity";

export const timelineEntryType = defineType({
  name: "timelineEntry",
  title: "Timeline Entry",
  type: "document",
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
      title: "text",
      subtitle: "type",
    },
  },
});
