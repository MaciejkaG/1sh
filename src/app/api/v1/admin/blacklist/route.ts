import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db/client";
import { blacklist, link, user } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { blacklistAddSchema } from "@/lib/schemas";
import { invalidateBlacklistCache, isBlacklisted } from "@/lib/blacklist";
import { sendLinkBlacklistedEmail } from "@/lib/email";

export async function GET() {
  await requireAdmin();

  const patterns = await db.select().from(blacklist).orderBy(blacklist.createdAt);

  return NextResponse.json({ success: true, patterns }, { status: 200 });
}

export async function POST(request: NextRequest) {
  await requireAdmin();

  let body;
  try {
    const res = await request.json();
    body = blacklistAddSchema.parse(res);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  try {
    await db.insert(blacklist).values({
      pattern: body.pattern,
      reason: body.reason ?? null,
    });
    invalidateBlacklistCache();
  } catch {
    return NextResponse.json({ success: false, error: "Pattern already exists." }, { status: 409 });
  }

  // Retroactively mark existing links whose destination now matches the new pattern.
  try {
    const allLinks = await db
      .select({ id: link.id, url: link.url, userId: link.userId })
      .from(link)
      .where(eq(link.blacklisted, false));

    const toBlacklist: string[] = [];
    for (const l of allLinks) {
      if (await isBlacklisted(l.url)) toBlacklist.push(l.id);
    }

    if (toBlacklist.length > 0) {
      await db.update(link).set({ blacklisted: true }).where(inArray(link.id, toBlacklist));

      // Notify owners.
      const affected = allLinks.filter((l) => toBlacklist.includes(l.id) && l.userId);
      if (affected.length > 0) {
        const userIds = [...new Set(affected.map((l) => l.userId!))];
        const owners = await db
          .select({ id: user.id, email: user.email })
          .from(user)
          .where(inArray(user.id, userIds));
        const emailMap = new Map(owners.map((u) => [u.id, u.email]));

        for (const l of affected) {
          const email = l.userId ? emailMap.get(l.userId) : undefined;
          if (email) void sendLinkBlacklistedEmail(email, l.id);
        }
      }
    }
  } catch { /* non-fatal — pattern was already added */ }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  await requireAdmin();

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "ID is required." }, { status: 400 });
  }

  await db.delete(blacklist).where(eq(blacklist.id, parseInt(id)));

  invalidateBlacklistCache();

  return NextResponse.json({ success: true }, { status: 200 });
}
