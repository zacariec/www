export const apiVersion =
  (import.meta.env?.PUBLIC_SANITY_API_VERSION ?? import.meta.env?.NEXT_PUBLIC_SANITY_API_VERSION) ||
  "2026-03-26";
export const dataset =
  (import.meta.env?.PUBLIC_SANITY_DATASET ?? import.meta.env?.NEXT_PUBLIC_SANITY_DATASET) ||
  "production";
export const projectId =
  (import.meta.env?.PUBLIC_SANITY_PROJECT_ID ?? import.meta.env?.NEXT_PUBLIC_SANITY_PROJECT_ID) ||
  "";
