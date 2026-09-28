import { defineField, defineType } from "sanity";
import { HEADLINE_PRESETS, siteConfig } from "../../lib/constants";
import { StudioSitePreview } from "../studio-components";

export const siteConfigType = defineType({
  name: "siteConfig",
  title: "Site Config",
  type: "document",
  components: { preview: StudioSitePreview },
  groups: [
    { name: "content", title: "Content" },
    { name: "newsletter", title: "Newsletter" },
    { name: "seo", title: "SEO & Metadata" },
  ],
  fields: [
    // Content
    defineField({
      name: "navItems",
      title: "Navigation Items",
      type: "array",
      group: "content",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({ name: "href", title: "Link", type: "string" }),
          ],
        },
      ],
    }),
    defineField({
      name: "headlinePreset",
      title: "Headline",
      type: "string",
      group: "content",
      initialValue: "getting-it-out-there",
      options: {
        list: [
          ...Object.entries(HEADLINE_PRESETS).map(([value, lines]) => ({
            title: lines.join(" / "),
            value,
          })),
          { title: "Custom", value: "custom" },
        ],
      },
    }),
    defineField({
      name: "headlineCustom",
      title: "Custom headline lines",
      type: "array",
      group: "content",
      of: [{ type: "string" }],
      hidden: ({ document }) => document?.headlinePreset !== "custom",
      validation: (rule) =>
        rule.custom((value, context) =>
          context.document?.headlinePreset !== "custom" ||
          (Array.isArray(value) &&
            value.length === 2 &&
            value.every((line) => typeof line === "string" && line.trim()))
            ? true
            : "Enter two headline lines.",
        ),
    }),
    defineField({
      name: "readme",
      title: "README",
      type: "text",
      group: "content",
      initialValue: siteConfig.readme,
    }),
    defineField({
      name: "tickerEnabled",
      title: "Latest ticker",
      type: "boolean",
      group: "content",
      initialValue: true,
    }),
    defineField({
      name: "socials",
      title: "Elsewhere",
      type: "array",
      group: "content",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "label",
              title: "Label",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "url",
              title: "URL",
              type: "url",
              validation: (rule) => rule.required().uri({ scheme: ["https", "http"] }),
            }),
          ],
        },
      ],
    }),
    defineField({
      name: "toneShift",
      title: "Tone shift",
      type: "number",
      group: "content",
      initialValue: 1,
      validation: (rule) => rule.integer().min(0).max(5),
    }),
    defineField({
      name: "displayVersion",
      title: "Display version",
      type: "string",
      group: "content",
      initialValue: "0.26",
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "text",
      group: "content",
      description: "Optional. Leave empty until Zac supplies the copy.",
    }),
    defineField({
      name: "moderationDefault",
      title: "New comments",
      type: "string",
      group: "content",
      initialValue: "approved",
      options: {
        list: [
          { title: "Publish immediately", value: "approved" },
          { title: "Hold for approval", value: "pending" },
        ],
      },
    }),
    defineField({
      name: "authorSanityId",
      title: "Zac's Sanity user ID",
      type: "string",
      group: "content",
      description:
        "Verified Sanity user ID. Only this Studio identity may reply with the AUTHOR badge.",
    }),

    // Newsletter
    defineField({
      name: "newsletter",
      title: "Newsletter Copy",
      type: "object",
      group: "newsletter",
      description:
        "Copy for the newsletter signup form (footer + session tape CTA). All fields are optional — sensible defaults are used when blank.",
      fields: [
        defineField({
          name: "footerHeading",
          title: "Footer Heading",
          type: "string",
          description: "Small uppercase label above the form in the site footer.",
          initialValue: "Newsletter",
        }),
        defineField({
          name: "footerDescription",
          title: "Footer Description",
          type: "text",
          rows: 2,
          description: "One-liner under the footer heading.",
          initialValue: "New posts, straight to your inbox. No spam.",
        }),
        defineField({
          name: "inlineHeading",
          title: "Session CTA Heading",
          type: "string",
          description: "Small uppercase label above the form on session tape pages.",
          initialValue: "Subscribe",
        }),
        defineField({
          name: "inlineDescription",
          title: "Session CTA Description",
          type: "text",
          rows: 2,
          description: "Pitch shown above the form on session tape pages.",
          initialValue: "Want the next one? Drop your email.",
        }),
        defineField({
          name: "buttonLabel",
          title: "Button Label",
          type: "string",
          description: "Submit button text.",
          initialValue: "Subscribe",
        }),
        defineField({
          name: "placeholder",
          title: "Email Placeholder",
          type: "string",
          initialValue: "you@domain.com",
        }),
        defineField({
          name: "successMessage",
          title: "Success Message",
          type: "string",
          description: "Shown after a brand-new subscription.",
          initialValue: "Thanks \u2014 you're subscribed.",
        }),
        defineField({
          name: "alreadySubscribedMessage",
          title: "Already-Subscribed Message",
          type: "string",
          description:
            "Shown when the email is already on the list. Supports a follow-up unsubscribe prompt.",
          initialValue: "You're already on the list. Want to unsubscribe?",
        }),
        defineField({
          name: "unsubscribeLabel",
          title: "Unsubscribe Link Label",
          type: "string",
          description:
            "Label for the unsubscribe button shown next to the already-subscribed message.",
          initialValue: "Unsubscribe",
        }),
        defineField({
          name: "unsubscribeConfirmedMessage",
          title: "Unsubscribe Confirmed Message",
          type: "string",
          description: "Shown after a successful unsubscribe.",
          initialValue: "You've been unsubscribed.",
        }),
        defineField({
          name: "errorMessage",
          title: "Error Message",
          type: "string",
          description: "Shown on submission failure.",
          initialValue: "Something went wrong. Try again?",
        }),
      ],
    }),

    // SEO
    defineField({
      name: "siteName",
      title: "Site Name",
      type: "string",
      group: "seo",
      description: "Used in title tags and OG metadata",
    }),
    defineField({
      name: "siteDescription",
      title: "Site Description",
      type: "text",
      group: "seo",
      rows: 2,
      description: "Default meta description and OG description",
    }),
    defineField({
      name: "siteUrl",
      title: "Site URL",
      type: "url",
      group: "seo",
      description: "Canonical site origin (e.g. https://zcarr.dev)",
    }),
    defineField({
      name: "author",
      title: "Author Name",
      type: "string",
      group: "seo",
    }),
    defineField({
      name: "twitterHandle",
      title: "X / Twitter Handle",
      type: "string",
      group: "seo",
      description: 'Used for twitter:creator + twitter:site, e.g. "@zacariec"',
    }),
    defineField({
      name: "timezone",
      title: "Timezone",
      type: "string",
      group: "seo",
      description: 'e.g. "Australia/Sydney"',
    }),
  ],
  preview: {
    prepare() {
      return { title: "Site Configuration" };
    },
  },
});
