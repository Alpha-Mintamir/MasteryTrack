use anyhow::Result;
use chrono::{DateTime, Utc, Local, Duration, Datelike};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: i64,
    pub skill_name: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: i64,
    pub skill_id: i64,
    pub start_time: String,
    pub end_time: Option<String>,
    pub duration_minutes: Option<i64>,
    pub reflection_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub id: i64,
    pub daily_goal_minutes: i64,
    pub idle_timeout_minutes: i64,
    pub productivity_mode_enabled: bool,
    pub theme: String, // "light" or "dark"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub today_hours: f64,
    pub week_hours: f64,
    pub month_hours: f64,
    pub total_hours: f64,
    pub progress_percentage: f64,
    pub streak_days: i64,
    pub daily_goal_hours: f64,
    pub daily_progress_percentage: f64,
}

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.initialize()?;
        Ok(db)
    }

    fn initialize(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Create skills table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                skill_name TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        // Create sessions table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                skill_id INTEGER NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                duration_minutes INTEGER,
                reflection_text TEXT,
                FOREIGN KEY (skill_id) REFERENCES skills(id)
            )",
            [],
        )?;

        // Create settings table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                daily_goal_minutes INTEGER NOT NULL DEFAULT 120,
                idle_timeout_minutes INTEGER NOT NULL DEFAULT 5,
                productivity_mode_enabled INTEGER NOT NULL DEFAULT 0,
                theme TEXT NOT NULL DEFAULT 'light'
            )",
            [],
        )?;

        // Insert default settings if none exist
        let settings_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM settings",
            [],
            |row| row.get(0),
        )?;

        if settings_count == 0 {
            conn.execute(
                "INSERT INTO settings (daily_goal_minutes, idle_timeout_minutes, productivity_mode_enabled, theme)
                 VALUES (120, 5, 0, 'light')",
                [],
            )?;
        }

        // Insert default skill if none exist
        let skill_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM skills",
            [],
            |row| row.get(0),
        )?;

        if skill_count == 0 {
            let now = Utc::now().to_rfc3339();
            conn.execute(
                "INSERT INTO skills (skill_name, created_at) VALUES (?1, ?2)",
                params!["My Skill", now],
            )?;
        }

        Ok(())
    }

    pub fn get_default_skill(&self) -> Result<Skill> {
        let conn = self.conn.lock().unwrap();
        let skill = conn.query_row(
            "SELECT id, skill_name, created_at FROM skills ORDER BY id LIMIT 1",
            [],
            |row| {
                Ok(Skill {
                    id: row.get(0)?,
                    skill_name: row.get(1)?,
                    created_at: row.get(2)?,
                })
            },
        )?;
        Ok(skill)
    }

    pub fn update_skill_name(&self, skill_id: i64, name: String) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE skills SET skill_name = ?1 WHERE id = ?2",
            params![name, skill_id],
        )?;
        Ok(())
    }

    pub fn start_session(&self, skill_id: i64) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO sessions (skill_id, start_time) VALUES (?1, ?2)",
            params![skill_id, now],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn end_session(&self, session_id: i64, reflection: Option<String>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        // Get start time
        let start_time: String = conn.query_row(
            "SELECT start_time FROM sessions WHERE id = ?1",
            params![session_id],
            |row| row.get(0),
        )?;

        let start: DateTime<Utc> = start_time.parse()?;
        let end: DateTime<Utc> = now.parse()?;
        let duration = end.signed_duration_since(start);
        let duration_minutes = duration.num_minutes();

        conn.execute(
            "UPDATE sessions SET end_time = ?1, duration_minutes = ?2, reflection_text = ?3 WHERE id = ?4",
            params![now, duration_minutes, reflection, session_id],
        )?;

        Ok(())
    }

    pub fn get_active_session(&self) -> Result<Option<Session>> {
        let conn = self.conn.lock().unwrap();
        let result = conn.query_row(
            "SELECT id, skill_id, start_time, end_time, duration_minutes, reflection_text 
             FROM sessions WHERE end_time IS NULL ORDER BY id DESC LIMIT 1",
            [],
            |row| {
                Ok(Session {
                    id: row.get(0)?,
                    skill_id: row.get(1)?,
                    start_time: row.get(2)?,
                    end_time: row.get(3)?,
                    duration_minutes: row.get(4)?,
                    reflection_text: row.get(5)?,
                })
            },
        );

        match result {
            Ok(session) => Ok(Some(session)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn get_all_sessions(&self) -> Result<Vec<Session>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, skill_id, start_time, end_time, duration_minutes, reflection_text 
             FROM sessions WHERE end_time IS NOT NULL ORDER BY start_time DESC",
        )?;

        let sessions = stmt
            .query_map([], |row| {
                Ok(Session {
                    id: row.get(0)?,
                    skill_id: row.get(1)?,
                    start_time: row.get(2)?,
                    end_time: row.get(3)?,
                    duration_minutes: row.get(4)?,
                    reflection_text: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(sessions)
    }

    pub fn update_session(&self, id: i64, start_time: String, end_time: String, reflection: Option<String>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        
        let start: DateTime<Utc> = start_time.parse()?;
        let end: DateTime<Utc> = end_time.parse()?;
        let duration = end.signed_duration_since(start);
        let duration_minutes = duration.num_minutes();

        conn.execute(
            "UPDATE sessions SET start_time = ?1, end_time = ?2, duration_minutes = ?3, reflection_text = ?4 WHERE id = ?5",
            params![start_time, end_time, duration_minutes, reflection, id],
        )?;

        Ok(())
    }

    pub fn delete_session(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM sessions WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_settings(&self) -> Result<Settings> {
        let conn = self.conn.lock().unwrap();
        let settings = conn.query_row(
            "SELECT id, daily_goal_minutes, idle_timeout_minutes, productivity_mode_enabled, theme 
             FROM settings LIMIT 1",
            [],
            |row| {
                Ok(Settings {
                    id: row.get(0)?,
                    daily_goal_minutes: row.get(1)?,
                    idle_timeout_minutes: row.get(2)?,
                    productivity_mode_enabled: row.get::<_, i64>(3)? != 0,
                    theme: row.get(4)?,
                })
            },
        )?;
        Ok(settings)
    }

    pub fn update_settings(&self, settings: Settings) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE settings SET 
             daily_goal_minutes = ?1, 
             idle_timeout_minutes = ?2, 
             productivity_mode_enabled = ?3,
             theme = ?4
             WHERE id = ?5",
            params![
                settings.daily_goal_minutes,
                settings.idle_timeout_minutes,
                if settings.productivity_mode_enabled { 1 } else { 0 },
                settings.theme,
                settings.id
            ],
        )?;
        Ok(())
    }

    pub fn get_dashboard_stats(&self) -> Result<DashboardStats> {
        let conn = self.conn.lock().unwrap();
        
        let total_minutes: i64 = conn.query_row(
            "SELECT COALESCE(SUM(duration_minutes), 0) FROM sessions WHERE end_time IS NOT NULL",
            [],
            |row| row.get(0),
        )?;

        let now = Local::now();
        let today_start = now.date_naive().and_hms_opt(0, 0, 0).unwrap();
        let today_start_utc = DateTime::<Utc>::from_naive_utc_and_offset(today_start, Utc);

        let today_minutes: i64 = conn.query_row(
            "SELECT COALESCE(SUM(duration_minutes), 0) FROM sessions 
             WHERE end_time IS NOT NULL AND start_time >= ?1",
            params![today_start_utc.to_rfc3339()],
            |row| row.get(0),
        )?;

        let week_start = now.date_naive() - Duration::days(now.weekday().num_days_from_monday() as i64);
        let week_start = week_start.and_hms_opt(0, 0, 0).unwrap();
        let week_start_utc = DateTime::<Utc>::from_naive_utc_and_offset(week_start, Utc);

        let week_minutes: i64 = conn.query_row(
            "SELECT COALESCE(SUM(duration_minutes), 0) FROM sessions 
             WHERE end_time IS NOT NULL AND start_time >= ?1",
            params![week_start_utc.to_rfc3339()],
            |row| row.get(0),
        )?;

        let month_start = now.date_naive().with_day(1).unwrap().and_hms_opt(0, 0, 0).unwrap();
        let month_start_utc = DateTime::<Utc>::from_naive_utc_and_offset(month_start, Utc);

        let month_minutes: i64 = conn.query_row(
            "SELECT COALESCE(SUM(duration_minutes), 0) FROM sessions 
             WHERE end_time IS NOT NULL AND start_time >= ?1",
            params![month_start_utc.to_rfc3339()],
            |row| row.get(0),
        )?;

        // Calculate streak
        let streak_days = self.calculate_streak(&conn)?;

        // Get daily goal
        let daily_goal_minutes: i64 = conn.query_row(
            "SELECT daily_goal_minutes FROM settings LIMIT 1",
            [],
            |row| row.get(0),
        )?;

        let total_hours = total_minutes as f64 / 60.0;
        let today_hours = today_minutes as f64 / 60.0;
        let week_hours = week_minutes as f64 / 60.0;
        let month_hours = month_minutes as f64 / 60.0;
        let daily_goal_hours = daily_goal_minutes as f64 / 60.0;

        let progress_percentage = (total_hours / 10000.0) * 100.0;
        let daily_progress_percentage = (today_hours / daily_goal_hours) * 100.0;

        Ok(DashboardStats {
            today_hours,
            week_hours,
            month_hours,
            total_hours,
            progress_percentage: progress_percentage.min(100.0),
            streak_days,
            daily_goal_hours,
            daily_progress_percentage: daily_progress_percentage.min(100.0),
        })
    }

    fn calculate_streak(&self, conn: &Connection) -> Result<i64> {
        // Get all dates with sessions, ordered desc
        let mut stmt = conn.prepare(
            "SELECT DISTINCT date(start_time) as session_date 
             FROM sessions 
             WHERE end_time IS NOT NULL 
             ORDER BY session_date DESC"
        )?;

        let dates: Vec<String> = stmt
            .query_map([], |row| row.get(0))?
            .collect::<Result<Vec<_>, _>>()?;

        if dates.is_empty() {
            return Ok(0);
        }

        let today = Local::now().date_naive();
        let yesterday = today - Duration::days(1);

        let mut streak = 0i64;
        let mut current_date = today;

        // Check if there's a session today or yesterday to start the streak
        let first_date = dates[0].parse::<chrono::NaiveDate>().unwrap_or(today);
        
        if first_date != today && first_date != yesterday {
            return Ok(0); // Streak is broken
        }

        if first_date == yesterday {
            current_date = yesterday;
        }

        for date_str in &dates {
            if let Ok(date) = date_str.parse::<chrono::NaiveDate>() {
                if date == current_date {
                    streak += 1;
                    current_date = current_date - Duration::days(1);
                } else if date < current_date {
                    // Gap found, streak is broken
                    break;
                }
            }
        }

        Ok(streak)
    }

    pub fn export_sessions_csv(&self) -> Result<String> {
        let sessions = self.get_all_sessions()?;
        let mut wtr = csv::Writer::from_writer(vec![]);

        wtr.write_record(&["ID", "Start Time", "End Time", "Duration (minutes)", "Reflection"])?;

        for session in sessions {
            wtr.write_record(&[
                session.id.to_string(),
                session.start_time,
                session.end_time.unwrap_or_default(),
                session.duration_minutes.unwrap_or(0).to_string(),
                session.reflection_text.unwrap_or_default(),
            ])?;
        }

        let data = String::from_utf8(wtr.into_inner()?)?;
        Ok(data)
    }

    pub fn export_sessions_json(&self) -> Result<String> {
        let sessions = self.get_all_sessions()?;
        let json = serde_json::to_string_pretty(&sessions)?;
        Ok(json)
    }
}
