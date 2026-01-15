/**
 * PDFium Web Worker
 * 
 * Handles high-quality PDF rendering using PDFium WASM (Chrome's PDF engine).
 * Provides pixel-perfect rendering for thumbnails and page previews.
 */

import type { WorkerMessage, WorkerResponse, RenderResult } from '$lib/types/wasm';
import { PDFiumLibrary } from '@hyzyla/pdfium';

// Module state
let library: typeof PDFiumLibrary.prototype | null = null;
let isInitialized = false;
let isInitializing = false;

/**
 * Initialize the PDFium library
 */
async function initPDFium(): Promise<void> {
	if (isInitialized) return;
	if (isInitializing) {
		while (isInitializing) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		return;
	}

	isInitializing = true;

	try {
		library = await PDFiumLibrary.init();
		isInitialized = true;
	} catch (error) {
		console.error('Failed to initialize PDFium:', error);
		throw error;
	} finally {
		isInitializing = false;
	}
}

/**
 * Simple render function that returns raw RGBA data
 */
function rawRender(options: { data: Uint8Array; width: number; height: number }): Promise<Uint8Array> {
	return Promise.resolve(options.data);
}

/**
 * Render a single page to an image
 */
async function renderPage(
	pdfData: Uint8Array,
	pageNumber: number,
	scale: number = 1,
	format: 'png' | 'jpeg' = 'png'
): Promise<RenderResult> {
	await initPDFium();

	if (!library) {
		throw new Error('PDFium library not initialized');
	}

	const document = await library.loadDocument(pdfData);
	
	try {
		let pageIndex = 0;
		for (const page of document.pages()) {
			if (pageIndex === pageNumber - 1) {
				const result = await page.render({
					scale,
					render: rawRender
				});

				return {
					data: result.data as Uint8Array,
					width: result.width,
					height: result.height,
					pageNumber,
					format
				};
			}
			pageIndex++;
		}

		throw new Error(`Page ${pageNumber} not found`);
	} finally {
		document.destroy();
	}
}

/**
 * Render multiple pages (for thumbnails)
 */
async function renderThumbnails(
	pdfData: Uint8Array,
	scale: number = 0.3,
	maxPages?: number
): Promise<RenderResult[]> {
	await initPDFium();

	if (!library) {
		throw new Error('PDFium library not initialized');
	}

	const document = await library.loadDocument(pdfData);
	const results: RenderResult[] = [];
	
	try {
		let pageIndex = 0;
		for (const page of document.pages()) {
			if (maxPages && pageIndex >= maxPages) break;
			
			const result = await page.render({
				scale,
				render: rawRender
			});

			results.push({
				data: result.data as Uint8Array,
				width: result.width,
				height: result.height,
				pageNumber: pageIndex + 1,
				format: 'png'
			});
			
			pageIndex++;
		}

		return results;
	} finally {
		document.destroy();
	}
}

/**
 * Get page count without rendering
 */
async function getPageCount(pdfData: Uint8Array): Promise<number> {
	await initPDFium();

	if (!library) {
		throw new Error('PDFium library not initialized');
	}

	const document = await library.loadDocument(pdfData);
	
	try {
		return document.getPageCount();
	} finally {
		document.destroy();
	}
}

/**
 * Handle incoming messages
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
	const { type, id, payload } = event.data;

	const sendProgress = (progress: number) => {
		const response: WorkerResponse = {
			type: 'progress',
			id,
			success: true,
			progress
		};
		self.postMessage(response);
	};

	try {
		switch (type) {
			case 'init': {
				await initPDFium();
				const response: WorkerResponse = {
					type: 'complete',
					id,
					success: true,
					result: { initialized: true }
				};
				self.postMessage(response);
				break;
			}

			case 'render': {
				const { data, pageNumber, scale, format } = payload as {
					data: Uint8Array;
					pageNumber: number;
					scale?: number;
					format?: 'png' | 'jpeg';
				};
				
				sendProgress(10);
				const result = await renderPage(data, pageNumber, scale, format);
				sendProgress(100);
				
				const response: WorkerResponse<RenderResult> = {
					type: 'complete',
					id,
					success: true,
					result
				};
				
				self.postMessage(response, [result.data.buffer]);
				break;
			}

			case 'thumbnails': {
				const { data, scale, maxPages } = payload as {
					data: Uint8Array;
					scale?: number;
					maxPages?: number;
				};
				
				sendProgress(10);
				const results = await renderThumbnails(data, scale, maxPages);
				sendProgress(100);
				
				const response: WorkerResponse<RenderResult[]> = {
					type: 'complete',
					id,
					success: true,
					result: results
				};
				
				// Transfer all buffers
				const transferables = results.map(r => r.data.buffer);
				self.postMessage(response, transferables);
				break;
			}

			case 'pageCount': {
				const { data } = payload as { data: Uint8Array };
				const count = await getPageCount(data);
				
				const response: WorkerResponse<number> = {
					type: 'complete',
					id,
					success: true,
					result: count
				};
				self.postMessage(response);
				break;
			}

			default:
				throw new Error(`Unknown message type: ${type}`);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		const response: WorkerResponse = {
			type: 'error',
			id,
			success: false,
			error: errorMessage
		};
		self.postMessage(response);
	}
};

// Signal that the worker is ready
self.postMessage({ type: 'ready', id: 'init', success: true });
