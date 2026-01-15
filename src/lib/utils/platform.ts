/**
 * Platform detection utilities
 * 
 * Detects whether we're running in Tauri (desktop) or browser (web).
 */

declare global {
	interface Window {
		__TAURI__?: unknown;
		__TAURI_INTERNALS__?: unknown;
	}
}

/**
 * Check if running inside Tauri desktop app
 */
export function isTauri(): boolean {
	if (typeof window === 'undefined') return false;
	return '__TAURI__' in window || '__TAURI_INTERNALS__' in window;
}

/**
 * Get the current platform
 */
export function getPlatform(): 'desktop' | 'web' {
	return isTauri() ? 'desktop' : 'web';
}

/**
 * Check if running on macOS (for platform-specific UI)
 */
export async function isMacOS(): Promise<boolean> {
	if (!isTauri()) {
		return navigator.platform.toLowerCase().includes('mac');
	}
	
	try {
		const { platform } = await import('@tauri-apps/plugin-os');
		const os = await platform();
		return os === 'macos';
	} catch {
		return false;
	}
}

/**
 * Check if running on Windows
 */
export async function isWindows(): Promise<boolean> {
	if (!isTauri()) {
		return navigator.platform.toLowerCase().includes('win');
	}
	
	try {
		const { platform } = await import('@tauri-apps/plugin-os');
		const os = await platform();
		return os === 'windows';
	} catch {
		return false;
	}
}
