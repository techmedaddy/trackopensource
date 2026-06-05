use axum::{
    routing::{get, post},
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

    let state = AppState { 
        pool,
        manual_triggers: Arc::new(Mutex::new(Vec::new())),
    };

    // Restrict CORS to known origins only
    let allowed_origin = std::env::var("CORS_ORIGIN")
        .unwrap_or_else(|_| "https://trackopensource.duckdns.org".to_string());
    let cors = CorsLayer::new()
        .allow_origin(allowed_origin.parse::<HeaderValue>().unwrap())
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION]);

    let protected_routes = Router::new()
        .route("/api/track", post(routes::track_repository))
        .route("/api/trigger", post(routes::trigger_scan))
        .route_layer(middleware::from_fn(backend::auth::require_auth));

    let app = Router::new()
        .route("/", get(routes::health_check))
        .route("/api/trending", get(routes::trending))
        .route("/api/fastest-growing", get(routes::fastest_growing))
        .route("/api/search", get(routes::search))
        .route("/api/repos/:id", get(routes::repo_detail))
        .route("/api/facets", get(routes::facets))
        .route("/api/webhooks/clerk", post(routes::clerk_webhook))
        .merge(protected_routes)
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("Server listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
// small change to trigger a new deployment