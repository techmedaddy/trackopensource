"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { compactNumber, formatScore, repoFullName, type RankedRepository } from "@/lib/api";

export function CommandPalette({ onSelectRepo }: { onSelectRepo?: (repoId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RankedRepository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Handle Ctrl+K / Cmd+K toggle
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      
      // Load initial top results if empty
      if (!query && results.length === 0) {
        fetch('/api/trending?limit=5&timeframeDays=30')
          .then(r => r.json())
          .then(data => setResults(data || []));
      }
    }
  }, [open]);

  // Handle search debouncing
  useEffect(() => {
    if (!open) return;
    
    const timeout = setTimeout(async () => {
      const trimmed = query.trim();
      if (!trimmed) {
        // Reset to trending
        const res = await fetch('/api/trending?limit=5&timeframeDays=30');
        setResults((await res.json()) || []);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=5`);
        if (res.ok) {
          setResults(await res.json() || []);
        }
      } catch (e) {
        console.error("Search failed", e);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, open]);

  if (!open) return null;

  return (
    <div className="relative z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity" 
        onClick={() => setOpen(false)}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4 sm:p-6 md:p-20">
        <div className="mx-auto max-w-xl transform divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-all">
          
          {/* Input Box */}
          <div className="relative">
            <svg className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-neutral-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-neutral-900 placeholder:text-neutral-400 focus:ring-0 sm:text-sm outline-none"
              placeholder="Search repositories, organizations, or stacks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {isLoading && (
              <div className="absolute right-4 top-4 h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
            )}
          </div>

          {/* Results List */}
          {results.length > 0 && (
            <ul className="max-h-96 scroll-py-3 overflow-y-auto p-3" role="listbox">
              {results.map((repo) => (
                <li
                  key={repo.id}
                  className="group flex cursor-pointer select-none rounded-xl p-3 hover:bg-neutral-50 transition-colors duration-150"
                  onClick={() => {
                    if (onSelectRepo) {
                      onSelectRepo(repo.id);
                    } else {
                      router.push(`/?repo=${repo.id}`);
                    }
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-neutral-100 border border-neutral-200 group-hover:bg-white">
                    <img src={`https://github.com/${repo.owner}.png`} alt="" className="h-6 w-6 rounded-md" />
                  </div>
                  <div className="ml-4 flex-auto">
                    <p className="text-sm font-medium text-neutral-900">
                      {repoFullName(repo)}
                    </p>
                    <p className="text-sm text-neutral-500 line-clamp-1">
                      {repo.description || "No description provided."}
                    </p>
                  </div>
                  <div className="ml-2 flex flex-col items-end justify-center text-xs text-neutral-400 font-mono">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/></svg>
                      {compactNumber.format(repo.stars)}
                    </span>
                    <span className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {formatScore(repo.hypeScore || 0)} Hype
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Empty State */}
          {query !== "" && results.length === 0 && !isLoading && (
            <div className="px-6 py-14 text-center text-sm sm:px-14">
              <svg className="mx-auto h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="mt-4 font-semibold text-neutral-900">No results found</p>
              <p className="mt-2 text-neutral-500">We couldn't find anything matching "{query}". Try checking the spelling or dropping the query entirely.</p>
            </div>
          )}
          
          {/* Footer Shortcuts */}
          <div className="flex flex-wrap items-center bg-neutral-50 px-4 py-2.5 text-xs text-neutral-500 justify-between">
            <div>Type to search specific technologies and frameworks.</div>
            <div className="flex items-center gap-1">
              <span>Press</span>
              <kbd className="font-sans px-1.5 py-0.5 rounded border border-neutral-200 bg-white shadow-sm font-medium">ESC</kbd>
              <span>to close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
