use std::path::{PathBuf};
use std::time::Duration;
use chrono::Utc;
use screenshots::Screen;
use tokio::fs;
use tokio::sync::RwLock;
use log::{error, info, warn};
use tauri::Emitter;

use crate::errors::{AppError, AppResult};
use crate::models::AppSettings;

pub struct ScreenshotService {
    settings: std::sync::Arc<RwLock<AppSettings>>,
    storage_path: PathBuf,
}

impl ScreenshotService {
    pub fn new(settings: std::sync::Arc<RwLock<AppSettings>>, storage_path: PathBuf) -> Self {
        Self {
            settings,
            storage_path,
        }
    }

    pub async fn capture_screenshot(&self) -> AppResult<PathBuf> {
        let screens = Screen::all()?;
        if screens.is_empty() {
            return Err(AppError::Custom("No screens available".into()));
        }

        // Capture primary screen (first screen)
        let screen = &screens[0];
        let image = screen.capture()?;

        // Create storage directory if it doesn't exist
        fs::create_dir_all(&self.storage_path).await?;

        // Generate filename with timestamp
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S_%3f");
        let filename = format!("screenshot_{}.jpg", timestamp);
        let file_path = self.storage_path.join(&filename);

        // Convert to JPEG with compression
        // The screenshots crate Image struct has width(), height(), and rgba() methods
        // rgba() returns &Vec<u8> in RGBA format (already converted from BGRA)
        let width = image.width();
        let height = image.height();
        let rgba_data = image.rgba().clone();
        
        // Create RGBA image from buffer
        let rgba_image = image::RgbaImage::from_raw(
            width,
            height,
            rgba_data,
        )
        .ok_or_else(|| AppError::Custom("Failed to create image from buffer".into()))?;

        // Save as JPEG using image crate (extension determines format)
        let dynamic_image = image::DynamicImage::ImageRgba8(rgba_image);
        dynamic_image.save(&file_path)
            .map_err(|e| AppError::Io(format!("Failed to save JPEG: {}", e)))?;

        info!("Screenshot saved: {}", file_path.display());
        Ok(file_path)
    }

    pub async fn cleanup_old_screenshots(&self, retention_days: i64) -> AppResult<usize> {
        let mut deleted_count = 0;
        let cutoff_time = Utc::now() - chrono::Duration::days(retention_days);

        let mut entries = fs::read_dir(&self.storage_path).await?;
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("jpg") {
                if let Ok(metadata) = entry.metadata().await {
                    if let Ok(modified) = metadata.modified() {
                        let modified_time: chrono::DateTime<Utc> = modified.into();
                        if modified_time < cutoff_time {
                            if let Err(e) = fs::remove_file(&path).await {
                                warn!("Failed to delete old screenshot {}: {}", path.display(), e);
                            } else {
                                deleted_count += 1;
                            }
                        }
                    }
                }
            }
        }

        if deleted_count > 0 {
            info!("Cleaned up {} old screenshots", deleted_count);
        }
        Ok(deleted_count)
    }

    pub async fn get_storage_size_mb(&self) -> AppResult<f64> {
        let mut total_size: u64 = 0;
        let mut entries = fs::read_dir(&self.storage_path).await?;
        while let Some(entry) = entries.next_entry().await? {
            if let Ok(metadata) = entry.metadata().await {
                if metadata.is_file() {
                    total_size += metadata.len();
                }
            }
        }
        Ok(total_size as f64 / (1024.0 * 1024.0))
    }
}

pub async fn screenshot_worker(
    service: ScreenshotService,
    app_handle: tauri::AppHandle,
    timer: crate::timer::TimerService,
) {
    use rand::{Rng, SeedableRng};
    use rand::rngs::StdRng;
    use tokio::time::sleep;

    loop {
        // Check settings and timer status
        let should_capture = {
            let settings = service.settings.read().await;
            if !settings.screenshot_enabled {
                false
            } else {
                let status = timer.status().await;
                status.running && !status.auto_paused
            }
        };

        if should_capture {
            // Random interval between 10-20 minutes (average ~15 minutes)
            // Use a Send-compatible seeded RNG
            let delay_minutes = {
                use std::time::{SystemTime, UNIX_EPOCH};
                let seed = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_nanos() as u64;
                let mut rng = StdRng::seed_from_u64(seed);
                rng.gen_range(10..=20)
            };
            sleep(Duration::from_secs(delay_minutes * 60)).await;

            // Double-check settings haven't changed and timer is still running
            let should_continue = {
                let status = timer.status().await;
                let settings = service.settings.read().await;
                settings.screenshot_enabled && status.running && !status.auto_paused
            };
            if !should_continue {
                continue;
            }

            // Capture screenshot
            match service.capture_screenshot().await {
                Ok(path) => {
                    info!("Screenshot captured: {}", path.display());
                    // Optionally emit event to frontend
                    app_handle.emit("screenshot:captured", &path.to_string_lossy()).ok();
                }
                Err(e) => {
                    error!("Failed to capture screenshot: {}", e);
                }
            }

            // Periodic cleanup (every 5 screenshots, roughly every hour or so)
            static mut CLEANUP_COUNTER: u32 = 0;
            unsafe {
                CLEANUP_COUNTER += 1;
                if CLEANUP_COUNTER >= 5 {
                    CLEANUP_COUNTER = 0;
                    let retention_days = {
                        let settings = service.settings.read().await;
                        settings.screenshot_retention_days
                    };
                    if let Err(e) = service.cleanup_old_screenshots(retention_days).await {
                        warn!("Failed to cleanup screenshots: {}", e);
                    }
                }
            }
        } else {
            // If not enabled, check every 30 seconds
            sleep(Duration::from_secs(30)).await;
        }
    }
}

