/**
 * Ghostscript Web Worker
 * 
 * Handles PDF compression using Ghostscript WASM in a separate thread.
 * This prevents the main UI from blocking during heavy compression operations.
 */

import type { WorkerMessage, WorkerResponse, GhostscriptPreset, CompressionResult } from '$lib/types/wasm';

// Module state
let gsModule: any = null;
let isInitialized = false;
let isInitializing = false;

// Ghostscript preset flags
const PRESET_FLAGS: Record<GhostscriptPreset, string> = {
	screen: '/screen',      // 72 DPI - smallest
	ebook: '/ebook',        // 150 DPI - balanced
	printer: '/printer',    // 300 DPI - high quality
	prepress: '/prepress'   // highest quality
};

/**
 * Initialize the Ghostscript WASM module
 */
async function initGhostscript(): Promise<void> {
	if (isInitialized) return;
	if (isInitializing) {
		// Wait for existing initialization
		while (isInitializing) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		return;
	}

	isInitializing = true;

	try {
		// Dynamic import of Ghostscript WASM
		const createModule = await import('@jspawn/ghostscript-wasm');
		
		gsModule = await createModule.default({
			print: (text: string) => {
				console.log('[GS]', text);
			},
			printErr: (text: string) => {
				console.error('[GS Error]', text);
			},
			setStatus: (text: string) => {
				console.log('[GS Status]', text);
			}
		});

		isInitialized = true;
	} catch (error) {
		console.error('Failed to initialize Ghostscript:', error);
		throw error;
	} finally {
		isInitializing = false;
	}
}

/**
 * Compress a PDF using Ghostscript
 */
async function compressPDF(
	data: Uint8Array,
	preset: GhostscriptPreset,
	sendProgress: (progress: number) => void
): Promise<CompressionResult> {
	await initGhostscript();

	if (!gsModule) {
		throw new Error('Ghostscript module not initialized');
	}

	const originalSize = data.length;
	sendProgress(10);

	// Write input file to virtual filesystem
	const inputPath = '/input.pdf';
	const outputPath = '/output.pdf';
	
	gsModule.FS.writeFile(inputPath, data);
	sendProgress(20);

	// Build Ghostscript command
	const args = [
		'-sDEVICE=pdfwrite',
		'-dCompatibilityLevel=1.4',
		`-dPDFSETTINGS=${PRESET_FLAGS[preset]}`,
		'-dNOPAUSE',
		'-dQUIET',
		'-dBATCH',
		'-dDetectDuplicateImages=true',
		'-dCompressFonts=true',
		'-dSubsetFonts=true',
		`-sOutputFile=${outputPath}`,
		inputPath
	];

	sendProgress(30);

	// Run Ghostscript
	try {
		const exitCode = gsModule.callMain(args);
		
		if (exitCode !== 0) {
			throw new Error(`Ghostscript exited with code ${exitCode}`);
		}
	} catch (error) {
		// Clean up on error
		try {
			gsModule.FS.unlink(inputPath);
		} catch {}
		throw error;
	}

	sendProgress(80);

	// Read output file
	let compressedData: Uint8Array;
	try {
		compressedData = gsModule.FS.readFile(outputPath);
	} catch (error) {
		throw new Error('Failed to read compressed PDF output');
	}

	// Clean up virtual filesystem
	try {
		gsModule.FS.unlink(inputPath);
		gsModule.FS.unlink(outputPath);
	} catch {}

	sendProgress(100);

	return {
		data: compressedData,
		originalSize,
		compressedSize: compressedData.length,
		preset
	};
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
				await initGhostscript();
				const response: WorkerResponse = {
					type: 'complete',
					id,
					success: true,
					result: { initialized: true }
				};
				self.postMessage(response);
				break;
			}

			case 'compress': {
				const { data, preset } = payload as { data: Uint8Array; preset: GhostscriptPreset };
				const result = await compressPDF(data, preset, sendProgress);
				
				const response: WorkerResponse<CompressionResult> = {
					type: 'complete',
					id,
					success: true,
					result
				};
				
				// Transfer the compressed data buffer for efficiency
				self.postMessage(response, [result.data.buffer]);
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
