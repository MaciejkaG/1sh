import { requireUser } from "@/lib/session";
import { db } from "@/db/client";
import { link, linkEvent } from "@/db/schema";
import { eq, and, gte, count as drizzleCount, sql } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import { ClicksChart } from "@/components/analytics/ClicksChart";
import { CountryMap } from "@/components/analytics/CountryMap";

export default async function LinkAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  const { id } = await params;

  const linkRow = await db
    .select()
    .from(link)
    .where(and(eq(link.id, id), eq(link.userId, session.user.id)))
    .limit(1);

  if (!linkRow.length) {
    notFound();
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyBreakdown = await db
    .select({
      date: sql<string>`DATE(${linkEvent.at})`.as("date"),
      count: drizzleCount(linkEvent.id),
    })
    .from(linkEvent)
    .where(and(eq(linkEvent.linkId, id), gte(linkEvent.at, thirtyDaysAgo)))
    .groupBy(sql`DATE(${linkEvent.at})`)
    .orderBy(sql`DATE(${linkEvent.at})`);

  const totalClicks = await db
    .select({ count: drizzleCount(linkEvent.id) })
    .from(linkEvent)
    .where(eq(linkEvent.linkId, id));

  const topReferers = await db
    .select({
      referer: linkEvent.referer,
      count: drizzleCount(linkEvent.id),
    })
    .from(linkEvent)
    .where(eq(linkEvent.linkId, id))
    .groupBy(linkEvent.referer)
    .orderBy(({ count }) => count)
    .limit(10);

  const allCountries = await db
    .select({
      country: linkEvent.country,
      count: drizzleCount(linkEvent.id),
    })
    .from(linkEvent)
    .where(eq(linkEvent.linkId, id))
    .groupBy(linkEvent.country)
    .orderBy(({ count }) => count);

  // Fill 30-day chart data with zeros for missing days
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  const clicksByDate = new Map(dailyBreakdown.map((r) => [r.date, r.count]));
  const chartData = days.map((date) => ({ date, count: clicksByDate.get(date) ?? 0 }));

  const topCountries = [...allCountries].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 10);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono">{id}</h1>
          <p className="text-muted-foreground text-sm mt-1 break-all">{linkRow[0]?.url}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">Back</Button>
          </Link>
          <Link href={`/dashboard/${id}/edit`}>
            <Button size="sm">Edit</Button>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Clicks</p>
          <p className="text-3xl font-bold mt-1">{totalClicks[0]?.count ?? 0}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Countries</p>
          <p className="text-3xl font-bold mt-1">{allCountries.filter((c) => c.country).length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Referers</p>
          <p className="text-3xl font-bold mt-1">{topReferers.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Last 30 Days</p>
          <p className="text-3xl font-bold mt-1">
            {chartData.reduce((s, d) => s + d.count, 0)}
          </p>
        </div>
      </div>

      {/* Daily chart */}
      <div className="border rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Clicks — Last 30 Days</h2>
        <ClicksChart data={chartData} />
      </div>

      {/* World map */}
      <div className="border rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Geographic Distribution</h2>
        <CountryMap countries={allCountries} />
      </div>

      {/* Referers + Countries tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top Referers</h2>
          <div className="border rounded-lg divide-y">
            {topReferers.length > 0 ? (
              topReferers.map((ref) => (
                <div key={ref.referer} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="truncate text-muted-foreground">{ref.referer || "(direct)"}</span>
                  <span className="font-mono font-medium ml-4 shrink-0">{ref.count ?? 0}</span>
                </div>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-muted-foreground">No data</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top Countries</h2>
          <div className="border rounded-lg divide-y">
            {topCountries.length > 0 ? (
              topCountries.map((country) => (
                <div key={country.country} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-muted-foreground">{country.country || "(unknown)"}</span>
                  <span className="font-mono font-medium ml-4 shrink-0">{country.count ?? 0}</span>
                </div>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-muted-foreground">No data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
