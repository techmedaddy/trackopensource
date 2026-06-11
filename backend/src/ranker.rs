use crate::ranking;
use sqlx::PgPool;

pub async fn run(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    let summary = ranking::refresh_default_rankings(pool).await?;

    tracing::info!(
        "Ranking engine complete: scored {} repositories across {:?} day windows",
        summary.repositories_scored,
        summary.timeframe_days
    );

    Ok(())
}
