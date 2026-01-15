<script lang="ts">
	import { onMount } from 'svelte';
	import { Download, X, RefreshCw, Loader2 } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	let show = $state(false);
	let updateAvailable = $state(false);
	let updateVersion = $state('');
	let updateNotes = $state('');
	let downloading = $state(false);
	let downloadProgress = $state(0);
	let error = $state('');

	onMount(async () => {
		// Check for updates on launch (with delay to not block UI)
		setTimeout(checkForUpdates, 3000);
	});

	async function checkForUpdates() {
		try {
			const { check } = await import('@tauri-apps/plugin-updater');
			const update = await check();
			
			if (update) {
				updateAvailable = true;
				updateVersion = update.version;
				updateNotes = update.body || '';
				show = true;
			}
		} catch (e) {
			// Silently fail - updates are optional
			console.log('Update check skipped:', e);
		}
	}

	async function installUpdate() {
		downloading = true;
		error = '';
		
		try {
			const { check } = await import('@tauri-apps/plugin-updater');
			const { relaunch } = await import('@tauri-apps/plugin-process');
			
			const update = await check();
			if (!update) {
				error = 'Update no longer available';
				downloading = false;
				return;
			}

			await update.downloadAndInstall((progress) => {
				if (progress.event === 'Started' && progress.data.contentLength) {
					downloadProgress = 0;
				} else if (progress.event === 'Progress') {
					downloadProgress = Math.round((progress.data.chunkLength / (progress.data.contentLength || 1)) * 100);
				} else if (progress.event === 'Finished') {
					downloadProgress = 100;
				}
			});

			// Relaunch the app
			await relaunch();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to install update';
			downloading = false;
		}
	}

	function dismiss() {
		show = false;
	}
</script>

{#if show && updateAvailable}
	<div 
		class="fixed bottom-4 left-4 z-50 w-80"
		transition:fly={{ y: 20, duration: 300 }}
	>
		<div class="glass rounded-2xl p-4 shadow-2xl border border-surface-700">
			<!-- Header -->
			<div class="flex items-start justify-between mb-3">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
						<Download class="h-4 w-4 text-green-400" />
					</div>
					<div>
						<h3 class="text-sm font-semibold text-surface-200">Update Available</h3>
						<p class="text-xs text-surface-500">Version {updateVersion}</p>
					</div>
				</div>
				<button
					onclick={dismiss}
					class="p-1 text-surface-500 hover:text-surface-300 transition-colors"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- Release notes (truncated) -->
			{#if updateNotes}
				<p class="text-xs text-surface-500 mb-3 line-clamp-2">
					{updateNotes}
				</p>
			{/if}

			<!-- Error message -->
			{#if error}
				<p class="text-xs text-red-400 mb-3">{error}</p>
			{/if}

			<!-- Progress bar -->
			{#if downloading}
				<div class="mb-3">
					<div class="h-1.5 bg-surface-700 rounded-full overflow-hidden">
						<div 
							class="h-full bg-gradient-to-r from-accent-start to-accent-end transition-all duration-300"
							style="width: {downloadProgress}%"
						></div>
					</div>
					<p class="text-xs text-surface-500 mt-1 text-center">
						{downloadProgress < 100 ? `Downloading... ${downloadProgress}%` : 'Installing...'}
					</p>
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex gap-2">
				<button
					onclick={dismiss}
					class="flex-1 px-3 py-2 text-xs text-surface-400 hover:text-surface-200 transition-colors"
					disabled={downloading}
				>
					Later
				</button>
				<button
					onclick={installUpdate}
					disabled={downloading}
					class="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-accent-start to-accent-end text-white hover:opacity-90 disabled:opacity-50 transition-all"
				>
					{#if downloading}
						<Loader2 class="h-3 w-3 animate-spin" />
						Updating...
					{:else}
						<RefreshCw class="h-3 w-3" />
						Update Now
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
