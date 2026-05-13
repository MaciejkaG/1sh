"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Ban, CheckCircle, Trash2, ShieldOff, ShieldCheck } from "lucide-react";

export function LinkDetailActions({
  slug,
  disabled,
  blacklisted,
}: {
  slug: string;
  disabled: boolean;
  blacklisted: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function patch(act: string) {
    setError(null);
    const res = await fetch(`/api/v1/admin/links/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Action failed.");
      return;
    }
    router.refresh();
  }

  async function del() {
    setError(null);
    setConfirming(false);
    const res = await fetch(`/api/v1/admin/links/${slug}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Delete failed.");
      return;
    }
    router.push("/admin/links");
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h2 className="font-semibold">Actions</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 flex-wrap">
        {!disabled ? (
          <Button variant="outline" size="sm" onClick={() => patch("disable")}>
            <Ban className="w-3 h-3 mr-1" /> Disable
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => patch("enable")}>
            <CheckCircle className="w-3 h-3 mr-1" /> Enable
          </Button>
        )}
        {!blacklisted ? (
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => patch("blacklist")}
          >
            <ShieldOff className="w-3 h-3 mr-1" /> Blacklist
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 hover:text-green-700"
            onClick={() => patch("unblacklist")}
          >
            <ShieldCheck className="w-3 h-3 mr-1" /> Unblacklist
          </Button>
        )}
        {confirming ? (
          <>
            <Button variant="destructive" size="sm" onClick={del}>
              Confirm delete
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Delete
          </Button>
        )}
      </div>
    </div>
  );
}
