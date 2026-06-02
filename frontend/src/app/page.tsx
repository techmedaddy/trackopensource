import Link from "next/link";
import { SearchPanel } from "@/components/search-panel";
import {
  compactNumber,
  formatScore,
  getRankedRepositories,
  repoFullName,
  type RankedRepository,
} from "@/lib/api";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function Home(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const windowStr = typeof searchParams.window === "string" ? searchParams.window : "30";
  const timeframeDays = ["7", "30", "90"].includes(windowStr) ? windowStr : "30";

  const [trending, fastestGrowing, risingProjects] = await Promise.all([
    getRankedRepositories(`/trending?limit=10&timeframeDays=${timeframeDays}`),
    getRankedRepositories(`/fastest-growing?limit=8&timeframeDays=${timeframeDays}`),
    getRankedRepositories(`/trending?limit=8&timeframeDays=${timeframeDays}&maxStars=1000`),
  ]);

  const leader = trending[0];
  const trackedCount = new Set(
    [...trending, ...fastestGrowing, ...risingProjects].map((repo) => repo.id),
  ).size;

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-neutral-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-green-700">
              Momentum dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Open Source Radar
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600 sm:text-base">
              Discover repositories growing faster than expected, scored by star velocity,
              growth ratio, contributor movement, activity, and maintenance pressure.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Metric label="Tracked" value={trackedCount || 0} />
            <WindowSelector currentWindow={timeframeDays} />
            <Metric
              label="Leader"
              value={leader ? formatScore(leader.trendScore) : "0.0"}
            />
          </div>
        </header>

        <SearchPanel initialResults={trending.slice(0, 6)} />

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
            <SectionHeader
              title="Trending repositories"
              subtitle="Ranked by the blended trend score."
            />
            <RepositoryTable repos={trending} rankLabel="Trend" />
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
                fastestGrowing.map((repo) => <VelocityRow key={repo.id} repo={repo} />)
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
              risingProjects.map((repo) => <RisingCard key={repo.id} repo={repo} />)
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-24 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function WindowSelector({ currentWindow }: { currentWindow: string }) {
  return (
    <div className="min-w-24 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm flex flex-col justify-center">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500 mb-1">
        Window
      </div>
      <div className="flex items-center gap-3 text-sm font-medium text-neutral-400">
        <Link href="?window=7" className={currentWindow === "7" ? "text-green-700 font-bold" : "hover:text-neutral-600"}>7d</Link>
        <Link href="?window=30" className={currentWindow === "30" ? "text-green-700 font-bold" : "hover:text-neutral-600"}>30d</Link>
        <Link href="?window=90" className={currentWindow === "90" ? "text-green-700 font-bold" : "hover:text-neutral-600"}>90d</Link>
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
    <div className={unframed ? "mb-3" : "border-b border-neutral-200 px-5 py-4"}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
    </div>
  );
}

function RepositoryTable({
  repos,
  rankLabel,
}: {
  repos: RankedRepository[];
  rankLabel: string;
}) {
  if (repos.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.14em] text-neutral-500">
          <tr className="border-b border-neutral-200">
            <th className="px-5 py-3 font-medium">Repository</th>
            <th className="px-5 py-3 font-medium">Language</th>
            <th className="px-5 py-3 font-medium">Stars</th>
            <th className="px-5 py-3 font-medium">Velocity</th>
            <th className="px-5 py-3 font-medium">{rankLabel}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {repos.map((repo) => (
            <tr key={repo.id} className="transition hover:bg-green-50/40">
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <Link href={`/repos/${repo.id}`} className="font-medium hover:text-green-700">
                    {repoFullName(repo)}
                  </Link>
                  {repo.socialScore > 20 && (
                    <span className="inline-flex rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-800" title="High Social Momentum">
                      🔥 Trending
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-1 max-w-xl text-neutral-500">
                  {repo.description ?? "No description available."}
                </p>
              </td>
              <td className="px-5 py-4 text-neutral-600">{repo.language ?? "Unknown"}</td>
              <td className="px-5 py-4">{compactNumber.format(repo.stars)}</td>
              <td className="px-5 py-4">
                <div className="font-medium">
                  {repo.starsGained >= 0 ? "+" : ""}
                  {compactNumber.format(repo.starsGained)}
                </div>
                <div className="text-xs text-neutral-500">
                  {repo.starVelocity.toFixed(1)} / day
                </div>
              </td>
              <td className="px-5 py-4">
                <ScorePill score={repo.trendScore} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VelocityRow({ repo }: { repo: RankedRepository }) {
  return (
    <Link
      href={`/repos/${repo.id}`}
      className="block px-5 py-4 transition hover:bg-green-50/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="font-medium">{repoFullName(repo)}</div>
            {repo.socialScore > 20 && (
              <span className="inline-flex rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-800" title="High Social Momentum">
                🔥 Trending
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-neutral-500">{repo.language ?? "Unknown"}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-green-700">
            {repo.starVelocity.toFixed(1)} / day
          </div>
          <div className="text-xs text-neutral-500">
            {repo.starsGained >= 0 ? "+" : ""}
            {compactNumber.format(repo.starsGained)} stars
          </div>
        </div>
      </div>
    </Link>
  );
}

function RisingCard({ repo }: { repo: RankedRepository }) {
  return (
    <Link
      href={`/repos/${repo.id}`}
      className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-green-500 hover:bg-green-50/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="font-semibold">{repoFullName(repo)}</div>
            {repo.socialScore > 20 && (
              <span className="inline-flex rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-800" title="High Social Momentum">
                🔥 Trending
              </span>
            )}
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-neutral-500">
            {repo.description ?? "No description available."}
          </p>
        </div>
        <ScorePill score={repo.trendScore} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs text-neutral-500">
        <span className="rounded-full bg-neutral-100 px-2 py-1">
          {compactNumber.format(repo.stars)} stars
        </span>
        <span className="rounded-full bg-neutral-100 px-2 py-1">
          {repo.language ?? "Unknown"}
        </span>
      </div>
    </Link>
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
      No ranking data yet. Run `cargo run --bin collector`, then refresh this page.
    </div>
  );
}
