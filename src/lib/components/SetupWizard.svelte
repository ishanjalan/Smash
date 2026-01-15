<script lang="ts">
	import { onMount } from 'svelte';
	import { checkGhostscript, checkQPDF, type ToolStatus } from '$lib/utils/pdf';
	import { 
		Check, 
		Zap, 
		Loader2,
		ChevronRight,
		X
	} from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	let show = $state(false);
	let checking = $state(true);
	let gsStatus = $state<ToolStatus | null>(null);
	let qpdfStatus = $state<ToolStatus | null>(null);

	const hasEnhancements = $derived(gsStatus?.available || qpdfStatus?.available);

	onMount(async () => {
		// Check if we've shown this before
		const hasSeenWelcome = localStorage.getItem('smash-welcome-seen');
		
		if (!hasSeenWelcome) {
			show = true;
			await checkTools();
		}
	});

	async function checkTools() {
		checking = true;
		try {
			[gsStatus, qpdfStatus] = await Promise.all([
				checkGhostscript(),
				checkQPDF()
			]);
		} catch (e) {
			console.error('Failed to check tools:', e);
		}
		checking = false;
	}

	function dismiss() {
		localStorage.setItem('smash-welcome-seen', 'true');
		show = false;
	}
</script>

{#if show}
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
	>
		<div 
			class="w-full max-w-md mx-4 glass rounded-3xl p-6 shadow-2xl relative"
			transition:fly={{ y: 20, duration: 300 }}
		>
			<!-- Close button -->
			<button
				onclick={dismiss}
				class="absolute top-4 right-4 p-1 text-surface-500 hover:text-surface-300 transition-colors"
			>
				<X class="h-5 w-5" />
			</button>

			<!-- Header -->
			<div class="text-center mb-6">
				<div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-start to-accent-end flex items-center justify-center">
					<Zap class="h-8 w-8 text-white" />
				</div>
				
				<h2 class="text-xl font-bold text-surface-100">
					Welcome to Smash
				</h2>
				
				<p class="text-sm text-surface-500 mt-2">
					Privacy-first PDF tools that work entirely on your device
				</p>
			</div>

			<!-- Features -->
			<div class="space-y-3 mb-6">
				<div class="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50">
					<div class="flex-shrink-0 w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
						<Check class="h-4 w-4 text-green-400" />
					</div>
					<div class="flex-1">
						<p class="text-sm font-medium text-surface-200">Works Offline</p>
						<p class="text-xs text-surface-500">No internet required, no file uploads</p>
					</div>
				</div>

				<div class="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50">
					<div class="flex-shrink-0 w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
						<Check class="h-4 w-4 text-green-400" />
					</div>
					<div class="flex-1">
						<p class="text-sm font-medium text-surface-200">12+ PDF Tools</p>
						<p class="text-xs text-surface-500">Compress, merge, split, protect & more</p>
					</div>
				</div>

				<div class="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50">
					<div class="flex-shrink-0 w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
						<Check class="h-4 w-4 text-green-400" />
					</div>
					<div class="flex-1">
						<p class="text-sm font-medium text-surface-200">100% Free</p>
						<p class="text-xs text-surface-500">No limits, no subscriptions, no ads</p>
					</div>
				</div>
			</div>

			<!-- Optional Enhancements -->
			{#if !checking}
				<div class="mb-6 p-4 rounded-xl bg-surface-900/50 border border-surface-700">
					<h3 class="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
						Optional Enhancements Detected
					</h3>
					
					<div class="space-y-2 text-sm">
						<div class="flex items-center gap-2">
							{#if gsStatus?.available}
								<Check class="h-4 w-4 text-green-400" />
								<span class="text-surface-300">Ghostscript</span>
								<span class="text-xs text-surface-500">— Better compression (50-90%)</span>
							{:else}
								<ChevronRight class="h-4 w-4 text-surface-600" />
								<span class="text-surface-500">Ghostscript not installed</span>
								<span class="text-xs text-surface-600">— Using built-in compression</span>
							{/if}
						</div>
						
						<div class="flex items-center gap-2">
							{#if qpdfStatus?.available}
								<Check class="h-4 w-4 text-green-400" />
								<span class="text-surface-300">qpdf</span>
								<span class="text-xs text-surface-500">— AES-256 encryption</span>
							{:else}
								<ChevronRight class="h-4 w-4 text-surface-600" />
								<span class="text-surface-500">qpdf not installed</span>
								<span class="text-xs text-surface-600">— Using built-in encryption</span>
							{/if}
						</div>
					</div>
					
					{#if !hasEnhancements}
						<p class="text-xs text-surface-600 mt-3">
							All features work without these tools. Install them later for enhanced performance.
						</p>
					{/if}
				</div>
			{:else}
				<div class="mb-6 p-4 rounded-xl bg-surface-900/50 border border-surface-700 flex items-center justify-center gap-2">
					<Loader2 class="h-4 w-4 text-surface-500 animate-spin" />
					<span class="text-sm text-surface-500">Checking system...</span>
				</div>
			{/if}

			<!-- CTA -->
			<button
				onclick={dismiss}
				class="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-accent-start to-accent-end text-white font-semibold hover:opacity-90 transition-opacity"
			>
				Get Started
			</button>
		</div>
	</div>
{/if}
