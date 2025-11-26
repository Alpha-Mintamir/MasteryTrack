use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use chrono::Utc;
use tokio::sync::{Mutex, RwLock};
use sysinfo::System;
use tauri::{AppHandle, Emitter};

use crate::db;
use crate::errors::{AppError, AppResult};
use crate::models::{
    ActiveSession, AppSettings, ReflectionInput, StartTimerResponse, TimerStatus,
};

#[derive(Clone)]
pub struct TimerService {
    inner: Arc<TimerInner>,
}

struct TimerInner {
    pool: sqlx::SqlitePool,
    state: Mutex<Option<ActiveSession>>,
    settings: Arc<RwLock<AppSettings>>,
    db_path: PathBuf,
}

impl TimerService {
    pub fn new(
        pool: sqlx::SqlitePool,
        settings: Arc<RwLock<AppSettings>>,
        db_path: PathBuf,
    ) -> Self {
        Self {
            inner: Arc::new(TimerInner {
                pool,
                state: Mutex::new(None),
                settings,
                db_path,
            }),
        }
    }

    pub async fn start(&self) -> AppResult<StartTimerResponse> {
        let mut guard = self.inner.state.lock().await;
        if guard.is_some() {
            return Err(AppError::TimerAlreadyRunning);
        }

        let settings = self.inner.settings.read().await.clone();
        let skill_id = db::ensure_skill(&self.inner.pool, &settings.skill_name).await?;
        let now = Utc::now();
        let session_id = db::insert_session(&self.inner.pool, skill_id, now).await?;

        let active = ActiveSession {
            session_id,
            skill_id,
            started_at: now,
            last_resume_at: now,
            accumulated_seconds: 0,
            auto_paused: false,
            last_reason: None,
        };
        *guard = Some(active);

        Ok(StartTimerResponse {
            session_id,
            started_at: now,
        })
    }

    pub async fn stop(&self, reflections: ReflectionInput) -> AppResult<f64> {
        self.stop_internal(reflections, None).await
    }

    pub async fn force_pause(&self, reason: &str) -> AppResult<Option<f64>> {
        let reflections = ReflectionInput {
            notes: Some(format!("Auto pause: {reason}")),
            what_practiced: None,
            what_learned: None,
            next_focus: None,
        };

        match self.stop_internal(reflections, Some(reason.to_string())).await {
            Ok(v) => Ok(Some(v)),
            Err(AppError::TimerNotRunning) => Ok(None),
            Err(err) => Err(err),
        }
    }

    async fn stop_internal(
        &self,
        reflections: ReflectionInput,
        reason: Option<String>,
    ) -> AppResult<f64> {
        let mut guard = self.inner.state.lock().await;
        let active = guard.take().ok_or(AppError::TimerNotRunning)?;
        drop(guard);

        let total_seconds = active.elapsed_seconds();
        let minutes = (total_seconds as f64 / 60.0).max(0.0);

        db::finalize_session(&self.inner.pool, active.session_id, minutes, &reflections).await?;

        if let Some(reason) = reason {
            log::info!("Timer auto-paused due to {reason}");
        }

        Ok(minutes)
    }

    pub async fn status(&self) -> TimerStatus {
        let guard = self.inner.state.lock().await;
        if let Some(active) = guard.as_ref() {
            return active.as_status();
        }
        TimerStatus {
            running: false,
            started_at: None,
            elapsed_seconds: 0,
            auto_paused: false,
            last_reason: None,
        }
    }

    pub async fn active_seconds(&self) -> i64 {
        let guard = self.inner.state.lock().await;
        guard.as_ref().map(|a| a.elapsed_seconds()).unwrap_or(0)
    }

    pub async fn settings(&self) -> AppSettings {
        self.inner.settings.read().await.clone()
    }

    pub async fn update_settings(&self, settings: AppSettings) {
        let mut guard = self.inner.settings.write().await;
        *guard = settings;
    }

    pub fn db_path(&self) -> PathBuf {
        self.inner.db_path.clone()
    }
}

pub async fn idle_monitor(
    timer: TimerService,
    app: tauri::AppHandle,
) {
    loop {
        {
            let settings = timer.settings().await;
            if settings.idle_timeout_minutes > 0 {
                if let Ok(idle) = user_idle_time::get_idle_time() {
                    if idle.as_secs() as i64 >= settings.idle_timeout_minutes * 60 {
                        if let Ok(Some(_)) = timer.force_pause("idle").await {
                            let _ = app.emit("timer:auto-paused", &reason_payload("Idle timeout"));
                        }
                    }
                }
            }
        }
        tokio::time::sleep(Duration::from_secs(30)).await;
    }
}

pub async fn productivity_monitor(
    timer: TimerService,
    app: tauri::AppHandle,
) {
    loop {
        let settings = timer.settings().await;
        if settings.productivity_mode_enabled {
            let mut offending = Vec::new();
            let mut allowed_match = settings.allowed_apps.is_empty();
            let mut blocked_hit = false;

            let mut sys = System::new();
            sys.refresh_processes();

            for process in sys.processes().values() {
                let name = process.name().to_ascii_lowercase();
                if !allowed_match && settings.allowed_apps.iter().any(|a| name.contains(&a.to_ascii_lowercase())) {
                    allowed_match = true;
                }
                if settings.blocked_apps.iter().any(|b| name.contains(&b.to_ascii_lowercase())) {
                    blocked_hit = true;
                    offending.push(process.name().to_string());
                }
            }

            if (!allowed_match || blocked_hit) && timer.status().await.running {
                if let Ok(Some(_)) = timer.force_pause("productivity mode").await {
                    let reason = if blocked_hit {
                        format!("Blocked apps: {}", offending.join(", "))
                    } else {
                        "No focus app active".into()
                    };
                    let _ = app.emit("timer:auto-paused", &reason_payload(&reason));
                }
            }
        }

        tokio::time::sleep(Duration::from_secs(20)).await;
    }
}

fn reason_payload(reason: &str) -> serde_json::Value {
    serde_json::json!({ "reason": reason })
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    #[test]
    fn active_session_elapsed_includes_accumulated_time() {
        let now = Utc::now();
        let session = ActiveSession {
            session_id: 1,
            skill_id: 1,
            started_at: now - Duration::minutes(10),
            last_resume_at: now - Duration::seconds(120),
            accumulated_seconds: 240,
            auto_paused: false,
            last_reason: None,
        };

        let elapsed = session.elapsed_seconds();
        assert!(
            elapsed >= 360,
            "elapsed seconds should include accumulated + current span"
        );
    }

    #[test]
    fn active_session_status_reflects_pause_state() {
        let session = ActiveSession {
            session_id: 1,
            skill_id: 1,
            started_at: Utc::now(),
            last_resume_at: Utc::now(),
            accumulated_seconds: 0,
            auto_paused: true,
            last_reason: Some("idle".into()),
        };
        let status = session.as_status();
        assert!(!status.running, "running flag should respect auto pause");
        assert_eq!(status.last_reason.as_deref(), Some("idle"));
    }
}
