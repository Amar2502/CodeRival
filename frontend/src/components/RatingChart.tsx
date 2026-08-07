"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Award } from "lucide-react";

export interface RatingHistoryItem {
  id: string;
  rating: number;
  delta: number;
  createdAt: string;
  matchId?: string | null;
}

interface RatingChartProps {
  history: RatingHistoryItem[];
  currentRating?: number;
}

// Custom Tooltip component matching dark mode aesthetic
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl space-y-1 font-mono text-xs z-50">
        <div className="font-bold text-foreground flex items-center justify-between gap-4">
          <span>{data.matchLabel}</span>
          <span className="text-[11px] text-muted-foreground">{data.date}</span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/50">
          <span className="text-muted-foreground">Rating:</span>
          <span className="font-extrabold text-foreground text-sm">{data.rating} ELO</span>
        </div>
        {data.delta !== 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Change:</span>
            <span
              className={`font-bold ${
                data.delta > 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {data.delta > 0 ? `+${data.delta}` : data.delta}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

export function RatingChart({ history, currentRating }: RatingChartProps) {
  const { chartData, initialRating, hasMatches } = useMemo(() => {
    const items = history || [];
    // Filter out synthetic fallback items where delta is 0 and id is initial
    const realMatches = items.filter((h) => h.id !== "initial" && h.delta !== 0);

    if (realMatches.length === 0) {
      const base = currentRating || 1200;
      return {
        chartData: [],
        initialRating: base,
        hasMatches: false,
      };
    }

    // Calculate initial baseline rating prior to the first match
    const firstItem = realMatches[0];
    const calculatedBase = firstItem.rating - firstItem.delta;
    const baseRating = isNaN(calculatedBase) || calculatedBase <= 0 ? 1200 : calculatedBase;

    const startPoint = {
      matchIndex: 0,
      matchLabel: "Initial Baseline",
      xLabel: "Start",
      rating: baseRating,
      delta: 0,
      date: new Date(firstItem.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    };

    const points = realMatches.map((item, index) => ({
      matchIndex: index + 1,
      matchLabel: `Match ${index + 1}`,
      xLabel: `M${index + 1}`,
      rating: item.rating,
      delta: item.delta,
      date: new Date(item.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }));

    return {
      chartData: [startPoint, ...points],
      initialRating: baseRating,
      hasMatches: true,
    };
  }, [history]);

  const stats = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { totalDelta: 0, percentChange: 0, peakRating: currentRating || 1200 };
    }

    const initial = chartData[0].rating;
    const latest = chartData[chartData.length - 1].rating;
    const totalDelta = latest - initial;
    const percentChange = initial > 0 ? Number(((totalDelta / initial) * 100).toFixed(1)) : 0;
    const peakRating = Math.max(...chartData.map((d) => d.rating));

    return { totalDelta, percentChange, peakRating };
  }, [chartData, currentRating]);

  if (!hasMatches || chartData.length < 2) {
    return (
      <div className="p-8 text-center rounded-2xl bg-card border border-border space-y-2">
        <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mx-auto text-muted-foreground">
          <Award className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-foreground text-sm">Rating Chart (Match History)</h4>
        <p className="text-xs text-muted-foreground font-mono max-w-sm mx-auto">
          Baseline rating starts at {initialRating} ELO. Play 1v1 battles to build your live rating trajectory graph!
        </p>
      </div>
    );
  }

  // Calculate Y-axis domain padding
  const ratings = chartData.map((d) => d.rating);
  const minY = Math.max(0, Math.min(...ratings) - 30);
  const maxY = Math.max(...ratings) + 30;

  return (
    <div className="w-full space-y-4">
      {/* Recharts Responsive Container */}

      {/* Recharts Responsive Container */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            <XAxis
              dataKey="xLabel"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#737373", fontSize: 12, fontFamily: "monospace" }}
              dy={10}
            />
            <YAxis
              domain={[minY, maxY]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#737373", fontSize: 12, fontFamily: "monospace" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="rating"
              stroke="#f97316"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#ratingGradient)"
              dot={{ r: 4, fill: "#f97316", stroke: "#09090b", strokeWidth: 2 }}
              activeDot={{ r: 7, fill: "#ff6b00", stroke: "#ffffff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer statistics section */}
      <div className="text-center pt-3 border-t border-border/40 space-y-1">
        <div className="text-sm font-bold text-foreground flex items-center justify-center gap-1.5 font-mono">
          <span>
            Trending {stats.totalDelta >= 0 ? "up" : "down"} by {Math.abs(stats.percentChange)}% overall
          </span>
          {stats.totalDelta > 0 ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : stats.totalDelta < 0 ? (
            <TrendingDown className="w-4 h-4 text-rose-400" />
          ) : (
            <Minus className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          Peak Rating Achieved: <strong className="text-amber-400">{stats.peakRating} ELO</strong> • Total Delta:{" "}
          <strong className={stats.totalDelta >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {stats.totalDelta >= 0 ? `+${stats.totalDelta}` : stats.totalDelta}
          </strong>
        </p>
      </div>
    </div>
  );
}
