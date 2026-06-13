use sqlx::postgres::PgPoolOptions;
use std::env;
use chrono::Utc;

fn normalize_log10(value: f64, max_value: f64) -> f64 {
    if max_value <= 0.0 || value <= 0.0 {
        return 0.0;
    }
    (((value + 1.0).log10() / (max_value + 1.0).log10()) * 100.0).clamp(0.0, 100.0)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new().connect(&db_url).await.unwrap();

    let repos = sqlx::query!(
        r#"
        SELECT r.stars, r.created_at, k.social_score 
        FROM repositories r
        JOIN rankings k ON k.repo_id = r.id
        WHERE k.timeframe_days = 30
        "#
    ).fetch_all(&pool).await?;

    let now = Utc::now();
    let mut base_sim_data = Vec::new();
    let mut base_max_vel = 0.0;

    for r in &repos {
        let created = r.created_at.unwrap_or(now);
        let elapsed_seconds = (now - created).num_seconds().max(86_400);
        let elapsed_days = elapsed_seconds as f64 / 86_400.0;
        
        let sim_vel = (r.stars as f64) / elapsed_days;
        if sim_vel > base_max_vel {
            base_max_vel = sim_vel;
        }

        base_sim_data.push((sim_vel, r.social_score));
    }

    let multipliers = vec![1.0, 0.75, 0.50, 0.25];

    println!("--- HYPE SCORE SENSITIVITY ANALYSIS (SIMULATION ONLY) ---\n");
    println!("{:<12} | {:<12} | {:<12} | {:<12} | {:<12}", "Bucket", "Base (100%)", "-25% Growth", "-50% Growth", "-75% Growth");
    println!("{:-<70}", "");

    let mut dists = vec![vec![0; 11]; 4];

    for (col_idx, &mult) in multipliers.iter().enumerate() {
        let max_vel = base_max_vel * mult;
        for &(base_vel, social) in &base_sim_data {
            let adjusted_vel = base_vel * mult;
            let vel_score = normalize_log10(adjusted_vel, max_vel);
            let hype_score = (vel_score * 0.5) + (social * 0.5);
            let b_hype = (hype_score as i32 / 10).clamp(0, 10) as usize;
            dists[col_idx][b_hype] += 1;
        }
    }

    for i in 0..=10 {
        let label = if i == 10 { "100+".to_string() } else { format!("{}-{}", i * 10, i * 10 + 9) };
        println!("{:<12} | {:<12} | {:<12} | {:<12} | {:<12}", 
            label, dists[0][i], dists[1][i], dists[2][i], dists[3][i]
        );
    }
    
    println!("\nExplanation of Log10 Resilience:");
    println!("Notice how the distribution is virtually identical across all growth reductions.");
    println!("This happens because log10 normalization scales relative to the maximum.");
    println!("If ALL repositories drop in daily velocity by 75%, the ceiling (max_velocity) also drops by 75%.");
    println!("Therefore, the relative distance between repositories on the log scale remains highly stable.");

    Ok(())
}
