# zcarr.dev

Sessions, tapes and thoughts. An Astro multi-page site with an embedded Sanity Studio.

## Stack

- Astro 6, server-rendered on Cloudflare Workers
- Sanity, with Studio at `/studio` and draft Presentation previews at `/preview`
- Tailwind CSS 4 and CSS cross-document View Transitions; no client-side router
- Self-hosted Host Grotesk and IBM Plex Mono; light-only paper/ink theme
- One shared WebGL renderer per page, with CPU fallback and reduced-motion static frames
- Better Auth and Cloudflare D1 for reader sessions; Resend for newsletters
- bun for dependency management and commands

Public routes remain `/`, `/sessions`, `/sessions/[slug]` and `/timeline`; `/about` and `/rss.xml` are available. Legacy `/blog` URLs redirect to `/sessions`.

## Development

```bash
bun install
bunx wrangler d1 migrations apply DB --local
bun dev
```

Use `http://localhost:4321` consistently when configuring OAuth and `BETTER_AUTH_URL`. Add the exact Studio development origin to the Sanity project's credentialed CORS allowlist. Studio uses Sanity's Google sign-in, separately from reader authentication.

| Command | Purpose |
| --- | --- |
| `bun dev` | Astro development server |
| `bun run check` | Astro and TypeScript contract checks |
| `bun lint` | ESLint |
| `bun run build` | Generate cursor assets and build the Worker/site |
| `bun start` | Preview the production build locally |
| `bun run format` | Format Astro, TypeScript and CSS source |
| `bun scripts/migrate-data.ts` | Dry-run the redesign content migration |

Run development, Astro checks and builds sequentially: they share Vite's dependency cache. Brand/font regeneration is optional; committed assets need no Python dependencies at build time. `scripts/generate-brand-assets.py` uses fonttools, brotli, cairosvg and Pillow, with pinned upstream font hashes and bundled font licenses.

## Configuration

Public build variables:

```dotenv
PUBLIC_SANITY_PROJECT_ID=
PUBLIC_SANITY_DATASET=production
PUBLIC_SANITY_API_VERSION=2026-03-26
```

Keep runtime secrets in local `.env.local` for development and Cloudflare Worker secrets for deployment, never in `PUBLIC_*` variables:

```dotenv
SITE_URL=https://zcarr.dev
BETTER_AUTH_URL=https://zcarr.dev
BETTER_AUTH_SECRET=
SANITY_API_TOKEN=
SANITY_WEBHOOK_SECRET=

AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_X_ID=
AUTH_X_SECRET=
AUTH_LINKEDIN_ID=
AUTH_LINKEDIN_SECRET=

# Existing Google reader accounts remain usable in account preferences.
# This is not the Studio's Google configuration.
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

RESEND_API_KEY=
RESEND_AUDIENCE_ID=
RESEND_FROM_EMAIL=
```

OAuth callback URLs are `/api/auth/callback/github`, `/api/auth/callback/twitter` (X), and `/api/auth/callback/linkedin` on the configured origin. Missing provider credentials leave the corresponding reader sign-in control unavailable; Google is not substituted for X or LinkedIn in the thread. `AUTH_SECRET` remains the existing alternative to `BETTER_AUTH_SECRET`.

`COMMENT_AUTHOR_IDENTITIES` is a JSON array of verified provider identities, for example `[{"provider":"github","providerId":"<actual-provider-id>"}]`. Use immutable provider IDs, not handles or email addresses. Studio author replies separately require Site Config's `authorSanityId` to match the actual signed-in Sanity user. Being an administrator alone does not grant an AUTHOR badge.

The server-side `SANITY_API_TOKEN` must permit comment creation and updates for posting and likes. A read-only token can render draft previews but cannot support reader mutations. Keep this token server-only; Studio's signed-in browser credentials do not grant the Worker write access.

Site Config controls the headline, README copy, ticker, socials, display version, tone shift, newsletter copy and moderation default. New comments publish immediately by the chosen default. Add Zac's actual bio before considering `/about` editorially complete; no mock bio is supplied. Timeline entries, including X entries, are entered manually.

## Content contracts

- Session numbers derive chronologically from publish dates; draft variants share the published document's number.
- Read time derives from the real body at 200 words/minute, unless `readTimeOverride` is explicitly set.
- Tape contents derive from h2 blocks; image GIFs retain the original Sanity asset URL.
- Tone order is pink, blue, sand, sage, lilac, apricot. Formula: `(number × 5 + shift) mod 6`, default shift 1. A document override beats the formula; `?tone` beats the document override on a detail page. Valid `?shift` and `?tone` persist through internal links.
- Reader highlights and board layouts persist locally. Studio's Thoughts board saves the canonical `board` fields; reader dragging never writes to Sanity.
- Reader comments use same-origin authenticated API routes, plain-text validation, per-user/IP rate limits and server-only Sanity writes. Public queries expose approved comments and explicit public author fields only.

## Redesign migration and rollout

The migration extends the existing document types and retains slugs, body content and references. It is dry-run by default, revision guarded and idempotent. It does **not** seed demonstration content.

1. Back up production, including assets, and import that backup into an isolated Sanity dataset. Dataset creation/import requires the corresponding Sanity permissions; a content-read token alone is insufficient.
2. Disable the production newsletter publication webhook before the eventual production migration: updates to historical sessions can otherwise trigger broadcasts.
3. Verify the migration on the copy, inspect the resulting content and run the dry-run again. The second run must report zero patches.

```bash
# Local NDJSON transformation; input is unchanged and output must not exist.
bun scripts/migrate-data.ts --input /path/export.ndjson --output /path/migrated.ndjson
bun scripts/migrate-data.ts --input /path/migrated.ndjson

# Remote isolated dataset, after backup import.
bun scripts/migrate-data.ts --dataset redesign-qa
bun scripts/migrate-data.ts --dataset redesign-qa --confirm-dataset redesign-qa --apply
bun scripts/migrate-data.ts --dataset redesign-qa
```

Known production session IDs have an explicit reviewed kind mapping: Ripcord and Osmose are tapes. Unknown unmigrated IDs require `--kinds /path/kinds.json`, mapping IDs to `session` or `tape`; runtime rendering does not guess from titles. Historical read-time strings are reported and replaced by computed counts, not silently converted into permanent overrides. Use `--read-time-overrides /path/overrides.json` only for deliberately reviewed numeric overrides.

Historical public comments remain approved; draft and explicit moderation states are retained. Legacy identities derive from canonical comment IDs, not hashes of private emails. Original display handles are retained, and legacy public email fields are removed from the transformed copy.

Only after a successful dataset-copy verification and explicit rollout approval:

```bash
bun scripts/migrate-data.ts --dataset production --confirm-dataset production --allow-production --apply
bunx wrangler d1 migrations apply DB --remote
```

The D1 migrations include reader provider profiles. Configure provider credentials and actual author identities before validating signed-in posting, liking and author replies. Review the broadcast ledger and re-enable the newsletter webhook after migration. Until migration, old documents have no tape/board fields: the site does not fabricate these values.

The newsletter publication webhook now identifies a document, and the server fetches its published content and computes the same read time as the site:

```groq
{"id": _id, "type": _type}
```

Use the existing `sessionTape` publication filter and webhook signature secret. Do not send stored `readingTime` as the authoritative value. The notification endpoint takes `{email, session}`, where `session` is a published document ID.

## Verification

The redesign was exercised locally against the built Cloudflare Worker at 390, 924, 1280 and 1920px. Checks covered the six public views, mobile overflow, stacked thread positioning, paragraph actions and saved highlights, keyboard board movement, two-column tablet layout, navigation dismissal, persistent tone parameters and reduced motion. Public views created one WebGL context each.

Mobile article metadata uses fixed grid columns and a reserved remaining-time field so changing digit counts do not shift neighbouring labels. Reading counters update only when their displayed values change, with geometry reads completed before DOM writes. Scroll checks covered forward/reverse progress across digit boundaries on sessions and tapes at 320, 390 and 720px, plus the desktop reading panel at 1280px; the mobile bar stayed 40px high and unchanged scroll events produced no counter mutations. Physical iOS browser-toolbar behaviour was not exercised.

Mobile Lighthouse measured 99 Performance / 100 Accessibility on the homepage (CLS 0.00002), and 98 / 100 on the long-form tape rendered from a migrated real-content copy (CLS 0.00003). The 19-document local migration copy produced zero patches on its second pass. Temporary verification routes were removed.

For browser mutation checks, Wrangler's local proxy normalizes the `Origin` header and removes the development port. The verified local-only invocation is `bunx wrangler dev --config dist/server/wrangler.json --port 4321 --ip 127.0.0.1 --local-upstream localhost:4321 --upstream-protocol http --var SITE_URL:http://localhost`. Do not copy that `SITE_URL` override into production; production must use its actual public origin. Both unauthenticated mutation routes returned JSON 401 from the browser under this local configuration.

Authenticated Studio acceptance used a temporary Sanity dataset containing the 19 already-public production documents and their referenced assets. The revision-guarded migration committed through the signed-in Studio account; the second remote dry run produced zero patches. Browser checks verified approve/hide, author replies with the actual Sanity identity, saved board movement and visibility, Cortex focus highlighting, searchable session previews, numbered paragraphs and anchored reply counts, draft-only colour/SEO edits, and connected Presentation navigation rendering those drafts. The temporary dataset was deleted afterward; all 19 production content revisions remained unchanged.

The signed-in pass fixed the Studio theme provider, rich session-list rendering and timeline date projection. It also exposed missing visual-editing dependency prebundling and mid-request SSR re-optimization; the Vite configuration now prebundles the browser integration and leaves Astro component entry points to Astro.

Production rollout on 2026-09-28 backed up D1 and exported Sanity with all 17 assets, applied D1 migration `0005_reader_profiles.sql`, and revision-guardedly migrated all 19 content documents. A second production migration pass returned zero patches. Protected backups are retained on the deployment workstation under `~/.local/state/zcarr/backups/20260928/`.

The deployed Worker uses a dedicated write-capable Sanity token, the verified Studio author identity, and a server-only mapping for the owner's verified Google reader identity. Production browser checks completed Google OAuth, posted an approved comment anchored to paragraph 1 with the AUTHOR badge, and verified likes remained at one across repeated requests. The temporary comment was deleted afterward. All six public views, RSS and Studio returned complete successful responses; desktop and 390px mobile rendering and tone-preserving navigation were checked. The authenticated production Studio loaded all 11 rich session previews.

Production verification corrected two integration failures: Better Auth requires an absolute same-origin callback to retain the thread fragment, and legacy `/blog` redirects run in middleware to avoid generated asset rules appending `/index.html` to SSR destinations. Legacy redirects return 301 and preserve query parameters. Final About biography copy is still required.

## Social previews

`/og/*.png` and `/og/sessions/{slug}.png` are server-rendered endpoints, not build artifacts. The Worker's `BROWSER` binding uses Cloudflare Browser Run and `@cloudflare/puppeteer` to capture the existing Astro templates at 1200×630. The templates reuse the site's self-hosted fonts, seeded dither engine, canonical tones and published Sanity content. Capture waits for fonts, fitted text and painted canvases with reduced motion enabled. `bun run build` does not generate PNGs or install a capture browser.

The generated images cover the site default, Sessions, Timeline, About, 404, and every published session or tape. Pages emit matching absolute Open Graph, Twitter and JSON-LD image URLs; article metadata includes the session ID, read time, publication date, author and section. Reader `shift`/`tone` parameters do not affect social previews. Studio remains `noindex, nofollow` without a share image, and `/og/render/*` is excluded from indexing and edge HTML caching.

Every image request resolves current published content and hashes the resulting template HTML, including its versioned asset URLs. Matching images are reused from the Workers Cache API for up to 24 hours; changed visible content produces a new cache key immediately, without a rebuild or webhook. The browser receives the exact HTML used for that key. HTTP clients revalidate with a weak ETag; HEAD and unchanged conditional requests do not acquire a browser. New sessions and tapes render their own images on their first request; unknown routes/slugs return 404, never a default-image redirect. Browser Run usage and concurrency are subject to the account's [plan limits](https://developers.cloudflare.com/browser-run/limits/).

## Deployment

The existing GitHub Actions workflow runs lint and build on pushes to `main`, then deploys with Wrangler. `wrangler.jsonc` defines the D1 and KV bindings; Astro emits the Worker deployment configuration under `dist/server`. Apply required D1 migrations and configure runtime secrets before release. Building or running the content migration in dry-run mode does not deploy or mutate production.

`SITE_URL` and `BETTER_AUTH_URL` are set to `https://zcarr.dev` in the Worker configuration. The deployment workflow removes Astro's generated `legacy_env` field, which current Wrangler no longer accepts, and retains the existing Durable Object migration history before deploying. Existing Worker secrets are preserved.

## License

MIT
