use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::fmt::Display;
use std::str::FromStr;
use crate::errors::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SessionRecord {
    pub id: i64,
    pub skill_id: i64,
    pub start_time: String,
    pub end_time: Option<String>,
    pub duration_minutes: Option<f64>,
    pub notes: Option<String>,
    pub what_practiced: Option<String>,
    pub what_learned: Option<String>,
    pub next_focus: Option<String>,
}

impl SessionRecord {
    pub fn start_instant(&self) -> AppResult<DateTime<Utc>> {
        Ok(DateTime::parse_from_rfc3339(&self.start_time)?.with_timezone(&Utc))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionHistoryRow {
    pub id: i64,
    pub start: DateTime<Utc>,
    pub end: Option<DateTime<Utc>>,
    pub duration_minutes: f64,
    pub notes: Option<String>,
    pub what_practiced: Option<String>,
    pub what_learned: Option<String>,
    pub next_focus: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflectionInput {
    pub notes: Option<String>,
    pub what_practiced: Option<String>,
    pub what_learned: Option<String>,
    pub next_focus: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimerStatus {
    pub running: bool,
    pub started_at: Option<DateTime<Utc>>,
    pub elapsed_seconds: i64,
    pub auto_paused: bool,
    pub last_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartTimerResponse {
    pub session_id: i64,
    pub started_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub today_hours: f64,
    pub week_hours: f64,
    pub month_hours: f64,
    pub total_hours: f64,
    pub goal_progress: f64,
    pub total_hours_target: f64,
    pub daily_goal_hours: f64,
    pub todays_goal_hours: f64,
    pub streak_days: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SettingsRow {
    pub id: i64,
    pub skill_name: String,
    pub daily_goal_minutes: i64,
    pub idle_timeout_minutes: i64,
    pub productivity_mode_enabled: i64,
    pub allowed_apps: String,
    pub blocked_apps: String,
    pub auto_backup_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub skill_name: String,
    pub daily_goal_minutes: i64,
    pub idle_timeout_minutes: i64,
    pub productivity_mode_enabled: bool,
    pub allowed_apps: Vec<String>,
    pub blocked_apps: Vec<String>,
    pub auto_backup_path: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            skill_name: "Primary Skill".into(),
            daily_goal_minutes: 120,
            idle_timeout_minutes: 5,
            productivity_mode_enabled: false,
            allowed_apps: Vec::new(),
            blocked_apps: Vec::new(),
            auto_backup_path: None,
        }
    }
}

impl From<SettingsRow> for AppSettings {
    fn from(value: SettingsRow) -> Self {
        Self {
            skill_name: value.skill_name,
            daily_goal_minutes: value.daily_goal_minutes,
            idle_timeout_minutes: value.idle_timeout_minutes,
            productivity_mode_enabled: value.productivity_mode_enabled == 1,
            allowed_apps: serde_json::from_str(&value.allowed_apps).unwrap_or_default(),
            blocked_apps: serde_json::from_str(&value.blocked_apps).unwrap_or_default(),
            auto_backup_path: value.auto_backup_path,
        }
    }
}

impl AppSettings {
    pub fn to_row(&self) -> AppResult<(i64, &str, i64, i64, i64, String, String, Option<String>)> {
        Ok((
            1,
            &self.skill_name,
            self.daily_goal_minutes,
            self.idle_timeout_minutes,
            if self.productivity_mode_enabled { 1 } else { 0 },
            serde_json::to_string(&self.allowed_apps)?,
            serde_json::to_string(&self.blocked_apps)?,
            self.auto_backup_path.clone(),
        ))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionEditPayload {
    pub id: i64,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub duration_minutes: f64,
    pub notes: Option<String>,
    pub what_practiced: Option<String>,
    pub what_learned: Option<String>,
    pub next_focus: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportRequest {
    pub format: ExportFormat,
    pub target_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExportFormat {
    Csv,
    Json,
}

impl Display for ExportFormat {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExportFormat::Csv => write!(f, "csv"),
            ExportFormat::Json => write!(f, "json"),
        }
    }
}

impl FromStr for ExportFormat {
    type Err = AppError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "csv" => Ok(Self::Csv),
            "json" => Ok(Self::Json),
            _ => Err(AppError::UnsupportedExportFormat),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductivitySnapshot {
    pub allowed_active: bool,
    pub blocked_triggered: bool,
    pub offending_processes: Vec<String>,
    pub timestamp: DateTime<Utc>,
}

impl ProductivitySnapshot {
    pub fn idle(minutes: i64) -> Self {
        Self {
            allowed_active: true,
            blocked_triggered: false,
            offending_processes: Vec::new(),
            timestamp: Utc::now() + Duration::minutes(minutes),
        }
    }
}

#[derive(Debug, Clone)]
pub struct ActiveSession {
    pub session_id: i64,
    pub skill_id: i64,
    pub started_at: DateTime<Utc>,
    pub last_resume_at: DateTime<Utc>,
    pub accumulated_seconds: i64,
    pub auto_paused: bool,
    pub last_reason: Option<String>,
}

impl ActiveSession {
    pub fn elapsed_seconds(&self) -> i64 {
        let since_resume = (Utc::now() - self.last_resume_at).num_seconds();
        self.accumulated_seconds + since_resume.max(0)
    }

    pub fn as_status(&self) -> TimerStatus {
        TimerStatus {
            running: !self.auto_paused,
            started_at: Some(self.started_at),
            elapsed_seconds: self.elapsed_seconds(),
            auto_paused: self.auto_paused,
            last_reason: self.last_reason.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoalNotification {
    pub achieved_at: DateTime<Utc>,
    pub total_minutes: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillSummary {
    pub id: i64,
    pub skill_name: String,
    pub total_minutes: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSkillPayload {
    pub skill_name: String,
}
