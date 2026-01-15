/**
 * IndexedDB Storage for Large PDF Files
 * Prevents memory issues with large PDFs by storing them in IndexedDB
 */

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'smash-storage';
const DB_VERSION = 1;

interface SmashDB {
	pdfs: {
		key: string;
		value: {
			id: string;
			originalBlob: Blob;
			processedBlob?: Blob;
			metadata: {
				name: string;
				size: number;
				type: string;
				lastModified: number;
			};
			createdAt: number;
		};
	};
	settings: {
		key: string;
		value: unknown;
	};
}

let dbInstance: IDBPDatabase<SmashDB> | null = null;

async function getDB(): Promise<IDBPDatabase<SmashDB>> {
	if (dbInstance) return dbInstance;

	dbInstance = await openDB<SmashDB>(DB_NAME, DB_VERSION, {
		upgrade(db) {
			// PDFs store
			if (!db.objectStoreNames.contains('pdfs')) {
				db.createObjectStore('pdfs', { keyPath: 'id' });
			}
			// Settings store
			if (!db.objectStoreNames.contains('settings')) {
				db.createObjectStore('settings');
			}
		}
	});

	return dbInstance;
}

// Large file threshold (50MB) - files above this are stored in IndexedDB
const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024;

export function isLargeFile(size: number): boolean {
	return size > LARGE_FILE_THRESHOLD;
}

export async function storePDF(
	id: string,
	file: File,
	processedBlob?: Blob
): Promise<void> {
	const db = await getDB();

	await db.put('pdfs', {
		id,
		originalBlob: file,
		processedBlob,
		metadata: {
			name: file.name,
			size: file.size,
			type: file.type,
			lastModified: file.lastModified
		},
		createdAt: Date.now()
	});
}

export async function getPDFBlob(id: string): Promise<Blob | null> {
	const db = await getDB();
	const record = await db.get('pdfs', id);
	return record?.originalBlob ?? null;
}

export async function getProcessedBlob(id: string): Promise<Blob | null> {
	const db = await getDB();
	const record = await db.get('pdfs', id);
	return record?.processedBlob ?? null;
}

export async function updateProcessedBlob(id: string, blob: Blob): Promise<void> {
	const db = await getDB();
	const record = await db.get('pdfs', id);
	if (record) {
		record.processedBlob = blob;
		await db.put('pdfs', record);
	}
}

export async function deletePDF(id: string): Promise<void> {
	const db = await getDB();
	await db.delete('pdfs', id);
}

export async function clearAllPDFs(): Promise<void> {
	const db = await getDB();
	await db.clear('pdfs');
}

export async function getStorageUsage(): Promise<{
	count: number;
	totalSize: number;
	processedSize: number;
}> {
	const db = await getDB();
	const all = await db.getAll('pdfs');

	let totalSize = 0;
	let processedSize = 0;

	for (const record of all) {
		totalSize += record.originalBlob.size;
		if (record.processedBlob) {
			processedSize += record.processedBlob.size;
		}
	}

	return {
		count: all.length,
		totalSize,
		processedSize
	};
}

// Cleanup old entries (older than 24 hours)
export async function cleanupOldEntries(): Promise<number> {
	const db = await getDB();
	const all = await db.getAll('pdfs');
	const cutoff = Date.now() - 24 * 60 * 60 * 1000;

	let deleted = 0;
	for (const record of all) {
		if (record.createdAt < cutoff) {
			await db.delete('pdfs', record.id);
			deleted++;
		}
	}

	return deleted;
}
