export type RankedRepository = {
  id: string;
  githubId: number;
  owner: string;
  name: string;
  description: string | null;
  language: string | null;
  categories: string[];
  stars: number;
  forks: number;
  timeframeDays: number;
  starsGained: number;
  starVelocity: number;
  growthRatio: number;
  contributorsGained: number;
  contributorGrowth: number;
  velocityScore: number;
  growthScore: number;
  contributorScore: number;
  activityScore: number;
  maintenanceScore: number;
  trendScore: number;
  socialScore: number;
  hiringScore: number;
  signals: { variant: string; description: string }[];
  updatedAt: string;
};

export type Repository = {
  id: string;
  githubId: number;
  owner: string;
  name: string;
  description: string | null;
  language: string | null;
  categories: string[];
  stars: number;
  forks: number;
  createdAt: string;
  updatedAt: string;
};

export type Snapshot = {
  id: string;
  repoId: string;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  contributors: number;
  capturedAt: string;
};

export type Ranking = {
  id: string;
  repoId: string;
  timeframeDays: number;
  starsGained: number;
  starVelocity: number;
  growthRatio: number;
  contributorsGained: number;
  contributorGrowth: number;
  velocityScore: number;
  growthScore: number;
  contributorScore: number;
  activityScore: number;
  maintenanceScore: number;
  trendScore: number;
  socialScore: number;
  hiringScore: number;
  signals: { variant: string; description: string }[];
  updatedAt: string;
};

export type RepositoryDetail = {
  repository: Repository;
  ranking: Ranking | null;
  snapshots: Snapshot[];
};

const API_BASE_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ?? "http://localhost:8080/api"
    : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export async function apiGet<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getRankedRepositories(path: string) {
  try {
    return await apiGet<RankedRepository[]>(path);
  } catch {
    return [];
  }
}

export async function getRepositoryDetail(id: string) {
  try {
    return await apiGet<RepositoryDetail>(`/repos/${id}?timeframeDays=30`);
  } catch {
    return null;
  }
}

export const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatScore(value: number) {
  return value.toFixed(1);
}

export function repoFullName(repo: Pick<Repository, "owner" | "name">) {
  return `${repo.owner}/${repo.name}`;
}
