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



pub async fn scrape_hn_hiring_threads(
    client: &Client,
    pool: &PgPool,
    _tracked_repos: &[(Uuid, String)],
) -> Result<(), Box<dyn std::error::Error>> {
    let thread_url = "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&query=\"Ask HN: Who is hiring?\"&hitsPerPage=2";
    let thread_resp = client.get(thread_url).send().await?.json::<HNStorySearchResponse>().await?;

    let mut raw_inserts = 0;

    for story in &thread_resp.hits {
        tracing::info!("Scraping HN Hiring Thread: {}", story.object_id);
        
        let comments_url = format!(
            "https://hn.algolia.com/api/v1/search?tags=comment,story_{}&hitsPerPage=1000",
            story.object_id
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
                let text_upper = text.to_uppercase();
                if text_upper.contains("SEEKING WORK") || text_upper.contains("SEEKING FREELANCER") {
                    continue;
                }
                // Parse company & title from standard HN format
                let first_line = text.lines().next().unwrap_or("");
                let chunks: Vec<&str> = first_line.split('|').collect();
                
                let raw_company = chunks.first().copied().unwrap_or("Unknown Company").trim().to_string();
                let raw_title = chunks.get(1).map(|t| {
                    let mut s = t.trim().to_string();
                    if s.len() > 255 {
                        s.truncate(252);
                        s.push_str("...");
                    }
                    s
                });
                
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

                let source_url = format!("https://news.ycombinator.com/item?id={}", comment.object_id);

                // Insert raw post for tokenization
                let result = sqlx::query(
                    r#"
                    INSERT INTO raw_job_posts (platform, external_id, company_name, job_title, content, source_url, posted_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (external_id) DO NOTHING
                    "#
                )
                .bind("hacker_news")
                .bind(&comment.object_id)
                .bind(&final_company)
                .bind(&raw_title)
                .bind(&text)
                .bind(&source_url)
                .bind(posted_at)
                .execute(pool)
                .await?;

                raw_inserts += result.rows_affected();
            }
        }
    }

    tracing::info!("Inserted {} new raw job posts from {} HN threads.", raw_inserts, thread_resp.hits.len());

    // Execute the Alias Engine: PostgreSQL Full-Text Search Tokenization
    // This replaces the in-memory substring ILIKE matching
    let mut transaction = pool.begin().await?;
    sqlx::query("TRUNCATE TABLE job_mentions")
        .execute(&mut *transaction)
        .await?;

    let mapped_count = sqlx::query(
        r#"
        INSERT INTO job_mentions (repo_id, company_name, job_title, source_url, posted_at)
        SELECT 
            repo.id, 
            raw.company_name, 
            raw.job_title, 
            raw.source_url, 
            raw.posted_at
        FROM raw_job_posts raw
        CROSS JOIN repositories repo
        WHERE 
            EXISTS (
                SELECT 1 FROM unnest(repo.aliases) AS alias 
                WHERE NOT (LOWER(alias) = ANY($1))
                  AND to_tsvector('english', raw.content) @@ plainto_tsquery('english', alias)
            )
            AND array_length(repo.aliases, 1) > 0
        ON CONFLICT ON CONSTRAINT unique_job_mention DO NOTHING;
        "#
    )
    .bind(crate::alias_engine::UNSAFE_HIRING_ALIASES)
    .execute(&mut *transaction)
    .await?
    .rows_affected();

    transaction.commit().await?;

    tracing::info!("Alias Engine rebuilt {} repository mentions via tsvector tokenization.", mapped_count);

    Ok(())
}
