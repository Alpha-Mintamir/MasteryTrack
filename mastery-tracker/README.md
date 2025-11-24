# 10,000-Hour Mastery Tracker

A minimalistic, distraction-free desktop application for tracking deliberate practice time toward the goal of 10,000 hours of mastery in any skill.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

## Features

### ✅ Core Features Implemented

- **One-Click Timer Control** - Start, pause, and stop your practice sessions with ease
- **System Tray Integration** - Run in the background with quick access from the system tray
- **Idle Detection** - Automatic pause when you're inactive (configurable timeout)
- **Live Dashboard** - Real-time statistics showing:
  - Today's practice hours
  - This week's hours
  - This month's hours
  - Total accumulated hours toward 10,000
  - Visual progress circles with percentages
- **Session History** - Complete log of all practice sessions with:
  - Date, start time, end time, duration
  - Reflection notes for each session
  - Edit and delete functionality
- **Daily Goals & Streaks** - Set daily practice goals and track your streak
- **Reflection System** - After each session, capture:
  - What you practiced
  - What you learned
  - What you'll do next time
- **Dark & Light Mode** - Clean, modern UI with theme support
- **Data Export** - Export your session history as CSV or JSON
- **Minimalistic Design** - Distraction-free interface focused on your practice

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Backend**: Rust with Tokio async runtime
- **Desktop Framework**: Tauri 2.x
- **Database**: SQLite (bundled, local storage)
- **Styling**: Custom CSS with CSS variables for theming

## Prerequisites

Before running or building the app, ensure you have:

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **Rust** (latest stable) - [Install via rustup](https://rustup.rs/)
3. **System Dependencies** (for Tauri):

### Linux
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

### macOS
```bash
xcode-select --install
```

### Windows
- Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

## Installation & Setup

### 1. Clone or Navigate to Project
```bash
cd mastery-tracker
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run in Development Mode
```bash
npm run tauri dev
```

This will:
- Start the Vite development server
- Build the Rust backend
- Launch the desktop application

### 4. Build for Production
```bash
npm run tauri build
```

This creates optimized binaries in `src-tauri/target/release/`.

## Project Structure

```
mastery-tracker/
├── src/                      # React frontend
│   ├── components/
│   │   ├── Dashboard.tsx     # Main dashboard with timer
│   │   ├── History.tsx       # Session history table
│   │   └── Settings.tsx      # App settings
│   ├── api.ts                # Tauri command bindings
│   ├── types.ts              # TypeScript interfaces
│   ├── utils.ts              # Helper functions
│   ├── App.tsx               # Main app component
│   └── App.css               # Styles with theme support
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── db.rs             # SQLite database logic
│   │   ├── timer.rs          # Timer service
│   │   ├── idle.rs           # Idle detection
│   │   ├── tray.rs           # System tray implementation
│   │   ├── lib.rs            # Tauri commands & app logic
│   │   └── main.rs           # Entry point
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri configuration
└── README.md                 # This file
```

## Usage Guide

### Starting Your First Session

1. **Launch the app** - The dashboard opens showing your progress
2. **Click "▶ Start"** - Timer begins tracking
3. **Practice your skill** - Timer runs in background
4. **Click "⏹ Stop"** when done
5. **Add reflection notes** (optional but recommended)

### Dashboard Overview

- **Timer Display** - Large digital clock showing current session time
- **10,000 Hour Progress Circle** - Visual representation of overall progress
- **Daily Goal Circle** - Shows today's progress toward your daily goal
- **Statistics Grid** - Quick stats for today, this week, this month, and total
- **Streak Badge** - Displays your current practice streak

### Session History

- View all completed practice sessions
- Edit any session (time, duration, reflection)
- Delete sessions if needed
- See total hours across all sessions

### Settings

- **Skill Name** - Customize what you're practicing
- **Daily Goal** - Set your target practice time (default: 2 hours)
- **Idle Timeout** - Configure auto-pause duration (default: 5 minutes)
- **Theme** - Switch between light and dark mode
- **Productivity Mode** - Placeholder for future app monitoring
- **Data Export** - Download your session history

### System Tray

- Click tray icon to show/hide window
- Right-click for quick actions:
  - Show Window
  - Start Timer
  - Stop Timer
  - Quit

## Database

All data is stored locally in SQLite at:
- **Windows**: `%APPDATA%\com.ubuntu.mastery-tracker\mastery_tracker.db`
- **macOS**: `~/Library/Application Support/com.ubuntu.mastery-tracker/mastery_tracker.db`
- **Linux**: `~/.local/share/com.ubuntu.mastery-tracker/mastery_tracker.db`

### Schema

**skills** - Stores skill information
- `id`, `skill_name`, `created_at`

**sessions** - Tracks practice sessions
- `id`, `skill_id`, `start_time`, `end_time`, `duration_minutes`, `reflection_text`

**settings** - App configuration
- `id`, `daily_goal_minutes`, `idle_timeout_minutes`, `productivity_mode_enabled`, `theme`

## Keyboard Shortcuts

(Currently not implemented, but can be added)
- `Ctrl/Cmd + S` - Start/Stop timer
- `Ctrl/Cmd + ,` - Open settings

## Performance

- **App Size**: ~10-15MB (optimized build)
- **Memory Usage**: ~50-100MB during operation
- **CPU Usage**: Minimal (timer tick loop runs every second)
- **Disk Space**: SQLite database grows with sessions (~1KB per session)

## Troubleshooting

### Database Issues
If the app crashes or data seems corrupted:
```bash
# Find your database file (see Database section above)
# Rename or delete it - a new one will be created
mv mastery_tracker.db mastery_tracker.db.backup
```

### Compilation Errors
```bash
# Clear build cache
cd src-tauri
cargo clean
cd ..
npm run tauri build
```

### System Tray Not Showing (Linux)
Ensure you have a system tray extension installed:
- GNOME: Install "AppIndicator Support" extension
- KDE: Built-in support
- Other DEs: Varies by desktop environment

## Future Enhancements

- [ ] Productivity Mode - Track time only when specific apps are active
- [ ] Keyboard shortcuts
- [ ] Cloud sync (optional)
- [ ] Multiple skills tracking
- [ ] Advanced analytics and charts
- [ ] Pomodoro timer integration
- [ ] Session reminders/notifications
- [ ] Weekly/monthly reports

## Contributing

This is a personal project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Testing

### Manual Testing Checklist
- [ ] Start timer - verify it counts up
- [ ] Stop timer - verify reflection modal appears
- [ ] Pause/resume - verify timer pauses correctly
- [ ] Idle detection - wait 5 minutes, verify auto-pause
- [ ] Edit session - change times, verify calculations
- [ ] Delete session - verify removal from list
- [ ] Change settings - verify persistence after restart
- [ ] Export CSV/JSON - verify data format
- [ ] Theme switch - verify all UI elements update
- [ ] System tray - verify all menu items work

### Rust Unit Tests (Future)
```bash
cd src-tauri
cargo test
```

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Acknowledgments

- Inspired by the "10,000 hour rule" popularized by Malcolm Gladwell
- Built with [Tauri](https://tauri.app/) - Rust-based desktop framework
- UI design inspired by modern minimalist applications

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing issues for solutions

---

**Built with ❤️ and Rust**

Start your journey to mastery today! 🚀
