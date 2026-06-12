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
  ReferenceArea,
  ReferenceLine,
  Cell,
} from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-neutral-200 p-3 rounded-lg shadow-xl text-sm min-w-[200px]">
        <div className="font-semibold text-neutral-800 mb-1">{data.name}</div>
        <div className="text-xs text-neutral-500 mb-3">{data.language} • {data.stars.toLocaleString()} stars</div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-neutral-600">Hype Momentum</span>
          <span className="font-mono tabular-nums font-medium text-orange-600">{data.hype_score.toFixed(1)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-neutral-600">Hiring Demand</span>
          <span className="font-mono tabular-nums font-medium text-blue-600">{data.hiring_score.toFixed(1)}%</span>
        </div>
        <div className="mt-3 text-[10px] text-neutral-400 text-center uppercase tracking-widest">
          Click to view details
        </div>
      </div>
    );
  }
  return null;
};

export function HypeVsHiringMatrix({
  data,
  activeCategory,
  onSelectRepo,
}: {
  data: RankedRepository[];
  activeCategory?: string | null;
  onSelectRepo?: (id: string) => void;
}) {

  const plotData = data.map((repo) => {
    // X-Axis (Hype): Mix of velocity and social momentum (computed on backend)
    const hypeScore = repo.hypeScore;
    // Y-Axis (Hiring): Corporate adoption
    const hiringScore = Math.min(repo.hiringScore, 100);
    
    return {
      id: repo.id,
      name: repoFullName(repo),
      language: repo.language ?? "Unknown",
      hype_score: Math.round(hypeScore * 10) / 10,
      hiring_score: Math.round(hiringScore * 10) / 10,
      stars: repo.stars,
      categories: repo.categories || [],
      // Color coding based on quadrant
      color: hiringScore > 30 && hypeScore > 30 ? "#10b981" : // Golden (Green)
             hypeScore > 30 && hiringScore <= 30 ? "#f59e0b" : // Speculative (Amber)
             hiringScore > 30 && hypeScore <= 30 ? "#3b82f6" : // Bedrock (Blue)
             "#9ca3af", // Long tail (Gray)
    };
  });



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
            dataKey="hype_score" 
            name="Developer Hype" 
            domain={[0, 100]}
            tickFormatter={(val) => val.toString()}
            stroke="#9ca3af"
            label={{ value: 'Developer Hype & Momentum →', position: 'insideBottom', offset: -10, fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
          />
          <YAxis 
            type="number" 
            dataKey="hiring_score" 
            name="Hiring Demand" 
            domain={[0, 100]}
            stroke="#9ca3af"
            label={{ value: 'Corporate Adoption & Hiring →', angle: -90, position: 'insideLeft', offset: -5, fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
          />
          <ZAxis type="number" dataKey="stars" range={[40, 400]} />
          
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '4 4', stroke: '#94a3b8', strokeWidth: 1.5 }} />
          
          {/* Quadrant Backgrounds */}
          <ReferenceArea x1={30} x2={100} y1={30} y2={100} fill="#10b981" fillOpacity={0.03} />
          <ReferenceArea x1={30} x2={100} y1={0} y2={30} fill="#f59e0b" fillOpacity={0.03} />
          <ReferenceArea x1={0} x2={30} y1={30} y2={100} fill="#3b82f6" fillOpacity={0.03} />
          <ReferenceArea x1={0} x2={30} y1={0} y2={30} fill="#9ca3af" fillOpacity={0.03} />

          {/* Quadrant dividers */}
          <ReferenceLine x={30} stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth={1} />
          <ReferenceLine y={30} stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth={1} />
          
          <Scatter 
            name="Repositories" 
            data={plotData} 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={(e: any) => {
              if (e && e.id && onSelectRepo) onSelectRepo(e.id);
            }}
            className="cursor-pointer transition-opacity"
          >
            {plotData.map((entry, index) => {
              const matchesFilter = !activeCategory || entry.categories.includes(activeCategory);
              const opacity = matchesFilter ? 0.8 : 0.1;
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  fillOpacity={opacity} 
                  stroke={entry.color} 
                  strokeOpacity={matchesFilter ? 1 : 0.2}
                  strokeWidth={1} 
                />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
