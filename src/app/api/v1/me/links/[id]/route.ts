import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { db } from "@/db/client";
import { link, linkEvent } from "@/db/schema";
import { eq, and, gte, count as drizzleCount } from "drizzle-orm";
import { isBlacklisted } from "@/lib/blacklist";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireUser();
  const { id } = await params;

  const linkRow = await db
    .select()
    .from(link)
    .where(and(eq(link.id, id), eq(link.userId, session.user.id)))
    .limit(1);

  if (!linkRow.length) {
    return NextResponse.json({ success: false, error: "Link not found." }, { status: 404 });
  }

  // Get daily click breakdown for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyBreakdown = await db
    .select({
      date: linkEvent.at,
      count: drizzleCount(linkEvent.id),
    })
    .from(linkEvent)
    .where(and(eq(linkEvent.linkId, id), gte(linkEvent.at, thirtyDaysAgo)))
    .groupBy(linkEvent.at)
    .orderBy(linkEvent.at);

  const totalClicks = await db
    .select({ count: drizzleCount(linkEvent.id) })
    .from(linkEvent)
    .where(eq(linkEvent.linkId, id));

  return NextResponse.json({
    success: true,
    link: linkRow[0],
    totalClicks: totalClicks[0]?.count ?? 0,
    dailyBreakdown,
  }, { status: 200 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireUser();
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const linkRow = await db
    .select()
    .from(link)
    .where(and(eq(link.id, id), eq(link.userId, session.user.id)))
    .limit(1);

  if (!linkRow.length) {
    return NextResponse.json({ success: false, error: "Link not found." }, { status: 404 });
  }

  if (!body.url) {
    return NextResponse.json({ success: false, error: "URL is required." }, { status: 400 });
  }

  if (await isBlacklisted(body.url)) {
    return NextResponse.json({ success: false, error: "Destination is not allowed." }, { status: 422 });
  }

  await db.update(link).set({ url: body.url }).where(eq(link.id, id));

  return NextResponse.json({ success: true }, { status: 200 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireUser();
  const { id } = await params;

  const linkRow = await db
    .select()
    .from(link)
    .where(and(eq(link.id, id), eq(link.userId, session.user.id)))
    .limit(1);

  if (!linkRow.length) {
    return NextResponse.json({ success: false, error: "Link not found." }, { status: 404 });
  }

  await db.delete(link).where(eq(link.id, id));

  return NextResponse.json({ success: true }, { status: 200 });
}
