"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [banReasons, setBanReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async (p: number) => {
    try {
      const res = await fetch(`/api/v1/admin/users?page=${p}`);
      const data = await res.json();
      setUsers(data.users);
      setHasMore(data.hasMore);
    } catch {
      setError("Failed to load users.");
    }
  }, []);

  useEffect(() => { void loadUsers(page); }, [page, loadUsers]);

  async function action(id: string, act: string, reason?: string) {
    setError(null);
    const res = await fetch(`/api/v1/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act, reason }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Action failed.");
      return;
    }
    await loadUsers(page);
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Manage Users</h1>

        {error && (
          <div className="p-3 text-sm bg-red-50 text-red-700 rounded-md">{error}</div>
        )}

        <div className="space-y-2 border rounded-lg divide-y">
          {users.map((u) => (
            <div key={u.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{u.name}</div>
                <div className="text-sm text-muted-foreground">{u.email}</div>
                <div className="text-xs text-muted-foreground font-mono">{u.id}</div>
                <div className="text-xs text-muted-foreground">
                  Joined {new Date(u.createdAt).toLocaleDateString()}
                </div>
                {u.banned && u.banReason && (
                  <div className="text-xs text-red-600 mt-1">Ban reason: {u.banReason}</div>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end shrink-0">
                <div className="flex gap-2">
                  {u.role === "admin" && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Admin</span>
                  )}
                  {u.banned && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Banned</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  {!u.banned ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Ban reason (optional)"
                        className="h-8 text-xs w-44"
                        value={banReasons[u.id] ?? ""}
                        onChange={(e) =>
                          setBanReasons((prev) => ({ ...prev, [u.id]: e.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => action(u.id, "ban", banReasons[u.id] || undefined)}
                      >
                        Ban
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => action(u.id, "unban")}>
                      Unban
                    </Button>
                  )}
                  {u.role !== "admin" ? (
                    <Button size="sm" variant="outline" onClick={() => action(u.id, "promote")}>
                      Promote
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => action(u.id, "demote")}>
                      Demote
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && <p className="text-muted-foreground">No users found.</p>}

        <div className="flex gap-4">
          {page > 1 && (
            <Button variant="outline" onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
          )}
          {hasMore && (
            <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
