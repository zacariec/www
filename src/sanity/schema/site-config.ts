import { defineField, defineType } from "sanity";

export const siteConfigType = defineType({
  name: "siteConfig",
  title: "Site Config",
  type: "document",
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
      name: "heroSubtitle",
      title: "Hero Subtitle",
      type: "string",
      group: "content",
      description: 'e.g. "Journal — Est. 2024"',
    }),
    defineField({
      name: "heroHeading",
      title: "Hero Heading Lines",
      type: "array",
      group: "content",
      of: [{ type: "string" }],
      description: 'Each string is a line, e.g. ["THOUGHTS,", "UNFILTERED."]',
    }),
    defineField({
      name: "heroDescription",
      title: "Hero Description",
      type: "text",
      group: "content",
      rows: 3,
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      group: "content",
      options: { hotspot: true },
      fields: [
        defineField({ name: "alt", title: "Alt Text", type: "string" }),
        defineField({ name: "caption", title: "Figure Caption", type: "string" }),
      ],
    }),
    defineField({
      name: "marqueeText",
      title: "Scrolling Marquee Text",
      type: "string",
      group: "content",
      description: 'e.g. "CODE · SYSTEMS · TASTE · NOISE ·"',
    }),
    defineField({
      name: "footerHeading",
      title: "Footer Heading",
      type: "string",
      group: "content",
      description: 'Use \\n for line breaks. e.g. "Thanks for\\nreading."',
    }),
    defineField({
      name: "footerSubtitle",
      title: "Footer Subtitle",
      type: "string",
      group: "content",
      description: 'e.g. "— End"',
    }),

    // Newsletter
    defineField({
      name: "newsletter",
      title: "Newsletter Copy",
      type: "object",
      group: "newsletter",
      description:
        "Copy for the newsletter signup form (footer + blog post CTA). All fields are optional — sensible defaults are used when blank.",
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
          title: "Blog CTA Heading",
          type: "string",
          description: "Small uppercase label above the form on blog post pages.",
          initialValue: "Subscribe",
        }),
        defineField({
          name: "inlineDescription",
          title: "Blog CTA Description",
          type: "text",
          rows: 2,
          description: "Pitch shown above the form on blog post pages.",
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
      description: "Canonical URL (e.g. https://zacariec.com)",
    }),
    defineField({
      name: "ogImage",
      title: "Default OG Image",
      type: "image",
      group: "seo",
      description: "Default social sharing image (1200x630 recommended)",
      fields: [defineField({ name: "alt", title: "Alt Text", type: "string" })],
    }),
    defineField({
      name: "author",
      title: "Author Name",
      type: "string",
      group: "seo",
    }),
    defineField({
      name: "linkedIn",
      title: "LinkedIn URL",
      type: "url",
      group: "seo",
    }),
    defineField({
      name: "github",
      title: "GitHub URL",
      type: "url",
      group: "seo",
    }),
    defineField({
      name: "twitter",
      title: "X / Twitter URL",
      type: "url",
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
