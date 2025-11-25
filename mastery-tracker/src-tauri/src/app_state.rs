use std::sync::Mutex;
use chrono::{DateTime, Utc};
use rusqlite::Connection;

pub struct TimerState {
    pub start_time: Option<DateTime<Utc>>, // When the current active session started (or resumed)
    pub accumulated_seconds: i64,          // Time accumulated before the last resume
    pub is_running: bool,
    pub last_tick: Option<DateTime<Utc>>, // For tracking idle time adjustments
}

pub struct AppState {
    pub db: Mutex<Connection>,
    pub timer_state: Mutex<TimerState>,
}
