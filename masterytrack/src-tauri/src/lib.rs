mod db;
mod errors;
mod models;
mod timer;

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use db::{
    backup_database, ensure_settings, export_sessions, fetch_dashboard_stats, init_pool, list_sessions,
    save_settings, update_session as db_update_session, delete_session as db_delete_session,
};
use errors::{AppError, AppResult};
use models::{
    AppSettings, DashboardStats, ExportRequest, GoalNotification, ReflectionInput, SessionEditPayload,
    SessionHistoryRow, StartTimerResponse, TimerStatus,
};
use tauri::{
    async_runtime,
    Emitter,
    Manager,
    State,
    AppHandle,
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
        "sessions-{}.{}",
        chrono::Utc::now().format("%Y%m%d-%H%M%S"),
        request.format
    );
    let output = dir.join(filename);
    let path = export_sessions(&state.pool, &request.format.to_string(), &output).await?;
    Ok(path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
            export_data
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
    async_runtime::spawn(async move {
        loop {
            let status = timer.status().await;
            tick_app.emit("timer:tick", &status).ok();
            update_tray_tooltip(&tick_app, &status);
            tokio::time::sleep(Duration::from_secs(1)).await;
        }
    });
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
    if let Ok(tray) = app.tray_handle_by_id(TrayIconId::new(TRAY_ID)) {
        let tooltip = if status.running {
            let hrs = status.elapsed_seconds as f64 / 3600.0;
            format!("Practicing • {:.2}h today", hrs)
        } else {
            "MasteryTrack — idle".into()
        };
        tray.set_tooltip(Some(&tooltip)).ok();
    }
}
