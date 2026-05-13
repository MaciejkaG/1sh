import { requireAdmin } from "@/lib/session";
import { db } from "@/db/client";
import { user, link, linkEvent, blacklist } from "@/db/schema";
import { count as drizzleCount, gte } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  await requireAdmin();

  // Total users
  const totalUsers = await db
    .select({ count: drizzleCount(user.id) })
    .from(user);

  // Total links
  const totalLinks = await db
    .select({ count: drizzleCount(link.id) })
    .from(link);

  // Clicks last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const clicksLast7d = await db
    .select({ count: drizzleCount(linkEvent.id) })
    .from(linkEvent)
    .where(gte(linkEvent.at, sevenDaysAgo));

  // Blacklist size
  const blacklistSize = await db
    .select({ count: drizzleCount(blacklist.id) })
    .from(blacklist);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-3xl font-bold">{totalUsers[0]?.count ?? 0}</p>
          </div>
          <div className="border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">Total Links</p>
            <p className="text-3xl font-bold">{totalLinks[0]?.count ?? 0}</p>
          </div>
          <div className="border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">Clicks (last 7d)</p>
            <p className="text-3xl font-bold">{clicksLast7d[0]?.count ?? 0}</p>
          </div>
          <div className="border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">Blacklist Size</p>
            <p className="text-3xl font-bold">{blacklistSize[0]?.count ?? 0}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Link href="/admin/links">
            <Button>Manage Links</Button>
          </Link>
          <Link href="/admin/users">
            <Button>Manage Users</Button>
          </Link>
          <Link href="/admin/blacklist">
            <Button>Manage Blacklist</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
