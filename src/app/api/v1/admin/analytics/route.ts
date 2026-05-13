import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { db } from "@/db/client";
import { link, linkEvent } from "@/db/schema";
import { count as drizzleCount, gte, desc, eq, sql } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

const RANGE_DAYS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

const WEEKLY_RANGES = new Set(["90d", "1y"]);

function truncByDay(col: AnyColumn) {
  return sql<string>`DATE_TRUNC('day', ${col})::date::text`;
}

function truncByWeek(col: AnyColumn) {
  return sql<string>`DATE_TRUNC('week', ${col})::date::text`;
}

const DAY_MS = 86400000;

function getUTCMonday(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
}

function fillDailyGaps(
  data: { date: string; count: number }[],
  days: number,
): { date: string; count: number }[] {
  const map = new Map(data.map((d) => [d.date, d.count]));
  const result: { date: string; count: number }[] = [];
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    const key = new Date(now - i * DAY_MS).toISOString().slice(0, 10);
    result.push({ date: key, count: map.get(key) ?? 0 });
  }
  return result;
}

function fillWeeklyGaps(
  data: { date: string; count: number }[],
  days: number,
): { date: string; count: number }[] {
  const map = new Map(data.map((d) => [d.date, d.count]));
  const result: { date: string; count: number }[] = [];
  const now = Date.now();
  let current = getUTCMonday(new Date(now - days * DAY_MS));
  const end = getUTCMonday(new Date(now));
  while (current <= end) {
    const key = current.toISOString().slice(0, 10);
    result.push({ date: key, count: map.get(key) ?? 0 });
    current = new Date(current.getTime() + 7 * DAY_MS);
  }
  return result;
}

export async function GET(req: NextRequest) {
  await requireAdmin();

  const range = new URL(req.url).searchParams.get("range") ?? "30d";
  const days = RANGE_DAYS[range] ?? 30;
  const weekly = WEEKLY_RANGES.has(range);

  const since = new Date(Date.now() - days * DAY_MS);

  const truncClick = weekly ? truncByWeek(linkEvent.at) : truncByDay(linkEvent.at);
  const truncLinkAt = weekly ? truncByWeek(link.createdAt) : truncByDay(link.createdAt);
  const truncClickGroup = weekly
    ? sql`DATE_TRUNC('week', ${linkEvent.at})`
    : sql`DATE_TRUNC('day', ${linkEvent.at})`;
  const truncLinkGroup = weekly
    ? sql`DATE_TRUNC('week', ${link.createdAt})`
    : sql`DATE_TRUNC('day', ${link.createdAt})`;

  const [clickRows, linkRows, topLinkRows] = await Promise.all([
    db
      .select({ date: truncClick, count: drizzleCount(linkEvent.id) })
      .from(linkEvent)
      .where(gte(linkEvent.at, since))
      .groupBy(truncClickGroup)
      .orderBy(truncClickGroup),

    db
      .select({ date: truncLinkAt, count: drizzleCount(link.id) })
      .from(link)
      .where(gte(link.createdAt, since))
      .groupBy(truncLinkGroup)
      .orderBy(truncLinkGroup),

    db
      .select({
        id: link.id,
        url: link.url,
        clicks: drizzleCount(linkEvent.id),
      })
      .from(link)
      .innerJoin(linkEvent, eq(linkEvent.linkId, link.id))
      .where(gte(linkEvent.at, since))
      .groupBy(link.id, link.url)
      .orderBy(desc(drizzleCount(linkEvent.id)))
      .limit(10),
  ]);

  const fill = weekly ? fillWeeklyGaps : fillDailyGaps;

  return NextResponse.json({
    clicks: fill(clickRows, days),
    linksCreated: fill(linkRows, days),
    topLinks: topLinkRows,
    weekly,
  });
}
