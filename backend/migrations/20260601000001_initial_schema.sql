-- Add UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Repositories Table
CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_id BIGINT UNIQUE NOT NULL,
    owner VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    language VARCHAR(100),
    categories TEXT[] DEFAULT '{}',
    stars INTEGER NOT NULL DEFAULT 0,
    forks INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner, name)
);

-- Snapshots Table (The "Time Machine")
CREATE TABLE IF NOT EXISTS snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    stars INTEGER NOT NULL,
    forks INTEGER NOT NULL,
    watchers INTEGER NOT NULL,
    open_issues INTEGER NOT NULL,
    contributors INTEGER NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying snapshots efficiently by repo and time
CREATE INDEX IF NOT EXISTS idx_snapshots_repo_id_captured_at ON snapshots(repo_id, captured_at);

-- Rankings Table
CREATE TABLE IF NOT EXISTS rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repo_id UUID UNIQUE NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    velocity_score FLOAT NOT NULL DEFAULT 0.0,
    activity_score FLOAT NOT NULL DEFAULT 0.0,
    trend_score FLOAT NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick sorting by trend score
CREATE INDEX IF NOT EXISTS idx_rankings_trend_score ON rankings(trend_score DESC);
