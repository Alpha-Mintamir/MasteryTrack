use sysinfo::{MemoryRefreshKind, ProcessRefreshKind, RefreshKind, System};

use crate::models::AppSettings;

#[derive(Debug, Clone)]
pub struct ProductivityConfig {
    pub enabled: bool,
    pub allowlist: Vec<String>,
    pub blocklist: Vec<String>,
}

impl ProductivityConfig {
    pub fn from_settings(settings: &AppSettings) -> Self {
        Self {
            enabled: settings.productivity_mode_enabled,
            allowlist: settings
                .productivity_allowlist
                .iter()
                .map(|s| s.to_lowercase())
                .collect(),
            blocklist: settings
                .productivity_blocklist
                .iter()
                .map(|s| s.to_lowercase())
                .collect(),
        }
    }

    pub fn validate(&self) -> Result<(), String> {
        if !self.enabled {
            return Ok(());
        }

        let mut system = System::new();
        system.refresh_specifics(
            RefreshKind::new()
                .with_processes(ProcessRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        );

        let running: Vec<String> = system
            .processes()
            .values()
            .filter_map(|p| p.exe().map(|path| path.to_string_lossy().to_lowercase()))
            .collect();

        if !self.allowlist.is_empty()
            && !self
                .allowlist
                .iter()
                .any(|allowed| running.iter().any(|p| p.contains(allowed)))
        {
            return Err(format!(
                "Focus app not detected. Open one of: {}",
                self.allowlist.join(", ")
            ));
        }

        if let Some(blocked) = self
            .blocklist
            .iter()
            .find(|blocked| running.iter().any(|p| p.contains(&***blocked)))
        {
            return Err(format!(
                "Blocked app running ({}). Close it to keep tracking.",
                blocked
            ));
        }

        Ok(())
    }
}
