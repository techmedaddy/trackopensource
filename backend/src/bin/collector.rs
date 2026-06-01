use backend::{categorize::categorize_repo, ranking};
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, AUTHORIZATION, LINK, USER_AGENT};
use serde::Deserialize;
use sqlx::postgres::PgPoolOptions;
use std::env;
use uuid::Uuid;

#[derive(Deserialize, Debug)]
struct GithubRepo {
    id: i64,
    owner: Owner,
    name: String,
    description: Option<String>,
    language: Option<String>,
    stargazers_count: i32,
    forks_count: i32,
    subscribers_count: i32, // maps to watchers
    open_issues_count: i32,
}

#[derive(Deserialize, Debug)]
struct Owner {
    login: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    // Load .env file
    dotenvy::dotenv().ok();

    // Initialize Database
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect(&db_url)
        .await?;

    tracing::info!("Running database migrations...");
    sqlx::migrate!("./migrations").run(&pool).await?;

    // Setup GitHub HTTP Client
    let github_token = env::var("GITHUB_TOKEN").unwrap_or_default();
    let mut headers = HeaderMap::new();
    headers.insert(ACCEPT, HeaderValue::from_static("application/vnd.github.v3+json"));
    headers.insert(USER_AGENT, HeaderValue::from_static("OpenSourceRadar-Collector"));
    
    if !github_token.is_empty() {
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", github_token))?,
        );
    } else {
        tracing::warn!("GITHUB_TOKEN is not set. You may hit rate limits quickly.");
    }

    let client = reqwest::Client::builder()
        .default_headers(headers)
        .build()?;

    // Seed list of repositories to track for MVP
    let seed_repos = vec![
        ("torvalds", "linux"),
        ("rust-lang", "rust"),
        ("facebook", "react"),
        ("vercel", "next.js"),
        ("tokio-rs", "tokio"),
        ("astral-sh", "ruff"),
        ("astral-sh", "uv"),
        ("openai", "openai-python"),
        ("anthropics", "anthropic-sdk-python"),
        ("vllm-project", "vllm"),
        ("huggingface", "transformers"),
        ("langchain-ai", "langchain"),
        ("microsoft", "playwright"),
        ("supabase", "supabase"),
        ("neondatabase", "neon"),
        ("denoland", "deno"),
        ("oven-sh", "bun"),
        ("grafana", "grafana"),
        ("open-telemetry", "opentelemetry-collector"),
        ("apache", "arrow"),
    ];

    tracing::info!("Starting daily data collection for {} repositories", seed_repos.len());

    for (owner, name) in seed_repos {
        tracing::info!("Fetching data for {}/{}", owner, name);
        let url = format!("https://api.github.com/repos/{}/{}", owner, name);
        
        let resp = client.get(&url).send().await?;
        
        if resp.status() == reqwest::StatusCode::FORBIDDEN {
            tracing::error!("Rate limit hit or forbidden access for {}/{}", owner, name);
            break; // Stop execution if rate limited
        } else if !resp.status().is_success() {
            tracing::error!("Failed to fetch {}/{}: {}", owner, name, resp.status());
            continue;
        }

        let repo_data: GithubRepo = resp.json().await?;
        let contributors = fetch_contributor_count(&client, owner, name).await.unwrap_or_else(|err| {
            tracing::warn!("Could not fetch contributors for {}/{}: {}", owner, name, err);
            0
        });
        let categories = categorize_repo(
            repo_data.language.as_deref(),
            &repo_data.name,
            repo_data.description.as_deref(),
        );

        // 1. Upsert Repository Metadata
        let repo_id: Uuid = sqlx::query_scalar(
            r#"
            INSERT INTO repositories (github_id, owner, name, description, language, categories, stars, forks)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (owner, name) 
            DO UPDATE SET 
                description = EXCLUDED.description,
                language = EXCLUDED.language,
                categories = EXCLUDED.categories,
                stars = EXCLUDED.stars,
                forks = EXCLUDED.forks,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
            "#,
        )
        .bind(repo_data.id)
        .bind(&repo_data.owner.login)
        .bind(&repo_data.name)
        .bind(&repo_data.description)
        .bind(&repo_data.language)
        .bind(&categories)
        .bind(repo_data.stargazers_count)
        .bind(repo_data.forks_count)
        .fetch_one(&pool)
        .await?;

        // 2. Insert Time-Machine Snapshot
        sqlx::query(
            r#"
            INSERT INTO snapshots (repo_id, stars, forks, watchers, open_issues, contributors)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(repo_id)
        .bind(repo_data.stargazers_count)
        .bind(repo_data.forks_count)
        .bind(repo_data.subscribers_count)
        .bind(repo_data.open_issues_count)
        .bind(contributors)
        .execute(&pool)
        .await?;

        // Delay to be polite to GitHub API
        tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
    }

    let summary = ranking::refresh_default_rankings(&pool).await?;
    tracing::info!(
        "Ranking engine updated {} repositories across {:?} day windows",
        summary.repositories_scored,
        summary.timeframe_days
    );

    tracing::info!("Data collection pipeline complete!");
    Ok(())
}

async fn fetch_contributor_count(
    client: &reqwest::Client,
    owner: &str,
    name: &str,
) -> Result<i32, Box<dyn std::error::Error>> {
    let url = format!(
        "https://api.github.com/repos/{}/{}/contributors?per_page=1&anon=true",
        owner, name
    );
    let resp = client.get(url).send().await?;

    if !resp.status().is_success() {
        return Ok(0);
    }

    if let Some(link) = resp.headers().get(LINK).and_then(|value| value.to_str().ok()) {
        if let Some(last_page) = parse_last_page(link) {
            return Ok(last_page);
        }
    }

    let contributors: Vec<serde_json::Value> = resp.json().await.unwrap_or_default();
    Ok(contributors.len() as i32)
}

fn parse_last_page(link_header: &str) -> Option<i32> {
    link_header
        .split(',')
        .find(|part| part.contains("rel=\"last\""))
        .and_then(|part| part.split("page=").nth(1))
        .and_then(|page_part| {
            let digits: String = page_part
                .chars()
                .take_while(|character| character.is_ascii_digit())
                .collect();
            digits.parse().ok()
        })
}
