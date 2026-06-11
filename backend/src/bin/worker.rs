use sqlx::postgres::PgPoolOptions;
use std::env;
use std::time::Duration;
use uuid::Uuid;

#[derive(Debug)]
struct ScanJob {
    id: Uuid,
    job_type: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    dotenvy::dotenv().ok();

    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    tracing::info!("Starting background job worker...");

    loop {
        // Atomically claim the next available job
        let job = sqlx::query_as!(
            ScanJob,
            r#"
            UPDATE scan_jobs
            SET status = 'running', started_at = now()
            WHERE id = (
                SELECT id FROM scan_jobs
                WHERE status = 'queued'
                ORDER BY created_at ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            )
            RETURNING id, job_type
            "#
        )
        .fetch_optional(&pool)
        .await?;

        if let Some(job) = job {
            tracing::info!("Claimed job {} (type: {})", job.id, job.job_type);

            let result = match job.job_type.as_str() {
                "collect" => backend::collector::run(&pool).await,
                "rank" => backend::ranker::run(&pool).await,
                "full" => {
                    let mut res = backend::collector::run(&pool).await;
                    if res.is_ok() {
                        res = backend::ranker::run(&pool).await;
                    }
                    res
                }
                _ => Err(format!("Unknown job_type: {}", job.job_type).into()),
            };

            match result {
                Ok(_) => {
                    sqlx::query!(
                        "UPDATE scan_jobs SET status = 'done', finished_at = now() WHERE id = $1",
                        job.id
                    )
                    .execute(&pool)
                    .await?;
                    tracing::info!("Job {} completed successfully.", job.id);
                }
                Err(e) => {
                    let error_msg = e.to_string();
                    sqlx::query!(
                        "UPDATE scan_jobs SET status = 'failed', finished_at = now(), error = $1 WHERE id = $2",
                        error_msg,
                        job.id
                    )
                    .execute(&pool)
                    .await?;
                    tracing::error!("Job {} failed: {}", job.id, error_msg);
                }
            }
        } else {
            // Queue is empty, sleep to prevent CPU spinning
            tokio::time::sleep(Duration::from_secs(5)).await;
        }
    }
}
