use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
struct AppState {
    db: PgPool,
}

// Matches the `RankedRepository` type in the Next.js frontend
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RankedRepository {
    id: uuid::Uuid,
    github_id: i64,
    owner: String,
    name: String,
    description: Option<String>,
    language: Option<String>,
    categories: Vec<String>,
    stars: i32,
    forks: i32,
    
    // Dynamic fields (stubbed for now until Ranking Engine is finished)
    timeframe_days: i32,
    stars_gained: i32,
    star_velocity: f64,
    growth_ratio: f64,
    contributors_gained: i32,
    contributor_growth: f64,
    
    // Scores
    velocity_score: f64,
    growth_score: f64,
    contributor_score: f64,
    activity_score: f64,
    maintenance_score: f64,
    trend_score: f64,
    updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
struct SearchParams {
    q: String,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    dotenvy::dotenv().ok();
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("Failed to connect to Postgres");

    tracing::info!("Running database migrations...");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    let state = AppState { db: pool };

    // Enable CORS so the Next.js frontend on localhost:3000 can fetch from localhost:8080
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(health_check))
        .route("/api/trending", get(get_trending))
        .route("/api/search", get(search_repos))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("Server listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "Open Source Radar API is running!"
}

async fn get_trending(State(state): State<AppState>) -> Json<Vec<RankedRepository>> {
    let repos = sqlx::query_as!(
        RankedRepository,
        r#"
        SELECT 
            r.id, r.github_id, r.owner, r.name, r.description, r.language, COALESCE(r.categories, '{}') as "categories!", r.stars, r.forks,
            30 as "timeframe_days!",
            0 as "stars_gained!",
            0.0::float8 as "star_velocity!",
            0.0::float8 as "growth_ratio!",
            0 as "contributors_gained!",
            0.0::float8 as "contributor_growth!",
            COALESCE(rk.velocity_score, 0.0::float8) as "velocity_score!",
            0.0::float8 as "growth_score!",
            0.0::float8 as "contributor_score!",
            COALESCE(rk.activity_score, 0.0::float8) as "activity_score!",
            0.0::float8 as "maintenance_score!",
            COALESCE(rk.trend_score, 0.0::float8) as "trend_score!",
            COALESCE(rk.updated_at, r.updated_at) as "updated_at!"
        FROM repositories r
        LEFT JOIN rankings rk ON r.id = rk.repo_id
        ORDER BY rk.trend_score DESC NULLS LAST, r.stars DESC
        LIMIT 20
        "#
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    Json(repos)
}

async fn search_repos(
    State(state): State<AppState>,
    Query(params): Query<SearchParams>,
) -> Json<Vec<RankedRepository>> {
    let search_term = format!("%{}%", params.q);
    
    let repos = sqlx::query_as!(
        RankedRepository,
        r#"
        SELECT 
            r.id, r.github_id, r.owner, r.name, r.description, r.language, COALESCE(r.categories, '{}') as "categories!", r.stars, r.forks,
            30 as "timeframe_days!",
            0 as "stars_gained!",
            0.0::float8 as "star_velocity!",
            0.0::float8 as "growth_ratio!",
            0 as "contributors_gained!",
            0.0::float8 as "contributor_growth!",
            COALESCE(rk.velocity_score, 0.0::float8) as "velocity_score!",
            0.0::float8 as "growth_score!",
            0.0::float8 as "contributor_score!",
            COALESCE(rk.activity_score, 0.0::float8) as "activity_score!",
            0.0::float8 as "maintenance_score!",
            COALESCE(rk.trend_score, 0.0::float8) as "trend_score!",
            COALESCE(rk.updated_at, r.updated_at) as "updated_at!"
        FROM repositories r
        LEFT JOIN rankings rk ON r.id = rk.repo_id
        WHERE r.name ILIKE $1 OR r.description ILIKE $1 OR r.owner ILIKE $1
        ORDER BY rk.trend_score DESC NULLS LAST, r.stars DESC
        LIMIT 20
        "#,
        search_term
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    Json(repos)
}
