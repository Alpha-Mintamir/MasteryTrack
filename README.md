# MasteryTrack — 10,000-Hour Practice Tracker

A minimal cross-platform desktop companion (Tauri + React + Rust) that helps you clock deliberate practice time toward mastery. The app keeps a persistent SQLite ledger, watches for idle time, supports productivity-mode app whitelists/blacklists, and lives in your system tray for one-click control.

## Highlights
- **One-tap timer** anchored in the tray menu with live hover duration.
- **Idle + productivity guards** auto-pause when you're away or when distracting apps launch.
- **Live dashboard** summarising today/week/month totals, daily goal progress, streaks, and the 10,000-hour ring.
- **Session history & reflections** with inline editing, deletion, and optional notes captured each time you stop the timer.
- **Goal coaching** with daily reminders + notification when you hit your target minutes.
- **Data export + backups** to CSV/JSON plus optional auto-copy of the SQLite db.
- **Dark/light theming** and intentionally calm UI that fades into the background.
- **Typed bridge** between the React UI and Rust backend via secure Tauri commands.

## Tech Stack
- **Frontend:** React 19 + Vite + TypeScript, Zustand for local state, dayjs for formatting.
- **Desktop shell:** Tauri 2 with tray icon APIs.
- **Backend:** Async Rust services using `sqlx`, `tokio`, `rusqlite`, `idle-time`, and `sysinfo`.
- **Storage:** Local SQLite DB (`masterytrack.db`) living in the OS-specific app data folder.

## Getting Started
1. **Install prerequisites**
   - Node.js 18+ and npm
   - Rust toolchain (the project targets the latest stable/nightly; install `rustup` and `cargo`)
   - Tauri CLI: `cargo install tauri-cli`
2. **Install JS deps**
   ```bash
   npm install
   ```
3. **Run the desktop app (dev mode)**
   ```bash
   npm run tauri:dev
   ```
   This launches the React dev server (Vite) plus the Tauri shell with hot reload.
4. **Build a release bundle**
   ```bash
   npm run tauri:build
   ```
   Bundles native installers for Windows/macOS/Linux (see `src-tauri/target/release/bundle`).

## Testing
- **Rust timer unit tests**
  ```bash
  cd src-tauri
  cargo test
  ```
  Verifies timer bookkeeping logic (elapsed seconds + pause state).
- **Type checking & lint**
  ```bash
  npm run lint
  npm run build   # runs TypeScript + Vite build to ensure the UI compiles
  ```

## Project Structure
```
masterytrack/
├── src/              # React UI components, Zustand store, styles
├── src-tauri/        # Rust backend, Tauri config, SQLite schema, timer service
├── README.md
└── package.json
```

## Key Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Run UI only (useful when hitting REST commands via mocked data) |
| `npm run tauri:dev` | Launch full desktop app with hot reload |
| `npm run tauri:build` | Produce platform binaries/installers |
| `npm run lint` | ESLint for the React code |
| `cargo test` (in `src-tauri`) | Execute Rust unit tests |

## Notes
- The SQLite database is automatically created under the app's data directory (per-platform). Use the in-app **Export** buttons for CSV/JSON snapshots.
- Productivity-Mode uses lightweight process polling via `sysinfo`. Provide keywords (e.g., `code`, `figma`) for the whitelist/blacklist to keep CPU usage minimal.
- Auto-backup simply copies the DB file after each stop event; point it at any local folder (e.g., a synced drive).
