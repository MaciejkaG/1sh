import { requireUser } from "@/lib/session";
import { db } from "@/db/client";
import { link, linkEvent } from "@/db/schema";
import { eq, and, count as drizzleCount } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart3, Edit, Trash2 } from "lucide-react";

export default async function DashboardPage() {
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Manage your shortened links</p>
        </div>

        <div className="space-y-2 border rounded-lg divide-y">
          {links.map((l) => (
            <div key={l.id} className="p-4 flex items-center justify-between hover:bg-muted/50">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm">
                  {l.custom && <span className="text-xs text-muted-foreground">custom: </span>}
                  {l.id}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {l.url}
                </div>
              </div>
              <div className="text-sm text-muted-foreground ml-4">
                {new Date(l.createdAt).toLocaleDateString()}
              </div>
              <div className="text-sm font-mono ml-4">
                {l.clicks ?? 0}
              </div>
              <div className="flex gap-2 ml-4">
                <Link href={`/dashboard/${l.id}`}>
                  <Button size="sm" variant="outline">
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href={`/dashboard/${l.id}/edit`}>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                </Link>
                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {links.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No links yet. Create one to get started!</p>
            <Link href="/">
              <Button className="mt-4">Create Link</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
