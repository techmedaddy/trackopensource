"use client";

import { useMemo } from "react";
import type { RankedRepository } from "@/lib/api";

interface LiveTickerProps {
  repositories: RankedRepository[];
}

export function LiveTicker({ repositories }: LiveTickerProps) {
  // Generate some jazzy "micro-events" based on the real data
  const events = useMemo(() => {
    if (!repositories || repositories.length === 0) return [];

    const generated = [];
    
    // Grab the top velocity repo
    const highestVelocity = [...repositories].sort((a, b) => b.starVelocity - a.starVelocity)[0];
    if (highestVelocity && highestVelocity.starsGained > 0) {
      generated.push(`[🚨 SURGE] ${highestVelocity.name} +${highestVelocity.starsGained} stars in past 30d`);
    }

    // Grab the top hiring repo
    const highestHiring = [...repositories].sort((a, b) => b.hiringScore - a.hiringScore)[0];
    if (highestHiring && highestHiring.hiringScore > 10) {
      generated.push(`[💼 ENTERPRISE] ${highestHiring.name} matches high enterprise job demand`);
    }

    // Grab the top trend repo
    const topTrend = [...repositories].sort((a, b) => b.trendScore - a.trendScore)[0];
    if (topTrend) {
      generated.push(`[🚀 BREAKOUT] ${topTrend.name} is dominating the trend charts with ${topTrend.trendScore.toFixed(1)} score`);
    }

    // Grab the top social repo
    const topSocial = [...repositories].sort((a, b) => b.socialScore - a.socialScore)[0];
    if (topSocial) {
      generated.push(`[💬 BUZZ] ${topSocial.name} is exploding across developer communities`);
    }

    // Grab highest contributor growth
    const topContributors = [...repositories].sort((a, b) => b.contributorGrowth - a.contributorGrowth)[0];
    if (topContributors && topContributors.contributorsGained > 0) {
      generated.push(`[🛠️ DEV EX] ${topContributors.name} gained ${topContributors.contributorsGained} new contributors`);
    }

    return generated;
  }, [repositories]);

  if (events.length === 0) return null;

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800 text-slate-300 py-1.5 overflow-hidden flex whitespace-nowrap text-xs font-mono tracking-wider shadow-[inset_0_-2px_10px_rgba(0,0,0,0.5)]">
      <div className="flex animate-marquee-slow">
        {/* Double it up so the scroll loops seamlessly */}
        {[...events, ...events, ...events].map((event, i) => (
          <span key={i} className="mx-6 flex items-center">
            {event.includes("SURGE") && <span className="text-rose-500 mr-2 shadow-rose-500/50 drop-shadow-md">●</span>}
            {event.includes("ENTERPRISE") && <span className="text-blue-500 mr-2 shadow-blue-500/50 drop-shadow-md">●</span>}
            {event.includes("BREAKOUT") && <span className="text-emerald-400 mr-2 shadow-emerald-400/50 drop-shadow-md">●</span>}
            {event.includes("BUZZ") && <span className="text-amber-400 mr-2 shadow-amber-400/50 drop-shadow-md">●</span>}
            {event.includes("DEV EX") && <span className="text-purple-400 mr-2 shadow-purple-400/50 drop-shadow-md">●</span>}
            <span dangerouslySetInnerHTML={{ 
              __html: event.replace(/\[.*?\]/g, (match) => `<span class="text-white font-bold opacity-80">${match}</span>`) 
            }} />
          </span>
        ))}
      </div>
    </div>
  );
}
