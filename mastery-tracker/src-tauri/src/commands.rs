use tauri::State;
use crate::app_state::AppState;
use chrono::Utc;
use rusqlite::params;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct TimerStatus {
    pub is_running: bool,
    pub accumulated_seconds: i64,
    pub start_time: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Session {
    id: i64,
    skill_id: i64,
    start_time: String,
    end_time: Option<String>,
    duration_minutes: i64,
    reflection_text: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct DashboardStats {
    today_hours: f64,
    week_hours: f64,
    month_hours: f64,
    total_hours: f64,
    progress_percentage: f64,
    streak_days: i64,
}

#[derive(Serialize, Deserialize)]
pub struct AppSettings {
    daily_goal_minutes: i64,
    idle_timeout_minutes: i64,
    productivity_mode_enabled: bool,
    target_skill_name: String,
}

#[tauri::command]
pub fn start_timer(state: State<AppState>) -> Result<(), String> {
    let mut timer = state.timer_state.lock().map_err(|e| e.to_string())?;
    if !timer.is_running {
        timer.is_running = true;
        timer.start_time = Some(Utc::now());
        timer.last_tick = Some(Utc::now());
    }
    Ok(())
}

#[tauri::command]
pub fn stop_timer(state: State<AppState>) -> Result<Session, String> {
    let mut timer = state.timer_state.lock().map_err(|e| e.to_string())?;
    
    let now = Utc::now();
    let start_time = timer.start_time.unwrap_or(now);
    
    // Calculate duration
    let current_session_seconds = if timer.is_running {
         now.signed_duration_since(start_time).num_seconds()
    } else {
        0
    };
    
    let total_seconds = timer.accumulated_seconds + current_session_seconds;
    let duration_minutes = total_seconds / 60;
    
    // Reset timer
    timer.is_running = false;
    timer.start_time = None;
    timer.accumulated_seconds = 0;
    timer.last_tick = None;
    
    // Save to DB
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    // Get skill id (assume 1 for now or get from settings/skills table)
    conn.execute("INSERT OR IGNORE INTO skills (id, skill_name, created_at) VALUES (1, 'Mastery', ?)", params![now.to_rfc3339()]).map_err(|e| e.to_string())?;
    
    let effective_start_time = now - chrono::Duration::seconds(total_seconds);

    conn.execute(
        "INSERT INTO sessions (skill_id, start_time, end_time, duration_minutes, reflection_text)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![1, effective_start_time.to_rfc3339(), now.to_rfc3339(), duration_minutes, ""],
    ).map_err(|e| e.to_string())?;
    
    let id = conn.last_insert_rowid();
    
    Ok(Session {
        id,
        skill_id: 1,
        start_time: effective_start_time.to_rfc3339(),
        end_time: Some(now.to_rfc3339()),
        duration_minutes,
        reflection_text: Some("".to_string()),
    })
}

#[tauri::command]
pub fn get_timer_status(state: State<AppState>) -> Result<TimerStatus, String> {
    let timer = state.timer_state.lock().map_err(|e| e.to_string())?;
    Ok(TimerStatus {
        is_running: timer.is_running,
        accumulated_seconds: timer.accumulated_seconds,
        start_time: timer.start_time.map(|t| t.to_rfc3339()),
    })
}

#[tauri::command]
pub fn get_dashboard_stats(state: State<AppState>) -> Result<DashboardStats, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    // Helper to run query
    let get_hours = |query: &str| -> f64 {
        let mut stmt = conn.prepare(query).unwrap();
        let mins: i64 = stmt.query_row([], |r| r.get(0)).unwrap_or(0);
        mins as f64 / 60.0
    };
    
    let today_hours = get_hours("SELECT SUM(duration_minutes) FROM sessions WHERE date(start_time) = date('now')");
    let week_hours = get_hours("SELECT SUM(duration_minutes) FROM sessions WHERE start_time >= date('now', '-7 days')");
    let month_hours = get_hours("SELECT SUM(duration_minutes) FROM sessions WHERE start_time >= date('now', 'start of month')");
    let total_hours = get_hours("SELECT SUM(duration_minutes) FROM sessions");
    
    let progress_percentage = (total_hours / 10000.0) * 100.0;
    
    let mut stmt = conn.prepare("SELECT DISTINCT date(start_time) FROM sessions ORDER BY date(start_time) DESC").map_err(|e| e.to_string())?;
    let dates: Vec<String> = stmt.query_map([], |row| row.get(0)).unwrap().filter_map(Result::ok).collect();
    
    let mut streak_days = 0;
    let mut current_check = Utc::now().date_naive();
    
    let mut practice_dates = std::collections::HashSet::new();
    for d_str in dates {
         if let Ok(d) = chrono::NaiveDate::parse_from_str(&d_str, "%Y-%m-%d") {
             practice_dates.insert(d);
         }
    }
    
    loop {
        if practice_dates.contains(&current_check) {
            streak_days += 1;
            current_check = current_check.pred_opt().unwrap();
        } else {
            if current_check == Utc::now().date_naive() {
                current_check = current_check.pred_opt().unwrap();
                continue;
            }
            break;
        }
    }

    Ok(DashboardStats {
        today_hours,
        week_hours,
        month_hours,
        total_hours,
        progress_percentage,
        streak_days,
    })
}

#[tauri::command]
pub fn get_sessions(state: State<AppState>) -> Result<Vec<Session>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, skill_id, start_time, end_time, duration_minutes, reflection_text FROM sessions ORDER BY start_time DESC").map_err(|e| e.to_string())?;
    
    let sessions = stmt.query_map([], |row| {
        Ok(Session {
            id: row.get(0)?,
            skill_id: row.get(1)?,
            start_time: row.get(2)?,
            end_time: row.get(3)?,
            duration_minutes: row.get(4)?,
            reflection_text: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    
    Ok(sessions)
}

#[tauri::command]
pub fn save_settings(state: State<AppState>, settings: AppSettings) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE settings SET daily_goal_minutes = ?1, idle_timeout_minutes = ?2, productivity_mode_enabled = ?3, target_skill_name = ?4 WHERE id = 1",
        params![settings.daily_goal_minutes, settings.idle_timeout_minutes, settings.productivity_mode_enabled, settings.target_skill_name],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Result<AppSettings, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT daily_goal_minutes, idle_timeout_minutes, productivity_mode_enabled, target_skill_name FROM settings WHERE id = 1").map_err(|e| e.to_string())?;
    
    let settings = stmt.query_row([], |row| {
        Ok(AppSettings {
            daily_goal_minutes: row.get(0)?,
            idle_timeout_minutes: row.get(1)?,
            productivity_mode_enabled: row.get(2)?,
            target_skill_name: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;
    
    Ok(settings)
}

#[tauri::command]
pub fn log_session(state: State<AppState>, duration_minutes: i64, notes: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now();
    let start = now - chrono::Duration::minutes(duration_minutes);
    
    conn.execute(
        "INSERT INTO sessions (skill_id, start_time, end_time, duration_minutes, reflection_text) VALUES (1, ?1, ?2, ?3, ?4)",
        params![start.to_rfc3339(), now.to_rfc3339(), duration_minutes, notes]
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_session(state: State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM sessions WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_session_reflection(state: State<AppState>, id: i64, reflection: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE sessions SET reflection_text = ?1 WHERE id = ?2", params![reflection, id]).map_err(|e| e.to_string())?;
    Ok(())
}
