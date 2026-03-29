# zcarr.dev

A space for long-form thinking on design, engineering, and the details most people skip.

## Stack

- **Framework**: Next.js 15 (App Router, SSR)
- **CMS**: Sanity v3 (embedded studio at `/studio`)
- **Styling**: Tailwind CSS 4, Motion (Framer Motion)
- **Auth**: NextAuth v5 (GitHub, Google)
- **Deployment**: Cloudflare Containers
- **Package Manager**: bun

## Getting Started

```bash
bun install
bun dev
```

## Environment Variables

Copy `.env.local.example` or set these:

```
# Sanity (public, baked into build)
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2026-03-26
SANITY_API_TOKEN=

# Auth
AUTH_SECRET=          # openssl rand -base64 32
AUTH_URL=http://localhost:3000
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Spotify
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server (Turbopack) |
| `bun build` | Production build |
| `bun lint` | ESLint |
| `bun run scripts/migrate-data.ts` | Seed Sanity with fallback data |

## Deployment

Deploys automatically via GitHub Actions on push to `main`. Uses Cloudflare Containers with a multi-stage Docker build.

```bash
# Manual deploy
bunx wrangler@latest deploy
```

## License

MIT
