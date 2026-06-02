ALTER TABLE job_mentions ADD CONSTRAINT unique_job_mention UNIQUE (repo_id, source_url);
