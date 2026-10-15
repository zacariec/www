import { defineArrayMember, defineField, defineType } from "sanity";
import { TONES } from "../../lib/session";
import {
  RollAspectInput,
  RollFrameInput,
  RollGroupsInput,
  RollNumberInput,
  RollSizeInput,
} from "../roll-inputs";

export const rollFrameType = defineType({
  name: "rollFrame",
  title: "Frame",
  type: "object",
  initialValue: { size: "half", aspect: "3:2" },
  components: { input: RollFrameInput },
  fields: [
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      validation: (rule) =>
        rule
          .required()
          .custom((image) =>
            image?.asset?._ref ? true : "Upload an image before publishing this frame.",
          )
          .error(),
    }),
    defineField({
      name: "alt",
      title: "Alt text",
      type: "string",
      description:
        "Required. Describe the image for someone who cannot see it; filenames are not descriptions.",
      validation: (rule) =>
        rule
          .required()
          .custom((alt) => (alt?.trim() ? true : "Describe this image before publishing.")),
    }),
    defineField({ name: "caption", title: "Caption", type: "string" }),
    defineField({
      name: "size",
      title: "Size",
      type: "string",
      initialValue: "half",
      components: { input: RollSizeInput },
      options: { list: ["full", "wide", "half", "third"] },
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            value && ["full", "wide", "half", "third"].includes(value)
              ? true
              : "Choose a frame size.",
          ),
    }),
    defineField({
      name: "aspect",
      title: "Aspect ratio",
      type: "string",
      initialValue: "3:2",
      components: { input: RollAspectInput },
      options: { list: ["21:9", "3:2", "4:5", "auto"] },
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            value && ["21:9", "3:2", "4:5", "auto"].includes(value)
              ? true
              : "Choose an aspect ratio.",
          ),
    }),
    defineField({
      name: "exif",
      title: "Capture metadata",
      type: "object",
      hidden: true,
      fields: [
        defineField({ name: "camera", type: "string" }),
        defineField({ name: "lens", type: "string" }),
        defineField({ name: "iso", type: "number", validation: (rule) => rule.positive() }),
        defineField({ name: "dateTaken", type: "string" }),
      ],
    }),
  ],
  preview: {
    select: { title: "caption", alt: "alt", media: "image", size: "size", aspect: "aspect" },
    prepare({ title, alt, media, size, aspect }) {
      return {
        title: title || alt || "Frame — add alt text",
        subtitle: `${size || "half"} · ${aspect || "3:2"}${alt?.trim() ? "" : " · Alt text required"}`,
        media,
      };
    },
  },
});

export const rollGroupType = defineType({
  name: "rollGroup",
  title: "Group",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Leave blank for a single ungrouped roll.",
    }),
    defineField({ name: "date", title: "Date", type: "date" }),
    defineField({
      name: "frames",
      title: "Frames",
      type: "array",
      of: [defineArrayMember({ type: "rollFrame" })],
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .error("Every group needs at least one frame. Remove empty groups before publishing."),
    }),
  ],
  preview: {
    select: { title: "title", date: "date", frames: "frames", media: "frames.0.image" },
    prepare({ title, date, frames, media }) {
      return {
        title: title || "Untitled group",
        subtitle: [date, `${frames?.length ?? 0} frames`].filter(Boolean).join(" · "),
        media,
      };
    },
  },
});

export const rollType = defineType({
  name: "roll",
  title: "Roll",
  type: "document",
  initialValue: {
    layout: "sheet",
    groups: [{ _key: "initial", _type: "rollGroup", frames: [] }],
  },
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "appearance", title: "Appearance" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "number",
      title: "Roll number",
      type: "number",
      group: "content",
      readOnly: true,
      components: { input: RollNumberInput },
      description:
        "Derived from publication chronology, like sessions. Backdating a roll updates the sequence automatically.",
      validation: (rule) => rule.integer().min(1),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "content",
      options: { source: "title" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "dek",
      title: "Dek",
      type: "string",
      group: "content",
      description: "Optional one-line introduction.",
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      group: "content",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "dateModified",
      title: "Date modified",
      type: "datetime",
      group: "seo",
      description: "Optional. Falls back to Published at in metadata.",
    }),
    defineField({
      name: "meta",
      title: "Detail chips",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "string" })],
      validation: (rule) => rule.max(3),
    }),
    defineField({
      name: "groupLabel",
      title: "Group label",
      type: "string",
      group: "content",
      description: "For example Day, Set, Stop or Part. Leave blank for an ungrouped roll.",
    }),
    defineField({
      name: "groups",
      title: "Groups & frames",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "rollGroup" })],
      components: { input: RollGroupsInput },
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .error(
            "Add at least one group with an image. A single untitled group is an ungrouped roll.",
          ),
    }),
    defineField({
      name: "layout",
      title: "Layout",
      type: "string",
      group: "appearance",
      initialValue: "sheet",
      options: {
        list: [
          { title: "Contact sheet", value: "sheet" },
          { title: "Photo stream", value: "stream" },
          { title: "Film strip", value: "strip" },
          { title: "Route index", value: "route" },
        ],
        layout: "radio",
      },
      validation: (rule) =>
        rule
          .required()
          .custom((value) =>
            value && ["sheet", "stream", "strip", "route"].includes(value)
              ? true
              : "Choose a roll layout.",
          ),
    }),
    defineField({
      name: "tone",
      title: "Tone override",
      type: "string",
      group: "appearance",
      options: { list: TONES.map((tone) => ({ title: tone, value: tone })) },
      description: "Leave blank to use the same colour formula as sessions.",
      validation: (rule) =>
        rule.custom((value) =>
          !value || TONES.includes(value as (typeof TONES)[number])
            ? true
            : "Choose one of the six tones.",
        ),
    }),
    defineField({
      name: "seo",
      title: "Search & sharing overrides",
      type: "object",
      group: "seo",
      description: "Optional. Defaults to the roll title, dek and first frame.",
      fields: [
        defineField({ name: "title", title: "Title", type: "string" }),
        defineField({ name: "description", title: "Description", type: "text", rows: 3 }),
        defineField({
          name: "image",
          title: "Social image",
          type: "image",
          options: { hotspot: true },
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
    select: { title: "title", publishedAt: "publishedAt", media: "groups.0.frames.0.image" },
    prepare({ title, publishedAt, media }) {
      return {
        title: title || "Untitled roll",
        subtitle: `Roll${publishedAt ? ` · ${publishedAt.slice(0, 10)}` : " · Draft"}`,
        media,
      };
    },
  },
});
