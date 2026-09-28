import { defineField, defineType } from "sanity";

export const readerPreferencesType = defineType({
  name: "readerPreferences",
  title: "Reader anchor preferences",
  type: "document",
  readOnly: true,
  fields: [
    defineField({
      name: "showAnchors",
      type: "boolean",
      title: "Show paragraph anchors",
      description: "Managed by the signed-in reader. Account identities and email settings remain in D1.",
      initialValue: true,
    }),
  ],
});
