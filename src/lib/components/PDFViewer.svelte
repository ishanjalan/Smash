<script lang="ts">
	import { pdfs, formatBytes, type PDFItem } from '$lib/stores/pdfs.svelte';
	import { generateThumbnail, getPageCount } from '$lib/utils/pdf';
	import * as pdfjsLib from 'pdfjs-dist';
	import {
		ZoomIn,
		ZoomOut,
		RotateCw,
		Download,
		ChevronLeft,
		ChevronRight,
		Grid3X3,
		List,
		Check,
		X,
		Loader2,
		FileText,
		GripVertical
	} from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	interface Props {
		item: PDFItem;
		onClose?: () => void;
	}

	const { item, onClose }: Props = $props();

	// View state
	let currentPage = $state(1);
	let totalPages = $state(0);
	let zoom = $state(1);
	let viewMode = $state<'single' | 'thumbnails'>('single');
	let selectedPages = $state<Set<number>>(new Set());
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Page data
	let thumbnails = $state<Array<{ pageNum: number; dataUrl: string; width: number; height: number }>>([]);
	let currentPageCanvas = $state<string | null>(null);
	let pageWidth = $state(0);
	let pageHeight = $state(0);

	// PDF document reference
	let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;

	// Tool-specific behavior
	const isPageSelectionTool = $derived(
		['split', 'delete-pages', 'reorder', 'rotate'].includes(pdfs.settings.tool)
	);
	const allowMultiSelect = $derived(
		['split', 'delete-pages', 'rotate'].includes(pdfs.settings.tool)
	);

	async function loadPDF() {
		isLoading = true;
		error = null;

		try {
			const arrayBuffer = await item.file.arrayBuffer();
			pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
			totalPages = pdfDoc.numPages;

			// Update item with page count
			pdfs.updateItem(item.id, { pageCount: totalPages });

			// Load first page preview
			await renderPage(1);

			// Load all thumbnails in background
			loadThumbnails();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load PDF';
			console.error('PDF load error:', err);
		} finally {
			isLoading = false;
		}
	}

	async function loadThumbnails() {
		if (!pdfDoc) return;

		const scale = 0.2; // Small thumbnails
		for (let i = 1; i <= totalPages; i++) {
			try {
				const page = await pdfDoc.getPage(i);
				const viewport = page.getViewport({ scale });

				const canvas = document.createElement('canvas');
				canvas.width = viewport.width;
				canvas.height = viewport.height;
				const ctx = canvas.getContext('2d');

				if (ctx) {
					await page.render({ canvasContext: ctx, viewport }).promise;
					thumbnails = [...thumbnails, {
						pageNum: i,
						dataUrl: canvas.toDataURL('image/jpeg', 0.7),
						width: viewport.width,
						height: viewport.height
					}];
				}
			} catch (err) {
				console.error(`Failed to load thumbnail for page ${i}:`, err);
			}
		}
	}

	async function renderPage(pageNum: number) {
		if (!pdfDoc || pageNum < 1 || pageNum > totalPages) return;

		try {
			const page = await pdfDoc.getPage(pageNum);
			const scale = zoom * 1.5; // Base scale for good quality
			const viewport = page.getViewport({ scale });

			pageWidth = viewport.width;
			pageHeight = viewport.height;

			const canvas = document.createElement('canvas');
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			const ctx = canvas.getContext('2d');

			if (ctx) {
				await page.render({ canvasContext: ctx, viewport }).promise;
				currentPageCanvas = canvas.toDataURL('image/png');
			}
		} catch (err) {
			console.error(`Failed to render page ${pageNum}:`, err);
		}
	}

	function goToPage(pageNum: number) {
		if (pageNum >= 1 && pageNum <= totalPages) {
			currentPage = pageNum;
			renderPage(pageNum);
		}
	}

	function nextPage() {
		goToPage(currentPage + 1);
	}

	function prevPage() {
		goToPage(currentPage - 1);
	}

	function zoomIn() {
		zoom = Math.min(zoom + 0.25, 3);
		renderPage(currentPage);
	}

	function zoomOut() {
		zoom = Math.max(zoom - 0.25, 0.5);
		renderPage(currentPage);
	}

	function togglePageSelection(pageNum: number) {
		if (!isPageSelectionTool) return;

		const newSelection = new Set(selectedPages);
		if (newSelection.has(pageNum)) {
			newSelection.delete(pageNum);
		} else {
			if (!allowMultiSelect) {
				newSelection.clear();
			}
			newSelection.add(pageNum);
		}
		selectedPages = newSelection;

		// Update item with selected pages
		pdfs.updateItem(item.id, { selectedPages: Array.from(selectedPages).sort((a, b) => a - b) });
	}

	function selectAll() {
		selectedPages = new Set(Array.from({ length: totalPages }, (_, i) => i + 1));
		pdfs.updateItem(item.id, { selectedPages: Array.from(selectedPages) });
	}

	function selectNone() {
		selectedPages = new Set();
		pdfs.updateItem(item.id, { selectedPages: [] });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			e.preventDefault();
			nextPage();
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			e.preventDefault();
			prevPage();
		} else if (e.key === 'Escape' && onClose) {
			onClose();
		} else if (e.key === '+' || e.key === '=') {
			e.preventDefault();
			zoomIn();
		} else if (e.key === '-') {
			e.preventDefault();
			zoomOut();
		}
	}

	onMount(() => {
		loadPDF();
	});

	onDestroy(() => {
		pdfDoc?.destroy();
	});

	// Re-render when zoom changes
	$effect(() => {
		if (pdfDoc && zoom) {
			renderPage(currentPage);
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex flex-col h-full bg-surface-950 rounded-2xl overflow-hidden border border-surface-800">
	<!-- Toolbar -->
	<div class="flex items-center justify-between px-4 py-2 bg-surface-900/80 border-b border-surface-800">
		<!-- Left: File info -->
		<div class="flex items-center gap-3">
			{#if onClose}
				<button
					onclick={onClose}
					class="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
					title="Close"
				>
					<X class="h-4 w-4" />
				</button>
			{/if}
			<div class="flex items-center gap-2">
				<FileText class="h-4 w-4 text-accent-start" />
				<span class="text-sm font-medium text-surface-200 truncate max-w-[200px]" title={item.name}>
					{item.name}
				</span>
				<span class="text-xs text-surface-500">
					{formatBytes(item.originalSize)}
				</span>
			</div>
		</div>

		<!-- Center: Navigation -->
		<div class="flex items-center gap-2">
			<button
				onclick={prevPage}
				disabled={currentPage <= 1}
				class="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
				title="Previous page"
			>
				<ChevronLeft class="h-4 w-4" />
			</button>

			<div class="flex items-center gap-1 text-sm">
				<input
					type="number"
					min="1"
					max={totalPages}
					value={currentPage}
					onchange={(e) => goToPage(parseInt(e.currentTarget.value) || 1)}
					class="w-12 px-2 py-1 rounded bg-surface-800 border border-surface-700 text-surface-200 text-center text-sm focus:border-accent-start focus:outline-none"
				/>
				<span class="text-surface-500">/ {totalPages}</span>
			</div>

			<button
				onclick={nextPage}
				disabled={currentPage >= totalPages}
				class="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
				title="Next page"
			>
				<ChevronRight class="h-4 w-4" />
			</button>
		</div>

		<!-- Right: View controls -->
		<div class="flex items-center gap-1">
			<button
				onclick={zoomOut}
				disabled={zoom <= 0.5}
				class="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 disabled:opacity-30 transition-colors"
				title="Zoom out"
			>
				<ZoomOut class="h-4 w-4" />
			</button>
			<span class="text-xs text-surface-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
			<button
				onclick={zoomIn}
				disabled={zoom >= 3}
				class="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 disabled:opacity-30 transition-colors"
				title="Zoom in"
			>
				<ZoomIn class="h-4 w-4" />
			</button>

			<div class="w-px h-5 bg-surface-700 mx-2"></div>

			<button
				onclick={() => viewMode = 'single'}
				class="p-1.5 rounded-lg transition-colors {viewMode === 'single' ? 'bg-accent-start text-white' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700'}"
				title="Single page view"
			>
				<List class="h-4 w-4" />
			</button>
			<button
				onclick={() => viewMode = 'thumbnails'}
				class="p-1.5 rounded-lg transition-colors {viewMode === 'thumbnails' ? 'bg-accent-start text-white' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700'}"
				title="Thumbnail view"
			>
				<Grid3X3 class="h-4 w-4" />
			</button>
		</div>
	</div>

	<!-- Selection toolbar (for page operations) -->
	{#if isPageSelectionTool && viewMode === 'thumbnails'}
		<div class="flex items-center justify-between px-4 py-2 bg-surface-800/50 border-b border-surface-700/50" transition:fly={{ y: -10, duration: 150 }}>
			<div class="text-sm text-surface-400">
				{selectedPages.size} of {totalPages} pages selected
			</div>
			<div class="flex items-center gap-2">
				<button
					onclick={selectAll}
					class="px-2 py-1 text-xs text-surface-400 hover:text-surface-200 bg-surface-700 hover:bg-surface-600 rounded transition-colors"
				>
					Select All
				</button>
				<button
					onclick={selectNone}
					class="px-2 py-1 text-xs text-surface-400 hover:text-surface-200 bg-surface-700 hover:bg-surface-600 rounded transition-colors"
				>
					Clear
				</button>
			</div>
		</div>
	{/if}

	<!-- Main content area -->
	<div class="flex-1 flex overflow-hidden">
		<!-- Sidebar with thumbnails -->
		<div class="w-48 flex-shrink-0 bg-surface-900/50 border-r border-surface-800 overflow-y-auto hidden lg:block">
			<div class="p-2 space-y-2">
				{#each thumbnails as thumb}
					<button
						onclick={() => {
							goToPage(thumb.pageNum);
							if (isPageSelectionTool) togglePageSelection(thumb.pageNum);
						}}
						class="relative w-full rounded-lg overflow-hidden border-2 transition-all
							{currentPage === thumb.pageNum && viewMode === 'single'
								? 'border-accent-start ring-2 ring-accent-start/30'
								: selectedPages.has(thumb.pageNum)
									? 'border-green-500 ring-2 ring-green-500/30'
									: 'border-surface-700 hover:border-surface-500'}"
					>
						<img
							src={thumb.dataUrl}
							alt="Page {thumb.pageNum}"
							class="w-full"
						/>
						<div class="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white font-medium">
							{thumb.pageNum}
						</div>
						{#if selectedPages.has(thumb.pageNum)}
							<div class="absolute top-1 left-1 w-5 h-5 bg-green-500 rounded flex items-center justify-center">
								<Check class="h-3 w-3 text-white" />
							</div>
						{/if}
					</button>
				{/each}

				{#if thumbnails.length < totalPages}
					<div class="flex items-center justify-center py-4 text-surface-500">
						<Loader2 class="h-4 w-4 animate-spin mr-2" />
						<span class="text-xs">Loading...</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Main view -->
		<div class="flex-1 overflow-auto bg-surface-950 p-4">
			{#if isLoading}
				<div class="flex items-center justify-center h-full">
					<div class="flex flex-col items-center gap-3 text-surface-500">
						<Loader2 class="h-8 w-8 animate-spin" />
						<span>Loading PDF...</span>
					</div>
				</div>
			{:else if error}
				<div class="flex items-center justify-center h-full">
					<div class="text-center">
						<p class="text-red-400 mb-2">{error}</p>
						<button
							onclick={loadPDF}
							class="px-4 py-2 text-sm bg-surface-800 text-surface-200 rounded-lg hover:bg-surface-700 transition-colors"
						>
							Retry
						</button>
					</div>
				</div>
			{:else if viewMode === 'single'}
				<!-- Single page view -->
				<div class="flex items-center justify-center min-h-full">
					{#if currentPageCanvas}
						<div
							class="shadow-2xl shadow-black/50 rounded-lg overflow-hidden bg-white"
							style="max-width: {pageWidth}px"
						>
							<img
								src={currentPageCanvas}
								alt="Page {currentPage}"
								class="w-full h-auto"
								draggable="false"
							/>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Thumbnail grid view -->
				<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
					{#each thumbnails as thumb}
						<button
							onclick={() => {
								if (isPageSelectionTool) {
									togglePageSelection(thumb.pageNum);
								} else {
									goToPage(thumb.pageNum);
									viewMode = 'single';
								}
							}}
							class="relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all bg-white
								{selectedPages.has(thumb.pageNum)
									? 'border-green-500 ring-2 ring-green-500/30 scale-[1.02]'
									: 'border-surface-700 hover:border-surface-500'}"
						>
							<img
								src={thumb.dataUrl}
								alt="Page {thumb.pageNum}"
								class="w-full h-full object-contain"
							/>
							<div class="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-xs text-white font-medium">
								{thumb.pageNum}
							</div>
							{#if isPageSelectionTool}
								<div class="absolute top-1 left-1">
									{#if selectedPages.has(thumb.pageNum)}
										<div class="w-6 h-6 bg-green-500 rounded flex items-center justify-center shadow-lg">
											<Check class="h-4 w-4 text-white" />
										</div>
									{:else}
										<div class="w-6 h-6 border-2 border-white/60 rounded bg-black/20 group-hover:border-white transition-colors" />
									{/if}
								</div>
							{/if}
						</button>
					{/each}

					{#if thumbnails.length < totalPages}
						{#each Array(totalPages - thumbnails.length) as _, i}
							<div class="aspect-[3/4] rounded-lg bg-surface-800 animate-pulse flex items-center justify-center">
								<Loader2 class="h-4 w-4 animate-spin text-surface-600" />
							</div>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Bottom status bar -->
	<div class="flex items-center justify-between px-4 py-2 bg-surface-900/80 border-t border-surface-800 text-xs text-surface-500">
		<div>
			{totalPages} page{totalPages !== 1 ? 's' : ''} • {formatBytes(item.originalSize)}
		</div>
		<div class="flex items-center gap-4">
			{#if isPageSelectionTool && selectedPages.size > 0}
				<span class="text-accent-start font-medium">
					{selectedPages.size} page{selectedPages.size !== 1 ? 's' : ''} selected
				</span>
			{/if}
			<span>Use arrow keys to navigate</span>
		</div>
	</div>
</div>
