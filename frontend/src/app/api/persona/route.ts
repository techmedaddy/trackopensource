import { NextResponse } from "next/server";
import { getRankedRepositories } from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    // 1. Fetch user's starred repositories from GitHub
    const githubRes = await fetch(`https://api.github.com/users/${username}/starred?per_page=100`, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        ...(process.env.GITHUB_TOKEN ? { "Authorization": `Bearer ${process.env.GITHUB_TOKEN}` } : {})
      }
    });

    if (!githubRes.ok) {
      if (githubRes.status === 404) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (githubRes.status === 403) return NextResponse.json({ error: "GitHub rate limit exceeded" }, { status: 429 });
      return NextResponse.json({ error: "Failed to fetch from GitHub" }, { status: 500 });
    }

    const starredData: { full_name: string, html_url: string }[] = await githubRes.json();
    const starredNames = new Set(starredData.map(repo => repo.full_name.toLowerCase()));

    // 2. Fetch our entire tracked database (or top 1000)
    // We use trending with a high limit to get a good sample of active repos
    const trackedRepos = await getRankedRepositories("/trending?limit=1000&timeframeDays=30");

    // 3. Find intersection
    const matchedRepos = trackedRepos.filter(repo => starredNames.has(repo.name.toLowerCase()));

    if (matchedRepos.length === 0) {
      return NextResponse.json({ 
        username,
        persona: "The Enigma",
        description: "You star repositories that are so underground, they aren't even on our radar yet.",
        matches: 0,
        averageHiring: 0,
        averageTrend: 0,
        averageSocial: 0,
        matchedRepos: []
      });
    }

    // 4. Calculate averages
    let totalHiring = 0, totalTrend = 0, totalSocial = 0;
    matchedRepos.forEach(repo => {
      totalHiring += repo.hiringScore;
      totalTrend += repo.trendScore;
      totalSocial += repo.socialScore;
    });

    const averageHiring = totalHiring / matchedRepos.length;
    const averageTrend = totalTrend / matchedRepos.length;
    const averageSocial = totalSocial / matchedRepos.length;

    // 5. Persona Algorithm
    let persona = "The Pragmatic Architect";
    let description = "You have a perfectly balanced taste in technology. You evaluate both the corporate backing and the community hype before adopting.";
    let color = "indigo";

    if (averageHiring > 5 && averageTrend < 3) {
      persona = "Enterprise Bedrock";
      description = "Reliability is your middle name. You prefer battle-tested, corporate-backed frameworks that won't break in production.";
      color = "blue";
    } else if (averageTrend > 5 && averageSocial > 5 && averageHiring < 4) {
      persona = "Bleeding-Edge Hypester";
      description = "If it was released yesterday, it's already in your tech stack. You thrive on volatile momentum and community hype.";
      color = "rose";
    } else if (averageHiring > 5 && averageTrend > 5) {
      persona = "The Gold Rush Architect";
      description = "You have a sixth sense for frameworks that are both highly hyped AND heavily adopted by Fortune 500s.";
      color = "emerald";
    }

    return NextResponse.json({
      username,
      persona,
      description,
      color,
      matches: matchedRepos.length,
      averageHiring,
      averageTrend,
      averageSocial,
      matchedRepos: matchedRepos.map(r => r.name).slice(0, 5) // Send top 5 matched
    });
  } catch (error) {
    console.error("Persona error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
