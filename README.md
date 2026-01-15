# Smash

Privacy-first PDF tools that run entirely in your browser. Compress, merge, split, and convert PDFs — no uploads, no servers, no limits.

**Part of the privacy-first toolkit: [Squish](https://github.com/ishanjalan/ImageOptimser) (images) • [Squash](https://github.com/ishanjalan/Squash) (videos) • Smash (PDFs)**

![Smash Screenshot](static/og-image.svg)

## ✨ Features

### 🗜️ Compress PDF
Reduce file size by re-rendering pages as optimized images. Perfect for email attachments and file sharing.

### 📎 Merge PDFs
Combine multiple PDF files into one. Drag to reorder before merging.

### ✂️ Split PDF
Extract specific pages or split by range. Get exactly the pages you need.

### 🖼️ PDF → Images
Convert PDF pages to PNG, JPG, or WebP. Choose resolution (72/150/300 DPI) and quality.

### 📄 Images → PDF
Create a PDF from multiple images. Drag to reorder before conversion.

## 🔒 100% Private

Your files **never leave your device**. All processing happens locally in your browser using WebAssembly and Canvas APIs. No server uploads, no data collection, complete privacy.

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | [SvelteKit 2](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/) | Modern reactive UI |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first CSS |
| PDF Manipulation | [pdf-lib](https://pdf-lib.js.org/) | Create, modify, merge PDFs |
| PDF Rendering | [PDF.js](https://mozilla.github.io/pdf.js/) | Render PDFs to Canvas |
| Storage | IndexedDB via [idb](https://github.com/jakearchibald/idb) | Large file handling |
| Icons | [Lucide](https://lucide.dev/) | Beautiful icon set |
| Language | TypeScript | Type safety |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm, pnpm, or yarn
- Modern browser (Chrome 94+, Edge 94+, Firefox 100+, Safari 16.4+)

### Installation

```bash
# Clone the repository
git clone https://github.com/ishanjalan/Smash.git
cd Smash

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

## 📖 Usage

1. **Select a tool** — Choose Compress, Merge, Split, PDF→Images, or Images→PDF
2. **Drop files** — Drag and drop files onto the drop zone or click to browse
3. **Configure** — Adjust settings like compression level, page range, or image format
4. **Process** — Click the Process button to start
5. **Download** — Get your processed files individually or as a ZIP

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `1` - `5` | Switch between tools |
| `Cmd/Ctrl + Shift + D` | Download all as ZIP |
| `Cmd/Ctrl + V` | Paste from clipboard |
| `Escape` | Clear all / Close modal |
| `?` | Show keyboard shortcuts |

## 📊 Supported Formats

### Input
- PDF files (for Compress, Merge, Split, PDF→Images)
- JPG, PNG, WebP images (for Images→PDF)

### Output
| Tool | Output |
|------|--------|
| **Compress** | PDF (optimized) |
| **Merge** | Single PDF |
| **Split** | Multiple PDFs |
| **PDF→Images** | PNG, JPG, or WebP |
| **Images→PDF** | Single PDF |

## 📱 PWA Support

- Install as a desktop/mobile app
- Offline-capable with Service Worker
- Share Target API support
- File Handler API support

## 🌟 Smash vs Competition

| Feature | Smash | iLovePDF | SmallPDF |
|---------|-------|----------|----------|
| 100% Client-side | ✅ | ❌ | ❌ |
| No file uploads | ✅ | ❌ | ❌ |
| No account required | ✅ | ⚠️ Limited | ⚠️ Limited |
| No file limits | ✅ | ❌ | ❌ |
| Offline support | ✅ | ❌ | ❌ |
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

- [pdf-lib](https://pdf-lib.js.org/) — Pure JavaScript PDF library
- [PDF.js](https://mozilla.github.io/pdf.js/) — Mozilla's PDF rendering library
- [Squish](https://github.com/ishanjalan/ImageOptimser) — Sister project for image optimization
- [Squash](https://github.com/ishanjalan/Squash) — Sister project for video compression

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ishanjalan">Ishan Jalan</a>
</p>
