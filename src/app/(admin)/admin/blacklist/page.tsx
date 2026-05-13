"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { blacklistAddSchema } from "@/lib/schemas";
import { Trash2, ShieldCheck } from "lucide-react";

interface BlacklistPattern {
  id: number;
  pattern: string;
  reason?: string;
}

interface BlacklistedLink {
  id: string;
  url: string;
}

export default function AdminBlacklistPage() {
  const [patterns, setPatterns] = useState<BlacklistPattern[]>([]);
  const [blacklistedLinks, setBlacklistedLinks] = useState<BlacklistedLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof blacklistAddSchema>>({
    resolver: zodResolver(blacklistAddSchema),
    defaultValues: {
      pattern: "",
      reason: "",
    },
  });

  const loadPatterns = async () => {
    try {
      const response = await fetch("/api/v1/admin/blacklist");
      if (!response.ok) throw new Error("Failed to fetch patterns");
      const data = await response.json();
      setPatterns(data.patterns);
      setBlacklistedLinks(data.blacklistedLinks ?? []);
    } catch {
      setError("Failed to load patterns");
    }
  };

  const unblacklistLink = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/admin/links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unblacklist" }),
      });
      if (!response.ok) throw new Error("Failed to unblacklist link");
      await loadPatterns();
    } catch {
      setError("Failed to unblacklist link");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPatterns();
  }, []);

  const onSubmit = async (values: z.infer<typeof blacklistAddSchema>) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add pattern");
      }

      form.reset();
      await loadPatterns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const deletePattern = async (id: number) => {
    try {
      const response = await fetch(`/api/v1/admin/blacklist?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete pattern");
      await loadPatterns();
    } catch {
      setError("Failed to delete pattern");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manage Blacklist</h1>
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Add Pattern</h2>

          {error && (
            <div className="p-3 text-sm bg-red-50 text-red-700 rounded-md mb-4">
              {error}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="pattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pattern</FormLabel>
                    <FormControl>
                      <Input placeholder="example.com or *.example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Malicious site" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Pattern"}
              </Button>
            </form>
          </Form>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-4">Current Patterns</h2>
          <div className="space-y-2 border rounded-lg divide-y">
            {patterns.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm">{p.pattern}</div>
                  {p.reason && (
                    <div className="text-xs text-muted-foreground">{p.reason}</div>
                  )}
                </div>
                <button
                  onClick={() => deletePattern(p.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {patterns.length === 0 && (
            <p className="text-muted-foreground">No patterns in blacklist.</p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-bold mb-4">Blacklisted URLs</h2>
          <div className="space-y-2 border rounded-lg divide-y">
            {blacklistedLinks.map((l) => (
              <div key={l.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm font-semibold">{l.id}</div>
                  <div className="text-xs text-muted-foreground truncate">{l.url}</div>
                </div>
                <button
                  onClick={() => unblacklistLink(l.id)}
                  className="text-green-600 hover:text-green-700 shrink-0"
                  title="Remove from blacklist"
                >
                  <ShieldCheck className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {blacklistedLinks.length === 0 && (
            <p className="text-muted-foreground">No individually blacklisted URLs.</p>
          )}
        </div>
      </div>
    </div>
  );
}
