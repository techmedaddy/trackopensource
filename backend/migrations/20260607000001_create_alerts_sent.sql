CREATE TABLE IF NOT EXISTS alerts_sent (
    repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (repo_id, alert_type)
);
