//! Get the idle time of a user.
//! The time returned is the time since the last user input event.
//!
//! Example:
//! ```
//! use user_idle_time::get_idle_time;
//! let idle = get_idle_time().unwrap();
//! let idle_seconds = idle.as_secs();
//! ```

pub type Error = anyhow::Error;
pub type Result<T> = anyhow::Result<T>;

#[cfg(all(target_os = "linux", feature = "x11"))]
#[path = "x11_impl.rs"]
mod idle;

#[cfg(all(target_os = "linux", not(feature = "x11")))]
#[path = "dbus_impl.rs"]
mod idle;

#[cfg(target_os = "windows")]
#[path = "windows_impl.rs"]
mod idle;

// #[cfg(target_os = "macos")]
// #[path = "macos_impl.rs"]
// mod idle;

pub use idle::get_idle_time;

#[expect(clippy::unwrap_used, reason = "unit tests")]
#[cfg(test)]
mod test {
    use std::{thread::sleep, time::Duration};

    use super::get_idle_time;

    const DURATION: Duration = Duration::from_secs(10);

    #[test]
    // If this test fails, you probably moved your mouse or something while the test was running.
    fn main() {
        let idle_before = get_idle_time().unwrap();
        sleep(DURATION);
        let idle_after = get_idle_time().unwrap();
        assert!(idle_after >= idle_before + DURATION,);
    }
}
