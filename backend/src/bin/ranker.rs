use backend::ranking;
use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    dotenvy::dotenv().ok();

    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&db_url)
        .await?;

    let summary = ranking::refresh_default_rankings(&pool).await?;

    tracing::info!(
        "Ranking engine complete: scored {} repositories across {:?} day windows",
        summary.repositories_scored,
        summary.timeframe_days
    );

    Ok(())
}
