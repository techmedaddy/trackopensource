"use client";

import { SignInButton, Show, UserButton, useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { getWatchlist } from "@/lib/api";
import { SearchPanel } from "@/components/search-panel";
import { GithubSearchPanel } from "@/components/github-search";
import { ScanTrigger } from "@/components/scan-trigger";
import { RepoSideSheet } from "@/components/repo-side-sheet";
import { CommandPalette } from "@/components/command-palette";
import { TopGainersWidget } from "@/components/top-gainers-widget";
import { PersonaAnalyzer } from "@/components/persona-analyzer";
import { HypeVsHiringMatrix } from "@/components/scatter-plot";
import {
  compactNumber,
  formatScore,
  repoFullName,
  type RankedRepository,
} from "@/lib/api";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

interface DashboardClientProps {
  initialTrending: RankedRepository[];
  initialFastest: RankedRepository[];
  initialRising: RankedRepository[];
}

export function DashboardClient({
  initialTrending,
  initialFastest,
  initialRising,
}: DashboardClientProps) {
  const searchParams = useSearchParams();
  const windowParam = searchParams.get("window");
  const windowStr = typeof windowParam === "string" ? windowParam : "30";
  const timeframeDays = ["7", "30", "90"].includes(windowStr) ? windowStr : "30";

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const { isSignedIn, getToken } = useAuth();

  const { data: watchlist = [] } = useSWR(
    isSignedIn ? "watchlist" : null,
    async () => {
      const token = await getToken();
      if (!token) return [];
      return getWatchlist(token);
    }
  );

  // Fetch available categories from the backend
  const { data: facets } = useSWR<{ categories: string[]; languages: string[] }>(
    `/api/facets`,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) return { categories: [], languages: [] };
      return res.json();
    },
    { refreshInterval: 300000 }
  );

  const categoryParam = activeCategory ? `&category=${encodeURIComponent(activeCategory)}` : "";

  // Use SWR for client-side stale-while-revalidate caching
  // We pass the Server-Side Rendered data as `fallbackData` so the page loads instantly.
  const { data: trending = [] } = useSWR<RankedRepository[]>(
    `/api/trending?limit=10&timeframeDays=${timeframeDays}${categoryParam}`,
    fetcher,
    { fallbackData: activeCategory ? undefined : initialTrending, keepPreviousData: true, refreshInterval: 60000 }
  );

  const { data: fastestGrowing = [] } = useSWR<RankedRepository[]>(
    `/api/fastest-growing?limit=14&timeframeDays=${timeframeDays}${categoryParam}`,
    fetcher,
    { fallbackData: activeCategory ? undefined : initialFastest, keepPreviousData: true, refreshInterval: 60000 }
  );

  const { data: risingProjects = [] } = useSWR<RankedRepository[]>(
    `/api/trending?limit=8&timeframeDays=${timeframeDays}&maxStars=100${categoryParam}`,
    fetcher,
    { fallbackData: activeCategory ? undefined : initialRising, keepPreviousData: true, refreshInterval: 60000 }
  );

  const { data: matrixData = [] } = useSWR<RankedRepository[]>(
    `/api/trending?limit=50&timeframeDays=${timeframeDays}`,
    fetcher,
    { fallbackData: initialTrending, keepPreviousData: true, refreshInterval: 60000 }
  );

  const leader = trending[0];
  const trackedCount = new Set(
    [...trending, ...fastestGrowing, ...risingProjects].map((repo) => repo.id)
  ).size;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <CommandPalette onSelectRepo={setSelectedRepoId} />
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/" className="group block w-fit">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-green-700 transition group-hover:text-green-600">
              Momentum dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl transition group-hover:text-neutral-700">
              Track OpenSource
            </h1>
          </Link>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600 sm:text-base">
            Discover repositories growing faster than expected, scored by star velocity,
            growth ratio, contributor movement, activity, and maintenance pressure.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex justify-end items-center gap-3 h-8">
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              className="group hidden sm:flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-500 hover:border-neutral-300 hover:text-neutral-900 shadow-sm transition-all"
            >
              <svg className="w-4 h-4 text-neutral-400 group-hover:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span>Search</span>
              <kbd className="ml-2 inline-flex items-center gap-1 font-sans text-[10px] font-medium text-neutral-400 bg-neutral-100 rounded px-1.5 py-0.5 group-hover:bg-neutral-200 transition-colors">
                <span className="text-[10px]">⌘</span>K
              </kbd>
            </button>
            <a 
              href="https://github.com/techmedaddy/trackopensource" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 transition-all shadow-sm"
              title="View on GitHub"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </a>
            <Show when="signed-out">
              <SignInButton>
                <button className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition">
                  Sign in to track projects &rarr;
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <Link 
                href="/docs" 
                className="hidden sm:flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                Docs
              </Link>
              <Link 
                href="/developer" 
                className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                API
              </Link>
              <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8" } }} />
            </Show>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Metric label="Tracked" value={trackedCount || 0} />
            <WindowSelector currentWindow={timeframeDays} />
            <Metric
              label="Leader"
              value={leader ? formatScore(leader.trendScore) : "0.0"}
            />
            <ScanTrigger />
          </div>
        </div>
      </header>

      <TopGainersWidget repositories={fastestGrowing} onSelectRepo={setSelectedRepoId} />

      <CategoryFilter
        categories={facets?.categories ?? []}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="flex flex-col h-full">
          <SearchPanel initialResults={trending.slice(0, 4)} onSelectRepo={setSelectedRepoId} />
        </div>

        <div className="flex flex-col rounded-lg border border-neutral-200 bg-white shadow-sm h-full">
          <div className="flex items-center justify-between pr-4">
            <SectionHeader
              title="Hype vs. Hiring Matrix"
              subtitle={showCanvas ? "Personal Canvas: Only showing your tracked repositories." : "Visualize the gap between developer mindshare and corporate adoption."}
            />
            {isSignedIn && watchlist.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer pt-6">
                <span className="text-sm font-medium text-neutral-600">My Canvas</span>
                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showCanvas ? 'bg-indigo-600' : 'bg-neutral-300'}`}>
                  <input type="checkbox" className="sr-only" checked={showCanvas} onChange={() => setShowCanvas(!showCanvas)} />
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showCanvas ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </label>
            )}
          </div>
          <div className="flex-1 p-4 pt-0">
            <HypeVsHiringMatrix 
              data={showCanvas ? matrixData.filter(repo => watchlist.includes(repo.id)) : matrixData} 
              activeCategory={activeCategory} 
              onSelectRepo={setSelectedRepoId} 
            />
          </div>
        </div>
      </section>

      <PersonaAnalyzer />

      {watchlist.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold tracking-tight text-neutral-900">Your Tracked Projects</h2>
            <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              {watchlist.length}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {matrixData
              .filter(repo => watchlist.includes(repo.id))
              .map(repo => (
                <RisingCard key={repo.id} repo={repo} onSelectRepo={setSelectedRepoId} />
              ))}
          </div>
        </section>
      )}

      <section>
        <GithubSearchPanel />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <SectionHeader
            title="Trending repositories"
            subtitle="Ranked by the blended trend score."
          />
          <RepositoryTable repos={trending} rankLabel="Trend" onSelectRepo={setSelectedRepoId} />
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
          <SectionHeader
            title="Fastest growing"
            subtitle="Sorted by stars gained per day."
          />
          <div className="divide-y divide-neutral-200">
            {fastestGrowing.length === 0 ? (
              <EmptyState />
            ) : (
              fastestGrowing.map((repo) => <VelocityRow key={repo.id} repo={repo} onSelectRepo={setSelectedRepoId} />)
            )}
          </div>
        </div>
      </section>

      <section>
        <SectionHeader
          title="New rising projects"
          subtitle={
            <span className="flex items-center gap-1.5">
              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">Sponsored</span>
              <a href="https://github.com/techmedaddy/TorrentEdge" target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700 hover:underline font-medium">
                TorrentEdge: Cloud-Native, Peer-Assisted Artifact Distribution
              </a>
            </span>
          }
          unframed
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {risingProjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-5 text-sm text-neutral-500">
              No rising projects yet. Add smaller repositories to the collector seed list.
            </div>
          ) : (
            risingProjects.map((repo) => <RisingCard key={repo.id} repo={repo} onSelectRepo={setSelectedRepoId} />)
          )}
        </div>
      </section>

      {selectedRepoId && (
        <RepoSideSheet repoId={selectedRepoId} onClose={() => setSelectedRepoId(null)} />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-24 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-neutral-900">{value}</div>
    </div>
  );
}

function WindowSelector({ currentWindow }: { currentWindow: string }) {
  return (
    <div className="flex min-w-24 flex-col justify-center rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <div className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
        Window
      </div>
      <div className="flex items-center gap-3 text-sm font-medium text-neutral-400">
        <Link href="?window=7" className={currentWindow === "7" ? "font-bold text-green-700" : "hover:text-neutral-600"}>7d</Link>
        <Link href="?window=30" className={currentWindow === "30" ? "font-bold text-green-700" : "hover:text-neutral-600"}>30d</Link>
        <Link href="?window=90" className={currentWindow === "90" ? "font-bold text-green-700" : "hover:text-neutral-600"}>90d</Link>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  unframed = false,
}: {
  title: string;
  subtitle: React.ReactNode;
  unframed?: boolean;
}) {
  return (
    <div className={unframed ? "mb-3" : "border-b border-neutral-200/60 px-5 py-4"}>
      <h2 className="text-lg font-semibold tracking-tight text-neutral-900">{title}</h2>
      <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
    </div>
  );
}

function RepositoryTable({
  repos,
  rankLabel,
  onSelectRepo,
}: {
  repos: RankedRepository[];
  rankLabel: string;
  onSelectRepo: (id: string) => void;
}) {
  if (repos.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.14em] text-neutral-500">
          <tr className="border-b border-neutral-200">
            <th className="px-5 py-3 font-medium">Repository</th>
            <th className="px-5 py-3 font-medium">Traction Profile</th>
            <th className="px-5 py-3 font-medium">Signals</th>
            <th className="px-5 py-3 font-medium">Velocity</th>
            <th className="px-5 py-3 font-medium text-right">{rankLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {repos.map((repo) => (
            <tr key={repo.id} onClick={() => onSelectRepo(repo.id)} className="transition hover:bg-green-50/40 cursor-pointer group">
              <td className="px-5 py-4 w-[30%]">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-left group-hover:text-emerald-700 transition">
                    {repoFullName(repo)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-neutral-500">
                  {repo.description ?? "No description available."}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  <span>{repo.language ?? "Unknown"}</span>
                  <span>•</span>
                  <span>{compactNumber.format(repo.stars)} stars</span>
                </div>
              </td>
              <td className="px-5 py-4 w-[20%]">
                <div className="flex flex-col gap-1.5">
                  <MiniBar label="Hiring" score={repo.hiringScore} colorClass="bg-blue-500" />
                  <MiniBar label="Social" score={repo.socialScore} colorClass="bg-orange-500" />
                  <MiniBar label="Growth" score={repo.growthScore} colorClass="bg-emerald-500" />
                </div>
              </td>
              <td className="px-5 py-4 w-[30%]">
                <div className="flex flex-col gap-1.5">
                  {repo.signals && repo.signals.length > 0 ? (
                    repo.signals.map((sig, idx) => (
                      <span key={idx} className="inline-flex w-fit items-center gap-1.5 text-[11px] font-medium text-neutral-700 bg-white px-2 py-1 rounded-md border border-neutral-200 shadow-sm" title={sig.description}>
                        <span>{sig.variant === "enterprise" ? "🏢" : sig.variant === "social" ? "💬" : "📈"}</span>
                        <span className="line-clamp-1">{sig.description}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-neutral-400 italic">Calibrating signals...</span>
                  )}
                </div>
              </td>
              <td className="px-5 py-4 w-[10%]">
                <div className="font-medium tabular-nums">
                  {repo.starsGained >= 0 ? "+" : ""}
                  {compactNumber.format(repo.starsGained)}
                </div>
                <div className="text-xs text-neutral-500 tabular-nums">
                  {repo.starVelocity.toFixed(1)} / day
                </div>
              </td>
              <td className="px-5 py-4 text-right w-[10%]">
                <ScorePill score={repo.trendScore} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniBar({ label, score, colorClass }: { label: string; score: number; colorClass: string }) {
  const safeScore = isNaN(score) ? 0 : Math.min(Math.max(score, 0), 100);
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-10 text-neutral-500 uppercase tracking-widest">{label}</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${safeScore}%` }} />
      </div>
      <span className="w-5 text-right font-medium text-neutral-700 tabular-nums">{Math.round(safeScore)}</span>
    </div>
  );
}

function VelocityRow({ repo, onSelectRepo }: { repo: RankedRepository, onSelectRepo: (id: string) => void }) {
  return (
    <div onClick={() => onSelectRepo(repo.id)} className="group flex items-center justify-between px-5 py-4 transition hover:bg-neutral-50/50 cursor-pointer">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-left group-hover:text-emerald-700 transition">
          {repoFullName(repo)}
        </span>
        <div className="text-xs text-neutral-500">
          {repo.language ?? "Unknown"} • {compactNumber.format(repo.stars)} stars
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-emerald-600 tabular-nums">
          +{compactNumber.format(repo.starsGained)} stars
        </div>
        <div className="text-xs text-neutral-500 tabular-nums">
          {repo.starVelocity.toFixed(1)} / day
        </div>
      </div>
    </div>
  );
}

function RisingCard({ repo, onSelectRepo }: { repo: RankedRepository, onSelectRepo: (id: string) => void }) {
  return (
    <button onClick={() => onSelectRepo(repo.id)} className="group flex flex-col gap-3 rounded-xl border border-neutral-200/60 bg-white p-5 shadow-sm transition hover:shadow-md cursor-pointer hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left">
      <div>
        <span className="text-base font-semibold tracking-tight text-neutral-900 group-hover:text-emerald-700 transition">
          {repo.name}
        </span>
        <div className="text-xs text-neutral-500">{repo.owner}</div>
      </div>
      <p className="line-clamp-2 text-sm text-neutral-600">
        {repo.description ?? "No description provided."}
      </p>
      <div className="mt-auto flex items-center justify-between pt-2">
        <div className="text-xs font-medium tabular-nums text-neutral-700">
          {compactNumber.format(repo.stars)} ⭐
        </div>
        <div className="text-xs font-semibold tabular-nums text-emerald-600">
          +{compactNumber.format(repo.starsGained)} in {repo.timeframeDays}d
        </div>
      </div>
    </button>
  );
}

function ScorePill({ score }: { score: number }) {
  return (
    <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
      {formatScore(score)}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="p-5 text-sm text-neutral-500">
      Radar is calibrating. Click &quot;Trigger Live Scan&quot; above to begin discovering repositories.
    </div>
  );
}

function CategoryIcon({ cat }: { cat: string }) {
  const getSimpleIcon = (name: string) => (
    <img src={`https://cdn.simpleicons.org/${name}`} alt={cat} className="w-3.5 h-3.5 mr-1.5" />
  );

  switch (cat) {
    // Domains
    case "AI": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mr-1.5 text-blue-500"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>;
    case "Backend": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mr-1.5 text-neutral-500"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>;
    case "Database": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mr-1.5 text-indigo-500"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>;
    case "DevOps": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mr-1.5 text-purple-500"><path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"/></svg>;
    case "Frontend": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mr-1.5 text-pink-500"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>;
    case "Infrastructure": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mr-1.5 text-sky-500"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>;
    case "Security": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 mr-1.5 text-emerald-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    
    // Languages
    case "C": return getSimpleIcon("c");
    case "C++": return getSimpleIcon("cplusplus");
    case "Go": return getSimpleIcon("go");
    case "Java": return getSimpleIcon("openjdk");
    case "JavaScript": return getSimpleIcon("javascript");
    case "Python": return getSimpleIcon("python");
    case "Ruby": return getSimpleIcon("ruby");
    case "Rust": return getSimpleIcon("rust");
    case "TypeScript": return getSimpleIcon("typescript");
    
    // Default fallback
    default: return null;
  }
}

function CategoryFilter({
  categories,
  activeCategory,
  onSelect,
}: {
  categories: string[];
  activeCategory: string | null;
  onSelect: (category: string | null) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-widest text-neutral-400 mr-1">Filter</span>
      <button
        onClick={() => onSelect(null)}
        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
          activeCategory === null
            ? "bg-green-600 text-white shadow-sm"
            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(activeCategory === cat ? null : cat)}
          className={`flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            activeCategory === cat
              ? "bg-green-600 text-white shadow-sm"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          <CategoryIcon cat={cat} />
          {cat}
        </button>
      ))}
    </div>
  );
}
