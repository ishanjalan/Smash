/**
 * Ghostscript Wrapper
 * 
 * High-level API for PDF compression using Ghostscript WASM.
 * Provides quality presets matching industry standards.
 */

import { workerPool } from './worker-pool';
import { wasmLoader } from './wasm-loader';
import type { GhostscriptPreset, CompressionResult } from '$lib/types/wasm';

// Quality presets with descriptions
export const COMPRESSION_PRESETS = {
	screen: {
		label: 'Screen',
		desc: 'Smallest (72 DPI)',
		gsFlag: '/screen',
		icon: 'Monitor',
		dpi: 72
	},
	ebook: {
		label: 'Ebook',
		desc: 'Balanced (150 DPI)',
		gsFlag: '/ebook',
		icon: 'BookOpen',
		dpi: 150
	},
	printer: {
		label: 'Printer',
		desc: 'High quality (300 DPI)',
		gsFlag: '/printer',
		icon: 'Printer',
		dpi: 300
	},
	prepress: {
		label: 'Prepress',
		desc: 'Maximum quality',
		gsFlag: '/prepress',
		icon: 'FileCheck',
		dpi: 300
	}
} as const;

export type CompressionPreset = keyof typeof COMPRESSION_PRESETS;

interface CompressOptions {
	preset?: CompressionPreset;
	onProgress?: (progress: number) => void;
}

/**
 * Compress a PDF file using Ghostscript
 * 
 * @param file - The PDF file to compress
 * @param options - Compression options including preset and progress callback
 * @returns Compressed PDF as a Blob with metadata
 */
export async function compressWithGhostscript(
	file: File,
	options: CompressOptions = {}
): Promise<{
	blob: Blob;
	originalSize: number;
	compressedSize: number;
	savings: number;
	savingsPercent: number;
}> {
	const { preset = 'ebook', onProgress } = options;

	// Ensure WASM is loaded
	await wasmLoader.load('ghostscript');

	// Read file as ArrayBuffer
	const arrayBuffer = await file.arrayBuffer();
	const data = new Uint8Array(arrayBuffer);

	// Send to worker for compression
	const result = await workerPool.sendTask<
		{ data: Uint8Array; preset: GhostscriptPreset },
		CompressionResult
	>(
		'ghostscript',
		'compress',
		{ data, preset },
		onProgress,
		[arrayBuffer] // Transfer the buffer
	);

	// Calculate savings
	const savings = result.originalSize - result.compressedSize;
	const savingsPercent = Math.round((savings / result.originalSize) * 100);

	return {
		blob: new Blob([result.data], { type: 'application/pdf' }),
		originalSize: result.originalSize,
		compressedSize: result.compressedSize,
		savings,
		savingsPercent
	};
}

/**
 * Preload Ghostscript WASM module
 * Call this early to reduce compression latency
 */
export function preloadGhostscript(): void {
	wasmLoader.preload('ghostscript');
}

/**
 * Check if Ghostscript is loaded
 */
export function isGhostscriptLoaded(): boolean {
	return wasmLoader.isLoaded('ghostscript');
}

/**
 * Check if Ghostscript is currently loading
 */
export function isGhostscriptLoading(): boolean {
	return wasmLoader.isLoading('ghostscript');
}

/**
 * Get loading state for UI
 */
export function getGhostscriptLoadingState() {
	return wasmLoader.getState('ghostscript');
}

/**
 * Subscribe to loading state changes
 */
export function subscribeToGhostscriptLoading(callback: (state: ReturnType<typeof wasmLoader.getState>) => void) {
	return wasmLoader.subscribe('ghostscript', callback);
}
