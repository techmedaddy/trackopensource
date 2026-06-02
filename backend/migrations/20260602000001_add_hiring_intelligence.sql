CREATE TABLE job_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255),
    source_url TEXT NOT NULL,
    posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_mentions_repo_id ON job_mentions(repo_id);
CREATE INDEX idx_job_mentions_posted_at ON job_mentions(posted_at);

ALTER TABLE rankings 
ADD COLUMN hiring_score DOUBLE PRECISION NOT NULL DEFAULT 0.0;
