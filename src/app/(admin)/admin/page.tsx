import { requireAdmin } from "@/lib/session";
import { db } from "@/db/client";
import { user, link, linkEvent, blacklist } from "@/db/schema";
import { count as drizzleCount, gte } from "drizzle-orm";
import { AdminDashboardCharts } from "@/components/AdminDashboardCharts";
import { formatCount, formatRate } from "@/lib/format";

export default async function AdminPage() {
  await requireAdmin();

  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalLinks,
    totalClicks,
    clicksLastHour,
    clicksLast24h,
    clicksLast7d,
    clicksLast30d,
    blacklistSize,
  ] = await Promise.all([
    db.select({ count: drizzleCount(user.id) }).from(user),
    db.select({ count: drizzleCount(link.id) }).from(link),
    db.select({ count: drizzleCount(linkEvent.id) }).from(linkEvent),
    db.select({ count: drizzleCount(linkEvent.id) }).from(linkEvent).where(gte(linkEvent.at, oneHourAgo)),
    db.select({ count: drizzleCount(linkEvent.id) }).from(linkEvent).where(gte(linkEvent.at, oneDayAgo)),
    db.select({ count: drizzleCount(linkEvent.id) }).from(linkEvent).where(gte(linkEvent.at, sevenDaysAgo)),
    db.select({ count: drizzleCount(linkEvent.id) }).from(linkEvent).where(gte(linkEvent.at, thirtyDaysAgo)),
    db.select({ count: drizzleCount(blacklist.id) }).from(blacklist),
  ]);

  const clicksPerMinute = (clicksLastHour[0]?.count ?? 0) / 60;

  const tiles = [
    { label: "Total Users",       value: formatCount(totalUsers[0]?.count ?? 0) },
    { label: "Total Links",       value: formatCount(totalLinks[0]?.count ?? 0) },
    { label: "Total Clicks",      value: formatCount(totalClicks[0]?.count ?? 0) },
    { label: "Clicks/min (1h)",   value: formatRate(clicksPerMinute) },
    { label: "Clicks (24h)",      value: formatCount(clicksLast24h[0]?.count ?? 0) },
    { label: "Clicks (7d)",       value: formatCount(clicksLast7d[0]?.count ?? 0) },
    { label: "Clicks (30d)",      value: formatCount(clicksLast30d[0]?.count ?? 0) },
    { label: "Blacklist Size",    value: formatCount(blacklistSize[0]?.count ?? 0) },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tiles.map(({ label, value }) => (
            <div key={label} className="border rounded-lg p-6">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <AdminDashboardCharts />
      </div>
    </div>
  );
}
