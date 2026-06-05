use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("{0}")]
    RateLimit(String),
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, client_message) = match &self {
            AppError::Database(sqlx::Error::RowNotFound) => {
                (StatusCode::NOT_FOUND, "Resource not found".to_string())
            }
            AppError::RateLimit(msg) => {
                (StatusCode::TOO_MANY_REQUESTS, msg.clone())
            }
            AppError::Database(e) => {
                // Log the real error server-side but never expose it to the client
                tracing::error!("Internal database error: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "An internal error occurred".to_string())
            }
        };

        let body = Json(ErrorBody {
            error: client_message,
        });

        (status, body).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
