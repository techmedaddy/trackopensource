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

pub fn get_aliases(repo_name: &str) -> Vec<String> {
    let mut aliases = vec![repo_name.to_lowercase()];
    
    match repo_name.to_lowercase().as_str() {
        "opentelemetry" | "opentelemetry-rust" | "opentelemetry-go" => {
            aliases.extend(vec!["otel".to_string(), "opentelemetry".to_string()]);
        }
        "kubernetes" | "k8s" => {
            aliases.extend(vec!["k8s".to_string(), "kubernetes".to_string()]);
        }
        "postgresql" | "postgres" => {
            aliases.extend(vec!["postgres".to_string(), "postgresql".to_string(), "psql".to_string()]);
        }
        "react" | "reactjs" => {
            aliases.extend(vec!["react".to_string(), "react.js".to_string()]);
        }
        "vue" | "vuejs" => {
            aliases.extend(vec!["vue".to_string(), "vue.js".to_string()]);
        }
        "next.js" | "nextjs" | "next" => {
            aliases.extend(vec!["next.js".to_string(), "nextjs".to_string()]);
        }
        "node" | "nodejs" => {
            aliases.extend(vec!["nodejs".to_string(), "node.js".to_string()]);
        }
        "go" | "golang" => {
            aliases.push("golang".to_string());
        }
        "rust" | "rustlang" => {
            aliases.push("rustlang".to_string());
        }
        _ => {}
    }
    
    aliases.sort();
    aliases.dedup();
    aliases
}

pub async fn scrape_hn_hiring_threads(
    client: &Client,
    pool: &PgPool,
    tracked_repos: &[(Uuid, String)],
) -> Result<(), Box<dyn std::error::Error>> {
    let thread_url = "https://hn.algolia.com/api/v1/search?tags=story,author_whoishiring&query=\"Ask HN: Who is hiring?\"&hitsPerPage=2";
    let thread_resp = client.get(thread_url).send().await?.json::<HNStorySearchResponse>().await?;

    let mut all_mentions = Vec::new();

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
                let text_lower = text.to_lowercase();
                
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

                // Check which repos are mentioned in this comment
                for (repo_id, repo_name) in tracked_repos {
                    let aliases = get_aliases(repo_name);
                    let mut found = false;
                    
                    for alias in aliases {
                        // Word boundary check to prevent "go" matching "algo"
                        let padded_alias = format!(" {} ", alias);
                        let text_padded = format!(" {} ", text_lower.replace(|c: char| !c.is_alphanumeric(), " "));
                        
                        if text_padded.contains(&padded_alias) {
                            found = true;
                            break;
                        }
                    }

                    if found {
                        all_mentions.push(JobMention {
                            repo_id: *repo_id,
                            company_name: final_company.clone(),
                            job_title: raw_title.clone(),
                            source_url: source_url.clone(),
                            posted_at,
                        });
                    }
                }
            }
        }
    }

    tracing::info!("Found {} total job mentions across {} threads.", all_mentions.len(), thread_resp.hits.len());

    // Batch insert
    for m in all_mentions {
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
