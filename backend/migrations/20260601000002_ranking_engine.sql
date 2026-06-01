-- Expand rankings so the same repository can be scored across multiple windows.
ALTER TABLE rankings
    ADD COLUMN IF NOT EXISTS timeframe_days INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN IF NOT EXISTS stars_gained INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS star_velocity DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS growth_ratio DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS contributors_gained INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS contributor_growth DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS growth_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS contributor_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS maintenance_score DOUBLE PRECISION NOT NULL DEFAULT 0.0;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'rankings_repo_id_key'
    ) THEN
        ALTER TABLE rankings DROP CONSTRAINT rankings_repo_id_key;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rankings_repo_timeframe
    ON rankings(repo_id, timeframe_days);

CREATE INDEX IF NOT EXISTS idx_rankings_timeframe_trend_score
    ON rankings(timeframe_days, trend_score DESC);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categories (name)
VALUES
    ('AI'),
    ('Database'),
    ('Infrastructure'),
    ('DevOps'),
    ('Frontend'),
    ('Backend'),
    ('Security'),
    ('Rust'),
    ('Go'),
    ('Python')
ON CONFLICT (name) DO NOTHING;
