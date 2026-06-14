use sqlx::postgres::PgPoolOptions;
use backend::{collector, jobs, alias_engine, ranker};
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    dotenvy::dotenv().ok();
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    tracing::info!("Connecting to database...");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await
        .expect("Failed to connect to Postgres");

    tracing::info!("1. Running collector (GitHub, HN, Reddit)...");
    if let Err(e) = collector::run(&pool).await {
        tracing::error!("Collector failed: {}", e);
    }

    tracing::info!("2. Running job ingestion...");
    let tracked: Vec<(Uuid, String)> = sqlx::query_as::<_, (Uuid, String)>("SELECT id, name FROM repositories").fetch_all(&pool).await?;
    let client = reqwest::Client::new();
    if let Err(e) = jobs::scrape_hn_hiring_threads(&client, &pool, &tracked).await {
        tracing::error!("Job scrape failed: {}", e);
    }

    tracing::info!("3. Running alias generation & mapping...");
    if let Err(e) = alias_engine::run_alias_generation(&pool).await {
        tracing::error!("Alias generation failed: {}", e);
    }
    if let Err(e) = alias_engine::rebuild_hiring_data(&pool).await {
        tracing::error!("Hiring data rebuild failed: {}", e);
    }

    tracing::info!("4. Running ranker...");
    if let Err(e) = ranker::run(&pool).await {
        tracing::error!("Ranker failed: {}", e);
    }

    tracing::info!("--- PIPELINE REBUILD COMPLETE ---");
    
    // Output the distribution
    let scores = sqlx::query("SELECT (velocity_score * 0.5 + social_score * 0.5)::FLOAT as hype_score FROM rankings WHERE (social_score > 0 OR velocity_score > 0) AND timeframe_days = 30").fetch_all(&pool).await?;
    let mut buckets = vec![0; 10];
    let mut total_with_score = 0;
    
    for r in scores {
        use sqlx::Row;
        let val: f64 = r.try_get("hype_score").unwrap_or(0.0);
        let score = val as i32;
        let bucket = (score / 10).clamp(0, 9) as usize;
        buckets[bucket] += 1;
        total_with_score += 1;
    }
    
    tracing::info!("Repositories with Hype Score > 0: {}", total_with_score);
    tracing::info!("Histogram:");
    for (i, count) in buckets.iter().enumerate() {
        let range = format!("{}-{}", i * 10, (i + 1) * 10 - 1);
        tracing::info!("{:>6}: {}", range, count);
    }

    Ok(())
}
