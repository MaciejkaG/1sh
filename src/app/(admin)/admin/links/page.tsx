import { requireAdmin } from "@/lib/session";
import { db } from "@/db/client";
import { link, linkEvent, user } from "@/db/schema";
import { eq, like, count as drizzleCount, and } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const filter = params.filter || "";
  const page = parseInt(params.page || "1");
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
  const displayLinks = links.slice(0, pageSize);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manage Links</h1>
        </div>

        <div className="space-y-2 border rounded-lg divide-y">
          {displayLinks.map((l) => (
            <div key={l.id} className="p-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm">{l.id}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {l.url}
                </div>
                <div className="text-xs text-muted-foreground">
                  {l.userEmail || "(anonymous)"}
                </div>
              </div>
              <div className="text-sm font-mono ml-4">
                {l.clicks ?? 0}
              </div>
              <div className="ml-4">
                {l.disabled && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Disabled</span>}
              </div>
            </div>
          ))}
        </div>

        {displayLinks.length === 0 && (
          <p className="text-muted-foreground">No links found.</p>
        )}

        <div className="flex gap-4">
          {page > 1 && (
            <Link href={`/admin/links?page=${page - 1}`}>
              <Button variant="outline">Previous</Button>
            </Link>
          )}
          {hasMore && (
            <Link href={`/admin/links?page=${page + 1}`}>
              <Button variant="outline">Next</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
