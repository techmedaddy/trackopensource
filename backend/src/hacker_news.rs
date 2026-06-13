use crate::models::SocialMention;
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Deserialize, Debug)]
struct AlgoliaHit {
    #[serde(rename = "objectID")]
    object_id: String,
    title: Option<String>,
    url: Option<String>,
    points: Option<i32>,
    num_comments: Option<i32>,
    created_at: DateTime<Utc>,
}

#[derive(Deserialize, Debug)]
struct AlgoliaResponse {
    hits: Vec<AlgoliaHit>,
}

pub async fn fetch_hn_mentions(
    client: &Client,
    repo_id: Uuid,
    owner: &str,
    name: &str,
) -> Result<Vec<SocialMention>, Box<dyn std::error::Error>> {
    let query = format!("github.com/{}/{}", owner, name);
    let url = format!(
        "https://hn.algolia.com/api/v1/search?query={}&hitsPerPage=50",
        query
    );

    let resp = client.get(&url).send().await?;
    
    if !resp.status().is_success() {
        tracing::error!("Failed to fetch HN mentions for {}/{}: {}", owner, name, resp.status());
        return Ok(vec![]);
    }

    let data: AlgoliaResponse = resp.json().await?;

    let mentions = data.hits.into_iter().filter_map(|hit| {
        let external_id = hit.object_id.clone();
        let title = hit.title.unwrap_or_else(|| "No Title".to_string());
        let url = hit.url.unwrap_or_else(|| format!("https://news.ycombinator.com/item?id={}", external_id));
        
        Some(SocialMention {
            id: Uuid::new_v4(),
            repo_id,
            platform: "hacker_news".to_string(),
            external_id,
            title,
            url,
            score: hit.points.unwrap_or(0),
            comments_count: hit.num_comments.unwrap_or(0),
            sentiment_score: None,
            published_at: hit.created_at,
            captured_at: Utc::now(),
        })
    }).collect();

    Ok(mentions)
}

pub async fn save_social_mentions(
    pool: &PgPool,
    mentions: Vec<SocialMention>,
) -> Result<(), sqlx::Error> {
    for mention in mentions {
        sqlx::query(
            r#"
            INSERT INTO social_mentions (
                repo_id, platform, external_id, title, url, score, comments_count, sentiment_score, published_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (platform, external_id) DO UPDATE SET
                title = EXCLUDED.title,
                url = EXCLUDED.url,
                score = EXCLUDED.score,
                comments_count = EXCLUDED.comments_count,
                sentiment_score = EXCLUDED.sentiment_score,
                captured_at = CURRENT_TIMESTAMP
            "#,
        )
        .bind(mention.repo_id)
        .bind(&mention.platform)
        .bind(&mention.external_id)
        .bind(&mention.title)
        .bind(&mention.url)
        .bind(mention.score)
        .bind(mention.comments_count)
        .bind(mention.sentiment_score)
        .bind(mention.published_at)
        .execute(pool)
        .await?;
    }
    Ok(())
}

#[derive(Deserialize, Debug)]
struct HNComment {
    comment_text: Option<String>,
}

#[derive(Deserialize, Debug)]
struct HNCommentResponse {
    hits: Vec<HNComment>,
}

pub async fn fetch_latest_hiring_thread(client: &Client) -> Result<String, Box<dyn std::error::Error>> {
    let url = "https://hn.algolia.com/api/v1/search?tags=story,author_whoishiring&searchTarget=title&query=Ask%20HN:%20Who%20is%20hiring?&hitsPerPage=1";
    let resp = client.get(url).send().await?;
    let data: AlgoliaResponse = resp.json().await?;
    if let Some(hit) = data.hits.first() {
        Ok(hit.object_id.clone())
    } else {
        Err("No 'Ask HN: Who is hiring?' thread found".into())
    }
}

pub async fn fetch_thread_comments(client: &Client, thread_id: &str) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let mut all_comments = Vec::new();
    let mut page = 0;
    loop {
        let url = format!("https://hn.algolia.com/api/v1/search_by_date?tags=comment,story_{}&hitsPerPage=100&page={}", thread_id, page);
        let resp = client.get(&url).send().await?;
        let data: HNCommentResponse = resp.json().await?;
        
        if data.hits.is_empty() {
            break;
        }

        for hit in data.hits {
            if let Some(text) = hit.comment_text {
                // Text Sanitization & HTML Entity Decoding
                let decoded = html_escape::decode_html_entities(&text).to_string();
                let clean = decoded
                    .replace("<p>", " ")
                    .replace("</p>", " ")
                    .replace("<br>", " ")
                    .replace("<br/>", " ");
                all_comments.push(clean);
            }
        }
        page += 1;
    }
    Ok(all_comments)
}

pub struct AliasEngine {
    matchers: std::collections::HashMap<String, regex::Regex>,
}

impl AliasEngine {
    pub fn new() -> Self {
        let mut matchers = std::collections::HashMap::new();
        // Boundary-Aware Alias Engine Mappings
        matchers.insert("postgresql".to_string(), regex::Regex::new(r"(?i)\b(postgres|postgresql|psql)\b").unwrap());
        matchers.insert("kubernetes".to_string(), regex::Regex::new(r"(?i)\b(k8s|kubernetes)\b").unwrap());
        matchers.insert("react".to_string(), regex::Regex::new(r"(?i)\b(react|reactjs|react\.js)\b").unwrap());
        matchers.insert("rust".to_string(), regex::Regex::new(r"(?i)\b(rust|rustlang)\b").unwrap());
        matchers.insert("go".to_string(), regex::Regex::new(r"(?i)\b(go|golang)\b").unwrap());
        matchers.insert("python".to_string(), regex::Regex::new(r"(?i)\b(python)\b").unwrap());
        matchers.insert("typescript".to_string(), regex::Regex::new(r"(?i)\b(typescript|ts)\b").unwrap());
        matchers.insert("redis".to_string(), regex::Regex::new(r"(?i)\b(redis)\b").unwrap());
        matchers.insert("docker".to_string(), regex::Regex::new(r"(?i)\b(docker)\b").unwrap());
        matchers.insert("nextjs".to_string(), regex::Regex::new(r"(?i)\b(nextjs|next\.js)\b").unwrap());
        Self { matchers }
    }

    pub fn scan_comments(&self, comments: &[String]) -> std::collections::HashMap<String, f64> {
        let total = comments.len() as f64;
        let mut counts = std::collections::HashMap::new();
        
        if total == 0.0 {
            return std::collections::HashMap::new();
        }

        for comment in comments {
            for (tech, regex) in &self.matchers {
                if regex.is_match(comment) {
                    *counts.entry(tech.clone()).or_insert(0) += 1;
                }
            }
        }

        let mut percentages = std::collections::HashMap::new();
        for (tech, count) in counts {
            percentages.insert(tech.clone(), (count as f64 / total) * 100.0);
        }
        
        percentages
    }
}
