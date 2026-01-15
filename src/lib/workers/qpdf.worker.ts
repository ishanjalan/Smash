/**
 * QPDF Web Worker
 * 
 * Handles PDF optimization, encryption, and decryption using QPDF WASM.
 * Provides password protection, linearization, and PDF optimization.
 */

import type { WorkerMessage, WorkerResponse, QPDFOperation } from '$lib/types/wasm';
import createQPDF from '@neslinesli93/qpdf-wasm';

// Module state
let qpdfModule: any = null;
let isInitialized = false;
let isInitializing = false;

// WASM URL (will be loaded from CDN or local)
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@neslinesli93/qpdf-wasm/dist/qpdf.wasm';

/**
 * Initialize the QPDF WASM module
 */
async function initQPDF(): Promise<void> {
	if (isInitialized) return;
	if (isInitializing) {
		while (isInitializing) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		return;
	}

	isInitializing = true;

	try {
		qpdfModule = await createQPDF({
			locateFile: () => WASM_URL,
			noInitialRun: true,
			preRun: [(module: any) => {
				if (module.FS) {
					try {
						module.FS.mkdir('/input');
						module.FS.mkdir('/output');
					} catch {
						// Directories may already exist
					}
				}
			}]
		});

		isInitialized = true;
	} catch (error) {
		console.error('Failed to initialize QPDF:', error);
		throw error;
	} finally {
		isInitializing = false;
	}
}

/**
 * Encrypt a PDF with password protection
 */
async function encryptPDF(
	data: Uint8Array,
	userPassword: string,
	ownerPassword: string,
	keyLength: 128 | 256 = 256
): Promise<Uint8Array> {
	await initQPDF();

	if (!qpdfModule) {
		throw new Error('QPDF module not initialized');
	}

	const inputPath = '/input/input.pdf';
	const outputPath = '/output/output.pdf';

	// Write input file
	qpdfModule.FS.writeFile(inputPath, data);

	// Build QPDF command for encryption
	const args = [
		inputPath,
		'--encrypt',
		userPassword,
		ownerPassword,
		keyLength.toString(),
		'--',
		outputPath
	];

	try {
		qpdfModule.callMain(args);
		
		// Read output
		const result = qpdfModule.FS.readFile(outputPath);
		
		// Clean up
		qpdfModule.FS.unlink(inputPath);
		qpdfModule.FS.unlink(outputPath);
		
		return result;
	} catch (error) {
		// Clean up on error
		try {
			qpdfModule.FS.unlink(inputPath);
			qpdfModule.FS.unlink(outputPath);
		} catch {}
		throw error;
	}
}

/**
 * Decrypt a password-protected PDF
 */
async function decryptPDF(
	data: Uint8Array,
	password: string
): Promise<Uint8Array> {
	await initQPDF();

	if (!qpdfModule) {
		throw new Error('QPDF module not initialized');
	}

	const inputPath = '/input/input.pdf';
	const outputPath = '/output/output.pdf';

	// Write input file
	qpdfModule.FS.writeFile(inputPath, data);

	// Build QPDF command for decryption
	const args = [
		`--password=${password}`,
		'--decrypt',
		inputPath,
		outputPath
	];

	try {
		qpdfModule.callMain(args);
		
		// Read output
		const result = qpdfModule.FS.readFile(outputPath);
		
		// Clean up
		qpdfModule.FS.unlink(inputPath);
		qpdfModule.FS.unlink(outputPath);
		
		return result;
	} catch (error) {
		// Clean up on error
		try {
			qpdfModule.FS.unlink(inputPath);
			qpdfModule.FS.unlink(outputPath);
		} catch {}
		throw error;
	}
}

/**
 * Linearize a PDF for fast web viewing
 */
async function linearizePDF(data: Uint8Array): Promise<Uint8Array> {
	await initQPDF();

	if (!qpdfModule) {
		throw new Error('QPDF module not initialized');
	}

	const inputPath = '/input/input.pdf';
	const outputPath = '/output/output.pdf';

	// Write input file
	qpdfModule.FS.writeFile(inputPath, data);

	// Build QPDF command for linearization
	const args = [
		'--linearize',
		inputPath,
		outputPath
	];

	try {
		qpdfModule.callMain(args);
		
		// Read output
		const result = qpdfModule.FS.readFile(outputPath);
		
		// Clean up
		qpdfModule.FS.unlink(inputPath);
		qpdfModule.FS.unlink(outputPath);
		
		return result;
	} catch (error) {
		// Clean up on error
		try {
			qpdfModule.FS.unlink(inputPath);
			qpdfModule.FS.unlink(outputPath);
		} catch {}
		throw error;
	}
}

/**
 * Optimize a PDF (remove unused objects, compress streams)
 */
async function optimizePDF(data: Uint8Array): Promise<Uint8Array> {
	await initQPDF();

	if (!qpdfModule) {
		throw new Error('QPDF module not initialized');
	}

	const inputPath = '/input/input.pdf';
	const outputPath = '/output/output.pdf';

	// Write input file
	qpdfModule.FS.writeFile(inputPath, data);

	// Build QPDF command for optimization
	const args = [
		'--optimize-images',
		'--compress-streams=y',
		'--recompress-flate',
		'--object-streams=generate',
		inputPath,
		outputPath
	];

	try {
		qpdfModule.callMain(args);
		
		// Read output
		const result = qpdfModule.FS.readFile(outputPath);
		
		// Clean up
		qpdfModule.FS.unlink(inputPath);
		qpdfModule.FS.unlink(outputPath);
		
		return result;
	} catch (error) {
		// Clean up on error
		try {
			qpdfModule.FS.unlink(inputPath);
			qpdfModule.FS.unlink(outputPath);
		} catch {}
		throw error;
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
				await initQPDF();
				const response: WorkerResponse = {
					type: 'complete',
					id,
					success: true,
					result: { initialized: true }
				};
				self.postMessage(response);
				break;
			}

			case 'process': {
				const { data, operation } = payload as {
					data: Uint8Array;
					operation: QPDFOperation;
				};
				
				sendProgress(10);
				
				let result: Uint8Array;
				
				switch (operation.type) {
					case 'encrypt':
						result = await encryptPDF(
							data,
							operation.userPassword,
							operation.ownerPassword,
							operation.keyLength
						);
						break;
					case 'decrypt':
						result = await decryptPDF(data, operation.password);
						break;
					case 'linearize':
						result = await linearizePDF(data);
						break;
					case 'optimize':
						result = await optimizePDF(data);
						break;
					default:
						throw new Error('Unknown operation type');
				}
				
				sendProgress(100);
				
				const response: WorkerResponse<{ data: Uint8Array; originalSize: number; newSize: number }> = {
					type: 'complete',
					id,
					success: true,
					result: {
						data: result,
						originalSize: data.length,
						newSize: result.length
					}
				};
				
				self.postMessage(response, [result.buffer]);
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
