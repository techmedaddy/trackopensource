use crate::{
    error::AppResult,
    models::{Facets, RankedRepository, Ranking, Repository, RepositoryDetail, Snapshot},
};
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::{PgPool, Postgres, QueryBuilder};
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
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

async fn list_ranked_repositories(
    pool: &PgPool,
    query: RankingQuery,
    sort_mode: SortMode,
) -> Result<Vec<RankedRepository>, sqlx::Error> {
    let timeframe_days = valid_timeframe(query.timeframe_days);
    let limit = valid_limit(query.limit);

    let mut builder = base_ranked_query();
    builder
        .push(" WHERE rank.timeframe_days = ")
        .push_bind(timeframe_days);

    if let Some(language) = query.language.filter(|value| !value.trim().is_empty()) {
        builder
            .push(" AND LOWER(COALESCE(r.language, '')) = LOWER(")
            .push_bind(language)
            .push(")");
    }

    if let Some(category) = query.category.filter(|value| !value.trim().is_empty()) {
        builder
            .push(" AND EXISTS (SELECT 1 FROM unnest(r.categories) category WHERE LOWER(category) = LOWER(")
            .push_bind(category)
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
