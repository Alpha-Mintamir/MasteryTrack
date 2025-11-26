# MasteryTrack — 10,000-Hour Practice Tracker

<p align="center">
  <img src="masterytrack/src-tauri/icons/128x128.png" alt="MasteryTrack Logo" width="128" height="128">
</p>

<p align="center">
  <strong>A beautiful cross-platform desktop app to track your journey to mastery</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#development">Development</a> •
  <a href="#credits">Credits</a>
</p>

---

## About

MasteryTrack is a minimal cross-platform desktop companion built with **Tauri + React + Rust** that helps you clock deliberate practice time toward mastery. Based on Malcolm Gladwell's **10,000-Hour Rule**, this app keeps a persistent SQLite ledger, watches for idle time, supports productivity-mode app whitelists/blacklists, and lives in your system tray for one-click control.

## Features

### ⏱️ Timer & Tracking
- **One-tap timer** anchored in the system tray with live hover duration
- **Idle detection** — auto-pause when you're away
- **Productivity guards** — auto-pause when distracting apps launch
- **Session reflections** — capture what you practiced, learned, and plan to focus on next

### 📊 Dashboard & Analytics
- **Live dashboard** showing today/week/month totals
- **Daily goal progress** with visual ring indicator
- **Streak tracking** to maintain consistency
- **10,000-hour progress ring** — see how far you've come!

### 🎧 Focus Music (Ambient Sounds)
- **7 built-in ambient sounds**: Rain, White Noise, Brown Noise, Pink Noise, Ocean Waves, Fireplace, Wind
- **Auto-play** when timer starts (configurable)
- **Auto-stop** when timer stops
- **100% offline** — no internet required, sounds generated locally

### 📸 Screenshot Capture
- **Automatic screenshots** during practice sessions (10-20 min intervals)
- **Screenshot gallery** with grid/list views
- **Lightbox viewer** for full-size viewing
- **Easy deletion** of unwanted screenshots
- **Configurable retention** period

### 💾 Data Management
- **Export to CSV/JSON** with optional settings inclusion
- **Import data** when migrating to a new PC
- **Auto-backup** of SQLite database
- **Full data portability**

### 🎨 User Experience
- **Dark/light theming** with smooth transitions
- **Beautiful splash screen** on launch
- **Responsive reflection modal** that always fits
- **Clean, distraction-free UI**

## Installation

### Download Pre-built Binaries

Download the latest release for your platform from the [Releases](https://github.com/Alpha-Mintamir/MasteryTrack/releases) page.

| Platform | File |
|----------|------|
| **Linux (Debian/Ubuntu)** | `MasteryTrack_x.x.x_amd64.deb` |
| **Linux (Fedora/RHEL)** | `MasteryTrack-x.x.x-1.x86_64.rpm` |
| **Linux (Universal)** | `MasteryTrack_x.x.x_amd64.AppImage` |
| **Windows** | `MasteryTrack_x.x.x_x64-setup.exe` |
| **macOS** | `MasteryTrack_x.x.x_x64.dmg` |

### Linux Installation

**Debian/Ubuntu:**
```bash
sudo dpkg -i MasteryTrack_0.1.0_amd64.deb
```

**Fedora/RHEL:**
```bash
sudo rpm -i MasteryTrack-0.1.0-1.x86_64.rpm
```

**AppImage:**
```bash
chmod +x MasteryTrack_0.1.0_amd64.AppImage
./MasteryTrack_0.1.0_amd64.AppImage
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + Vite + TypeScript |
| **State Management** | Zustand |
| **Desktop Shell** | Tauri 2 |
| **Backend** | Rust (async with Tokio) |
| **Database** | SQLite via sqlx |
| **Audio** | Web Audio API (procedural generation) |

## Development

### Prerequisites

- Node.js 18+ and npm
- Rust toolchain (`rustup` and `cargo`)
- Tauri CLI: `cargo install tauri-cli`
- System dependencies (Linux):
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libxdo-dev
  ```

### Setup

```bash
# Clone the repository
git clone https://github.com/Alpha-Mintamir/MasteryTrack.git
cd MasteryTrack/masterytrack

# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

### Project Structure

```
MasteryTrack/
├── masterytrack/
│   ├── src/                    # React frontend
│   │   ├── components/         # UI components
│   │   │   ├── AboutPage.tsx
│   │   │   ├── MusicPlayer.tsx
│   │   │   ├── ProgressRing.tsx
│   │   │   ├── ReflectionModal.tsx
│   │   │   ├── ScreenshotGallery.tsx
│   │   │   ├── SettingsPanel.tsx
│   │   │   └── ...
│   │   ├── utils/              # Utility functions
│   │   │   └── ambientSounds.ts
│   │   ├── store.ts            # Zustand state
│   │   └── types.ts            # TypeScript types
│   ├── src-tauri/              # Rust backend
│   │   ├── src/
│   │   │   ├── lib.rs          # Main Tauri commands
│   │   │   ├── db.rs           # Database operations
│   │   │   ├── timer.rs        # Timer service
│   │   │   ├── screenshot.rs   # Screenshot capture
│   │   │   └── models.rs       # Data models
│   │   └── Cargo.toml
│   └── package.json
└── README.md
```

### Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run frontend only |
| `npm run tauri:dev` | Launch full app with hot reload |
| `npm run tauri:build` | Build production binaries |
| `npm run lint` | Run ESLint |
| `cargo test` | Run Rust tests (in `src-tauri/`) |

## The 10,000-Hour Rule

> "Ten thousand hours is the magic number of greatness." — Malcolm Gladwell

The 10,000-Hour Rule, popularized in Malcolm Gladwell's book *Outliers*, suggests that achieving world-class expertise in any skill requires approximately 10,000 hours of deliberate practice. This app helps you:

- **Track every hour** of your practice journey
- **Stay consistent** with daily goals and streaks
- **Reflect** on what you're learning
- **Visualize progress** toward your 10,000-hour goal

## Credits

**Created by [Alpha Lencho](https://github.com/Alpha-Mintamir)**

Built with ❤️ using:
- [Tauri](https://tauri.app/) — Build cross-platform apps
- [React](https://react.dev/) — UI library
- [Rust](https://www.rust-lang.org/) — Backend language
- [SQLite](https://www.sqlite.org/) — Database

---

<p align="center">
  <strong>Start your journey to mastery today! 🚀</strong>
</p>

## License

MIT License — feel free to use, modify, and distribute.
