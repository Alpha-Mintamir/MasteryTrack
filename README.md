# MasteryTrack

Minimalist 10,000-hour mastery desktop tracker built with **Tauri 2**, **Rust**, **React (Vite + TS)**, and **SQLite**.  
The app focuses on one-skill deliberate practice with a frictionless timer, idle detection, daily goals, streaks, and reflection prompts.

## Highlights

- One-click start/stop timer accessible from the system tray with live tooltip updates.
- Auto-pause on inactivity with notifications and optional productivity-mode app guard lists.
- Dashboard summarising today/week/month totals, streak, and progress toward the 10,000-hour target.
- Editable session history with reflection notes captured when a session stops.
- Settings for daily goals, idle timeout, productivity allow/block lists, and optional local backups.
- Data export (CSV/JSON) plus SQLite database stored in the OS-specific app data directory.

## Tech stack

- **Desktop shell**: [Tauri 2](https://tauri.app/)
- **Backend**: Rust + Tokio, rusqlite for persistence
- **Frontend**: React 19 (Vite, TypeScript), React Query, Zustand, react-circular-progressbar
- **Storage**: SQLite (WAL mode) with automatic schema migrations

## Getting started

### Prerequisites

- Node.js 18+ and npm
- Rust toolchain (1.82+) with `cargo`
- `libsqlite3`/platform build deps required by Tauri (Linux: `libgtk-3-dev` etc.)

### Install & run

```bash
cd masterytracker
npm install
npm run tauri:dev   # launches Vite + Tauri desktop shell
```

To run the web UI alone for quick iteration:

```bash
npm run dev
```

### Building desktop bundles

```
npm run tauri:build
```

Artifacts land in `src-tauri/target/<triple>/release/`.

## Project layout

- `src-tauri/` – Rust backend (database layer, timer service, Tauri commands)
- `src/` – React UI (dashboard, history, settings, tray controller)
- `src/api/` – Frontend helpers wrapping Tauri invokes
- `src/components/` – UI building blocks (timer card, settings panel, modals)
- `src/hooks/useTimer.ts` – Timer event bridge + state
- `src-tauri/icons/icon.png` – Minimal tray/app icon

## Database

- Stored under the platform app-data directory (e.g., `~/Library/Application Support/masterytrack/masterytrack.sqlite`).
- Schema includes `skills`, `sessions`, and `settings`.
- WAL mode enabled for resilience. Use the built-in export actions to dump CSV/JSON snapshots or `manual_backup` Tauri command for raw `.sqlite` copies.

## Tests

Run Rust unit tests (timer/database logic):

```bash
cd masterytracker/src-tauri
cargo test
```

## Troubleshooting

- **Idle detection** uses the `idle-time` crate. On Linux, ensure X11/Wayland idle APIs are available.
- **Productivity mode** inspects running process names via `sysinfo`. Provide lowercase substrings (e.g., `code`, `obsidian`) in settings.
- **Notifications** require granting permission the first time the app starts; use OS notification settings if prompts are suppressed.
