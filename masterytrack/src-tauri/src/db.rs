use std::path::{Path, PathBuf};

use chrono::{DateTime, Duration, NaiveDateTime, TimeZone, Utc};
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use sqlx::{Row, SqlitePool};
use tauri::{api::path::app_data_dir, AppHandle, Manager};

use crate::errors::{AppError, AppResult};
use crate::models::{
    AppSettings, DashboardStats, ReflectionInput, SessionEditPayload, SessionHistoryRow,
    SessionRecord, SettingsRow,
};

pub async fn init_pool(app: &AppHandle) -> AppResult<(SqlitePool, PathBuf)> {
    let data_dir = app_data_dir(app.config())
        .ok_or_else(|| AppError::Custom("Unable to resolve app data directory".into()))?;
    tokio::fs::create_dir_all(&data_dir).await?;
    let db_path = data_dir.join("masterytrack.db");

    let connect_opts = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .busy_timeout(std::time::Duration::from_secs(5));

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(connect_opts)
        .await?;

    run_migrations(&pool).await?;

    Ok((pool, db_path))
}

async fn run_migrations(pool: &SqlitePool) -> AppResult<()> {
    let create_skills = r#"
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            skill_name TEXT NOT NULL UNIQUE,
            created_at TEXT DEFAULT (datetime('now'))
        );
    "#;

    let create_sessions = r#"
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            skill_id INTEGER NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT,
            duration_minutes REAL,
            notes TEXT,
            what_practiced TEXT,
            what_learned TEXT,
            next_focus TEXT,
            FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
        );
    "#;

    let create_settings = r#"
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            skill_name TEXT NOT NULL DEFAULT 'Primary Skill',
            daily_goal_minutes INTEGER NOT NULL DEFAULT 120,
            idle_timeout_minutes INTEGER NOT NULL DEFAULT 5,
            productivity_mode_enabled INTEGER NOT NULL DEFAULT 0,
            allowed_apps TEXT NOT NULL DEFAULT '[]',
            blocked_apps TEXT NOT NULL DEFAULT '[]',
            auto_backup_path TEXT
        );
    "#;

    sqlx::query(create_skills).execute(pool).await?;
    sqlx::query(create_sessions).execute(pool).await?;
    sqlx::query(create_settings).execute(pool).await?;

    Ok(())
}

pub async fn ensure_settings(pool: &SqlitePool) -> AppResult<AppSettings> {
    let row = sqlx::query_as::<_, SettingsRow>("SELECT * FROM settings WHERE id = 1")
        .fetch_optional(pool)
        .await?;

    if let Some(existing) = row {
        return Ok(existing.into());
    }

    let defaults = AppSettings::default();
    save_settings(pool, &defaults).await?;
    Ok(defaults)
}

pub async fn save_settings(pool: &SqlitePool, settings: &AppSettings) -> AppResult<()> {
    let (id, name, daily_goal, idle_timeout, productivity, allowed, blocked, backup) =
        settings.to_row()?;

    sqlx::query(
        r#"
        INSERT INTO settings (id, skill_name, daily_goal_minutes, idle_timeout_minutes,
            productivity_mode_enabled, allowed_apps, blocked_apps, auto_backup_path)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(id) DO UPDATE SET
            skill_name = excluded.skill_name,
            daily_goal_minutes = excluded.daily_goal_minutes,
            idle_timeout_minutes = excluded.idle_timeout_minutes,
            productivity_mode_enabled = excluded.productivity_mode_enabled,
            allowed_apps = excluded.allowed_apps,
            blocked_apps = excluded.blocked_apps,
            auto_backup_path = excluded.auto_backup_path;
    "#,
    )
    .bind(id)
    .bind(name)
    .bind(daily_goal)
    .bind(idle_timeout)
    .bind(productivity)
    .bind(allowed)
    .bind(blocked)
    .bind(backup)
    .execute(pool)
    .await?;

    // keep skills table name in sync
    sqlx::query("INSERT INTO skills (id, skill_name) VALUES (1, ?1) ON CONFLICT(id) DO UPDATE SET skill_name = excluded.skill_name")
        .bind(name)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn ensure_skill(pool: &SqlitePool, name: &str) -> AppResult<i64> {
    let existing = sqlx::query("SELECT id FROM skills WHERE skill_name = ?1 LIMIT 1")
        .bind(name)
        .fetch_optional(pool)
        .await?;

    if let Some(row) = existing {
        return Ok(row.get::<i64, _>("id"));
    }

    let result = sqlx::query("INSERT INTO skills (skill_name) VALUES (?1)")
        .bind(name)
        .execute(pool)
        .await?;

    Ok(result.last_insert_rowid())
}

pub async fn insert_session(pool: &SqlitePool, skill_id: i64, start_time: DateTime<Utc>) -> AppResult<i64> {
    let result = sqlx::query(
        "INSERT INTO sessions (skill_id, start_time) VALUES (?1, ?2)",
    )
    .bind(skill_id)
    .bind(start_time.to_rfc3339())
    .execute(pool)
    .await?;

    Ok(result.last_insert_rowid())
}

pub async fn finalize_session(
    pool: &SqlitePool,
    session_id: i64,
    duration_minutes: f64,
    reflections: &ReflectionInput,
) -> AppResult<()> {
    let end_time = Utc::now().to_rfc3339();

    sqlx::query(
        r#"
        UPDATE sessions
        SET end_time = ?2,
            duration_minutes = ?3,
            notes = ?4,
            what_practiced = ?5,
            what_learned = ?6,
            next_focus = ?7
        WHERE id = ?1
    "#,
    )
    .bind(session_id)
    .bind(end_time)
    .bind(duration_minutes)
    .bind(reflections.notes.as_ref())
    .bind(reflections.what_practiced.as_ref())
    .bind(reflections.what_learned.as_ref())
    .bind(reflections.next_focus.as_ref())
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn fetch_dashboard_stats(
    pool: &SqlitePool,
    settings: &AppSettings,
    active_seconds: i64,
) -> AppResult<DashboardStats> {
    let now = Utc::now();
    let today_start = now.date_naive().and_hms_opt(0, 0, 0).unwrap();
    let week_start = today_start - Duration::days(7);
    let month_start = today_start - Duration::days(30);

    let today_minutes = sum_minutes_since(pool, today_start).await?;
    let week_minutes = sum_minutes_since(pool, week_start).await?;
    let month_minutes = sum_minutes_since(pool, month_start).await?;
    let total_minutes = sum_all_minutes(pool).await?;

    let with_active = total_minutes + (active_seconds as f64 / 60.0);
    let today_with_active = today_minutes + (active_seconds as f64 / 60.0);

    let goal_progress = (with_active / (10_000.0 * 60.0)).min(1.0);
    let daily_goal_hours = settings.daily_goal_minutes as f64 / 60.0;
    let todays_goal_hours = (today_with_active / 60.0).min(daily_goal_hours);

    let streak = compute_streak(pool, settings.daily_goal_minutes).await?;

    Ok(DashboardStats {
        today_hours: today_with_active / 60.0,
        week_hours: week_minutes / 60.0,
        month_hours: month_minutes / 60.0,
        total_hours: with_active / 60.0,
        goal_progress,
        total_hours_target: 10_000.0,
        daily_goal_hours,
        todays_goal_hours,
        streak_days: streak,
    })
}

async fn sum_minutes_since(pool: &SqlitePool, start: NaiveDateTime) -> AppResult<f64> {
    let query = r#"
        SELECT COALESCE(SUM(duration_minutes), 0) as total
        FROM sessions
        WHERE start_time >= ?1
    "#;
    let total: f64 = sqlx::query_scalar::<_, f64>(query)
        .bind(Utc.from_utc_datetime(&start).to_rfc3339())
        .fetch_one(pool)
        .await?;
    Ok(total.unwrap_or(0.0))
}

async fn sum_all_minutes(pool: &SqlitePool) -> AppResult<f64> {
    let total: f64 = sqlx::query_scalar::<_, f64>("SELECT COALESCE(SUM(duration_minutes), 0) FROM sessions")
        .fetch_one(pool)
        .await?;
    Ok(total.unwrap_or(0.0))
}

async fn compute_streak(pool: &SqlitePool, goal_minutes: i64) -> AppResult<u32> {
    let rows = sqlx::query(
        r#"
        SELECT date(start_time) as day, SUM(duration_minutes) as minutes
        FROM sessions
        GROUP BY date(start_time)
        ORDER BY day DESC
        LIMIT 60
    "#,
    )
    .fetch_all(pool)
    .await?;

    let mut streak = 0;
    let mut current_day = chrono::Utc::now().date_naive();

    for row in rows {
        let day_str: String = row.try_get("day").unwrap_or_default();
        if let Ok(day) = chrono::NaiveDate::parse_from_str(&day_str, "%Y-%m-%d") {
            if day < current_day {
                let diff = current_day.signed_duration_since(day).num_days();
                if diff > 1 {
                    break;
                }
            }
            let minutes: f64 = row.try_get("minutes").unwrap_or(0.0);
            if minutes >= goal_minutes as f64 {
                streak += 1;
                current_day = day.pred_opt().unwrap_or(day);
            } else {
                break;
            }
        }
    }

    Ok(streak)
}

pub async fn list_sessions(pool: &SqlitePool) -> AppResult<Vec<SessionHistoryRow>> {
    let records = sqlx::query_as::<_, SessionRecord>(
        "SELECT * FROM sessions ORDER BY start_time DESC LIMIT 200",
    )
    .fetch_all(pool)
    .await?;

    let mapped = records
        .into_iter()
        .filter_map(|row| {
            let duration = row.duration_minutes.unwrap_or_else(|| {
                row.end_time
                    .as_deref()
                    .and_then(|end| {
                        let start = DateTime::parse_from_rfc3339(&row.start_time).ok()?;
                        let end_dt = DateTime::parse_from_rfc3339(end).ok()?;
                        Some((end_dt - start).num_minutes() as f64)
                    })
                    .unwrap_or(0.0)
            });

            let start = DateTime::parse_from_rfc3339(&row.start_time).ok()?.with_timezone(&Utc);
            let end = row
                .end_time
                .as_deref()
                .and_then(|e| DateTime::parse_from_rfc3339(e).ok())
                .map(|dt| dt.with_timezone(&Utc));

            Some(SessionHistoryRow {
                id: row.id,
                start,
                end,
                duration_minutes: duration,
                notes: row.notes,
                what_practiced: row.what_practiced,
                what_learned: row.what_learned,
                next_focus: row.next_focus,
            })
        })
        .collect();

    Ok(mapped)
}

pub async fn update_session(pool: &SqlitePool, payload: &SessionEditPayload) -> AppResult<()> {
    sqlx::query(
        r#"
        UPDATE sessions
        SET start_time = ?2,
            end_time = ?3,
            duration_minutes = ?4,
            notes = ?5,
            what_practiced = ?6,
            what_learned = ?7,
            next_focus = ?8
        WHERE id = ?1
    "#,
    )
    .bind(payload.id)
    .bind(payload.start_time.to_rfc3339())
    .bind(payload.end_time.map(|dt| dt.to_rfc3339()))
    .bind(payload.duration_minutes)
    .bind(payload.notes.as_ref())
    .bind(payload.what_practiced.as_ref())
    .bind(payload.what_learned.as_ref())
    .bind(payload.next_focus.as_ref())
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn delete_session(pool: &SqlitePool, session_id: i64) -> AppResult<()> {
    sqlx::query("DELETE FROM sessions WHERE id = ?1")
        .bind(session_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn export_sessions(
    pool: &SqlitePool,
    format: &str,
    output: &Path,
) -> AppResult<PathBuf> {
    let sessions = list_sessions(pool).await?;
    match format {
        "csv" => export_csv(&sessions, output).await,
        "json" => export_json(&sessions, output).await,
        _ => Err(AppError::UnsupportedExportFormat),
    }
}

async fn export_csv(data: &[SessionHistoryRow], output: &Path) -> AppResult<PathBuf> {
    let mut wtr = csv::Writer::from_writer(Vec::new());
    wtr.write_record([
        "id",
        "start_time",
        "end_time",
        "duration_minutes",
        "notes",
        "what_practiced",
        "what_learned",
        "next_focus",
    ])?;

    for row in data {
        wtr.write_record([
            row.id.to_string(),
            row.start.to_rfc3339(),
            row.end.map(|dt| dt.to_rfc3339()).unwrap_or_default(),
            format!("{:.2}", row.duration_minutes),
            row.notes.clone().unwrap_or_default(),
            row.what_practiced.clone().unwrap_or_default(),
            row.what_learned.clone().unwrap_or_default(),
            row.next_focus.clone().unwrap_or_default(),
        ])?;
    }

    let bytes = wtr.into_inner()?;
    tokio::fs::write(output, bytes).await?;
    Ok(output.to_path_buf())
}

async fn export_json(data: &[SessionHistoryRow], output: &Path) -> AppResult<PathBuf> {
    let json = serde_json::to_vec_pretty(data)?;
    tokio::fs::write(output, json).await?;
    Ok(output.to_path_buf())
}

pub async fn backup_database<P: AsRef<Path>>(db_path: P, target_dir: &Path) -> AppResult<PathBuf> {
    tokio::fs::create_dir_all(target_dir).await?;
    let timestamp = chrono::Utc::now().format("%Y%m%d-%H%M%S").to_string();
    let backup_path = target_dir.join(format!("masterytrack-{timestamp}.db"));
    tokio::fs::copy(db_path, &backup_path).await?;
    Ok(backup_path)
}
