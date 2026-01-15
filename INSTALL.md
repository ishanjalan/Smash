# Installing Smash

Smash is a desktop application for Windows, macOS, and Linux. Follow the instructions for your operating system.

---

## Download

1. Go to [GitHub Releases](https://github.com/ishanjalan/Smash/releases/latest)
2. Download the installer for your platform:
   - **macOS**: `Smash_x.x.x_aarch64.dmg` (Apple Silicon) or `Smash_x.x.x_x64.dmg` (Intel)
   - **Windows**: `Smash_x.x.x_x64-setup.exe`
   - **Linux**: `Smash_x.x.x_amd64.deb` (Debian/Ubuntu) or `Smash_x.x.x_amd64.AppImage`

---

## macOS

### Step 1: Install Smash

1. Open the downloaded `.dmg` file
2. Drag **Smash** to the **Applications** folder
3. Eject the DMG

**First Launch:** Right-click Smash in Applications and select "Open" (required for unsigned apps).

### Step 2: Install Dependencies

Open Terminal and run:

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Ghostscript (required for compression)
brew install ghostscript

# Install qpdf (required for password protection)
brew install qpdf
```

### Step 3: Verify

Launch Smash. It will check for dependencies and show green checkmarks if everything is installed.

---

## Windows

### Step 1: Install Smash

1. Run the downloaded `.exe` installer
2. Follow the installation wizard
3. Launch Smash from the Start Menu

### Step 2: Install Ghostscript

1. Download from [ghostscript.com/releases/gsdnld.html](https://ghostscript.com/releases/gsdnld.html)
2. Run the installer
3. **Important:** Check "Add to PATH" during installation

### Step 3: Install qpdf (Optional, for password protection)

1. Download from [github.com/qpdf/qpdf/releases](https://github.com/qpdf/qpdf/releases)
2. Download the `qpdf-x.x.x-msvc64.zip` file
3. Extract to `C:\Program Files\qpdf`
4. Add `C:\Program Files\qpdf\bin` to your system PATH:
   - Search "Environment Variables" in Windows
   - Edit "Path" under System Variables
   - Add the qpdf bin directory

### Step 4: Verify

Restart Smash. It will check for dependencies and show their status.

---

## Linux (Ubuntu/Debian)

### Step 1: Install Smash

```bash
# Download the .deb file, then:
sudo dpkg -i Smash_x.x.x_amd64.deb

# Or use the AppImage:
chmod +x Smash_x.x.x_amd64.AppImage
./Smash_x.x.x_amd64.AppImage
```

### Step 2: Install Dependencies

```bash
# Install Ghostscript and qpdf
sudo apt update
sudo apt install ghostscript qpdf
```

### Step 3: Verify

Launch Smash from your application menu or run `smash` in terminal.

---

## Linux (Fedora/RHEL)

```bash
# Install dependencies
sudo dnf install ghostscript qpdf

# Install Smash
sudo rpm -i Smash_x.x.x_x86_64.rpm
```

---

## Linux (Arch)

```bash
# Install dependencies
sudo pacman -S ghostscript qpdf

# Use the AppImage
chmod +x Smash_x.x.x_amd64.AppImage
./Smash_x.x.x_amd64.AppImage
```

---

## Troubleshooting

### "Ghostscript not found"

**macOS:**
```bash
# Check if installed
which gs

# If not found, reinstall
brew reinstall ghostscript
```

**Windows:**
- Ensure Ghostscript is in your PATH
- Try running `gswin64c --version` in Command Prompt
- Reinstall and check "Add to PATH"

**Linux:**
```bash
# Check if installed
which gs

# Install if missing
sudo apt install ghostscript  # Debian/Ubuntu
sudo dnf install ghostscript  # Fedora
```

### "qpdf not found"

Same process as above, but for qpdf:
```bash
# macOS
brew install qpdf

# Linux
sudo apt install qpdf
```

### macOS: "App is damaged" or "Cannot be opened"

```bash
# Remove quarantine attribute
xattr -cr /Applications/Smash.app
```

### Compression doesn't reduce file size

- Some PDFs are already highly optimized
- Try the "Screen" preset for maximum compression
- PDFs with only text won't compress much (text is already efficient)
- Image-heavy PDFs compress the most

---

## Building from Source

For developers who want to build Smash themselves:

### Prerequisites

- Node.js 18+
- Rust (install via [rustup.rs](https://rustup.rs))
- Ghostscript and qpdf installed

### Build Steps

```bash
# Clone the repository
git clone https://github.com/ishanjalan/Smash.git
cd Smash

# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

Build artifacts will be in `src-tauri/target/release/bundle/`.

---

## Updating Smash

Currently, updates are manual:

1. Download the latest release from GitHub
2. Install over the existing version

**Tip:** Watch the repository on GitHub to get notified of new releases.

---

## Uninstalling

### macOS
Drag Smash from Applications to Trash.

### Windows
Use "Add or Remove Programs" in Settings.

### Linux
```bash
# Debian/Ubuntu
sudo apt remove smash

# Or delete the AppImage
rm Smash_x.x.x_amd64.AppImage
```

---

## Need Help?

- [Open an Issue](https://github.com/ishanjalan/Smash/issues)
- [Discussions](https://github.com/ishanjalan/Smash/discussions)
