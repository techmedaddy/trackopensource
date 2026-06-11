use crate::{categorize::categorize_repo, hacker_news};
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, AUTHORIZATION, LINK, USER_AGENT};
use serde::Deserialize;
use std::env;
use uuid::Uuid;
use futures::StreamExt;

#[derive(Deserialize, Debug)]
struct GithubRepo {
    id: i64,
    owner: Owner,
    name: String,
    description: Option<String>,
    language: Option<String>,
    stargazers_count: i32,
    forks_count: i32,
    subscribers_count: i32,
    open_issues_count: i32,
}

#[derive(Deserialize, Debug)]
struct Owner {
    login: String,
}

#[derive(Deserialize, Debug)]
struct GithubSearchResponse {
    items: Vec<GithubSearchItem>,
}

#[derive(Deserialize, Debug)]
struct GithubSearchItem {
    owner: Owner,
    name: String,
}

pub async fn run(pool: &sqlx::PgPool) -> Result<(), Box<dyn std::error::Error>> {
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

    let mut repos_to_track: Vec<(String, String)> = Vec::new();
    tracing::info!("Loading currently tracked repositories from database...");
    
    let existing_records = sqlx::query!("SELECT owner, name FROM repositories WHERE is_tracked = true")
        .fetch_all(pool)
        .await?;

    for row in existing_records {
        repos_to_track.push((row.owner, row.name));
    }

    match discover_unusual_momentum_repos(&client).await {
        Ok(new_repos) => {
            repos_to_track.extend(new_repos);
        }
        Err(e) => {
            tracing::error!("Failed to discover new momentum repos: {}", e);
        }
    }

    match discover_top_frameworks(&client).await {
        Ok(top_repos) => {
            repos_to_track.extend(top_repos);
        }
        Err(e) => {
            tracing::error!("Failed to discover top frameworks: {}", e);
        }
    }

    repos_to_track.sort();
    repos_to_track.dedup();

    tracing::info!("Starting daily data collection for {} repositories", repos_to_track.len());

    let stream = futures::stream::iter(repos_to_track)
        .map(|(owner, name)| {
            let client = client.clone();
            let pool = pool.clone();
            
            async move {
                tracing::info!("Fetching data for {}/{}", owner, name);
                let url = format!("https://api.github.com/repos/{}/{}", owner, name);
                
                let resp = match client.get(&url).send().await {
                    Ok(r) => r,
                    Err(e) => {
                        tracing::error!("Request failed for {}/{}: {}", owner, name, e);
                        return None;
                    }
                };
                
                if resp.status() == reqwest::StatusCode::FORBIDDEN {
                    tracing::error!("Rate limit hit or forbidden access for {}/{}", owner, name);
                    return None;
                } else if !resp.status().is_success() {
                    tracing::error!("Failed to fetch {}/{}: {}", owner, name, resp.status());
                    return None;
                }

                let repo_data = match resp.json::<GithubRepo>().await {
                    Ok(data) => data,
                    Err(e) => {
                        tracing::error!("Failed to parse JSON for {}/{}: {}", owner, name, e);
                        return None;
                    }
                };

                let contributors = fetch_contributor_count(&client, &owner, &name).await.unwrap_or_else(|err| {
                    tracing::warn!("Could not fetch contributors for {}/{}: {}", owner, name, err);
                    0
                });
                let categories = categorize_repo(
                    repo_data.language.as_deref(),
                    &repo_data.name,
                    repo_data.description.as_deref(),
                );

                let repo_id_result = sqlx::query_scalar::<_, Uuid>(
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
                .await;

                let repo_id = match repo_id_result {
                    Ok(id) => id,
                    Err(e) => {
                        tracing::error!("Failed to upsert {}/{}: {}", owner, name, e);
                        return None;
                    }
                };

                if let Err(e) = sqlx::query(
                    r#"
                    INSERT INTO snapshots (repo_id, stars, forks, watchers, open_issues, contributors, captured_at)
                    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                    ON CONFLICT (repo_id, ((captured_at AT TIME ZONE 'UTC')::DATE)) DO UPDATE SET
                        stars = EXCLUDED.stars,
                        forks = EXCLUDED.forks,
                        watchers = EXCLUDED.watchers,
                        open_issues = EXCLUDED.open_issues,
                        contributors = EXCLUDED.contributors
                    "#,
                )
                .bind(repo_id)
                .bind(repo_data.stargazers_count)
                .bind(repo_data.forks_count)
                .bind(repo_data.subscribers_count)
                .bind(repo_data.open_issues_count)
                .bind(contributors)
                .execute(&pool)
                .await {
                    tracing::error!("Failed to insert snapshot for {}/{}: {}", owner, name, e);
                }

                match crate::hacker_news::fetch_hn_mentions(&client, repo_id, &owner, &name).await {
                    Ok(mentions) => {
                        if let Err(e) = crate::hacker_news::save_social_mentions(&pool, mentions).await {
                            tracing::error!("Failed to save HN mentions for {}/{}: {}", owner, name, e);
                        }
                    }
                    Err(e) => {
                        tracing::error!("Failed to fetch HN mentions for {}/{}: {}", owner, name, e);
                    }
                }

                Some((repo_id, name))
            }
        })
        .buffer_unordered(5);

    let processed_repos: Vec<(Uuid, String)> = stream.filter_map(|opt| async move { opt }).collect().await;

    tracing::info!("Starting Job Collector Cron for {} repositories...", processed_repos.len());
    if let Err(e) = crate::jobs::scrape_hn_hiring_threads(&client, &pool, processed_repos.as_slice()).await {
        tracing::error!("Job Collector failed: {}", e);
    }

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

async fn discover_unusual_momentum_repos(client: &reqwest::Client) -> Result<Vec<(String, String)>, Box<dyn std::error::Error>> {
    let mut discovered = Vec::new();
    
    let format_48h = (chrono::Utc::now() - chrono::Duration::days(2)).format("%Y-%m-%d").to_string();
    let query_48h = format!("created:>{} stars:15..100", format_48h);
    
    let format_7d = (chrono::Utc::now() - chrono::Duration::days(7)).format("%Y-%m-%d").to_string();
    let query_7d = format!("created:>{} stars:35..250", format_7d);

    let target_queries = vec![
        ("hour_zero", query_48h),
        ("weekly_breakout", query_7d)
    ];

    for (bucket_name, query_string) in target_queries {
        tracing::info!("Scanning velocity bucket [{}] with query: {}", bucket_name, query_string);
        
        let resp = client.get("https://api.github.com/search/repositories")
            .query(&[
                ("q", query_string.as_str()),
                ("sort", "stars"),
                ("order", "desc"),
                ("per_page", "30"),
            ])
            .send()
            .await?;
            
        if !resp.status().is_success() {
            tracing::error!("GitHub velocity search failed for [{}]: {}", bucket_name, resp.status());
            continue;
        }

        let search_data: GithubSearchResponse = resp.json().await?;
        for item in search_data.items {
            discovered.push((item.owner.login, item.name));
        }

        tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
    }

    tracing::info!("Velocity scanning complete. Unearthed {} momentum assets.", discovered.len());
    Ok(discovered)
}

async fn discover_top_frameworks(client: &reqwest::Client) -> Result<Vec<(String, String)>, Box<dyn std::error::Error>> {
    let languages = vec!["rust", "go", "python", "javascript", "typescript", "java", "cpp", "ruby"];
    let mut discovered = Vec::new();

    for lang in languages {
        let query = format!("language:{} stars:>1000", lang);
        tracing::info!("Discovering top projects for {}...", lang);
        
        let resp = client.get("https://api.github.com/search/repositories")
            .query(&[
                ("q", query.as_str()),
                ("sort", "stars"),
                ("order", "desc"),
                ("per_page", "65"),
            ])
            .send()
            .await?;
            
        if !resp.status().is_success() {
            tracing::error!("Failed to search GitHub for {}: {}", lang, resp.status());
            continue;
        }

        let search_data: GithubSearchResponse = resp.json().await?;
        for item in search_data.items {
            discovered.push((item.owner.login, item.name));
        }
        
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }
    
    Ok(discovered)
}
