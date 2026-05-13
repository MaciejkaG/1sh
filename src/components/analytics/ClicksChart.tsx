"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { date: string; count: number }[];
  color?: string;
  name?: string;
  interval?: number;
  weekly?: boolean;
}

export function ClicksChart({ data, color = "#6366f1", name = "Clicks", interval = 4, weekly = false }: Props) {
  const gradientId = `chartGrad-${color.replace("#", "")}`;
  const formatted = data.map((d) => {
    const start = new Date(d.date + "T00:00:00");
    const fmt = (dt: Date) => dt.toLocaleDateString("en", { month: "short", day: "numeric" });
    let label: string;
    if (weekly) {
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      label = `${fmt(start)} – ${fmt(end)}`;
    } else {
      label = fmt(start);
    }
    return { ...d, label };
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval={interval}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid rgba(128,128,128,0.2)",
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
            fontSize: 12,
          }}
          labelStyle={{ fontWeight: 600 }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={color}
          fill={`url(#${gradientId})`}
          strokeWidth={2}
          name={name}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
