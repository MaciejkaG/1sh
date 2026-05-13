import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { db } from "@/db/client";
import { link, linkEvent } from "@/db/schema";
import { eq, and, count as drizzleCount } from "drizzle-orm";

export async function GET() {
  const session = await requireUser();

  const links = await db
    .select({
      id: link.id,
      url: link.url,
      custom: link.custom,
      createdAt: link.createdAt,
      clicks: drizzleCount(linkEvent.id),
    })
    .from(link)
    .leftJoin(linkEvent, eq(link.id, linkEvent.linkId))
    .where(and(eq(link.userId, session.user.id), eq(link.blacklisted, false)))
    .groupBy(link.id)
    .orderBy(link.createdAt);

  return NextResponse.json({ success: true, links }, { status: 200 });
}
