"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  compactNumber,
  formatScore,
  repoFullName,
  type RankedRepository,
} from "@/lib/api";

const API_BASE_URL = "/api";

type SearchPanelProps = {
  initialResults: RankedRepository[];
  onSelectRepo: (id: string) => void;
};

export function SearchPanel({ initialResults, onSelectRepo }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(initialResults);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      const trimmed = query.trim();

      if (!trimmed) {
        setResults(initialResults);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          q: trimmed,
          limit: "4",
          timeframeDays: "30",
        });
        const response = await fetch(`${API_BASE_URL}/search?${params}`, {
          signal: controller.signal,
        });

        if (response.ok) {
          setResults((await response.json()) as RankedRepository[]);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [initialResults, query]);

  return (
    <section className="flex flex-col h-full rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">Search momentum</h2>
          <p className="text-sm text-neutral-500">
            Query names, languages, categories, and descriptions.
          </p>
        </div>
        <div className="text-sm text-neutral-500">
          {isLoading ? "Searching..." : `${results.length} results`}
        </div>
      </div>

      <input
        className="mt-4 h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
        placeholder="Search for rust, ai, database, react..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="mt-4 flex flex-1 flex-col gap-3">
        {results.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">
            No matching repositories yet. Run the collector and ranking engine to fill the radar.
          </div>
        ) : (
          results.map((repo) => (
            <button
              key={repo.id}
              onClick={() => onSelectRepo(repo.id)}
              className="rounded-md border border-neutral-200 p-4 transition hover:border-green-500 hover:bg-green-50/50 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-green-500 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-neutral-950 group-hover:text-emerald-700 transition">{repoFullName(repo)}</div>
                  <div className="mt-1 line-clamp-2 text-sm text-neutral-500">
                    {repo.description ?? "No description available."}
                  </div>
                </div>
                <div className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                  {formatScore(repo.trendScore)}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500">
                <span>{compactNumber.format(repo.stars)} stars</span>
                <span>{repo.starsGained >= 0 ? "+" : ""}{compactNumber.format(repo.starsGained)} in {repo.timeframeDays}d</span>
                {repo.language ? <span>{repo.language}</span> : null}
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
