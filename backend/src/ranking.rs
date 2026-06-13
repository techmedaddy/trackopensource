use crate::models::Snapshot;
use chrono::Duration;
use serde::Serialize;
use sqlx::PgPool;
use uuid::Uuid;
use std::collections::HashMap;
use futures::StreamExt;

#[derive(Debug, Default)]
struct SocialMetrics {
    total_score: i64,
    total_comments: i64,
    total_mentions: i64,
}

const DEFAULT_WINDOWS: [i32; 3] = [7, 30, 90];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RankingRunSummary {
    pub timeframe_days: Vec<i32>,
    pub repositories_scored: usize,
}

#[derive(Debug, Clone)]
struct RawRanking {
    repo_id: Uuid,
    timeframe_days: i32,
    stars_gained: i32,
    star_velocity: f64,
    growth_ratio: f64,
    contributors_gained: i32,
    contributor_growth: f64,
    activity_raw: f64,
    maintenance_score: f64,
    social_raw: f64,
    hiring_raw: f64,
    current_stars: i32,
    current_forks: i32,
}

#[derive(Debug, Clone)]
struct ScoredRanking {
    raw: RawRanking,
    velocity_score: f64,
    growth_score: f64,
    contributor_score: f64,
    activity_score: f64,
    trend_score: f64,
    social_score: f64,
    hiring_score: f64,
}

pub async fn refresh_default_rankings(pool: &PgPool) -> Result<RankingRunSummary, sqlx::Error> {
    let mut repositories_scored = 0;

    for timeframe_days in DEFAULT_WINDOWS {
        repositories_scored = refresh_rankings(pool, timeframe_days).await?;
    }

    Ok(RankingRunSummary {
        timeframe_days: DEFAULT_WINDOWS.to_vec(),
        repositories_scored,
    })
}

pub async fn refresh_rankings(pool: &PgPool, timeframe_days: i32) -> Result<usize, sqlx::Error> {
    let mut snapshots_stream = sqlx::query_as::<_, Snapshot>(
        r#"
        SELECT id, repo_id, stars, forks, watchers, open_issues, contributors, captured_at
        FROM snapshots
        ORDER BY repo_id, captured_at
        "#,
    )
    .fetch(pool);

    let social_data = sqlx::query!(
        r#"
        SELECT repo_id as "repo_id!", SUM(score) as total_score, SUM(comments_count) as total_comments, COUNT(id) as total_mentions
        FROM social_mentions
        GROUP BY repo_id
        "#
    )
    .fetch_all(pool)
    .await?;

    let mut social_map: HashMap<Uuid, SocialMetrics> = HashMap::new();
    for row in social_data {
        social_map.insert(row.repo_id, SocialMetrics {
            total_score: row.total_score.unwrap_or(0),
            total_comments: row.total_comments.unwrap_or(0),
            total_mentions: row.total_mentions.unwrap_or(0),
        });
    }

    let job_data = sqlx::query!(
        r#"
        SELECT repo_id as "repo_id!", COUNT(id) as "total_jobs!"
        FROM job_mentions
        WHERE posted_at >= (NOW() - make_interval(days := $1))
        GROUP BY repo_id
        "#,
        timeframe_days
    )
    .fetch_all(pool)
    .await?;

    let mut job_map: HashMap<Uuid, i64> = HashMap::new();
    for row in job_data {
        job_map.insert(row.repo_id, row.total_jobs);
    }

    let mut current_repo_id: Option<Uuid> = None;
    let mut current_snapshots: Vec<Snapshot> = Vec::new();
    let mut raw_rankings: Vec<RawRanking> = Vec::new();

    while let Some(result) = snapshots_stream.next().await {
        let snapshot = result?;
        
        if Some(snapshot.repo_id) != current_repo_id {
            // Process the previous repository
            if let Some(repo_id) = current_repo_id {
                if let Some(ranking) = build_raw_ranking(&current_snapshots, timeframe_days, social_map.get(&repo_id), job_map.get(&repo_id)) {
                    raw_rankings.push(ranking);
                }
            }
            current_repo_id = Some(snapshot.repo_id);
            current_snapshots.clear();
        }
        current_snapshots.push(snapshot);
    }
    
    // Process the last repository in the stream
    if let Some(repo_id) = current_repo_id {
        if let Some(ranking) = build_raw_ranking(&current_snapshots, timeframe_days, social_map.get(&repo_id), job_map.get(&repo_id)) {
            raw_rankings.push(ranking);
        }
    }

    let scored_rankings = score_rankings(raw_rankings);
    let scored_count = scored_rankings.len();

    let client = reqwest::Client::new();

    for ranking in scored_rankings {
        let repo_id = ranking.raw.repo_id;
        let timeframe_days = ranking.raw.timeframe_days;
        let hiring_score = ranking.hiring_score;
        let social_score = ranking.social_score;
        let trend_score = ranking.trend_score;
        let hype_score = (ranking.velocity_score * 0.5) + (social_score * 0.5);

        upsert_ranking(pool, ranking).await?;

        if timeframe_days == 30 {
            crate::alerts::check_and_dispatch_alerts(
                pool,
                &client,
                repo_id,
                hiring_score,
                social_score,
                trend_score,
                hype_score,
            ).await;
        }
    }

    Ok(scored_count)
}

fn build_raw_ranking(snapshots: &[Snapshot], timeframe_days: i32, social: Option<&SocialMetrics>, jobs: Option<&i64>) -> Option<RawRanking> {
    let latest = snapshots.last()?;
    let target = latest.captured_at - Duration::days(timeframe_days as i64);
    let baseline = snapshots
        .iter()
        .rev()
        .find(|snapshot| snapshot.captured_at <= target)
        .unwrap_or(&snapshots[0]);

    let elapsed_seconds = (latest.captured_at - baseline.captured_at)
        .num_seconds()
        .max(86_400);
    let elapsed_days = elapsed_seconds as f64 / 86_400.0;

    let stars_gained = latest.stars - baseline.stars;
    let forks_gained = latest.forks - baseline.forks;
    let watchers_gained = latest.watchers - baseline.watchers;
    let contributors_gained = latest.contributors - baseline.contributors;

    let star_velocity = stars_gained as f64 / elapsed_days;
    let growth_ratio = stars_gained as f64 / baseline.stars.max(1) as f64;
    let contributor_growth = contributors_gained as f64 / baseline.contributors.max(1) as f64;
    let activity_raw = (forks_gained.max(0) + watchers_gained.max(0)) as f64 / elapsed_days;

    let social_raw = match social {
        Some(m) => (m.total_mentions as f64 * 5.0) + (m.total_score as f64 * 0.1) + (m.total_comments as f64 * 0.5),
        None => 0.0,
    };

    let hiring_raw = *jobs.unwrap_or(&0) as f64;

    Some(RawRanking {
        repo_id: latest.repo_id,
        timeframe_days,
        stars_gained,
        star_velocity,
        growth_ratio,
        contributors_gained,
        contributor_growth,
        activity_raw,
        maintenance_score: maintenance_score(latest),
        social_raw,
        hiring_raw,
        current_stars: latest.stars,
        current_forks: latest.forks,
    })
}

fn score_rankings(raw_rankings: Vec<RawRanking>) -> Vec<ScoredRanking> {
    let max_velocity = max_by(&raw_rankings, |ranking| ranking.star_velocity);
    let max_growth = max_by(&raw_rankings, |ranking| ranking.growth_ratio);
    let max_contributor = max_by(&raw_rankings, |ranking| ranking.contributor_growth);
    let max_activity = max_by(&raw_rankings, |ranking| ranking.activity_raw);

    let max_social = max_by(&raw_rankings, |ranking| ranking.social_raw);
    let max_hiring = max_by(&raw_rankings, |ranking| ranking.hiring_raw);

    raw_rankings
        .into_iter()
        .map(|raw| {
            // Using log10 normalization because these metrics (social, hiring, stars) follow a power-law distribution.
            let velocity_score = normalize_log10(raw.star_velocity, max_velocity);
            let growth_score = normalize_log10(raw.growth_ratio, max_growth);
            let contributor_score = normalize_log10(raw.contributor_growth, max_contributor);
            let activity_score = normalize_log10(raw.activity_raw, max_activity);
            let social_score = normalize_log10(raw.social_raw, max_social);
            let hiring_score = normalize_log10(raw.hiring_raw, max_hiring);
            
            let trend_score = (velocity_score * 0.30)
                + (growth_score * 0.15)
                + (contributor_score * 0.15)
                + (hiring_score * 0.20)
                + (social_score * 0.15)
                + (activity_score * 0.05);

            ScoredRanking {
                raw,
                velocity_score,
                growth_score,
                contributor_score,
                activity_score,
                trend_score,
                social_score,
                hiring_score,
            }
        })
        .collect()
}

async fn upsert_ranking(pool: &PgPool, ranking: ScoredRanking) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO rankings (
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
            hiring_score,
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
        ON CONFLICT (repo_id, timeframe_days)
        DO UPDATE SET
            stars_gained = EXCLUDED.stars_gained,
            star_velocity = EXCLUDED.star_velocity,
            growth_ratio = EXCLUDED.growth_ratio,
            contributors_gained = EXCLUDED.contributors_gained,
            contributor_growth = EXCLUDED.contributor_growth,
            velocity_score = EXCLUDED.velocity_score,
            growth_score = EXCLUDED.growth_score,
            contributor_score = EXCLUDED.contributor_score,
            activity_score = EXCLUDED.activity_score,
            maintenance_score = EXCLUDED.maintenance_score,
            trend_score = EXCLUDED.trend_score,
            social_score = EXCLUDED.social_score,
            hiring_score = EXCLUDED.hiring_score,
            updated_at = CURRENT_TIMESTAMP
        "#,
    )
    .bind(ranking.raw.repo_id)
    .bind(ranking.raw.timeframe_days)
    .bind(ranking.raw.stars_gained)
    .bind(ranking.raw.star_velocity)
    .bind(ranking.raw.growth_ratio)
    .bind(ranking.raw.contributors_gained)
    .bind(ranking.raw.contributor_growth)
    .bind(ranking.velocity_score)
    .bind(ranking.growth_score)
    .bind(ranking.contributor_score)
    .bind(ranking.activity_score)
    .bind(ranking.raw.maintenance_score)
    .bind(ranking.trend_score)
    .bind(ranking.social_score)
    .bind(ranking.hiring_score)
    .execute(pool)
    .await?;

    if ranking.raw.timeframe_days == 30 {
        sqlx::query(
            r#"
            INSERT INTO repository_snapshots (
                repo_id, stars, forks, social_score, hiring_score, trend_score, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
            ON CONFLICT (repo_id, created_at)
            DO UPDATE SET
                stars = EXCLUDED.stars,
                forks = EXCLUDED.forks,
                social_score = EXCLUDED.social_score,
                hiring_score = EXCLUDED.hiring_score,
                trend_score = EXCLUDED.trend_score
            "#,
        )
        .bind(ranking.raw.repo_id)
        .bind(ranking.raw.current_stars)
        .bind(ranking.raw.current_forks)
        .bind(ranking.social_score)
        .bind(ranking.hiring_score)
        .bind(ranking.trend_score)
        .execute(pool)
        .await?;
    }

    Ok(())
}

fn maintenance_score(snapshot: &Snapshot) -> f64 {
    let repo_size = (snapshot.stars.max(1) as f64).sqrt();
    let issue_pressure = snapshot.open_issues.max(0) as f64 / repo_size;

    (100.0 / (1.0 + issue_pressure / 10.0)).clamp(0.0, 100.0)
}

fn max_by<F>(rankings: &[RawRanking], mut get_value: F) -> f64
where
    F: FnMut(&RawRanking) -> f64,
{
    rankings
        .iter()
        .map(|ranking| get_value(ranking).max(0.0))
        .fold(0.0, f64::max)
}

/// Kept for reference and validation; linear normalization compresses power-law data.
#[allow(dead_code)]
fn normalize_linear(value: f64, max_value: f64) -> f64 {
    if max_value <= 0.0 {
        0.0
    } else {
        ((value.max(0.0) / max_value) * 100.0).clamp(0.0, 100.0)
    }
}

/// Normalizes power-law data (like social mentions and star velocity) using a log10 scale.
///
/// WHY LOG10 WAS CHOSEN: 
/// Social and hiring metrics in open source follow a strict Zipfian/Power-Law distribution.
/// A massive outlier (e.g. React with 5,000 mentions) will crush 95% of other repositories
/// down to <5.0 on a linear scale, causing severe data compression (the y=0 visual clustering).
/// Log10 organically distributes this long tail across the 0-100 range, ensuring
/// that highly-adopted tools aren't mathematically hidden by absolute mega-frameworks.
fn normalize_log10(value: f64, max_value: f64) -> f64 {
    if max_value <= 0.0 || value <= 0.0 {
        return 0.0;
    }
    // We add 1.0 to handle 0 values cleanly without mathematical panics
    (((value + 1.0).log10() / (max_value + 1.0).log10()) * 100.0).clamp(0.0, 100.0)
}

#[cfg(test)]
mod tests {
    use super::{normalize_linear, normalize_log10};

    #[test]
    fn normalize_clamps_negative_values() {
        assert_eq!(normalize_linear(-5.0, 10.0), 0.0);
        assert_eq!(normalize_log10(-5.0, 10.0), 0.0);
    }

    #[test]
    fn normalize_handles_empty_denominator() {
        assert_eq!(normalize_linear(5.0, 0.0), 0.0);
        assert_eq!(normalize_log10(5.0, 0.0), 0.0);
    }
}
