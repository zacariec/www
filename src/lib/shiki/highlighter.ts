/**
 * Shiki highlighter singleton with explicit static grammar/theme imports.
 *
 * Why this file exists
 * --------------------
 * The session-tape preview route runs in the Cloudflare Workers runtime
 * (`prerender: false`). Shiki's default `codeToHtml` lazy-loads its language
 * grammars via dynamic imports — workerd can't resolve those at runtime, so
 * the preview was always hitting our try/catch fallback and rendering plain
 * monochrome code (no colours, which is the bug Adam saw in the preview
 * screenshots).
 *
 * Instead we build the highlighter once at module load, passing grammars
 * and the theme as static ESM imports. Vite bundles those into the worker
 * module directly, so codeToHtml works the same in static build and in
 * the preview runtime. The JS regex engine avoids needing to ship a WASM
 * loader alongside — simpler for Workers.
 */

import { createHighlighterCore } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";

import type { HighlighterCore } from "@shikijs/core";

/**
 * Languages we support in the Sanity schema. `text` is shiki's built-in
 * no-grammar fallback; everything else is statically imported below.
 * Anything the editor picks that isn't in this list gets rendered as
 * plain text (still inside the tokyo-night shell).
 */
export const SUPPORTED_LANGUAGES = [
  "text",
  "bash",
  "css",
  "diff",
  "html",
  "javascript",
  "json",
  "liquid",
  "markdown",
  "python",
  "sql",
  "tsx",
  "typescript",
  "yaml",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const SHIKI_THEME = "tokyo-night";

let highlighterPromise: Promise<HighlighterCore> | null = null;

export async function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
    themes: [import("@shikijs/themes/tokyo-night")],
    langs: [
      import("@shikijs/langs/bash"),
      import("@shikijs/langs/css"),
      import("@shikijs/langs/diff"),
      import("@shikijs/langs/html"),
      import("@shikijs/langs/javascript"),
      import("@shikijs/langs/json"),
      import("@shikijs/langs/liquid"),
      import("@shikijs/langs/markdown"),
      import("@shikijs/langs/python"),
      import("@shikijs/langs/sql"),
      import("@shikijs/langs/tsx"),
      import("@shikijs/langs/typescript"),
      import("@shikijs/langs/yaml"),
    ],
  });
  return highlighterPromise;
}

export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}
