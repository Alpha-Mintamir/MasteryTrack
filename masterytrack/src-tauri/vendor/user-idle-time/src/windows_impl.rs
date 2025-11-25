//! Implementation of [`get_idle_time`] for Windows.

use core::{mem::size_of, ptr::addr_of_mut, time::Duration};

use anyhow::anyhow;
use windows_sys::Win32::{
    System::SystemInformation::GetTickCount,
    UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO},
};

use crate::Result;

/// Get the idle time of a user.
///
/// # Errors
///
/// Errors if a system call failed.
#[inline]
pub fn get_idle_time() -> Result<Duration> {
    // SAFETY: function has no preconditions
    let now = unsafe { GetTickCount() };

    #[expect(clippy::as_conversions, reason = "manually validated")]
    #[expect(clippy::cast_possible_truncation, reason = "manually validated")]
    const CB_SIZE: u32 = size_of::<LASTINPUTINFO>() as u32;

    let mut last_input_info = LASTINPUTINFO {
        cbSize: CB_SIZE,
        dwTime: 0,
    };

    // SAFETY: function has no preconditions
    if unsafe { GetLastInputInfo(addr_of_mut!(last_input_info)) } == 0 {
        Err(anyhow!("GetLastInputInfo failed"))
    } else {
        Ok(Duration::from_millis(
            now.saturating_sub(last_input_info.dwTime).into(),
        ))
    }
}

#[expect(clippy::unwrap_used, reason = "unit tests")]
#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn is_ok() {
        get_idle_time().unwrap();
    }
}
