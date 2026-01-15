/**
 * PDF Processing Utilities using pdf-lib and PDF.js
 * 
 * All processing happens 100% client-side - files never leave the browser.
 */

import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { pdfs, type PDFItem, type ImageFormat, COMPRESSION_PRESETS } from '$lib/stores/pdfs.svelte';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
	pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

// ============================================
// PDF COMPRESSION
// ============================================

interface CompressOptions {
	quality: number; // 0-1
	onProgress?: (progress: number) => void;
}

export async function compressPDF(
	file: File,
	options: CompressOptions
): Promise<Blob> {
	const arrayBuffer = await file.arrayBuffer();
	
	// Load with PDF.js for rendering
	const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
	const newPdf = await PDFDocument.create();
	
	const totalPages = pdfDoc.numPages;
	
	for (let i = 1; i <= totalPages; i++) {
		const page = await pdfDoc.getPage(i);
		const viewport = page.getViewport({ scale: 1.5 }); // Slightly higher for quality
		
		// Render to canvas
		const canvas = document.createElement('canvas');
		canvas.width = viewport.width;
		canvas.height = viewport.height;
		const ctx = canvas.getContext('2d')!;
		
		await page.render({ canvasContext: ctx, viewport }).promise;
		
		// Convert to compressed JPEG
		const imageData = canvas.toDataURL('image/jpeg', options.quality);
		const imageBytes = await fetch(imageData).then(r => r.arrayBuffer());
		
		// Embed in new PDF
		const image = await newPdf.embedJpg(imageBytes);
		const newPage = newPdf.addPage([viewport.width, viewport.height]);
		newPage.drawImage(image, {
			x: 0,
			y: 0,
			width: viewport.width,
			height: viewport.height
		});
		
		options.onProgress?.(Math.round((i / totalPages) * 100));
	}
	
	const pdfBytes = await newPdf.save();
	return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ============================================
// PDF MERGE
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
// PDF SPLIT
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
		// Extract page range as single PDF
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
		// Extract specific pages as single PDF
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
		// Split into chunks of N pages
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
// PDF TO IMAGES
// ============================================

interface PDFToImagesOptions {
	format: ImageFormat;
	dpi: number;
	quality: number; // 0-100
	onProgress?: (progress: number) => void;
}

export async function pdfToImages(
	file: File,
	options: PDFToImagesOptions
): Promise<Blob[]> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
	const scale = options.dpi / 72; // PDF default is 72 DPI
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
// IMAGES TO PDF
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
			// WebP needs to be converted to PNG first via canvas
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
			// Assume JPEG
			image = await pdf.embedJpg(arrayBuffer);
		}
		
		// Add page with image dimensions
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

// Helper: Load image from file
function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = URL.createObjectURL(file);
	});
}

// Helper: Parse page range string (e.g., "1-5, 8, 10-12")
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
// GET PAGE COUNT
// ============================================

export async function getPageCount(file: File): Promise<number> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await PDFDocument.load(arrayBuffer);
	return pdf.getPageCount();
}

// ============================================
// GENERATE THUMBNAIL
// ============================================

export async function generateThumbnail(file: File): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
	const page = await pdf.getPage(1);
	
	const scale = 0.5; // Thumbnail scale
	const viewport = page.getViewport({ scale });
	
	const canvas = document.createElement('canvas');
	canvas.width = viewport.width;
	canvas.height = viewport.height;
	const ctx = canvas.getContext('2d')!;
	
	await page.render({ canvasContext: ctx, viewport }).promise;
	
	return canvas.toDataURL('image/jpeg', 0.7);
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
			// Merge all pending files into one
			await processMerge(pendingItems);
		} else if (tool === 'images-to-pdf') {
			// Convert all images to one PDF
			await processImagesToPDF(pendingItems);
		} else {
			// Process each file individually
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
				result = await compressPDF(item.file, {
					quality: COMPRESSION_PRESETS[settings.compressionLevel].quality,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
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
					// extract mode - parse page range
					splitOptions = {
						mode: 'extract',
						pages: parsePageRangeHelper(settings.splitRange, pageCount),
						onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
					};
				}
				
				result = await splitPDF(item.file, splitOptions);
				break;
				
			case 'pdf-to-images':
				result = await pdfToImages(item.file, {
					format: settings.imageFormat,
					dpi: settings.imageDPI,
					quality: settings.imageQuality,
					onProgress: (p) => pdfs.updateItem(item.id, { progress: p })
				});
				break;
				
			default:
				throw new Error(`Unknown tool: ${tool}`);
		}
		
		// Handle result
		if (Array.isArray(result)) {
			// Multiple outputs (split or PDF-to-images)
			const totalSize = result.reduce((acc, b) => acc + b.size, 0);
			pdfs.updateItem(item.id, {
				status: 'completed',
				progress: 100,
				processedBlobs: result,
				processedSize: totalSize,
				progressStage: `${result.length} files created`
			});
		} else {
			// Single output
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
		pdfs.updateItem(item.id, {
			status: 'error',
			error: error instanceof Error ? error.message : 'Processing failed'
		});
	}
}

async function processMerge(items: PDFItem[]) {
	// Use first item as the "result" container
	const firstItem = items[0];
	
	try {
		pdfs.updateItem(firstItem.id, {
			status: 'processing',
			progress: 0,
			progressStage: 'Merging PDFs...'
		});
		
		// Sort by order
		const sortedFiles = [...items]
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
			.map(i => i.file);
		
		const result = await mergePDFs(sortedFiles, (p) => {
			pdfs.updateItem(firstItem.id, { progress: p });
		});
		
		const processedUrl = URL.createObjectURL(result);
		
		// Mark first item as completed with result
		pdfs.updateItem(firstItem.id, {
			status: 'completed',
			progress: 100,
			processedBlob: result,
			processedUrl,
			processedSize: result.size,
			progressStage: `Merged ${items.length} PDFs`
		});
		
		// Remove other items
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
		
		// Sort by order
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
		
		// Remove other items
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
		case 'pdf-to-images':
			return index !== undefined ? `${baseName}-page${index + 1}` : baseName;
		case 'images-to-pdf':
			return `images-${Date.now()}.pdf`;
		default:
			return `${baseName}-processed.pdf`;
	}
}
