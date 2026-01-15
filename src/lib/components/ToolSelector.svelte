<script lang="ts">
	import { pdfs, TOOLS, COMPRESSION_PRESETS, DPI_OPTIONS, IMAGE_FORMAT_OPTIONS, type PDFTool } from '$lib/stores/pdfs.svelte';
	import { processFiles } from '$lib/utils/pdf';
	import {
		Minimize2,
		Layers,
		Scissors,
		Image,
		FileText,
		Play,
		ChevronDown,
		ChevronUp,
		Settings2,
		Info
	} from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	const iconMap = {
		Minimize2,
		Layers,
		Scissors,
		Image,
		FileText
	};

	let isExpanded = $state(false);
	let isProcessing = $state(false);

	const pendingCount = $derived(pdfs.items.filter(i => i.status === 'pending').length);
	const hasItems = $derived(pdfs.items.length > 0);
	const canProcess = $derived(pendingCount > 0);
	const isAnyProcessing = $derived(pdfs.items.some(i => i.status === 'processing'));

	// Tool-specific requirements
	const currentTool = $derived(TOOLS.find(t => t.value === pdfs.settings.tool));
	const needsMultipleFiles = $derived(
		pdfs.settings.tool === 'merge' || pdfs.settings.tool === 'images-to-pdf'
	);
	const canStartProcessing = $derived(
		canProcess && (!needsMultipleFiles || pendingCount >= 2)
	);

	function handleToolSelect(tool: PDFTool) {
		pdfs.setTool(tool);
	}

	async function handleProcess() {
		if (!canStartProcessing || isProcessing) return;
		isProcessing = true;
		try {
			await processFiles();
		} finally {
			isProcessing = false;
		}
	}

	function getToolIcon(iconName: string) {
		return iconMap[iconName as keyof typeof iconMap] || FileText;
	}
</script>

<div class="glass rounded-2xl p-4 space-y-4">
	<!-- Tool Tabs -->
	<div class="flex flex-wrap gap-2">
		{#each TOOLS as tool}
			{@const Icon = getToolIcon(tool.icon)}
			<button
				onclick={() => handleToolSelect(tool.value)}
				class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all {pdfs.settings.tool === tool.value
					? 'bg-gradient-to-r from-accent-start to-accent-end text-white shadow-lg shadow-accent-start/30'
					: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
			>
				<Icon class="h-4 w-4" />
				<span class="hidden sm:inline">{tool.label}</span>
			</button>
		{/each}
	</div>

	<!-- Tool description -->
	<p class="text-sm text-surface-500">
		{currentTool?.desc}
		{#if needsMultipleFiles}
			<span class="text-surface-400"> — Add {pendingCount < 2 ? 'at least 2 files' : `${pendingCount} files ready`}</span>
		{/if}
	</p>

	<!-- Settings toggle + Process button -->
	<div class="flex items-center justify-between gap-4">
		<button
			onclick={() => (isExpanded = !isExpanded)}
			class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-surface-400 hover:text-surface-200 transition-colors"
		>
			<Settings2 class="h-4 w-4" />
			<span>Settings</span>
			{#if isExpanded}
				<ChevronUp class="h-3.5 w-3.5" />
			{:else}
				<ChevronDown class="h-3.5 w-3.5" />
			{/if}
		</button>

		{#if canProcess}
			<button
				onclick={handleProcess}
				disabled={!canStartProcessing || isProcessing || isAnyProcessing}
				class="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-accent-start to-accent-end text-white shadow-lg shadow-accent-start/30 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
			>
				<Play class="h-4 w-4" fill="currentColor" />
				{pdfs.settings.tool === 'merge' ? 'Merge' : pdfs.settings.tool === 'images-to-pdf' ? 'Create PDF' : 'Process'}
				({pendingCount})
			</button>
		{/if}
	</div>

	<!-- Expanded Settings -->
	{#if isExpanded}
		<div class="border-t border-surface-700/50 pt-4 space-y-4" transition:slide={{ duration: 200 }}>
			<!-- Compression Settings -->
			{#if pdfs.settings.tool === 'compress'}
				<div class="space-y-2">
					<span class="text-sm font-medium text-surface-300">Compression Level</span>
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{#each Object.entries(COMPRESSION_PRESETS) as [key, preset]}
							<button
								onclick={() => pdfs.updateSettings({ compressionLevel: key as any })}
								class="px-3 py-2 rounded-lg text-sm transition-all {pdfs.settings.compressionLevel === key
									? 'bg-accent-start text-white'
									: 'bg-surface-800 text-surface-400 hover:text-surface-200'}"
							>
								<div class="font-medium">{preset.label}</div>
								<div class="text-xs opacity-70">{preset.desc}</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Split Settings -->
			{#if pdfs.settings.tool === 'split'}
				<div class="space-y-3">
					<div class="space-y-2">
						<span class="text-sm font-medium text-surface-300">Split Mode</span>
						<div class="flex gap-2">
							{#each [{ value: 'range', label: 'Page Range' }, { value: 'every-n', label: 'Every N Pages' }] as mode}
								<button
									onclick={() => pdfs.updateSettings({ splitMode: mode.value as any })}
									class="px-3 py-2 rounded-lg text-sm transition-all {pdfs.settings.splitMode === mode.value
										? 'bg-accent-start text-white'
										: 'bg-surface-800 text-surface-400 hover:text-surface-200'}"
								>
									{mode.label}
								</button>
							{/each}
						</div>
					</div>

					{#if pdfs.settings.splitMode === 'range'}
						<div class="space-y-2">
							<label for="split-range" class="text-sm font-medium text-surface-300">Page Range</label>
							<input
								id="split-range"
								type="text"
								placeholder="e.g., 1-5 or 1, 3, 5-8"
								value={pdfs.settings.splitRange}
								oninput={(e) => pdfs.updateSettings({ splitRange: e.currentTarget.value })}
								class="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-200 text-sm focus:border-accent-start focus:outline-none"
							/>
						</div>
					{:else}
						<div class="space-y-2">
							<label for="split-every" class="text-sm font-medium text-surface-300">Pages per file</label>
							<input
								id="split-every"
								type="number"
								min="1"
								value={pdfs.settings.splitEveryN}
								oninput={(e) => pdfs.updateSettings({ splitEveryN: parseInt(e.currentTarget.value) || 1 })}
								class="w-24 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-200 text-sm focus:border-accent-start focus:outline-none"
							/>
						</div>
					{/if}
				</div>
			{/if}

			<!-- PDF to Images Settings -->
			{#if pdfs.settings.tool === 'pdf-to-images'}
				<div class="space-y-3">
					<div class="space-y-2">
						<span class="text-sm font-medium text-surface-300">Image Format</span>
						<div class="flex gap-2">
							{#each IMAGE_FORMAT_OPTIONS as format}
								<button
									onclick={() => pdfs.updateSettings({ imageFormat: format.value })}
									class="px-3 py-2 rounded-lg text-sm transition-all {pdfs.settings.imageFormat === format.value
										? 'bg-accent-start text-white'
										: 'bg-surface-800 text-surface-400 hover:text-surface-200'}"
								>
									{format.label}
								</button>
							{/each}
						</div>
					</div>

					<div class="space-y-2">
						<span class="text-sm font-medium text-surface-300">Resolution (DPI)</span>
						<div class="flex gap-2">
							{#each DPI_OPTIONS as dpi}
								<button
									onclick={() => pdfs.updateSettings({ imageDPI: dpi.value })}
									class="px-3 py-2 rounded-lg text-sm transition-all {pdfs.settings.imageDPI === dpi.value
										? 'bg-accent-start text-white'
										: 'bg-surface-800 text-surface-400 hover:text-surface-200'}"
								>
									{dpi.label}
								</button>
							{/each}
						</div>
					</div>

					<div class="space-y-2">
						<label for="image-quality" class="text-sm font-medium text-surface-300">
							Quality: {pdfs.settings.imageQuality}%
						</label>
						<input
							id="image-quality"
							type="range"
							min="10"
							max="100"
							step="5"
							value={pdfs.settings.imageQuality}
							oninput={(e) => pdfs.updateSettings({ imageQuality: parseInt(e.currentTarget.value) })}
							class="w-full accent-accent-start"
						/>
					</div>
				</div>
			{/if}

			<!-- Info box -->
			<div class="p-3 rounded-lg bg-surface-800/50 border border-surface-700/50">
				<div class="flex items-start gap-2">
					<Info class="h-4 w-4 text-surface-400 flex-shrink-0 mt-0.5" />
					<p class="text-xs text-surface-500">
						{#if pdfs.settings.tool === 'compress'}
							Files are compressed by re-rendering pages as optimized images. Higher compression = smaller files but lower quality.
						{:else if pdfs.settings.tool === 'merge'}
							Drag to reorder files before merging. The output will contain all pages in the order shown.
						{:else if pdfs.settings.tool === 'split'}
							Extract specific pages or split into multiple files. Original file is not modified.
						{:else if pdfs.settings.tool === 'pdf-to-images'}
							Each page will be exported as a separate image file. Higher DPI = larger files but better quality.
						{:else if pdfs.settings.tool === 'images-to-pdf'}
							Images will be added as full pages in the order shown. Drag to reorder before creating PDF.
						{/if}
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>
