"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Eye, ChevronLeft, ChevronRight, Ban, CheckCircle, Trash2, ShieldOff, ShieldCheck } from "lucide-react";

interface AdminLink {
  id: string;
  url: string;
  userId: string | null;
  custom: boolean;
  disabled: boolean;
  blacklisted: boolean;
  createdAt: string;
  userEmail: string | null;
  clicks: number;
}

export default function AdminLinksPage() {
  const router = useRouter();
  const [links, setLinks] = useState<AdminLink[]>([]);
  const [filter, setFilter] = useState("");
  const [inputFilter, setInputFilter] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const loadLinks = useCallback(async (f: string, p: number) => {
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (f) params.set("filter", f);
      const res = await fetch(`/api/v1/admin/links?${params}`);
      const data = await res.json();
      setLinks(data.links);
      setHasMore(data.hasMore);
    } catch {
      setError("Failed to load links.");
    }
  }, []);

  useEffect(() => { void loadLinks(filter, page); }, [filter, page, loadLinks]);

  function search() {
    setPage(1);
    setFilter(inputFilter.trim());
  }

  async function action(id: string, act: string) {
    setError(null);
    setConfirming(null);
    const res = await fetch(`/api/v1/admin/links/${id}`, {
      method: act === "delete" ? "DELETE" : "PATCH",
      headers: act !== "delete" ? { "Content-Type": "application/json" } : undefined,
      body: act !== "delete" ? JSON.stringify({ action: act }) : undefined,
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Action failed.");
      return;
    }
    await loadLinks(filter, page);
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Manage Links</h1>

        {error && (
          <div className="p-3 text-sm bg-red-50 text-red-700 rounded-md">{error}</div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Filter by slug..."
            value={inputFilter}
            onChange={(e) => setInputFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            className="max-w-xs"
          />
          <Button variant="outline" onClick={search}>Search</Button>
        </div>

        <div className="space-y-2 border rounded-lg divide-y">
          {links.map((l) => (
            <div key={l.id} className="p-4 flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm font-semibold">{l.id}</div>
                <div className="text-xs text-muted-foreground truncate max-w-xs">{l.url}</div>
                <div className="text-xs text-muted-foreground">{l.userEmail ?? "(anonymous)"}</div>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {l.disabled && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Disabled</span>
                  )}
                  {l.blacklisted && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Blacklisted</span>
                  )}
                  {l.custom && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Custom</span>
                  )}
                  <span className="text-xs text-muted-foreground">{l.clicks ?? 0} clicks</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                <Button size="sm" variant="outline" onClick={() => router.push(`/admin/links/${l.id}`)}>
                  <Eye className="w-3 h-3 mr-1" /> View
                </Button>
                {!l.disabled ? (
                  <Button size="sm" variant="outline" onClick={() => action(l.id, "disable")}>
                    <Ban className="w-3 h-3 mr-1" /> Disable
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => action(l.id, "enable")}>
                    <CheckCircle className="w-3 h-3 mr-1" /> Enable
                  </Button>
                )}
                {!l.blacklisted ? (
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => action(l.id, "blacklist")}>
                    <ShieldOff className="w-3 h-3 mr-1" /> Blacklist
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700" onClick={() => action(l.id, "unblacklist")}>
                    <ShieldCheck className="w-3 h-3 mr-1" /> Unblacklist
                  </Button>
                )}
                {confirming === l.id ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="destructive" onClick={() => action(l.id, "delete")}>
                      Confirm
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirming(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setConfirming(l.id)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {links.length === 0 && <p className="text-muted-foreground">No links found.</p>}

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
