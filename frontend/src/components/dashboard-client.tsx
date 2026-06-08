"use client";

import { SignInButton, Show, UserButton } from "@clerk/nextjs";
import useSWR from "swr";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { SearchPanel } from "@/components/search-panel";
import { GithubSearchPanel } from "@/components/github-search";
import { ScanTrigger } from "@/components/scan-trigger";
import { RepoSideSheet } from "@/components/repo-side-sheet";
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
    `/api/fastest-growing?limit=8&timeframeDays=${timeframeDays}${categoryParam}`,
    fetcher,
    { fallbackData: activeCategory ? undefined : initialFastest, keepPreviousData: true, refreshInterval: 60000 }
  );

  const { data: risingProjects = [] } = useSWR<RankedRepository[]>(
    `/api/trending?limit=8&timeframeDays=${timeframeDays}&maxStars=1000${categoryParam}`,
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
          <div className="flex justify-end h-8">
            <Show when="signed-out">
              <SignInButton>
                <button className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition">
                  Sign in to track projects &rarr;
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8" } }} />
            </Show>
          </div>
          <div className="grid grid-cols-4 gap-3 text-sm">
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

      <CategoryFilter
        categories={facets?.categories ?? []}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="flex flex-col h-full">
          <SearchPanel initialResults={trending.slice(0, 4)} />
        </div>

        <div className="flex flex-col rounded-lg border border-neutral-200 bg-white shadow-sm h-full">
          <SectionHeader
            title="Hype vs. Hiring Matrix"
            subtitle="Visualize the gap between developer mindshare and corporate adoption."
          />
          <div className="flex-1 p-4 pt-0">
            <HypeVsHiringMatrix data={matrixData} activeCategory={activeCategory} onSelectRepo={setSelectedRepoId} />
          </div>
        </div>
      </section>

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
          subtitle="Repositories under 1,000 stars with unusual momentum."
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
  subtitle: string;
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
            <tr key={repo.id} className="transition hover:bg-green-50/40">
              <td className="px-5 py-4 w-[30%]">
                <div className="flex items-center gap-2">
                  <button onClick={() => onSelectRepo(repo.id)} className="font-medium text-left hover:text-emerald-700 transition">
                    {repoFullName(repo)}
                  </button>
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
    <div className="group flex items-center justify-between px-5 py-4 transition hover:bg-neutral-50/50">
      <div className="flex flex-col gap-1">
        <button onClick={() => onSelectRepo(repo.id)} className="text-sm font-medium text-left hover:text-emerald-700 transition">
          {repoFullName(repo)}
        </button>
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
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200/60 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div>
        <button
          onClick={() => onSelectRepo(repo.id)}
          className="text-base font-semibold text-left tracking-tight text-neutral-900 hover:text-emerald-700 transition"
        >
          {repo.name}
        </button>
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
    </div>
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

const CATEGORY_ICONS: Record<string, string> = {
  "AI": "🤖",
  "Backend": "⚙️",
  "Database": "🗄️",
  "DevOps": "🔧",
  "Frontend": "🎨",
  "Go": "🐹",
  "Infrastructure": "☁️",
  "Python": "🐍",
  "Rust": "🦀",
  "Security": "🔒",
};

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
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            activeCategory === cat
              ? "bg-green-600 text-white shadow-sm"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          {CATEGORY_ICONS[cat] ?? "📦"} {cat}
        </button>
      ))}
    </div>
  );
}
