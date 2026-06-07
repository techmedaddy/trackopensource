use reqwest::Client;
use serde_json::json;
use sqlx::PgPool;
use std::env;
use uuid::Uuid;

pub async fn check_and_dispatch_alerts(
    pool: &PgPool,
    repo_id: Uuid,
    hiring_score: f64,
    social_score: f64,
    trend_score: f64,
) {
    let webhook_url = env::var("DISCORD_WEBHOOK_URL").unwrap_or_default();
    if webhook_url.is_empty() {
        return; // No webhook configured
    }

    let is_golden_zone = hiring_score > 30.0 && social_score > 30.0;
    let is_breakout = trend_score > 15.0; // High threshold for general momentum breakout

    let alert_type = if is_golden_zone {
        "GOLDEN_ZONE"
    } else if is_breakout {
        "BREAKOUT"
    } else {
        return; // Doesn't meet any alert threshold
    };

    // Prevent spam by checking if we already sent this exact alert type for this repo in the last 30 days
    let already_sent = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM alerts_sent 
        WHERE repo_id = $1 AND alert_type = $2 AND sent_at > (NOW() - INTERVAL '30 days')
        "#,
    )
    .bind(repo_id)
    .bind(alert_type)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    if already_sent > 0 {
        return; // We already alerted recently
    }

    // Fetch repository details to construct the message
    let repo_row = match sqlx::query(
        "SELECT owner, name, description FROM repositories WHERE id = $1"
    )
    .bind(repo_id)
    .fetch_optional(pool)
    .await
    {
        Ok(Some(row)) => row,
        _ => return, // Repo not found or DB error
    };

    use sqlx::Row;
    let owner: String = repo_row.get("owner");
    let name: String = repo_row.get("name");
    let description: Option<String> = repo_row.get("description");

    let repo_full_name = format!("{}/{}", owner, name);

    let (title, color) = if is_golden_zone {
        (format!("🌟 Golden Zone Entry: {}", repo_full_name), 0x10b981) // Green
    } else {
        (format!("🚀 Momentum Breakout: {}", repo_full_name), 0xf59e0b) // Amber
    };

    let desc = description.unwrap_or_else(|| "No description available.".to_string());

    let payload = json!({
        "embeds": [{
            "title": title,
            "description": desc,
            "url": format!("https://github.com/{}", repo_full_name),
            "color": color,
            "fields": [
                { "name": "Trend Score", "value": format!("{:.1}", trend_score), "inline": true },
                { "name": "Hiring Demand", "value": format!("{:.1}", hiring_score), "inline": true },
                { "name": "Social Momentum", "value": format!("{:.1}", social_score), "inline": true }
            ],
            "footer": { "text": "Open Source Career Radar" }
        }]
    });

    let client = Client::new();
    match client.post(&webhook_url).json(&payload).send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                tracing::info!("✅ Successfully sent Discord alert for {}", repo_full_name);
                
                // Record the alert so we don't spam
                let _ = sqlx::query(
                    "INSERT INTO alerts_sent (repo_id, alert_type) VALUES ($1, $2)"
                )
                .bind(repo_id)
                .bind(alert_type)
                .execute(pool)
                .await;
            } else {
                tracing::error!("Failed to send Discord alert: {}", resp.status());
            }
        }
        Err(e) => {
            tracing::error!("Error sending Discord webhook: {}", e);
        }
    }
}
