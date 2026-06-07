"use client";

import { RankedRepository, repoFullName } from "@/lib/api";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  ReferenceLine,
  Cell,
} from "recharts";
import { useRouter } from "next/navigation";

export function HypeVsHiringMatrix({ data }: { data: RankedRepository[] }) {
  const router = useRouter();

  const plotData = data.map((repo) => {
    // X-Axis (Hype): Mix of velocity and social momentum
    const hypeScore = Math.min((repo.starVelocity * 5) + repo.socialScore, 100);
    // Y-Axis (Hiring): Corporate adoption
    const hiringScore = Math.min(repo.hiringScore, 100);
    
    return {
      id: repo.id,
      name: repoFullName(repo),
      language: repo.language ?? "Unknown",
      hype: Math.round(hypeScore * 10) / 10,
      hiring: Math.round(hiringScore * 10) / 10,
      stars: repo.stars,
      // Color coding based on quadrant
      color: hiringScore > 30 && hypeScore > 30 ? "#10b981" : // Golden (Green)
             hypeScore > 30 && hiringScore <= 30 ? "#f59e0b" : // Speculative (Amber)
             hiringScore > 30 && hypeScore <= 30 ? "#3b82f6" : // Bedrock (Blue)
             "#9ca3af", // Long tail (Gray)
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-neutral-200 p-3 rounded-lg shadow-xl text-sm min-w-[200px]">
          <div className="font-semibold text-neutral-800 mb-1">{data.name}</div>
          <div className="text-xs text-neutral-500 mb-3">{data.language} • {data.stars.toLocaleString()} stars</div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-neutral-600">Developer Hype</span>
            <span className="font-medium text-orange-600">{data.hype}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-neutral-600">Hiring Demand</span>
            <span className="font-medium text-blue-600">{data.hiring}</span>
          </div>
          <div className="mt-3 text-[10px] text-neutral-400 text-center uppercase tracking-widest">
            Click to view details
          </div>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return <div className="h-96 flex items-center justify-center text-sm text-neutral-500 border border-neutral-200 rounded-lg bg-neutral-50">Not enough data to generate matrix</div>;
  }

  return (
    <div className="w-full h-[500px] relative group mt-4">
      {/* Background quadrant labels */}
      <div className="absolute top-10 right-10 text-right opacity-30 pointer-events-none hidden sm:block transition-opacity group-hover:opacity-10">
        <div className="text-2xl font-bold text-green-600 uppercase tracking-widest">Golden Zone</div>
        <div className="text-sm font-medium text-green-700">High Hype & High Hiring</div>
      </div>
      <div className="absolute bottom-12 right-10 text-right opacity-30 pointer-events-none hidden sm:block transition-opacity group-hover:opacity-10">
        <div className="text-2xl font-bold text-amber-600 uppercase tracking-widest">Speculative</div>
        <div className="text-sm font-medium text-amber-700">High Hype, Low Enterprise</div>
      </div>
      <div className="absolute top-10 left-20 text-left opacity-30 pointer-events-none hidden sm:block transition-opacity group-hover:opacity-10">
        <div className="text-2xl font-bold text-blue-600 uppercase tracking-widest">Bedrocks</div>
        <div className="text-sm font-medium text-blue-700">Low Hype, Corporate Standard</div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          
          <XAxis 
            type="number" 
            dataKey="hype" 
            name="Developer Hype" 
            domain={[0, 100]}
            tickFormatter={(val) => val.toString()}
            stroke="#9ca3af"
            label={{ value: 'Developer Hype & Momentum →', position: 'insideBottom', offset: -10, fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
          />
          <YAxis 
            type="number" 
            dataKey="hiring" 
            name="Hiring Demand" 
            domain={[0, 100]}
            stroke="#9ca3af"
            label={{ value: 'Corporate Adoption & Hiring →', angle: -90, position: 'insideLeft', offset: -5, fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
          />
          <ZAxis type="number" dataKey="stars" range={[40, 400]} />
          
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          
          {/* Quadrant dividers */}
          <ReferenceLine x={30} stroke="#e5e7eb" strokeWidth={2} />
          <ReferenceLine y={30} stroke="#e5e7eb" strokeWidth={2} />
          
          <Scatter 
            name="Repositories" 
            data={plotData} 
            onClick={(e: any) => {
              if (e && e.id) router.push(`/repos/${e.id}`);
            }}
            className="cursor-pointer transition-opacity hover:opacity-80"
          >
            {plotData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} stroke={entry.color} strokeWidth={1} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
