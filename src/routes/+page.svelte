<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DropZone from '$lib/components/DropZone.svelte';
	import ToolSelector from '$lib/components/ToolSelector.svelte';
	import Workspace from '$lib/components/Workspace.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import KeyboardShortcuts from '$lib/components/KeyboardShortcuts.svelte';
	import SetupWizard from '$lib/components/SetupWizard.svelte';
	import Toast, { toast } from '$lib/components/Toast.svelte';
	import { pdfs, formatBytes, TOOLS } from '$lib/stores/pdfs.svelte';
	import { downloadAllAsZip } from '$lib/utils/download';
	import {
		Shield,
		Zap,
		Layers,
		Lock,
		Github,
		ExternalLink,
		Keyboard
	} from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	let showClearConfirm = $state(false);
	let showShortcuts = $state(false);

	const hasItems = $derived(pdfs.items.length > 0);

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

		// Tool selection with number keys (first 9 tools)
		if (e.key >= '1' && e.key <= '9') {
			e.preventDefault();
			const index = parseInt(e.key) - 1;
			if (index < TOOLS.length) {
				pdfs.setTool(TOOLS[index].value);
				showNotification(`Switched to ${TOOLS[index].label}`, 'info');
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
			description: 'Files never leave your device — zero server uploads'
		},
		{
			icon: Zap,
			title: 'True Compression',
			description: 'Ghostscript engine preserves text & quality'
		},
		{
			icon: Layers,
			title: '12+ Pro Tools',
			description: 'Compress, merge, split, protect & more'
		},
		{
			icon: Lock,
			title: 'Secure & Free',
			description: 'Password protect, no limits, no cost'
		}
	];
</script>

<svelte:window onkeydown={handleKeydown} onpaste={handlePaste} />

<!-- Background gradient blobs -->
<div class="bg-blobs">
	<div class="bg-blob bg-blob-1 animate-blob"></div>
	<div class="bg-blob bg-blob-2 animate-blob-slow"></div>
	<div class="bg-blob bg-blob-3 animate-blob-slower"></div>
</div>

<div class="flex min-h-screen flex-col">
	<Header />

	<main class="flex-1 px-4 sm:px-6 lg:px-8 pt-20 pb-4">
		<div class="mx-auto max-w-7xl h-full">
			{#if hasItems}
				<!-- Workspace Mode: Full-height document editor layout -->
				<div 
					class="h-[calc(100vh-120px)]"
					in:fade={{ duration: 200 }}
				>
					<Workspace />
				</div>
			{:else}
				<!-- Landing Mode: Hero + Drop zone -->
				<div class="py-8" in:fade={{ duration: 300 }}>
					<!-- Hero Section -->
					<div class="text-center mb-12">
						<!-- Privacy badge -->
						<div class="flex justify-center mb-6" in:fly={{ y: -10, duration: 400 }}>
							<div class="privacy-badge">
								<Shield class="h-3.5 w-3.5" />
								<span>Privacy-First • Free & Open Source</span>
							</div>
						</div>

						<h1
							class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
							in:fly={{ y: 20, duration: 500 }}
						>
							<span class="gradient-text">World-Class</span>
							<br />
							<span class="text-surface-100">PDF Tools</span>
						</h1>
						<p class="mx-auto max-w-2xl text-base sm:text-lg text-surface-500 leading-relaxed mb-4">
							Compress, merge, split, protect, and convert PDFs entirely on your device.
							<span class="font-medium text-surface-300">100% private</span>
							— files never leave your computer.
						</p>
						<p class="text-sm text-surface-600">
							Powered by Ghostscript • Preserves text & quality
						</p>
					</div>

					<!-- Tool Selector -->
					<div class="mb-6">
						<ToolSelector />
					</div>

					<!-- Drop Zone -->
					<div class="mb-12">
						<DropZone />
					</div>

					<!-- Features Section -->
					<div
						class="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4"
						in:fly={{ y: 20, duration: 500, delay: 200 }}
					>
						{#each features as feature}
							<div class="glass rounded-2xl p-6 text-center feature-card">
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

					<!-- Open source link -->
					<div class="flex justify-center mt-12">
						<a
							href="https://github.com/ishanjalan/Smash"
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 px-4 py-2 text-sm text-surface-500 hover:text-surface-300 transition-colors"
						>
							<Github class="h-4 w-4" />
							<span>View on GitHub</span>
							<ExternalLink class="h-3 w-3" />
						</a>
					</div>
				</div>
			{/if}
		</div>
	</main>

	{#if !hasItems}
		<Footer />
	{/if}
</div>

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

<SetupWizard />

<Toast />
