import process from "node:process";

import cloudflare from "@astrojs/cloudflare";
import partytown from "@astrojs/partytown";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import sanity from "@sanity/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://zcarr.dev",
  // Server-rendered by default so CMS edits show up without a redeploy.
  // Individual routes can still opt into build-time rendering with
  // `export const prerender = true` where freshness doesn't matter.
  output: "server",
  // Middleware retains form-origin protection with a signed RFC 8058 unsubscribe exception.
  security: { checkOrigin: false },
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  integrations: [
    sanity({
      projectId: process.env.PUBLIC_SANITY_PROJECT_ID ?? "mrobamxo",
      dataset: process.env.PUBLIC_SANITY_DATASET ?? "production",
      useCdn: false,
      studioBasePath: "/studio",
    }),
    react(),
    sitemap(),
    partytown({
      config: {
        forward: ["umami.track"],
      },
    }),
  ],
  vite: {
    resolve: {
      alias: {
        "@/": "/src/",
      },
      // Force a single copy of React across SSR + client. Without this,
      // @cloudflare/vite-plugin's workerd SSR runtime ends up with two
      // prebundled React copies and hook dispatchers come back as null.
      dedupe: ["react", "react-dom"],
    },
    ssr: {
      // Bundle these directly into the SSR module instead of externalising —
      // workerd cannot resolve from node_modules at runtime.
      noExternal: ["@sanity/astro", "react", "react-dom", "better-auth", "shiki"],
      optimizeDeps: {
        include: ["@sanity/preview-url-secret"],
        // Let Astro compile component entry points without re-optimizing React mid-request.
        exclude: ["astro-portabletext", "@sanity/astro/visual-editing"],
      },
    },
    optimizeDeps: {
      // Warm the prebundle on startup so the first request can't race with
      // mid-request reoptimisation.
      include: [
        "react",
        "react-dom",
        "react-dom/server",
        "better-auth/react",
        "@sanity/visual-editing/react",
      ],
      // Exclude astro-portabletext — its dep scanner trips on .astro custom
      // serializer files (looks for default JS export, finds an Astro component).
      // Build is unaffected; this just silences the dev-server warning.
      exclude: ["astro-portabletext"],
    },
  },
});
