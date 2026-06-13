use sqlx::PgPool;
use uuid::Uuid;

pub const UNSAFE_HIRING_ALIASES: &[&str] = &[
    "act",
    "agent",
    "bun",
    "community",
    "core",
    "dive",
    "express",
    "go",
    "interview",
    "interviews",
    "models",
    "next",
    "node",
    "servers",
    "skills",
    "solid",
    "spring",
    "sure",
    "three",
    "ts",
    "ui",
];

pub async fn run_alias_generation(pool: &PgPool) -> Result<(i64, i64), sqlx::Error> {
    let repos = sqlx::query(
        r#"
        SELECT id, name, owner, aliases 
        FROM repositories 
        WHERE array_length(aliases, 1) IS NULL OR array_length(aliases, 1) = 0
        "#
    )
    .fetch_all(pool)
    .await?;

    let mut repos_updated = 0;
    let mut total_aliases_generated = 0;

    for r in repos {
        use sqlx::Row;
        let id: Uuid = r.get("id");
        let name: String = r.get("name");
        let mut generated = Vec::new();
        let name_lower = name.to_lowercase();
        
        // Base mapping
        if !UNSAFE_HIRING_ALIASES.contains(&name_lower.as_str()) {
            generated.push(name_lower.clone());
        }

        // JS variants
        if name_lower.ends_with(".js") {
            let base = name_lower.replace(".js", "");
            if !UNSAFE_HIRING_ALIASES.contains(&base.as_str()) {
                generated.push(base.clone());
            }
            generated.push(format!("{}js", base));
        }

        // Custom mappings
        match name_lower.as_str() {
            "react" => {
                generated.push("reactjs".to_string());
                generated.push("react.js".to_string());
            }
            "next.js" | "next" => {
                generated.push("nextjs".to_string());
                generated.push("next.js".to_string());
            }
            "node.js" | "node" => {
                generated.push("nodejs".to_string());
                generated.push("node.js".to_string());
            }
            "go" => {
                generated.push("golang".to_string());
            }
            "rust" => {
                generated.push("rustlang".to_string());
            }
            "typescript" => {
                // "ts" rejected
            }
            "kubernetes" => {
                generated.push("k8s".to_string());
            }
            "postgres" | "postgresql" => {
                generated.push("postgres".to_string());
                generated.push("postgresql".to_string());
            }
            "spring-boot" | "spring" => {
                generated.push("springboot".to_string());
                generated.push("spring boot".to_string());
            }
            "solid" | "solidjs" => {
                generated.push("solidjs".to_string());
            }
            "express" | "expressjs" => {
                generated.push("expressjs".to_string());
                generated.push("express.js".to_string());
            }
            "bun" | "bunjs" => {
                generated.push("bunjs".to_string());
            }
            _ => {}
        }

        // Deduplicate and filter unsafe again just in case
        let mut final_aliases = Vec::new();
        for a in generated {
            if !UNSAFE_HIRING_ALIASES.contains(&a.as_str()) && !final_aliases.contains(&a) {
                final_aliases.push(a);
            }
        }

        if !final_aliases.is_empty() {
            sqlx::query(
                "UPDATE repositories SET aliases = $1 WHERE id = $2"
            )
            .bind(&final_aliases)
            .bind(id)
            .execute(pool)
            .await?;

            repos_updated += 1;
            total_aliases_generated += final_aliases.len() as i64;
        }
    }

    Ok((repos_updated, total_aliases_generated))
}

pub async fn rebuild_hiring_data(pool: &PgPool) -> Result<i64, sqlx::Error> {
    // 1. Truncate job_mentions
    sqlx::query("TRUNCATE TABLE job_mentions").execute(pool).await?;

    // 2. Fetch all repos with aliases
    let repos = sqlx::query(
        "SELECT id, aliases FROM repositories WHERE array_length(aliases, 1) > 0"
    ).fetch_all(pool).await?;

    let mut mapped_count = 0;

    for r in repos {
        use sqlx::Row;
        let repo_id: Uuid = r.get("id");
        let aliases: Vec<String> = r.get("aliases");

        for alias in aliases {
            let inserted = sqlx::query(
                r#"
                INSERT INTO job_mentions (repo_id, company_name, job_title, source_url, posted_at)
                SELECT 
                    $1, 
                    company_name, 
                    job_title, 
                    source_url, 
                    posted_at
                FROM raw_job_posts
                WHERE NOT (LOWER($2) = ANY($3))
                  AND to_tsvector('english', content) @@ plainto_tsquery('english', $2)
                ON CONFLICT ON CONSTRAINT unique_job_mention DO NOTHING;
                "#
            )
            .bind(repo_id)
            .bind(&alias)
            .bind(UNSAFE_HIRING_ALIASES)
            .execute(pool)
            .await?
            .rows_affected();

            mapped_count += inserted;
        }
    }

    Ok(mapped_count as i64)
}
