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
        "http://hn.algolia.com/api/v1/search?query={}&restrictSearchableAttributes=url&hitsPerPage=50",
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
