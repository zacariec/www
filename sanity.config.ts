import { assist } from "@sanity/assist";
import { codeInput } from "@sanity/code-input";
import { defineConfig } from "sanity";
import { presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";

import { dataset, projectId } from "./src/sanity/env";
import { schema } from "./src/sanity/schema";

export default defineConfig({
  basePath: "/studio",
  projectId,
  dataset,
  schema,
  plugins: [
    structureTool(),
    assist(),
    codeInput(),
    presentationTool({
      previewUrl: {
        previewMode: {
          enable: "/api/preview/enable",
          disable: "/api/preview/disable",
        },
      },
      resolve: {
        locations: {
          sessionTape: {
            select: { title: "title", slug: "slug.current" },
            resolve: (doc) => ({
              locations: [
                {
                  title: (doc?.title as string | undefined) ?? "Untitled",
                  href: `/preview/sessions/${doc?.slug as string}`,
                },
              ],
            }),
          },
        },
      },
    }),
  ],
});
