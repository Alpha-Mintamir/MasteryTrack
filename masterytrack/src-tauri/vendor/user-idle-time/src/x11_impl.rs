//! Implementation of [`get_idle_time`] for X11.

use std::{ffi::c_void, os::raw::c_char, ptr::null, time::Duration};

use anyhow::anyhow;
use x11::{
    xlib::{XCloseDisplay, XDefaultScreen, XFree, XOpenDisplay, XRootWindow},
    xss::{XScreenSaverAllocInfo, XScreenSaverQueryInfo},
};

use crate::Result;

// Mostly taken from https://stackoverflow.com/questions/222606/detecting-keyboard-mouse-activity-in-linux

/// Get the idle time of a user.
///
/// # Errors
///
/// Errors if a system call fails.
#[inline]
pub fn get_idle_time() -> Result<Duration> {
    // SAFETY: `info` is freed at the end of the function.
    let info = unsafe { XScreenSaverAllocInfo() };
    // SAFETY: `display` is closed at the end of the function.
    let display = unsafe { XOpenDisplay(null::<c_char>()) };
    if (display.is_null()) {
        return Err(anyhow!("Failed to open display"));
    }
    // SAFETY: `display` is checked to be valid.
    let screen = unsafe { XDefaultScreen(display) };
    // SAFETY: `display` is checkced to be valid.
    let root_window = unsafe { XRootWindow(display, screen) };
    // SAFETY: `display` is checked to be valid.
    let status = unsafe { XScreenSaverQueryInfo(display, root_window, info) };
    // SAFETY: `info` is a valid pointer.
    let time = unsafe { (*info).idle };

    // SAFETY: `info` has not been freed yet.
    unsafe {
        XFree(info.cast::<c_void>());
    }
    // SAFETY: `displat` has not been closed yet.
    unsafe {
        XCloseDisplay(display);
    }

    if status == 1 {
        Ok(Duration::from_millis(time))
    } else {
        Err(anyhow!("XScreenSaverQueryInfo is not OK"))
    }
}
