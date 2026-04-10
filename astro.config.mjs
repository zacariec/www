import cloudflare from "@astrojs/cloudflare";
import partytown from "@astrojs/partytown";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import sanity from "@sanity/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://zcarr.dev",
  output: "static",
  adapter: cloudflare({
    platformProxy: { enabled: !process.env.CI },
  }),
  integrations: [
    sanity({
      projectId: "mrobamxo",
      dataset: "production",
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
      dedupe: ["react", "react-dom", "motion", "motion/react"],
    },
    ssr: {
      // Bundle these directly into the SSR module instead of externalising —
      // workerd cannot resolve from node_modules at runtime.
      noExternal: ["@sanity/astro", "react", "react-dom", "motion", "better-auth"],
    },
    optimizeDeps: {
      // Warm the prebundle on startup so the first request can't race with
      // mid-request reoptimisation.
      include: ["react", "react-dom", "react-dom/server", "motion/react"],
      // Exclude astro-portabletext — its dep scanner trips on .astro custom
      // serializer files (looks for default JS export, finds an Astro component).
      // Build is unaffected; this just silences the dev-server warning.
      exclude: ["astro-portabletext"],
    },
  },
});
