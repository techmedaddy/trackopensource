"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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
      <div className="flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 text-sm text-neutral-500">
        <svg className="mb-2 h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        No historical data captured yet.
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50/20 text-sm text-emerald-800 border border-emerald-100 shadow-inner">
        <div className="relative flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-white shadow-sm border border-emerald-100">
          <div className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75"></div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 relative z-10"></div>
        </div>
        <p className="font-semibold tracking-tight text-emerald-900">Baseline Captured</p>
        <p className="mt-1 text-emerald-600/80">The collector needs 24 hours to begin rendering growth curves.</p>
      </div>
    );
  }

  return (
    <div className="h-56 rounded-lg bg-white pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorStars" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="date" 
            tickLine={false} 
            axisLine={false} 
            tick={{ fontSize: 11, fill: '#888888' }} 
            dy={10}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#888888' }}
            tickFormatter={(value) => compactNumber.format(Number(value))}
            dx={-10}
          />
          <Tooltip
            formatter={(value: any, name: any) => [
              compactNumber.format(Number(value)),
              name.charAt(0).toUpperCase() + name.slice(1)
            ]}
            contentStyle={{
              borderColor: "#e5e5e5",
              borderRadius: 8,
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
              fontSize: '12px'
            }}
          />
          <Area
            type="monotone"
            dataKey="stars"
            stroke="#10b981"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorStars)"
            activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
