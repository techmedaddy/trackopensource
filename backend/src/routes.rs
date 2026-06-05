use crate::{
    error::AppResult,
    models::{Facets, RankedRepository, Ranking, Repository, RepositoryDetail, Snapshot},
};
use axum::{
    body::Bytes,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use sqlx::{PgPool, Postgres, QueryBuilder};
use uuid::Uuid;

use std::time::Instant;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub manual_triggers: Arc<Mutex<Vec<Instant>>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RankingQuery {
    pub limit: Option<i64>,
    pub timeframe_days: Option<i32>,
    pub language: Option<String>,
    pub category: Option<String>,
    pub max_stars: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchQuery {
    pub q: Option<String>,
    pub limit: Option<i64>,
    pub timeframe_days: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoDetailQuery {
    pub timeframe_days: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackRequest {
    pub github_id: i64,
    pub owner: String,
    pub name: String,
    pub description: Option<String>,
    pub language: Option<String>,
    pub stars: i32,
    pub forks: i32,
}

enum SortMode {
    Trend,
    Fastest,
}

pub async fn health_check(State(state): State<AppState>) -> AppResult<&'static str> {
    sqlx::query("SELECT 1").execute(&state.pool).await?;
    Ok("Open Source Radar API is running and database is connected!")
}

pub async fn trending(
    State(state): State<AppState>,
    Query(query): Query<RankingQuery>,
) -> AppResult<Json<Vec<RankedRepository>>> {
    let repos = list_ranked_repositories(&state.pool, query, SortMode::Trend).await?;
    Ok(Json(repos))
}

pub async fn fastest_growing(
    State(state): State<AppState>,
    Query(query): Query<RankingQuery>,
) -> AppResult<Json<Vec<RankedRepository>>> {
    let repos = list_ranked_repositories(&state.pool, query, SortMode::Fastest).await?;
    Ok(Json(repos))
}

pub async fn search(
    State(state): State<AppState>,
    Query(query): Query<SearchQuery>,
) -> AppResult<Json<Vec<RankedRepository>>> {
    let term = query.q.unwrap_or_default();
    let trimmed = term.trim();

    if trimmed.is_empty() {
        let repos = list_ranked_repositories(
            &state.pool,
            RankingQuery {
                limit: query.limit,
                timeframe_days: query.timeframe_days,
                language: None,
                category: None,
                max_stars: None,
            },
            SortMode::Trend,
        )
        .await?;
        return Ok(Json(repos));
    }

    let timeframe_days = valid_timeframe(query.timeframe_days);
    let limit = valid_limit(query.limit);
    let pattern = format!("%{}%", trimmed);

    let mut builder = base_ranked_query();
    builder
        .push(" WHERE rank.timeframe_days = ")
        .push_bind(timeframe_days)
        .push(
            r#"
            AND (
                r.owner ILIKE 
            "#,
        )
        .push_bind(pattern.clone())
        .push(" OR r.name ILIKE ")
        .push_bind(pattern.clone())
        .push(" OR COALESCE(r.description, '') ILIKE ")
        .push_bind(pattern.clone())
        .push(" OR COALESCE(r.language, '') ILIKE ")
        .push_bind(pattern.clone())
        .push(" OR EXISTS (SELECT 1 FROM unnest(r.categories) category WHERE category ILIKE ")
        .push_bind(pattern)
        .push(")) ORDER BY rank.trend_score DESC, rank.star_velocity DESC LIMIT ")
        .push_bind(limit);

    let repos = builder
        .build_query_as::<RankedRepository>()
        .fetch_all(&state.pool)
        .await?;

    Ok(Json(repos))
}

pub async fn repo_detail(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(query): Query<RepoDetailQuery>,
) -> AppResult<Json<RepositoryDetail>> {
    let timeframe_days = valid_timeframe(query.timeframe_days);

    let repository = sqlx::query_as::<_, Repository>(
        r#"
        SELECT id, github_id, owner, name, description, language, categories, stars, forks, created_at, updated_at
        FROM repositories
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await?;

    let ranking = sqlx::query_as::<_, Ranking>(
        r#"
        SELECT
            id,
            repo_id,
            timeframe_days,
            stars_gained,
            star_velocity,
            growth_ratio,
            contributors_gained,
            contributor_growth,
            velocity_score,
            growth_score,
            contributor_score,
            activity_score,
            maintenance_score,
            trend_score,
            social_score,
            updated_at
        FROM rankings
        WHERE repo_id = $1 AND timeframe_days = $2
        "#,
    )
    .bind(id)
    .bind(timeframe_days)
    .fetch_optional(&state.pool)
    .await?;

    let snapshots = sqlx::query_as::<_, Snapshot>(
        r#"
        SELECT id, repo_id, stars, forks, watchers, open_issues, contributors, captured_at
        FROM snapshots
        WHERE repo_id = $1
        ORDER BY captured_at
        "#,
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(RepositoryDetail {
        repository,
        ranking,
        snapshots,
    }))
}

pub async fn facets(State(state): State<AppState>) -> AppResult<Json<Facets>> {
    let categories = sqlx::query_scalar::<_, String>(
        r#"
        SELECT DISTINCT category
        FROM repositories, unnest(categories) category
        WHERE category IS NOT NULL AND category <> ''
        ORDER BY category
        "#,
    )
    .fetch_all(&state.pool)
    .await?;

    let languages = sqlx::query_scalar::<_, String>(
        r#"
        SELECT DISTINCT language
        FROM repositories
        WHERE language IS NOT NULL AND language <> ''
        ORDER BY language
        "#,
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(Facets {
        categories,
        languages,
    }))
}

pub async fn track_repository(
    State(state): State<AppState>,
    Json(payload): Json<TrackRequest>,
) -> AppResult<Json<serde_json::Value>> {
    sqlx::query!(
        r#"
        INSERT INTO repositories (github_id, owner, name, description, language, stars, forks, is_tracked)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (github_id) DO UPDATE SET
            is_tracked = true,
            description = EXCLUDED.description,
            language = EXCLUDED.language,
            stars = EXCLUDED.stars,
            forks = EXCLUDED.forks
        "#,
        payload.github_id,
        payload.owner,
        payload.name,
        payload.description,
        payload.language,
        payload.stars,
        payload.forks
    )
    .execute(&state.pool)
    .await?;

    Ok(Json(serde_json::json!({"status": "success", "message": "Repository is now being tracked"})))
}

pub async fn trigger_scan(
    State(state): State<AppState>,
) -> AppResult<Json<serde_json::Value>> {
    let now = Instant::now();
    let one_hour = std::time::Duration::from_secs(3600);
    
    {
        let mut triggers = state.manual_triggers.lock().unwrap();
        // Remove triggers older than 1 hour
        triggers.retain(|&t| now.duration_since(t) < one_hour);
        
        if triggers.len() >= 3 {
            return Err(crate::error::AppError::RateLimit("Maximum of 3 manual scans per hour allowed. Please try again later.".into()));
        }
        
        triggers.push(now);
    }

    // Spawn a background task to run the binaries
    tokio::spawn(async {
        tracing::info!("Manual scan triggered. Starting collector...");
        
        // Execute collector
        let collector_status = tokio::process::Command::new("cargo")
            .arg("run")
            .arg("--bin")
            .arg("collector")
            .status()
            .await;
            
        // Note: In a production docker container without `cargo`, it would just be `Command::new("collector")`.
        // For dual-compatibility locally and in production (if production paths are setup), we try `collector` if cargo fails.
        let collector_success = match collector_status {
            Ok(status) if status.success() => true,
            _ => {
                // Try production path directly
                if let Ok(status) = tokio::process::Command::new("collector").status().await {
                    status.success()
                } else {
                    false
                }
            }
        };

        if collector_success {
            tracing::info!("Collector finished successfully. Starting ranker...");
            let ranker_status = tokio::process::Command::new("cargo")
                .arg("run")
                .arg("--bin")
                .arg("ranker")
                .status()
                .await;
            if ranker_status.is_err() {
                let _ = tokio::process::Command::new("ranker").status().await;
            }
        } else {
            tracing::error!("Collector failed to run.");
        }
    });

    Ok(Json(serde_json::json!({
        "status": "success", 
        "message": "Scan triggered and is running in the background!"
    })))
}

async fn list_ranked_repositories(
    pool: &PgPool,
    query: RankingQuery,
    sort_mode: SortMode,
) -> Result<Vec<RankedRepository>, sqlx::Error> {
    let mut current_timeframe = valid_timeframe(query.timeframe_days);

    // 1. Try the requested timeframe
    let mut repos = fetch_with_timeframe(pool, &query, &sort_mode, current_timeframe).await?;

    // 2. Fallback to 30 days if 90 days is empty
    if repos.is_empty() && current_timeframe == 90 {
        current_timeframe = 30;
        repos = fetch_with_timeframe(pool, &query, &sort_mode, current_timeframe).await?;
    }

    // 3. Fallback to 7 days if 30 days is empty
    if repos.is_empty() && current_timeframe == 30 {
        current_timeframe = 7;
        repos = fetch_with_timeframe(pool, &query, &sort_mode, current_timeframe).await?;
    }

    // 4. Ultimate Fallback: If STILL empty, just return top repositories by raw stars
    // This guarantees a new user ALWAYS sees data even if the ranking engine hasn't populated snapshots yet.
    if repos.is_empty() {
        repos = fetch_all_time_fallback(pool, &query).await?;
    }

    Ok(repos)
}

async fn fetch_with_timeframe(
    pool: &PgPool,
    query: &RankingQuery,
    sort_mode: &SortMode,
    timeframe_days: i32,
) -> Result<Vec<RankedRepository>, sqlx::Error> {
    let limit = valid_limit(query.limit);

    let mut builder = base_ranked_query();
    builder
        .push(" WHERE rank.timeframe_days = ")
        .push_bind(timeframe_days);

    if let Some(language) = query.language.as_ref().filter(|value| !value.trim().is_empty()) {
        builder
            .push(" AND LOWER(COALESCE(r.language, '')) = LOWER(")
            .push_bind(language.clone())
            .push(")");
    }

    if let Some(category) = query.category.as_ref().filter(|value| !value.trim().is_empty()) {
        builder
            .push(" AND EXISTS (SELECT 1 FROM unnest(r.categories) category WHERE LOWER(category) = LOWER(")
            .push_bind(category.clone())
            .push("))");
    }

    if let Some(max_stars) = query.max_stars {
        builder.push(" AND r.stars <= ").push_bind(max_stars);
    }

    match sort_mode {
        SortMode::Trend => {
            builder.push(" ORDER BY rank.trend_score DESC, rank.star_velocity DESC");
        }
        SortMode::Fastest => {
            builder.push(" ORDER BY rank.star_velocity DESC, rank.stars_gained DESC");
        }
    }

    builder.push(" LIMIT ").push_bind(limit);

    builder.build_query_as::<RankedRepository>().fetch_all(pool).await
}

async fn fetch_all_time_fallback(
    pool: &PgPool,
    query: &RankingQuery,
) -> Result<Vec<RankedRepository>, sqlx::Error> {
    let limit = valid_limit(query.limit);
    
    // We construct a mock "RankedRepository" directly from the "repositories" table,
    // filling the ranking fields with zeroes, but using `stars` as the `trend_score`
    // so they still sort correctly on the frontend.
    let mut builder = QueryBuilder::new(
        r#"
        SELECT
            r.id,
            r.github_id,
            r.owner,
            r.name,
            r.description,
            r.language,
            r.categories,
            r.stars,
            r.forks,
            30 as timeframe_days,
            0 as stars_gained,
            0.0 as star_velocity,
            0.0 as growth_ratio,
            0 as contributors_gained,
            0.0 as contributor_growth,
            0.0 as velocity_score,
            0.0 as growth_score,
            0.0 as contributor_score,
            0.0 as activity_score,
            0.0 as maintenance_score,
            (r.stars::FLOAT) as trend_score,
            0.0 as social_score,
            r.updated_at
        FROM repositories r
        WHERE r.stars >= 0
        "#
    );

    if let Some(language) = query.language.as_ref().filter(|value| !value.trim().is_empty()) {
        builder
            .push(" AND LOWER(COALESCE(r.language, '')) = LOWER(")
            .push_bind(language.clone())
            .push(")");
    }

    if let Some(category) = query.category.as_ref().filter(|value| !value.trim().is_empty()) {
        builder
            .push(" AND EXISTS (SELECT 1 FROM unnest(r.categories) category WHERE LOWER(category) = LOWER(")
            .push_bind(category.clone())
            .push("))");
    }

    if let Some(max_stars) = query.max_stars {
        builder.push(" AND r.stars <= ").push_bind(max_stars);
    }

    builder.push(" ORDER BY r.stars DESC LIMIT ").push_bind(limit);

    builder.build_query_as::<RankedRepository>().fetch_all(pool).await
}

fn base_ranked_query() -> QueryBuilder<'static, Postgres> {
    QueryBuilder::new(
        r#"
        SELECT
            r.id,
            r.github_id,
            r.owner,
            r.name,
            r.description,
            r.language,
            r.categories,
            r.stars,
            r.forks,
            rank.timeframe_days,
            rank.stars_gained,
            rank.star_velocity,
            rank.growth_ratio,
            rank.contributors_gained,
            rank.contributor_growth,
            rank.velocity_score,
            rank.growth_score,
            rank.contributor_score,
            rank.activity_score,
            rank.maintenance_score,
            rank.trend_score,
            rank.social_score,
            rank.updated_at
        FROM repositories r
        JOIN rankings rank ON rank.repo_id = r.id
        "#,
    )
}

fn valid_limit(limit: Option<i64>) -> i64 {
    limit.unwrap_or(25).clamp(1, 100)
}

fn valid_timeframe(timeframe_days: Option<i32>) -> i32 {
    match timeframe_days.unwrap_or(30) {
        7 | 30 | 90 => timeframe_days.unwrap_or(30),
        _ => 30,
    }
}

#[derive(Deserialize, Debug)]
pub struct ClerkWebhook {
    pub data: ClerkUserData,
    pub r#type: String,
}

#[derive(Deserialize, Debug)]
pub struct ClerkUserData {
    pub id: String,
    pub email_addresses: Vec<ClerkEmailAddress>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct ClerkEmailAddress {
    pub email_address: String,
}

pub async fn clerk_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<StatusCode, StatusCode> {
    let secret = std::env::var("CLERK_WEBHOOK_SECRET").unwrap_or_default();
    if secret.is_empty() {
        tracing::error!("CLERK_WEBHOOK_SECRET not set");
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    
    let webhook = svix::webhooks::Webhook::new(&secret).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let payload = String::from_utf8(body.to_vec()).map_err(|_| StatusCode::BAD_REQUEST)?;

    if let Err(e) = webhook.verify(&payload, &headers) {
        tracing::error!("Webhook verification failed: {:?}", e);
        return Err(StatusCode::BAD_REQUEST);
    }

    let clerk_event: ClerkWebhook = match serde_json::from_str(&payload) {
        Ok(evt) => evt,
        Err(e) => {
            tracing::error!("Failed to parse webhook JSON: {:?}", e);
            return Err(StatusCode::BAD_REQUEST);
        }
    };

    if clerk_event.r#type == "user.created" {
        let email = clerk_event.data.email_addresses.first().map(|e| e.email_address.clone()).unwrap_or_default();
        
        let _ = sqlx::query!(
            r#"
            INSERT INTO users (clerk_id, email, first_name, last_name)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (clerk_id) DO NOTHING
            "#,
            clerk_event.data.id,
            email,
            clerk_event.data.first_name,
            clerk_event.data.last_name
        )
        .execute(&state.pool)
        .await;
    }

    Ok(StatusCode::OK)
}
