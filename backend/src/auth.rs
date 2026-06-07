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
    pub iss: Option<String>,
    pub azp: Option<String>,
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
        tracing::warn!("CLERK_PEM_PUBLIC_KEY is not configured. Bypassing auth for local development.");
        req.extensions_mut().insert(Claims {
            sub: "local_dev_user".to_string(),
            exp: 0,
            iss: None,
            azp: None,
        });
        return Ok(next.run(req).await);
    }

    let decoding_key = match DecodingKey::from_rsa_pem(pem.as_bytes()) {
        Ok(key) => key,
        Err(e) => {
            tracing::error!("Failed to parse PEM public key: {}", e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let mut validation = Validation::new(Algorithm::RS256);
    // Clerk tokens don't carry a standard `aud` claim, so we disable that check.
    // Instead we enforce two alternative guarantees:
    //   1. `iss` — ensures the token came from our specific Clerk instance
    //   2. `azp` — ensures it was minted for our frontend app (checked post-decode)
    validation.validate_aud = false;
    
    // Enforce issuer — reject tokens from other Clerk instances
    let clerk_issuer = std::env::var("CLERK_ISSUER")
        .unwrap_or_else(|_| "".to_string());
    if clerk_issuer.is_empty() {
        tracing::error!("CLERK_ISSUER is not configured — cannot validate tokens");
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }
    validation.set_issuer(&[&clerk_issuer]);

    let token_data = match decode::<Claims>(token, &decoding_key, &validation) {
        Ok(data) => data,
        Err(e) => {
            tracing::warn!("Invalid JWT token: {}", e);
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // Validate azp (authorized party) if configured — ensures the token
    // was issued for our specific frontend application, not a different Clerk app
    if let Ok(expected_azp) = std::env::var("CLERK_AZP") {
        match &token_data.claims.azp {
            Some(azp) if azp == &expected_azp => {},
            Some(azp) => {
                tracing::warn!("JWT azp mismatch: expected {}, got {}", expected_azp, azp);
                return Err(StatusCode::UNAUTHORIZED);
            }
            None => {
                tracing::warn!("JWT missing azp claim");
                return Err(StatusCode::UNAUTHORIZED);
            }
        }
    }

    req.extensions_mut().insert(token_data.claims);

    Ok(next.run(req).await)
}
