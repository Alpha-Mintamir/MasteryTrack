pub mod db;
pub mod app_state;
pub mod commands;

use tauri::{Manager, Emitter};
use std::thread;
use std::time::Duration;
use user_idle::UserIdle;
use app_state::{AppState, TimerState};
use std::sync::Mutex;
use chrono::Utc;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize DB
            let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
            let db_path = app_dir.join("mastery_tracker.db");
            
            let conn = db::init_db(&db_path).expect("failed to init db");
            
            app.manage(AppState {
                db: Mutex::new(conn),
                timer_state: Mutex::new(TimerState {
                    start_time: None,
                    accumulated_seconds: 0,
                    is_running: false,
                    last_tick: None,
                }),
            });

            // Idle detection background thread
            let handle_clone = app.handle().clone();
            std::thread::spawn(move || {
                loop {
                    thread::sleep(Duration::from_secs(5));
                    
                    if let Some(state) = handle_clone.try_state::<AppState>() {
                         // Check idle
                         match UserIdle::get_time() {
                             Ok(idle_time) => {
                                 // Check settings
                                 let idle_timeout_secs = {
                                     let conn = state.db.lock().unwrap();
                                     let mut stmt = conn.prepare("SELECT idle_timeout_minutes FROM settings WHERE id = 1").unwrap();
                                     let minutes: i64 = stmt.query_row([], |row| row.get(0)).unwrap_or(5);
                                     minutes * 60
                                 };

                                 // Use as_seconds() or as_secs() depending on return type.
                                 if idle_time.as_seconds() as i64 > idle_timeout_secs {
                                     let mut timer = state.timer_state.lock().unwrap();
                                     if timer.is_running {
                                         if let Some(start) = timer.start_time {
                                             let now = Utc::now();
                                             let elapsed = now.signed_duration_since(start).num_seconds();
                                             timer.accumulated_seconds += elapsed;
                                             timer.start_time = None;
                                             timer.is_running = false;
                                             
                                             // Emit event
                                             let _ = handle_clone.emit("timer-paused", "Idle detected");
                                         }
                                     }
                                 }
                             },
                             Err(_) => {}
                         }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::start_timer,
            commands::stop_timer,
            commands::get_timer_status,
            commands::get_dashboard_stats,
            commands::get_sessions,
            commands::save_settings,
            commands::get_settings,
            commands::log_session,
            commands::delete_session,
            commands::update_session_reflection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
