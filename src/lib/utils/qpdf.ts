/**
 * QPDF Wrapper
 * 
 * High-level API for PDF security and optimization using QPDF WASM.
 * Provides password protection, unlocking, linearization, and optimization.
 */

import { workerPool } from './worker-pool';
import { wasmLoader } from './wasm-loader';
import type { QPDFOperation } from '$lib/types/wasm';

interface EncryptOptions {
	userPassword: string;
	ownerPassword?: string;
	keyLength?: 128 | 256;
	onProgress?: (progress: number) => void;
}

interface DecryptOptions {
	password: string;
	onProgress?: (progress: number) => void;
}

interface OptimizeOptions {
	onProgress?: (progress: number) => void;
}

interface ProcessResult {
	blob: Blob;
	originalSize: number;
	newSize: number;
	savings: number;
	savingsPercent: number;
}

/**
 * Encrypt a PDF with password protection
 */
export async function encryptPDF(
	file: File,
	options: EncryptOptions
): Promise<ProcessResult> {
	const {
		userPassword,
		ownerPassword = userPassword,
		keyLength = 256,
		onProgress
	} = options;

	// Ensure WASM is loaded
	await wasmLoader.load('qpdf');

	// Read file as ArrayBuffer
	const arrayBuffer = await file.arrayBuffer();
	const data = new Uint8Array(arrayBuffer);

	const operation: QPDFOperation = {
		type: 'encrypt',
		userPassword,
		ownerPassword,
		keyLength
	};

	// Send to worker
	const result = await workerPool.sendTask<
		{ data: Uint8Array; operation: QPDFOperation },
		{ data: Uint8Array; originalSize: number; newSize: number }
	>(
		'qpdf',
		'process',
		{ data, operation },
		onProgress,
		[arrayBuffer]
	);

	const savings = result.originalSize - result.newSize;
	const savingsPercent = Math.round((savings / result.originalSize) * 100);

	return {
		blob: new Blob([result.data], { type: 'application/pdf' }),
		originalSize: result.originalSize,
		newSize: result.newSize,
		savings,
		savingsPercent
	};
}

/**
 * Decrypt a password-protected PDF
 */
export async function decryptPDF(
	file: File,
	options: DecryptOptions
): Promise<ProcessResult> {
	const { password, onProgress } = options;

	// Ensure WASM is loaded
	await wasmLoader.load('qpdf');

	// Read file as ArrayBuffer
	const arrayBuffer = await file.arrayBuffer();
	const data = new Uint8Array(arrayBuffer);

	const operation: QPDFOperation = {
		type: 'decrypt',
		password
	};

	// Send to worker
	const result = await workerPool.sendTask<
		{ data: Uint8Array; operation: QPDFOperation },
		{ data: Uint8Array; originalSize: number; newSize: number }
	>(
		'qpdf',
		'process',
		{ data, operation },
		onProgress,
		[arrayBuffer]
	);

	const savings = result.originalSize - result.newSize;
	const savingsPercent = Math.round((savings / result.originalSize) * 100);

	return {
		blob: new Blob([result.data], { type: 'application/pdf' }),
		originalSize: result.originalSize,
		newSize: result.newSize,
		savings,
		savingsPercent
	};
}

/**
 * Linearize a PDF for fast web viewing
 * Linearized PDFs can start displaying before fully downloaded
 */
export async function linearizePDF(
	file: File,
	options: OptimizeOptions = {}
): Promise<ProcessResult> {
	const { onProgress } = options;

	// Ensure WASM is loaded
	await wasmLoader.load('qpdf');

	// Read file as ArrayBuffer
	const arrayBuffer = await file.arrayBuffer();
	const data = new Uint8Array(arrayBuffer);

	const operation: QPDFOperation = { type: 'linearize' };

	// Send to worker
	const result = await workerPool.sendTask<
		{ data: Uint8Array; operation: QPDFOperation },
		{ data: Uint8Array; originalSize: number; newSize: number }
	>(
		'qpdf',
		'process',
		{ data, operation },
		onProgress,
		[arrayBuffer]
	);

	const savings = result.originalSize - result.newSize;
	const savingsPercent = Math.round((savings / result.originalSize) * 100);

	return {
		blob: new Blob([result.data], { type: 'application/pdf' }),
		originalSize: result.originalSize,
		newSize: result.newSize,
		savings,
		savingsPercent
	};
}

/**
 * Optimize a PDF (remove unused objects, compress streams)
 */
export async function optimizePDF(
	file: File,
	options: OptimizeOptions = {}
): Promise<ProcessResult> {
	const { onProgress } = options;

	// Ensure WASM is loaded
	await wasmLoader.load('qpdf');

	// Read file as ArrayBuffer
	const arrayBuffer = await file.arrayBuffer();
	const data = new Uint8Array(arrayBuffer);

	const operation: QPDFOperation = { type: 'optimize' };

	// Send to worker
	const result = await workerPool.sendTask<
		{ data: Uint8Array; operation: QPDFOperation },
		{ data: Uint8Array; originalSize: number; newSize: number }
	>(
		'qpdf',
		'process',
		{ data, operation },
		onProgress,
		[arrayBuffer]
	);

	const savings = result.originalSize - result.newSize;
	const savingsPercent = Math.round((savings / result.originalSize) * 100);

	return {
		blob: new Blob([result.data], { type: 'application/pdf' }),
		originalSize: result.originalSize,
		newSize: result.newSize,
		savings,
		savingsPercent
	};
}

/**
 * Preload QPDF WASM module
 */
export function preloadQPDF(): void {
	wasmLoader.preload('qpdf');
}

/**
 * Check if QPDF is loaded
 */
export function isQPDFLoaded(): boolean {
	return wasmLoader.isLoaded('qpdf');
}

/**
 * Check if QPDF is currently loading
 */
export function isQPDFLoading(): boolean {
	return wasmLoader.isLoading('qpdf');
}

/**
 * Get loading state for UI
 */
export function getQPDFLoadingState() {
	return wasmLoader.getState('qpdf');
}

/**
 * Subscribe to loading state changes
 */
export function subscribeToQPDFLoading(callback: (state: ReturnType<typeof wasmLoader.getState>) => void) {
	return wasmLoader.subscribe('qpdf', callback);
}
