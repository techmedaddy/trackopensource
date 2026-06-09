import { VersusClient } from "@/components/versus-client";
import { getRankedRepositories } from "@/lib/api";

export const metadata = {
  title: "Tech Duel | Open Source Radar",
  description: "Compare frameworks head-to-head on Hype, Hiring, and Velocity.",
};

export default async function VersusPage() {
  // Fetch initial top repos to populate the dropdowns by default
  const topRepos = await getRankedRepositories("/trending?limit=50&timeframeDays=30");

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500">
            Tech Duel Arena
          </h1>
          <p className="text-lg text-neutral-500 max-w-2xl mx-auto">
            Pit two open-source frameworks head-to-head. Compare real-world hiring demand, community hype, and code velocity before you commit to a stack.
          </p>
        </header>

        <VersusClient initialRepos={topRepos} />
      </div>
    </main>
  );
}
