ALTER TABLE repositories ADD COLUMN is_tracked BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX idx_repositories_tracked ON repositories(is_tracked) WHERE is_tracked = TRUE;
