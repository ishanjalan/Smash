# Squash

A blazing-fast, privacy-first video compressor that runs entirely in your browser. GPU-accelerated compression via WebCodecs — no uploads, no servers, no compromises.

**The companion to [Squish](https://github.com/ishanjalan/ImageOptimser) for video optimization.**

![Squash Screenshot](static/og-image.svg)

## ✨ Features

### 🚀 GPU-Accelerated Encoding
Squash uses **[Mediabunny](https://mediabunny.dev/)** for blazing-fast hardware-accelerated encoding:
- **WebCodecs API** — Direct GPU access for encoding/decoding
- **10-100x faster** — Than software-based compression
- **Tiny bundle** — ~50KB vs ~30MB for FFmpeg alternatives
- **Instant startup** — No WASM files to download

### 🔒 100% Private
Your videos **never leave your device**. All compression happens locally using WebCodecs — no server uploads, no data collection, complete privacy.

### 🎬 Professional Codecs
| Codec | Format | Hardware Support |
|-------|--------|------------------|
| **H.264/AVC** | MP4 | ✅ All devices |
| **H.265/HEVC** | MP4 | ✅ Most modern devices |
| **VP9** | WebM | ✅ Chrome, Edge, Firefox |
| **AV1** | MP4 | ⚡ Apple M3+, Intel Arc, RTX 40+ |
| **AAC** | Audio | ✅ All devices |
| **Opus** | Audio | ✅ Modern browsers |

### 🎯 Smart Features
- **Video Trimming** — Cut to specific start/end times
- **Quality Presets** — Tiny, Web, Social, High, Lossless
- **Target File Size** — Compress to exact MB limit (WhatsApp, Discord, Email presets)
- **Resolution Scaling** — 4K to 360p options
- **Audio Controls** — Codec, bitrate, or remove audio entirely
- **Metadata Stripping** — Remove EXIF, GPS, camera info
- **File Size Estimation** — See output size before compressing

### ⚡ Professional Features
- **Batch Processing** — Compress multiple videos at once
- **Drag-to-Reorder Queue** — Prioritize your compression queue
- **Before/After Comparison** — Side-by-side slider comparison
- **Progress Estimation** — Real-time ETA with frame count
- **Drag-Out to Save** — Drag compressed videos directly to desktop
- **Performance Monitor** — System stats, codec detection
- **Download as ZIP** — Get all compressed videos in one click

### 📱 PWA Support
- Install as a desktop/mobile app
- Offline-capable with Service Worker
- Share Target API support
- File Handler API support

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | [SvelteKit 2](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/) | Modern reactive UI |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first CSS |
| Encoder | [Mediabunny](https://mediabunny.dev/) | WebCodecs wrapper for GPU encoding |
| Storage | IndexedDB via [idb](https://github.com/jakearchibald/idb) | Large file handling |
| Icons | [Lucide](https://lucide.dev/) | Beautiful icon set |
| Language | TypeScript | Type safety |

## 🔧 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Squash Video Compressor                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Mediabunny + WebCodecs (GPU Accelerated)               │    │
│  │  ├── Hardware-accelerated encoding/decoding             │    │
│  │  ├── H.264, H.265/HEVC, VP9, AV1 video codecs          │    │
│  │  ├── AAC, Opus audio codecs                             │    │
│  │  ├── Video trimming, resizing, quality control          │    │
│  │  └── 10-100x faster than software encoding              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Browser APIs                                            │    │
│  │  └── Web Workers, IndexedDB, Service Worker, Streams    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                    ↑                           ↓
              Your Video                  Compressed Video
               (local)                       (local)
                                               
              🔒 Never leaves your device 🔒
```

### Codec Availability

| Codec | Chrome | Edge | Safari | Firefox | Hardware Required |
|-------|--------|------|--------|---------|-------------------|
| H.264 | ✅ | ✅ | ✅ | ✅ | No |
| H.265/HEVC | ✅ | ✅ | ✅ | ❌ | Most devices |
| VP9 | ✅ | ✅ | ❌ | ✅ | No |
| AV1 | ⚡ | ⚡ | ⚡ | ⚡ | Apple M3+, Intel Arc, RTX 40+ |

### Performance

| Operation | GPU (WebCodecs) | Typical Software | Speedup |
|-----------|-----------------|------------------|---------|
| 1080p H.264 encode | ~800 fps | ~12 fps | **67x** |
| 4K HEVC encode | ~200 fps | ~3 fps | **67x** |
| Memory usage | Streaming | Full file in memory | **Lower** |

*Benchmarks from [Mediabunny](https://mediabunny.dev/) on modern hardware*

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm, pnpm, or yarn
- Modern browser (Chrome 94+, Edge 94+, Safari 16.4+)

### Installation

```bash
# Clone the repository
git clone https://github.com/ishanjalan/Squash.git
cd Squash

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

1. **Drop videos** — Drag and drop files onto the drop zone, click to browse, or paste from clipboard
2. **Trim (optional)** — Set start and end times to extract a clip
3. **Configure** — Choose quality preset, output format, resolution, and target size
4. **Compress** — Click the Compress button to start
5. **Compare** — Use the before/after slider to compare quality
6. **Download** — Get individual files or download all as ZIP

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Shift + D` | Download all as ZIP |
| `Cmd/Ctrl + V` | Paste video from clipboard |
| `Escape` | Clear all videos / Close modal |
| `?` | Show keyboard shortcuts |
| `1` - `5` | Quick quality preset selection |
| `M` | Switch to MP4 format |
| `W` | Switch to WebM format |
| `P` | Toggle performance monitor |

## 📊 Supported Formats

### Input
- MP4, WebM, MOV, AVI, MKV

### Output
| Format | Codec | Best For | Compression |
|--------|-------|----------|-------------|
| **MP4** | H.264 | Universal playback | Good |
| **MP4** | H.265/HEVC | Smaller files, modern devices | Better |
| **WebM** | VP9 | Web delivery | Better |
| **MP4** | AV1 | Maximum compression | Best |

## 📈 Compression Comparison

| Codec | Typical Savings | Speed | Compatibility |
|-------|-----------------|-------|---------------|
| H.264 | 40-60% | ⚡⚡⚡ Fast | Universal |
| H.265/HEVC | 50-70% | ⚡⚡ Fast | Most devices |
| VP9 | 50-70% | ⚡⚡ Fast | Web browsers |
| AV1 | 60-80% | ⚡ Moderate | Modern hardware |

## 🌟 Squash vs Squish

| Feature | Squish (Images) | Squash (Videos) |
|---------|-----------------|-----------------|
| 100% Client-side | ✅ | ✅ |
| GPU Acceleration | ❌ | ✅ (WebCodecs) |
| Batch Processing | ✅ | ✅ |
| Quality Presets | 5 | 5 |
| Format Options | 5 (JPEG, PNG, WebP, AVIF, SVG) | 4 (MP4/H.264, MP4/HEVC, WebM, AV1) |
| Video Trimming | N/A | ✅ |
| Target File Size | ❌ | ✅ |
| Before/After Comparison | ✅ | ✅ |
| ZIP Download | ✅ | ✅ |
| Drag-to-Reorder | ❌ | ✅ |
| PWA Support | ✅ | ✅ |

## 🔮 Roadmap

Potential future features:

- [ ] **Video Rotation** — Fix orientation issues
- [ ] **Video Cropping** — Remove unwanted areas
- [ ] **Frame Extraction** — Export thumbnails at any timestamp
- [ ] **Audio Extraction** — Extract audio track to MP3/AAC
- [ ] **GIF/WebP Creation** — Convert clips to animated images
- [ ] **Speed Change** — 0.5x, 1.5x, 2x playback speed
- [ ] **Video Concatenation** — Join multiple videos

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

- [Mediabunny](https://mediabunny.dev/) — Complete media toolkit for the web
- [Squish](https://github.com/ishanjalan/ImageOptimser) — Sister project for image optimization
- [Google Squoosh](https://squoosh.app/) — Inspiration for browser-based media processing

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ishanjalan">Ishan Jalan</a>
</p>
