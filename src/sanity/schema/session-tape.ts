import { defineField, defineType } from "sanity";

export const sessionTapeType = defineType({
  name: "sessionTape",
  title: "Session Tape",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "dateModified",
      title: "Date Modified",
      type: "datetime",
      description:
        "Optional. Used for SEO/structured-data \u201ClastUpdated\u201D. Falls back to Published At.",
    }),
    defineField({
      name: "readingTime",
      title: "Reading Time",
      type: "string",
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "content",
      title: "Content",
      type: "array",
      of: [
        {
          type: "block",
          // Explicit decorators so the Studio toolbar shows exactly what's
          // supported in inline copy. `code` is the single-backtick style.
          marks: {
            decorators: [
              { title: "Strong", value: "strong" },
              { title: "Emphasis", value: "em" },
              { title: "Code", value: "code" },
              { title: "Underline", value: "underline" },
              { title: "Strike", value: "strike-through" },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Link",
                fields: [
                  {
                    name: "href",
                    type: "url",
                    title: "URL",
                    validation: (rule) =>
                      rule.uri({ scheme: ["http", "https", "mailto", "tel"] }),
                  },
                ],
              },
            ],
          },
        },
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            { name: "alt", type: "string", title: "Alt text" },
            { name: "caption", type: "string", title: "Caption" },
          ],
        },
        {
          type: "code",
          title: "Code",
          options: {
            withFilename: true,
            languageAlternatives: [
              { title: "Plain text", value: "text" },
              { title: "Bash", value: "bash" },
              { title: "CSS", value: "css" },
              { title: "Diff", value: "diff" },
              { title: "GROQ", value: "groq" },
              { title: "HTML", value: "html" },
              { title: "JavaScript", value: "javascript" },
              { title: "JSON", value: "json" },
              { title: "Liquid", value: "liquid" },
              { title: "Markdown", value: "markdown" },
              { title: "Python", value: "python" },
              { title: "SQL", value: "sql" },
              { title: "TSX", value: "tsx" },
              { title: "TypeScript", value: "typescript" },
              { title: "YAML", value: "yaml" },
            ],
          },
        },
      ],
    }),
    defineField({
      name: "featuredImage",
      title: "Featured Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "sideNote",
      title: "Side Note",
      type: "text",
      rows: 3,
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
      title: "title",
      subtitle: "subtitle",
      media: "featuredImage",
    },
  },
});
