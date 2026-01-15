# Smash - Comprehensive Audit

## Executive Summary

Smash is a privacy-first PDF toolkit built with Tauri (Rust backend) and SvelteKit (frontend). This audit covers UX, UI, architecture, code quality, and distribution.

**Overall Grade: B+** - Solid foundation with room for improvement in polish and distribution.

---

## 1. UX Issues

### Critical
| Issue | Impact | Fix |
|-------|--------|-----|
| **No onboarding for missing tools** | Users see cryptic errors if Ghostscript/qpdf not installed | Add first-run check with install instructions |
| **No progress persistence** | Closing app loses all work | Add session recovery |
| **Compression feedback unclear** | Users don't know if 5% reduction is good or bad | Add quality indicators and recommendations |

### Medium
| Issue | Impact | Fix |
|-------|--------|-----|
| No drag-and-drop reordering in merge | Users can't reorder PDFs visually | Add drag handles |
| No preview before processing | Users process blindly | Add preview mode |
| No undo/redo | Mistakes are permanent | Implement history stack |
| Page range input is confusing | "1-5, 8" format not intuitive | Add visual page picker |

### Minor
| Issue | Impact | Fix |
|-------|--------|-----|
| Keyboard shortcuts not discoverable | Power users don't know they exist | Add tooltip hints |
| No recent files | Users re-navigate to same folders | Add recent files list |
| No batch progress | Can't see overall progress for multiple files | Add batch progress bar |

---

## 2. UI Issues

### Critical
| Issue | Location | Fix |
|-------|----------|-----|
| **Hero says "browser" but it's desktop app** | `+page.svelte:179` | Change to "entirely on your device" |
| **Hero mentions "Ghostscript WASM"** | `+page.svelte:184` | Change to "Powered by Ghostscript" |
| Error states show generic "Processing failed" | Multiple | Show specific error messages |

### Medium
| Issue | Location | Fix |
|-------|----------|-----|
| Loading states inconsistent | Workspace.svelte | Standardize spinner + text pattern |
| Empty states lack visual interest | Multiple | Add illustrations |
| Color contrast issues on status text | PDFCard.svelte | Increase contrast for accessibility |
| No dark/light mode toggle | - | Add theme switcher |

### Minor
| Issue | Location | Fix |
|-------|----------|-----|
| Truncated filenames with no tooltip | File list | Add title attribute |
| No file size warnings | DropZone | Warn on very large files |
| Icon inconsistency | Various | Audit all icons for consistency |

---

## 3. Architecture Issues

### Critical
| Issue | Impact | Fix |
|-------|--------|-----|
| **Temp files in app data dir** | May fill up disk | Use system temp dir with cleanup |
| **No error boundaries** | One error crashes whole app | Add Svelte error boundaries |
| **PDF.js loaded from CDN** | Fails offline | Bundle PDF.js locally |

### Medium
| Issue | Location | Fix |
|-------|----------|-----|
| Large bundle size (973KB) | node2.js chunk | Code split PDF processing |
| No lazy loading | Components | Lazy load heavy components |
| Mixed async patterns | pdf.ts | Standardize on async/await |
| Hardcoded strings | Multiple | Extract to i18n file |

### Suggested Architecture

```
src/
├── lib/
│   ├── components/     # UI components (keep)
│   ├── stores/         # State management (keep)
│   ├── utils/
│   │   ├── pdf/        # Split into modules
│   │   │   ├── compress.ts
│   │   │   ├── merge.ts
│   │   │   ├── split.ts
│   │   │   ├── protect.ts
│   │   │   └── index.ts
│   │   └── ...
│   ├── i18n/           # Add translations
│   └── config/         # Add app config
```

---

## 4. Code Quality Issues

### Rust Backend

```rust
// GOOD: Well-organized command structure
// BAD: Unused functions and variables (5 warnings)

// Fix warnings in:
// - src/commands/split.rs:6 - unused import
// - src/ghostscript.rs:255,260 - unused variables
// - src/qpdf.rs:145,167 - unused functions
```

**Recommendations:**
1. Run `cargo clippy` and fix all warnings
2. Add unit tests for compression logic
3. Add integration tests for Ghostscript/qpdf calls
4. Document public functions with `///` comments

### TypeScript Frontend

```typescript
// ISSUES FOUND:

// 1. Type safety gaps
pdfs.addFiles(files);  // FileList but typed as unknown

// 2. Magic strings
if (pdfs.settings.tool === 'compress')  // Should be enum

// 3. Large functions
async function processItem()  // 150+ lines, should split

// 4. Missing error types
catch (error) { }  // Error type not specified
```

**Recommendations:**
1. Enable strict TypeScript (`"strict": true`)
2. Create enums for tool types
3. Split large functions into smaller units
4. Add JSDoc comments for public APIs

---

## 5. Installation Process

### Current State: Manual & Confusing

Users must:
1. Download binary from GitHub Releases
2. Install Ghostscript manually
3. Install qpdf manually
4. Hope PATH is configured correctly

### Recommended: One-Click Install

#### Option A: Bundle Dependencies (Recommended)

```toml
# src-tauri/tauri.conf.json
{
  "bundle": {
    "resources": [
      "bin/gs/*",      # Bundle Ghostscript
      "bin/qpdf/*"     # Bundle qpdf
    ]
  }
}
```

**Pros:** Works out of the box
**Cons:** Larger app size (~100MB), licensing considerations

#### Option B: Auto-Install on First Run

```typescript
// On first launch
async function checkDependencies() {
  const gs = await checkGhostscript();
  const qpdf = await checkQPDF();
  
  if (!gs.available || !qpdf.available) {
    showSetupWizard({
      missingGhostscript: !gs.available,
      missingQpdf: !qpdf.available
    });
  }
}
```

**Setup Wizard should:**
1. Detect OS
2. Show install commands or download buttons
3. Verify installation
4. Only proceed when ready

#### Option C: Homebrew/Chocolatey/apt Package

```bash
# macOS
brew tap ishanjalan/tap
brew install smash  # Auto-installs ghostscript as dependency

# Windows (Chocolatey)
choco install smash

# Linux (apt)
sudo add-apt-repository ppa:ishanjalan/smash
sudo apt install smash
```

---

## 6. Update Mechanism

### Current State: Manual Downloads

Users must:
1. Check GitHub for new releases
2. Download new version
3. Replace old version

### Recommended: Auto-Updates

#### Add Tauri Updater Plugin

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri-plugin-updater = "2"
```

```json
// src-tauri/tauri.conf.json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/ishanjalan/Smash/releases/latest/download/latest.json"
      ],
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

```typescript
// Check for updates on launch
import { check } from '@tauri-apps/plugin-updater';

async function checkForUpdates() {
  const update = await check();
  if (update) {
    const confirmed = await ask(
      `Update ${update.version} available. Install now?`
    );
    if (confirmed) {
      await update.downloadAndInstall();
      await relaunch();
    }
  }
}
```

---

## 7. Installation Guide (For Users)

### macOS

```bash
# 1. Download Smash.dmg from GitHub Releases
# 2. Open DMG and drag Smash to Applications
# 3. Install Ghostscript (required for compression)
brew install ghostscript

# 4. Install qpdf (required for encryption)
brew install qpdf

# 5. Launch Smash from Applications
```

### Windows

```powershell
# 1. Download Smash-setup.exe from GitHub Releases
# 2. Run installer

# 3. Install Ghostscript
# Download from: https://ghostscript.com/releases/gsdnld.html
# Run installer, add to PATH when prompted

# 4. Install qpdf
# Download from: https://github.com/qpdf/qpdf/releases
# Extract to C:\Program Files\qpdf and add bin to PATH

# 5. Launch Smash
```

### Linux

```bash
# Ubuntu/Debian
# 1. Download Smash.deb from GitHub Releases
sudo dpkg -i Smash_1.0.0_amd64.deb

# Dependencies are auto-installed, but verify:
sudo apt install ghostscript qpdf

# 2. Launch from Applications menu or run:
smash
```

---

## 8. Priority Fixes

### P0 - Must Fix Before Release
1. [x] Fix hero text (remove "browser" and "WASM" references) ✅
2. [x] Add first-run welcome wizard ✅
3. [x] Bundle PDF.js locally (remove CDN dependency) ✅
4. [x] Fix Rust compiler warnings ✅
5. [x] Make app work without external dependencies ✅
6. [x] Add auto-update mechanism ✅

### P1 - Should Fix Soon
1. [ ] Improve error messages with actionable hints
2. [ ] Add visual page picker for split/delete
3. [ ] Code split large chunks

### P2 - Nice to Have
1. [ ] Add drag-and-drop reorder for merge
2. [ ] Add recent files
3. [ ] Add dark/light theme toggle
4. [ ] Add i18n support

---

## 9. Testing Checklist

### Before Each Release
- [ ] Compression works with Ghostscript installed
- [ ] Compression shows helpful error if Ghostscript missing
- [ ] Merge combines PDFs in correct order
- [ ] Split extracts correct pages
- [ ] Protect adds password (verify with Adobe Reader)
- [ ] Unlock removes password
- [ ] PDF to Images exports all pages
- [ ] Images to PDF creates valid PDF
- [ ] App launches on clean macOS install
- [ ] App launches on clean Windows install
- [ ] App launches on clean Ubuntu install

---

## 10. File Structure Recommendation

```
Smash/
├── .github/
│   └── workflows/
│       ├── release.yml       # Build & release
│       └── test.yml          # Add: CI tests
├── src/                      # Frontend
│   ├── lib/
│   │   ├── components/
│   │   ├── stores/
│   │   ├── utils/
│   │   │   ├── pdf/          # Split pdf.ts into modules
│   │   │   │   ├── compress.ts
│   │   │   │   ├── merge.ts
│   │   │   │   └── ...
│   │   │   └── ...
│   │   └── i18n/             # Add: translations
│   └── routes/
├── src-tauri/                # Backend
│   ├── src/
│   │   ├── commands/
│   │   ├── ghostscript.rs
│   │   ├── qpdf.rs
│   │   └── lib.rs
│   └── Cargo.toml
├── docs/                     # Add: documentation
│   ├── INSTALL.md
│   ├── CONTRIBUTING.md
│   └── ARCHITECTURE.md
├── AUDIT.md                  # This file
├── README.md
└── package.json
```

---

## Summary

| Area | Grade | Notes |
|------|-------|-------|
| UX | B | Good flow, needs onboarding |
| UI | B+ | Clean design, minor issues |
| Architecture | B | Solid, needs code splitting |
| Code Quality | B- | Works, needs cleanup |
| Distribution | C | Manual install, no auto-update |
| Documentation | C+ | README exists, needs install guide |

**Next Steps:**
1. Fix P0 issues (hero text, dependency wizard)
2. Add auto-updater
3. Create proper install packages
4. Add CI testing
