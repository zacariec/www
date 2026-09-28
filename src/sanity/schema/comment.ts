import { defineField, defineType } from "sanity";

export const commentType = defineType({
  name: "comment",
  title: "Comment",
  type: "document",
  fields: [
    defineField({
      name: "session",
      title: "Session",
      type: "reference",
      to: [{ type: "sessionTape" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "anchorIndex",
      title: "Paragraph",
      type: "number",
      description: "1-based paragraph number. Leave empty for the whole session.",
      validation: (rule) => rule.integer().min(1),
    }),
    defineField({
      name: "parent",
      title: "Reply to",
      type: "reference",
      to: [{ type: "comment" }],
    }),
    defineField({
      name: "body",
      title: "Comment",
      type: "text",
      description: "Plain text only. HTML and Markdown are displayed literally.",
      validation: (rule) => rule.required().min(1).max(5000),
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "object",
      readOnly: true,
      description: "Verified server-side identity. Use the Comments tool to reply as author.",
      validation: (rule) => rule.required(),
      fields: [
        defineField({ name: "provider", type: "string", validation: (rule) => rule.required() }),
        defineField({
          name: "providerId",
          title: "Provider ID",
          type: "string",
          validation: (rule) => rule.required(),
        }),
        defineField({ name: "handle", type: "string", validation: (rule) => rule.required() }),
        defineField({ name: "avatarSeed", type: "number", validation: (rule) => rule.required() }),
        defineField({
          name: "isAuthor",
          title: "Verified site author",
          type: "boolean",
          initialValue: false,
        }),
      ],
    }),
    defineField({
      name: "status",
      type: "string",
      initialValue: "approved",
      options: {
        layout: "radio",
        list: [
          { title: "Pending", value: "pending" },
          { title: "Approved", value: "approved" },
          { title: "Hidden", value: "hidden" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "likes",
      type: "number",
      readOnly: true,
      initialValue: 0,
      validation: (rule) => rule.integer().min(0),
    }),
    defineField({
      name: "createdAt",
      title: "Created",
      type: "datetime",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "readerId", type: "string", hidden: true, readOnly: true }),
    defineField({
      name: "likedBy",
      type: "array",
      of: [{ type: "string" }],
      hidden: true,
      readOnly: true,
    }),
  ],
  orderings: [
    { title: "Newest first", name: "createdDesc", by: [{ field: "createdAt", direction: "desc" }] },
  ],
  preview: {
    select: { title: "author.handle", body: "body", status: "status", anchor: "anchorIndex" },
    prepare({ title, body, status, anchor }) {
      return {
        title,
        subtitle: `${status ?? "pending"} · ${anchor ? `¶${String(anchor).padStart(2, "0")}` : "whole session"} · ${body ?? ""}`,
      };
    },
  },
});
