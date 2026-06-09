"use client";

import type { RankedRepository } from "@/lib/api";
import { useMemo } from "react";

interface TopGainersWidgetProps {
  repositories: RankedRepository[];
  onSelectRepo: (id: string) => void;
}

export function TopGainersWidget({ repositories, onSelectRepo }: TopGainersWidgetProps) {
  const topGainers = useMemo(() => {
    // Sort by growthRatio to find the most explosive relative growth
    return [...repositories]
      .filter(r => r.growthRatio > 0 && r.starsGained > 5) // filter out tiny statistical noise
      .sort((a, b) => b.growthRatio - a.growthRatio)
      .slice(0, 3);
  }, [repositories]);

  if (topGainers.length === 0) return null;

  return (
    <div className="flex gap-4 w-full mb-6 overflow-x-auto pb-4 pt-2 snap-x snap-mandatory hide-scrollbar">
      {topGainers.map((repo, i) => (
        <button
          key={repo.id}
          onClick={() => onSelectRepo(repo.id)}
          className="relative group flex-1 min-w-[280px] snap-center text-left p-[1px] rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all hover:scale-[1.02]"
        >
          {/* Animated Neon Border Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Inner Card */}
          <div className="relative h-full bg-neutral-900 rounded-[11px] p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div className="text-white font-semibold truncate pr-4 text-sm flex items-center gap-2">
                <span className="text-xl">
                  {i === 0 ? "🔥" : i === 1 ? "🚀" : "📈"}
                </span>
                {repo.name}
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-rose-500/10 rounded-full border border-rose-500/20 text-rose-400 text-xs font-bold">
                +{repo.growthRatio.toFixed(1)}%
              </div>
            </div>
            
            <div className="text-neutral-400 text-xs mt-2 flex gap-4">
              <span>★ +{repo.starsGained}</span>
              <span>{repo.categories?.[0] || "General"}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
