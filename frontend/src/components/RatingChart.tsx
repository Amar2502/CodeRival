"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
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
      <div className="p-3 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl space-y-1 font-mono text-xs">
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
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.map((item, index) => ({
      matchIndex: index,
      matchLabel: index === 0 ? "Initial Baseline" : `Match ${index}`,
      xLabel: index === 0 ? "Start" : `M${index}`,
      rating: item.rating,
      delta: item.delta,
      date: new Date(item.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }));
  }, [history]);

  const stats = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { totalDelta: 0, percentChange: 0, peakRating: currentRating || 1200 };
    }

    const initial = chartData[0].rating;
    const latest = chartData[chartData.length - 1].rating;
    const totalDelta = latest - initial;
    const percentChange = Number(((totalDelta / initial) * 100).toFixed(1));
    const peakRating = Math.max(...chartData.map((d) => d.rating));

    return { totalDelta, percentChange, peakRating };
  }, [chartData, currentRating]);

  if (!history || history.length <= 1) {
    return (
      <div className="p-8 text-center rounded-2xl bg-card border border-border space-y-2">
        <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mx-auto text-muted-foreground">
          <Award className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-foreground text-sm">Rating Chart (Match History)</h4>
        <p className="text-xs text-muted-foreground font-mono max-w-sm mx-auto">
          Baseline rating starts at {currentRating || 1200} ELO. Play 1v1 battles to build your live rating trajectory graph!
        </p>
      </div>
    );
  }

  // Calculate Y-axis domain padding
  const ratings = chartData.map((d) => d.rating);
  const minY = Math.max(0, Math.min(...ratings) - 40);
  const maxY = Math.max(...ratings) + 40;

  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-xl space-y-6">
      {/* Header section matching screenshot */}
      <div className="text-center space-y-1">
        <h3 className="text-2xl font-black tracking-tight text-foreground">
          Line Chart - Linear
        </h3>
        <p className="text-xs text-muted-foreground font-mono">
          Match-wise ELO Rating History ({chartData.length} Entries)
        </p>
      </div>

      {/* Recharts Responsive Container */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
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
            <Line
              type="linear"
              dataKey="rating"
              stroke="#f97316"
              strokeWidth={3}
              dot={{ r: 4, fill: "#f97316", stroke: "#09090b", strokeWidth: 2 }}
              activeDot={{ r: 7, fill: "#ff6b00", stroke: "#ffffff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer statistics section matching screenshot */}
      <div className="text-center pt-2 border-t border-border/40 space-y-1">
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
