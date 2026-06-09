"use client";

import useSWR from "swr";
import { GrowthChart } from "@/components/growth-chart";
import { WatchlistButton } from "@/components/watchlist-button";
import {
  compactNumber,
  formatScore,
  repoFullName,
  type RepositoryDetail,
} from "@/lib/api";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load repo");
  return res.json();
};

function signedCompact(value: number) {
  return `${value >= 0 ? "+" : ""}${compactNumber.format(value)}`;
}

export function RepoSideSheet({
  repoId,
  onClose,
}: {
  repoId: string;
  onClose: () => void;
}) {
  const { data, error, isLoading } = useSWR<RepositoryDetail>(
    `/api/repos/${repoId}`,
    fetcher
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out border-l border-neutral-200/60 overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200/60 bg-white sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-neutral-900">
            Project Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {isLoading && (
          <div className="p-8 text-center text-sm text-neutral-500 animate-pulse">
            Loading project data...
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-sm text-red-500">
            Failed to load repository details.
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-8 p-6">
            <div>
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {repoFullName(data.repository)}
                </h1>
                <WatchlistButton repoId={repoId} />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                {data.repository.description ?? "No description available."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>{data.repository.language ?? "Unknown"}</Badge>
                {data.repository.categories.map((cat) => (
                  <Badge key={cat}>{cat}</Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Stars" value={compactNumber.format(data.repository.stars)} />
              <Metric label="Forks" value={compactNumber.format(data.repository.forks)} />
              <Metric
                label="Trend"
                value={data.ranking ? formatScore(data.ranking.trendScore) : "0.0"}
              />
              <Metric
                label="Gained"
                value={data.ranking ? signedCompact(data.ranking.starsGained) : "+0"}
                trend="up"
              />
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Growth History</h3>
              <div className="rounded-xl border border-neutral-200/60 bg-white p-4 shadow-sm">
                <GrowthChart snapshots={data.snapshots} />
              </div>
            </div>

            {data.ranking && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Ranking Signals</h3>
                <div className="rounded-xl border border-neutral-200/60 bg-white shadow-sm overflow-hidden divide-y divide-neutral-100">
                  <SignalRow label="Velocity" value={data.ranking.velocityScore} />
                  <SignalRow label="Growth Ratio" value={data.ranking.growthScore} />
                  <SignalRow label="Contributors" value={data.ranking.contributorScore} />
                  <SignalRow label="Social Momentum" value={data.ranking.socialScore} />
                  <SignalRow label="Hiring Demand" value={data.ranking.hiringScore} />
                </div>
              </div>
            )}
            
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <WatchlistButton repoId={data.repository.id} />
              <a
                href={`https://github.com/${data.repository.owner}/${data.repository.name}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center rounded-md bg-neutral-950 h-10 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Open on GitHub
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  trend,
}: {
  label: string;
  value: string | number;
  trend?: "up" | "down";
}) {
  return (
    <div className="rounded-xl border border-neutral-200/60 bg-neutral-50/50 p-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${trend === "up" ? "text-emerald-600" : "text-neutral-900"}`}>
        {value}
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-700 border border-neutral-200/60">
      {children}
    </span>
  );
}

function SignalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-700">{label}</span>
        <span className="tabular-nums font-medium text-neutral-900">{formatScore(value)}</span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-100">
        <div
          className="h-1.5 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
