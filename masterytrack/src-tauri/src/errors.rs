use serde::{Deserialize, Serialize};
use thiserror::Error;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Error, Serialize, Deserialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Timer is already running")]
    TimerAlreadyRunning,
    #[error("No active timer to stop")]
    TimerNotRunning,
    #[error("Unsupported export format")]
    UnsupportedExportFormat,
    #[error("I/O error: {0}")]
    Io(String),
    #[error("Serialization error: {0}")]
    Serde(String),
    #[error("Time parsing error: {0}")]
    Chrono(String),
    #[error("CSV error: {0}")]
    Csv(String),
    #[error("CSV inner error: {0}")]
    CsvInner(String),
    #[error("Tauri error: {0}")]
    Tauri(String),
    #[error("{0}")]
    Custom(String),
}

impl From<anyhow::Error> for AppError {
    fn from(value: anyhow::Error) -> Self {
        Self::Custom(value.to_string())
    }
}

impl From<sqlx::Error> for AppError {
    fn from(value: sqlx::Error) -> Self {
        Self::Database(value.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(value: serde_json::Error) -> Self {
        Self::Serde(value.to_string())
    }
}

impl From<chrono::ParseError> for AppError {
    fn from(value: chrono::ParseError) -> Self {
        Self::Chrono(value.to_string())
    }
}

impl From<csv::Error> for AppError {
    fn from(value: csv::Error) -> Self {
        Self::Csv(value.to_string())
    }
}

impl From<csv::IntoInnerError<csv::Writer<Vec<u8>>>> for AppError {
    fn from(value: csv::IntoInnerError<csv::Writer<Vec<u8>>>) -> Self {
        Self::CsvInner(value.to_string())
    }
}

impl From<tauri::Error> for AppError {
    fn from(value: tauri::Error) -> Self {
        Self::Tauri(value.to_string())
    }
}
