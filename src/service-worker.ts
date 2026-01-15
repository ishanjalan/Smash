/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

const CACHE_NAME = `smash-cache-${version}`;
const RUNTIME_CACHE_NAME = 'smash-runtime-v1';

// Assets to cache immediately (app shell)
const PRECACHE_ASSETS = [
	...build, // App build files (JS, CSS bundles)
	...files // Static files (icons, manifest, etc.)
];

// External libraries to cache (PDF.js worker)
const EXTERNAL_LIBS = [
	'https://cdnjs.cloudflare.com/ajax/libs/pdf.js'
];

// Check if a URL is an external library we should cache
function isExternalLib(url: string): boolean {
	return EXTERNAL_LIBS.some((lib) => url.startsWith(lib));
}

// Install: Cache app shell immediately
self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			
			// Cache all precache assets
			await cache.addAll(PRECACHE_ASSETS);
			
			// Skip waiting to activate immediately
			await self.skipWaiting();
		})()
	);
});

// Activate: Clean up old caches and claim clients
self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			// Get all cache keys
			const keys = await caches.keys();
			
			// Delete old caches (keep current app cache and runtime cache)
			await Promise.all(
				keys
					.filter((key) => 
						key !== CACHE_NAME && 
						key !== RUNTIME_CACHE_NAME &&
						!key.startsWith('smash-cache-') // Keep versioned caches during transition
					)
					.map((key) => caches.delete(key))
			);
			
			// Claim all clients immediately
			await self.clients.claim();
		})()
	);
});

// Fetch: Serve from cache with network fallback
self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	
	// Skip non-GET requests
	if (event.request.method !== 'GET') return;
	
	// Skip chrome-extension and other non-http(s) requests
	if (!url.protocol.startsWith('http')) return;
	
	event.respondWith(
		(async () => {
			// Try cache first for app assets
			const cache = await caches.open(CACHE_NAME);
			const cachedResponse = await cache.match(event.request);
			
			if (cachedResponse) {
				return cachedResponse;
			}
			
			// For external libraries (PDF.js), try runtime cache
			if (isExternalLib(url.href)) {
				const runtimeCache = await caches.open(RUNTIME_CACHE_NAME);
				const runtimeCached = await runtimeCache.match(event.request);
				
				if (runtimeCached) {
					return runtimeCached;
				}
				
				// Fetch and cache
				try {
					const response = await fetch(event.request);
					if (response.ok) {
						runtimeCache.put(event.request, response.clone());
					}
					return response;
				} catch {
					// Network failed, return error
					return new Response('Network error', { status: 503 });
				}
			}
			
			// For other requests, try network with cache fallback
			try {
				const response = await fetch(event.request);
				
				// Cache successful responses for same-origin requests
				if (response.ok && url.origin === self.location.origin) {
					cache.put(event.request, response.clone());
				}
				
				return response;
			} catch {
				// Network failed, nothing in cache
				return new Response('Offline', { status: 503 });
			}
		})()
	);
});

// Handle messages from the app
self.addEventListener('message', (event) => {
	if (event.data === 'SKIP_WAITING') {
		self.skipWaiting();
	}
	
	if (event.data === 'CHECK_OFFLINE') {
		// Check if app can work offline
		event.ports[0]?.postMessage({
			offline: true,
			cached: true
		});
	}
});
