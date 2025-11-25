//! Implementation of [`get_idle_time`] using D-Bus.

use std::time::Duration;

use anyhow::anyhow;
use dbus::blocking::Connection;

use crate::Result;

const SCREENSAVERS: &[&[&str]] = &[
    &[
        "org.freedesktop.ScreenSaver",
        "/org/freedesktop/ScreenSaver",
        "org.freedesktop.ScreenSaver",
    ],
    &[
        "org.gnome.ScreenSaver",
        "/org/gnome/ScreenSaver",
        "org.gnome.ScreenSaver",
    ],
    &[
        "org.kde.ScreenSaver",
        "/org/kde/ScreenSaver",
        "org.kde.ScreenSaver",
    ],
];

/// Get the idle time of a user.
///
/// # Errors
///
/// Errors if a system call fails.
#[inline]
pub fn get_idle_time() -> Result<Duration> {
    for screensaver in SCREENSAVERS {
        let Ok(conn) = Connection::new_session() else {
            continue;
        };
        assert!(screensaver.len() > 2);
        let proxy = conn.with_proxy(screensaver[0], screensaver[1], Duration::from_millis(5000));

        let (time,): (u32,) = match proxy.method_call(screensaver[2], "GetActiveTime", ()) {
            Ok(value) => value,
            Err(_) => continue,
        };

        // freedesktop seems to return the time in milliseconds??
        if screensaver[0] == "org.freedesktop.ScreenSaver" {
            return Ok(Duration::from_millis(u64::from(time)));
        }

        return Ok(Duration::from_secs(u64::from(time)));
    }

    Err(anyhow!("No screensaver available"))
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn does_not_panic() {
        get_idle_time().unwrap();
    }
}
