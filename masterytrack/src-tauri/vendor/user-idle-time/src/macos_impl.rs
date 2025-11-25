//! Implementation of [`get_idle_time`] for MacOS.

use std::{io, mem::size_of, ptr::null_mut, time::Duration};

use apple_sys::CoreFoundation::{
    CFAllocatorDefault, CFDataGetBytes, CFDataGetTypeID, CFDataRef, CFDictionaryGetValueIfPresent,
    CFGetTypeID, CFIndex, CFNumberGetTypeID, CFNumberGetValue, CFNumberRef, CFNumberSInt64Type,
    CFRange, CFRelease, CFStringCreateWithCString, CFStringEncodingUTF8, CFTypeRef,
};
use apple_sys::IOKit::{
    IOIteratorNext, IOMasterPort, IOObjectRelease, IORegistryEntryCreateCFProperties,
    IOServiceGetMatchingServices, IOServiceMatching,
};
use mach2::{
    kern_return::KERN_SUCCESS,
    port::{MACH_PORT_NULL, mach_port_t},
};

use crate::Result;
use anyhow::anyhow;

/// Get the idle time of a user.
/// 
/// # Errors
/// 
/// Errors if a system call fails.
#[inline]
#[expect(clippy::as_conversions, reason = "manually validated")]
#[expect(clippy::cast_sign_loss, reason = "manually validated")]
#[expect(clippy::cast_possible_wrap, reason = "manually validated")]
#[expect(clippy::host_endian_bytes, reason = "manually validated")]
pub fn get_idle_time() -> Result<Duration> {
    let mut ns = 0_u64;
    let mut port: mach_port_t = 0;
    let mut iter = 0;
    let mut value: CFTypeRef = null_mut();
    let mut properties = null_mut();
    let entry;

    unsafe {
        let port_result = IOMasterPort(MACH_PORT_NULL, std::ptr::from_mut(&mut port));
        if port_result != KERN_SUCCESS {
            return Err(anyhow!(
                "Unable to open mach port: {}",
                io::Error::last_os_error()
            ));
        }

        let service_name = cstr::cstr!("IOHIDSystem");
        let service_result = IOServiceGetMatchingServices(
            port,
            IOServiceMatching(service_name.as_ptr().cast()),
            &mut iter,
        );
        if service_result != KERN_SUCCESS {
            return Err(anyhow!(
                "Unable to lookup IOHIDSystem: {}",
                io::Error::last_os_error()
            ));
        }

        if iter > 0 {
            entry = IOIteratorNext(iter);
            if entry > 0 {
                let prop_res = IORegistryEntryCreateCFProperties(
                    entry,
                    std::ptr::from_mut(&mut properties),
                    kCFAllocatorDefault,
                    0,
                );

                if prop_res == KERN_SUCCESS {
                    let prop_name = cstr::cstr!("HIDIdleTime");
                    let prop_name_cf = CFStringCreateWithCString(
                        kCFAllocatorDefault,
                        prop_name.as_ptr().cast(),
                        kCFStringEncodingUTF8,
                    );
                    let present =
                        CFDictionaryGetValueIfPresent(properties, prop_name_cf.cast(), &mut value);
                    CFRelease(prop_name_cf.cast());

                    if present == 1 {
                        IOObjectRelease(iter);
                        IOObjectRelease(entry);
                        CFRelease(properties.cast());
                        if CFGetTypeID(value) == CFDataGetTypeID() {
                            let mut buf = [0_u8; size_of::<i64>()];
                            let range = CFRange {
                                location: buf.as_ptr() as CFIndex,
                                length: size_of::<i64>() as CFIndex,
                            };
                            CFDataGetBytes(value as CFDataRef, range, buf.as_mut_ptr());
                            ns = i64::from_ne_bytes(buf) as u64;
                        } else if CFGetTypeID(value) == CFNumberGetTypeID() {
                            let mut buf = [0_i64, 1];
                            CFNumberGetValue(
                                value as CFNumberRef,
                                kCFNumberSInt64Type,
                                buf.as_mut_ptr().cast(),
                            );
                            ns = buf[0] as u64;
                        }
                    }
                }
            }
            IOObjectRelease(entry);
        }
        IOObjectRelease(iter);
    }

    Ok(Duration::from_nanos(ns))
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn does_not_panic() {
        get_idle_time().unwrap();
    }
}
