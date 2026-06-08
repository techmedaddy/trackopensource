import Link from "next/link";
import type { ReactNode } from "react";
import { RepositoryChart } from "@/components/repository-chart";
import { WatchlistButton } from "@/components/watchlist-button";
import {
  compactNumber,
  formatScore,
  getRepositoryDetail,
  repoFullName,
  type Ranking,
} from "@/lib/api";

type RepoPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RepoPage({ params }: RepoPageProps) {
  const { id } = await params;
  const detail = await getRepositoryDetail(id);

  if (!detail) {
    return (
      <main className="min-h-screen bg-neutral-50 px-4 py-8 text-neutral-950">
        <div className="mx-auto max-w-4xl rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <Link href="/" className="text-sm font-medium text-green-700 hover:text-green-800">
            Back to radar
          </Link>
          <h1 className="mt-4 text-2xl font-semibold">Repository unavailable</h1>
          <p className="mt-2 text-neutral-500">
            The API did not return a repository for this id. Confirm the backend is running on
            `NEXT_PUBLIC_API_URL` and the collector has captured this project.
          </p>
        </div>
      </main>
    );
  }

  const { repository, ranking, snapshots, history } = detail;
  const latestSnapshot = snapshots.at(-1);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="border-b border-neutral-200 pb-6">
          <Link href="/" className="text-sm font-medium text-green-700 hover:text-green-800">
            Back to radar
          </Link>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {repoFullName(repository)}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 sm:text-base">
                {repository.description ?? "No description available."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-600">
                <Badge>{repository.language ?? "Unknown language"}</Badge>
                {repository.categories.map((category) => (
                  <Badge key={category}>{category}</Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <WatchlistButton repoId={repository.id} />
              <a
                href={`https://github.com/${repository.owner}/${repository.name}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Metric label="Stars" value={compactNumber.format(repository.stars)} />
          <Metric label="Forks" value={compactNumber.format(repository.forks)} />
          <Metric
            label="Trend score"
            value={ranking ? formatScore(ranking.trendScore) : "0.0"}
          />
          <Metric
            label="Stars gained"
            value={ranking ? signedCompact(ranking.starsGained) : "+0"}
          />
          <Metric
            label="Snapshots"
            value={snapshots.length}
            helper={latestSnapshot ? `Latest ${new Date(latestSnapshot.capturedAt).toLocaleDateString()}` : undefined}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <div>
            <SectionTitle title="Growth chart" subtitle="Stars, forks, and contributors over time." />
            <RepositoryChart history={history} />
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
            <SectionTitle
              title="Ranking signals"
              subtitle="Current 30-day score breakdown."
              framed
            />
            {ranking ? (
              <SignalList ranking={ranking} />
            ) : (
              <div className="p-5 text-sm text-neutral-500">
                No ranking has been computed for this repository yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {helper ? <div className="mt-1 text-xs text-neutral-500">{helper}</div> : null}
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-neutral-100 px-2.5 py-1">{children}</span>;
}

function SectionTitle({
  title,
  subtitle,
  framed = false,
}: {
  title: string;
  subtitle: string;
  framed?: boolean;
}) {
  return (
    <div className={framed ? "border-b border-neutral-200 px-5 py-4" : "mb-3"}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
    </div>
  );
}

function SignalList({ ranking }: { ranking: Ranking }) {
  const signals = [
    ["Velocity", ranking.velocityScore],
    ["Growth ratio", ranking.growthScore],
    ["Contributors", ranking.contributorScore],
    ["Activity", ranking.activityScore],
    ["Maintenance", ranking.maintenanceScore],
  ] as const;

  return (
    <div className="divide-y divide-neutral-200">
      {signals.map(([label, value]) => (
        <div key={label} className="px-5 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{label}</span>
            <span className="text-neutral-500">{formatScore(value)}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-neutral-100">
            <div
              className="h-2 rounded-full bg-green-600"
              style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
          </div>
        </div>
      ))}
      <div className="px-5 py-4 text-sm text-neutral-500">
        <div>Star velocity: {ranking.starVelocity.toFixed(2)} / day</div>
        <div>Growth ratio: {(ranking.growthRatio * 100).toFixed(2)}%</div>
        <div>Contributor growth: {(ranking.contributorGrowth * 100).toFixed(2)}%</div>
      </div>
    </div>
  );
}

function signedCompact(value: number) {
  return `${value >= 0 ? "+" : ""}${compactNumber.format(value)}`;
}
