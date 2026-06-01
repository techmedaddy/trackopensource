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
  updatedAt: string;
};

export type RepositoryDetail = {
  repository: Repository;
  ranking: Ranking | null;
  snapshots: Snapshot[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
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
