mod db;
mod errors;
mod models;
mod screenshot;
mod timer;

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use db::{
    backup_database, ensure_settings, export_sessions, import_data as db_import_data, fetch_dashboard_stats, init_pool, list_sessions,
    save_settings, update_session as db_update_session, delete_session as db_delete_session,
};
use errors::{AppError, AppResult};
use models::{
    AppSettings, DashboardStats, ExportRequest, ImportRequest, GoalNotification, ReflectionInput, SessionEditPayload,
    SessionHistoryRow, StartTimerResponse, TimerStatus,
};
use tauri::{
    async_runtime,
    AppHandle,
    Emitter,
    Manager,
    State,
};
use tokio::sync::RwLock;

use crate::timer::{idle_monitor, productivity_monitor, TimerService};

#[derive(Clone)]
pub struct AppState {
    pub pool: sqlx::SqlitePool,
    pub timer: TimerService,
    pub settings: Arc<RwLock<AppSettings>>,
    pub db_path: PathBuf,
}

impl AppState {
    pub fn new(
        pool: sqlx::SqlitePool,
        timer: TimerService,
        settings: Arc<RwLock<AppSettings>>,
        db_path: PathBuf,
    ) -> Self {
        Self {
            pool,
            timer,
            settings,
            db_path,
        }
    }
}

#[tauri::command]
async fn start_timer(app: AppHandle, state: State<'_, AppState>) -> Result<StartTimerResponse, AppError> {
    let response = state.timer.start().await?;
    app.emit("timer:started", &response).ok();
    Ok(response)
}

#[tauri::command]
async fn stop_timer(
    app: AppHandle,
    state: State<'_, AppState>,
    reflections: ReflectionInput,
) -> Result<f64, AppError> {
    let minutes = state.timer.stop(reflections).await?;
    let settings = state.settings.read().await.clone();
    let stats = fetch_dashboard_stats(&state.pool, &settings, 0).await?;
    if stats.todays_goal_hours >= stats.daily_goal_hours && stats.daily_goal_hours > 0.0 {
        let payload = GoalNotification {
            achieved_at: chrono::Utc::now(),
            total_minutes: stats.today_hours * 60.0,
        };
        app.emit("goal:reached", &payload).ok();
    }

    // Optional auto-backup
    if let Some(dir) = settings.auto_backup_path {
        let path = PathBuf::from(dir);
        if tokio::fs::create_dir_all(&path).await.is_ok() {
            let _ = backup_database(&state.db_path, path.as_path()).await;
        }
    }

    Ok(minutes)
}

#[tauri::command]
async fn timer_status(state: State<'_, AppState>) -> Result<TimerStatus, AppError> {
    Ok(state.timer.status().await)
}

#[tauri::command]
async fn dashboard(
    state: State<'_, AppState>,
) -> Result<DashboardStats, AppError> {
    let settings = state.settings.read().await.clone();
    let active = state.timer.active_seconds().await;
    fetch_dashboard_stats(&state.pool, &settings, active).await
}

#[tauri::command]
async fn sessions(state: State<'_, AppState>) -> Result<Vec<SessionHistoryRow>, AppError> {
    list_sessions(&state.pool).await
}

#[tauri::command]
async fn update_session(
    state: State<'_, AppState>,
    payload: SessionEditPayload,
) -> Result<(), AppError> {
    db_update_session(&state.pool, &payload).await
}

#[tauri::command]
async fn delete_session(state: State<'_, AppState>, session_id: i64) -> Result<(), AppError> {
    db_delete_session(&state.pool, session_id).await
}

#[tauri::command]
async fn load_settings(state: State<'_, AppState>) -> Result<AppSettings, AppError> {
    Ok(state.settings.read().await.clone())
}

#[tauri::command]
async fn get_temp_dir() -> Result<String, AppError> {
    use std::env;
    let temp = env::temp_dir();
    Ok(temp.to_string_lossy().to_string())
}

#[tauri::command]
async fn write_temp_file(path: String, content: String) -> Result<(), AppError> {
    tokio::fs::write(&path, content).await?;
    Ok(())
}

#[tauri::command]
async fn persist_settings(
    state: State<'_, AppState>,
    new_settings: AppSettings,
) -> Result<AppSettings, AppError> {
    save_settings(&state.pool, &new_settings).await?;
    state.timer.update_settings(new_settings.clone()).await;
    {
        let mut guard = state.settings.write().await;
        *guard = new_settings.clone();
    }
    Ok(new_settings)
}

#[tauri::command]
async fn export_data(
    state: State<'_, AppState>,
    request: ExportRequest,
) -> Result<String, AppError> {
    let dir = if let Some(dir) = request.target_dir {
        PathBuf::from(dir)
    } else {
        state
            .db_path
            .parent()
            .map(|p| p.join("exports"))
            .ok_or_else(|| AppError::Custom("Invalid data directory".into()))?
    };
    tokio::fs::create_dir_all(&dir).await?;
    let filename = format!(
        "masterytrack-export-{}.{}",
        chrono::Utc::now().format("%Y%m%d-%H%M%S"),
        request.format
    );
    let output = dir.join(filename);
    let path = export_sessions(&state.pool, &request.format.to_string(), &output, request.include_settings).await?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
async fn import_data(
    state: State<'_, AppState>,
    request: ImportRequest,
) -> Result<(), AppError> {
    let file_path = PathBuf::from(&request.file_path);
    db_import_data(&state.pool, &file_path, request.import_settings).await?;
    
    // Refresh settings if imported
    if request.import_settings {
        let updated = ensure_settings(&state.pool).await?;
        {
            let mut guard = state.settings.write().await;
            *guard = updated.clone();
        }
        state.timer.update_settings(updated).await;
    }
    
    Ok(())
}

#[derive(serde::Serialize)]
struct ScreenshotInfo {
    filename: String,
    path: String,
    timestamp: String,
    size_kb: u64,
}

#[tauri::command]
async fn list_screenshots(state: State<'_, AppState>) -> Result<Vec<ScreenshotInfo>, AppError> {
    use tokio::fs;
    
    let storage_path = {
        let settings = state.settings.read().await;
        if let Some(ref path) = settings.screenshot_storage_path {
            PathBuf::from(path)
        } else {
            state.db_path.parent()
                .unwrap_or(&state.db_path)
                .join("screenshots")
        }
    };
    
    let mut screenshots = Vec::new();
    
    if storage_path.exists() {
        let mut entries = fs::read_dir(&storage_path).await?;
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("jpg") {
                if let Ok(metadata) = entry.metadata().await {
                    let filename = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_string();
                    
                    // Extract timestamp from filename: screenshot_YYYYMMDD_HHMMSS_mmm.jpg
                    let timestamp = filename
                        .strip_prefix("screenshot_")
                        .and_then(|s| s.strip_suffix(".jpg"))
                        .map(|s| {
                            // Parse YYYYMMDD_HHMMSS_mmm into readable format
                            if s.len() >= 15 {
                                let year = &s[0..4];
                                let month = &s[4..6];
                                let day = &s[6..8];
                                let hour = &s[9..11];
                                let min = &s[11..13];
                                let sec = &s[13..15];
                                format!("{}-{}-{} {}:{}:{}", year, month, day, hour, min, sec)
                            } else {
                                s.to_string()
                            }
                        })
                        .unwrap_or_else(|| "Unknown".to_string());
                    
                    screenshots.push(ScreenshotInfo {
                        filename,
                        path: path.to_string_lossy().to_string(),
                        timestamp,
                        size_kb: metadata.len() / 1024,
                    });
                }
            }
        }
    }
    
    // Sort by filename (newest first - since filename has timestamp)
    screenshots.sort_by(|a, b| b.filename.cmp(&a.filename));
    
    Ok(screenshots)
}

#[tauri::command]
async fn delete_screenshot(path: String) -> Result<(), AppError> {
    use tokio::fs;
    fs::remove_file(&path).await?;
    Ok(())
}

#[tauri::command]
async fn read_screenshot_base64(path: String) -> Result<String, AppError> {
    use tokio::fs;
    use base64::{Engine as _, engine::general_purpose};
    
    let data = fs::read(&path).await?;
    let base64_data = general_purpose::STANDARD.encode(&data);
    Ok(format!("data:image/jpeg;base64,{}", base64_data))
}

#[tauri::command]
async fn get_screenshot_path(state: State<'_, AppState>) -> Result<String, AppError> {
    let storage_path = {
        let settings = state.settings.read().await;
        if let Some(ref path) = settings.screenshot_storage_path {
            PathBuf::from(path)
        } else {
            state.db_path.parent()
                .unwrap_or(&state.db_path)
                .join("screenshots")
        }
    };
    Ok(storage_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            start_timer,
            stop_timer,
            timer_status,
            dashboard,
            sessions,
            update_session,
            delete_session,
            load_settings,
            persist_settings,
            export_data,
            import_data,
            get_temp_dir,
            write_temp_file,
            list_screenshots,
            delete_screenshot,
            get_screenshot_path,
            read_screenshot_base64
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            async_runtime::block_on(async {
                let (pool, db_path) = init_pool(app.handle()).await?;
                let settings = ensure_settings(&pool).await?;
                let shared_settings = Arc::new(RwLock::new(settings.clone()));
                let timer = TimerService::new(pool.clone(), shared_settings.clone(), db_path.clone());

                app.manage(AppState::new(
                    pool.clone(),
                    timer.clone(),
                    shared_settings.clone(),
                    db_path.clone(),
                ));

                spawn_background_workers(app.handle().clone(), timer.clone());
                Ok::<(), AppError>(())
            })?;

            build_tray(app.handle().clone())?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn spawn_background_workers(handle: AppHandle, timer: TimerService) {
    let idle_app = handle.clone();
    let idle_timer = timer.clone();
    async_runtime::spawn(async move {
        idle_monitor(idle_timer, idle_app).await;
    });

    let prod_app = handle.clone();
    let prod_timer = timer.clone();
    async_runtime::spawn(async move {
        productivity_monitor(prod_timer, prod_app).await;
    });

    let tick_app = handle.clone();
    let tick_timer = timer.clone();
    async_runtime::spawn(async move {
        loop {
            let status = tick_timer.status().await;
            tick_app.emit("timer:tick", &status).ok();
            update_tray_tooltip(&tick_app, &status);
            tokio::time::sleep(Duration::from_secs(1)).await;
        }
    });

    // Screenshot worker
    if let Some(state) = handle.try_state::<AppState>() {
        let screenshot_timer = timer.clone();
        let screenshot_app = handle.clone();
        let screenshot_settings = state.settings.clone();
        let screenshot_db_path = state.db_path.clone();
        async_runtime::spawn(async move {
            // Initialize screenshot service with default storage path if not set
            let storage_path = {
                let settings = screenshot_settings.read().await;
                if let Some(ref path) = settings.screenshot_storage_path {
                    PathBuf::from(path)
                } else {
                    // Default to screenshots folder in app data directory
                    screenshot_db_path.parent()
                        .unwrap_or(&screenshot_db_path)
                        .join("screenshots")
                }
            };
            let service = screenshot::ScreenshotService::new(screenshot_settings.clone(), storage_path);
            screenshot::screenshot_worker(service, screenshot_app, screenshot_timer).await;
        });
    }
}

const TRAY_ID: &str = "masterytrack-tray";

fn build_tray(app: AppHandle) -> AppResult<()> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder};
    use tauri::tray::TrayIconBuilder;

    let open = MenuItemBuilder::with_id("show", "Open Dashboard").build(&app)?;
    let start = MenuItemBuilder::with_id("start", "Start Practice").build(&app)?;
    let stop = MenuItemBuilder::with_id("stop", "Stop Practice").build(&app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(&app)?;

    let menu = MenuBuilder::new(&app)
        .item(&open)
        .separator()
        .item(&start)
        .item(&stop)
        .separator()
        .item(&quit)
        .build()?;

    TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip("MasteryTrack — idle")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    window.show().ok();
                    window.set_focus().ok();
                }
            }
            "start" => {
                if let Some(state) = app.try_state::<AppState>() {
                    let shared = state.inner().clone();
                    let app_handle = app.clone();
                    async_runtime::spawn(async move {
                        if let Err(err) = shared.timer.start().await {
                            log::error!("Tray start failed: {err}");
                        } else {
                            app_handle.emit("timer:started", &()).ok();
                        }
                    });
                }
            }
            "stop" => {
                if let Some(state) = app.try_state::<AppState>() {
                    let shared = state.inner().clone();
                    let app_handle = app.clone();
                    async_runtime::spawn(async move {
                        if let Err(err) = shared
                            .timer
                            .stop(ReflectionInput {
                                notes: Some("Stopped from tray".into()),
                                what_practiced: None,
                                what_learned: None,
                                next_focus: None,
                            })
                            .await
                        {
                            log::error!("Tray stop failed: {err}");
                        } else {
                            app_handle.emit("timer:stopped", &()).ok();
                        }
                    });
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(&app)?;

    Ok(())
}

fn update_tray_tooltip(app: &AppHandle, status: &TimerStatus) {
    use tauri::tray::TrayIconId;
    if let Some(tray) = app.tray_by_id(&TrayIconId::new(TRAY_ID)) {
        let tooltip = if status.running {
            let hrs = status.elapsed_seconds as f64 / 3600.0;
            format!("Practicing • {:.2}h today", hrs)
        } else {
            "MasteryTrack — idle".into()
        };
        tray.set_tooltip(Some(tooltip.as_str())).ok();
    }
}
