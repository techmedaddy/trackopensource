pub fn categorize_repo(language: Option<&str>, name: &str, description: Option<&str>) -> Vec<String> {
    let haystack = format!(
        "{} {} {}",
        language.unwrap_or_default(),
        name,
        description.unwrap_or_default()
    )
    .to_lowercase();

    let mut categories = Vec::new();

    match language.unwrap_or_default().to_lowercase().as_str() {
        "rust" => categories.push("Rust".to_string()),
        "go" => categories.push("Go".to_string()),
        "python" => categories.push("Python".to_string()),
        _ => {}
    }

    add_if(&mut categories, "AI", &haystack, &["ai", "llm", "machine learning", "ml", "model", "inference"]);
    add_if(&mut categories, "Database", &haystack, &["database", "postgres", "mysql", "sqlite", "vector", "warehouse"]);
    add_if(&mut categories, "Infrastructure", &haystack, &["infrastructure", "runtime", "kernel", "cloud", "distributed"]);
    add_if(&mut categories, "DevOps", &haystack, &["devops", "ci", "deploy", "docker", "kubernetes", "observability"]);
    add_if(&mut categories, "Frontend", &haystack, &["frontend", "react", "vue", "css", "browser", "ui"]);
    add_if(&mut categories, "Backend", &haystack, &["backend", "api", "server", "framework", "http"]);
    add_if(&mut categories, "Security", &haystack, &["security", "auth", "encryption", "vulnerability", "secret"]);
    add_if(&mut categories, "Rust", &haystack, &["rust"]);
    add_if(&mut categories, "Go", &haystack, &["golang"]);
    add_if(&mut categories, "Python", &haystack, &["python"]);

    if categories.is_empty() {
        if let Some(language) = language {
            categories.push(language.to_string());
        }
    }

    categories.sort();
    categories.dedup();
    categories
}

fn add_if(categories: &mut Vec<String>, label: &str, haystack: &str, needles: &[&str]) {
    if needles.iter().any(|needle| haystack.contains(needle)) {
        categories.push(label.to_string());
    }
}
