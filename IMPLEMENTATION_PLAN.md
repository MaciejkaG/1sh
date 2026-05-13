# 1sh — Auth, Postgres, Analytics, Blacklist, Admin

Executor: Claude Haiku 4.5. Follow phases in order. Do not skip ahead. Run `pnpm tsc --noEmit` after each phase to catch type errors. Run `pnpm lint` before commits.

## Goals

1. Add **better-auth** (email/password + GitHub OAuth).
2. Migrate storage from **Redis → Postgres** (Drizzle ORM).
3. Make auth **optional**: anonymous users keep creating links; logged-in users get extras.
4. Logged-in features: custom slug, link list, delete, per-link analytics, edit destination.
5. Domain blacklist (exact + wildcard).
6. Admin panel at `/admin` (role-gated): manage links, users, blacklist.

## Stack additions

- `better-auth` — auth.
- `drizzle-orm`, `drizzle-kit`, `pg` (or `postgres`) — Postgres + ORM. **Use `postgres` driver (postgres.js).**
- `@better-auth/cli` — schema generation helpers (optional but useful).
- Keep `nanoid` for slug generation.
- Remove `redis` from deps when migration is done (last step of Phase 2).

## Environment variables

Add to `.env.local` (do NOT commit). Document them in `README.md`:

```
DATABASE_URL=postgres://user:pass@host:5432/onesh
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
ADMIN_EMAILS=owner@example.com,other@example.com   # comma-separated bootstrap admins
NEXT_PUBLIC_APP_URL=http://localhost:3000          # rename from NEXT_PUBLIC_API_URL usage where it's actually the app origin
```

Keep existing `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

---

## Phase 0 — Branch + deps

1. Create branch: `git checkout -b feat/auth-postgres-admin`.
2. Install:
   ```
   pnpm add better-auth drizzle-orm postgres
   pnpm add -D drizzle-kit @types/pg
   ```
3. Do NOT remove `redis` yet. It stays until Phase 2 ends.
4. Commit: `chore: add deps for auth + postgres`.

---

## Phase 1 — Postgres schema + Drizzle

### 1.1 Drizzle config

Create `drizzle.config.ts` at repo root:

```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
} satisfies Config;
```

### 1.2 DB client

Create `src/db/client.ts`:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  conn: ReturnType<typeof postgres> | undefined;
};

const conn =
  globalForDb.conn ?? postgres(process.env.DATABASE_URL!, { max: 10 });

if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
```

### 1.3 Schema

Create `src/db/schema.ts`. Defines better-auth tables + app tables. Use better-auth's required column names exactly (do not rename). Reference: better-auth docs `core/database` — required fields for `user`, `session`, `account`, `verification`.

```ts
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
  serial,
} from "drizzle-orm/pg-core";

// ----- better-auth tables -----

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"), // "user" | "admin"
  banned: boolean("banned").notNull().default(false),
  banReason: text("banReason"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  idToken: text("idToken"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// ----- app tables -----

export const link = pgTable(
  "link",
  {
    id: text("id").primaryKey(), // slug; nanoid(6) or custom
    url: text("url").notNull(),
    userId: text("userId").references(() => user.id, { onDelete: "set null" }),
    custom: boolean("custom").notNull().default(false),
    disabled: boolean("disabled").notNull().default(false),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    expiresAt: timestamp("expiresAt"),
  },
  (t) => ({
    userIdx: index("link_user_idx").on(t.userId),
  }),
);

export const linkEvent = pgTable(
  "link_event",
  {
    id: serial("id").primaryKey(),
    linkId: text("linkId")
      .notNull()
      .references(() => link.id, { onDelete: "cascade" }),
    at: timestamp("at").notNull().defaultNow(),
    country: text("country"),       // from cf-ipcountry or x-vercel-ip-country
    referer: text("referer"),
    userAgent: text("userAgent"),
    ipHash: text("ipHash"),         // sha256(ip + DAILY_SALT) — for dedupe, never raw IP
  },
  (t) => ({
    linkIdx: index("link_event_link_idx").on(t.linkId),
    atIdx: index("link_event_at_idx").on(t.at),
  }),
);

export const blacklist = pgTable(
  "blacklist",
  {
    id: serial("id").primaryKey(),
    pattern: text("pattern").notNull().unique(), // "example.com" or "*.example.com"
    reason: text("reason"),
    addedBy: text("addedBy").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    patternIdx: uniqueIndex("blacklist_pattern_idx").on(t.pattern),
  }),
);
```

### 1.4 Migrations

1. Add scripts to `package.json`:
   ```json
   "db:generate": "drizzle-kit generate",
   "db:migrate": "drizzle-kit migrate",
   "db:studio": "drizzle-kit studio"
   ```
2. Run `pnpm db:generate` (commit the generated SQL in `drizzle/`).
3. User runs `pnpm db:migrate` manually when DB available.

### 1.5 Commit

`feat(db): add postgres schema + drizzle config`

---

## Phase 2 — Migrate Redis usage

### 2.1 Replace `src/lib/db.ts`

Rewrite as:

```ts
import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { link } from "@/db/schema";
import { eq } from "drizzle-orm";

const SLUG_LEN = 6;
const SLUG_RE = /^[A-Za-z0-9_-]{3,32}$/;

export class SlugTakenError extends Error {}
export class InvalidSlugError extends Error {}

export async function createLink(opts: {
  url: string;
  userId?: string | null;
  customSlug?: string | null;
}) {
  const { url, userId = null, customSlug = null } = opts;

  let id: string;
  let custom = false;

  if (customSlug) {
    if (!SLUG_RE.test(customSlug)) throw new InvalidSlugError("Invalid slug.");
    const existing = await db.select({ id: link.id }).from(link).where(eq(link.id, customSlug)).limit(1);
    if (existing.length) throw new SlugTakenError("Slug taken.");
    id = customSlug;
    custom = true;
  } else {
    // Retry on collision (extremely rare for 6 chars but cheap).
    for (let i = 0; i < 5; i++) {
      const candidate = nanoid(SLUG_LEN);
      const existing = await db.select({ id: link.id }).from(link).where(eq(link.id, candidate)).limit(1);
      if (!existing.length) { id = candidate; break; }
    }
    if (!id!) throw new Error("Could not allocate slug.");
  }

  await db.insert(link).values({ id, url, userId, custom });
  return id;
}

export async function getURL(linkId: string) {
  const rows = await db
    .select({ url: link.url, disabled: link.disabled, expiresAt: link.expiresAt })
    .from(link)
    .where(eq(link.id, linkId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.disabled) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;
  return row.url;
}
```

### 2.2 Click tracking helper

Create `src/lib/analytics.ts`:

```ts
import { createHash } from "crypto";
import { db } from "@/db/client";
import { linkEvent } from "@/db/schema";

function dailySalt() {
  const day = new Date().toISOString().slice(0, 10);
  return `${process.env.BETTER_AUTH_SECRET ?? "salt"}:${day}`;
}

export async function recordClick(opts: {
  linkId: string;
  ip?: string | null;
  country?: string | null;
  referer?: string | null;
  userAgent?: string | null;
}) {
  const ipHash = opts.ip
    ? createHash("sha256").update(opts.ip + dailySalt()).digest("hex")
    : null;
  await db.insert(linkEvent).values({
    linkId: opts.linkId,
    country: opts.country ?? null,
    referer: opts.referer ?? null,
    userAgent: opts.userAgent ?? null,
    ipHash,
  });
}
```

### 2.3 Wire into redirect route

Update `src/app/[id]/page.tsx`:

```ts
import { getURL } from "@/lib/db";
import { recordClick } from "@/lib/analytics";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

export default async function Link({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let url: string | null;
  try {
    url = await getURL(id);
  } catch {
    throw new Error("Failed to retrieve the long URL to redirect to.");
  }
  if (!url) notFound();

  const h = await headers();
  // Fire-and-forget but await briefly so it lands before redirect throw.
  try {
    await recordClick({
      linkId: id,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      country: h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? null,
      referer: h.get("referer"),
      userAgent: h.get("user-agent"),
    });
  } catch { /* swallow — never block redirect */ }

  redirect(url);
}
```

### 2.4 Remove Redis

1. Delete any leftover Redis imports (grep for `from "redis"`).
2. `pnpm remove redis`.
3. Drop `REDIS_URL` from any docs.

### 2.5 Commit

`feat: migrate storage redis → postgres`

---

## Phase 3 — better-auth

### 3.1 Config

Create `src/lib/auth.ts`:

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/client";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: { enabled: true, autoSignIn: true },
  socialProviders: process.env.GITHUB_CLIENT_ID
    ? {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        },
      }
    : undefined,
  user: { additionalFields: { role: { type: "string", defaultValue: "user", input: false } } },
  trustedOrigins: [process.env.BETTER_AUTH_URL!].filter(Boolean),
});

export type Session = typeof auth.$Infer.Session;
```

### 3.2 Client

Create `src/lib/auth-client.ts`:

```ts
"use client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

export const { useSession, signIn, signOut, signUp } = authClient;
```

### 3.3 Catch-all route

Create `src/app/api/auth/[...all]/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth.handler);
```

### 3.4 Server helper for session

Create `src/lib/session.ts`:

```ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

export async function requireAdmin() {
  const s = await requireUser();
  if (s.user.role !== "admin") throw new Error("FORBIDDEN");
  return s;
}
```

### 3.5 Admin bootstrap

Add `src/lib/bootstrap-admin.ts` (run once on app boot):

```ts
import { db } from "@/db/client";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function promoteBootstrapAdmins() {
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  for (const email of list) {
    await db.update(user).set({ role: "admin" }).where(eq(user.email, email));
  }
}
```

Call once at startup. Simplest: inside `src/app/layout.tsx` server component before rendering, guarded by a global flag — or skip entirely and let admin manually `UPDATE "user" SET role='admin' WHERE email='...'`. **Recommended: skip auto-call; document SQL command instead.** Add to README:
```sql
UPDATE "user" SET role='admin' WHERE email='owner@example.com';
```

### 3.6 Commit

`feat(auth): better-auth with email+github`

---

## Phase 4 — API + form updates

### 4.1 Update schemas

`src/lib/schemas.ts`:

```ts
import { z } from "zod";

export const createLinkSchema = z.object({
  url: z.string().url("The URL is incorrect.").max(2048),
  turnstileToken: z.string().min(1, "Please complete the captcha"),
  customSlug: z.string().regex(/^[A-Za-z0-9_-]{3,32}$/, "3–32 chars: letters, digits, _ or -").optional().or(z.literal("")),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const signUpSchema = signInSchema.extend({
  name: z.string().min(2).max(64),
});

export const blacklistAddSchema = z.object({
  pattern: z.string().min(3).max(255),
  reason: z.string().max(500).optional(),
});
```

### 4.2 Update `POST /api/v1/link`

`src/app/api/v1/link/route.ts`:

```ts
import { createLink, SlugTakenError, InvalidSlugError } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { createLinkSchema } from "@/lib/schemas";
import { verifyTurnstile } from "@/lib/helpers";
import { isBlacklisted } from "@/lib/blacklist";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  let body;
  try {
    const res = await request.json();
    body = createLinkSchema.parse(res);
  } catch {
    return NextResponse.json({ success: false, error: "Incorrect request body format." }, { status: 400 });
  }

  const ok = await verifyTurnstile(body.turnstileToken);
  if (!ok) return NextResponse.json({ success: false, error: "Turnstile verification failed." }, { status: 422 });

  const session = await getSession();

  // Anonymous users cannot use custom slugs.
  const customSlug = body.customSlug && session ? body.customSlug : null;
  if (body.customSlug && !session) {
    return NextResponse.json({ success: false, error: "Sign in to use custom slugs." }, { status: 401 });
  }

  if (await isBlacklisted(body.url)) {
    return NextResponse.json({ success: false, error: "Destination is not allowed." }, { status: 422 });
  }

  try {
    const id = await createLink({ url: body.url, userId: session?.user.id ?? null, customSlug });
    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (err) {
    if (err instanceof SlugTakenError) return NextResponse.json({ success: false, error: "That slug is taken." }, { status: 409 });
    if (err instanceof InvalidSlugError) return NextResponse.json({ success: false, error: "Invalid slug." }, { status: 422 });
    return NextResponse.json({ success: false, error: "Unknown server error." }, { status: 500 });
  }
}
```

Bug fix while there: `verifyTurnstile` was called without `await` previously. Make sure it's awaited (already is in fixed version above).

### 4.3 User link CRUD

Create `src/app/api/v1/me/links/route.ts`:

- `GET` → list current user's links with click counts (subquery COUNT on linkEvent).
- `DELETE` is per-link (see next file).

Create `src/app/api/v1/me/links/[id]/route.ts`:

- `GET` → single link with daily click breakdown last 30 days.
- `PATCH` → update destination URL (re-run blacklist check).
- `DELETE` → delete (cascades events).

Auth via `requireUser()` and ownership check `link.userId === session.user.id`.

### 4.4 Update `CreateLinkForm`

`src/components/CreateLinkForm.tsx`:

- Read `useSession()` to know if logged in.
- If logged in, render optional **Custom slug** input (`customSlug` field), with prefix `1sh.pl/`.
- Pass `customSlug` through to API.
- Field hidden for anonymous users.

### 4.5 Commit

`feat(api): optional auth, custom slugs, link CRUD`

---

## Phase 5 — Blacklist

### 5.1 Helper

Create `src/lib/blacklist.ts`:

```ts
import { db } from "@/db/client";
import { blacklist } from "@/db/schema";

let cache: { patterns: string[]; at: number } | null = null;
const TTL_MS = 30_000;

async function getPatterns(): Promise<string[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.patterns;
  const rows = await db.select({ pattern: blacklist.pattern }).from(blacklist);
  cache = { patterns: rows.map((r) => r.pattern.toLowerCase()), at: Date.now() };
  return cache.patterns;
}

export function invalidateBlacklistCache() { cache = null; }

export async function isBlacklisted(url: string): Promise<boolean> {
  let host: string;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return true; }

  const patterns = await getPatterns();
  for (const p of patterns) {
    if (p.startsWith("*.")) {
      const base = p.slice(2);
      if (host === base || host.endsWith("." + base)) return true;
    } else if (host === p) {
      return true;
    }
  }
  return false;
}
```

### 5.2 Admin endpoints

Create `src/app/api/v1/admin/blacklist/route.ts`:

- `GET` → list.
- `POST` → add (validate with `blacklistAddSchema`, call `invalidateBlacklistCache`).
- `DELETE` (with `?id=`) → remove (call `invalidateBlacklistCache`).

All guarded by `requireAdmin()`.

### 5.3 Commit

`feat: domain blacklist`

---

## Phase 6 — UI: auth pages + dashboard

Create using existing shadcn-style components (`Button`, `Input`, `Label`, `Form`).

### 6.1 `/login` and `/register`

- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/layout.tsx` — centered card layout, redirects to `/dashboard` if already signed in.

Use `authClient.signIn.email` / `authClient.signUp.email`. Show GitHub button via `authClient.signIn.social({ provider: "github" })` only if `NEXT_PUBLIC_GITHUB_ENABLED` set (env-driven).

### 6.2 `/dashboard`

`src/app/(app)/dashboard/page.tsx` — server component, calls `requireUser()`, lists user's links with: slug, destination (truncated), created, click count, actions (Edit / Analytics / Delete).

`src/app/(app)/dashboard/[id]/page.tsx` — single link analytics:
- Total clicks
- Daily line chart (last 30 days) — render as SVG manually or with `recharts` (only add `recharts` if low-cost; otherwise inline SVG with simple bars).
- Top referers (top 5)
- Top countries (top 5)
- Delete button

`src/app/(app)/dashboard/[id]/edit/page.tsx` — destination URL edit form.

Use `useSession()` in client islands for nav; the page itself is server.

### 6.3 Header / nav

Add a top nav inside the existing layout near the `h1`:
- If `useSession` → show `Dashboard`, `Sign out`.
- Else → show `Sign in`, `Create account`.

Keep it minimal — same styling as the footer link list.

### 6.4 Commit

`feat(ui): auth pages + user dashboard`

---

## Phase 7 — Admin panel

All routes server components, gated by `requireAdmin()`. Redirect to `/` on fail.

### 7.1 Routes

- `src/app/(admin)/admin/page.tsx` — counts: total users, total links, clicks last 7d, blacklist size.
- `src/app/(admin)/admin/links/page.tsx` — paginated table of all links. Filter by user email / slug. Actions: disable, delete, view analytics.
- `src/app/(admin)/admin/users/page.tsx` — list users, set/unset admin, ban/unban (sets `banned`, `banReason`; better-auth respects `banned` if you call `auth.api.banUser`). Use `auth.api.adminListUsers` if available; otherwise raw query.
- `src/app/(admin)/admin/blacklist/page.tsx` — list + add form + remove.

### 7.2 Server actions (preferred over more API routes)

Use Next.js server actions for admin mutations. Each action begins with `"use server"` and calls `requireAdmin()` first. After any blacklist mutation call `invalidateBlacklistCache()` and `revalidatePath("/admin/blacklist")`.

### 7.3 Disable link (vs delete)

`disabled = true` on `link` → `getURL` already returns null.

### 7.4 Commit

`feat: admin panel`

---

## Phase 8 — Cleanup + polish

1. Update `README.md` with: env vars, `pnpm db:migrate`, admin promotion SQL, feature list.
2. Verify `pnpm tsc --noEmit` passes.
3. Verify `pnpm lint` passes (autofix only formatting, never logic).
4. Manual smoke test (document, do not script):
   - Anon: create link → visit slug → redirect works. Custom slug field absent.
   - Sign up → see Dashboard.
   - Create link with custom slug `mytest`.
   - Collision: try same slug again → 409.
   - Click slug → event recorded → analytics page shows 1.
   - Delete link → 404 on slug.
   - Add `*.badsite.com` to blacklist → creating with `https://x.badsite.com/...` → 422.
   - Admin: promote self via SQL, then `/admin` loads.
5. Final commit: `docs: update README for auth + postgres`.

---

## Constraints / rules for executor

- **Do not** add features not listed here. No password reset emails, no rate limiting beyond what exists, no OpenAPI docs, no telemetry beyond `linkEvent`.
- **Do not** delete existing tests (there are none; do not add new test infra unless explicitly requested).
- **Do not** rename existing files unless the plan tells you to.
- Keep `verifyTurnstile` semantics; only fix the missing `await`.
- Keep `nanoid(6)` default length.
- Never log raw IPs. Always hash.
- Never expose `ipHash` or `userAgent` to non-admin UI.
- `redirect()` from `next/navigation` throws — call `recordClick` BEFORE `redirect`, never after.
- All admin checks happen server-side. Client-side hiding is cosmetic only.
- TypeScript strict mode is already on; preserve it. No `any` in new code; use `unknown` + narrowing.
- Commit messages: conventional commits, lowercase scope (`feat:`, `fix:`, `chore:`, `docs:`).
- One commit per phase (or sub-step where noted). Do not squash.

## Files created (summary)

```
drizzle.config.ts
drizzle/                          # generated migrations
src/db/client.ts
src/db/schema.ts
src/lib/auth.ts
src/lib/auth-client.ts
src/lib/session.ts
src/lib/analytics.ts
src/lib/blacklist.ts
src/app/api/auth/[...all]/route.ts
src/app/api/v1/me/links/route.ts
src/app/api/v1/me/links/[id]/route.ts
src/app/api/v1/admin/blacklist/route.ts
src/app/(auth)/layout.tsx
src/app/(auth)/login/page.tsx
src/app/(auth)/register/page.tsx
src/app/(app)/dashboard/page.tsx
src/app/(app)/dashboard/[id]/page.tsx
src/app/(app)/dashboard/[id]/edit/page.tsx
src/app/(admin)/admin/page.tsx
src/app/(admin)/admin/links/page.tsx
src/app/(admin)/admin/users/page.tsx
src/app/(admin)/admin/blacklist/page.tsx
```

## Files modified

```
package.json                      # deps + scripts
src/lib/db.ts                     # postgres impl
src/lib/schemas.ts                # new schemas
src/app/api/v1/link/route.ts      # session-aware, blacklist check, await turnstile
src/app/[id]/page.tsx             # record click
src/components/CreateLinkForm.tsx # custom slug field
src/app/layout.tsx                # nav slot (optional)
README.md                         # env + admin docs
```

## Files removed

```
(any leftover Redis references — only after Phase 2 ends)
```
