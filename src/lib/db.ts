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
