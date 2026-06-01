use crate::models::SocialMention;
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize, Debug)]
struct RedditListing {
    data: RedditData,
}

#[derive(Deserialize, Debug)]
struct RedditData {
    children: Vec<RedditChild>,
}

#[derive(Deserialize, Debug)]
struct RedditChild {
    data: RedditPost,
}

#[derive(Deserialize, Debug)]
struct RedditPost {
    id: String,
    title: String,
    permalink: String,
    score: i32,
    num_comments: i32,
    created_utc: f64,
}

pub async fn fetch_reddit_mentions(
    client: &Client,
    repo_id: Uuid,
    owner: &str,
    name: &str,
) -> Result<Vec<SocialMention>, Box<dyn std::error::Error>> {
    let query = format!("github.com/{}/{}", owner, name);
    let url = format!("https://www.reddit.com/search.json?q={}&sort=new&limit=50", query);

    let resp = client.get(&url).send().await?;
    
    if !resp.status().is_success() {
        tracing::error!("Failed to fetch Reddit mentions for {}/{}: {}", owner, name, resp.status());
        return Ok(vec![]);
    }

    let data: RedditListing = resp.json().await?;

    let mentions = data.data.children.into_iter().map(|child| {
        let post = child.data;
        let published_at = DateTime::from_timestamp(post.created_utc as i64, 0)
            .unwrap_or_default();
        
        SocialMention {
            id: Uuid::new_v4(),
            repo_id,
            platform: "reddit".to_string(),
            external_id: post.id,
            title: post.title,
            url: format!("https://www.reddit.com{}", post.permalink),
            score: post.score,
            comments_count: post.num_comments,
            sentiment_score: None,
            published_at,
            captured_at: Utc::now(),
        }
    }).collect();

    Ok(mentions)
}
