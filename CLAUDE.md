# CLAUDE.md

## Project Overview
Personal journal/blog for ZC. Built with Next.js 15 (App Router), Sanity CMS, Tailwind CSS 4, TypeScript, and Motion (Framer Motion).

## Architecture
- **Atomic design**: `src/components/{atoms,molecules,organisms,templates}/`
- **Sanity CMS**: Schemas in `src/sanity/schema/`, embedded studio at `/studio`
- **Server components by default**; `'use client'` only when needed (hooks, browser APIs, motion animations)
- **Fallback data**: Site works without Sanity configured via `src/lib/fallback-data.ts`

## Commands
- `bun dev` — Start development server (Turbopack)
- `bun build` — Production build
- `bun lint` — ESLint
- `bun run scripts/migrate-data.ts` — Migrate fallback data to Sanity

## Package Manager
Always use `bun`. Never `npm` or `yarn`.

## Design System
- **Fonts**: Space Grotesk (headings, UI), Inter (body text) via `next/font`
- **Colors**: Black `#000000` primary, off-white `#f9f9f7` background, grey `#777777` muted, `#c6c6c6` subtle, `#1a1c1b` dark
- **Aesthetic**: Minimalist, brutalist, generous whitespace, uppercase tracking on labels

## Key Conventions
- All component prop interfaces are explicit TypeScript types
- Font references use `font-[family-name:var(--font-space-grotesk)]` or `font-[family-name:var(--font-inter)]`
- GROQ queries centralized in `src/lib/sanity/queries.ts`
- Sanity types in `src/lib/sanity/types.ts`
- Site constants (nav items, social links) in `src/lib/constants.ts`

## Git
- Username: `zacariec`
- Email: `zacariealancarr@gmail.com`
- SSH key: `~/.ssh/personal`
- No references to indffrnt. anywhere in this project

## File Structure
```
src/
  app/                    # Next.js App Router pages
    layout.tsx            # Root layout
    page.tsx              # Home
    blog/                 # Blog pages
    timeline/             # Timeline page
    studio/               # Sanity Studio
    api/comments/         # Comment API
  components/
    atoms/                # Smallest UI elements
    molecules/            # Small composed groups
    organisms/            # Large sections
    templates/            # Page-level wrappers
    ui/                   # Utility (cn helper)
  lib/
    sanity/               # Sanity client, queries, types, fetch
    fonts.ts              # next/font definitions
    constants.ts          # Site config
    fallback-data.ts      # Static data (pre-Sanity)
  sanity/
    schema/               # Sanity document schemas
    sanity.config.ts      # Sanity configuration
    env.ts                # Sanity env vars
```

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current
