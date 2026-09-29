/**
 * THIS FILE WAS AUTO-GENERATED.
 * PLEASE DO NOT EDIT IT MANUALLY.
 * ===============================
 * IF YOU COPY THIS INTO AN ESLINT CONFIG, REMOVE THIS COMMENT BLOCK.
 */

import path from "node:path";

import { includeIgnoreFile } from "@eslint/compat";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import { configs, plugins, rules } from "eslint-config-airbnb-extended";
import { rules as prettierConfigRules } from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

const gitignorePath = path.resolve(".", ".gitignore");

const jsConfig = defineConfig([
  // ESLint recommended config
  {
    name: "js/config",
    ...js.configs.recommended,
  },
  // Stylistic plugin
  plugins.stylistic,
  // Import X plugin
  plugins.importX,
  // Airbnb base recommended config
  ...configs.base.recommended,
  // Strict import rules
  rules.base.importsStrict,
]);

const nextConfig = defineConfig([
  // React plugin
  plugins.react,
  // React hooks plugin
  plugins.reactHooks,
  // React JSX A11y plugin
  plugins.reactA11y,
  // Next.js plugin
  plugins.next,
  // Airbnb Next.js recommended config
  ...configs.next.recommended,
  // Strict React rules
  rules.react.strict,
]);

const typescriptConfig = defineConfig([
  // TypeScript ESLint plugin
  plugins.typescriptEslint,
  // Airbnb base TypeScript config
  ...configs.base.typescript,
  // Strict TypeScript rules
  rules.typescript.typescriptEslintStrict,
  // Airbnb Next.js TypeScript config
  ...configs.next.typescript,
]);

const prettierConfig = defineConfig([
  // Prettier plugin
  {
    name: "prettier/plugin/config",
    plugins: {
      prettier: prettierPlugin,
    },
  },
  // Prettier config
  {
    name: "prettier/config",
    rules: {
      ...prettierConfigRules,
      "prettier/prettier": "error",
    },
  },
]);

export default defineConfig([
  // Ignore files and folders listed in .gitignore
  includeIgnoreFile(gitignorePath),
  // Additional ignores
  {
    ignores: ["worker.ts", "src/sanity/**", "next-env.d.ts", "emails/**"],
  },
  // JavaScript config
  ...jsConfig,
  // Next.js config
  ...nextConfig,
  // TypeScript config
  ...typescriptConfig,
  // Prettier config
  ...prettierConfig,
  // Scripts overrides
  {
    files: ["scripts/**/*.ts"],
    rules: {
      "no-await-in-loop": "off",
      "no-console": "off",
    },
  },
  // Project overrides
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "import-x/prefer-default-export": "off",
      "react/require-default-props": "off",
      "react/react-in-jsx-scope": "off",
      // React islands use Astro navigation, not Next.js Link.
      "@next/next/no-html-link-for-pages": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "no-underscore-dangle": ["error", { allow: ["_id", "_type", "_key", "_ref"] }],
      "no-restricted-syntax": "off",
      "no-plusplus": "off",
      "no-continue": "off",
      "consistent-return": "off",
      "import-x/no-unresolved": ["error", { ignore: ["^cloudflare:", "^astro:", "^bun:"] }],
      "react/jsx-fragments": ["error", "syntax"],
      "react/jsx-no-useless-fragment": "off",
      "react/function-component-definition": "off",
      "react/no-array-index-key": "warn",
      "jsx-a11y/label-has-associated-control": ["error", { assert: "either", depth: 3 }],
    },
  },
  {
    // DOM and renderer state are intentionally updated in place.
    files: ["src/scripts/*.ts", "src/lib/zc-gl.ts", "src/lib/zc-heat.ts", "src/lib/dither-wipe.ts"],
    rules: {
      "no-param-reassign": ["error", { props: false }],
      "@typescript-eslint/no-use-before-define": ["error", { functions: false }],
    },
  },
  {
    // Deterministic integer PRNG, Bayer indexing, and PNG CRC require bitwise arithmetic.
    files: [
      "src/lib/zc-gl.ts",
      "src/lib/zc-heat.ts",
      "src/lib/dither-wipe.ts",
      "scripts/build-cursors.ts",
    ],
    rules: { "no-bitwise": "off" },
  },
]);
