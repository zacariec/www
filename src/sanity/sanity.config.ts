import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schema } from "./schema";
import { apiVersion, dataset, projectId } from "./env";

export default defineConfig({
  basePath: "/studio",
  projectId,
  dataset,
  schema,
  plugins: [structureTool()],
});
