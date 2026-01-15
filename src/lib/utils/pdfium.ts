/**
 * PDFium Wrapper
 * 
 * High-level API for PDF rendering using PDFium WASM (Chrome's PDF engine).
 * Provides high-quality thumbnail generation and page rendering.
 */

import { workerPool } from './worker-pool';
import { wasmLoader } from './wasm-loader';
import type { RenderResult } from '$lib/types/wasm';

interface RenderOptions {
	scale?: number;
	format?: 'png' | 'jpeg';
	onProgress?: (progress: number) => void;
}

interface ThumbnailOptions {
	scale?: number;
	maxPages?: number;
	onProgress?: (progress: number) => void;
}

/**
 * Render a single page from a PDF to an image
 */
export async function renderPage(
	file: File | Uint8Array,
	pageNumber: number,
	options: RenderOptions = {}
): Promise<{
	dataUrl: string;
	width: number;
	height: number;
	pageNumber: number;
}> {
	const { scale = 1, format = 'png', onProgress } = options;

	// Ensure WASM is loaded
	await wasmLoader.load('pdfium');

	// Get data as Uint8Array
	let data: Uint8Array;
	if (file instanceof File) {
		const arrayBuffer = await file.arrayBuffer();
		data = new Uint8Array(arrayBuffer);
	} else {
		data = file;
	}

	// Send to worker for rendering
	const result = await workerPool.sendTask<
		{ data: Uint8Array; pageNumber: number; scale: number; format: 'png' | 'jpeg' },
		RenderResult
	>(
		'pdfium',
		'render',
		{ data, pageNumber, scale, format },
		onProgress,
		[data.buffer]
	);

	// Convert RGBA data to data URL
	const dataUrl = rgbaToDataUrl(result.data, result.width, result.height, format);

	return {
		dataUrl,
		width: result.width,
		height: result.height,
		pageNumber: result.pageNumber
	};
}

/**
 * Generate thumbnails for all pages (or a subset)
 */
export async function generateThumbnails(
	file: File | Uint8Array,
	options: ThumbnailOptions = {}
): Promise<Array<{
	dataUrl: string;
	width: number;
	height: number;
	pageNumber: number;
}>> {
	const { scale = 0.3, maxPages, onProgress } = options;

	// Ensure WASM is loaded
	await wasmLoader.load('pdfium');

	// Get data as Uint8Array
	let data: Uint8Array;
	if (file instanceof File) {
		const arrayBuffer = await file.arrayBuffer();
		data = new Uint8Array(arrayBuffer);
	} else {
		data = file;
	}

	// Send to worker for thumbnail generation
	const results = await workerPool.sendTask<
		{ data: Uint8Array; scale: number; maxPages?: number },
		RenderResult[]
	>(
		'pdfium',
		'thumbnails',
		{ data, scale, maxPages },
		onProgress,
		[data.buffer]
	);

	// Convert each result to data URL
	return results.map(result => ({
		dataUrl: rgbaToDataUrl(result.data, result.width, result.height, 'png'),
		width: result.width,
		height: result.height,
		pageNumber: result.pageNumber
	}));
}

/**
 * Get the page count of a PDF without rendering
 */
export async function getPageCount(file: File | Uint8Array): Promise<number> {
	// Ensure WASM is loaded
	await wasmLoader.load('pdfium');

	// Get data as Uint8Array
	let data: Uint8Array;
	if (file instanceof File) {
		const arrayBuffer = await file.arrayBuffer();
		data = new Uint8Array(arrayBuffer);
	} else {
		data = file;
	}

	// Send to worker
	const count = await workerPool.sendTask<{ data: Uint8Array }, number>(
		'pdfium',
		'pageCount',
		{ data },
		undefined,
		[data.buffer]
	);

	return count;
}

/**
 * Convert RGBA pixel data to a data URL
 */
function rgbaToDataUrl(
	data: Uint8Array,
	width: number,
	height: number,
	format: 'png' | 'jpeg'
): string {
	// Create a canvas to convert RGBA data to image
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	
	if (!ctx) {
		throw new Error('Failed to get canvas context');
	}

	// Create ImageData from RGBA bytes
	const imageData = new ImageData(new Uint8ClampedArray(data), width, height);
	ctx.putImageData(imageData, 0, 0);

	// Convert to data URL
	const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
	return canvas.toDataURL(mimeType, 0.9);
}

/**
 * Preload PDFium WASM module
 */
export function preloadPDFium(): void {
	wasmLoader.preload('pdfium');
}

/**
 * Check if PDFium is loaded
 */
export function isPDFiumLoaded(): boolean {
	return wasmLoader.isLoaded('pdfium');
}

/**
 * Check if PDFium is currently loading
 */
export function isPDFiumLoading(): boolean {
	return wasmLoader.isLoading('pdfium');
}

/**
 * Get loading state for UI
 */
export function getPDFiumLoadingState() {
	return wasmLoader.getState('pdfium');
}

/**
 * Subscribe to loading state changes
 */
export function subscribeToPDFiumLoading(callback: (state: ReturnType<typeof wasmLoader.getState>) => void) {
	return wasmLoader.subscribe('pdfium', callback);
}
