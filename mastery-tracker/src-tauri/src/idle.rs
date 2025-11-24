use std::time::Duration;

/// Get system idle time in seconds
/// This is a simplified implementation. For production, you'd want to use platform-specific APIs.
#[cfg(target_os = "windows")]
pub fn get_idle_time() -> Duration {
    use winapi::um::winuser::GetLastInputInfo;
    use winapi::um::sysinfoapi::GetTickCount;
    use winapi::shared::minwindef::DWORD;
    use winapi::um::winuser::LASTINPUTINFO;

    unsafe {
        let mut last_input_info = LASTINPUTINFO {
            cbSize: std::mem::size_of::<LASTINPUTINFO>() as DWORD,
            dwTime: 0,
        };
        
        if GetLastInputInfo(&mut last_input_info) != 0 {
            let current_tick = GetTickCount();
            let idle_millis = current_tick.saturating_sub(last_input_info.dwTime) as u64;
            Duration::from_millis(idle_millis)
        } else {
            Duration::from_secs(0)
        }
    }
}

#[cfg(target_os = "macos")]
pub fn get_idle_time() -> Duration {
    // For macOS, we'd use CGEventSourceSecondsSinceLastEventType
    // This is a simplified version
    Duration::from_secs(0)
}

#[cfg(target_os = "linux")]
pub fn get_idle_time() -> Duration {
    // For Linux, we'd use X11 or other APIs
    // This is a simplified version that returns 0
    // In a real implementation, you'd use x11rb or xcb to get idle time
    Duration::from_secs(0)
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
pub fn get_idle_time() -> Duration {
    Duration::from_secs(0)
}

/// Check if the system has been idle for more than the specified duration
pub fn is_idle(threshold: Duration) -> bool {
    get_idle_time() > threshold
}
