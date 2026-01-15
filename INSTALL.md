# Installing Smash

Smash is a desktop application for Windows, macOS, and Linux. **All features work out of the box** with no additional software required.

---

## Quick Install

### 1. Download

Go to [GitHub Releases](https://github.com/ishanjalan/Smash/releases/latest) and download:

| Platform | File |
|----------|------|
| **Windows** | `Smash_x.x.x_x64-setup.exe` |
| **macOS (Apple Silicon)** | `Smash_x.x.x_aarch64.dmg` |
| **macOS (Intel)** | `Smash_x.x.x_x64.dmg` |
| **Linux (Debian/Ubuntu)** | `Smash_x.x.x_amd64.deb` |
| **Linux (Universal)** | `Smash_x.x.x_amd64.AppImage` |

### 2. Install

- **Windows**: Run the `.exe` installer
- **macOS**: Open `.dmg`, drag Smash to Applications
- **Linux**: `sudo dpkg -i Smash_*.deb` or make AppImage executable

### 3. Done!

Launch Smash and start processing PDFs. All features work immediately.

---

## Auto-Updates

Smash checks for updates automatically. When a new version is available, you'll see a notification with one-click update.

---

## Optional: Enhanced Performance

While all features work out of the box, you can optionally install these tools for better performance:

### Ghostscript (Better Compression)

Enables 50-90% file size reduction (vs 10-30% with built-in compression).

```bash
# macOS
brew install ghostscript

# Ubuntu/Debian
sudo apt install ghostscript

# Fedora
sudo dnf install ghostscript

# Windows
# Download from https://ghostscript.com/releases/gsdnld.html
```

### qpdf (AES-256 Encryption)

Enables stronger encryption for password-protected PDFs.

```bash
# macOS
brew install qpdf

# Ubuntu/Debian
sudo apt install qpdf

# Fedora
sudo dnf install qpdf

# Windows
# Download from https://github.com/qpdf/qpdf/releases
```

Smash automatically detects these tools and uses them when available.

---

## Troubleshooting

### macOS: "App is damaged" or "Cannot be opened"

This happens because the app isn't signed with an Apple Developer certificate.

**Solution:**
```bash
xattr -cr /Applications/Smash.app
```

Or right-click the app and select "Open" instead of double-clicking.

### Windows: SmartScreen Warning

Click "More info" → "Run anyway" to proceed.

### Linux: AppImage Won't Run

Make it executable first:
```bash
chmod +x Smash_*.AppImage
./Smash_*.AppImage
```

### Compression Not Very Effective

- **Without Ghostscript**: 10-30% reduction (PDF structure optimization)
- **With Ghostscript**: 50-90% reduction (image recompression)

For best results, install Ghostscript (see above).

---

## Building from Source

### Prerequisites

- Node.js 18+
- Rust (via [rustup.rs](https://rustup.rs))

### Build

```bash
git clone https://github.com/ishanjalan/Smash.git
cd Smash
npm install
npm run tauri:build
```

Output: `src-tauri/target/release/bundle/`

---

## Uninstalling

### Windows
Settings → Apps → Smash → Uninstall

### macOS
Drag Smash from Applications to Trash

### Linux
```bash
sudo apt remove smash  # If installed via .deb
# or just delete the AppImage
```

---

## Need Help?

- [GitHub Issues](https://github.com/ishanjalan/Smash/issues)
- [Discussions](https://github.com/ishanjalan/Smash/discussions)
