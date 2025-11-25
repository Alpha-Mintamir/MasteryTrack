use thiserror::Error;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Timer is already running")]
    TimerAlreadyRunning,
    #[error("No active timer to stop")]
    TimerNotRunning,
    #[error("Unsupported export format")]
    UnsupportedExportFormat,
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Serialization error: {0}")]
    Serde(#[from] serde_json::Error),
    #[error("Time parsing error: {0}")]
    Chrono(#[from] chrono::ParseError),
    #[error("{0}")]
    Custom(String),
}

impl From<anyhow::Error> for AppError {
    fn from(value: anyhow::Error) -> Self {
        Self::Custom(value.to_string())
    }
}
