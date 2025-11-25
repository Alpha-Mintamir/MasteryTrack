use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionRecord {
    pub id: i64,
    pub skill_id: i64,
    pub skill_name: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub duration_minutes: i64,
    pub reflection_practice: Option<String>,
    pub reflection_learning: Option<String>,
    pub reflection_next: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflectionInput {
    pub practiced: Option<String>,
    pub learned: Option<String>,
    pub next_focus: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionEditPayload {
    pub id: i64,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub notes: Option<String>,
    pub reflection_practice: Option<String>,
    pub reflection_learning: Option<String>,
    pub reflection_next: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub today_minutes: i64,
    pub week_minutes: i64,
    pub month_minutes: i64,
    pub total_minutes: i64,
    pub ten_k_progress: ProgressSlice,
    pub daily_goal: GoalProgress,
    pub streak_days: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressSlice {
    pub percentage: f32,
    pub remaining_minutes: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoalProgress {
    pub goal_minutes: i64,
    pub completed_minutes: i64,
    pub percentage: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub id: i64,
    pub target_skill_name: String,
    pub skill_id: i64,
    pub daily_goal_minutes: i64,
    pub idle_timeout_minutes: i64,
    pub productivity_mode_enabled: bool,
    pub productivity_allowlist: Vec<String>,
    pub productivity_blocklist: Vec<String>,
    pub auto_backup_path: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            id: 1,
            target_skill_name: "Deep Work".into(),
            skill_id: 1,
            daily_goal_minutes: 120,
            idle_timeout_minutes: 5,
            productivity_mode_enabled: false,
            productivity_allowlist: vec![],
            productivity_blocklist: vec![],
            auto_backup_path: None,
        }
    }
}

impl AppSettings {
    pub fn idle_timeout_duration(&self) -> Duration {
        Duration::minutes(self.idle_timeout_minutes.max(1))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsUpdate {
    pub target_skill_name: Option<String>,
    pub daily_goal_minutes: Option<i64>,
    pub idle_timeout_minutes: Option<i64>,
    pub productivity_mode_enabled: Option<bool>,
    pub productivity_allowlist: Option<Vec<String>>,
    pub productivity_blocklist: Option<Vec<String>>,
    pub auto_backup_path: Option<Option<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionFilter {
    pub limit: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionCollection {
    pub data: Vec<SessionRecord>,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportPayload {
    pub path: String,
    pub format: ExportFormat,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Csv,
    Json,
}

impl ExportFormat {
    pub fn file_extension(&self) -> &str {
        match self {
            ExportFormat::Csv => "csv",
            ExportFormat::Json => "json",
        }
    }
}
