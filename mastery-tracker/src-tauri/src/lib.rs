mod db;
mod timer;
mod idle;
mod tray;

use db::{Database, Session, Settings, DashboardStats};
use timer::{Timer, TimerInfo};
use std::sync::Arc;
use tauri::{AppHandle, Manager, State, Emitter};
use std::path::PathBuf;

pub struct AppState {
    pub db: Arc<Database>,
    pub timer: Arc<Timer>,
}

// Timer Commands
#[tauri::command]
async fn start_timer(state: State<'_, AppState>) -> Result<i64, String> {
    let skill = state.db.get_default_skill().map_err(|e| e.to_string())?;
    let session_id = state.db.start_session(skill.id).map_err(|e| e.to_string())?;
    state.timer.start(session_id).await;
    Ok(session_id)
}

#[tauri::command]
async fn stop_timer(state: State<'_, AppState>, reflection: Option<String>) -> Result<(), String> {
    if let Some(session_id) = state.timer.stop().await {
        state.db.end_session(session_id, reflection).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn pause_timer(state: State<'_, AppState>) -> Result<(), String> {
    state.timer.pause().await;
    Ok(())
}

#[tauri::command]
async fn resume_timer(state: State<'_, AppState>) -> Result<(), String> {
    state.timer.resume().await;
    Ok(())
}

#[tauri::command]
async fn get_timer_info(state: State<'_, AppState>) -> Result<TimerInfo, String> {
    Ok(state.timer.get_info().await)
}

// Session Commands
#[tauri::command]
async fn get_sessions(state: State<'_, AppState>) -> Result<Vec<Session>, String> {
    state.db.get_all_sessions().map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_session(
    state: State<'_, AppState>,
    id: i64,
    start_time: String,
    end_time: String,
    reflection: Option<String>,
) -> Result<(), String> {
    state.db.update_session(id, start_time, end_time, reflection)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_session(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    state.db.delete_session(id).map_err(|e| e.to_string())
}

// Dashboard Commands
#[tauri::command]
async fn get_dashboard_stats(state: State<'_, AppState>) -> Result<DashboardStats, String> {
    state.db.get_dashboard_stats().map_err(|e| e.to_string())
}

// Settings Commands
#[tauri::command]
async fn get_settings(state: State<'_, AppState>) -> Result<Settings, String> {
    state.db.get_settings().map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_settings(state: State<'_, AppState>, settings: Settings) -> Result<(), String> {
    state.db.update_settings(settings).map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_skill_name(state: State<'_, AppState>, name: String) -> Result<(), String> {
    let skill = state.db.get_default_skill().map_err(|e| e.to_string())?;
    state.db.update_skill_name(skill.id, name).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_skill_name(state: State<'_, AppState>) -> Result<String, String> {
    let skill = state.db.get_default_skill().map_err(|e| e.to_string())?;
    Ok(skill.skill_name)
}

// Export Commands
#[tauri::command]
async fn export_csv(state: State<'_, AppState>) -> Result<String, String> {
    state.db.export_sessions_csv().map_err(|e| e.to_string())
}

#[tauri::command]
async fn export_json(state: State<'_, AppState>) -> Result<String, String> {
    state.db.export_sessions_json().map_err(|e| e.to_string())
}

// Background timer tick
async fn timer_tick_loop(app_handle: AppHandle) {
    let state = app_handle.state::<AppState>();
    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(1));
    
    loop {
        interval.tick().await;
        
        if state.timer.is_running().await {
            state.timer.tick().await;
            
            // Check for idle
            let settings = match state.db.get_settings() {
                Ok(s) => s,
                Err(_) => continue,
            };
            
            let idle_threshold_secs = settings.idle_timeout_minutes * 60;
            if state.timer.check_idle(idle_threshold_secs as u64).await {
                state.timer.pause().await;
                let _ = app_handle.emit("timer-paused-idle", ());
            }
            
            // Emit timer update
            if let Ok(info) = state.timer.get_info().await {
                let _ = app_handle.emit("timer-tick", info);
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database
            let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
            let db_path = app_dir.join("mastery_tracker.db");
            
            let db = Arc::new(Database::new(db_path).expect("failed to initialize database"));
            let timer = Arc::new(Timer::new());
            
            let state = AppState { db, timer };
            app.manage(state);
            
            // Create system tray
            tray::create_tray(&app.handle()).expect("failed to create tray icon");
            
            // Start timer tick loop
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                timer_tick_loop(app_handle).await;
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_timer,
            stop_timer,
            pause_timer,
            resume_timer,
            get_timer_info,
            get_sessions,
            update_session,
            delete_session,
            get_dashboard_stats,
            get_settings,
            update_settings,
            update_skill_name,
            get_skill_name,
            export_csv,
            export_json,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
