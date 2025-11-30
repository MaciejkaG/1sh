"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, Pie, PieChart, Cell } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";

interface ClickData {
  date: string;
  clicks: number;
  uniqueVisitors: number;
}

interface DeviceData {
  device: string;
  count: number;
  percentage: number;
}

interface GeographicData {
  country: string;
  count: number;
  percentage: number;
}

interface ReferrerData {
  referrer: string;
  count: number;
  percentage: number;
}

interface AnalyticsData {
  linkId: string;
  totalClicks: number;
  uniqueVisitors: number;
  clickHistory: ClickData[];
  deviceBreakdown: DeviceData[];
  geographicData: GeographicData[];
  referrerData: ReferrerData[];
  lastUpdated: string;
}

interface AnalyticsVisualizationProps {
  linkId: string;
  managementToken: string;
  onRefresh?: () => void;
}

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "hsl(var(--chart-1))",
  },
  uniqueVisitors: {
    label: "Unique Visitors",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const deviceColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function AnalyticsVisualization({
  linkId,
  managementToken,
  onRefresh,
}: AnalyticsVisualizationProps) {
  const [analyticsData, setAnalyticsData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dateRange, setDateRange] = React.useState<'7d' | '30d' | '90d'>('30d');
  const [activeChart, setActiveChart] = React.useState<'clicks' | 'uniqueVisitors'>('clicks');

  const fetchAnalytics = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/analytics?linkId=${linkId}&managementToken=${managementToken}&dateRange=${dateRange}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }

      const result = await response.json();
      setAnalyticsData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [linkId, managementToken, dateRange]);

  React.useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Set up real-time updates every 30 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const handleRefresh = () => {
    fetchAnalytics();
    onRefresh?.();
  };

  const handleDateRangeChange = (newRange: '7d' | '30d' | '90d') => {
    setDateRange(newRange);
  };

  if (loading && !analyticsData) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Analytics</h3>
          <Button disabled>Loading...</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Analytics</h3>
          <Button onClick={handleRefresh}>Retry</Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">Error loading analytics: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Analytics</h3>
          <Button onClick={handleRefresh}>Refresh</Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">No analytics data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-semibold">Analytics</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Date range selector */}
          <div className="flex gap-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => handleDateRangeChange(range)}
              >
                {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
              </Button>
            ))}
          </div>
          <Button onClick={handleRefresh} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{analyticsData.totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total Clicks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{analyticsData.uniqueVisitors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Unique Visitors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {analyticsData.totalClicks > 0 
                ? ((analyticsData.uniqueVisitors / analyticsData.totalClicks) * 100).toFixed(1)
                : '0'
              }%
            </div>
            <p className="text-xs text-muted-foreground">Unique Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {new Date(analyticsData.lastUpdated).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">Last Updated</p>
          </CardContent>
        </Card>
      </div>

      {/* Time series chart */}
      <Card>
        <CardHeader className="flex flex-col items-stretch border-b p-0 sm:flex-row">
          <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-6">
            <CardTitle>Click Analytics Over Time</CardTitle>
            <CardDescription>
              Showing clicks and unique visitors for the selected period
            </CardDescription>
          </div>
          <div className="flex">
            {(['clicks', 'uniqueVisitors'] as const).map((key) => (
              <button
                key={key}
                data-active={activeChart === key}
                className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveChart(key)}
              >
                <span className="text-muted-foreground text-xs">
                  {chartConfig[key].label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {key === 'clicks' 
                    ? analyticsData.totalClicks.toLocaleString()
                    : analyticsData.uniqueVisitors.toLocaleString()
                  }
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:p-6">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <LineChart
              accessibilityLayer
              data={analyticsData.clickHistory}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px]"
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    }}
                  />
                }
              />
              <Line
                dataKey={activeChart}
                stroke={`var(--color-${activeChart})`}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Device and Geographic breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
            <CardDescription>
              Distribution of clicks by device type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{}}
              className="mx-auto aspect-square max-h-[250px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={analyticsData.deviceBreakdown}
                  dataKey="count"
                  nameKey="device"
                  innerRadius={60}
                  strokeWidth={5}
                >
                  {analyticsData.deviceBreakdown.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={deviceColors[index % deviceColors.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-4 space-y-2">
              {analyticsData.deviceBreakdown.map((device, index) => (
                <div key={device.device} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: deviceColors[index % deviceColors.length] }}
                    />
                    <span className="capitalize">{device.device}</span>
                  </div>
                  <div className="flex gap-2">
                    <span>{device.count}</span>
                    <span className="text-muted-foreground">({device.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Geographic distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>
              Top countries by click count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.geographicData.slice(0, 8).map((country, index) => (
                <div key={country.country} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-sm text-muted-foreground">
                      #{index + 1}
                    </div>
                    <span className="font-medium">{country.country}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${country.percentage}%` }}
                      />
                    </div>
                    <div className="w-16 text-right text-sm">
                      {country.count} ({country.percentage.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referrer analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Referrer Analysis</CardTitle>
          <CardDescription>
            Top traffic sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analyticsData.referrerData.slice(0, 10).map((referrer, index) => (
              <div key={referrer.referrer} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 text-sm text-muted-foreground">
                    #{index + 1}
                  </div>
                  <span className="font-medium truncate max-w-xs">
                    {referrer.referrer === 'direct' ? 'Direct Traffic' : referrer.referrer}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${referrer.percentage}%` }}
                    />
                  </div>
                  <div className="w-20 text-right text-sm">
                    {referrer.count} ({referrer.percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}