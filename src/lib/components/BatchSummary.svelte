<script lang="ts">
	import { pdfs, formatBytes } from '$lib/stores/pdfs.svelte';
	import { Check, Clock, TrendingDown, Download, X } from 'lucide-svelte';
	import { fly, fade } from 'svelte/transition';
	import { downloadAll } from '$lib/utils/download';

	interface Props {
		onDismiss?: () => void;
	}

	const { onDismiss }: Props = $props();

	// Compute stats from completed items
	const completedItems = $derived(pdfs.items.filter(i => i.status === 'completed'));
	const hasCompletedItems = $derived(completedItems.length > 0);

	const totalOriginalSize = $derived(
		completedItems.reduce((acc, item) => acc + item.originalSize, 0)
	);

	const totalProcessedSize = $derived(
		completedItems.reduce((acc, item) => acc + (item.processedSize || 0), 0)
	);

	const totalSavings = $derived(totalOriginalSize - totalProcessedSize);
	const savingsPercent = $derived(
		totalOriginalSize > 0 ? Math.round((totalSavings / totalOriginalSize) * 100) : 0
	);

	// Processing time tracking (this would need to be passed in or tracked)
	// For now, we'll estimate based on file count
	const processingTime = $derived(completedItems.length * 2); // Rough estimate in seconds

	function handleDownloadAll() {
		const tool = pdfs.settings.tool;
		downloadAll(completedItems, tool);
	}

	function formatTime(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
	}
</script>

{#if hasCompletedItems}
	<div 
		class="glass rounded-2xl p-4 border border-surface-700/50"
		transition:fly={{ y: 20, duration: 300 }}
	>
		<!-- Header -->
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				<div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
					<Check class="h-4 w-4 text-green-400" />
				</div>
				<div>
					<h3 class="font-semibold text-surface-200">Processing Complete</h3>
					<p class="text-xs text-surface-500">{completedItems.length} file{completedItems.length !== 1 ? 's' : ''} processed</p>
				</div>
			</div>
			{#if onDismiss}
				<button
					onclick={onDismiss}
					class="p-1.5 text-surface-500 hover:text-surface-300 transition-colors rounded-lg hover:bg-surface-700/50"
				>
					<X class="h-4 w-4" />
				</button>
			{/if}
		</div>

		<!-- Stats Grid -->
		<div class="grid grid-cols-3 gap-3 mb-4">
			<!-- Original Size -->
			<div class="bg-surface-800/50 rounded-xl p-3 text-center">
				<div class="text-xs text-surface-500 mb-1">Original</div>
				<div class="font-semibold text-surface-200">{formatBytes(totalOriginalSize)}</div>
			</div>

			<!-- New Size -->
			<div class="bg-surface-800/50 rounded-xl p-3 text-center">
				<div class="text-xs text-surface-500 mb-1">New Size</div>
				<div class="font-semibold text-surface-200">{formatBytes(totalProcessedSize)}</div>
			</div>

			<!-- Savings -->
			<div class="bg-gradient-to-br from-accent-start/20 to-accent-end/20 rounded-xl p-3 text-center border border-accent-start/20">
				<div class="text-xs text-surface-500 mb-1">Saved</div>
				<div class="font-semibold text-accent-start">
					{#if totalSavings > 0}
						{savingsPercent}%
					{:else if totalSavings < 0}
						+{Math.abs(savingsPercent)}%
					{:else}
						0%
					{/if}
				</div>
			</div>
		</div>

		<!-- Additional Stats -->
		<div class="flex items-center justify-between text-xs text-surface-500 mb-4">
			<div class="flex items-center gap-1.5">
				<Clock class="h-3.5 w-3.5" />
				<span>~{formatTime(processingTime)}</span>
			</div>
			{#if totalSavings > 0}
				<div class="flex items-center gap-1.5 text-green-400">
					<TrendingDown class="h-3.5 w-3.5" />
					<span>Saved {formatBytes(totalSavings)}</span>
				</div>
			{/if}
		</div>

		<!-- Download All Button -->
		{#if completedItems.length > 0}
			<button
				onclick={handleDownloadAll}
				class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent-start to-accent-end text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-accent-start/30"
			>
				<Download class="h-4 w-4" />
				Download {completedItems.length > 1 ? 'All' : ''}
			</button>
		{/if}
	</div>
{/if}
