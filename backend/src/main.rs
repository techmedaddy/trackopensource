use axum::{
    routing::{get, post, delete},
    middleware,
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use axum::http::{HeaderValue, Method, header};

use std::sync::{Arc, Mutex};
use backend::routes::{self, AppState};

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

    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://redis:6379/0".to_string());
    let redis_cfg = deadpool_redis::Config::from_url(redis_url);
    let redis_pool = redis_cfg.create_pool(Some(deadpool_redis::Runtime::Tokio1)).unwrap();

    let state = AppState { 
        pool,
        redis_pool,
        manual_triggers: Arc::new(Mutex::new(Vec::new())),
    };

    let frontend_url = std::env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());
    let allow_origin = frontend_url.parse::<HeaderValue>().unwrap();

    let cors = CorsLayer::new()
        .allow_origin(allow_origin)
        .allow_credentials(true)
        .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    let protected_routes = Router::new()
        .route("/api/track", post(routes::track_repository))
        .route("/api/trigger", post(routes::trigger_scan))
        .route("/api/watchlists", get(routes::get_watchlist))
        .route("/api/watchlists/:id", post(routes::add_to_watchlist).delete(routes::remove_from_watchlist))
        .route("/api/keys", get(routes::list_api_keys).post(routes::create_api_key))
        .route("/api/keys/:id", delete(routes::revoke_api_key))
        .route_layer(middleware::from_fn(backend::auth::require_auth));

    let v1_routes = Router::new()
        .route("/api/v1/trending", get(routes::trending))
        .route("/api/v1/fastest-growing", get(routes::fastest_growing))
        .route("/api/v1/repos/:id", get(routes::repo_detail))
        .route_layer(middleware::from_fn_with_state(state.clone(), backend::api_auth::require_api_key));

    let app = Router::new()
        .route("/", get(routes::health_check))
        .route("/api/trending", get(routes::trending))
        .route("/api/fastest-growing", get(routes::fastest_growing))
        .route("/api/search", get(routes::search))
        .route("/api/repos/:id", get(routes::repo_detail))
        .route("/api/facets", get(routes::facets))
        .route("/api/webhooks/clerk", post(routes::clerk_webhook))
        .merge(protected_routes)
        .merge(v1_routes)
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("Server listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
// Trigger rebuild to embed the new sqlx migration file
