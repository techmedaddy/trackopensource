import { getRankedRepositories } from "@/lib/api";
import { DashboardClient } from "@/components/dashboard-client";
import { LiveTicker } from "@/components/live-ticker";
import { Suspense } from "react";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function Home(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const windowStr = typeof searchParams.window === "string" ? searchParams.window : "30";
  const timeframeDays = ["7", "30", "90"].includes(windowStr) ? windowStr : "30";

  // 1. Fetch initial data server-side so it's fully populated on first load (SEO/UX)
  const [trending, fastestGrowing, risingProjects] = await Promise.all([
    getRankedRepositories(`/trending?limit=11&timeframeDays=${timeframeDays}`),
    getRankedRepositories(`/fastest-growing?limit=14&timeframeDays=${timeframeDays}`),
    getRankedRepositories(`/trending?limit=8&timeframeDays=${timeframeDays}&maxStars=100`),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950 flex flex-col">
      <LiveTicker repositories={fastestGrowing} />
      <Suspense fallback={<div className="p-8 text-center text-neutral-500">Loading dashboard...</div>}>
        {/* 2. Pass to Client component which handles caching and SWR background updates */}
        <DashboardClient
          initialTrending={trending}
          initialFastest={fastestGrowing}
          initialRising={risingProjects}
        />
      </Suspense>
    </main>
  );
}
