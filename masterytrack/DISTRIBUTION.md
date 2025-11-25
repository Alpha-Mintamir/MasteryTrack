# How to Build and Distribute MasteryTrack

## Building Installers for Distribution

### Step 1: Install Dependencies (if not already done)
```bash
cd masterytrack
npm install
```

### Step 2: Build the App
```bash
npm run tauri:build
```

This command will:
1. Build the React frontend (`npm run build`)
2. Compile the Rust backend
3. Create platform-specific installers

### Step 3: Find Your Installers

After building, installers will be located in:

**Windows:**
- `src-tauri/target/release/bundle/msi/MasteryTrack_0.1.0_x64_en-US.msi` (MSI installer)
- `src-tauri/target/release/bundle/nsis/MasteryTrack_0.1.0_x64-setup.exe` (NSIS installer)

**macOS:**
- `src-tauri/target/release/bundle/macos/MasteryTrack.app` (App bundle)
- `src-tauri/target/release/bundle/dmg/MasteryTrack_0.1.0_x64.dmg` (DMG installer - recommended)

**Linux:**
- `src-tauri/target/release/bundle/appimage/MasteryTrack_0.1.0_amd64.AppImage` (AppImage - works on most Linux distros)
- `src-tauri/target/release/bundle/deb/MasteryTrack_0.1.0_amd64.deb` (Debian/Ubuntu)
- `src-tauri/target/release/bundle/rpm/MasteryTrack-0.1.0.x86_64.rpm` (Fedora/RHEL)

## What to Share with Users

### For Windows Users:
- **Recommended:** Share the `.msi` file (Windows Installer)
- **Alternative:** Share the `.exe` NSIS installer

### For macOS Users:
- **Recommended:** Share the `.dmg` file (disk image)
- **Alternative:** Share the `.app` bundle (users can drag to Applications)

### For Linux Users:
- **Recommended:** Share the `.AppImage` file (works on most distributions)
- **Alternative:** Share `.deb` for Debian/Ubuntu or `.rpm` for Fedora/RHEL

## Building for Specific Platforms

### Build only for your current platform:
```bash
npm run tauri:build
```

### Build for Windows (from Linux/macOS):
```bash
npm run tauri:build -- --target x86_64-pc-windows-msvc
```

### Build for macOS (from Linux/Windows):
```bash
npm run tauri:build -- --target x86_64-apple-darwin
# or for Apple Silicon:
npm run tauri:build -- --target aarch64-apple-darwin
```

### Build for Linux:
```bash
npm run tauri:build -- --target x86_64-unknown-linux-gnu
```

**Note:** Cross-compilation requires additional setup. It's easier to build on each target platform.

## File Sizes

Expect installers to be:
- **Windows:** ~15-30 MB
- **macOS:** ~20-35 MB  
- **Linux:** ~15-25 MB

## Before Distributing

1. **Update the app identifier** in `src-tauri/tauri.conf.json`:
   - Change `"identifier": "com.tauri.dev"` to something unique like `"com.yourname.masterytrack"`

2. **Update version** if needed:
   - Change `"version": "0.1.0"` in both `package.json` and `tauri.conf.json`

3. **Test the installer** on a clean system before sharing

4. **Code signing** (optional but recommended):
   - Windows: Sign with a code signing certificate
   - macOS: Sign with an Apple Developer certificate
   - Linux: Usually not required

## Distribution Options

1. **Direct file sharing:** Upload to cloud storage (Google Drive, Dropbox, etc.) and share link
2. **GitHub Releases:** Create a release and attach installers
3. **Website:** Host installers on your website
4. **App stores:** Submit to Microsoft Store, Mac App Store, or Flathub (Linux)
