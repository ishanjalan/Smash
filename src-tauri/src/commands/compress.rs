//! PDF Compression using Ghostscript
//! 
//! Uses the native Ghostscript binary for true PDF compression
//! that preserves text selectability and quality.

use crate::ghostscript;
use super::utils::{CompressionResult, get_file_size, generate_output_path, validate_pdf};

/// Compress a PDF using Ghostscript
/// 
/// # Arguments
/// * `input_path` - Path to the input PDF file
/// * `output_path` - Optional output path (auto-generated if not provided)
/// * `preset` - Compression preset: "screen", "ebook", "printer", "prepress"
/// 
/// # Returns
/// CompressionResult with file sizes and savings
#[tauri::command]
pub async fn compress_pdf(
    input_path: String,
    output_path: Option<String>,
    preset: String,
) -> Result<CompressionResult, String> {
    // Validate input
    validate_pdf(&input_path)?;
    
    // Validate preset
    let valid_presets = ["screen", "ebook", "printer", "prepress"];
    if !valid_presets.contains(&preset.as_str()) {
        return Err(format!(
            "Invalid preset '{}'. Valid options: {:?}",
            preset, valid_presets
        ));
    }
    
    // Generate output path if not provided
    let output = output_path.unwrap_or_else(|| generate_output_path(&input_path, "-compressed"));
    
    // Get original file size
    let original_size = get_file_size(&input_path)
        .map_err(|e| format!("Failed to read input file: {}", e))?;
    
    // Run Ghostscript compression
    ghostscript::compress(&input_path, &output, &preset)?;
    
    // Get compressed file size
    let compressed_size = get_file_size(&output)
        .map_err(|e| format!("Failed to read output file: {}", e))?;
    
    // Calculate savings
    let savings_percent = if original_size > 0 {
        ((original_size as f64 - compressed_size as f64) / original_size as f64) * 100.0
    } else {
        0.0
    };
    
    Ok(CompressionResult {
        output_path: output,
        original_size,
        compressed_size,
        savings_percent,
    })
}

/// Check if Ghostscript is available on the system
#[tauri::command]
pub async fn check_ghostscript() -> Result<String, String> {
    match ghostscript::find_ghostscript() {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err("Ghostscript not found. Please install Ghostscript.".to_string()),
    }
}

/// Get Ghostscript version
#[tauri::command]
pub async fn get_ghostscript_version() -> Result<String, String> {
    ghostscript::get_version()
}
