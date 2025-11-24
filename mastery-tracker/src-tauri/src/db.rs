use rusqlite::{Connection, Result};
use std::path::Path;

pub fn init_db<P: AsRef<Path>>(path: P) -> Result<Connection> {
    let conn = Connection::open(path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY,
            skill_name TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY,
            skill_id INTEGER,
            start_time TEXT NOT NULL,
            end_time TEXT,
            duration_minutes INTEGER,
            reflection_text TEXT,
            FOREIGN KEY(skill_id) REFERENCES skills(id)
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            daily_goal_minutes INTEGER DEFAULT 120,
            idle_timeout_minutes INTEGER DEFAULT 5,
            productivity_mode_enabled INTEGER DEFAULT 0,
            target_skill_name TEXT DEFAULT 'Coding'
        )",
        [],
    )?;
    
    // Ensure default settings exist
    conn.execute(
        "INSERT OR IGNORE INTO settings (id, daily_goal_minutes, idle_timeout_minutes, productivity_mode_enabled, target_skill_name)
         VALUES (1, 120, 5, 0, 'Coding')",
        [],
    )?;

    Ok(conn)
}
