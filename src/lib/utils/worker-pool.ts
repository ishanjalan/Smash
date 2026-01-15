/**
 * Worker Pool - Manages Web Workers for non-blocking PDF processing
 * 
 * Each WASM module runs in its own dedicated worker to avoid blocking the UI.
 */

import type { WorkerMessage, WorkerResponse } from '$lib/types/wasm';

type WorkerType = 'ghostscript' | 'pdfium' | 'qpdf';
type ProgressCallback = (progress: number) => void;

interface PendingTask<T> {
	resolve: (value: T) => void;
	reject: (reason: Error) => void;
	onProgress?: ProgressCallback;
}

class WorkerManager {
	private workers: Map<WorkerType, Worker> = new Map();
	private pendingTasks: Map<string, PendingTask<unknown>> = new Map();
	private loadingPromises: Map<WorkerType, Promise<Worker>> = new Map();
	private messageId = 0;

	/**
	 * Get or create a worker for the specified type
	 */
	async getWorker(type: WorkerType): Promise<Worker> {
		// Return existing worker if available
		const existingWorker = this.workers.get(type);
		if (existingWorker) {
			return existingWorker;
		}

		// Check if already loading
		const loadingPromise = this.loadingPromises.get(type);
		if (loadingPromise) {
			return loadingPromise;
		}

		// Create new worker
		const promise = this.createWorker(type);
		this.loadingPromises.set(type, promise);
		
		try {
			const worker = await promise;
			this.workers.set(type, worker);
			this.loadingPromises.delete(type);
			return worker;
		} catch (error) {
			this.loadingPromises.delete(type);
			throw error;
		}
	}

	/**
	 * Create a new worker instance
	 */
	private async createWorker(type: WorkerType): Promise<Worker> {
		let worker: Worker;
		
		switch (type) {
			case 'ghostscript':
				worker = new Worker(
					new URL('../workers/ghostscript.worker.ts', import.meta.url),
					{ type: 'module' }
				);
				break;
			case 'pdfium':
				worker = new Worker(
					new URL('../workers/pdfium.worker.ts', import.meta.url),
					{ type: 'module' }
				);
				break;
			case 'qpdf':
				worker = new Worker(
					new URL('../workers/qpdf.worker.ts', import.meta.url),
					{ type: 'module' }
				);
				break;
			default:
				throw new Error(`Unknown worker type: ${type}`);
		}

		// Set up message handler
		worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
			this.handleWorkerMessage(event.data);
		};

		worker.onerror = (error) => {
			console.error(`Worker error (${type}):`, error);
		};

		// Wait for worker to be ready
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error(`Worker ${type} initialization timeout`));
			}, 30000);

			const readyHandler = (event: MessageEvent<WorkerResponse>) => {
				if (event.data.type === 'ready') {
					clearTimeout(timeout);
					worker.removeEventListener('message', readyHandler);
					resolve(worker);
				}
			};

			worker.addEventListener('message', readyHandler);
		});
	}

	/**
	 * Handle messages from workers
	 */
	private handleWorkerMessage(response: WorkerResponse): void {
		const task = this.pendingTasks.get(response.id);
		if (!task) {
			// Could be a progress update for a cancelled task
			return;
		}

		// Handle progress updates
		if (response.type === 'progress' && response.progress !== undefined) {
			task.onProgress?.(response.progress);
			return;
		}

		// Handle completion
		if (response.type === 'complete' || response.type === 'error') {
			this.pendingTasks.delete(response.id);
			
			if (response.success && response.result !== undefined) {
				task.resolve(response.result);
			} else {
				task.reject(new Error(response.error || 'Unknown worker error'));
			}
		}
	}

	/**
	 * Send a task to a worker and wait for the result
	 */
	async sendTask<T, R>(
		type: WorkerType,
		taskType: string,
		payload: T,
		onProgress?: ProgressCallback,
		transferables?: Transferable[]
	): Promise<R> {
		const worker = await this.getWorker(type);
		const id = `${type}-${++this.messageId}`;

		const message: WorkerMessage<T> = {
			type: taskType,
			id,
			payload
		};

		return new Promise((resolve, reject) => {
			this.pendingTasks.set(id, {
				resolve: resolve as (value: unknown) => void,
				reject,
				onProgress
			});

			if (transferables && transferables.length > 0) {
				worker.postMessage(message, transferables);
			} else {
				worker.postMessage(message);
			}
		});
	}

	/**
	 * Terminate a specific worker
	 */
	terminateWorker(type: WorkerType): void {
		const worker = this.workers.get(type);
		if (worker) {
			worker.terminate();
			this.workers.delete(type);
		}
	}

	/**
	 * Terminate all workers
	 */
	terminateAll(): void {
		for (const [type, worker] of this.workers) {
			worker.terminate();
			this.workers.delete(type);
		}
		this.pendingTasks.clear();
	}

	/**
	 * Check if a worker is loaded
	 */
	isWorkerLoaded(type: WorkerType): boolean {
		return this.workers.has(type);
	}

	/**
	 * Check if a worker is currently loading
	 */
	isWorkerLoading(type: WorkerType): boolean {
		return this.loadingPromises.has(type);
	}
}

// Export singleton instance
export const workerPool = new WorkerManager();

// Export types for external use
export type { WorkerType, ProgressCallback };
