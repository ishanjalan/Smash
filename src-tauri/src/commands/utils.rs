//! Utility functions for PDF commands

use serde::{Deserialize, Serialize};
use std::path::Path;

/// Result of a compression operation
#[derive(Debug, Serialize, Deserialize)]
pub struct CompressionResult {
    pub output_path: String,
    pub original_size: u64,
    pub compressed_size: u64,
    pub savings_percent: f64,
}

/// Result of a file operation
#[derive(Debug, Serialize, Deserialize)]
pub struct FileResult {
    pub output_path: String,
    pub size: u64,
}

/// Result of a split operation (multiple files)
#[derive(Debug, Serialize, Deserialize)]
pub struct SplitResult {
    pub output_paths: Vec<String>,
    pub total_pages: u32,
}

/// Options for splitting a PDF
#[derive(Debug, Serialize, Deserialize)]
pub struct SplitOptions {
    pub mode: String,           // "range", "extract", "every-n"
    pub range_start: Option<u32>,
    pub range_end: Option<u32>,
    pub pages: Option<Vec<u32>>,
    pub every_n: Option<u32>,
}

/// Get file size in bytes
pub fn get_file_size(path: &str) -> std::io::Result<u64> {
    let metadata = std::fs::metadata(path)?;
    Ok(metadata.len())
}

/// Generate output path based on input and suffix
pub fn generate_output_path(input_path: &str, suffix: &str) -> String {
    let path = Path::new(input_path);
    let stem = path.file_stem().unwrap_or_default().to_string_lossy();
    let parent = path.parent().unwrap_or(Path::new("."));
    
    parent
        .join(format!("{}{}.pdf", stem, suffix))
        .to_string_lossy()
        .to_string()
}

/// Validate that a file exists and is a PDF
pub fn validate_pdf(path: &str) -> Result<(), String> {
    let path = Path::new(path);
    
    if !path.exists() {
        return Err(format!("File not found: {}", path.display()));
    }
    
    match path.extension() {
        Some(ext) if ext.eq_ignore_ascii_case("pdf") => Ok(()),
        _ => Err("File is not a PDF".to_string()),
    }
}
