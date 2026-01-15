<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import PDFList from '$lib/components/PDFList.svelte';
	import ToolSelector from '$lib/components/ToolSelector.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import KeyboardShortcuts from '$lib/components/KeyboardShortcuts.svelte';
	import Toast, { toast } from '$lib/components/Toast.svelte';
	import { pdfs, formatBytes } from '$lib/stores/pdfs.svelte';
	import { downloadAllAsZip } from '$lib/utils/download';
	import {
		Download,
		Trash2,
		FileText,
		Zap,
		Shield,
		Layers,
		ArrowDown,
		Keyboard,
		Minimize2,
		Scissors,
		Image
	} from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';

	let showClearConfirm = $state(false);
	let showShortcuts = $state(false);

	const hasItems = $derived(pdfs.items.length > 0);
	const completedCount = $derived(pdfs.items.filter((i) => i.status === 'completed').length);
	const totalSaved = $derived(
		pdfs.items
			.filter((i) => i.status === 'completed' && i.processedSize)
			.reduce((acc, i) => acc + (i.originalSize - (i.processedSize || 0)), 0)
	);
	const savingsPercent = $derived(
		pdfs.items.length > 0
			? Math.round(
					(totalSaved /
						pdfs.items
							.filter((i) => i.status === 'completed')
							.reduce((acc, i) => acc + i.originalSize, 0)) *
						100
				) || 0
			: 0
	);

	function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
		if (type === 'success') {
			toast.success(message);
		} else if (type === 'error') {
			toast.error(message);
		} else {
			toast.info(message);
		}
	}

	async function handleDownloadAll() {
		const completedItems = pdfs.items.filter(
			(i) => i.status === 'completed' && (i.processedBlob || i.processedBlobs)
		);
		if (completedItems.length > 0) {
			await downloadAllAsZip(completedItems, pdfs.settings.tool);
			showNotification(`Downloaded ${completedItems.length} files as ZIP`, 'success');
		}
	}

	// Clipboard paste support
	async function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;

		const files: File[] = [];
		for (const item of items) {
			if (item.type === 'application/pdf' || item.type.startsWith('image/')) {
				const file = item.getAsFile();
				if (file) {
					files.push(file);
				}
			}
		}

		if (files.length > 0) {
			await pdfs.addFiles(files);
			showNotification(`Added ${files.length} file(s) from clipboard`, 'success');
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		// Ignore if typing in an input
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

		// Show keyboard shortcuts
		if (e.key === '?') {
			e.preventDefault();
			showShortcuts = true;
			return;
		}

		// Tool selection with number keys
		if (e.key >= '1' && e.key <= '5') {
			e.preventDefault();
			const tools = ['compress', 'merge', 'split', 'pdf-to-images', 'images-to-pdf'] as const;
			const index = parseInt(e.key) - 1;
			if (index < tools.length) {
				pdfs.setTool(tools[index]);
				showNotification(`Switched to ${tools[index].replace('-', ' ')}`, 'info');
			}
			return;
		}

		// Download all as ZIP
		if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
			e.preventDefault();
			handleDownloadAll();
			return;
		}

		// Clear all / Close modal
		if (e.key === 'Escape') {
			if (showClearConfirm) {
				showClearConfirm = false;
			} else if (showShortcuts) {
				showShortcuts = false;
			} else if (hasItems) {
				showClearConfirm = true;
			}
			return;
		}
	}

	const features = [
		{
			icon: Shield,
			title: '100% Private',
			description: 'Files never leave your device — zero uploads'
		},
		{
			icon: Zap,
			title: 'Instant Processing',
			description: 'Fast client-side processing with pdf-lib'
		},
		{
			icon: Layers,
			title: '5 Essential Tools',
			description: 'Compress, merge, split, and convert'
		},
		{
			icon: Minimize2,
			title: 'No Limits',
			description: 'Process as many files as you want, free'
		}
	];
</script>

<svelte:window onkeydown={handleKeydown} onpaste={handlePaste} />

<div class="flex min-h-screen flex-col">
	<Header />

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-24 pb-12">
		<div class="mx-auto max-w-7xl">
			<!-- Hero Section -->
			{#if !hasItems}
				<div class="text-center mb-12" in:fade={{ duration: 300 }}>
					<h1
						class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
						in:fly={{ y: 20, duration: 500 }}
					>
						<span class="gradient-text">Privacy-First</span>
						<br />
						<span class="text-surface-100">PDF Tools</span>
					</h1>
					<p class="mx-auto max-w-2xl text-base sm:text-lg text-surface-500 leading-relaxed">
						Compress, merge, split, and convert PDFs entirely in your browser.
						<span class="font-medium text-surface-300">100% private</span>
						— files never leave your device.
					</p>
				</div>
			{/if}

			<!-- Tool Selector -->
			<div class="mb-6">
				<ToolSelector />
			</div>

			<!-- Drop Zone -->
			<div class="mb-8">
				<DropZone />
			</div>

			<!-- File List -->
			{#if hasItems}
				<div class="mb-8" in:fade={{ duration: 200 }}>
					<!-- Summary bar -->
					<div class="flex flex-wrap items-center justify-between gap-4 mb-6">
						<div class="flex items-center gap-4">
							<span class="text-sm text-surface-400">
								{pdfs.items.length} file{pdfs.items.length !== 1 ? 's' : ''}
							</span>
							{#if completedCount > 0 && totalSaved > 0}
								<span
									class="text-sm font-medium {savingsPercent > 0 ? 'text-green-400' : 'text-amber-400'}"
								>
									{savingsPercent > 0 ? '-' : '+'}{Math.abs(savingsPercent)}% ({formatBytes(Math.abs(totalSaved))})
								</span>
							{/if}
						</div>

						<div class="flex items-center gap-2">
							{#if completedCount > 0}
								<button
									onclick={handleDownloadAll}
									class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-surface-300 hover:text-surface-100 transition-colors"
								>
									<Download class="h-4 w-4" />
									<span class="hidden sm:inline">Download All</span>
								</button>
							{/if}

							<button
								onclick={() => (showClearConfirm = true)}
								class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-surface-400 hover:text-red-400 transition-colors"
							>
								<Trash2 class="h-4 w-4" />
								<span class="hidden sm:inline">Clear</span>
							</button>
						</div>
					</div>

					<PDFList />
				</div>
			{/if}

			<!-- Features Section (when no files) -->
			{#if !hasItems}
				<div
					class="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 mt-16"
					in:fly={{ y: 20, duration: 500, delay: 200 }}
				>
					{#each features as feature}
						<div class="glass rounded-2xl p-6 text-center">
							<div
								class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-start/20 to-accent-end/20"
							>
								<feature.icon class="h-6 w-6 text-accent-start" />
							</div>
							<h3 class="font-semibold text-surface-200 mb-2">{feature.title}</h3>
							<p class="text-sm text-surface-500">{feature.description}</p>
						</div>
					{/each}
				</div>

				<!-- Scroll hint -->
				<div class="flex justify-center mt-12 text-surface-600 animate-float">
					<ArrowDown class="h-6 w-6" />
				</div>
			{/if}

			<!-- Keyboard shortcut hint -->
			<div class="fixed bottom-4 right-4 z-40">
				<button
					onclick={() => (showShortcuts = true)}
					class="glass flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-surface-500 hover:text-surface-300 transition-colors"
				>
					<Keyboard class="h-4 w-4" />
					<span class="hidden sm:inline">Press ? for shortcuts</span>
				</button>
			</div>
		</div>
	</main>

	<Footer />
</div>

<!-- Modals -->
<ConfirmModal
	bind:show={showClearConfirm}
	title="Clear all files?"
	message="This will remove all files from the list. This action cannot be undone."
	confirmText="Clear All"
	onconfirm={() => {
		pdfs.clearAll();
		showNotification('All files cleared', 'info');
	}}
/>

<KeyboardShortcuts bind:show={showShortcuts} />

<Toast />
