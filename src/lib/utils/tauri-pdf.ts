/**
 * Tauri PDF Operations
 * 
 * Native PDF processing using Tauri IPC commands.
 * These functions call the Rust backend for actual processing.
 */

import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { isTauri } from './platform';

// Types matching Rust structs
export interface CompressionResult {
	output_path: string;
	original_size: number;
	compressed_size: number;
	savings_percent: number;
}

export interface FileResult {
	output_path: string;
	size: number;
}

export interface SplitResult {
	output_paths: string[];
	total_pages: number;
}

export interface SplitOptions {
	mode: 'range' | 'extract' | 'every-n';
	range_start?: number;
	range_end?: number;
	pages?: number[];
	every_n?: number;
}

/**
 * Open file dialog to select PDF files
 */
export async function selectPDFFiles(): Promise<string[] | null> {
	if (!isTauri()) return null;
	
	const result = await open({
		multiple: true,
		filters: [{ name: 'PDF', extensions: ['pdf'] }],
		title: 'Select PDF Files'
	});
	
	if (result === null) return null;
	return Array.isArray(result) ? result : [result];
}

/**
 * Open file dialog to select image files
 */
export async function selectImageFiles(): Promise<string[] | null> {
	if (!isTauri()) return null;
	
	const result = await open({
		multiple: true,
		filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
		title: 'Select Images'
	});
	
	if (result === null) return null;
	return Array.isArray(result) ? result : [result];
}

/**
 * Open save dialog for output file
 */
export async function selectSaveLocation(defaultName: string): Promise<string | null> {
	if (!isTauri()) return null;
	
	return await save({
		defaultPath: defaultName,
		filters: [{ name: 'PDF', extensions: ['pdf'] }],
		title: 'Save PDF'
	});
}

/**
 * Select output directory
 */
export async function selectDirectory(): Promise<string | null> {
	if (!isTauri()) return null;
	
	const result = await open({
		directory: true,
		title: 'Select Output Folder'
	});
	
	return result as string | null;
}

// ============================================
// PDF Operations via Tauri Commands
// ============================================

/**
 * Compress a PDF using Ghostscript
 */
export async function compressPDF(
	inputPath: string,
	preset: string = 'ebook',
	outputPath?: string
): Promise<CompressionResult> {
	return await invoke('compress_pdf', {
		inputPath,
		outputPath: outputPath || null,
		preset
	});
}

/**
 * Merge multiple PDFs
 */
export async function mergePDFs(
	inputPaths: string[],
	outputPath: string
): Promise<FileResult> {
	return await invoke('merge_pdfs', {
		inputPaths,
		outputPath
	});
}

/**
 * Split a PDF
 */
export async function splitPDF(
	inputPath: string,
	outputDir: string,
	options: SplitOptions
): Promise<SplitResult> {
	return await invoke('split_pdf', {
		inputPath,
		outputDir,
		options
	});
}

/**
 * Get page count of a PDF
 */
export async function getPageCount(inputPath: string): Promise<number> {
	return await invoke('get_pdf_page_count', { inputPath });
}

/**
 * Add password protection to a PDF
 */
export async function protectPDF(
	inputPath: string,
	userPassword: string,
	ownerPassword?: string,
	outputPath?: string
): Promise<FileResult> {
	return await invoke('protect_pdf', {
		inputPath,
		outputPath: outputPath || null,
		userPassword,
		ownerPassword: ownerPassword || null
	});
}

/**
 * Remove password from a PDF
 */
export async function unlockPDF(
	inputPath: string,
	password: string,
	outputPath?: string
): Promise<FileResult> {
	return await invoke('unlock_pdf', {
		inputPath,
		outputPath: outputPath || null,
		password
	});
}

// ============================================
// Tool Availability Checks
// ============================================

/**
 * Check if Ghostscript is available
 */
export async function checkGhostscript(): Promise<{ available: boolean; path?: string; error?: string }> {
	try {
		const path = await invoke<string>('check_ghostscript');
		return { available: true, path };
	} catch (error) {
		return { available: false, error: String(error) };
	}
}

/**
 * Get Ghostscript version
 */
export async function getGhostscriptVersion(): Promise<string | null> {
	try {
		return await invoke('get_ghostscript_version');
	} catch {
		return null;
	}
}

/**
 * Check if qpdf is available
 */
export async function checkQPDF(): Promise<{ available: boolean; path?: string; error?: string }> {
	try {
		const path = await invoke<string>('check_qpdf');
		return { available: true, path };
	} catch (error) {
		return { available: false, error: String(error) };
	}
}
