import { defineField, defineType } from "sanity";
import { canonicalSessionId, SESSION_TAGS, SPOTIFY_TRACK_URL, TONES } from "../../lib/session";
import { NumberedBodyInput, SessionBlock } from "../studio-components";
import { WrittenToInput } from "../written-to-input";

export const sessionTapeType = defineType({
  name: "sessionTape",
  title: "Session",
  type: "document",
  initialValue: { kind: "session", state: "raw" },
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
      name: "kind",
      title: "Kind",
      type: "string",
      options: {
        list: [
          { title: "Session", value: "session" },
          { title: "Tape", value: "tape" },
        ],
      },
      initialValue: "session",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "state",
      title: "State",
      type: "string",
      options: {
        list: [
          { title: "Raw", value: "raw" },
          { title: "Edited", value: "edited" },
        ],
      },
      initialValue: "raw",
    }),
    defineField({
      name: "toneOverride",
      title: "Tone override",
      type: "string",
      options: { list: TONES.map((tone) => ({ title: tone, value: tone })) },
      description: "Clear to use the formula. Applies to: cover square · hero blot · STATE cell.",
    }),
    defineField({
      name: "coverSeed",
      title: "Cover seed",
      type: "number",
      description: "Leave blank to use the derived session number.",
      validation: (rule) => rule.integer(),
    }),
    defineField({
      name: "readTimeOverride",
      title: "Read time override (minutes)",
      type: "number",
      description: "Leave blank to calculate from the body word count.",
      validation: (rule) => rule.integer().min(1),
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      description:
        "Optional. Related sessions use these shared tags; leave unassigned until reviewed.",
      of: [{ type: "string" }],
      options: { list: SESSION_TAGS.map((tag) => ({ title: tag, value: tag })) },
      validation: (rule) =>
        rule
          .unique()
          .custom((tags) =>
            !tags ||
            tags.every((tag) => SESSION_TAGS.includes(tag as (typeof SESSION_TAGS)[number]))
              ? true
              : "Choose only code, systems, ai, work or design.",
          ),
    }),
    defineField({
      name: "related",
      title: "Related sessions",
      type: "array",
      description:
        "Up to three hand-picked sessions or tapes. The current session and its neighbours are excluded on the site.",
      of: [
        {
          type: "reference",
          to: [{ type: "sessionTape" }],
          options: {
            filter: ({ document }) => ({
              filter: "!(_id in $self)",
              params: {
                self: [
                  canonicalSessionId(document._id),
                  `drafts.${canonicalSessionId(document._id)}`,
                ],
              },
            }),
          },
        },
      ],
      validation: (rule) =>
        rule
          .max(3)
          .unique()
          .custom((references, context) => {
            const self = canonicalSessionId(context.document?._id ?? "");
            const seen = new Set<string>();
            for (const reference of references ?? []) {
              if (!reference || typeof reference !== "object" || !("_ref" in reference))
                return "Choose a session for each reference.";
              const id = canonicalSessionId(
                typeof reference._ref === "string" ? reference._ref : "",
              );
              if (!id) return "Choose a session for each reference.";
              if (id === self) return "A session cannot be related to itself.";
              if (seen.has(id)) return "Choose each related session only once.";
              seen.add(id);
            }
            return true;
          }),
    }),
    defineField({
      name: "writtenTo",
      title: "Written to",
      type: "object",
      description:
        "Optional. Paste a Spotify track URL to resolve its title and artist. Nothing is selected by default.",
      components: { input: WrittenToInput },
      fields: [
        defineField({
          name: "track",
          title: "Track",
          type: "string",
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "artist",
          title: "Artist",
          type: "string",
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "spotifyUrl",
          title: "Spotify URL",
          type: "url",
          validation: (rule) =>
            rule
              .required()
              .custom((url) =>
                url && SPOTIFY_TRACK_URL.test(url) ? true : "Enter a Spotify track URL.",
              ),
        }),
      ],
    }),
    defineField({
      name: "content",
      title: "Content",
      type: "array",
      components: { input: NumberedBodyInput },
      of: [
        {
          type: "block",
          components: { block: SessionBlock },
          // Restrict to the styles we actually have frontend serializers for
          // — H1 is reserved for the page title so we skip it here.
          styles: [
            { title: "Normal", value: "normal" },
            { title: "Heading 2", value: "h2" },
            { title: "Heading 3", value: "h3" },
            { title: "Heading 4", value: "h4" },
            { title: "Quote", value: "blockquote" },
          ],
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
                    validation: (rule) => rule.uri({ scheme: ["http", "https", "mailto", "tel"] }),
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
      documentId: "_id",
      title: "title",
      slug: "slug",
      kind: "kind",
      publishedAt: "publishedAt",
      toneOverride: "toneOverride",
      coverSeed: "coverSeed",
    },
    prepare(selection) {
      return selection;
    },
  },
});
