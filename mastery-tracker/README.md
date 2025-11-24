# 10,000-Hour Mastery Tracker

A minimalistic, distraction-free desktop app to track deliberate practice. Built with Tauri, Rust, and React.

## Features

- **Timer**: One-click start/stop with background tracking.
- **Idle Detection**: Auto-pauses if you are away (configurable).
- **Dashboard**: Track progress towards 10,000 hours, streaks, and daily usage.
- **History**: Log of all sessions with reflections.
- **Settings**: Customize goals and idle timeout.
- **Data**: Local SQLite storage (auto-created in app data directory).

## Development

### Prerequisites

- Rust (latest stable)
- Node.js & npm
- Linux dependencies (if on Linux): `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `file`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `libxss-dev`.

### Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run in development mode:
   ```bash
   npm run tauri dev
   ```

### Build

To build for production:

```bash
npm run tauri build
```
