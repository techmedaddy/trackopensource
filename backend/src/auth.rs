use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

pub async fn require_auth(
    mut req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .filter(|s| s.starts_with("Bearer "))
        .map(|s| s.trim_start_matches("Bearer "));

    let token = match auth_header {
        Some(token) => token,
        None => {
            tracing::warn!("Missing or invalid Authorization header");
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // Replace literal \n with actual newlines if the env var was passed as a single line
    let pem_raw = std::env::var("CLERK_PEM_PUBLIC_KEY")
        .unwrap_or_else(|_| "".to_string());
    
    let pem = pem_raw.replace("\\n", "\n");

    if pem.is_empty() {
        tracing::error!("CLERK_PEM_PUBLIC_KEY is not configured");
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    let decoding_key = match DecodingKey::from_rsa_pem(pem.as_bytes()) {
        Ok(key) => key,
        Err(e) => {
            tracing::error!("Failed to parse PEM public key: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let mut validation = Validation::new(Algorithm::RS256);
    validation.validate_aud = false; 

    let token_data = match decode::<Claims>(token, &decoding_key, &validation) {
        Ok(data) => data,
        Err(e) => {
            tracing::warn!("Invalid JWT token: {}", e);
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    req.extensions_mut().insert(token_data.claims);

    Ok(next.run(req).await)
}
