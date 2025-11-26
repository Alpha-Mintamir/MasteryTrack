//! Implementation of [`get_idle_time`] for macOS.
//! Uses Core Graphics to get the time since last user input event.

use std::time::Duration;
use crate::Result;

/// Get the idle time of a user on macOS.
/// 
/// Uses CGEventSourceSecondsSinceLastEventType to get the time
/// since the last keyboard or mouse event.
/// 
/// # Errors
/// 
/// Returns an error if the system call fails (unlikely on macOS).
#[inline]
pub fn get_idle_time() -> Result<Duration> {
    // CGEventSourceSecondsSinceLastEventType returns seconds as f64
    // kCGEventSourceStateCombinedSessionState = 0
    // kCGAnyInputEventType = ~0 (all input events)
    
    let idle_seconds = unsafe {
        CGEventSourceSecondsSinceLastEventType(0, !0u32)
    };
    
    // Convert to Duration (handle potential negative values)
    if idle_seconds < 0.0 {
        Ok(Duration::ZERO)
    } else {
        Ok(Duration::from_secs_f64(idle_seconds))
    }
}

#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGEventSourceSecondsSinceLastEventType(
        source_state: i32,
        event_type: u32,
    ) -> f64;
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn does_not_panic() {
        let result = get_idle_time();
        assert!(result.is_ok());
        println!("Idle time: {:?}", result.unwrap());
    }
}
