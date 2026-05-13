# 1sh — URL Shortener

The minimalist URL shortener with optional authentication, analytics, and admin controls.

## Features

- **Anonymous link creation** — anyone can shorten URLs without signing in
- **User accounts** — email/password and GitHub OAuth authentication
- **Custom slugs** — logged-in users can choose their own short links
- **Analytics** — per-link click tracking with daily breakdown, referer info, and country data
- **Link management** — edit destination, delete, list all user links
- **Domain blacklist** — exact and wildcard domain blocking
- **Admin panel** — manage users, links, analytics, and blacklist

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- pnpm (or npm/yarn)

### Environment Variables

Create `.env.local` with the following:

```
DATABASE_URL=postgres://user:pass@localhost:5432/onesh
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
ADMIN_EMAILS=owner@example.com,other@example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
TURNSTILE_SECRET_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — session signing key (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL` — public auth endpoint (must match your deployment domain)
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — GitHub OAuth credentials (optional)
- `ADMIN_EMAILS` — comma-separated emails to promote to admin on first startup
- `NEXT_PUBLIC_APP_URL` — public app URL (must be accessible to clients)
- `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Cloudflare Turnstile credentials

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Migrate the database:
   ```bash
   pnpm db:migrate
   ```

3. (Optional) Promote bootstrap admins via SQL:
   ```sql
   UPDATE "user" SET role='admin' WHERE email='owner@example.com';
   ```

4. Start the dev server:
   ```bash
   pnpm dev
   ```

Open http://localhost:3000 to begin.

## Development

- `pnpm dev` — start development server with Turbopack
- `pnpm build` — build for production
- `pnpm start` — run production build
- `pnpm lint` — run ESLint
- `pnpm tsc --noEmit` — check TypeScript
- `pnpm db:generate` — generate migrations after schema changes
- `pnpm db:migrate` — apply migrations
- `pnpm db:studio` — open Drizzle Studio for database inspection

## API

### Public

- `POST /api/v1/link` — create link (requires Turnstile token)

### Authenticated

- `GET /api/v1/me/links` — list user's links
- `GET /api/v1/me/links/[id]` — link details and analytics
- `PATCH /api/v1/me/links/[id]` — update destination URL
- `DELETE /api/v1/me/links/[id]` — delete link

### Admin-only

- `GET /api/v1/admin/blacklist` — list blacklist patterns
- `POST /api/v1/admin/blacklist` — add blacklist pattern
- `DELETE /api/v1/admin/blacklist?id=N` — remove blacklist pattern

## Database

Migrations are in `drizzle/`. Schema is defined in `src/db/schema.ts`.

Tables:
- `user` — better-auth users with `role` and `banned` fields
- `session` — better-auth sessions
- `account` — better-auth OAuth accounts
- `verification` — better-auth email verifications
- `link` — shortened links (slug, destination, owner, disabled flag)
- `link_event` — click events (country, referer, IP hash for dedup)
- `blacklist` — domain blacklist (pattern, reason, admin)

## Deployment

Deploy to Vercel:

1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Vercel will auto-build and deploy

For other platforms, ensure:
- PostgreSQL is accessible
- Node.js 18+ is available
- All env vars are set
- Run `pnpm db:migrate` on startup (or manually before first run)

## License

See LICENSE file.
