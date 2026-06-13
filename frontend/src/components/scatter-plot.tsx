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
    const isGolden = data.hiring_score > 30 && data.hype_score > 30;
    const isSpeculative = data.hype_score > 30 && data.hiring_score <= 30;
    const isBedrock = data.hiring_score > 30 && data.hype_score <= 30;
    const zoneName = isGolden ? "Golden Zone" : isSpeculative ? "Speculative" : isBedrock ? "Bedrocks" : "Emerging";
    
    // Confidence logic
    const distHype = Math.abs(data.hype_score - 30);
    const distHiring = Math.abs(data.hiring_score - 30);
    const confidence = (distHype > 15 && distHiring > 15) || data.stars > 50000 ? "High" : (distHype < 5 || distHiring < 5) ? "Low" : "Medium";

    // Dynamic Interpretation Logic
    let interpretation = "";
    if (isGolden) {
      interpretation = `Momentum driven by +${(data.starsGained || 0).toLocaleString()} stars in 30 days and strong measurable enterprise hiring demand.`;
    } else if (isSpeculative) {
      if (data.social_score > 40) {
        interpretation = `High hype fueled by elevated social mentions, but lacking proven corporate adoption.`;
      } else {
        interpretation = `Momentum primarily driven by star velocity (+${(data.starsGained || 0).toLocaleString()} 30d) without matched enterprise footing.`;
      }
    } else if (isBedrock) {
      interpretation = `Established corporate standard. Stable hiring demand but slower relative growth velocity (+${(data.starsGained || 0).toLocaleString()} 30d).`;
    } else {
      interpretation = `Niche or early-stage trajectory. Showing limited footprint in both developer hype and corporate hiring.`;
    }

    return (
      <div className="bg-white border border-neutral-200 p-3 rounded-lg text-sm w-[280px] font-sans pointer-events-none">
        <div className="font-bold text-neutral-900 leading-tight mb-1">{data.name}</div>
        {data.description && (
          <div className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed mb-3">
            {data.description}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-3 border-b border-neutral-100 pb-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Stars</span>
            <span className="font-mono text-xs font-semibold text-neutral-800">{(data.stars / 1000).toFixed(1)}k</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">30d Growth</span>
            <span className="font-mono text-xs font-semibold text-green-600">+{data.starsGained?.toLocaleString() || 0}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Momentum</span>
            <span className="font-mono text-xs font-semibold text-neutral-800">{data.hype_score.toFixed(1)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Hiring</span>
            <span className="font-mono text-xs font-semibold text-neutral-800">{data.hiring_score.toFixed(1)}</span>
          </div>
          {data.starVelocity > 0 && (
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">GitHub Vel.</span>
              <span className="font-mono text-xs font-semibold text-neutral-800">{data.starVelocity.toFixed(1)}/d</span>
            </div>
          )}
          {data.social_score > 0 && (
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Social Score</span>
              <span className="font-mono text-xs font-semibold text-neutral-800">{data.social_score.toFixed(1)}</span>
            </div>
          )}
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] font-bold text-neutral-800">Zone: {zoneName}</span>
            <span className={`text-[10px] font-bold ${confidence === 'High' ? 'text-green-600' : confidence === 'Medium' ? 'text-amber-600' : 'text-neutral-500'}`}>
              Conf: {confidence}
            </span>
          </div>
          <div className="text-[11px] text-neutral-600 leading-snug">
            {interpretation}
          </div>
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
      description: repo.description,
      language: repo.language ?? "Unknown",
      hype_score: Math.round(hypeScore * 10) / 10,
      hiring_score: Math.round(hiringScore * 10) / 10,
      stars: repo.stars,
      stars_log: Math.log10(repo.stars > 0 ? repo.stars : 1),
      starsGained: repo.starsGained,
      starVelocity: repo.starVelocity,
      social_score: repo.socialScore,
      categories: repo.categories || [],
      // Color coding based on quadrant
      color: hiringScore > 30 && hypeScore > 30 ? "#10b981" : // Golden (Green)
             hypeScore > 30 && hiringScore <= 30 ? "#f59e0b" : // Speculative (Amber)
             hiringScore > 30 && hypeScore <= 30 ? "#3b82f6" : // Bedrock (Blue)
             "#9ca3af", // Long tail (Gray)
    };
  });



  return (
    <div className="w-full h-[550px] relative group mt-4">
      {/* Static Background Quadrant Labels - Fixed directly on the matrix */}
      <div className="absolute top-[25%] right-[25%] text-center opacity-25 pointer-events-none select-none hidden md:block translate-x-1/2 -translate-y-1/2">
        <div className="text-[20px] font-bold text-neutral-900 uppercase tracking-[0.2em] mb-1">Golden Zone</div>
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">High Growth & Hype</div>
      </div>
      <div className="absolute bottom-[25%] right-[25%] text-center opacity-25 pointer-events-none select-none hidden md:block translate-x-1/2 translate-y-1/2">
        <div className="text-[20px] font-bold text-neutral-900 uppercase tracking-[0.2em] mb-1">Speculative</div>
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">High Potential, High Risk</div>
      </div>
      <div className="absolute top-[25%] left-[25%] text-center opacity-25 pointer-events-none select-none hidden md:block -translate-x-1/2 -translate-y-1/2">
        <div className="text-[20px] font-bold text-neutral-900 uppercase tracking-[0.2em] mb-1">Bedrocks</div>
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Established & Core</div>
      </div>
      <div className="absolute bottom-[25%] left-[25%] text-center opacity-25 pointer-events-none select-none hidden md:block -translate-x-1/2 translate-y-1/2">
        <div className="text-[20px] font-bold text-neutral-900 uppercase tracking-[0.2em] mb-1">Emerging</div>
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Niche or Early Stage</div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 30, bottom: 45, left: 30 }}>
          {/* Subtle Grid */}
          <CartesianGrid strokeDasharray="4 4" vertical={true} horizontal={true} stroke="#cbd5e1" opacity={0.35} />
          
          <XAxis 
            type="number" 
            dataKey="hype_score" 
            name="Developer Hype" 
            domain={[0, 100]}
            tickFormatter={(val) => val.toString()}
            stroke="#cbd5e1"
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
            label={{ value: 'Developer Hype & Momentum →', position: 'bottom', offset: 15, fill: '#64748b', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}
            tickLine={false}
          />
          <YAxis 
            type="number" 
            dataKey="hiring_score" 
            name="Hiring Demand" 
            domain={[0, 100]}
            stroke="#cbd5e1"
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
            label={{ value: 'Corporate Adoption & Hiring →', angle: -90, position: 'left', offset: 15, fill: '#64748b', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}
            tickLine={false}
          />
          <ZAxis type="number" dataKey="stars_log" range={[40, 500]} />
          
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8', strokeWidth: 1.5 }} 
            wrapperStyle={{ outline: 'none' }}
            isAnimationActive={false}
          />
          
          {/* Subtle Quadrant Background Fills (5-8% opacity) */}
          <ReferenceArea x1={30} x2={100} y1={30} y2={100} fill="#10b981" fillOpacity={0.06} />
          <ReferenceArea x1={30} x2={100} y1={0} y2={30} fill="#f59e0b" fillOpacity={0.05} />
          <ReferenceArea x1={0} x2={30} y1={30} y2={100} fill="#3b82f6" fillOpacity={0.06} />
          <ReferenceArea x1={0} x2={30} y1={0} y2={30} fill="#94a3b8" fillOpacity={0.05} />

          {/* Hard Quadrant Dividers */}
          <ReferenceLine x={30} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} opacity={0.6} />
          <ReferenceLine y={30} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} opacity={0.6} />
          
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
              const opacity = matchesFilter ? 0.85 : 0.15;
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  fillOpacity={opacity} 
                  stroke={entry.color} 
                  strokeOpacity={matchesFilter ? 1 : 0.3}
                  strokeWidth={2} 
                  className="hover:stroke-[3px] hover:fill-opacity-100 transition-all duration-200"
                />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
