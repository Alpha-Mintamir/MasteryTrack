use std::{path::PathBuf, sync::Arc, time::Duration};

use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use parking_lot::Mutex;
use serde::Serialize;
use log::warn;
use tauri::{AppHandle, Emitter, Wry};
use tauri::tray::TrayIcon;
use tauri_plugin_notification::NotificationExt;
use tokio::time::interval;
use user_idle::UserIdle;

use crate::{
    db::DbLayer,
    models::{AppSettings, ReflectionInput, SessionRecord},
    productivity::ProductivityConfig,
};

#[derive(Clone, Default)]
pub struct TrayController {
    icon: Arc<Mutex<Option<TrayIcon<Wry>>>>,
}

impl TrayController {
    pub fn set_icon(&self, icon: TrayIcon<Wry>) {
        *self.icon.lock() = Some(icon);
    }

    pub fn set_tooltip(&self, text: &str) {
        if let Some(icon) = &*self.icon.lock() {
            let _ = icon.set_tooltip(Some(text));
        }
    }
}

#[derive(Clone)]
pub struct TimerManager {
    inner: Arc<Mutex<TimerInner>>,
    handle: AppHandle,
    db: Arc<DbLayer>,
    tray: TrayController,
}

struct TimerInner {
    active: Option<ActiveSession>,
    idle_timeout: Duration,
    productivity: ProductivityConfig,
}

#[derive(Clone)]
struct ActiveSession {
    session_id: i64,
    skill_id: i64,
    skill_name: String,
    started_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Clone)]
pub struct TimerStatusPayload {
    pub running: bool,
    pub session_id: Option<i64>,
    pub started_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
pub struct TimerTickPayload {
    pub session_id: i64,
    pub started_at: DateTime<Utc>,
    pub elapsed_seconds: i64,
}

impl TimerManager {
    pub fn new(
        handle: &AppHandle,
        tray: TrayController,
        db: Arc<DbLayer>,
        settings: &AppSettings,
    ) -> Self {
        let manager = Self {
            inner: Arc::new(Mutex::new(TimerInner {
                active: None,
                idle_timeout: settings
                    .idle_timeout_duration()
                    .to_std()
                    .unwrap_or_else(|_| Duration::from_secs(300)),
                productivity: ProductivityConfig::from_settings(settings),
            })),
            handle: handle.clone(),
            db,
            tray,
        };
        manager.spawn_tick_loop();
        manager.spawn_idle_loop();
        manager
    }

    pub fn apply_settings(&self, settings: &AppSettings) {
        let mut guard = self.inner.lock();
        guard.idle_timeout = settings
            .idle_timeout_duration()
            .to_std()
            .unwrap_or(Duration::from_secs(300));
        guard.productivity = ProductivityConfig::from_settings(settings);
    }

    pub fn start(&self, maybe_skill: Option<String>) -> Result<SessionRecord> {
        {
            let guard = self.inner.lock();
            if guard.active.is_some() {
                return Err(anyhow!("Timer is already running"));
            }
        }

        let settings = self.db.load_settings()?;
        self.apply_settings(&settings);
        let focus_name = maybe_skill.unwrap_or(settings.target_skill_name.clone());

        {
            let guard = self.inner.lock();
            guard.productivity.validate().map_err(|msg| anyhow!(msg))?;
        }

        let skill_id = self.db.ensure_skill(&focus_name)?;
        let session = self.db.insert_session(skill_id, &focus_name, Utc::now())?;

        {
            let mut guard = self.inner.lock();
            guard.active = Some(ActiveSession {
                session_id: session.id,
                skill_id,
                skill_name: focus_name,
                started_at: session.start_time,
            });
        }

        self.emit_status(true);
        Ok(session)
    }

    pub fn stop(&self, reflection: Option<ReflectionInput>) -> Result<SessionRecord> {
        let session_id = {
            let mut guard = self.inner.lock();
            if let Some(active) = guard.active.take() {
                active.session_id
            } else {
                return Err(anyhow!("No active timer"));
            }
        };

        let session = self.db.complete_session(session_id, reflection)?;
        self.emit_status(false);
        self.maybe_notify_goal()?;
        Ok(session)
    }

    pub fn force_stop_idle(&self, reason: &str) -> Result<Option<SessionRecord>> {
        let active = {
            let mut guard = self.inner.lock();
            guard.active.take()
        };

        if let Some(active) = active {
            let reflection = ReflectionInput {
                practiced: None,
                learned: None,
                next_focus: None,
                notes: Some(reason.to_string()),
            };
            let session = self
                .db
                .complete_session(active.session_id, Some(reflection))?;
            self.emit_status(false);
            self.notify("Timer paused", reason)?;
            Ok(Some(session))
        } else {
            Ok(None)
        }
    }

    pub fn active(&self) -> Option<SessionRecord> {
        let guard = self.inner.lock();
        guard.active.as_ref().map(|active| SessionRecord {
            id: active.session_id,
            skill_id: active.skill_id,
            skill_name: active.skill_name.clone(),
            start_time: active.started_at,
            end_time: None,
            duration_minutes: 0,
            reflection_practice: None,
            reflection_learning: None,
            reflection_next: None,
            notes: None,
        })
    }

    fn spawn_tick_loop(&self) {
        let inner = self.inner.clone();
        let handle = self.handle.clone();
        let tray = self.tray.clone();
        tauri::async_runtime::spawn(async move {
            let mut ticker = interval(Duration::from_secs(1));
            loop {
                ticker.tick().await;
                let payload = {
                    let guard = inner.lock();
                    guard.active.as_ref().map(|active| {
                        let elapsed = (Utc::now() - active.started_at).num_seconds().max(0);
                        TimerTickPayload {
                            session_id: active.session_id,
                            started_at: active.started_at,
                            elapsed_seconds: elapsed,
                        }
                    })
                };
                if let Some(tick) = payload {
                    let tooltip = format!("Practicing {}", format_elapsed(tick.elapsed_seconds));
                    let _ = handle.emit("timer://tick", &tick);
                    tray.set_tooltip(&tooltip);
                }
            }
        });
    }

    fn spawn_idle_loop(&self) {
        let manager = self.clone();
        tauri::async_runtime::spawn(async move {
            let mut ticker = interval(Duration::from_secs(30));
            loop {
                ticker.tick().await;
                manager.check_idle().ok();
            }
        });
    }

    fn check_idle(&self) -> Result<()> {
        let idle_timeout = {
            let guard = self.inner.lock();
            guard.active.as_ref().map(|_| guard.idle_timeout)
        };

        if let Some(timeout) = idle_timeout {
            if let Ok(idle) = UserIdle::get_time() {
                if idle.duration() >= timeout {
                    let _ = self.force_stop_idle("Timer auto-paused after detecting inactivity");
                }
            } else {
                warn!("Unable to read system idle time");
            }
        }

        Ok(())
    }

    fn emit_status(&self, running: bool) {
        let payload = {
            let guard = self.inner.lock();
            TimerStatusPayload {
                running,
                session_id: guard.active.as_ref().map(|s| s.session_id),
                started_at: guard.active.as_ref().map(|s| s.started_at),
            }
        };
        let _ = self.handle.emit("timer://status", payload);
        if running {
            if let Some(active) = self.active() {
                let elapsed = (Utc::now() - active.start_time).num_seconds().max(0);
                self.tray
                    .set_tooltip(&format!("Practicing {}", format_elapsed(elapsed)));
            }
        } else {
            self.tray.set_tooltip("MasteryTrack — paused");
        }
    }

    fn notify(&self, title: &str, body: &str) -> Result<()> {
        let _ = self
            .handle
            .notification()
            .builder()
            .title(title.to_string())
            .body(body.to_string())
            .show();
        Ok(())
    }

    fn maybe_notify_goal(&self) -> Result<()> {
        let settings = self.db.load_settings()?;
        let stats = self.db.dashboard_stats(&settings)?;
        if stats.daily_goal.completed_minutes >= stats.daily_goal.goal_minutes {
            self.notify(
                "Daily goal met",
                "Nice work — you hit today's practice target!",
            )?;
        }

        if let Some(path) = settings.auto_backup_path.clone() {
            let backup_dir = PathBuf::from(path);
            match self.db.backup_to(&backup_dir) {
                Ok(file) => {
                    self.notify("Backup saved", &format!("Snapshot saved to {}", file))
                        .ok();
                }
                Err(err) => {
                    warn!("Backup failed: {err:?}");
                }
            }
        }

        Ok(())
    }
}

fn format_elapsed(seconds: i64) -> String {
    let hours = seconds / 3600;
    let minutes = (seconds % 3600) / 60;
    let secs = seconds % 60;
    if hours > 0 {
        format!("{hours:02}:{minutes:02}:{secs:02} h")
    } else {
        format!("{minutes:02}:{secs:02} min")
    }
}

#[cfg(test)]
mod tests {
    use super::format_elapsed;

    #[test]
    fn formats_minutes_only() {
        assert_eq!(format_elapsed(125), "02:05 min");
        assert_eq!(format_elapsed(59), "00:59 min");
    }

    #[test]
    fn formats_hours() {
        assert_eq!(format_elapsed(3661), "01:01:01 h");
        assert_eq!(format_elapsed(86399), "23:59:59 h");
    }
}
