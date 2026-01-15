/**
 * WASM Loader - Lazy loading system for WASM modules with progress tracking
 * 
 * Handles loading heavy WASM modules only when needed, with caching and progress reporting.
 */

type WASMModuleType = 'ghostscript' | 'pdfium' | 'qpdf';

interface LoadingState {
	isLoading: boolean;
	isLoaded: boolean;
	progress: number;
	error: string | null;
}

type LoadingCallback = (state: LoadingState) => void;

class WASMLoader {
	private loadedModules: Set<WASMModuleType> = new Set();
	private loadingPromises: Map<WASMModuleType, Promise<void>> = new Map();
	private subscribers: Map<WASMModuleType, Set<LoadingCallback>> = new Map();
	private states: Map<WASMModuleType, LoadingState> = new Map();

	constructor() {
		// Initialize states for all module types
		const types: WASMModuleType[] = ['ghostscript', 'pdfium', 'qpdf'];
		for (const type of types) {
			this.states.set(type, {
				isLoading: false,
				isLoaded: false,
				progress: 0,
				error: null
			});
			this.subscribers.set(type, new Set());
		}
	}

	/**
	 * Get the current loading state for a module
	 */
	getState(type: WASMModuleType): LoadingState {
		return this.states.get(type) || {
			isLoading: false,
			isLoaded: false,
			progress: 0,
			error: null
		};
	}

	/**
	 * Subscribe to loading state changes
	 */
	subscribe(type: WASMModuleType, callback: LoadingCallback): () => void {
		const subs = this.subscribers.get(type);
		if (subs) {
			subs.add(callback);
			// Immediately call with current state
			callback(this.getState(type));
		}
		
		// Return unsubscribe function
		return () => {
			subs?.delete(callback);
		};
	}

	/**
	 * Update state and notify subscribers
	 */
	private updateState(type: WASMModuleType, updates: Partial<LoadingState>): void {
		const currentState = this.getState(type);
		const newState = { ...currentState, ...updates };
		this.states.set(type, newState);
		
		// Notify all subscribers
		const subs = this.subscribers.get(type);
		if (subs) {
			for (const callback of subs) {
				callback(newState);
			}
		}
	}

	/**
	 * Check if a module is loaded
	 */
	isLoaded(type: WASMModuleType): boolean {
		return this.loadedModules.has(type);
	}

	/**
	 * Check if a module is currently loading
	 */
	isLoading(type: WASMModuleType): boolean {
		return this.loadingPromises.has(type);
	}

	/**
	 * Preload a WASM module (without blocking)
	 */
	preload(type: WASMModuleType): void {
		if (!this.isLoaded(type) && !this.isLoading(type)) {
			this.load(type).catch(console.error);
		}
	}

	/**
	 * Load a WASM module with progress tracking
	 */
	async load(type: WASMModuleType): Promise<void> {
		// Already loaded
		if (this.loadedModules.has(type)) {
			return;
		}

		// Already loading - return existing promise
		const existingPromise = this.loadingPromises.get(type);
		if (existingPromise) {
			return existingPromise;
		}

		// Start loading
		const loadPromise = this.doLoad(type);
		this.loadingPromises.set(type, loadPromise);

		try {
			await loadPromise;
			this.loadedModules.add(type);
		} finally {
			this.loadingPromises.delete(type);
		}
	}

	/**
	 * Actual loading implementation
	 */
	private async doLoad(type: WASMModuleType): Promise<void> {
		this.updateState(type, { isLoading: true, progress: 0, error: null });

		try {
			switch (type) {
				case 'ghostscript':
					await this.loadGhostscript();
					break;
				case 'pdfium':
					await this.loadPDFium();
					break;
				case 'qpdf':
					await this.loadQPDF();
					break;
			}

			this.updateState(type, { isLoading: false, isLoaded: true, progress: 100 });
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			this.updateState(type, { isLoading: false, error: errorMessage });
			throw error;
		}
	}

	/**
	 * Load Ghostscript WASM (~18MB)
	 */
	private async loadGhostscript(): Promise<void> {
		this.updateState('ghostscript', { progress: 10 });
		
		// The actual WASM will be loaded by the worker
		// This just pre-warms the worker
		const { workerPool } = await import('./worker-pool');
		
		this.updateState('ghostscript', { progress: 50 });
		
		await workerPool.getWorker('ghostscript');
		
		this.updateState('ghostscript', { progress: 100 });
	}

	/**
	 * Load PDFium WASM (~5MB)
	 */
	private async loadPDFium(): Promise<void> {
		this.updateState('pdfium', { progress: 10 });
		
		const { workerPool } = await import('./worker-pool');
		
		this.updateState('pdfium', { progress: 50 });
		
		await workerPool.getWorker('pdfium');
		
		this.updateState('pdfium', { progress: 100 });
	}

	/**
	 * Load QPDF WASM (~1.2MB)
	 */
	private async loadQPDF(): Promise<void> {
		this.updateState('qpdf', { progress: 10 });
		
		const { workerPool } = await import('./worker-pool');
		
		this.updateState('qpdf', { progress: 50 });
		
		await workerPool.getWorker('qpdf');
		
		this.updateState('qpdf', { progress: 100 });
	}

	/**
	 * Get estimated sizes for each module
	 */
	getModuleSize(type: WASMModuleType): string {
		const sizes: Record<WASMModuleType, string> = {
			ghostscript: '~18 MB',
			pdfium: '~5 MB',
			qpdf: '~1.2 MB'
		};
		return sizes[type];
	}

	/**
	 * Get human-readable module name
	 */
	getModuleName(type: WASMModuleType): string {
		const names: Record<WASMModuleType, string> = {
			ghostscript: 'Ghostscript (Compression)',
			pdfium: 'PDFium (Rendering)',
			qpdf: 'QPDF (Encryption)'
		};
		return names[type];
	}
}

// Export singleton instance
export const wasmLoader = new WASMLoader();

// Export types
export type { WASMModuleType, LoadingState, LoadingCallback };
