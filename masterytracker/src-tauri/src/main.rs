#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod models;
mod productivity;
mod timer;

use std::sync::Arc;

use anyhow::anyhow;
use db::DbLayer;
use models::{
    AppSettings, DashboardStats, ExportFormat, ExportPayload, ReflectionInput, SessionCollection,
    SessionEditPayload, SessionFilter, SessionRecord, SettingsUpdate,
};
use tauri::{async_runtime::spawn, menu::MenuBuilder, AppHandle, Manager, State};
use tauri::image::Image;
use tauri::path::BaseDirectory;
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_notification::{init as notification_plugin, NotificationExt};
use tauri_plugin_window_state::Builder as WindowStateBuilder;
use timer::{TimerManager, TrayController};

struct AppState {
    db: Arc<DbLayer>,
    timer: TimerManager,
}

#[tauri::command]
fn start_timer(
    state: State<AppState>,
    skill_name: Option<String>,
) -> Result<SessionRecord, String> {
    state.timer.start(skill_name).map_err(|e| e.to_string())
}

#[tauri::command]
fn stop_timer(
    state: State<AppState>,
    reflection: Option<ReflectionInput>,
) -> Result<SessionRecord, String> {
    state.timer.stop(reflection).map_err(|e| e.to_string())
}

#[tauri::command]
fn active_session(state: State<AppState>) -> Result<Option<SessionRecord>, String> {
    Ok(state.timer.active())
}

#[tauri::command]
fn get_sessions(
    state: State<AppState>,
    limit: i64,
    offset: i64,
) -> Result<SessionCollection, String> {
    state
        .db
        .fetch_sessions(SessionFilter { limit, offset })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn edit_session(
    state: State<AppState>,
    payload: SessionEditPayload,
) -> Result<SessionRecord, String> {
    state.db.edit_session(payload).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_session(state: State<AppState>, id: i64) -> Result<(), String> {
    state.db.delete_session(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_settings(state: State<AppState>) -> Result<AppSettings, String> {
    state.db.load_settings().map_err(|e| e.to_string())
}

#[tauri::command]
fn update_settings(state: State<AppState>, payload: SettingsUpdate) -> Result<AppSettings, String> {
    let settings = state
        .db
        .update_settings(payload)
        .map_err(|e| e.to_string())?;
    state.timer.apply_settings(&settings);
    Ok(settings)
}

#[tauri::command]
fn dashboard(state: State<AppState>) -> Result<DashboardStats, String> {
    let settings = state.db.load_settings().map_err(|e| e.to_string())?;
    state
        .db
        .dashboard_stats(&settings)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn export_sessions(state: State<AppState>, format: ExportFormat) -> Result<ExportPayload, String> {
    let path = state
        .db
        .export_sessions(format.clone())
        .map_err(|e| e.to_string())?;
    Ok(ExportPayload { path, format })
}

#[tauri::command]
fn manual_backup(state: State<AppState>, path: String) -> Result<String, String> {
    use std::path::PathBuf;
    let dest = PathBuf::from(path);
    state.db.backup_to(&dest).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_reflection_fields(
    state: State<AppState>,
    session_id: i64,
    reflection: ReflectionInput,
) -> Result<SessionRecord, String> {
    state
        .db
        .save_reflection(session_id, reflection)
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(notification_plugin())
        .plugin(WindowStateBuilder::default().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Default::default(),
        ))
        .setup(|app| {
            let handle = app.handle();
            let data_dir = handle
                .path()
                .app_data_dir()
                .map_err(|_| anyhow!("app data directory unavailable"))?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("masterytrack.sqlite");
            let db = Arc::new(DbLayer::new(db_path)?);
            let settings = db.load_settings()?;
            let tray = TrayController::default();
            init_tray(&handle, tray.clone())?;
            let timer = TimerManager::new(&handle, tray, db.clone(), &settings);
            app.manage(AppState { db, timer });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_timer,
            stop_timer,
            active_session,
            get_sessions,
            edit_session,
            delete_session,
            get_settings,
            update_settings,
            dashboard,
            export_sessions,
            manual_backup,
            save_reflection_fields
        ])
        .run(tauri::generate_context!())
        .expect("error running Tauri application");
}

fn init_tray(handle: &AppHandle, tray: TrayController) -> tauri::Result<()> {
    let tray_menu = MenuBuilder::new(handle)
        .text("tray_toggle", "Start / Stop")
        .text("tray_show", "Show dashboard")
        .text("tray_export_json", "Export JSON")
        .text("tray_quit", "Quit")
        .build()?;

    let icon = load_tray_icon(handle)?;

    let tray_icon = TrayIconBuilder::with_id("mastery-track-tray")
        .menu(&tray_menu)
        .icon(icon)
        .tooltip("MasteryTrack — paused")
        .on_menu_event(|app, event| handle_tray_menu(app, event.id().as_ref()))
        .on_tray_icon_event(|icon, event| {
            if let TrayIconEvent::Click { .. } = event {
                show_main_window(&icon.app_handle());
            }
        })
        .build(handle)?;

    tray.set_icon(tray_icon);
    Ok(())
}

fn handle_tray_menu(app: &AppHandle, id: &str) {
    match id {
        "tray_toggle" => toggle_timer(app),
        "tray_show" => show_main_window(app),
        "tray_export_json" => trigger_export(app, ExportFormat::Json),
        "tray_quit" => app.exit(0),
        _ => {}
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        window.show().ok();
        window.set_focus().ok();
    }
}

fn trigger_export(app: &AppHandle, format: ExportFormat) {
    let app_clone = app.clone();
    spawn(async move {
        if let Some(state) = app_clone.try_state::<AppState>() {
            if let Ok(path) = state.db.export_sessions(format.clone()) {
                let _ = app_clone
                    .notification()
                    .builder()
                    .title("Export complete")
                    .body(format!("Saved to {}", path))
                    .show();
            }
        }
    });
}

fn load_tray_icon(handle: &AppHandle) -> tauri::Result<Image<'static>> {
    if let Some(icon) = handle.default_window_icon() {
        return Ok(icon.clone().to_owned());
    }
    let path = handle
        .path()
        .resolve("icons/icon.png", BaseDirectory::Resource)?;
    Image::from_path(path)
}

fn toggle_timer(app: &AppHandle) {
    if let Some(state) = app.try_state::<AppState>() {
        if state.timer.active().is_some() {
            let _ = state.timer.stop(None);
        } else {
            let _ = state.timer.start(None);
        }
    }
}
