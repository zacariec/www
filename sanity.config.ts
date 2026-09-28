import { assist } from "@sanity/assist";
import { codeInput } from "@sanity/code-input";
import { defineConfig } from "sanity";
import { defineLocations, presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";

import { CommentsTool } from "./src/sanity/comments-tool";
import { CortexTool } from "./src/sanity/cortex-tool";
import { dataset, projectId } from "./src/sanity/env";
import { schema } from "./src/sanity/schema";
import { defaultDocumentNode, structure } from "./src/sanity/structure";
import { StudioLayout, StudioLogo } from "./src/sanity/studio-components";
import { studioTheme } from "./src/sanity/theme";
import { ThoughtsBoardTool } from "./src/sanity/thoughts-tool";

export default defineConfig({
  basePath: "/studio",
  projectId,
  dataset,
  schema,
  title: "zcarr.dev",
  icon: StudioLogo,
  theme: studioTheme,
  studio: { components: { layout: StudioLayout } },
  tools: [
    { name: "comments", title: "Comments", component: CommentsTool },
    { name: "thoughts", title: "Thoughts board", component: ThoughtsBoardTool },
    { name: "cortex", title: "Cortex", component: CortexTool },
  ],
  plugins: [
    structureTool({ structure, defaultDocumentNode }),
    presentationTool({
      previewUrl: {
        initial: "/preview",
        previewMode: { enable: "/api/preview/enable", disable: "/api/preview/disable" },
      },
      resolve: {
        locations: {
          sessionTape: defineLocations({
            select: { title: "title", slug: "slug.current" },
            resolve: (document) => ({
              locations: document?.slug
                ? [
                    {
                      title: document.title || "Session",
                      href: `/preview/sessions/${document.slug}`,
                    },
                  ]
                : [],
            }),
          }),
          siteConfig: defineLocations({ locations: [{ title: "Index", href: "/preview" }] }),
          timelineEntry: defineLocations({
            locations: [{ title: "Thoughts board", href: "/preview" }],
          }),
        },
      },
    }),
    assist(),
    codeInput(),
  ],
});
