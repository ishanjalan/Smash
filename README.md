# Smash

Privacy-first PDF toolkit for Windows, macOS, and Linux. Compress, merge, split, and protect PDFs — all processing happens locally on your device. **Works out of the box with no external dependencies.**

**Part of the privacy-first toolkit: [Squish](https://github.com/ishanjalan/ImageOptimser) (images) • [Squash](https://github.com/ishanjalan/Squash) (videos) • Smash (PDFs)**

## ✨ Features

### 🗜️ Compress PDF
Reduce file size by 50-90% using native Ghostscript. Perfect for email attachments and file sharing.

### 📎 Merge PDFs
Combine multiple PDF files into one. Drag to reorder before merging.

### ✂️ Split PDF
Extract specific pages, split by range, or split every N pages.

### 🔄 Rotate Pages
Rotate all or specific pages by 90°, 180°, or 270°.

### 🗑️ Delete Pages
Remove unwanted pages from your PDFs.

### 📑 Reorder Pages
Rearrange pages in any order you want.

### 🔢 Add Page Numbers
Add customizable page numbers to any position.

### 💧 Watermark
Add text watermarks with custom opacity and rotation.

### 🔐 Password Protect
Encrypt PDFs with AES-256 using native qpdf.

### 🔓 Remove Password
Unlock password-protected PDFs (if you know the password).

### 🖼️ PDF → Images
Convert PDF pages to PNG, JPG, or WebP at any DPI.

### 📄 Images → PDF
Create a PDF from multiple images.

## 🔒 100% Private

Your files **never leave your device**. All processing happens locally using native tools:

- **Ghostscript** for professional-grade PDF compression
- **qpdf** for AES-256 encryption
- **pdf-lib** for PDF manipulation
- **PDF.js** for rendering

No cloud uploads. No data collection. Complete privacy.

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Desktop Framework | [Tauri 2](https://tauri.app/) | Cross-platform native app |
| Backend | Rust | Native performance |
| Frontend | [SvelteKit 2](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/) | Modern reactive UI |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first CSS |
| PDF Compression | [Ghostscript](https://www.ghostscript.com/) | Industry-standard compression |
| PDF Encryption | [qpdf](https://qpdf.sourceforge.io/) | AES-256 encryption |
| PDF Manipulation | [pdf-lib](https://pdf-lib.js.org/) | Merge, split, rotate, etc. |
| PDF Rendering | [PDF.js](https://mozilla.github.io/pdf.js/) | Page previews & conversion |
| Icons | [Lucide](https://lucide.dev/) | Beautiful icon set |

## 🚀 Installation

### Download

Download the latest release for your platform from [GitHub Releases](https://github.com/ishanjalan/Smash/releases):

- **Windows**: `.msi` installer
- **macOS**: `.dmg` (Intel & Apple Silicon)
- **Linux**: `.AppImage` or `.deb`

**That's it!** All features work out of the box. No additional software required.

### Optional: Enhanced Compression

For better PDF compression (50-90% vs 10-30%), optionally install Ghostscript:

```bash
# macOS
brew install ghostscript

# Ubuntu/Debian
sudo apt install ghostscript

# Windows - download from https://www.ghostscript.com/releases/gsdnld.html
```

Smash will automatically detect and use Ghostscript when available.

## 🔧 Development

### Prerequisites
- Node.js 18+
- Rust (install via [rustup](https://rustup.rs/))
- Ghostscript and qpdf installed

### Setup

```bash
# Clone the repository
git clone https://github.com/ishanjalan/Smash.git
cd Smash

# Install dependencies
npm install

# Start development (opens Tauri app)
npm run tauri:dev
```

### Build

```bash
# Build for production
npm run tauri:build
```

Build artifacts will be in `src-tauri/target/release/bundle/`.

## 📖 Usage

1. **Select a tool** — Choose from 12+ PDF tools in the sidebar
2. **Drop files** — Drag and drop files or click to browse
3. **Configure** — Adjust settings for the selected tool
4. **Process** — Click Process to start
5. **Download** — Save processed files to your chosen location

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `1` - `9` | Switch between tools |
| `Cmd/Ctrl + O` | Open files |
| `Cmd/Ctrl + Shift + D` | Download all |
| `Escape` | Clear all / Close modal |
| `?` | Show keyboard shortcuts |

## 🌟 Smash vs Competition

| Feature | Smash | iLovePDF | SmallPDF |
|---------|-------|----------|----------|
| 100% Local | ✅ | ❌ | ❌ |
| No file uploads | ✅ | ❌ | ❌ |
| No account required | ✅ | ⚠️ Limited | ⚠️ Limited |
| No file size limits | ✅ | ❌ | ❌ |
| Native performance | ✅ | ❌ | ❌ |
| AES-256 encryption | ✅ | ✅ | ✅ |
| Ghostscript compression | ✅ | ❌ | ❌ |
| Free forever | ✅ | ⚠️ Freemium | ⚠️ Freemium |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) — Build desktop apps with web tech
- [Ghostscript](https://www.ghostscript.com/) — Industry-standard PDF processing
- [qpdf](https://qpdf.sourceforge.io/) — PDF encryption toolkit
- [pdf-lib](https://pdf-lib.js.org/) — Pure JavaScript PDF library
- [PDF.js](https://mozilla.github.io/pdf.js/) — Mozilla's PDF rendering library
- [Squish](https://github.com/ishanjalan/ImageOptimser) — Sister project for image optimization
- [Squash](https://github.com/ishanjalan/Squash) — Sister project for video compression

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ishanjalan">Ishan Jalan</a>
</p>
