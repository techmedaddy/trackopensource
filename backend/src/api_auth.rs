use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use deadpool_redis::redis::AsyncCommands;
use sha2::{Digest, Sha256};
use crate::routes::AppState;

pub async fn require_api_key(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let key_header = req
        .headers()
        .get("x-api-key")
        .and_then(|h| h.to_str().ok());

    let raw_key = match key_header {
        Some(k) => k,
        None => {
            tracing::warn!("Missing x-api-key header");
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // Hash the provided key to look it up in DB
    let mut hasher = Sha256::new();
    hasher.update(raw_key.as_bytes());
    let key_hash = format!("{:x}", hasher.finalize());

    // 1. Verify API Key in Postgres
    // Check if the key exists and grab the user_id
    let record = sqlx::query!(
        r#"
        UPDATE api_keys 
        SET last_used_at = CURRENT_TIMESTAMP
        WHERE key_hash = $1
        RETURNING user_id
        "#,
        key_hash
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error while verifying API key: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let user_id = match record {
        Some(r) => r.user_id,
        None => {
            tracing::warn!("Invalid API Key provided");
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // 2. Rate Limiting via Redis
    // We will allow 100 requests per minute per user_id.
    let mut redis_conn = match state.redis_pool.get().await {
        Ok(conn) => conn,
        Err(e) => {
            tracing::error!("Failed to get Redis connection: {}", e);
            // Fail open or fail closed? Fail closed for enterprise API.
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let rate_limit_key = format!("rate_limit:api_key:{}", user_id);
    
    // Increment the counter
    let count: i32 = redis_conn.incr(&rate_limit_key, 1).await.map_err(|e| {
        tracing::error!("Redis INCR failed: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // If it's the first request in the window, set the expiry to 60 seconds
    if count == 1 {
        let _: () = redis_conn.expire(&rate_limit_key, 60).await.map_err(|e| {
            tracing::error!("Redis EXPIRE failed: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;
    }

    // 100 requests per 60 seconds
    if count > 100 {
        tracing::warn!("Rate limit exceeded for user {}", user_id);
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

    // Inject the user_id into the request extensions so downstream handlers can use it if they want
    req.extensions_mut().insert(user_id);

    // Continue to the handler
    Ok(next.run(req).await)
}
