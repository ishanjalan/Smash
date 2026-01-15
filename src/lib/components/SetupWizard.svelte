<script lang="ts">
	import { onMount } from 'svelte';
	import { checkGhostscript, checkQPDF, type ToolStatus } from '$lib/utils/pdf';
	import { 
		AlertTriangle, 
		Check, 
		ExternalLink, 
		Loader2, 
		Terminal,
		Download,
		RefreshCw
	} from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	let show = $state(false);
	let checking = $state(true);
	let gsStatus = $state<ToolStatus | null>(null);
	let qpdfStatus = $state<ToolStatus | null>(null);
	let platform = $state<'macos' | 'windows' | 'linux'>('macos');

	const allGood = $derived(gsStatus?.available && qpdfStatus?.available);
	const partialGood = $derived(gsStatus?.available || qpdfStatus?.available);

	onMount(async () => {
		// Detect platform
		const ua = navigator.userAgent.toLowerCase();
		if (ua.includes('win')) platform = 'windows';
		else if (ua.includes('linux')) platform = 'linux';
		else platform = 'macos';

		// Check if we've shown this before
		const hasSeenSetup = localStorage.getItem('smash-setup-complete');
		
		await checkTools();
		
		// Show wizard if tools are missing and user hasn't completed setup
		if (!allGood && !hasSeenSetup) {
			show = true;
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

	function completeSetup() {
		localStorage.setItem('smash-setup-complete', 'true');
		show = false;
	}

	function skipSetup() {
		show = false;
	}

	const installCommands = {
		macos: {
			ghostscript: 'brew install ghostscript',
			qpdf: 'brew install qpdf',
			both: 'brew install ghostscript qpdf'
		},
		windows: {
			ghostscript: 'Download from ghostscript.com',
			qpdf: 'Download from github.com/qpdf/qpdf/releases',
			both: 'Install both from their websites'
		},
		linux: {
			ghostscript: 'sudo apt install ghostscript',
			qpdf: 'sudo apt install qpdf',
			both: 'sudo apt install ghostscript qpdf'
		}
	};

	async function copyCommand(cmd: string) {
		await navigator.clipboard.writeText(cmd);
	}
</script>

{#if show}
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
	>
		<div 
			class="w-full max-w-lg mx-4 glass rounded-3xl p-6 shadow-2xl"
			transition:fly={{ y: 20, duration: 300 }}
		>
			<!-- Header -->
			<div class="text-center mb-6">
				<div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-start/20 to-accent-end/20 flex items-center justify-center">
					{#if checking}
						<Loader2 class="h-8 w-8 text-accent-start animate-spin" />
					{:else if allGood}
						<Check class="h-8 w-8 text-green-400" />
					{:else}
						<AlertTriangle class="h-8 w-8 text-amber-400" />
					{/if}
				</div>
				
				<h2 class="text-xl font-bold text-surface-100">
					{#if checking}
						Checking System...
					{:else if allGood}
						All Set!
					{:else}
						Setup Required
					{/if}
				</h2>
				
				<p class="text-sm text-surface-500 mt-2">
					{#if checking}
						Verifying PDF tools are installed
					{:else if allGood}
						Smash is ready to use
					{:else}
						Install missing tools for full functionality
					{/if}
				</p>
			</div>

			<!-- Tool Status -->
			{#if !checking}
				<div class="space-y-3 mb-6">
					<!-- Ghostscript -->
					<div class="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50">
						<div class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center {gsStatus?.available ? 'bg-green-500/20' : 'bg-red-500/20'}">
							{#if gsStatus?.available}
								<Check class="h-4 w-4 text-green-400" />
							{:else}
								<AlertTriangle class="h-4 w-4 text-red-400" />
							{/if}
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-surface-200">Ghostscript</p>
							<p class="text-xs text-surface-500">
								{#if gsStatus?.available}
									{gsStatus.version ? `v${gsStatus.version}` : 'Installed'} — Required for compression
								{:else}
									Not found — Required for PDF compression
								{/if}
							</p>
						</div>
					</div>

					<!-- qpdf -->
					<div class="flex items-center gap-3 p-3 rounded-xl bg-surface-800/50">
						<div class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center {qpdfStatus?.available ? 'bg-green-500/20' : 'bg-amber-500/20'}">
							{#if qpdfStatus?.available}
								<Check class="h-4 w-4 text-green-400" />
							{:else}
								<AlertTriangle class="h-4 w-4 text-amber-400" />
							{/if}
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-surface-200">qpdf</p>
							<p class="text-xs text-surface-500">
								{#if qpdfStatus?.available}
									Installed — Required for encryption
								{:else}
									Not found — Optional, for password protection
								{/if}
							</p>
						</div>
					</div>
				</div>

				<!-- Install Instructions -->
				{#if !allGood}
					<div class="mb-6 p-4 rounded-xl bg-surface-900/50 border border-surface-700">
						<h3 class="text-sm font-semibold text-surface-200 mb-3 flex items-center gap-2">
							<Terminal class="h-4 w-4" />
							Install Commands ({platform === 'macos' ? 'macOS' : platform === 'windows' ? 'Windows' : 'Linux'})
						</h3>
						
						{#if platform === 'macos' || platform === 'linux'}
							<div class="space-y-2">
								{#if !gsStatus?.available && !qpdfStatus?.available}
									<button
										onclick={() => copyCommand(installCommands[platform].both)}
										class="w-full text-left px-3 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors group"
									>
										<code class="text-xs text-green-400 font-mono">{installCommands[platform].both}</code>
										<span class="text-[10px] text-surface-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to copy</span>
									</button>
								{:else}
									{#if !gsStatus?.available}
										<button
											onclick={() => copyCommand(installCommands[platform].ghostscript)}
											class="w-full text-left px-3 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors group"
										>
											<code class="text-xs text-green-400 font-mono">{installCommands[platform].ghostscript}</code>
											<span class="text-[10px] text-surface-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to copy</span>
										</button>
									{/if}
									{#if !qpdfStatus?.available}
										<button
											onclick={() => copyCommand(installCommands[platform].qpdf)}
											class="w-full text-left px-3 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors group"
										>
											<code class="text-xs text-green-400 font-mono">{installCommands[platform].qpdf}</code>
											<span class="text-[10px] text-surface-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to copy</span>
										</button>
									{/if}
								{/if}
							</div>
						{:else}
							<!-- Windows -->
							<div class="space-y-2 text-sm text-surface-400">
								{#if !gsStatus?.available}
									<a
										href="https://ghostscript.com/releases/gsdnld.html"
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors"
									>
										<Download class="h-4 w-4" />
										<span>Download Ghostscript</span>
										<ExternalLink class="h-3 w-3 ml-auto" />
									</a>
								{/if}
								{#if !qpdfStatus?.available}
									<a
										href="https://github.com/qpdf/qpdf/releases"
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors"
									>
										<Download class="h-4 w-4" />
										<span>Download qpdf</span>
										<ExternalLink class="h-3 w-3 ml-auto" />
									</a>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			{/if}

			<!-- Actions -->
			<div class="flex gap-3">
				{#if allGood}
					<button
						onclick={completeSetup}
						class="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent-start to-accent-end text-white font-semibold hover:opacity-90 transition-opacity"
					>
						Get Started
					</button>
				{:else if !checking}
					<button
						onclick={skipSetup}
						class="flex-1 px-4 py-2.5 rounded-xl bg-surface-800 text-surface-300 hover:bg-surface-700 transition-colors"
					>
						Skip for Now
					</button>
					<button
						onclick={checkTools}
						class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent-start to-accent-end text-white font-semibold hover:opacity-90 transition-opacity"
					>
						<RefreshCw class="h-4 w-4" />
						Recheck
					</button>
				{/if}
			</div>

			{#if !allGood && !checking}
				<p class="text-xs text-surface-600 text-center mt-4">
					You can still use most features without these tools
				</p>
			{/if}
		</div>
	</div>
{/if}
