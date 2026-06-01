"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactNumber, type Snapshot } from "@/lib/api";

type GrowthChartProps = {
  snapshots: Snapshot[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

export function GrowthChart({ snapshots }: GrowthChartProps) {
  const data = snapshots.map((snapshot) => ({
    date: dateFormatter.format(new Date(snapshot.capturedAt)),
    stars: snapshot.stars,
    forks: snapshot.forks,
    contributors: snapshot.contributors,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-500">
        No snapshots captured yet.
      </div>
    );
  }

  return (
    <div className="h-72 rounded-lg border border-neutral-200 bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5e5e5" strokeDasharray="3 3" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => compactNumber.format(Number(value))}
          />
          <Tooltip
            formatter={(value) => compactNumber.format(Number(value))}
            contentStyle={{
              borderColor: "#d4d4d4",
              borderRadius: 8,
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            }}
          />
          <Line
            type="monotone"
            dataKey="stars"
            stroke="#16a34a"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="forks"
            stroke="#525252"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="contributors"
            stroke="#0f766e"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
