-- Phase 2: Alias Engine and Full-Text Search Tokenization

-- 1. Add aliases column so we can move hardcoded Rust alias definitions into the database
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}';

-- Seed the initial aliases with the repository name and common shorthand
UPDATE repositories SET aliases = ARRAY[LOWER(name)] WHERE array_length(aliases, 1) IS NULL;
UPDATE repositories SET aliases = array_append(aliases, 'otel') WHERE LOWER(name) LIKE '%opentelemetry%' AND NOT 'otel' = ANY(aliases);
UPDATE repositories SET aliases = array_append(aliases, 'k8s') WHERE LOWER(name) LIKE '%kubernetes%' AND NOT 'k8s' = ANY(aliases);
UPDATE repositories SET aliases = array_append(aliases, 'postgres') WHERE LOWER(name) LIKE '%postgres%' AND NOT 'postgres' = ANY(aliases);
UPDATE repositories SET aliases = array_append(aliases, 'psql') WHERE LOWER(name) LIKE '%postgres%' AND NOT 'psql' = ANY(aliases);

-- 2. Create raw staging table for job posts so we can leverage PostgreSQL Full-Text Search
CREATE TABLE IF NOT EXISTS raw_job_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(50) NOT NULL,
    external_id VARCHAR(255) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255),
    content TEXT NOT NULL,
    source_url TEXT NOT NULL,
    posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add a GIN index on the tsvector to accelerate the alias matching engine
CREATE INDEX IF NOT EXISTS idx_raw_job_posts_content_tsv 
ON raw_job_posts USING GIN (to_tsvector('english', content));
