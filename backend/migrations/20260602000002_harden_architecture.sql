-- Point 2: Snapshot Idempotency
-- Ensure only one snapshot per repository per day (Must cast AT TIME ZONE 'UTC' to be IMMUTABLE)
CREATE UNIQUE INDEX unique_daily_snapshot ON snapshots(repo_id, ((captured_at AT TIME ZONE 'UTC')::DATE));

-- Point 4: Search API Performance
-- Enable trigram extension for fast fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_repositories_name_trgm ON repositories USING GIN (name gin_trgm_ops);
CREATE INDEX idx_repositories_owner_trgm ON repositories USING GIN (owner gin_trgm_ops);
CREATE INDEX idx_repositories_desc_trgm ON repositories USING GIN (description gin_trgm_ops);
