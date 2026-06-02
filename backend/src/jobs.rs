use chrono::Utc;
use reqwest::Client;
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Deserialize, Debug)]
struct HNStorySearchResponse {
    hits: Vec<HNStoryHit>,
}

#[derive(Deserialize, Debug)]
struct HNStoryHit {
    #[serde(rename = "objectID")]
    object_id: String,
}

#[derive(Deserialize, Debug)]
struct HNCommentSearchResponse {
    hits: Vec<HNCommentHit>,
}

#[derive(Deserialize, Debug)]
struct HNCommentHit {
    #[serde(rename = "objectID")]
    object_id: String,
    comment_text: Option<String>,
    created_at: String,
}

pub struct JobMention {
    pub repo_id: Uuid,
    pub company_name: String,
    pub job_title: Option<String>,
    pub source_url: String,
    pub posted_at: chrono::DateTime<Utc>,
}

pub async fn discover_job_mentions(
    client: &Client,
    repo_id: Uuid,
    repo_name: &str,
) -> Result<Vec<JobMention>, Box<dyn std::error::Error>> {
    // 1. Find the latest 3 "Who is hiring" threads
    let thread_url = "https://hn.algolia.com/api/v1/search?tags=story,author_whoishiring&query=\"Ask HN: Who is hiring?\"&hitsPerPage=3";
    
    let thread_resp = client.get(thread_url).send().await?.json::<HNStorySearchResponse>().await?;
    let mut mentions = Vec::new();

    for story in thread_resp.hits {
        // 2. Fetch comments for this thread that explicitly mention the repository
        let comments_url = format!(
            "https://hn.algolia.com/api/v1/search?tags=comment,story_{}&query={}&hitsPerPage=50",
            story.object_id, repo_name
        );

        let comments_resp = match client.get(&comments_url).send().await {
            Ok(r) => match r.json::<HNCommentSearchResponse>().await {
                Ok(data) => data,
                Err(_) => continue,
            },
            Err(_) => continue,
        };

        for comment in comments_resp.hits {
            if let Some(text) = comment.comment_text {
                // Heuristic: "Company Name | Job Title | Location" is standard HN hiring format
                let first_line = text.lines().next().unwrap_or("");
                let chunks: Vec<&str> = first_line.split('|').collect();
                
                let raw_company = chunks.first().unwrap_or(&"Unknown Company").trim().to_string();
                let raw_title = chunks.get(1).map(|t| t.trim().to_string());
                
                // Extremely basic HTML stripping just in case Algolia includes it
                let clean_company = raw_company
                    .replace("<p>", "")
                    .replace("</p>", "")
                    .replace("<a>", "")
                    .replace("</a>", "");
                
                let final_company = if clean_company.len() > 50 || clean_company.is_empty() {
                    "Unknown Company".to_string()
                } else {
                    clean_company
                };

                let posted_at = chrono::DateTime::parse_from_rfc3339(&comment.created_at)
                    .map(|d| d.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now());

                mentions.push(JobMention {
                    repo_id,
                    company_name: final_company,
                    job_title: raw_title,
                    source_url: format!("https://news.ycombinator.com/item?id={}", comment.object_id),
                    posted_at,
                });
            }
        }
    }

    Ok(mentions)
}

pub async fn save_job_mentions(
    pool: &PgPool,
    mentions: Vec<JobMention>,
) -> Result<(), sqlx::Error> {
    for m in mentions {
        sqlx::query(
            r#"
            INSERT INTO job_mentions (repo_id, company_name, job_title, source_url, posted_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT ON CONSTRAINT unique_job_mention DO NOTHING
            "#,
        )
        .bind(m.repo_id)
        .bind(&m.company_name)
        .bind(m.job_title)
        .bind(&m.source_url)
        .bind(m.posted_at)
        .execute(pool)
        .await?;
    }
    Ok(())
}
