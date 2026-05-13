"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function AdminLookupPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");

  function lookup() {
    const s = slug.trim();
    if (!s) return;
    router.push(`/admin/links/${s}`);
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Link Lookup</h1>
        <p className="text-muted-foreground text-sm">Look up any short link by its slug.</p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Slug (e.g. abc123)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          autoFocus
        />
        <Button onClick={lookup} disabled={!slug.trim()}>
          <Search className="w-4 h-4 mr-2" /> Look up
        </Button>
      </div>
    </div>
  );
}
