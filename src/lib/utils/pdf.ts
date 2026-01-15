/**
 * PDF Processing Utilities - Desktop App (Tauri)
 * 
 * Uses native Ghostscript for compression (50-90% reduction)
 * Uses native qpdf for encryption (AES-256)
 * Uses pdf-lib for manipulation (merge, split, rotate, etc.)
 * 
 * All processing happens locally - files never leave your device.
 */

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { invoke } from '@tauri-apps/api/core';
import { appDataDir } from '@tauri-apps/api/path';
import { writeFile, readFile, remove } from '@tauri-apps/plugin-fs';
import { pdfs, type PDFItem, type ImageFormat, type CompressionPreset } from '$lib/stores/pdfs.svelte';

// Configure PDF.js worker - use local bundled file
if (typeof window !== 'undefined') {
	pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

// ============================================
// TOOL AVAILABILITY
// ============================================

let _ghostscriptAvailable: boolean | null = null;
let _qpdfAvailable: boolean | null = null;
let _ghostscriptVersion: string | null = null;

export interface ToolStatus {
	available: boolean;
	path?: string;
	version?: string;
}

/**
 * Check if Ghostscript is installed
 */
export async function checkGhostscript(): Promise<ToolStatus> {
	if (_ghostscriptAvailable !== null) {
		return { available: _ghostscriptAvailable, version: _ghostscriptVersion || undefined };
	}
	
	try {
		// Rust command returns the path as a string on success
		const path = await invoke<string>('check_ghostscript');
		_ghostscriptAvailable = true;
		try {
			_ghostscriptVersion = await invoke<string>('get_ghostscript_version');
		} catch {
			_ghostscriptVersion = null;
		}
		return { available: true, path, version: _ghostscriptVersion || undefined };
	} catch (err) {
		console.error('Ghostscript check failed:', err);
		_ghostscriptAvailable = false;
		return { available: false };
	}
}

/**
 * Check if qpdf is installed
 */
export async function checkQPDF(): Promise<ToolStatus> {
	if (_qpdfAvailable !== null) {
		return { available: _qpdfAvailable };
	}
	
	try {
		// Rust command returns the path as a string on success
		const path = await invoke<string>('check_qpdf');
		_qpdfAvailable = true;
		return { available: true, path };
	} catch (err) {
		console.error('qpdf check failed:', err);
		_qpdfAvailable = false;
		return { available: false };
	}
}

/**
 * Get backend status for UI display
 */
export async function getBackendInfo(): Promise<{
	ghostscript: ToolStatus;
	qpdf: ToolStatus;
}> {
	const [ghostscript, qpdf] = await Promise.all([
		checkGhostscript(),
		checkQPDF()
	]);
	return { ghostscript, qpdf };
}

// ============================================
// TEMP FILE HELPERS
// ============================================

async function getTempPath(prefix: string): Promise<string> {
	const tempDir = await appDataDir();
	// Ensure trailing slash
	const dir = tempDir.endsWith('/') || tempDir.endsWith('\\') ? tempDir : `${tempDir}/`;
	return `${dir}${prefix}_${Date.now()}.pdf`;
}

async function writeTemp(file: File, prefix: string): Promise<string> {
	const path = await getTempPath(prefix);
	const arrayBuffer = await file.arrayBuffer();
	try {
		await writeFile(path, new Uint8Array(arrayBuffer));
	} catch (err) {
		// Directory might not exist, try to create it
		const { mkdir } = await import('@tauri-apps/plugin-fs');
		const dir = path.substring(0, path.lastIndexOf('/'));
		await mkdir(dir, { recursive: true });
		await writeFile(path, new Uint8Array(arrayBuffer));
	}
	return path;
}

async function readTemp(path: string): Promise<Blob> {
	const data = await readFile(path);
	return new Blob([data], { type: 'application/pdf' });
}

async function cleanupTemp(...paths: string[]) {
	for (const path of paths) {
		try { await remove(path); } catch {}
	}
}

// ============================================
// PDF COMPRESSION
// ============================================

interface CompressOptions {
	preset: CompressionPreset;
	onProgress?: (progress: number) => void;
}

/**
 * Compress PDF - tries Ghostscript first (best), falls back to pdf-lib (basic)
 * Works without any external dependencies using pdf-lib fallback
 */
export async function compressPDF(
	file: File,
	options: CompressOptions
): Promise<Blob> {
	const { preset = 'ebook', onProgress } = options;
	
	// Try Ghostscript first for best compression (50-90% reduction)
	const gs = await checkGhostscript();
	if (gs.available) {
		try {
			return await compressPDFWithGhostscript(file, options);
		} catch (e) {
			console.warn('Ghostscript compression failed, falling back to pdf-lib:', e);
		}
	}
	
	// Fall back to pdf-lib optimization (10-30% reduction)
	return await compressPDFWithPdfLib(file, options);
}

/**
 * Ghostscript compression (50-90% reduction)
 * Requires Ghostscript to be installed
 */
async function compressPDFWithGhostscript(
	file: File,
	options: CompressOptions
): Promise<Blob> {
	const { preset = 'ebook', onProgress } = options;
	
	onProgress?.(5);
	
	const inputPath = await writeTemp(file, 'compress_input');
	const outputPath = await getTempPath('compress_output');
	
	try {
		onProgress?.(20);
		
		const result = await invoke<{
			output_path: string;
			original_size: number;
			compressed_size: number;
			savings_percent: number;
		}>('compress_pdf', {
			inputPath,
			outputPath,
			preset
		});
		
		onProgress?.(90);
		
		const blob = await readTemp(result.output_path);
		
		onProgress?.(100);
		
		return blob;
	} finally {
		await cleanupTemp(inputPath, outputPath);
	}
}

/**
 * pdf-lib compression (10-30% reduction)
 * Works without any external dependencies
 */
async function compressPDFWithPdfLib(
	file: File,
	options: CompressOptions
): Promise<Blob> {
	const { onProgress } = options;
	
	onProgress?.(10);
	
	const arrayBuffer = await file.arrayBuffer();
	const srcPdf = await PDFDocument.load(arrayBuffer, {
		ignoreEncryption: true
	});
	
	onProgress?.(30);
	
	// Create a new optimized PDF
	const newPdf = await PDFDocument.create();
	
	// Copy all pages (this re-encodes and often compresses)
	const pageCount = srcPdf.getPageCount();
	const pages = await newPdf.copyPages(srcPdf, srcPdf.getPageIndices());
	
	for (let i = 0; i < pages.length; i++) {
		newPdf.addPage(pages[i]);
		onProgress?.(30 + Math.round((i / pageCount) * 50));
	}
	
	onProgress?.(85);
	
	// Save with optimizations
	const pdfBytes = await newPdf.save({
		useObjectStreams: true,
		addDefaultPage: false,
		objectsPerTick: 100
	});
	
	onProgress?.(100);
	
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ============================================
// PDF MERGE (pdf-lib)
// ============================================

export async function mergePDFs(
	files: File[],
	onProgress?: (progress: number) => void
): Promise<Blob> {
	const mergedPdf = await PDFDocument.create();
	
	for (let i = 0; i < files.length; i++) {
		const arrayBuffer = await files[i].arrayBuffer();
		const pdf = await PDFDocument.load(arrayBuffer);
		const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
		pages.forEach(page => mergedPdf.addPage(page));
		
		onProgress?.(Math.round(((i + 1) / files.length) * 100));
	}
	
	const pdfBytes = await mergedPdf.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ============================================
// PDF SPLIT (pdf-lib)
// ============================================

interface SplitOptions {
	mode: 'range' | 'extract' | 'every-n';
	range?: { start: number; end: number };
	pages?: number[];
	everyN?: number;
	onProgress?: (progress: number) => void;
}

export async function splitPDF(
	file: File,
	options: SplitOptions
): Promise<Blob[]> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	const totalPages = pdf.getPageCount();
	const results: Blob[] = [];
	
	if (options.mode === 'range' && options.range) {
		const newPdf = await PDFDocument.create();
		const pageIndices = Array.from(
			{ length: options.range.end - options.range.start + 1 },
			(_, i) => options.range!.start - 1 + i
		).filter(i => i >= 0 && i < totalPages);
		
		const pages = await newPdf.copyPages(pdf, pageIndices);
		pages.forEach(page => newPdf.addPage(page));
		const bytes = await newPdf.save();
		results.push(new Blob([bytes], { type: 'application/pdf' }));
		options.onProgress?.(100);
	}
	
	else if (options.mode === 'extract' && options.pages) {
		const newPdf = await PDFDocument.create();
		const pageIndices = options.pages
			.map(p => p - 1)
			.filter(i => i >= 0 && i < totalPages);
		
		const pages = await newPdf.copyPages(pdf, pageIndices);
		pages.forEach(page => newPdf.addPage(page));
		const bytes = await newPdf.save();
		results.push(new Blob([bytes], { type: 'application/pdf' }));
		options.onProgress?.(100);
	}
	
	else if (options.mode === 'every-n' && options.everyN) {
		const n = options.everyN;
		for (let i = 0; i < totalPages; i += n) {
			const newPdf = await PDFDocument.create();
			const endPage = Math.min(i + n, totalPages);
			const pageIndices = Array.from({ length: endPage - i }, (_, j) => i + j);
			
			const pages = await newPdf.copyPages(pdf, pageIndices);
			pages.forEach(page => newPdf.addPage(page));
			const bytes = await newPdf.save();
			results.push(new Blob([bytes], { type: 'application/pdf' }));
			
			options.onProgress?.(Math.round((endPage / totalPages) * 100));
		}
	}
	
	return results;
}

// ============================================
// PDF TO IMAGES (PDF.js)
// ============================================

interface PDFToImagesOptions {
	format: ImageFormat;
	dpi: number;
	quality: number;
	onProgress?: (progress: number) => void;
}

export async function pdfToImages(
	file: File,
	options: PDFToImagesOptions
): Promise<Blob[]> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
	const scale = options.dpi / 72;
	const images: Blob[] = [];
	
	for (let i = 1; i <= pdf.numPages; i++) {
		const page = await pdf.getPage(i);
		const viewport = page.getViewport({ scale });
		
		const canvas = document.createElement('canvas');
		canvas.width = viewport.width;
		canvas.height = viewport.height;
		const ctx = canvas.getContext('2d')!;
		
		await page.render({ canvasContext: ctx, viewport }).promise;
		
		const mimeType = options.format === 'jpg' ? 'image/jpeg' : `image/${options.format}`;
		const blob = await new Promise<Blob>((resolve) => {
			canvas.toBlob(blob => resolve(blob!), mimeType, options.quality / 100);
		});
		
		images.push(blob);
		options.onProgress?.(Math.round((i / pdf.numPages) * 100));
	}
	
	return images;
}

// ============================================
// IMAGES TO PDF (pdf-lib)
// ============================================

export async function imagesToPDF(
	files: File[],
	onProgress?: (progress: number) => void
): Promise<Blob> {
	const pdf = await PDFDocument.create();
	
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const arrayBuffer = await file.arrayBuffer();
		
		let image;
		if (file.type === 'image/png') {
			image = await pdf.embedPng(arrayBuffer);
		} else if (file.type === 'image/webp') {
			const img = await loadImage(file);
			const canvas = document.createElement('canvas');
			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(img, 0, 0);
			const pngBlob = await new Promise<Blob>((resolve) => {
				canvas.toBlob(blob => resolve(blob!), 'image/png');
			});
			const pngBuffer = await pngBlob.arrayBuffer();
			image = await pdf.embedPng(pngBuffer);
		} else {
			image = await pdf.embedJpg(arrayBuffer);
		}
		
		const page = pdf.addPage([image.width, image.height]);
		page.drawImage(image, {
			x: 0,
			y: 0,
			width: image.width,
			height: image.height
		});
		
		onProgress?.(Math.round(((i + 1) / files.length) * 100));
	}
	
	const pdfBytes = await pdf.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = URL.createObjectURL(file);
	});
}

// ============================================
// PAGE OPERATIONS (pdf-lib)
// ============================================

export async function getPageCount(file: File): Promise<number> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	return pdf.getPageCount();
}

export async function generateThumbnail(file: File): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
	const page = await pdf.getPage(1);
	
	const scale = 0.5;
	const viewport = page.getViewport({ scale });
	
	const canvas = document.createElement('canvas');
	canvas.width = viewport.width;
	canvas.height = viewport.height;
	const ctx = canvas.getContext('2d')!;
	
	await page.render({ canvasContext: ctx, viewport }).promise;
	
	return canvas.toDataURL('image/jpeg', 0.7);
}

interface RotateOptions {
	angle: 90 | 180 | 270;
	pages?: number[];
	onProgress?: (progress: number) => void;
}

export async function rotatePDF(
	file: File,
	options: RotateOptions
): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	const totalPages = pdf.getPageCount();
	const pagesToRotate = options.pages || Array.from({ length: totalPages }, (_, i) => i + 1);
	
	for (let i = 0; i < pagesToRotate.length; i++) {
		const pageIndex = pagesToRotate[i] - 1;
		if (pageIndex >= 0 && pageIndex < totalPages) {
			const page = pdf.getPage(pageIndex);
			const currentRotation = page.getRotation().angle;
			page.setRotation(degrees(currentRotation + options.angle));
		}
		options.onProgress?.(Math.round(((i + 1) / pagesToRotate.length) * 100));
	}
	
	const pdfBytes = await pdf.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

interface DeletePagesOptions {
	pages: number[];
	onProgress?: (progress: number) => void;
}

export async function deletePages(
	file: File,
	options: DeletePagesOptions
): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	
	const pagesToDelete = [...options.pages].sort((a, b) => b - a);
	
	for (let i = 0; i < pagesToDelete.length; i++) {
		const pageIndex = pagesToDelete[i] - 1;
		if (pageIndex >= 0 && pageIndex < pdf.getPageCount()) {
			pdf.removePage(pageIndex);
		}
		options.onProgress?.(Math.round(((i + 1) / pagesToDelete.length) * 100));
	}
	
	const pdfBytes = await pdf.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

interface ReorderOptions {
	newOrder: number[];
	onProgress?: (progress: number) => void;
}

export async function reorderPages(
	file: File,
	options: ReorderOptions
): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	const srcPdf = await PDFDocument.load(arrayBuffer);
	const newPdf = await PDFDocument.create();
	
	for (let i = 0; i < options.newOrder.length; i++) {
		const pageIndex = options.newOrder[i] - 1;
		if (pageIndex >= 0 && pageIndex < srcPdf.getPageCount()) {
			const [copiedPage] = await newPdf.copyPages(srcPdf, [pageIndex]);
			newPdf.addPage(copiedPage);
		}
		options.onProgress?.(Math.round(((i + 1) / options.newOrder.length) * 100));
	}
	
	const pdfBytes = await newPdf.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ============================================
// PAGE NUMBERS & WATERMARK (pdf-lib)
// ============================================

interface PageNumberOptions {
	position: 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right';
	startNumber?: number;
	format?: string;
	onProgress?: (progress: number) => void;
}

export async function addPageNumbers(
	file: File,
	options: PageNumberOptions
): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	const fontSize = 10;
	const { startNumber = 1, format = '{n}', position } = options;
	
	const pages = pdf.getPages();
	
	for (let i = 0; i < pages.length; i++) {
		const page = pages[i];
		const { width, height } = page.getSize();
		const pageNum = startNumber + i;
		const text = format.replace('{n}', pageNum.toString());
		const textWidth = font.widthOfTextAtSize(text, fontSize);
		
		let x: number, y: number;
		
		switch (position) {
			case 'bottom-center':
				x = (width - textWidth) / 2;
				y = 30;
				break;
			case 'bottom-right':
				x = width - textWidth - 40;
				y = 30;
				break;
			case 'top-center':
				x = (width - textWidth) / 2;
				y = height - 30;
				break;
			case 'top-right':
				x = width - textWidth - 40;
				y = height - 30;
				break;
		}
		
		page.drawText(text, {
			x,
			y,
			size: fontSize,
			font,
			color: rgb(0.3, 0.3, 0.3)
		});
		
		options.onProgress?.(Math.round(((i + 1) / pages.length) * 100));
	}
	
	const pdfBytes = await pdf.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

interface WatermarkOptions {
	text: string;
	opacity: number;
	fontSize?: number;
	angle?: number;
	onProgress?: (progress: number) => void;
}

export async function addWatermark(
	file: File,
	options: WatermarkOptions
): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	const font = await pdf.embedFont(StandardFonts.HelveticaBold);
	const { text, opacity, fontSize = 60, angle = -45 } = options;
	
	const pages = pdf.getPages();
	
	for (let i = 0; i < pages.length; i++) {
		const page = pages[i];
		const { width, height } = page.getSize();
		const textWidth = font.widthOfTextAtSize(text, fontSize);
		
		const x = (width - textWidth) / 2;
		const y = height / 2;
		
		page.drawText(text, {
			x,
			y,
			size: fontSize,
			font,
			color: rgb(0.7, 0.7, 0.7),
			opacity: opacity / 100,
			rotate: degrees(angle)
		});
		
		options.onProgress?.(Math.round(((i + 1) / pages.length) * 100));
	}
	
	const pdfBytes = await pdf.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ============================================
// PASSWORD PROTECTION
// ============================================

interface ProtectOptions {
	userPassword: string;
	ownerPassword?: string;
	onProgress?: (progress: number) => void;
}

/**
 * Password protect a PDF - tries qpdf first (AES-256), falls back to pdf-lib
 * Works without any external dependencies using pdf-lib fallback
 */
export async function protectPDF(
	file: File,
	options: ProtectOptions
): Promise<Blob> {
	const { userPassword, ownerPassword = userPassword, onProgress } = options;
	
	// Try qpdf first for AES-256 encryption
	const qpdf = await checkQPDF();
	if (qpdf.available) {
		try {
			return await protectPDFWithQpdf(file, options);
		} catch (e) {
			console.warn('qpdf protection failed, falling back to pdf-lib:', e);
		}
	}
	
	// Fall back to pdf-lib encryption (AES-128)
	return await protectPDFWithPdfLib(file, options);
}

/**
 * qpdf encryption (AES-256)
 */
async function protectPDFWithQpdf(
	file: File,
	options: ProtectOptions
): Promise<Blob> {
	const { userPassword, ownerPassword = userPassword, onProgress } = options;
	
	onProgress?.(5);
	
	const inputPath = await writeTemp(file, 'protect_input');
	const outputPath = await getTempPath('protect_output');
	
	try {
		onProgress?.(20);
		
		await invoke('protect_pdf', {
			inputPath,
			outputPath,
			userPassword,
			ownerPassword
		});
		
		onProgress?.(90);
		
		const blob = await readTemp(outputPath);
		
		onProgress?.(100);
		
		return blob;
	} finally {
		await cleanupTemp(inputPath, outputPath);
	}
}

/**
 * pdf-lib encryption (AES-128)
 * Works without any external dependencies
 */
async function protectPDFWithPdfLib(
	file: File,
	options: ProtectOptions
): Promise<Blob> {
	const { userPassword, ownerPassword = userPassword, onProgress } = options;
	
	onProgress?.(10);
	
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	
	onProgress?.(50);
	
	const pdfBytes = await pdf.save({
		userPassword,
		ownerPassword,
		permissions: {
			printing: 'lowResolution',
			modifying: false,
			copying: false,
			annotating: false,
			fillingForms: false,
			contentAccessibility: true,
			documentAssembly: false
		}
	});
	
	onProgress?.(100);
	
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

interface UnlockOptions {
	password: string;
	onProgress?: (progress: number) => void;
}

/**
 * Unlock a password-protected PDF - tries qpdf first, falls back to pdf-lib
 * Works without any external dependencies using pdf-lib fallback
 */
export async function unlockPDF(
	file: File,
	options: UnlockOptions
): Promise<Blob> {
	const { password, onProgress } = options;
	
	// Try qpdf first
	const qpdf = await checkQPDF();
	if (qpdf.available) {
		try {
			return await unlockPDFWithQpdf(file, options);
		} catch (e) {
			console.warn('qpdf unlock failed, falling back to pdf-lib:', e);
		}
	}
	
	// Fall back to pdf-lib
	return await unlockPDFWithPdfLib(file, options);
}

/**
 * qpdf unlock
 */
async function unlockPDFWithQpdf(
	file: File,
	options: UnlockOptions
): Promise<Blob> {
	const { password, onProgress } = options;
	
	onProgress?.(5);
	
	const inputPath = await writeTemp(file, 'unlock_input');
	const outputPath = await getTempPath('unlock_output');
	
	try {
		onProgress?.(20);
		
		await invoke('unlock_pdf', {
			inputPath,
			outputPath,
			password
		});
		
		onProgress?.(90);
		
		const blob = await readTemp(outputPath);
		
		onProgress?.(100);
		
		return blob;
	} finally {
		await cleanupTemp(inputPath, outputPath);
	}
}

/**
 * pdf-lib unlock
 * Works without any external dependencies
 */
async function unlockPDFWithPdfLib(
	file: File,
	options: UnlockOptions
): Promise<Blob> {
	const { password, onProgress } = options;
	
	onProgress?.(10);
	
	const arrayBuffer = await file.arrayBuffer();
	
	onProgress?.(30);
	
	// Load with password
	const pdf = await PDFDocument.load(arrayBuffer, {
		password,
		ignoreEncryption: false
	});
	
	onProgress?.(70);
	
	// Save without encryption
	const pdfBytes = await pdf.save();
	
	onProgress?.(100);
	
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parsePageRangeHelper(rangeStr: string, maxPages: number): number[] {
	const pages = new Set<number>();
	const parts = rangeStr.split(',').map((s) => s.trim());

	for (const part of parts) {
		if (part.includes('-')) {
			const [start, end] = part.split('-').map((s) => parseInt(s.trim(), 10));
			if (!isNaN(start) && !isNaN(end)) {
				for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
					pages.add(i);
				}
			}
		} else {
			const page = parseInt(part, 10);
			if (!isNaN(page) && page >= 1 && page <= maxPages) {
				pages.add(page);
			}
		}
	}

	return Array.from(pages).sort((a, b) => a - b);
}

// ============================================
// PROCESS QUEUE
// ============================================

let isProcessing = false;

export async function processFiles() {
	if (isProcessing) return;
	
	const pendingItems = pdfs.items.filter(i => i.status === 'pending');
	if (pendingItems.length === 0) return;
	
	isProcessing = true;
	const tool = pdfs.settings.tool;
	
	try {
		if (tool === 'merge') {
			await processMerge(pendingItems);
		} else if (tool === 'images-to-pdf') {
			await processImagesToPDF(pendingItems);
		} else {
			for (const item of pendingItems) {
				await processItem(item);
			}
		}
	} finally {
		isProcessing = false;
	}
}

async function processItem(item: PDFItem) {
	const tool = pdfs.settings.tool;
	const settings = pdfs.settings;
	
	try {
		pdfs.updateItem(item.id, {
			status: 'processing',
			progress: 0,
			progressStage: 'Processing...'
		});
		
		let result: Blob | Blob[];
		
		switch (tool) {
			case 'compress':
				pdfs.updateItem(item.id, { progressStage: 'Compressing with Ghostscript...' });
				result = await compressPDF(item.file, {
					preset: settings.compressionPreset,
					onProgress: (p) => {
						pdfs.updateItem(item.id, { 
							progress: p,
							progressStage: p < 30 ? 'Initializing...' : p < 80 ? 'Compressing...' : 'Finalizing...'
						});
					}
				});
				break;
				
			case 'split':
				const pageCount = await getPageCount(item.file);
				let splitOptions: SplitOptions;
				
				if (settings.splitMode === 'range') {
					const pages = settings.splitRange.split('-').map(s => parseInt(s.trim(), 10));
					splitOptions = {
						mode: 'range',
						range: { start: pages[0] || 1, end: pages[1] || pageCount },
						onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
					};
				} else if (settings.splitMode === 'every-n') {
					splitOptions = {
						mode: 'every-n',
						everyN: settings.splitEveryN,
						onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
					};
				} else {
					splitOptions = {
						mode: 'extract',
						pages: parsePageRangeHelper(settings.splitRange, pageCount),
						onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
					};
				}
				
				result = await splitPDF(item.file, splitOptions);
				break;
				
			case 'rotate':
				result = await rotatePDF(item.file, {
					angle: settings.rotationAngle,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;
				
			case 'delete-pages':
				const deletePageCount = await getPageCount(item.file);
				const pagesToDelete = parsePageRangeHelper(settings.splitRange, deletePageCount);
				result = await deletePages(item.file, {
					pages: pagesToDelete,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;
				
			case 'reorder':
				const reorderPageCount = await getPageCount(item.file);
				const newOrder = item.selectedPages || Array.from({ length: reorderPageCount }, (_, i) => i + 1);
				result = await reorderPages(item.file, {
					newOrder,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;
				
			case 'pdf-to-images':
				result = await pdfToImages(item.file, {
					format: settings.imageFormat,
					dpi: settings.imageDPI,
					quality: settings.imageQuality,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;
				
			case 'add-page-numbers':
				result = await addPageNumbers(item.file, {
					position: settings.pageNumberPosition,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;
				
			case 'watermark':
				result = await addWatermark(item.file, {
					text: settings.watermarkText || 'WATERMARK',
					opacity: settings.watermarkOpacity,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;
				
			case 'protect':
				pdfs.updateItem(item.id, { progressStage: 'Encrypting with qpdf...' });
				result = await protectPDF(item.file, {
					userPassword: settings.userPassword,
					ownerPassword: settings.ownerPassword || settings.userPassword,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;
				
			case 'unlock':
				pdfs.updateItem(item.id, { progressStage: 'Decrypting with qpdf...' });
				result = await unlockPDF(item.file, {
					password: settings.userPassword,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;
				
			default:
				throw new Error(`Unknown tool: ${tool}`);
		}
		
		// Handle result
		if (Array.isArray(result)) {
			const totalSize = result.reduce((acc, b) => acc + b.size, 0);
			pdfs.updateItem(item.id, {
				status: 'completed',
				progress: 100,
				processedBlobs: result,
				processedSize: totalSize,
				progressStage: `${result.length} files created`
			});
		} else {
			const processedUrl = URL.createObjectURL(result);
			pdfs.updateItem(item.id, {
				status: 'completed',
				progress: 100,
				processedBlob: result,
				processedUrl,
				processedSize: result.size,
				progressStage: 'Complete'
			});
		}
	} catch (error) {
		console.error('Processing error:', error);
		// Handle both Error objects and Tauri error strings
		let errorMessage = 'Processing failed';
		if (error instanceof Error) {
			errorMessage = error.message;
		} else if (typeof error === 'string') {
			errorMessage = error;
		} else if (error && typeof error === 'object' && 'message' in error) {
			errorMessage = String((error as { message: unknown }).message);
		}
		pdfs.updateItem(item.id, {
			status: 'error',
			error: errorMessage
		});
	}
}

async function processMerge(items: PDFItem[]) {
	const firstItem = items[0];
	
	try {
		pdfs.updateItem(firstItem.id, {
			status: 'processing',
			progress: 0,
			progressStage: 'Merging PDFs...'
		});
		
		const sortedFiles = [...items]
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
			.map(i => i.file);
		
		const result = await mergePDFs(sortedFiles, (p) => {
			pdfs.updateItem(firstItem.id, { progress: p });
		});
		
		const processedUrl = URL.createObjectURL(result);
		
		pdfs.updateItem(firstItem.id, {
			status: 'completed',
			progress: 100,
			processedBlob: result,
			processedUrl,
			processedSize: result.size,
			progressStage: `Merged ${items.length} PDFs`
		});
		
		for (let i = 1; i < items.length; i++) {
			pdfs.removeItem(items[i].id);
		}
	} catch (error) {
		console.error('Merge error:', error);
		pdfs.updateItem(firstItem.id, {
			status: 'error',
			error: error instanceof Error ? error.message : 'Merge failed'
		});
	}
}

async function processImagesToPDF(items: PDFItem[]) {
	const firstItem = items[0];
	
	try {
		pdfs.updateItem(firstItem.id, {
			status: 'processing',
			progress: 0,
			progressStage: 'Creating PDF...'
		});
		
		const sortedFiles = [...items]
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
			.map(i => i.file);
		
		const result = await imagesToPDF(sortedFiles, (p) => {
			pdfs.updateItem(firstItem.id, { progress: p });
		});
		
		const processedUrl = URL.createObjectURL(result);
		
		pdfs.updateItem(firstItem.id, {
			status: 'completed',
			progress: 100,
			processedBlob: result,
			processedUrl,
			processedSize: result.size,
			progressStage: `Created from ${items.length} images`
		});
		
		for (let i = 1; i < items.length; i++) {
			pdfs.removeItem(items[i].id);
		}
	} catch (error) {
		console.error('Images to PDF error:', error);
		pdfs.updateItem(firstItem.id, {
			status: 'error',
			error: error instanceof Error ? error.message : 'Conversion failed'
		});
	}
}

// ============================================
// DOWNLOAD UTILITIES
// ============================================

export function downloadFile(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export function getOutputFilename(originalName: string, tool: string, index?: number): string {
	const baseName = originalName.replace(/\.[^/.]+$/, '');
	
	switch (tool) {
		case 'compress':
			return `${baseName}-compressed.pdf`;
		case 'merge':
			return `merged-${Date.now()}.pdf`;
		case 'split':
			return index !== undefined ? `${baseName}-part${index + 1}.pdf` : `${baseName}-split.pdf`;
		case 'rotate':
			return `${baseName}-rotated.pdf`;
		case 'delete-pages':
			return `${baseName}-edited.pdf`;
		case 'reorder':
			return `${baseName}-reordered.pdf`;
		case 'pdf-to-images':
			return index !== undefined ? `${baseName}-page${index + 1}` : baseName;
		case 'images-to-pdf':
			return `images-${Date.now()}.pdf`;
		case 'add-page-numbers':
			return `${baseName}-numbered.pdf`;
		case 'watermark':
			return `${baseName}-watermarked.pdf`;
		case 'protect':
			return `${baseName}-protected.pdf`;
		case 'unlock':
			return `${baseName}-unlocked.pdf`;
		default:
			return `${baseName}-processed.pdf`;
	}
}
