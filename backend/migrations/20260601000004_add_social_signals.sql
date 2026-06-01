CREATE TABLE social_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'hacker_news', 'reddit', 'youtube'
    external_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    score INT NOT NULL DEFAULT 0,
    comments_count INT NOT NULL DEFAULT 0,
    sentiment_score FLOAT,
    published_at TIMESTAMPTZ NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(platform, external_id)
);

CREATE INDEX idx_social_mentions_repo_id ON social_mentions(repo_id);
CREATE INDEX idx_social_mentions_platform ON social_mentions(platform);
CREATE INDEX idx_social_mentions_published_at ON social_mentions(published_at);

-- Add social score to rankings
ALTER TABLE rankings ADD COLUMN social_score DOUBLE PRECISION NOT NULL DEFAULT 0;
