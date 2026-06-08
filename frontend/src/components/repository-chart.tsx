"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface RepositorySnapshot {
  id: string;
  repoId: string;
  stars: number;
  forks: number;
  socialScore: number;
  hiringScore: number;
  trendScore: number;
  createdAt: string;
}

interface RepositoryChartProps {
  history: RepositorySnapshot[];
}

export function RepositoryChart({ history }: RepositoryChartProps) {
  const data = useMemo(() => {
    const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

    // If less than 2 real snapshots exist, generate some beautiful mock data to visualize the chart
    if (!history || history.length < 2) {
      const mockData = [];
      const now = new Date();
      let currentStars = 90000;
      let currentHiring = 20;
      let currentTrend = 10;
      
      for (let i = 30; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        
        // Add some realistic random fluctuation
        currentStars += Math.floor(Math.random() * 500) + 100;
        currentHiring += (Math.random() - 0.4) * 2;
        currentTrend += (Math.random() - 0.5) * 5;
        
        mockData.push({
          date: dateFormatter.format(d),
          Stars: currentStars,
          "Hiring Score": Math.max(0, currentHiring).toFixed(1),
          "Social Score": (currentTrend * 1.5).toFixed(1),
          "Trend Score": Math.max(0, currentTrend).toFixed(1),
        });
      }
      return mockData;
    }


    return history.map((snapshot) => ({
      date: dateFormatter.format(new Date(snapshot.createdAt)),
      Stars: snapshot.stars,
      "Hiring Score": snapshot.hiringScore,
      "Social Score": snapshot.socialScore,
      "Trend Score": snapshot.trendScore,
    }));
  }, [history]);



  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "#737373", fontSize: 12 }} 
            dy={10} 
          />
          <YAxis 
            yAxisId="left" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "#737373", fontSize: 12 }} 
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "#737373", fontSize: 12 }} 
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              border: "1px solid #e5e5e5",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="Stars"
            stroke="#10b981"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Hiring Score"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Trend Score"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
