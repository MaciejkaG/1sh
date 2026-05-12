import { requireUser } from "@/lib/session";
import { db } from "@/db/client";
import { link, linkEvent } from "@/db/schema";
import { eq, and, gte, count as drizzleCount } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";

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

  const topReferers = await db
    .select({
      referer: linkEvent.referer,
      count: drizzleCount(linkEvent.id),
    })
    .from(linkEvent)
    .where(eq(linkEvent.linkId, id))
    .groupBy(linkEvent.referer)
    .orderBy(({ count }) => count)
    .limit(5);

  const topCountries = await db
    .select({
      country: linkEvent.country,
      count: drizzleCount(linkEvent.id),
    })
    .from(linkEvent)
    .where(eq(linkEvent.linkId, id))
    .groupBy(linkEvent.country)
    .orderBy(({ count }) => count)
    .limit(5);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics: {id}</h1>
          <p className="text-muted-foreground text-sm mt-1">{linkRow[0]?.url}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Clicks</p>
            <p className="text-3xl font-bold">{totalClicks[0]?.count ?? 0}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Last 30 Days</h2>
          <div className="border rounded-lg p-4 space-y-2">
            {dailyBreakdown.length > 0 ? (
              dailyBreakdown.map((day) => (
                <div key={day.date?.toString()} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {day.date?.toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-primary rounded-full" style={{ width: `${Math.min((day.count ?? 0) * 10, 200)}px` }} />
                    <span className="text-sm font-mono">{day.count ?? 0}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No clicks yet</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Top Referers</h2>
            <div className="border rounded-lg p-4 space-y-2">
              {topReferers.length > 0 ? (
                topReferers.map((ref) => (
                  <div key={ref.referer} className="flex items-center justify-between text-sm">
                    <span className="truncate text-muted-foreground">{ref.referer || "(direct)"}</span>
                    <span className="font-mono">{ref.count ?? 0}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold">Top Countries</h2>
            <div className="border rounded-lg p-4 space-y-2">
              {topCountries.length > 0 ? (
                topCountries.map((country) => (
                  <div key={country.country} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{country.country || "(unknown)"}</span>
                    <span className="font-mono">{country.count ?? 0}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Link href="/dashboard">
            <Button variant="outline">Back</Button>
          </Link>
          <Link href={`/dashboard/${id}/edit`}>
            <Button>Edit</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
