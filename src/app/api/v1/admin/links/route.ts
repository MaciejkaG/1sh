import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db/client";
import { link, linkEvent, user } from "@/db/schema";
import { eq, like, count as drizzleCount } from "drizzle-orm";

export async function GET(request: NextRequest) {
  await requireAdmin();

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const whereClause = filter ? like(link.id, `%${filter}%`) : undefined;

  const links = await db
    .select({
      id: link.id,
      url: link.url,
      userId: link.userId,
      custom: link.custom,
      disabled: link.disabled,
      blacklisted: link.blacklisted,
      createdAt: link.createdAt,
      userEmail: user.email,
      clicks: drizzleCount(linkEvent.id),
    })
    .from(link)
    .leftJoin(user, eq(link.userId, user.id))
    .leftJoin(linkEvent, eq(link.id, linkEvent.linkId))
    .where(whereClause)
    .groupBy(link.id, user.email)
    .orderBy(link.createdAt)
    .limit(pageSize + 1)
    .offset(offset);

  const hasMore = links.length > pageSize;
  return NextResponse.json({ success: true, links: links.slice(0, pageSize), hasMore }, { status: 200 });
}
