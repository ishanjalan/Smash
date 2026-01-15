export type PDFStatus = 'pending' | 'processing' | 'completed' | 'error';
export type PDFTool = 'compress' | 'merge' | 'split' | 'pdf-to-images' | 'images-to-pdf';
export type ImageFormat = 'png' | 'jpg' | 'webp';
export type CompressionLevel = 'low' | 'medium' | 'high' | 'maximum';

export interface PDFItem {
	id: string;
	file: File;
	name: string;
	originalSize: number;
	processedSize?: number;
	originalUrl: string;
	processedUrl?: string;
	processedBlob?: Blob;
	processedBlobs?: Blob[]; // For split or PDF-to-images (multiple outputs)
	status: PDFStatus;
	progress: number;
	progressStage?: string;
	error?: string;
	pageCount?: number;
	// For split operations
	selectedPages?: number[];
	pageRange?: { start: number; end: number };
	// For merge operations
	order?: number;
	// Thumbnails (first page preview)
	thumbnail?: string;
	// Type indicator
	isImage?: boolean; // true if this is an image file (for images-to-pdf)
}

export interface PDFSettings {
	tool: PDFTool;
	// Compression settings
	compressionLevel: CompressionLevel;
	// Image export settings
	imageFormat: ImageFormat;
	imageQuality: number; // 0-100
	imageDPI: 72 | 150 | 300;
	// Split settings
	splitMode: 'range' | 'extract' | 'every-n';
	splitEveryN: number;
	splitRange: string; // e.g., "1-5, 8, 10-12"
}

// Compression presets
export const COMPRESSION_PRESETS = {
	low: { label: 'Light', desc: 'Minimal quality loss', quality: 0.85 },
	medium: { label: 'Balanced', desc: 'Good balance', quality: 0.65 },
	high: { label: 'Strong', desc: 'Smaller files', quality: 0.45 },
	maximum: { label: 'Maximum', desc: 'Smallest size', quality: 0.25 }
} as const;

// DPI options for image export
export const DPI_OPTIONS = [
	{ value: 72 as const, label: 'Screen (72)', desc: 'Web/preview' },
	{ value: 150 as const, label: 'Medium (150)', desc: 'General use' },
	{ value: 300 as const, label: 'Print (300)', desc: 'High quality' }
];

// Image format options
export const IMAGE_FORMAT_OPTIONS = [
	{ value: 'png' as const, label: 'PNG', desc: 'Lossless' },
	{ value: 'jpg' as const, label: 'JPG', desc: 'Smaller files' },
	{ value: 'webp' as const, label: 'WebP', desc: 'Modern format' }
];

// Tool definitions
export const TOOLS = [
	{ 
		value: 'compress' as const, 
		label: 'Compress', 
		desc: 'Reduce PDF file size',
		icon: 'Minimize2',
		accepts: '.pdf'
	},
	{ 
		value: 'merge' as const, 
		label: 'Merge', 
		desc: 'Combine multiple PDFs',
		icon: 'Layers',
		accepts: '.pdf'
	},
	{ 
		value: 'split' as const, 
		label: 'Split', 
		desc: 'Extract pages from PDF',
		icon: 'Scissors',
		accepts: '.pdf'
	},
	{ 
		value: 'pdf-to-images' as const, 
		label: 'PDF → Images', 
		desc: 'Convert pages to images',
		icon: 'Image',
		accepts: '.pdf'
	},
	{ 
		value: 'images-to-pdf' as const, 
		label: 'Images → PDF', 
		desc: 'Create PDF from images',
		icon: 'FileText',
		accepts: '.jpg,.jpeg,.png,.webp'
	}
] as const;

// Default settings
const DEFAULT_SETTINGS: PDFSettings = {
	tool: 'compress',
	compressionLevel: 'medium',
	imageFormat: 'png',
	imageQuality: 85,
	imageDPI: 150,
	splitMode: 'range',
	splitEveryN: 1,
	splitRange: ''
};

// Load settings from localStorage
function loadSettings(): PDFSettings {
	if (typeof window === 'undefined') return DEFAULT_SETTINGS;
	try {
		const saved = localStorage.getItem('smash-settings');
		if (saved) {
			return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
		}
	} catch {
		// Ignore errors
	}
	return DEFAULT_SETTINGS;
}

// Save settings to localStorage
function saveSettings(settings: PDFSettings) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem('smash-settings', JSON.stringify(settings));
	} catch {
		// Ignore errors
	}
}

function createPDFStore() {
	let items = $state<PDFItem[]>([]);
	let settings = $state<PDFSettings>(loadSettings());

	return {
		get items() {
			return items;
		},
		get settings() {
			return settings;
		},

		// Add files
		async addFiles(files: FileList | File[]) {
			const fileArray = Array.from(files);
			const currentTool = settings.tool;
			
			for (const file of fileArray) {
				const isPDF = file.type === 'application/pdf';
				const isImage = file.type.startsWith('image/');
				
				// Validate file type based on current tool
				if (currentTool === 'images-to-pdf' && !isImage) continue;
				if (currentTool !== 'images-to-pdf' && !isPDF) continue;

				const item: PDFItem = {
					id: crypto.randomUUID(),
					file,
					name: file.name,
					originalSize: file.size,
					originalUrl: URL.createObjectURL(file),
					status: 'pending',
					progress: 0,
					order: items.length,
					isImage
				};

				items = [...items, item];
			}
		},

		// Update item
		updateItem(id: string, updates: Partial<PDFItem>) {
			items = items.map((item) => (item.id === id ? { ...item, ...updates } : item));
		},

		// Remove item
		removeItem(id: string) {
			const item = items.find((i) => i.id === id);
			if (item) {
				if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
				if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
			}
			items = items.filter((i) => i.id !== id);
		},

		// Clear all items
		clearAll() {
			for (const item of items) {
				if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
				if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);
			}
			items = [];
		},

		// Reorder items (for merge)
		reorderItems(fromIndex: number, toIndex: number) {
			const newItems = [...items];
			const [moved] = newItems.splice(fromIndex, 1);
			newItems.splice(toIndex, 0, moved);
			// Update order property
			items = newItems.map((item, index) => ({ ...item, order: index }));
		},

		// Update settings
		updateSettings(updates: Partial<PDFSettings>) {
			settings = { ...settings, ...updates };
			saveSettings(settings);
		},

		// Set tool
		setTool(tool: PDFTool) {
			// Clear items when switching tools (different file types)
			const currentAccepts = TOOLS.find(t => t.value === settings.tool)?.accepts;
			const newAccepts = TOOLS.find(t => t.value === tool)?.accepts;
			if (currentAccepts !== newAccepts) {
				this.clearAll();
			}
			settings = { ...settings, tool };
			saveSettings(settings);
		},

		// Get item by ID
		getItemById(id: string) {
			return items.find((i) => i.id === id);
		}
	};
}

export const pdfs = createPDFStore();

// Utility: Format bytes
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Utility: Parse page range string (e.g., "1-5, 8, 10-12")
export function parsePageRange(rangeStr: string, maxPages: number): number[] {
	const pages = new Set<number>();
	const parts = rangeStr.split(',').map((s) => s.trim());

	for (const part of parts) {
		if (part.includes('-')) {
			const [start, end] = part.split('-').map((s) => parseInt(s.trim(), 10));
			if (!isNaN(start) && !isNaN(end)) {
				for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
					pages.add(i);
				}
			}
		} else {
			const page = parseInt(part, 10);
			if (!isNaN(page) && page >= 1 && page <= maxPages) {
				pages.add(page);
			}
		}
	}

	return Array.from(pages).sort((a, b) => a - b);
}
