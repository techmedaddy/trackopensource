use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Repository {
    pub id: Uuid,
    pub github_id: i64,
    pub owner: String,
    pub name: String,
    pub description: Option<String>,
    pub language: Option<String>,
    pub categories: Vec<String>,
    pub stars: i32,
    pub forks: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub id: Uuid,
    pub repo_id: Uuid,
    pub stars: i32,
    pub forks: i32,
    pub watchers: i32,
    pub open_issues: i32,
    pub contributors: i32,
    pub captured_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Ranking {
    pub id: Uuid,
    pub repo_id: Uuid,
    pub timeframe_days: i32,
    pub stars_gained: i32,
    pub star_velocity: f64,
    pub growth_ratio: f64,
    pub contributors_gained: i32,
    pub contributor_growth: f64,
    pub velocity_score: f64,
    pub growth_score: f64,
    pub contributor_score: f64,
    pub activity_score: f64,
    pub maintenance_score: f64,
    pub trend_score: f64,
    pub social_score: f64,
    pub hiring_score: f64,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct RankedRepository {
    pub id: Uuid,
    pub github_id: i64,
    pub owner: String,
    pub name: String,
    pub description: Option<String>,
    pub language: Option<String>,
    pub categories: Vec<String>,
    pub stars: i32,
    pub forks: i32,
    pub timeframe_days: i32,
    pub stars_gained: i32,
    pub star_velocity: f64,
    pub growth_ratio: f64,
    pub contributors_gained: i32,
    pub contributor_growth: f64,
    pub velocity_score: f64,
    pub growth_score: f64,
    pub contributor_score: f64,
    pub activity_score: f64,
    pub maintenance_score: f64,
    pub trend_score: f64,
    pub social_score: f64,
    pub hype_score: f64,
    pub hiring_score: f64,
    #[sqlx(default)]
    pub signals: sqlx::types::Json<Vec<Signal>>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct SocialMention {
    pub id: Uuid,
    pub repo_id: Uuid,
    pub platform: String,
    pub external_id: String,
    pub title: String,
    pub url: String,
    pub score: i32,
    pub comments_count: i32,
    pub sentiment_score: Option<f64>,
    pub published_at: DateTime<Utc>,
    pub captured_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryDetail {
    pub repository: Repository,
    pub ranking: Option<Ranking>,
    pub snapshots: Vec<Snapshot>,
    pub history: Vec<RepositorySnapshot>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct RepositorySnapshot {
    pub id: Uuid,
    pub repo_id: Uuid,
    pub stars: i32,
    pub forks: i32,
    pub social_score: f64,
    pub hiring_score: f64,
    pub trend_score: f64,
    pub created_at: chrono::NaiveDate,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Facets {
    pub categories: Vec<String>,
    pub languages: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Signal {
    pub variant: String,
    pub description: String,
}
