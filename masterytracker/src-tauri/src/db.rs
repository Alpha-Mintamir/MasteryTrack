use std::path::{Path, PathBuf};

use crate::models::{
    AppSettings, DashboardStats, ExportFormat, GoalProgress, ProgressSlice, ReflectionInput,
    SessionCollection, SessionEditPayload, SessionFilter, SessionRecord, SettingsUpdate,
};
use anyhow::{anyhow, Context, Result};
use chrono::{DateTime, Datelike, Duration, NaiveDate, Utc};
use parking_lot::Mutex;
use rusqlite::{params, Connection, OptionalExtension, Row};

pub struct DbLayer {
    conn: Mutex<Connection>,
    db_path: PathBuf,
}

impl DbLayer {
    pub fn new(path: PathBuf) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(&path)?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        let layer = Self {
            conn: Mutex::new(conn),
            db_path: path,
        };
        layer.init_schema()?;
        Ok(layer)
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock();
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS skills(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                skill_name TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
                start_time TEXT NOT NULL,
                end_time TEXT,
                duration_minutes INTEGER DEFAULT 0,
                reflection_practice TEXT,
                reflection_learning TEXT,
                reflection_next TEXT,
                notes TEXT
            );

            CREATE TABLE IF NOT EXISTS settings(
                id INTEGER PRIMARY KEY CHECK (id = 1),
                skill_id INTEGER NOT NULL REFERENCES skills(id),
                target_skill_name TEXT NOT NULL,
                daily_goal_minutes INTEGER NOT NULL,
                idle_timeout_minutes INTEGER NOT NULL,
                productivity_mode_enabled INTEGER NOT NULL DEFAULT 0,
                productivity_allowlist TEXT NOT NULL DEFAULT '[]',
                productivity_blocklist TEXT NOT NULL DEFAULT '[]',
                auto_backup_path TEXT
            );
            "#,
        )?;
        drop(conn);

        self.ensure_seed_data()
    }

    pub fn path(&self) -> &Path {
        &self.db_path
    }

    fn ensure_seed_data(&self) -> Result<()> {
        let now = Utc::now();
        // skill
        let skill_id = {
            let conn = self.conn.lock();
            conn.query_row("SELECT id FROM skills ORDER BY id LIMIT 1", [], |row| {
                row.get::<_, i64>(0)
            })
            .optional()?
        };

        let skill_id = if let Some(id) = skill_id {
            id
        } else {
            let conn = self.conn.lock();
            conn.execute(
                "INSERT INTO skills(skill_name, created_at) VALUES(?1, ?2)",
                params!["Deep Work", now.to_rfc3339()],
            )?;
            conn.last_insert_rowid()
        };

        // settings
        let has_settings = {
            let conn = self.conn.lock();
            conn.query_row("SELECT id FROM settings WHERE id = 1", [], |row| {
                row.get::<_, i64>(0)
            })
            .optional()?
            .is_some()
        };

        if !has_settings {
            let conn = self.conn.lock();
            conn.execute(
                "INSERT INTO settings(id, skill_id, target_skill_name, daily_goal_minutes, idle_timeout_minutes, productivity_mode_enabled, productivity_allowlist, productivity_blocklist) VALUES(1, ?1, 'Deep Work', 120, 5, 0, '[]', '[]')",
                params![skill_id],
            )?;
        }

        Ok(())
    }

    pub fn ensure_skill(&self, name: &str) -> Result<i64> {
        {
            let conn = self.conn.lock();
            if let Some(id) = conn
                .query_row(
                    "SELECT id FROM skills WHERE skill_name = ?1",
                    params![name],
                    |row| row.get::<_, i64>(0),
                )
                .optional()?
            {
                return Ok(id);
            }
        }

        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO skills(skill_name, created_at) VALUES(?1, ?2)",
            params![name, Utc::now().to_rfc3339()],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn insert_session(
        &self,
        skill_id: i64,
        skill_name: &str,
        start: DateTime<Utc>,
    ) -> Result<SessionRecord> {
        let conn = self.conn.lock();
        conn.execute(
            "INSERT INTO sessions(skill_id, start_time) VALUES(?1, ?2)",
            params![skill_id, start.to_rfc3339()],
        )?;
        let id = conn.last_insert_rowid();
        Ok(SessionRecord {
            id,
            skill_id,
            skill_name: skill_name.to_string(),
            start_time: start,
            end_time: None,
            duration_minutes: 0,
            reflection_practice: None,
            reflection_learning: None,
            reflection_next: None,
            notes: None,
        })
    }

    pub fn complete_session(
        &self,
        session_id: i64,
        reflection: Option<ReflectionInput>,
    ) -> Result<SessionRecord> {
        let end = Utc::now();
        let conn = self.conn.lock();
        let (start, _skill_id): (String, i64) = conn
            .query_row(
                "SELECT start_time, skill_id FROM sessions WHERE id = ?1",
                params![session_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()?
            .ok_or_else(|| anyhow!("Session not found"))?;

        let start_dt = DateTime::parse_from_rfc3339(&start)?.with_timezone(&Utc);
        let minutes = ((end - start_dt).num_minutes()).max(1);
        conn.execute(
            "UPDATE sessions SET end_time = ?1, duration_minutes = ?2, reflection_practice = ?3, reflection_learning = ?4, reflection_next = ?5, notes = COALESCE(notes, ?6) WHERE id = ?7",
            params![
                end.to_rfc3339(),
                minutes,
                reflection.as_ref().and_then(|r| r.practiced.clone()),
                reflection.as_ref().and_then(|r| r.learned.clone()),
                reflection.as_ref().and_then(|r| r.next_focus.clone()),
                reflection.as_ref().and_then(|r| r.notes.clone()),
                session_id
            ],
        )?;

        self.fetch_session(session_id)
    }

    pub fn fetch_session(&self, session_id: i64) -> Result<SessionRecord> {
        let conn = self.conn.lock();
        conn.query_row(
            "SELECT s.id, s.skill_id, sk.skill_name, s.start_time, s.end_time, s.duration_minutes, s.reflection_practice, s.reflection_learning, s.reflection_next, s.notes
             FROM sessions s
             JOIN skills sk ON sk.id = s.skill_id
             WHERE s.id = ?1",
            params![session_id],
            |row| map_session(row),
        )
        .map_err(Into::into)
    }

    pub fn fetch_sessions(&self, filter: SessionFilter) -> Result<SessionCollection> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT s.id, s.skill_id, sk.skill_name, s.start_time, s.end_time, s.duration_minutes, s.reflection_practice, s.reflection_learning, s.reflection_next, s.notes
             FROM sessions s
             JOIN skills sk ON sk.id = s.skill_id
             ORDER BY s.start_time DESC
             LIMIT ?1 OFFSET ?2",
        )?;

        let rows = stmt
            .query_map(params![filter.limit, filter.offset], map_session)?
            .collect::<Result<Vec<_>, _>>()?;

        let total: i64 = conn.query_row("SELECT COUNT(*) FROM sessions", [], |row| row.get(0))?;

        Ok(SessionCollection { data: rows, total })
    }

    pub fn edit_session(&self, payload: SessionEditPayload) -> Result<SessionRecord> {
        if payload.end_time <= payload.start_time {
            return Err(anyhow!("End time must be after start time"));
        }
        let minutes = (payload.end_time - payload.start_time).num_minutes().max(1);
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE sessions SET start_time = ?1, end_time = ?2, duration_minutes = ?3, notes = ?4, reflection_practice = ?5, reflection_learning = ?6, reflection_next = ?7 WHERE id = ?8",
            params![
                payload.start_time.to_rfc3339(),
                payload.end_time.to_rfc3339(),
                minutes,
                payload.notes,
                payload.reflection_practice,
                payload.reflection_learning,
                payload.reflection_next,
                payload.id
            ],
        )?;

        self.fetch_session(payload.id)
    }

    pub fn delete_session(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock();
        conn.execute("DELETE FROM sessions WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn save_reflection(
        &self,
        session_id: i64,
        reflection: ReflectionInput,
    ) -> Result<SessionRecord> {
        let conn = self.conn.lock();
        conn.execute(
            "UPDATE sessions SET reflection_practice = ?1, reflection_learning = ?2, reflection_next = ?3, notes = CASE WHEN ?4 IS NULL OR ?4 = '' THEN notes ELSE ?4 END WHERE id = ?5",
            params![
                reflection.practiced,
                reflection.learned,
                reflection.next_focus,
                reflection.notes,
                session_id
            ],
        )?;
        drop(conn);
        self.fetch_session(session_id)
    }

    pub fn load_settings(&self) -> Result<AppSettings> {
        let conn = self.conn.lock();
        conn.query_row(
            "SELECT id, skill_id, target_skill_name, daily_goal_minutes, idle_timeout_minutes, productivity_mode_enabled, productivity_allowlist, productivity_blocklist, COALESCE(auto_backup_path, '') FROM settings WHERE id = 1",
            [],
            |row| {
                let allow_raw: String = row.get(6)?;
                let block_raw: String = row.get(7)?;
                Ok(AppSettings {
                    id: row.get(0)?,
                    skill_id: row.get(1)?,
                    target_skill_name: row.get(2)?,
                    daily_goal_minutes: row.get(3)?,
                    idle_timeout_minutes: row.get(4)?,
                    productivity_mode_enabled: row.get::<_, i64>(5)? == 1,
                    productivity_allowlist: serde_json::from_str(&allow_raw).unwrap_or_default(),
                    productivity_blocklist: serde_json::from_str(&block_raw).unwrap_or_default(),
                    auto_backup_path: {
                        let val: String = row.get(8)?;
                        if val.is_empty() { None } else { Some(val) }
                    },
                })
            },
        )
        .context("Settings not initialized")
    }

    pub fn update_settings(&self, update: SettingsUpdate) -> Result<AppSettings> {
        let mut current = self.load_settings()?;
        if let Some(name) = update.target_skill_name {
            current.target_skill_name = name.clone();
            let conn = self.conn.lock();
            conn.execute(
                "UPDATE skills SET skill_name = ?1 WHERE id = ?2",
                params![name, current.skill_id],
            )?;
        }
        if let Some(goal) = update.daily_goal_minutes {
            current.daily_goal_minutes = goal.max(15);
        }
        if let Some(timeout) = update.idle_timeout_minutes {
            current.idle_timeout_minutes = timeout.max(1);
        }
        if let Some(flag) = update.productivity_mode_enabled {
            current.productivity_mode_enabled = flag;
        }
        if let Some(allow) = update.productivity_allowlist {
            current.productivity_allowlist = allow;
        }
        if let Some(block) = update.productivity_blocklist {
            current.productivity_blocklist = block;
        }
        if let Some(path_opt) = update.auto_backup_path {
            current.auto_backup_path = path_opt;
        }

        let conn = self.conn.lock();
        conn.execute(
            "UPDATE settings SET target_skill_name = ?1, daily_goal_minutes = ?2, idle_timeout_minutes = ?3, productivity_mode_enabled = ?4, productivity_allowlist = ?5, productivity_blocklist = ?6, auto_backup_path = ?7 WHERE id = 1",
            params![
                current.target_skill_name,
                current.daily_goal_minutes,
                current.idle_timeout_minutes,
                if current.productivity_mode_enabled { 1 } else { 0 },
                serde_json::to_string(&current.productivity_allowlist)?,
                serde_json::to_string(&current.productivity_blocklist)?,
                current.auto_backup_path
            ],
        )?;

        Ok(current)
    }

    pub fn dashboard_stats(&self, settings: &AppSettings) -> Result<DashboardStats> {
        let conn = self.conn.lock();
        let now = Utc::now();
        let today_start = now
            .date_naive()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            .and_utc();
        let today_end = today_start + Duration::days(1);
        let week_start =
            today_start - Duration::days(now.weekday().num_days_from_monday() as i64);
        let month_start = now
            .date_naive()
            .with_day(1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            .and_utc();

        let today_minutes = self.sum_between(&conn, today_start, today_end)?;
        let week_minutes = self.sum_between(&conn, week_start, today_end)?;
        let month_minutes = self.sum_between(&conn, month_start, today_end)?;
        let total_minutes: i64 = conn.query_row(
            "SELECT COALESCE(SUM(duration_minutes), 0) FROM sessions",
            [],
            |row| row.get(0),
        )?;

        let goal_percentage =
            (today_minutes as f32 / settings.daily_goal_minutes as f32).min(1.0) * 100.0;
        let ten_k_progress = ProgressSlice {
            percentage: ((total_minutes as f32) / 10_000f32 / 60f32).min(1.0) * 100.0,
            remaining_minutes: (10_000 * 60 - total_minutes).max(0),
        };

        let streak = self.compute_streak(&conn, today_start.date_naive())?;

        Ok(DashboardStats {
            today_minutes,
            week_minutes,
            month_minutes,
            total_minutes,
            ten_k_progress,
            daily_goal: GoalProgress {
                goal_minutes: settings.daily_goal_minutes,
                completed_minutes: today_minutes,
                percentage: goal_percentage,
            },
            streak_days: streak,
        })
    }

    fn sum_between(&self, conn: &Connection, start: DateTime<Utc>, end: DateTime<Utc>) -> Result<i64> {
        let mut stmt = conn.prepare(
            "SELECT COALESCE(SUM(duration_minutes), 0)
             FROM sessions
             WHERE start_time >= ?1 AND start_time < ?2",
        )?;
        Ok(stmt.query_row(
            params![start.to_rfc3339(), end.to_rfc3339()],
            |row| row.get(0),
        )?)
    }

    fn compute_streak(&self, conn: &Connection, today: NaiveDate) -> Result<i64> {
        let mut stmt = conn.prepare(
            "SELECT DATE(start_time) AS day, SUM(duration_minutes) AS minutes
             FROM sessions
             GROUP BY day
             HAVING minutes > 0
             ORDER BY day DESC",
        )?;

        let mut rows = stmt.query([])?;
        let mut streak = 0;
        let mut expected_day = today;
        while let Some(row) = rows.next()? {
            let day_str: String = row.get(0)?;
            let day = NaiveDate::parse_from_str(&day_str, "%Y-%m-%d")?;
            if day == expected_day {
                streak += 1;
                expected_day = expected_day.pred_opt().unwrap_or(expected_day);
            } else if day < expected_day {
                break;
            } else {
                expected_day = day;
            }
        }
        Ok(streak)
    }

    pub fn export_sessions(&self, format: ExportFormat) -> Result<String> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT s.id, s.skill_id, sk.skill_name, s.start_time, s.end_time, s.duration_minutes, s.reflection_practice, s.reflection_learning, s.reflection_next, s.notes
             FROM sessions s
             JOIN skills sk ON sk.id = s.skill_id
             ORDER BY s.start_time ASC",
        )?;
        let sessions = stmt
            .query_map([], map_session)?
            .collect::<Result<Vec<_>, _>>()?;
        let dir = std::env::temp_dir();
        let file_path = dir.join(format!(
            "masterytrack-export-{}.{}",
            Utc::now().format("%Y%m%dT%H%M%SZ"),
            format.file_extension()
        ));

        match format {
            ExportFormat::Json => {
                std::fs::write(&file_path, serde_json::to_vec_pretty(&sessions)?)?;
            }
            ExportFormat::Csv => {
                let mut wtr = csv::Writer::from_path(&file_path)?;
                wtr.write_record([
                    "id",
                    "skill",
                    "start_time",
                    "end_time",
                    "duration_minutes",
                    "reflection_practice",
                    "reflection_learning",
                    "reflection_next",
                    "notes",
                ])?;
                for session in sessions {
                    wtr.write_record([
                        session.id.to_string(),
                        session.skill_name,
                        session.start_time.to_rfc3339(),
                        session.end_time.map(|d| d.to_rfc3339()).unwrap_or_default(),
                        session.duration_minutes.to_string(),
                        session.reflection_practice.unwrap_or_default(),
                        session.reflection_learning.unwrap_or_default(),
                        session.reflection_next.unwrap_or_default(),
                        session.notes.unwrap_or_default(),
                    ])?;
                }
                wtr.flush()?;
            }
        }

        Ok(file_path.display().to_string())
    }

    pub fn backup_to(&self, dir: &Path) -> Result<String> {
        std::fs::create_dir_all(dir)?;
        let file_path = dir.join(format!(
            "masterytrack-backup-{}.sqlite",
            Utc::now().format("%Y%m%dT%H%M%S")
        ));
        std::fs::copy(self.path(), &file_path)?;
        Ok(file_path.display().to_string())
    }
}

fn map_session(row: &Row) -> Result<SessionRecord, rusqlite::Error> {
    let start: String = row.get(3)?;
    let end: Option<String> = row.get(4)?;

    Ok(SessionRecord {
        id: row.get(0)?,
        skill_id: row.get(1)?,
        skill_name: row.get(2)?,
        start_time: DateTime::parse_from_rfc3339(&start)
            .map_err(|err| {
                rusqlite::Error::FromSqlConversionFailure(
                    3,
                    rusqlite::types::Type::Text,
                    Box::new(err),
                )
            })?
            .with_timezone(&Utc),
        end_time: match end {
            Some(val) => Some(
                DateTime::parse_from_rfc3339(&val)
                    .map_err(|err| {
                        rusqlite::Error::FromSqlConversionFailure(
                            4,
                            rusqlite::types::Type::Text,
                            Box::new(err),
                        )
                    })?
                    .with_timezone(&Utc),
            ),
            None => None,
        },
        duration_minutes: row.get(5)?,
        reflection_practice: row.get(6)?,
        reflection_learning: row.get(7)?,
        reflection_next: row.get(8)?,
        notes: row.get(9)?,
    })
}
