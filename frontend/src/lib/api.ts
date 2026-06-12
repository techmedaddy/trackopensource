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
  hypeScore: number;
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

export type RepositorySnapshot = {
  id: string;
  repoId: string;
  stars: number;
  forks: number;
  socialScore: number;
  hiringScore: number;
  trendScore: number;
  createdAt: string;
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
  history: RepositorySnapshot[];
};

const API_BASE_URL =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ?? "http://localhost:8080/api"
    : process.env.NEXT_PUBLIC_API_URL ?? "/api";

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

export async function getRankedRepositories(
  path: string,
  weights?: { vw?: number; gw?: number; cw?: number; hw?: number; sw?: number }
) {
  try {
    let url = path;
    if (weights) {
      const params = new URLSearchParams();
      if (weights.vw !== undefined) params.append("vw", weights.vw.toString());
      if (weights.gw !== undefined) params.append("gw", weights.gw.toString());
      if (weights.cw !== undefined) params.append("cw", weights.cw.toString());
      if (weights.hw !== undefined) params.append("hw", weights.hw.toString());
      if (weights.sw !== undefined) params.append("sw", weights.sw.toString());
      
      const paramStr = params.toString();
      if (paramStr) {
        url += (url.includes('?') ? '&' : '?') + paramStr;
      }
    }
    return await apiGet<RankedRepository[]>(url);
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

export async function getWatchlist(token: string): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/watchlists`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export async function toggleWatchlist(token: string, repoId: string, isTracked: boolean): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/watchlists/${repoId}`, {
      method: isTracked ? "DELETE" : "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export async function getApiKeys(token: string): Promise<ApiKey[]> {
  const res = await fetch(`${API_BASE_URL}/keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load keys");
  return res.json();
}

export async function createApiKey(token: string, name: string): Promise<{ key: string; apiKey: ApiKey }> {
  const res = await fetch(`${API_BASE_URL}/keys`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create key");
  return res.json();
}

export async function revokeApiKey(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/keys/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to revoke key");
}
