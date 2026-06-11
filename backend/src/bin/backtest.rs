use backend::models::{RankingWeights, Snapshot};
use chrono::{Duration, NaiveDate, Utc};
use sqlx::postgres::PgPoolOptions;
use std::collections::HashMap;
use std::env;
use uuid::Uuid;

/// A predicted ranking entry for a single repository at a point in time.
#[derive(Debug, Clone)]
struct PredictedRank {
    repo_id: Uuid,
    owner: String,
    name: String,
    trend_score: f64,
}

/// Actual growth observed between two dates.
#[derive(Debug, Clone)]
struct ActualGrowth {
    repo_id: Uuid,
    owner: String,
    name: String,
    stars_gained: i32,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    dotenvy::dotenv().ok();

    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(3)
        .connect(&db_url)
        .await?;

    let default_weights = RankingWeights {
        velocity_weight: 0.5,
        growth_weight: 0.2,
        contributor_weight: 0.1,
        hiring_weight: 0.1,
        social_weight: 0.1,
    };

    println!();
    println!("╔═══════════════════════════════════════════════════════════════════╗");
    println!("║        Open Source Career Radar — Backtesting Engine             ║");
    println!("║        Point-in-Time Algorithmic Validation Harness              ║");
    println!("╚═══════════════════════════════════════════════════════════════════╝");
    println!();

    // ─── Configuration ───────────────────────────────────────────
    let evaluation_window_days = 30;  // Look-ahead window
    let k = 10;                       // Precision@K target

    // Pick a target date: 60 days ago
    let now = Utc::now().date_naive();
    let target_date = now - Duration::days(60);
    let forward_date = target_date + Duration::days(evaluation_window_days);

    println!("  Simulation Date (T):       {}", target_date);
    println!("  Forward Eval Date (T+30):  {}", forward_date);
    println!("  Today:                     {}", now);
    println!("  Precision Target:          @{}", k);
    println!();

    // ─── Step 1: Simulate rankings as-of target_date ─────────────
    println!("▶ Step 1: Building Point-in-Time rankings as of {} ...", target_date);
    let predicted = simulate_rankings(&pool, target_date, evaluation_window_days, &default_weights).await?;

    if predicted.is_empty() {
        println!();
        println!("  ⚠ No snapshot data available before {}.", target_date);
        println!("    The backtesting engine requires at least 60 days of historical");
        println!("    snapshot data to produce meaningful results.");
        println!("    Run the collector daily and re-run this harness once data accumulates.");
        println!();
        return Ok(());
    }

    println!("  ✓ Predicted {} repositories. Top {} shown below:", predicted.len(), k);
    println!();
    println!("  ┌────┬──────────────────────────────────────┬────────────┐");
    println!("  │ ## │ Repository                           │ Trend Score│");
    println!("  ├────┼──────────────────────────────────────┼────────────┤");
    for (i, p) in predicted.iter().take(k).enumerate() {
        let name = format!("{}/{}", p.owner, p.name);
        println!("  │ {:>2} │ {:<36} │ {:>10.2} │", i + 1, truncate(&name, 36), p.trend_score);
    }
    println!("  └────┴──────────────────────────────────────┴────────────┘");
    println!();

    // ─── Step 2: Get actual growth between target_date and forward_date ──
    println!("▶ Step 2: Querying actual star growth between {} and {} ...", target_date, forward_date);
    let actual = get_actual_growth_rankings(&pool, target_date, forward_date).await?;

    if actual.is_empty() {
        println!();
        println!("  ⚠ No forward snapshot data available between {} and {}.", target_date, forward_date);
        println!("    Cannot compute ground truth. Need more historical data.");
        println!();
        return Ok(());
    }

    println!("  ✓ Measured actual growth for {} repositories. Top {} shown below:", actual.len(), k);
    println!();
    println!("  ┌────┬──────────────────────────────────────┬────────────┐");
    println!("  │ ## │ Repository                           │ Stars +/-  │");
    println!("  ├────┼──────────────────────────────────────┼────────────┤");
    for (i, a) in actual.iter().take(k).enumerate() {
        let name = format!("{}/{}", a.owner, a.name);
        println!("  │ {:>2} │ {:<36} │ {:>+10} │", i + 1, truncate(&name, 36), a.stars_gained);
    }
    println!("  └────┴──────────────────────────────────────┴────────────┘");
    println!();

    // ─── Step 3: Compute Precision@K ─────────────────────────────
    println!("▶ Step 3: Computing Precision@{} ...", k);
    let predicted_top_k: Vec<Uuid> = predicted.iter().take(k).map(|p| p.repo_id).collect();
    let actual_top_k: Vec<Uuid> = actual.iter().take(k).map(|a| a.repo_id).collect();

    let hits: Vec<Uuid> = predicted_top_k
        .iter()
        .filter(|id| actual_top_k.contains(id))
        .copied()
        .collect();

    let precision = if predicted_top_k.is_empty() {
        0.0
    } else {
        hits.len() as f64 / k as f64
    };

    // ─── Step 4: Compute Spearman Rank Correlation ───────────────
    println!("▶ Step 4: Computing Spearman Rank Correlation ...");

    // Build a shared set of repos that appear in both lists
    let predicted_ids: Vec<Uuid> = predicted.iter().map(|p| p.repo_id).collect();
    let actual_ids: Vec<Uuid> = actual.iter().map(|a| a.repo_id).collect();

    let common_ids: Vec<Uuid> = predicted_ids
        .iter()
        .filter(|id| actual_ids.contains(id))
        .copied()
        .collect();

    let spearman = if common_ids.len() < 3 {
        None // Not enough overlap for meaningful correlation
    } else {
        // Build rank maps (1-indexed)
        let predicted_rank_map: HashMap<Uuid, usize> = predicted
            .iter()
            .enumerate()
            .map(|(i, p)| (p.repo_id, i + 1))
            .collect();

        let actual_rank_map: HashMap<Uuid, usize> = actual
            .iter()
            .enumerate()
            .map(|(i, a)| (a.repo_id, i + 1))
            .collect();

        let n = common_ids.len() as f64;
        let d_squared_sum: f64 = common_ids
            .iter()
            .map(|id| {
                let r_pred = *predicted_rank_map.get(id).unwrap_or(&0) as f64;
                let r_actual = *actual_rank_map.get(id).unwrap_or(&0) as f64;
                (r_pred - r_actual).powi(2)
            })
            .sum();

        // Spearman formula: rs = 1 - (6 * Σd² / (n * (n² - 1)))
        let rs = 1.0 - (6.0 * d_squared_sum / (n * (n.powi(2) - 1.0)));
        Some(rs)
    };

    // ─── Results Dashboard ───────────────────────────────────────
    println!();
    println!("╔═══════════════════════════════════════════════════════════════════╗");
    println!("║                    BACKTEST RESULTS DASHBOARD                    ║");
    println!("╠═══════════════════════════════════════════════════════════════════╣");
    println!("║                                                                 ║");
    println!("║  Default Weights:                                               ║");
    println!("║    velocity: {:.2}  growth: {:.2}  contributor: {:.2}             ║",
        default_weights.velocity_weight, default_weights.growth_weight, default_weights.contributor_weight);
    println!("║    hiring:   {:.2}  social: {:.2}                                ║",
        default_weights.hiring_weight, default_weights.social_weight);
    println!("║                                                                 ║");
    println!("║  Evaluation Window:  {} → {} ({} days)           ║",
        target_date, forward_date, evaluation_window_days);
    println!("║                                                                 ║");
    println!("║  ┌─────────────────────────────────────────────────────────┐     ║");
    println!("║  │  Precision@{:<2}:          {}/{} = {:.1}%{:>20}│     ║",
        k, hits.len(), k, precision * 100.0, "");
    println!("║  │  Spearman Rank (rₛ):   {:<37}│     ║",
        match spearman {
            Some(rs) => format!("{:+.4} (over {} shared repos)", rs, common_ids.len()),
            None => "Insufficient overlap (<3 shared repos)".to_string(),
        });
    println!("║  │  Common Repos:         {:<37}│     ║", common_ids.len());
    println!("║  └─────────────────────────────────────────────────────────┘     ║");
    println!("║                                                                 ║");

    // Interpretation
    println!("║  Interpretation:                                                ║");
    if precision >= 0.5 {
        println!("║    ✅ STRONG — Your algorithm correctly identified ≥50%         ║");
        println!("║       of the actual top breakout repositories.                  ║");
    } else if precision >= 0.2 {
        println!("║    🟡 MODERATE — Partial predictive power detected.             ║");
        println!("║       Consider tuning weights or expanding social signals.      ║");
    } else {
        println!("║    🔴 WEAK — Low overlap between predictions and reality.       ║");
        println!("║       This may indicate insufficient data or suboptimal weights.║");
    }

    if let Some(rs) = spearman {
        if rs > 0.6 {
            println!("║    📈 Rank correlation is STRONG (rₛ > 0.6).                   ║");
        } else if rs > 0.3 {
            println!("║    📊 Rank correlation is MODERATE (0.3 < rₛ < 0.6).           ║");
        } else {
            println!("║    📉 Rank correlation is WEAK (rₛ < 0.3).                     ║");
        }
    }

    println!("║                                                                 ║");

    if !hits.is_empty() {
        println!("║  Correctly Predicted Breakouts:                                 ║");
        for id in &hits {
            let name = predicted
                .iter()
                .find(|p| p.repo_id == *id)
                .map(|p| format!("{}/{}", p.owner, p.name))
                .unwrap_or_else(|| id.to_string());
            println!("║    ✓ {:<57}  ║", truncate(&name, 57));
        }
    }
    println!("║                                                                 ║");
    println!("╚═══════════════════════════════════════════════════════════════════╝");
    println!();

    Ok(())
}

/// Simulate rankings using ONLY snapshot data captured on or before `as_of_date`.
/// This is the critical Point-in-Time constraint that prevents data leakage.
async fn simulate_rankings(
    pool: &sqlx::PgPool,
    as_of_date: NaiveDate,
    timeframe_days: i64,
    weights: &RankingWeights,
) -> Result<Vec<PredictedRank>, Box<dyn std::error::Error>> {
    // Fetch all snapshots strictly before the evaluation date
    let snapshots = sqlx::query_as::<_, Snapshot>(
        r#"
        SELECT id, repo_id, stars, forks, watchers, open_issues, contributors, captured_at
        FROM snapshots
        WHERE (captured_at AT TIME ZONE 'UTC')::DATE <= $1
        ORDER BY repo_id, captured_at
        "#,
    )
    .bind(as_of_date)
    .fetch_all(pool)
    .await?;

    if snapshots.is_empty() {
        return Ok(vec![]);
    }

    // Group snapshots by repo_id
    let mut repo_snapshots: HashMap<Uuid, Vec<&Snapshot>> = HashMap::new();
    for snap in &snapshots {
        repo_snapshots.entry(snap.repo_id).or_default().push(snap);
    }

    // Fetch repo metadata for display
    let repo_meta: HashMap<Uuid, (String, String)> = sqlx::query_as::<_, (Uuid, String, String)>(
        "SELECT id, owner, name FROM repositories"
    )
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|(id, owner, name)| (id, (owner, name)))
    .collect();

    // Build raw metrics for each repo
    let mut raw_metrics: Vec<(Uuid, f64, f64, f64, f64, f64)> = Vec::new(); // (id, velocity, growth, contributor, hiring, social)

    for (repo_id, snaps) in &repo_snapshots {
        if snaps.len() < 2 {
            continue;
        }

        let latest = snaps.last().unwrap();
        let target_time = latest.captured_at - Duration::days(timeframe_days);
        let baseline = snaps
            .iter()
            .rev()
            .find(|s| s.captured_at <= target_time)
            .unwrap_or(&snaps[0]);

        let elapsed_secs = (latest.captured_at - baseline.captured_at)
            .num_seconds()
            .max(86_400);
        let elapsed_days = elapsed_secs as f64 / 86_400.0;

        let stars_gained = latest.stars - baseline.stars;
        let star_velocity = stars_gained as f64 / elapsed_days;
        let growth_ratio = stars_gained as f64 / baseline.stars.max(1) as f64;
        let contributor_growth = (latest.contributors - baseline.contributors) as f64
            / baseline.contributors.max(1) as f64;

        raw_metrics.push((
            *repo_id,
            star_velocity.max(0.0),
            growth_ratio.max(0.0),
            contributor_growth.max(0.0),
            0.0, // hiring (unavailable in historical snapshots)
            0.0, // social (unavailable in historical snapshots)
        ));
    }

    if raw_metrics.is_empty() {
        return Ok(vec![]);
    }

    // Normalize each dimension
    let max_vel = raw_metrics.iter().map(|m| m.1).fold(0.0_f64, f64::max);
    let max_grw = raw_metrics.iter().map(|m| m.2).fold(0.0_f64, f64::max);
    let max_con = raw_metrics.iter().map(|m| m.3).fold(0.0_f64, f64::max);

    let normalize = |v: f64, mx: f64| -> f64 {
        if mx <= 0.0 { 0.0 } else { (v / mx * 100.0).clamp(0.0, 100.0) }
    };

    let mut predictions: Vec<PredictedRank> = raw_metrics
        .iter()
        .map(|(repo_id, vel, grw, con, hir, soc)| {
            let vs = normalize(*vel, max_vel);
            let gs = normalize(*grw, max_grw);
            let cs = normalize(*con, max_con);
            let hs = normalize(*hir, 1.0); // no hiring data in historical mode
            let ss = normalize(*soc, 1.0); // no social data in historical mode

            let trend = vs * weights.velocity_weight
                + gs * weights.growth_weight
                + cs * weights.contributor_weight
                + hs * weights.hiring_weight
                + ss * weights.social_weight;

            let (owner, name) = repo_meta
                .get(repo_id)
                .cloned()
                .unwrap_or_else(|| ("?".to_string(), repo_id.to_string()));

            PredictedRank {
                repo_id: *repo_id,
                owner,
                name,
                trend_score: trend,
            }
        })
        .collect();

    predictions.sort_by(|a, b| b.trend_score.partial_cmp(&a.trend_score).unwrap());
    Ok(predictions)
}

/// Get actual star growth between two dates. This is the ground truth.
async fn get_actual_growth_rankings(
    pool: &sqlx::PgPool,
    start_date: NaiveDate,
    end_date: NaiveDate,
) -> Result<Vec<ActualGrowth>, Box<dyn std::error::Error>> {
    let rows = sqlx::query_as::<_, (Uuid, String, String, i32)>(
        r#"
        WITH start_snap AS (
            SELECT DISTINCT ON (repo_id) repo_id, stars
            FROM snapshots
            WHERE (captured_at AT TIME ZONE 'UTC')::DATE <= $1
            ORDER BY repo_id, captured_at DESC
        ),
        end_snap AS (
            SELECT DISTINCT ON (repo_id) repo_id, stars
            FROM snapshots
            WHERE (captured_at AT TIME ZONE 'UTC')::DATE <= $2
            ORDER BY repo_id, captured_at DESC
        )
        SELECT
            e.repo_id,
            r.owner,
            r.name,
            (e.stars - COALESCE(s.stars, 0))::INT AS stars_gained
        FROM end_snap e
        LEFT JOIN start_snap s ON s.repo_id = e.repo_id
        JOIN repositories r ON r.id = e.repo_id
        WHERE (e.stars - COALESCE(s.stars, 0)) > 0
        ORDER BY (e.stars - COALESCE(s.stars, 0)) DESC
        "#,
    )
    .bind(start_date)
    .bind(end_date)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|(repo_id, owner, name, stars_gained)| ActualGrowth {
            repo_id,
            owner,
            name,
            stars_gained,
        })
        .collect())
}

fn truncate(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        format!("{:<width$}", s, width = max_len)
    } else {
        format!("{}…", &s[..max_len - 1])
    }
}
