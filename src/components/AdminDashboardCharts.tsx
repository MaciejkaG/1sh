"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ClicksChart } from "@/components/analytics/ClicksChart";
import { formatCount } from "@/lib/format";

type Range = "7d" | "30d" | "90d" | "1y";

const RANGES: { value: Range; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "1y", label: "Last year" },
];

const CHART_INTERVAL: Record<string, number> = {
  "7d": 0,
  "30d": 3,
  "90d": 1,
  "1y": 6,
};

interface AnalyticsData {
  clicks: { date: string; count: number }[];
  linksCreated: { date: string; count: number }[];
  topLinks: { id: string; url: string; clicks: number }[];
  weekly: boolean;
}

export function AdminDashboardCharts() {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/admin/analytics?range=${range}`)
      .then((r) => r.json())
      .then((d: AnalyticsData) => {
        setData(d);
        setLoading(false);
      });
  }, [range]);

  const maxClicks = data?.topLinks[0]?.clicks ?? 1;
  const interval = CHART_INTERVAL[range] ?? 3;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {RANGES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setRange(value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              range === value
                ? "bg-foreground text-background"
                : "border text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded-lg p-6">
          <p className="text-sm font-medium mb-4">Clicks Over Time</p>
          {loading ? (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : (
            <ClicksChart data={data?.clicks ?? []} color="#6366f1" name="Clicks" interval={interval} weekly={data?.weekly} />
          )}
        </div>

        <div className="border rounded-lg p-6">
          <p className="text-sm font-medium mb-4">Links Created Over Time</p>
          {loading ? (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : (
            <ClicksChart data={data?.linksCreated ?? []} color="#10b981" name="Links Created" interval={interval} weekly={data?.weekly} />
          )}
        </div>
      </div>

      <div className="border rounded-lg p-6">
        <p className="text-sm font-medium mb-4">Top Clicked Links</p>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : !data?.topLinks.length ? (
          <div className="text-sm text-muted-foreground">No clicks in this period.</div>
        ) : (
          <div className="space-y-3">
            {data.topLinks.map((item, i) => (
              <Link
                key={item.id}
                href={`/admin/links/${item.id}`}
                className="flex items-center gap-3 -mx-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors group"
              >
                <span className="text-muted-foreground text-sm w-5 text-right shrink-0">
                  {i + 1}
                </span>
                <span className="font-mono text-sm font-medium shrink-0 group-hover:underline">
                  {item.id}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {item.url}
                    </span>
                    <span className="text-sm font-semibold tabular-nums shrink-0">
                      {formatCount(item.clicks)}
                    </span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(item.clicks / maxClicks) * 100}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
