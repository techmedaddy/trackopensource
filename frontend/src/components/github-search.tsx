"use client";

import { useState, useEffect } from "react";
import { compactNumber } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

type GithubRepo = {
  id: number;
  owner: { login: string };
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
};

export function GithubSearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GithubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [trackedIds, setTrackedIds] = useState<Set<number>>(new Set());
  const { getToken } = useAuth();

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      const trimmed = query.trim();

      if (!trimmed) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(trimmed)}&per_page=6`,
          { signal: controller.signal }
        );

        if (response.ok) {
          const data = await response.json();
          setResults(data.items || []);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  const handleTrack = async (repo: GithubRepo) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/track`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          githubId: repo.id,
          owner: repo.owner.login,
          name: repo.name,
          description: repo.description,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
        }),
      });

      if (response.ok) {
        setTrackedIds((prev) => new Set(prev).add(repo.id));
      }
    } catch (e) {
      console.error("Failed to track repo", e);
    }
  };

  return (
    <section className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-indigo-950">Track New Repository</h2>
          <p className="text-sm text-indigo-700/80">
            Search all of GitHub to manually add a project to your Radar.
          </p>
        </div>
        <div className="text-sm text-indigo-600 font-medium">
          {isLoading ? "Searching GitHub..." : query ? `${results.length} found` : ""}
        </div>
      </div>

      <input
        className="mt-4 h-11 w-full rounded-md border border-indigo-200 bg-white px-3 text-sm text-indigo-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder-indigo-300"
        placeholder="Type a GitHub repository name to search globally..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {results.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {results.map((repo) => {
            const isTracked = trackedIds.has(repo.id);
            return (
              <div
                key={repo.id}
                className="flex flex-col justify-between rounded-md border border-indigo-100 bg-white p-4 shadow-sm"
              >
                <div>
                  <div className="font-semibold text-indigo-950 truncate" title={`${repo.owner.login}/${repo.name}`}>
                    {repo.owner.login}/{repo.name}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs text-neutral-500 min-h-[32px]">
                    {repo.description ?? "No description available."}
                  </div>
                </div>
                
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-2 text-xs font-medium text-neutral-500">
                    <span>⭐ {compactNumber.format(repo.stargazers_count)}</span>
                    {repo.language && <span>• {repo.language}</span>}
                  </div>
                  <button
                    onClick={() => handleTrack(repo)}
                    disabled={isTracked}
                    className={`rounded px-3 py-1 text-xs font-semibold text-white transition ${
                      isTracked 
                        ? "bg-neutral-300 cursor-not-allowed" 
                        : "bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                    }`}
                  >
                    {isTracked ? "Tracked ✓" : "+ Track"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
