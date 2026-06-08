"use client";

import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import { getWatchlist, toggleWatchlist } from "@/lib/api";
import { useState } from "react";

export function WatchlistButton({ repoId }: { repoId: string }) {
  const { isSignedIn, getToken } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: watchlist = [], mutate } = useSWR(
    isSignedIn ? "watchlist" : null,
    async () => {
      const token = await getToken();
      if (!token) return [];
      return getWatchlist(token);
    }
  );

  if (!isSignedIn) return null;

  const isTracked = watchlist.includes(repoId);

  const handleToggle = async () => {
    setIsUpdating(true);
    const token = await getToken();
    if (!token) {
      setIsUpdating(false);
      return;
    }

    // Optimistic UI update
    const newWatchlist = isTracked 
      ? watchlist.filter(id => id !== repoId)
      : [...watchlist, repoId];
    
    mutate(newWatchlist, false);

    const success = await toggleWatchlist(token, repoId, isTracked);
    if (!success) {
      // Revert if failed
      mutate(watchlist, false);
    } else {
      mutate();
    }
    
    setIsUpdating(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isUpdating}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition shadow-sm border ${
        isTracked 
          ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" 
          : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
      }`}
    >
      <svg 
        className={`h-4 w-4 ${isTracked ? "fill-amber-400 text-amber-400" : "text-neutral-400"}`} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={isTracked ? 1.5 : 2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
      {isTracked ? "Tracked" : "Track"}
    </button>
  );
}
