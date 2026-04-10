import { assist } from "@sanity/assist";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { schema } from "./schema";
import { dataset, projectId } from "./env";

export default defineConfig({
  basePath: "/studio",
  projectId,
  dataset,
  schema,
  plugins: [structureTool(), assist()],
});
