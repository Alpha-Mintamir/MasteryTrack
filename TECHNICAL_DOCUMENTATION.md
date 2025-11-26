# MasteryTrack — Technical Documentation

**Version:** 0.1.0  
**Author:** Alpha Lencho  
**Date:** November 2025  
**Built with:** Cursor AI

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Build Outputs by Platform](#2-build-outputs-by-platform)
3. [Technical Implementation](#3-technical-implementation)
4. [CI/CD Pipeline](#4-cicd-pipeline)
5. [Key Technical Decisions](#5-key-technical-decisions)

---

## 1. Architecture Overview

MasteryTrack uses a **hybrid architecture** combining web technologies for the UI with native Rust for system-level operations.

```
┌──────────────────────────────────────────────────────────────┐
│                      MasteryTrack App                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌─────────────────────┐     ┌─────────────────────────┐    │
│   │   FRONTEND (UI)     │     │   BACKEND (Native)      │    │
│   │                     │     │                         │    │
│   │  • React 19         │ IPC │  • Rust (async/Tokio)   │    │
│   │  • TypeScript       │◄───►│  • SQLite (sqlx)        │    │
│   │  • Zustand          │     │  • System APIs          │    │
│   │  • Web Audio API    │     │  • Screenshot capture   │    │
│   │  • Vite             │     │  • Idle detection       │    │
│   └─────────────────────┘     └─────────────────────────┘    │
│                                                               │
│   ┌──────────────────────────────────────────────────────┐   │
│   │                   TAURI 2 SHELL                       │   │
│   │  • Native WebView (WRY)                               │   │
│   │  • System tray integration                            │   │
│   │  • IPC bridge (JavaScript ↔ Rust)                     │   │
│   │  • Native window management                           │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + TypeScript | User interface |
| **State Management** | Zustand | Global app state |
| **Bundler** | Vite | Fast development & production builds |
| **Desktop Shell** | Tauri 2 | Native app wrapper |
| **Backend** | Rust + Tokio | Async system operations |
| **Database** | SQLite + sqlx | Local persistent storage |
| **Audio** | Web Audio API | Procedural sound generation |

---

## 2. Build Outputs by Platform

### Linux

| File | Format | Target Users |
|------|--------|--------------|
| `MasteryTrack_0.1.0_amd64.deb` | Debian Package | Ubuntu, Debian, Pop!_OS, Mint |
| `MasteryTrack-0.1.0-1.x86_64.rpm` | RPM Package | Fedora, RHEL, CentOS, openSUSE |
| `MasteryTrack_0.1.0_amd64.AppImage` | AppImage | Any Linux (portable, no install) |

**Build Environment:** Ubuntu 22.04 (GitHub Actions)

### Windows

| File | Format | Target Users |
|------|--------|--------------|
| `MasteryTrack_0.1.0_x64-setup.exe` | NSIS Installer | Standard users |
| `MasteryTrack_0.1.0_x64.msi` | MSI Package | Enterprise/IT deployment |

**Build Environment:** Windows Server 2022 (GitHub Actions)

### macOS

| File | Format | Target Users |
|------|--------|--------------|
| `MasteryTrack_0.1.0_universal.dmg` | Disk Image | All Mac users |
| `MasteryTrack.app` | App Bundle | Universal (Intel + Apple Silicon) |

**Build Environment:** macOS 14 Sonoma (GitHub Actions)  
**Build Command:** `cargo tauri build --target universal-apple-darwin`

### Binary Size Comparison

| Platform | Size | Notes |
|----------|------|-------|
| Linux .deb | ~7 MB | Uses system libraries |
| Linux .AppImage | ~81 MB | Self-contained |
| Windows .exe | ~11 MB | Includes WebView2 bootstrapper |
| macOS .dmg | ~15 MB | Universal binary (2 architectures) |

---

## 3. Technical Implementation

### 3.1 Timer Service

**Location:** `src-tauri/src/timer.rs`

The timer is implemented as an async Rust service that:
1. Tracks elapsed time with second-precision
2. Emits events to the frontend via IPC
3. Supports auto-pause on idle/distraction detection

```rust
pub struct TimerService {
    pool: SqlitePool,                    // Database connection
    settings: Arc<RwLock<AppSettings>>,  // Shared settings
    state: Arc<RwLock<TimerState>>,      // Current state
}

pub struct TimerState {
    running: bool,
    started_at: Option<DateTime<Utc>>,
    elapsed_seconds: u64,
    auto_paused: bool,
    last_reason: Option<String>,
}
```

### 3.2 Idle Detection

**Location:** `src-tauri/vendor/user-idle-time/src/`

Platform-specific implementations detect user inactivity:

#### Linux (X11)
```rust
// Uses XScreenSaver extension
let info = XScreenSaverQueryInfo(display, root);
Duration::from_millis(info.idle as u64)
```

#### Windows
```rust
// Uses Win32 GetLastInputInfo API
let mut info = LASTINPUTINFO::default();
GetLastInputInfo(&mut info);
Duration::from_millis(GetTickCount() - info.dwTime)
```

#### macOS
```rust
// Uses Core Graphics framework
unsafe extern "C" {
    fn CGEventSourceSecondsSinceLastEventType(
        source_state: i32,
        event_type: u32,
    ) -> f64;
}

pub fn get_idle_time() -> Result<Duration> {
    let seconds = unsafe { 
        CGEventSourceSecondsSinceLastEventType(0, !0u32) 
    };
    Ok(Duration::from_secs_f64(seconds))
}
```

### 3.3 Ambient Sound Generator

**Location:** `src/utils/ambientSounds.ts`

Sounds are generated **procedurally** using the Web Audio API — no audio files are bundled:

```typescript
class AmbientSoundGenerator {
    private audioContext: AudioContext;
    
    generateSound(type: SoundType): AudioBuffer {
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(
            2,                    // stereo
            sampleRate * 10,      // 10 seconds
            sampleRate
        );
        
        for (let i = 0; i < buffer.length; i++) {
            switch (type) {
                case 'white_noise':
                    data[i] = Math.random() * 2 - 1;
                    break;
                case 'brown_noise':
                    // Low-pass filtered noise
                    data[i] = data[i-1] * 0.99 + 
                              (Math.random() * 2 - 1) * 0.02;
                    break;
                case 'rain':
                    data[i] = (Math.random() * 2 - 1) * 0.1;
                    // Occasional "drops"
                    if (Math.random() < 0.0001) 
                        data[i] += Math.random() * 0.5;
                    break;
            }
        }
        return buffer;
    }
}
```

**Available Sounds:** Rain, White Noise, Brown Noise, Pink Noise, Ocean Waves, Fireplace, Wind

### 3.4 Screenshot Capture

**Location:** `src-tauri/src/screenshot.rs`

```rust
pub async fn capture_screenshot(&self) -> AppResult<PathBuf> {
    // 1. Capture screen using screenshots crate
    let screens = Screen::all()?;
    let image = screens[0].capture()?;
    
    // 2. Convert RGBA buffer to image
    let rgba_image = image::RgbaImage::from_raw(
        image.width(),
        image.height(),
        image.rgba().clone(),
    )?;
    
    // 3. Save as JPEG
    let filename = format!("screenshot_{}.jpg", 
        Utc::now().format("%Y%m%d_%H%M%S"));
    image::DynamicImage::ImageRgba8(rgba_image)
        .save(&self.storage_path.join(&filename))?;
    
    Ok(path)
}
```

**Random Timing:** Screenshots are taken at random 10-20 minute intervals to avoid predictable patterns.

### 3.5 Database Schema

**Location:** `src-tauri/src/db.rs`

```sql
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY,
    start_time TEXT NOT NULL,
    end_time TEXT,
    duration_minutes REAL DEFAULT 0,
    notes TEXT,
    what_practiced TEXT,
    what_learned TEXT,
    next_focus TEXT
);

CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    skill_name TEXT DEFAULT 'My Skill',
    daily_goal_minutes INTEGER DEFAULT 60,
    total_hours_target REAL DEFAULT 10000,
    idle_threshold_seconds INTEGER DEFAULT 300,
    productivity_mode_enabled INTEGER DEFAULT 0,
    screenshot_enabled INTEGER DEFAULT 0,
    music_enabled INTEGER DEFAULT 0,
    music_volume REAL DEFAULT 0.5
);
```

### 3.6 IPC Communication

**Rust (Backend):**
```rust
#[tauri::command]
async fn start_timer(
    state: State<'_, AppState>
) -> Result<StartTimerResponse, AppError> {
    state.timer.start().await?;
    Ok(StartTimerResponse { started_at: Utc::now() })
}
```

**TypeScript (Frontend):**
```typescript
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Call Rust function
const status = await invoke<TimerStatus>('timer_status');

// Listen to events
await listen('timer:tick', (event) => {
    setTimer(event.payload as TimerStatus);
});
```

---

## 4. CI/CD Pipeline

**Location:** `.github/workflows/build-all-platforms.yml`

```yaml
name: Build and Release MasteryTrack

on:
  push:
    tags: ['v*']  # Triggers on version tags

jobs:
  build-linux:
    runs-on: ubuntu-22.04
    steps:
      - Install: GTK3, WebKit2GTK, AppIndicator
      - Setup: Node.js 20, Rust stable
      - Build: npm ci && cargo tauri build
      - Upload: .deb, .rpm, .AppImage

  build-windows:
    runs-on: windows-latest
    steps:
      - Setup: Node.js 20, Rust stable
      - Build: npm ci && cargo tauri build
      - Upload: .exe, .msi

  build-macos:
    runs-on: macos-latest
    steps:
      - Setup: Node.js 20, Rust stable
      - Build: cargo tauri build --target universal-apple-darwin
      - Upload: .dmg

  create-release:
    needs: [build-linux, build-windows, build-macos]
    steps:
      - Download all artifacts
      - Create GitHub Release
      - Attach all binaries
```

### Build Times

| Platform | Duration |
|----------|----------|
| Linux | ~20 minutes |
| Windows | ~30 minutes |
| macOS | ~23 minutes |
| **Total** | ~30 minutes (parallel) |

---

## 5. Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Tauri over Electron** | 10x smaller binaries, native Rust performance, better security |
| **SQLite over cloud database** | Offline-first, privacy-focused, no account required |
| **Procedural audio generation** | No bundled files, smaller app size, seamless looping |
| **Vendored idle-time crate** | Original crate lacked Windows/macOS support |
| **Base64 for screenshot display** | WebView security restrictions prevent direct file access |
| **Universal macOS binary** | Single binary supports both Intel and Apple Silicon |

---

## Project Structure

```
MasteryTrack/
├── masterytrack/
│   ├── src/                      # React frontend
│   │   ├── components/
│   │   │   ├── TimerCard.tsx
│   │   │   ├── ProgressRing.tsx
│   │   │   ├── MusicPlayer.tsx
│   │   │   ├── ScreenshotGallery.tsx
│   │   │   └── ...
│   │   ├── utils/
│   │   │   └── ambientSounds.ts
│   │   ├── store.ts              # Zustand state
│   │   ├── types.ts
│   │   └── App.tsx
│   ├── src-tauri/                # Rust backend
│   │   ├── src/
│   │   │   ├── lib.rs            # Tauri commands
│   │   │   ├── db.rs             # Database operations
│   │   │   ├── timer.rs          # Timer service
│   │   │   ├── screenshot.rs     # Screenshot capture
│   │   │   └── models.rs
│   │   ├── vendor/
│   │   │   └── user-idle-time/   # Platform idle detection
│   │   └── Cargo.toml
│   └── package.json
├── .github/
│   └── workflows/
│       └── build-all-platforms.yml
└── README.md
```

---

## Summary

MasteryTrack is a cross-platform desktop application that demonstrates modern hybrid app development:

- **Frontend:** React + TypeScript running in a native WebView
- **Backend:** Async Rust for system operations and data persistence
- **Audio:** Procedurally generated ambient sounds (no audio files)
- **Cross-platform:** Single codebase builds for Linux, Windows, and macOS
- **CI/CD:** Automated builds and releases via GitHub Actions

The entire application (~5,000 lines of code) was developed with **Cursor AI** as a pair programming assistant, demonstrating the productivity gains possible with AI-assisted development.

---

*Created by Alpha Lencho • Built with Cursor AI • November 2025*

