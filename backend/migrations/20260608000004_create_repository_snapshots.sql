CREATE TABLE IF NOT EXISTS repository_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    stars INTEGER NOT NULL,
    forks INTEGER NOT NULL,
    social_score FLOAT NOT NULL DEFAULT 0.0,
    hiring_score FLOAT NOT NULL DEFAULT 0.0,
    trend_score FLOAT NOT NULL DEFAULT 0.0,
    created_at DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE(repo_id, created_at)
);

CREATE INDEX IF NOT EXISTS idx_repo_snapshots_repo_id ON repository_snapshots(repo_id);
CREATE INDEX IF NOT EXISTS idx_repo_snapshots_created_at ON repository_snapshots(created_at);
