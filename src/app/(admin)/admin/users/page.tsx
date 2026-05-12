import { requireAdmin } from "@/lib/session";
import { db } from "@/db/client";
import { user } from "@/db/schema";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const users = await db
    .select()
    .from(user)
    .orderBy(user.createdAt)
    .limit(pageSize + 1)
    .offset(offset);

  const hasMore = users.length > pageSize;
  const displayUsers = users.slice(0, pageSize);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manage Users</h1>
        </div>

        <div className="space-y-2 border rounded-lg divide-y">
          {displayUsers.map((u) => (
            <div key={u.id} className="p-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{u.name}</div>
                <div className="text-sm text-muted-foreground">{u.email}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                {u.role === "admin" && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Admin</span>
                )}
                {u.banned && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Banned</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {displayUsers.length === 0 && (
          <p className="text-muted-foreground">No users found.</p>
        )}

        <div className="flex gap-4">
          {page > 1 && (
            <Link href={`/admin/users?page=${page - 1}`}>
              <Button variant="outline">Previous</Button>
            </Link>
          )}
          {hasMore && (
            <Link href={`/admin/users?page=${page + 1}`}>
              <Button variant="outline">Next</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
