use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimerState {
    pub is_running: bool,
    pub session_id: Option<i64>,
    pub start_time: Option<String>,
    pub elapsed_seconds: u64,
    pub is_paused: bool,
    pub last_activity: Option<Instant>,
}

impl Default for TimerState {
    fn default() -> Self {
        Self {
            is_running: false,
            session_id: None,
            start_time: None,
            elapsed_seconds: 0,
            is_paused: false,
            last_activity: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimerInfo {
    pub is_running: bool,
    pub elapsed_seconds: u64,
    pub is_paused: bool,
    pub start_time: Option<String>,
}

pub struct Timer {
    state: Arc<RwLock<TimerState>>,
}

impl Timer {
    pub fn new() -> Self {
        Self {
            state: Arc::new(RwLock::new(TimerState::default())),
        }
    }

    pub async fn start(&self, session_id: i64) {
        let mut state = self.state.write().await;
        state.is_running = true;
        state.session_id = Some(session_id);
        state.start_time = Some(Utc::now().to_rfc3339());
        state.elapsed_seconds = 0;
        state.is_paused = false;
        state.last_activity = Some(Instant::now());
    }

    pub async fn stop(&self) -> Option<i64> {
        let mut state = self.state.write().await;
        let session_id = state.session_id;
        state.is_running = false;
        state.session_id = None;
        state.start_time = None;
        state.elapsed_seconds = 0;
        state.is_paused = false;
        state.last_activity = None;
        session_id
    }

    pub async fn pause(&self) {
        let mut state = self.state.write().await;
        state.is_paused = true;
    }

    pub async fn resume(&self) {
        let mut state = self.state.write().await;
        state.is_paused = false;
        state.last_activity = Some(Instant::now());
    }

    pub async fn tick(&self) {
        let mut state = self.state.write().await;
        if state.is_running && !state.is_paused {
            state.elapsed_seconds += 1;
        }
    }

    pub async fn get_info(&self) -> TimerInfo {
        let state = self.state.read().await;
        TimerInfo {
            is_running: state.is_running,
            elapsed_seconds: state.elapsed_seconds,
            is_paused: state.is_paused,
            start_time: state.start_time.clone(),
        }
    }

    pub async fn is_running(&self) -> bool {
        let state = self.state.read().await;
        state.is_running
    }

    pub async fn update_activity(&self) {
        let mut state = self.state.write().await;
        state.last_activity = Some(Instant::now());
    }

    pub async fn check_idle(&self, idle_timeout_seconds: u64) -> bool {
        let state = self.state.read().await;
        if let Some(last_activity) = state.last_activity {
            let elapsed = last_activity.elapsed();
            elapsed.as_secs() > idle_timeout_seconds
        } else {
            false
        }
    }
}
